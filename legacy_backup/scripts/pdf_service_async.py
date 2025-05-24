#!/usr/bin/env python3
"""
Async REST API service for PDF processing using PDFMathTranslate.
Uses Flask-RESTX for better API documentation and asyncio for improved performance.
"""

import os
import json
import tempfile
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from functools import wraps

from flask import Flask, request, jsonify, send_file
from flask_restx import Api, Resource, fields, Namespace
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import PDFMathTranslate modules
from pdf2zh.high_level import translate
from pdf2zh.config import ConfigManager
from pdf2zh.translator import GeminiTranslator

# Configure upload folder
UPLOAD_FOLDER = tempfile.gettempdir()
MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25MB max upload

# Create Flask app
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Create API with Swagger documentation
api = Api(
    app,
    version='1.0',
    title='PDF Processing API',
    description='API for processing PDFs using PDFMathTranslate',
    doc='/api/docs'
)

# Create namespaces
ns_pdf = api.namespace('pdf', description='PDF processing operations')
ns_config = api.namespace('config', description='Configuration operations')
ns_health = api.namespace('health', description='Health check operations')

# Define models for API documentation
pdf_process_model = ns_pdf.model('PDFProcessRequest', {
    'source_lang': fields.String(required=False, default='en', description='Source language'),
    'target_lang': fields.String(required=False, default='zh', description='Target language'),
    'service': fields.String(required=False, default='gemini', description='Translation service'),
    'api_key': fields.String(required=False, description='API key for the translation service'),
    'model': fields.String(required=False, default='gemini-2.5-flash-preview-05-20', description='Gemini model to use'),
})

api_key_model = ns_config.model('APIKeyRequest', {
    'service': fields.String(required=True, description='Service name (e.g., "gemini", "openai")'),
    'api_key': fields.String(required=True, description='API key for the service'),
})

model_config_model = ns_config.model('ModelConfigRequest', {
    'service': fields.String(required=True, description='Service name (e.g., "gemini")'),
    'model': fields.String(required=True, description='Model name (e.g., "gemini-2.5-flash-preview-05-20")'),
})

# Helper function to run async functions in Flask
def async_route(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(f(*args, **kwargs))
        finally:
            loop.close()
    return wrapper

# Helper function to process PDF asynchronously
async def process_pdf_async(
    filepath: str,
    source_lang: str = 'en',
    target_lang: str = 'zh',
    service: str = 'gemini',
    api_key: Optional[str] = None,
    model: str = 'gemini-2.5-flash-preview-05-20'
) -> Tuple[List[Tuple[str, str]], Dict[str, Any]]:
    """
    Process a PDF file asynchronously using PDFMathTranslate.
    
    Args:
        filepath: Path to the PDF file
        source_lang: Source language code
        target_lang: Target language code
        service: Translation service to use
        api_key: API key for the translation service
        model: Gemini model to use
        
    Returns:
        Tuple of (result_files, metadata)
    """
    # Set API key if provided
    if api_key and service == 'gemini':
        ConfigManager.set('GEMINI_API_KEY', api_key)
        logger.info(f"Set {service} API key for processing")
    
    # Set Gemini model if provided
    if service == 'gemini' and model:
        ConfigManager.set('GEMINI_MODEL', model)
        logger.info(f"Set Gemini model to {model}")
    
    # Create a new event loop for the async operation
    loop = asyncio.get_event_loop()
    
    # Create a cancellation event
    cancellation_event = asyncio.Event()
    
    # Process the PDF in a separate thread to avoid blocking
    result_files = await loop.run_in_executor(
        None,
        lambda: translate(
            files=[filepath],
            lang_in=source_lang,
            lang_out=target_lang,
            service=service,
            thread=4,  # Use 4 threads for processing
            cancellation_event=cancellation_event
        )
    )
    
    # Collect metadata about the processing
    metadata = {
        "source_lang": source_lang,
        "target_lang": target_lang,
        "service": service,
        "model": model if service == 'gemini' else None,
        "original_file": os.path.basename(filepath),
        "timestamp": os.path.getmtime(result_files[0][0])
    }
    
    return result_files, metadata

# API endpoints
@ns_health.route('/check')
class HealthCheck(Resource):
    def get(self):
        """Health check endpoint."""
        return {"status": "ok", "service": "pdf-processor"}

@ns_config.route('/services')
class ConfigServices(Resource):
    def get(self):
        """Get available translation services."""
        services = [
            "google", "bing", "deepl", "deeplx", "ollama", "xinference",
            "openai", "zhipu", "modelscope", "silicon", "gemini", "azure",
            "tencent", "dify", "anythingllm", "argos", "grok", "groq", "deepseek"
        ]
        return {"available_services": services}

@ns_config.route('/languages')
class ConfigLanguages(Resource):
    def get(self):
        """Get available languages."""
        languages = {
            "source": ["en", "zh", "ja", "ko", "fr", "de", "es", "ru", "it"],
            "target": ["en", "zh", "zh-TW", "ja", "ko", "fr", "de", "es", "ru", "it"]
        }
        return languages

@ns_config.route('/models')
class ConfigModels(Resource):
    def get(self):
        """Get available models for each service."""
        models = {
            "gemini": [
                "gemini-2.5-flash-preview-05-20",
                "gemini-2.0-flash",
                "gemini-2.5-pro-preview-05-06"
            ],
            "openai": [
                "gpt-4o-mini", 
                "gpt-4o",
                "gpt-4.1",
                "gpt-4.1-mini"
            ]
        }
        return models

@ns_config.route('/api-key')
class ConfigApiKey(Resource):
    @ns_config.expect(api_key_model)
    def post(self):
        """Set API key for a service."""
        data = request.json
        service = data.get('service')
        api_key = data.get('api_key')
        
        if not service or not api_key:
            return {"error": "Missing service or api_key"}, 400
        
        # Set the API key in the configuration
        if service == 'gemini':
            ConfigManager.set('GEMINI_API_KEY', api_key)
        elif service == 'openai':
            ConfigManager.set('OPENAI_API_KEY', api_key)
        else:
            return {"error": f"Unsupported service: {service}"}, 400
        
        return {"status": "success", "message": f"API key for {service} updated"}

@ns_config.route('/model')
class ConfigModel(Resource):
    @ns_config.expect(model_config_model)
    def post(self):
        """Set model for a service."""
        data = request.json
        service = data.get('service')
        model = data.get('model')
        
        if not service or not model:
            return {"error": "Missing service or model"}, 400
        
        # Set the model in the configuration
        if service == 'gemini':
            ConfigManager.set('GEMINI_MODEL', model)
        else:
            return {"error": f"Unsupported service: {service}"}, 400
        
        return {"status": "success", "message": f"Model for {service} updated to {model}"}

# File upload parser
upload_parser = ns_pdf.parser()
upload_parser.add_argument('pdf', location='files', type=FileStorage, required=True, help='PDF file')
upload_parser.add_argument('source_lang', location='form', type=str, default='en', help='Source language')
upload_parser.add_argument('target_lang', location='form', type=str, default='zh', help='Target language')
upload_parser.add_argument('service', location='form', type=str, default='gemini', help='Translation service')
upload_parser.add_argument('api_key', location='form', type=str, help='API key for the translation service')
upload_parser.add_argument('model', location='form', type=str, default='gemini-2.5-flash-preview-05-20', help='Gemini model to use')

@ns_pdf.route('/process')
class ProcessPDF(Resource):
    @ns_pdf.expect(upload_parser)
    @async_route
    async def post(self):
        """Process a PDF file."""
        # Check if the post request has the file part
        if 'pdf' not in request.files:
            return {"error": "No file part"}, 400
        
        file = request.files['pdf']
        
        # If user does not select file, browser also submits an empty part without filename
        if file.filename == '':
            return {"error": "No selected file"}, 400
        
        # Get parameters
        source_lang = request.form.get('source_lang', 'en')
        target_lang = request.form.get('target_lang', 'zh')
        service = request.form.get('service', 'gemini')
        api_key = request.form.get('api_key', None)
        model = request.form.get('model', 'gemini-2.5-flash-preview-05-20')
        
        # Save the file with a secure filename
        filename = secure_filename(file.filename)
        temp_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
        
        try:
            file.save(filepath)
            logger.info(f"Processing PDF: {filename} with {service} translator")
            
            # Process the PDF
            result_files, metadata = await process_pdf_async(
                filepath,
                source_lang,
                target_lang,
                service,
                api_key,
                model
            )
            
            # Return the paths to the processed files
            return {
                "status": "success",
                "files": {
                    "mono": os.path.basename(result_files[0][0]),
                    "dual": os.path.basename(result_files[0][1])
                },
                "metadata": metadata
            }
        
        except Exception as e:
            logger.exception(f"Error processing PDF: {str(e)}")
            return {"error": str(e)}, 500
        
        finally:
            # Clean up temporary files
            if os.path.exists(filepath):
                os.remove(filepath)

@ns_pdf.route('/download/<filename>')
class DownloadPDF(Resource):
    def get(self, filename):
        """Download a processed PDF file."""
        try:
            # Ensure the filename is secure
            filename = secure_filename(filename)
            
            # Look for the file in the temp directory
            filepath = None
            for root, dirs, files in os.walk(tempfile.gettempdir()):
                if filename in files:
                    filepath = os.path.join(root, filename)
                    break
            
            if not filepath or not os.path.exists(filepath):
                return {"error": "File not found"}, 404
            
            # Send the file
            return send_file(
                filepath,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=filename
            )
        
        except Exception as e:
            logger.exception(f"Error downloading file: {str(e)}")
            return {"error": str(e)}, 500

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5000))
    
    # Run the app
    app.run(host='0.0.0.0', port=port, debug=True)
