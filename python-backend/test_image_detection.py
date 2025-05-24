#!/usr/bin/env python3
"""
Test script for the new image detection and OpenRouter OCR integration.

This script demonstrates how the new logic works:
1. Check if a PDF contains images
2. If no images: use PDFMathTranslate
3. If yes: use OpenRouter OCR
"""

import sys
import os
import asyncio
from pathlib import Path

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from app.services.image_detection import detect_images_in_pdf, should_use_ocr


async def test_image_detection(pdf_path: str):
    """Test the image detection logic on a PDF file"""
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return
    
    print(f"🔍 Analyzing PDF: {pdf_path}")
    print("=" * 50)
    
    # Read the PDF file
    with open(pdf_path, 'rb') as f:
        pdf_content = f.read()
    
    print(f"📄 File size: {len(pdf_content) / 1024:.1f} KB")
    
    # Detect images in the PDF
    try:
        detection_result = detect_images_in_pdf(pdf_content)
        
        print("\n🔬 Detection Results:")
        print(f"  • Analysis method: {detection_result['analysis_method']}")
        print(f"  • Has images: {detection_result['has_images']}")
        print(f"  • Image count: {detection_result['image_count']}")
        print(f"  • Total pages: {detection_result['total_pages']}")
        print(f"  • Text-to-image ratio: {detection_result['text_to_image_ratio']:.2f}")
        print(f"  • Confidence: {detection_result['confidence']:.2f}")
        print(f"  • Recommendation: {detection_result['recommendation']}")
        
        if detection_result['scanned_pages']:
            print(f"  • Scanned pages: {detection_result['scanned_pages']}")
        if detection_result['structured_pages']:
            print(f"  • Structured pages: {detection_result['structured_pages']}")
        
        # Determine processing method
        use_ocr = should_use_ocr(detection_result)
        processing_method = "OpenRouter OCR" if use_ocr else "PDFMathTranslate"
        
        print(f"\n📋 Processing Decision:")
        print(f"  • Recommended method: {processing_method}")
        print(f"  • Use OCR: {use_ocr}")
        
        # Show detailed page analysis if available
        if detection_result.get('page_analyses'):
            print(f"\n📊 Per-page Analysis:")
            for i, page_analysis in enumerate(detection_result['page_analyses'][:5]):  # Show first 5 pages
                print(f"  Page {page_analysis.get('page_number', i+1)}: "
                     f"{'🖼️  Scanned' if page_analysis['is_scanned'] else '📝 Structured'} "
                     f"(conf: {page_analysis['confidence']:.2f}, "
                     f"images: {page_analysis['image_count']}, "
                     f"text: {page_analysis['text_length']} chars)")
            
            if len(detection_result['page_analyses']) > 5:
                print(f"  ... and {len(detection_result['page_analyses']) - 5} more pages")
        
        return detection_result
        
    except Exception as e:
        print(f"❌ Error during detection: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


async def main():
    """Main test function"""
    print("🧪 PDF Image Detection Test")
    print("=" * 50)
    
    # Test with different types of PDFs if available
    test_files = [
        "test_samples/structured_document.pdf",  # Text-based PDF
        "test_samples/scanned_document.pdf",     # Image-based PDF
        "test_samples/mixed_document.pdf",       # Mixed content PDF
    ]
    
    # If no test files specified, ask for user input
    if len(sys.argv) > 1:
        test_files = sys.argv[1:]
    
    for pdf_path in test_files:
        if os.path.exists(pdf_path):
            await test_image_detection(pdf_path)
            print("\n" + "=" * 50 + "\n")
        else:
            print(f"⚠️  Skipping {pdf_path} (file not found)")
    
    if not any(os.path.exists(f) for f in test_files):
        print("💡 No test files found. Usage:")
        print("   python test_image_detection.py path/to/your/document.pdf")
        print("\nThis script will analyze the PDF and determine whether to use:")
        print("• PDFMathTranslate (for text-based PDFs)")
        print("• OpenRouter OCR (for image-containing PDFs)")


if __name__ == "__main__":
    asyncio.run(main()) 