"""
PDF Image Detection Service

This module provides functions to detect if a PDF contains images,
which helps determine whether to use OCR (for image-heavy PDFs) or 
text extraction (for text-based PDFs).
"""
import base64
import tempfile
import os
from typing import Dict, Any, List, Tuple
from app.core.logging import logger


def detect_images_in_pdf(pdf_content: bytes) -> Dict[str, Any]:
    """
    Detect if a PDF contains images and analyze its content structure.
    
    Args:
        pdf_content: PDF file content as bytes
        
    Returns:
        Dict containing:
        - has_images: bool - Whether the PDF contains images
        - image_count: int - Total number of images found
        - text_to_image_ratio: float - Ratio of text to images
        - scanned_pages: List[int] - Pages that appear to be scanned
        - structured_pages: List[int] - Pages with extractable text
        - confidence: float - Confidence in the detection (0.0-1.0)
        - recommendation: str - "ocr" or "text_extraction"
    """
    try:
        # Try to use PyMuPDF for detailed analysis
        return _analyze_with_pymupdf(pdf_content)
    except ImportError:
        logger.warning("PyMuPDF not available, falling back to basic detection")
        return _analyze_with_basic_methods(pdf_content)
    except Exception as e:
        logger.error(f"Error in image detection: {str(e)}")
        return _get_fallback_result()


def _analyze_with_pymupdf(pdf_content: bytes) -> Dict[str, Any]:
    """
    Analyze PDF using PyMuPDF for detailed content analysis.
    """
    import fitz  # PyMuPDF
    
    # Create a temporary file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
        tmp_file.write(pdf_content)
        tmp_file_path = tmp_file.name
    
    try:
        doc = fitz.open(tmp_file_path)
        
        total_pages = len(doc)
        image_count = 0
        text_blocks = 0
        scanned_pages = []
        structured_pages = []
        page_analyses = []
        
        for page_num in range(total_pages):
            page = doc[page_num]
            
            # Get images on this page
            image_list = page.get_images()
            page_image_count = len(image_list)
            image_count += page_image_count
            
            # Get text blocks on this page
            text_dict = page.get_text("dict")
            page_text_blocks = 0
            page_text_length = 0
            
            for block in text_dict.get("blocks", []):
                if "lines" in block:  # Text block
                    page_text_blocks += 1
                    for line in block["lines"]:
                        for span in line.get("spans", []):
                            page_text_length += len(span.get("text", ""))
            
            text_blocks += page_text_blocks
            
            # Analyze page structure
            page_analysis = _analyze_page_structure(
                page_image_count, 
                page_text_blocks, 
                page_text_length,
                page
            )
            
            page_analyses.append(page_analysis)
            
            if page_analysis["is_scanned"]:
                scanned_pages.append(page_num + 1)
            else:
                structured_pages.append(page_num + 1)
        
        doc.close()
        
        # Calculate overall metrics
        has_images = image_count > 0
        text_to_image_ratio = text_blocks / max(1, image_count)
        
        # Determine confidence and recommendation
        scanned_ratio = len(scanned_pages) / max(1, total_pages)
        confidence = _calculate_confidence(page_analyses)
        
        # Make recommendation based on analysis
        if scanned_ratio > 0.5 or (has_images and text_to_image_ratio < 2):
            recommendation = "ocr"
        else:
            recommendation = "text_extraction"
        
        return {
            "has_images": has_images,
            "image_count": image_count,
            "text_to_image_ratio": text_to_image_ratio,
            "scanned_pages": scanned_pages,
            "structured_pages": structured_pages,
            "total_pages": total_pages,
            "confidence": confidence,
            "recommendation": recommendation,
            "analysis_method": "pymupdf",
            "page_analyses": page_analyses
        }
        
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)


def _analyze_page_structure(
    image_count: int, 
    text_blocks: int, 
    text_length: int,
    page
) -> Dict[str, Any]:
    """
    Analyze the structure of a single page to determine if it's scanned or structured.
    """
    # Check if page has large images that might be scanned content
    large_images = 0
    if hasattr(page, 'get_images'):
        for img_index in page.get_images():
            try:
                # Get image details
                img_info = page.get_image_bbox(img_index[0])
                if img_info:
                    width = img_info.width
                    height = img_info.height
                    # Consider images > 500x500 pixels as potentially scanned content
                    if width > 500 and height > 500:
                        large_images += 1
            except:
                continue
    
    # Heuristics for determining if page is scanned
    is_scanned = False
    confidence = 0.5
    
    if image_count > 0 and text_blocks == 0:
        # Page has images but no text blocks - likely scanned
        is_scanned = True
        confidence = 0.9
    elif large_images > 0 and text_blocks < 3:
        # Page has large images and very little text - likely scanned
        is_scanned = True
        confidence = 0.8
    elif image_count > 3 and text_length < 100:
        # Many images with little text - likely scanned
        is_scanned = True
        confidence = 0.7
    elif text_blocks > 5 and image_count == 0:
        # Many text blocks, no images - clearly structured
        is_scanned = False
        confidence = 0.9
    elif text_length > 500 and image_count < 2:
        # Lots of text, few images - likely structured
        is_scanned = False
        confidence = 0.8
    
    return {
        "page_number": page.number + 1 if hasattr(page, 'number') else 0,
        "is_scanned": is_scanned,
        "confidence": confidence,
        "image_count": image_count,
        "large_images": large_images,
        "text_blocks": text_blocks,
        "text_length": text_length
    }


def _calculate_confidence(page_analyses: List[Dict[str, Any]]) -> float:
    """
    Calculate overall confidence in the detection based on page analyses.
    """
    if not page_analyses:
        return 0.5
    
    # Average confidence across all pages
    total_confidence = sum(analysis["confidence"] for analysis in page_analyses)
    avg_confidence = total_confidence / len(page_analyses)
    
    # Adjust based on consistency across pages
    scanned_count = sum(1 for analysis in page_analyses if analysis["is_scanned"])
    consistency_ratio = max(scanned_count, len(page_analyses) - scanned_count) / len(page_analyses)
    
    # Higher consistency increases confidence
    final_confidence = avg_confidence * (0.7 + 0.3 * consistency_ratio)
    
    return min(1.0, max(0.0, final_confidence))


def _analyze_with_basic_methods(pdf_content: bytes) -> Dict[str, Any]:
    """
    Fallback analysis using basic binary content inspection.
    """
    # Convert to string for pattern matching
    try:
        pdf_text = pdf_content[:50000].decode('latin1', errors='ignore')
    except:
        pdf_text = str(pdf_content[:50000])
    
    # Look for image markers in PDF structure
    image_markers = [
        '/Image', '/XObject', '/DCTDecode', '/JPXDecode', 
        '/CCITTFaxDecode', '/JBIG2Decode', '/FlateDecode'
    ]
    
    text_markers = [
        '/Text', '/Font', '/Contents', '/ToUnicode', 
        '/Encoding', '/Type1', '/TrueType'
    ]
    
    image_count = 0
    text_count = 0
    
    for marker in image_markers:
        image_count += pdf_text.count(marker)
    
    for marker in text_markers:
        text_count += pdf_text.count(marker)
    
    # Simple heuristics
    has_images = image_count > 0
    text_to_image_ratio = text_count / max(1, image_count)
    
    # Estimate if mostly scanned based on ratios
    if image_count > text_count * 0.5:
        recommendation = "ocr"
        confidence = 0.6
    else:
        recommendation = "text_extraction"
        confidence = 0.6
    
    return {
        "has_images": has_images,
        "image_count": image_count,
        "text_to_image_ratio": text_to_image_ratio,
        "scanned_pages": [],  # Cannot determine specific pages with basic method
        "structured_pages": [],
        "total_pages": 1,  # Cannot determine page count with basic method
        "confidence": confidence,
        "recommendation": recommendation,
        "analysis_method": "basic_binary",
        "page_analyses": []
    }


def _get_fallback_result() -> Dict[str, Any]:
    """
    Fallback result when all detection methods fail.
    """
    return {
        "has_images": True,  # Conservative assumption
        "image_count": 0,
        "text_to_image_ratio": 1.0,
        "scanned_pages": [],
        "structured_pages": [],
        "total_pages": 1,
        "confidence": 0.3,  # Low confidence
        "recommendation": "ocr",  # Conservative choice
        "analysis_method": "fallback",
        "page_analyses": []
    }


def should_use_ocr(detection_result: Dict[str, Any], threshold: float = 0.7) -> bool:
    """
    Determine if OCR should be used based on detection results.
    
    Args:
        detection_result: Result from detect_images_in_pdf()
        threshold: Confidence threshold for decision making
        
    Returns:
        bool: True if OCR should be used, False for text extraction
    """
    recommendation = detection_result.get("recommendation", "ocr")
    confidence = detection_result.get("confidence", 0.5)
    
    # If confidence is high, follow the recommendation
    if confidence >= threshold:
        return recommendation == "ocr"
    
    # If confidence is low, be conservative and use OCR
    # (better to use OCR unnecessarily than miss scanned content)
    return True 