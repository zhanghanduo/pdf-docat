"""
Wrapper module for PDFMathTranslate to handle import errors gracefully
"""
import os
import tempfile
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.services import api_key_service

# Flag to track if PDFMathTranslate is available
pdf_translate_available = False

try:
    # Try to import PDFMathTranslate v2-rc modules
    from pdf2zh import do_translate_async_stream, SettingsModel, BasicSettings, TranslationSettings, PDFSettings
    from pdf2zh import GeminiSettings, OpenAISettings
    from pdf2zh.config.main import ConfigManager

    # If imports succeed, set the flag to True
    pdf_translate_available = True
    logger.info("PDFMathTranslate v2-rc successfully imported")
except ImportError as e:
    logger.error(f"PDFMathTranslate import failed: {e}")
    logger.warning("PDF translation functionality will be limited")


def process_pdf_file(
    file_path: str,
    engine: str,
    target_language: Optional[str] = None,
    translate_enabled: bool = False,
    dual_language: bool = False,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Process a PDF file using PDFMathTranslate v2-rc

    Returns a dictionary with processing results or error information
    """
    if not pdf_translate_available:
        return {
            "success": False,
            "error": "PDFMathTranslate is not available",
            "details": "The required dependencies could not be imported"
        }

    try:
        # Get Gemini API key from the pool
        gemini_api_key = api_key_service.get_api_key("gemini")
        if not gemini_api_key and translate_enabled:
            logger.warning("No Gemini API key available for translation")

        # Create settings for PDFMathTranslate v2-rc
        basic_settings = BasicSettings(
            input_files={file_path},
            debug=False,
            gui=False
        )

        # Map language codes for v2-rc
        lang_in = "auto"  # Auto-detect source language
        lang_out = "zh"   # Default target language

        if target_language:
            # Map frontend language codes to PDFMathTranslate codes
            lang_map = {
                "simplified-chinese": "zh",
                "traditional-chinese": "zh-TW", 
                "english": "en",
                "german": "de",
                "japanese": "ja",
                "spanish": "es",
                "french": "fr",
            }
            lang_out = lang_map.get(target_language, target_language)

        translation_settings = TranslationSettings(
            lang_in=lang_in,
            lang_out=lang_out,
            output=str(Path(file_path).parent),  # Output to same directory as input
            qps=1,  # Rate limiting
            min_text_length=1
        )

        pdf_settings = PDFSettings(
            no_dual=not dual_language if translate_enabled else True,
            no_mono=False,  # Always generate mono output
            pages=None,  # Process all pages
            translate_table_text=True,
            skip_clean=False,
            enhance_compatibility=False
        )

        # Create translation engine settings based on available API keys
        translate_engine_settings = None
        if translate_enabled and gemini_api_key:
            translate_engine_settings = GeminiSettings(
                gemini_api_key=gemini_api_key
            )
            logger.info("Using Gemini for translation")
        elif translate_enabled:
            # Fallback - could be OpenAI if available
            openai_api_key = api_key_service.get_api_key("openai")
            if openai_api_key:
                translate_engine_settings = OpenAISettings(
                    openai_api_key=openai_api_key
                )
                logger.info("Using OpenAI for translation")

        # Create the main settings model
        settings = SettingsModel(
            basic=basic_settings,
            translation=translation_settings,
            pdf=pdf_settings,
            translate_engine_settings=translate_engine_settings if translate_enabled else None
        )

        # Validate settings
        try:
            settings.validate_settings()
        except Exception as e:
            logger.error(f"Settings validation failed: {e}")
            return {
                "success": False,
                "error": f"Configuration error: {str(e)}",
                "details": "PDFMathTranslate settings validation failed"
            }

        # Run the async translation
        result = asyncio.run(_run_translation_async(settings, Path(file_path)))
        
        return {
            "success": True,
            "result": result,
            "pages": result.get("total_pages", 0),
            "engine": engine
        }

    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "details": f"Error processing PDF: {str(e)}"
        }


async def _run_translation_async(settings: SettingsModel, file_path: Path) -> Dict[str, Any]:
    """
    Run PDFMathTranslate async stream processing
    """
    result_data = {
        "page_data": [],
        "metadata": {},
        "total_pages": 0
    }
    
    try:
        # Stream the translation process
        async for event in do_translate_async_stream(settings, file_path):
            logger.debug(f"Translation event: {event}")
            
            if event.get("type") == "progress":
                # Handle progress events
                progress_info = event.get("info", {})
                if "total" in progress_info:
                    result_data["total_pages"] = progress_info["total"]
                    
            elif event.get("type") == "finish":
                # Handle completion event
                translate_result = event.get("translate_result")
                if translate_result:
                    result_data["metadata"]["processing_time_seconds"] = getattr(translate_result, 'total_seconds', 0)
                    result_data["metadata"]["mono_pdf_path"] = str(getattr(translate_result, 'mono_pdf_path', ''))
                    result_data["metadata"]["dual_pdf_path"] = str(getattr(translate_result, 'dual_pdf_path', ''))
                break
                
            elif event.get("type") == "error":
                # Handle error events
                error_msg = event.get("error", "Unknown error")
                raise Exception(f"Translation failed: {error_msg}")
    
    except Exception as e:
        logger.error(f"Async translation failed: {e}")
        raise

    return result_data


def estimate_page_count(file_path: str) -> int:
    """
    Estimate the number of pages in a PDF file
    """
    if not pdf_translate_available:
        # Return a default value if PDFMathTranslate is not available
        return 1

    try:
        # Use PyMuPDF to estimate page count
        # Note: PyMuPDF is installed as 'pymupdf' but imported as 'fitz'
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            return len(doc)
        except ImportError:
            logger.warning("fitz (PyMuPDF) import failed, using default page count")
            return 1
    except Exception as e:
        # Return a default value if estimation fails
        logger.warning(f"Error estimating page count: {str(e)}")
        return 1
