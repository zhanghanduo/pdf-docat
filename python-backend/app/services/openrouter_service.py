"""
OpenRouter service for OCR processing of image-containing PDFs
"""
import requests
import base64
import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.core.logging import logger
from app.services import api_key_service


class OpenRouterService:
    """Service for processing PDFs with images using OpenRouter API"""
    
    def __init__(self):
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.api_key = None
    
    def _get_api_key(self) -> str:
        """Get OpenRouter API key"""
        if not self.api_key:
            self.api_key = api_key_service.get_api_key("openrouter")
            if not self.api_key:
                self.api_key = os.environ.get("OPENROUTER_API_KEY", "")
        
        if not self.api_key:
            raise ValueError("OpenRouter API key is not configured")
        
        return self.api_key
    
    def _create_headers(self) -> Dict[str, str]:
        """Create request headers for OpenRouter API"""
        api_key = self._get_api_key()
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://pdf-docat.com",
            "X-Title": "PDF-Docat"
        }
    
    async def process_pdf_with_ocr(
        self,
        pdf_content: bytes,
        filename: str,
        engine: str = "mistral-ocr",
        translation_options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process a PDF containing images using OpenRouter OCR
        
        Args:
            pdf_content: PDF file content as bytes
            filename: Original filename
            engine: OCR engine to use ("mistral-ocr" or "pdf-text")
            translation_options: Translation settings
            
        Returns:
            Dict containing extracted content and file annotations
        """
        try:
            # Encode PDF to base64
            pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
            data_url = f"data:application/pdf;base64,{pdf_base64}"
            
            # Prepare the message content
            content = [
                {
                    "type": "text",
                    "text": self._create_extraction_prompt(translation_options)
                },
                {
                    "type": "file",
                    "file": {
                        "filename": filename,
                        "file_data": data_url
                    }
                }
            ]
            
            # Configure PDF processing engine
            plugins = [
                {
                    "id": "file-parser",
                    "pdf": {
                        "engine": engine
                    }
                }
            ]
            
            # Prepare the request payload
            payload = {
                "model": "anthropic/claude-3.5-sonnet",  # Good for document analysis
                "messages": [
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                "plugins": plugins,
                "max_tokens": 8000,
                "temperature": 0.1  # Low temperature for consistent extraction
            }
            
            # Make the API request
            headers = self._create_headers()
            logger.info(f"Processing PDF with OpenRouter OCR: {filename}")
            
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload,
                timeout=120  # 2 minute timeout for large PDFs
            )
            
            if response.status_code != 200:
                error_msg = f"OpenRouter API returned status {response.status_code}: {response.text}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "extracted_content": None,
                    "file_annotations": None
                }
            
            # Parse the response
            response_data = response.json()
            
            # Extract content from response
            if not response_data.get("choices") or len(response_data["choices"]) == 0:
                return {
                    "success": False,
                    "error": "No content returned from OpenRouter API",
                    "extracted_content": None,
                    "file_annotations": None
                }
            
            # Get the assistant's response
            assistant_message = response_data["choices"][0]["message"]
            content_text = assistant_message.get("content", "")
            file_annotations = assistant_message.get("annotations", "")
            
            # Parse the extracted content
            extracted_content = self._parse_ocr_response(
                content_text, 
                filename,
                translation_options
            )
            
            return {
                "success": True,
                "extracted_content": extracted_content,
                "file_annotations": json.dumps(file_annotations) if file_annotations else None,
                "error": None
            }
            
        except Exception as e:
            logger.error(f"Error processing PDF with OpenRouter: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "extracted_content": None,
                "file_annotations": None
            }
    
    def _create_extraction_prompt(self, translation_options: Optional[Dict] = None) -> str:
        """Create a prompt for PDF content extraction"""
        base_prompt = """Please extract all text content from this PDF document. 

Extract the content in a structured format with the following requirements:
1. Preserve the original text exactly as it appears
2. Maintain formatting and structure (headings, paragraphs, lists)
3. Extract any tables with their structure preserved
4. Note the page number for each piece of content
5. If there are images, describe their content and location

Format your response as JSON with this structure:
{
    "title": "Document title or filename",
    "pages": number_of_pages,
    "content": [
        {
            "type": "text|heading|table|image",
            "page_number": page_number,
            "content": "actual_content",
            "bbox": [x, y, width, height] // if available
        }
    ],
    "metadata": {
        "extractionTime": "ISO timestamp",
        "confidence": confidence_score,
        "wordCount": total_words
    }
}"""
        
        # Add translation instructions if needed
        if translation_options and translation_options.get("translate_enabled"):
            target_lang = translation_options.get("target_language", "zh")
            dual_language = translation_options.get("dual_language", False)
            
            if dual_language:
                base_prompt += f"""

TRANSLATION REQUIREMENTS:
- Translate all text content to {target_lang}
- Provide both original and translated text
- Add "translatedContent" field to each content item
- Preserve all formatting in both versions"""
            else:
                base_prompt += f"""

TRANSLATION REQUIREMENTS:
- Translate all text content to {target_lang}
- Replace the original content with translated content
- Maintain original structure and formatting"""
        
        return base_prompt
    
    def _parse_ocr_response(
        self,
        response_text: str,
        filename: str,
        translation_options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Parse the OCR response into structured content"""
        try:
            # Try to parse as JSON first
            if response_text.strip().startswith('{'):
                parsed_json = json.loads(response_text)
                return self._validate_and_format_content(parsed_json, filename, translation_options)
            
            # If not JSON, parse as plain text
            return self._parse_plain_text_response(response_text, filename, translation_options)
            
        except json.JSONDecodeError:
            # Fallback to plain text parsing
            return self._parse_plain_text_response(response_text, filename, translation_options)
    
    def _validate_and_format_content(
        self,
        parsed_content: Dict[str, Any],
        filename: str,
        translation_options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Validate and format the parsed JSON content"""
        # Ensure required fields exist
        if "title" not in parsed_content:
            parsed_content["title"] = filename
        
        if "content" not in parsed_content:
            parsed_content["content"] = []
        
        if "metadata" not in parsed_content:
            parsed_content["metadata"] = {}
        
        # Add processing metadata
        metadata = parsed_content["metadata"]
        metadata["extractionTime"] = datetime.now().isoformat()
        metadata["original_filename"] = filename
        metadata["processing_method"] = "openrouter_ocr"
        
        # Add translation metadata if applicable
        if translation_options and translation_options.get("translate_enabled"):
            metadata["isTranslated"] = True
            metadata["targetLanguage"] = translation_options.get("target_language", "zh")
            metadata["sourceLanguage"] = "auto"  # OCR auto-detects
        
        return parsed_content
    
    def _parse_plain_text_response(
        self,
        response_text: str,
        filename: str,
        translation_options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Parse plain text response into structured format"""
        lines = response_text.strip().split('\n')
        content_items = []
        
        current_page = 1
        word_count = 0
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for page indicators
            if line.lower().startswith('page') and any(char.isdigit() for char in line):
                try:
                    current_page = int(''.join(filter(str.isdigit, line)))
                    continue
                except ValueError:
                    pass
            
            # Determine content type
            content_type = "text"
            if line.startswith('#') or line.isupper():
                content_type = "heading"
            elif '|' in line and line.count('|') > 2:
                content_type = "table"
            
            content_items.append({
                "type": content_type,
                "page_number": current_page,
                "content": line,
                "bbox": None  # Not available from plain text
            })
            
            word_count += len(line.split())
        
        # Build metadata
        metadata = {
            "extractionTime": datetime.now().isoformat(),
            "original_filename": filename,
            "processing_method": "openrouter_ocr",
            "wordCount": word_count,
            "confidence": 0.85  # Default confidence for OCR
        }
        
        # Add translation metadata if applicable
        if translation_options and translation_options.get("translate_enabled"):
            metadata["isTranslated"] = True
            metadata["targetLanguage"] = translation_options.get("target_language", "zh")
            metadata["sourceLanguage"] = "auto"
        
        return {
            "title": filename,
            "pages": current_page,
            "content": content_items,
            "metadata": metadata
        }


# Global service instance
openrouter_service = OpenRouterService() 