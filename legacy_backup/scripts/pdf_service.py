#!/usr/bin/env python3
"""
REST API service for PDF processing using PDFMathTranslate.
"""

import os
import json
import tempfile
import uuid
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from pdf2zh.high_level import translate
from pdf2zh.config import ConfigManager

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = tempfile.gettempdir()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25MB max upload

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "pdf-processor"})

@app.route('/api/process-pdf', methods=['POST'])
def process_pdf():
    """Process a PDF file."""
    # Check if the post request has the file part
    if 'pdf' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['pdf']
    
    # If user does not select file, browser also submits an empty part without filename
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # Get parameters
    source_lang = request.form.get('source_lang', 'en')
    target_lang = request.form.get('target_lang', 'zh')
    service = request.form.get('service', 'gemini')
    api_key = request.form.get('api_key', None)
    
    # Set API key if provided
    if api_key and service == 'gemini':
        ConfigManager.set('GEMINI_API_KEY', api_key)
    
    # Save the file with a secure filename
    filename = secure_filename(file.filename)
    temp_filename = f"{uuid.uuid4()}_{filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
    
    try:
        file.save(filepath)
        
        # Process the PDF
        result = translate(
            filepath,
            lang_in=source_lang,
            lang_out=target_lang,
            service=service,
            thread=4
        )
        
        # Read the output file
        with open(result, 'r', encoding='utf-8') as f:
            output_content = f.read()
        
        return jsonify({
            "status": "success",
            "output": output_content,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "service": service
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        # Clean up temporary files
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get current configuration."""
    config = {
        "available_services": [
            "google", "bing", "deepl", "deeplx", "ollama", "xinference",
            "openai", "zhipu", "modelscope", "silicon", "gemini", "azure",
            "tencent", "dify", "anythingllm", "argos", "grok", "groq", "deepseek"
        ],
        "available_languages": {
            "source": ["en", "zh", "ja", "ko", "fr", "de", "es", "ru", "it"],
            "target": ["en", "zh", "zh-TW", "ja", "ko", "fr", "de", "es", "ru", "it"]
        }
    }
    return jsonify(config)

@app.route('/api/set-api-key', methods=['POST'])
def set_api_key():
    """Set API key for a service."""
    data = request.json
    if not data or 'service' not in data or 'api_key' not in data:
        return jsonify({"error": "Missing service or api_key"}), 400
    
    service = data['service']
    api_key = data['api_key']
    
    # Set the API key in the configuration
    if service == 'gemini':
        ConfigManager.set('GEMINI_API_KEY', api_key)
    elif service == 'openai':
        ConfigManager.set('OPENAI_API_KEY', api_key)
    else:
        return jsonify({"error": f"Unsupported service: {service}"}), 400
    
    return jsonify({"status": "success", "message": f"API key for {service} updated"})

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5000))
    
    # Run the app
    app.run(host='0.0.0.0', port=port, debug=True)
