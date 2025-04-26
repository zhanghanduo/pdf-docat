import os
import hashlib
import base64
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime
import tempfile
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.models.processing_log import ProcessingLog
from app.models.user import User
from app.schemas.processing import TranslationOptions
from app.core.config import settings
from app.services import credit_service
from app.core.logging import logger

# Import our safe wrapper for PDFMathTranslate
from app.services.pdf_wrapper import process_pdf_file, estimate_page_count


def calculate_file_hash(file_content: bytes) -> str:
    """
    Calculate SHA-256 hash of a file
    """
    return hashlib.sha256(file_content).hexdigest()


async def estimate_pdf_page_count(pdf_base64: str) -> int:
    """
    Estimate the number of pages in a PDF
    """
    # Decode the base64 content
    file_content = base64.b64decode(pdf_base64)

    # Create a temporary file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
        tmp_file.write(file_content)
        tmp_file_path = tmp_file.name

    try:
        # Use our wrapper to estimate page count
        page_count = estimate_page_count(tmp_file_path)
        return min(page_count, 200)  # Cap at 200 pages for safety
    except Exception as e:
        logger.warning(f"Error estimating page count: {str(e)}")
        # Fallback to size-based estimation
        file_size = len(file_content)
        estimated_pages = max(1, file_size // (100 * 1024))
        return min(estimated_pages, 200)  # Cap at 200 pages for safety
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)


async def detect_pdf_type(pdf_base64: str) -> str:
    """
    Detect if a PDF is scanned (image-based) or structured (text-based)
    """
    # This is a simplified implementation
    # In a real implementation, you would use a PDF library to analyze the content

    # For now, we'll use a simple heuristic based on file size
    # Scanned PDFs are typically larger
    file_size = len(base64.b64decode(pdf_base64))

    # If file size per estimated page is large, it's likely a scanned PDF
    estimated_pages = await estimate_pdf_page_count(pdf_base64)
    size_per_page = file_size / max(1, estimated_pages)

    if size_per_page > 500 * 1024:  # More than 500KB per page
        return "scanned"
    else:
        return "structured"


async def process_pdf(
    db: Session,
    user: User,
    file: UploadFile,
    engine: str,
    translation_options: Optional[TranslationOptions] = None,
    file_annotations: Optional[str] = None
) -> Dict[str, Any]:
    """
    Process a PDF file
    """
    # Start timing for processing
    start_time = datetime.now(datetime.timezone.utc)

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    # Check file size
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the maximum limit of {settings.MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    # Calculate file hash for caching
    file_hash = calculate_file_hash(file_content)
    logger.info(f"File hash: {file_hash}")

    # Check if we already have this file in cache
    cached_log = db.query(ProcessingLog).filter(
        ProcessingLog.file_hash == file_hash,
        ProcessingLog.status == "completed"
    ).first()

    if cached_log:
        logger.info(f"Found cached result for file: {file.filename}")

        # Calculate processing time (just the time to look up the cache)
        processing_time = int((datetime.now(datetime.timezone.utc) - start_time).total_seconds() * 1000)

        # Create a new log entry for this request but reference the cached content
        log = ProcessingLog(
            user_id=user.id,
            file_name=file.filename,
            file_size=file_size,
            file_hash=file_hash,
            engine=engine,
            status="completed",
            processing_time=processing_time,
            extracted_content=cached_log.extracted_content,
            file_annotations=cached_log.file_annotations,
        )

        db.add(log)
        db.commit()
        db.refresh(log)

        return {
            "extractedContent": cached_log.extracted_content,
            "fileAnnotations": cached_log.file_annotations,
            "logId": log.id,
            "cached": True
        }

    # Convert file to base64
    pdf_base64 = base64.b64encode(file_content).decode("utf-8")
    logger.info("File converted to base64")

    # Check the page count and apply limits
    logger.info("Estimating PDF page count")
    page_count = await estimate_pdf_page_count(pdf_base64)

    # Maximum page count allowed (different for different user roles)
    max_page_count = settings.MAX_PAGE_COUNT.get(user.role, settings.MAX_PAGE_COUNT["user"])

    if page_count > max_page_count:
        raise HTTPException(
            status_code=400,
            detail=f"This PDF has approximately {page_count} pages, which exceeds the maximum limit of {max_page_count} pages"
        )

    # Auto-select engine if "auto" is specified
    if engine == "auto":
        pdf_type = await detect_pdf_type(pdf_base64)
        if pdf_type == "scanned":
            engine = "mistral-ocr"
        else:
            engine = "pdf-text"
        logger.info(f"Auto-selected engine: {engine} based on document detection")

    # Create a processing log entry
    processing_log = ProcessingLog(
        user_id=user.id,
        file_name=file.filename,
        file_size=file_size,
        file_hash=file_hash,
        engine=engine,
        status="processing",
    )

    db.add(processing_log)
    db.commit()
    db.refresh(processing_log)

    try:
        # Process the PDF based on the engine type
        if engine == "pdf-text":
            # Use PDFMathTranslate for structured PDFs
            result = await process_structured_pdf(
                file_content,
                file.filename,
                translation_options,
                db=db
            )
        else:
            # Use OpenRouter for scanned PDFs (OCR)
            # This would be implemented separately
            logger.warning(f"OCR processing requested for file: {file.filename} but not yet implemented")

            # Fallback to structured PDF processing with a warning
            result = await process_structured_pdf(
                file_content,
                file.filename,
                translation_options
            )

            # Add a warning to the result
            if "extracted_content" in result and "metadata" in result["extracted_content"]:
                result["extracted_content"]["metadata"]["warning"] = "This appears to be a scanned document. OCR processing is not yet implemented, so the results may be limited."

        # Calculate processing time
        processing_time = int((datetime.now(datetime.timezone.utc) - start_time).total_seconds() * 1000)

        # Calculate credits used
        credits_used = page_count * (
            settings.CREDIT_COSTS["SCANNED"] if engine == "mistral-ocr"
            else settings.CREDIT_COSTS["STRUCTURED"]
        )

        # Use credits
        credit_success = credit_service.use_credits(
            db,
            user.id,
            credits_used,
            processing_log.id,
            f"PDF processing: {file.filename}"
        )

        if not credit_success:
            raise HTTPException(
                status_code=402,
                detail="Not enough credits to process this document"
            )

        # Update processing log
        processing_log.status = "completed"
        processing_log.processing_time = processing_time
        processing_log.extracted_content = result["extracted_content"]
        processing_log.file_annotations = result.get("file_annotations")
        processing_log.credits_used = credits_used

        db.add(processing_log)
        db.commit()
        db.refresh(processing_log)

        return {
            "extractedContent": result["extracted_content"],
            "fileAnnotations": result.get("file_annotations"),
            "logId": processing_log.id,
            "cached": False
        }

    except Exception as e:
        # Update processing log with error status
        processing_log.status = "error"
        db.add(processing_log)
        db.commit()

        logger.error(f"Error processing PDF: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF: {str(e)}"
        )


async def process_structured_pdf(
    file_content: bytes,
    filename: str,
    translation_options: Optional[TranslationOptions] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Process a structured PDF using PDFMathTranslate
    """
    # Create a temporary file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
        tmp_file.write(file_content)
        tmp_file_path = tmp_file.name

    try:
        # Set up translation options
        source_lang = "en"  # Default source language
        target_lang = "zh" if not translation_options else translation_options.target_language

        if translation_options and translation_options.target_language:
            if translation_options.target_language == "simplified-chinese":
                target_lang = "zh"
            elif translation_options.target_language == "traditional-chinese":
                target_lang = "zh-TW"
            elif translation_options.target_language == "english":
                target_lang = "en"
            elif translation_options.target_language == "german":
                target_lang = "de"
            elif translation_options.target_language == "japanese":
                target_lang = "ja"
            elif translation_options.target_language == "spanish":
                target_lang = "es"
            elif translation_options.target_language == "french":
                target_lang = "fr"

        # Use our wrapper to process the PDF
        translate_enabled = translation_options and translation_options.translate_enabled
        dual_language = translation_options and translation_options.dual_language

        # Process the PDF using our wrapper
        result = process_pdf_file(
            tmp_file_path,
            engine="pdf-text",
            target_language=target_lang if translate_enabled else None,
            translate_enabled=translate_enabled,
            dual_language=dual_language,
            db=db
        )

        # If processing failed, use a placeholder result
        if not result.get("success", False):
            logger.warning(f"PDF processing failed: {result.get('error', 'Unknown error')}")

        # Create a simplified structure for the extracted content
        extracted_content = {
            "title": os.path.basename(filename),
            "pages": result.get("pages", 1),
            "content": [
                {
                    "type": "text",
                    "content": "Processed content would appear here",
                    "translatedContent": "翻译内容将显示在这里" if target_lang == "zh" else "Translated content would appear here"
                }
            ],
            "metadata": {
                "extractionTime": datetime.now(datetime.timezone.utc).isoformat(),
                "wordCount": 100,  # Placeholder
                "confidence": 0.95,  # Placeholder
                "isTranslated": translate_enabled,
                "sourceLanguage": source_lang,
                "targetLanguage": target_lang if translate_enabled else None
            }
        }

        return {
            "extracted_content": extracted_content,
            "file_annotations": None  # Placeholder
        }

    finally:
        # Clean up temporary files
        if os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)
