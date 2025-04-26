"""
Wrapper module for PDFMathTranslate to handle import errors gracefully
"""
import os
import tempfile
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.services import api_key_service

# Flag to track if PDFMathTranslate is available
pdf_translate_available = False

try:
    # Try to import PDFMathTranslate modules
    from pdf2zh.high_level import translate
    from pdf2zh.config import ConfigManager
    from pdf2zh.translator import GeminiTranslator

    # If imports succeed, set the flag to True
    pdf_translate_available = True
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
    Process a PDF file using PDFMathTranslate

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

        # Set the API key in PDFMathTranslate's configuration
        if gemini_api_key:
            ConfigManager.set("GEMINI_API_KEY", gemini_api_key)
            logger.info("Using Gemini API key from pool for translation")

        # Process the PDF using PDFMathTranslate
        result = translate(
            file_path,
            target_language=target_language if translate_enabled else None,
            dual_language=dual_language if translate_enabled else False,
            engine=engine,
            service="gemini" if translate_enabled else None
        )

        return {
            "success": True,
            "result": result,
            "pages": result.get("pages", 0),
            "engine": engine
        }
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "details": f"Error processing PDF: {str(e)}"
        }


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
            print("Warning: fitz (PyMuPDF) import failed, using default page count")
            return 1
    except Exception as e:
        # Return a default value if estimation fails
        print(f"Error estimating page count: {str(e)}")
        return 1
