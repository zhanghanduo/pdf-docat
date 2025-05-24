#!/usr/bin/env python3
"""
Test script to verify PDFMathTranslate v2-rc installation and functionality.
"""

import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_import():
    """Test importing PDFMathTranslate v2-rc modules"""
    try:
        from pdf2zh import do_translate_async_stream, SettingsModel, BasicSettings, TranslationSettings, PDFSettings
        from pdf2zh import GeminiSettings, OpenAISettings
        from pdf2zh.config.main import ConfigManager
        logger.info("✅ PDFMathTranslate v2-rc modules imported successfully")
        return True
    except ImportError as e:
        logger.error(f"❌ Failed to import PDFMathTranslate v2-rc: {e}")
        return False

def test_settings_creation():
    """Test creating settings for PDFMathTranslate v2-rc"""
    try:
        from pdf2zh import SettingsModel, BasicSettings, TranslationSettings, PDFSettings
        
        basic_settings = BasicSettings(
            input_files={"test.pdf"},
            debug=False,
            gui=False
        )
        
        translation_settings = TranslationSettings(
            lang_in="auto",
            lang_out="zh",
            output="/tmp",
            qps=1,
            min_text_length=1
        )
        
        pdf_settings = PDFSettings(
            no_dual=True,
            no_mono=False,
            pages=None,
            translate_table_text=True,
            skip_clean=False,
            enhance_compatibility=False
        )
        
        settings = SettingsModel(
            basic=basic_settings,
            translation=translation_settings,
            pdf=pdf_settings,
            translate_engine_settings=None
        )
        
        logger.info("✅ PDFMathTranslate v2-rc settings created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to create settings: {e}")
        return False

def test_wrapper_integration():
    """Test the PDF wrapper integration"""
    try:
        sys.path.append('.')
        from app.services.pdf_wrapper import pdf_translate_available, process_pdf_file
        
        if pdf_translate_available:
            logger.info("✅ PDF wrapper reports PDFMathTranslate is available")
            
            # Test with a dummy file path (should fail gracefully)
            result = process_pdf_file(
                "/nonexistent/test.pdf",
                engine="pdf-text",
                target_language="simplified-chinese",
                translate_enabled=False,
                dual_language=False
            )
            
            if result.get("success") is False:
                logger.info("✅ PDF wrapper handles missing file gracefully")
            else:
                logger.warning("⚠️ PDF wrapper should have failed with missing file")
                
            return True
        else:
            logger.error("❌ PDF wrapper reports PDFMathTranslate is NOT available")
            return False
            
    except Exception as e:
        logger.error(f"❌ Failed to test wrapper integration: {e}")
        return False

def main():
    logger.info("Testing PDFMathTranslate v2-rc integration...")
    
    tests = [
        ("Import Test", test_import),
        ("Settings Creation Test", test_settings_creation),
        ("Wrapper Integration Test", test_wrapper_integration),
    ]
    
    passed = 0
    total = len(tests)
    
    for name, test_func in tests:
        logger.info(f"\n--- {name} ---")
        if test_func():
            passed += 1
        else:
            logger.error(f"Test failed: {name}")
    
    logger.info(f"\n--- Summary ---")
    logger.info(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        logger.info("🎉 All tests passed! PDFMathTranslate v2-rc is properly integrated.")
        return 0
    else:
        logger.error("❌ Some tests failed. Check the logs above.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 