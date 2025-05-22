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

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None
    logger.warning("BeautifulSoup4 not found. HTML table parsing will be basic.")


def parse_html_table(html_string: str) -> Dict[str, List[Any]]:
    """
    Parse an HTML table into headers and rows.
    Returns: {"headers": [], "rows": [[]]}
    """
    headers: List[str] = []
    rows: List[List[str]] = []

    if not html_string:
        return {"headers": headers, "rows": rows}

    if BeautifulSoup:
        soup = BeautifulSoup(html_string, 'lxml') # 'lxml' is a fast parser
        
        # Find header cells (th) - often in <thead> or the first <tr>
        header_elements = soup.find_all('th')
        if header_elements:
            headers = [th.get_text(strip=True) for th in header_elements]
        
        # Find all rows (tr)
        table_rows = soup.find_all('tr')
        
        for row_idx, tr in enumerate(table_rows):
            row_cells: List[str] = []
            # If headers were found via <th>, and this is the first row,
            # it might be the header row itself, so skip if headers are already populated.
            if headers and row_idx == 0 and any(th.parent == tr for th in header_elements):
                 # Check if this row was the source of <th> elements
                is_header_row = True
                for th_cell in tr.find_all('th'):
                    if th_cell.get_text(strip=True) not in headers:
                        is_header_row = False; break
                if is_header_row: continue


            cells = tr.find_all(['td', 'th']) # Include 'th' in case some tables use it for row headers
            
            # If no headers found yet, and it's the first row, assume it's the header row
            if not headers and row_idx == 0:
                headers = [cell.get_text(strip=True) for cell in cells]
            else:
                row_cells = [cell.get_text(strip=true) for cell in cells]
                if row_cells: # Only add if there's actual cell data
                     rows.append(row_cells)
        
        # If headers were populated from the first row of <td>s/<th>s, remove that row from `rows` if it was added.
        if rows and headers and len(rows[0]) == len(headers) and all(rows[0][i] == headers[i] for i in range(len(headers))):
             # This check is a bit fragile, assumes first data row isn't identical to header.
             # A better check would be if the first row was made of <th> and not <td>
             first_tr_cells = table_rows[0].find_all('td')
             if not first_tr_cells: # If the first row had no <td>, it was likely a header row.
                 pass # headers were from <th> or first row of <th>
             elif headers == [cell.get_text(strip=True) for cell in first_tr_cells]: # headers were from first row of <td>
                 rows.pop(0)


    else: # Basic parsing if BeautifulSoup is not available
        # This will be very rudimentary and might not work for complex tables
        # Looking for <tr>, <th>, <td>
        # This basic parser is a placeholder and likely insufficient for robust parsing.
        try:
            import re
            # Headers
            th_matches = re.findall(r"<th[^>]*>(.*?)</th>", html_string, re.IGNORECASE)
            if th_matches:
                headers = [re.sub(r'<[^>]+>', '', h).strip() for h in th_matches]

            # Rows and cells
            tr_blocks = html_string.split("<tr")[1:] # Split by <tr>, ignore content before first <tr>
            for tr_block in tr_blocks:
                if not tr_block.strip().lower().startswith("valign"): # Basic way to skip potential empty <tr> tags
                    continue
                td_matches = re.findall(r"<td[^>]*>(.*?)</td>", tr_block, re.IGNORECASE)
                if not headers and not rows: # First row might be headers if no <th> found
                    headers = [re.sub(r'<[^>]+>', '', cell_content).strip() for cell_content in td_matches]
                    continue
                if td_matches:
                    rows.append([re.sub(r'<[^>]+>', '', cell_content).strip() for cell_content in td_matches])
        except Exception as e:
            logger.error(f"Basic HTML table parsing failed: {e}")
            # Fallback: return raw HTML or nothing
            return {"headers": ["Error parsing table"], "rows": [[html_string]]}


    return {"headers": headers, "rows": rows}


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
                translation_options,
                db=db,  # Passing db consistently
                file_annotations_input=file_annotations # Passing file_annotations consistently
            )

            # Add a warning to the result for OCR fallback (moved from processing_note)
            if result.get("extracted_content") and result["extracted_content"].get("metadata"):
                result["extracted_content"]["metadata"]["warning"] = (
                    "OCR processing was requested, but is not yet available. "
                    "Standard text extraction was performed as a fallback, "
                    "which may not be suitable for scanned documents."
                )
                # Remove old "processing_note" if it exists, replaced by warning
                result["extracted_content"]["metadata"].pop("processing_note", None)
            else:
                # This case should ideally not happen if process_structured_pdf behaves as expected
                logger.error(f"Could not add warning for OCR fallback on {file.filename} as extracted_content or metadata is missing in the result.")
        
        # Check if the processing step (structured or OCR fallback) itself reported an error
        if not result.get("success"):
            # This 'result' is from process_structured_pdf or similar future engines
            wrapper_error_message = result.get("error", "PDF processing engine failed but provided no specific error message.")
            # 'details' might come from process_structured_pdf's error structure
            error_details_for_log = result.get("details", wrapper_error_message) 

            processing_log.status = "error"
            processing_log.extracted_content = {"error": wrapper_error_message, "details": error_details_for_log}
            # Ensure file_annotations is saved even on this type of error if available
            processing_log.file_annotations = file_annotations 
            db.add(processing_log)
            db.commit()
            # We've logged the specific error, now raise an HTTP exception to inform the client
            raise HTTPException(status_code=500, detail=f"PDF processing failed: {wrapper_error_message}")

        # If we reach here, the processing engine (e.g., process_structured_pdf) reported success.
        # Now, continue with credit calculation and final log update for successful processing.

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
        # This block catches:
        # 1. HTTPExceptions raised explicitly above (e.g., from credit failure, or PDF processing engine failure)
        # 2. Any other unexpected exceptions during the try block.

        # Ensure log status is error
        processing_log.status = "error"

        if isinstance(e, HTTPException):
            # If it's an HTTPException, it might be one we raised intentionally.
            # The detail from that HTTPException is preferred.
            # If processing_log.extracted_content was set before raising, it's already specific.
            # If not (e.g. credit failure HTTPException), set a generic error message in log.
            if not processing_log.extracted_content: # Only set if not already set by specific failure logic
                 processing_log.extracted_content = {"error": "Processing halted due to an operational error.", "details": e.detail}
        else:
            # For non-HTTPExceptions (unexpected errors)
            logger.error(f"Unexpected error processing PDF {file.filename}: {str(e)}", exc_info=True)
            processing_log.extracted_content = {"error": "An unexpected server error occurred during PDF processing.", "details": str(e)}
        
        # Ensure file_annotations is saved on error if available and not already set by specific error logic
        if processing_log.file_annotations is None and file_annotations is not None:
            processing_log.file_annotations = file_annotations

        db.add(processing_log)
        db.commit() # Commit the error state to the log

        # Re-raise if it's an HTTPException we want to propagate, or wrap new ones.
        if isinstance(e, HTTPException):
            raise e  # Re-raise the original HTTPException
        else:
            # For unexpected errors, raise a generic 500
            raise HTTPException(
                status_code=500,
                detail=f"An unexpected server error occurred: {str(e)}"
            )


async def process_structured_pdf(
    file_content: bytes,
    filename: str,
    translation_options: Optional[TranslationOptions] = None,
    db: Optional[Session] = None,
    file_annotations_input: Optional[str] = None  # Added to accept file_annotations
) -> Dict[str, Any]:
    """
    Process a structured PDF using PDFMathTranslate
    """
    # Create a temporary file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
        tmp_file.write(file_content)
        tmp_file_path = tmp_file.name

    try:
        # Determine target language for pdf_wrapper based on translation_options
        target_lang_for_wrapper = None
        translate_enabled = translation_options and translation_options.translate_enabled
        dual_language = translation_options and translation_options.dual_language

        if translate_enabled and translation_options:
            # Mapping from frontend language codes to pdf2zh codes if necessary
            lang_map = {
                "simplified-chinese": "zh",
                "traditional-chinese": "zh-TW",
                "english": "en",
                "german": "de",
                "japanese": "ja",
                "spanish": "es",
                "french": "fr",
            }
            target_lang_for_wrapper = lang_map.get(translation_options.target_language, translation_options.target_language)
        
        # Process the PDF using our wrapper
        pdf_wrapper_result = process_pdf_file(
            tmp_file_path,
            engine="pdf-text", # This indicates structured PDF processing to the wrapper
            target_language=target_lang_for_wrapper, # Pass None if translate_enabled is False
            translate_enabled=translate_enabled,
            dual_language=dual_language,
            db=db # For potential db operations within the wrapper (e.g. caching, logging)
        )

        if not pdf_wrapper_result.get("success") or not pdf_wrapper_result.get("result"):
            error_message = pdf_wrapper_result.get('error', 'PDF processing failed and no specific error was provided.')
            logger.error(f"PDF processing via wrapper failed for {filename}: {error_message}")
            return {
                "success": False, # Explicitly set success to False
                "extracted_content": None,
                "file_annotations": file_annotations_input, # Pass through annotations
                "error": error_message
            }

        pdf2zh_data = pdf_wrapper_result["result"]
        
        # Start building extracted_content
        title = os.path.basename(filename)
        # Use total_pages from pdf2zh_data if available, else from wrapper, else 0
        pages = pdf2zh_data.get("total_pages", pdf_wrapper_result.get("pages", 0))
        
        content_items: List[Dict[str, Any]] = []
        
        # Populate metadata
        pdf2zh_metadata = pdf2zh_data.get("metadata", {})
        is_translated_actual = translate_enabled and bool(pdf2zh_metadata.get("target_language"))
        
        # Determine source and target languages from pdf2zh_data if available
        source_lang_actual = pdf2zh_metadata.get("source_language", "en") # Default if not in pdf2zh output
        target_lang_actual = pdf2zh_metadata.get("target_language") if is_translated_actual else None

        metadata = {
            "extractionTime": datetime.now(datetime.timezone.utc).isoformat(),
            "isTranslated": is_translated_actual,
            "sourceLanguage": source_lang_actual,
            "targetLanguage": target_lang_actual,
            "processing_time_seconds": pdf2zh_metadata.get("processing_time_seconds"),
            "original_filename": filename,
            "confidence": pdf2zh_metadata.get("confidence_score", pdf2zh_metadata.get("confidence")), # checking for both keys
            "wordCount": pdf2zh_metadata.get("word_count", pdf2zh_metadata.get("total_word_count")) # checking for both keys
        }

        # Populate content items
        for page_item in pdf2zh_data.get("page_data", []):
            page_num = page_item.get("page_number")

            # Process text blocks (and potentially other types like 'figure')
            all_blocks = []
            if dual_language and is_translated_actual and page_item.get("bilingual_text_blocks"):
                for block in page_item.get("bilingual_text_blocks", []):
                    block_type = block.get("type", "text")
                    if block_type == "figure": block_type = "text" # Map figure to text
                    all_blocks.append({
                        "type": block_type,
                        "is_bilingual": True,
                        "original_text": block.get("original_text"),
                        "translated_text": block.get("translated_text"),
                        "bbox": block.get("bbox")
                    })
            else:
                original_text_blocks = page_item.get("original_text_blocks", [])
                translated_text_blocks = page_item.get("translated_text_blocks", []) if is_translated_actual else []
                for idx, o_block in enumerate(original_text_blocks):
                    block_type = o_block.get("type", "text")
                    if block_type == "figure": block_type = "text" # Map figure to text
                    translated_text = None
                    if is_translated_actual and not dual_language and idx < len(translated_text_blocks):
                        translated_text = translated_text_blocks[idx].get("text")
                    
                    all_blocks.append({
                        "type": block_type,
                        "is_bilingual": False,
                        "original_text": o_block.get("text"),
                        "translated_text": translated_text, # This will be None if not translated or if dual_language was true but bilingual_blocks were missing
                        "bbox": o_block.get("bbox")
                    })

            for block_data in all_blocks:
                content_items.append({
                    "type": block_data["type"],
                    "page_number": page_num,
                    "content": block_data["original_text"],
                    "translatedContent": block_data["translated_text"], # Will be None if not applicable
                    "bbox": block_data["bbox"]
                })

            # Process tables
            for table_item in page_item.get("tables", []):
                html_content = table_item.get("html_content")
                # TODO: Handle translated tables if pdf2zh provides specific structure for them.
                # For now, parsing html_content as is. If it's bilingual HTML, parser might capture it.
                parsed_table_data = {"headers": [], "rows": [[]]}
                if html_content:
                    parsed_table_data = parse_html_table(html_content)
                elif table_item.get("markdown_content"): 
                    # Basic markdown parsing could be added here if needed, for now focusing on HTML
                    logger.warning(f"Table on page {page_num} has markdown but no HTML. Markdown parsing not yet implemented.")
                    # As a fallback, could put raw markdown in a cell or skip.
                    # For now, if no html_content, table might be empty or just have bbox.
                    pass


                content_items.append({
                    "type": "table",
                    "page_number": page_num,
                    "headers": parsed_table_data.get("headers"),
                    "rows": parsed_table_data.get("rows"),
                    "bbox": table_item.get("bbox")
                    # html_content and markdown_content are removed from the final item
                })

            # Process images
            for image_item in page_item.get("images", []):
                content_items.append({
                    "type": "image", # Frontend might ignore this if not expecting it in 'content' list explicitly
                    "page_number": page_num,
                    "image_path": image_item.get("path"), 
                    "bbox": image_item.get("bbox")
                })
        
        extracted_content_output = {
            "title": title,
            "pages": pages,
            "content": content_items,
            "metadata": metadata
        }

        return {
            "success": True, # Explicitly set success to True
            "extracted_content": extracted_content_output,
            "file_annotations": file_annotations_input, # Pass through
            "error": None
        }

    finally:
        # Clean up temporary files
        if 'tmp_file_path' in locals() and os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)
