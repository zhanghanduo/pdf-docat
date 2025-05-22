#!/usr/bin/env python3
"""
Test script to verify PDFMathTranslate installation and functionality.
"""

import sys
import json
import argparse
from pdf2zh.high_level import translate
from pdf2zh.config import ConfigManager

def main():
    parser = argparse.ArgumentParser(description='Process a PDF file using PDFMathTranslate')
    parser.add_argument('pdf_path', help='Path to the PDF file to process')
    parser.add_argument('--source-lang', default='en', help='Source language (default: en)')
    parser.add_argument('--target-lang', default='zh', help='Target language (default: zh)')
    parser.add_argument('--service', default='gemini', help='Translation service to use (default: gemini)')
    parser.add_argument('--api-key', help='API key for the translation service')
    
    args = parser.parse_args()
    
    # Set API key if provided
    if args.api_key and args.service == 'gemini':
        ConfigManager.set('GEMINI_API_KEY', args.api_key)
    
    print(f"Processing PDF: {args.pdf_path}")
    print(f"Source language: {args.source_lang}")
    print(f"Target language: {args.target_lang}")
    print(f"Translation service: {args.service}")
    
    try:
        # Process the PDF
        result = translate(
            args.pdf_path,
            lang_in=args.source_lang,
            lang_out=args.target_lang,
            service=args.service,
            thread=4
        )
        
        # Print summary of results
        print("\nProcessing completed successfully!")
        print(f"Output file: {result}")
        
        return 0
    except Exception as e:
        print(f"Error processing PDF: {str(e)}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
