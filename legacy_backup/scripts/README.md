# PDF Processing Service Integration

This directory contains scripts for setting up and running the Python-based PDF processing service that integrates PDFMathTranslate and BabelDOC for structured PDF processing.

## Overview

The PDF processing service provides an asynchronous REST API for processing structured PDFs using the PDFMathTranslate library and BabelDOC engine. This service is used by the main application when processing structured PDFs, while scanned PDFs are still processed using OpenRouter's OCR capabilities.

## Setup Instructions

### 1. Set up the Python environment

```bash
# Make the setup script executable
chmod +x scripts/setup_python_env.sh

# Run the setup script
./scripts/setup_python_env.sh
```

This script will:

- Create a Python virtual environment
- Install PDFMathTranslate and its dependencies
- Create a requirements.txt file for future reference

### 2. Start the PDF processing service

We provide two options for running the service:

#### Option A: Basic Flask Service

```bash
# Make the start script executable
chmod +x scripts/start_pdf_service.sh

# Start the service
./scripts/start_pdf_service.sh
```

#### Option B: Async Flask Service (Recommended)

```bash
# Make the start script executable
chmod +x scripts/start_pdf_service_async.sh

# Start the service
./scripts/start_pdf_service_async.sh
```

The async service uses Flask-RESTX for better API documentation and Gunicorn for improved performance.

The service will start on port 5000 by default. You can change the port by setting the `PORT` environment variable:

```bash
PORT=8000 ./scripts/start_pdf_service_async.sh
```

## Testing the Service

You can test the service using the provided test script:

```bash
# Activate the virtual environment
source python_env/bin/activate

# Run the test script with a sample PDF
python scripts/test_pdf_processing.py path/to/sample.pdf --api-key your_gemini_api_key
```

You can also access the API documentation at `http://localhost:5000/api/docs` when using the async service.

## API Endpoints (Async Service)

The async PDF processing service provides the following endpoints:

### Health Check

```http
GET /health/check
```

Returns the health status of the service.

### Process PDF

```http
POST /pdf/process
```

Processes a PDF file and returns the paths to the processed files.

Parameters (form data):

- `pdf`: The PDF file to process
- `source_lang`: Source language (default: en)
- `target_lang`: Target language (default: zh)
- `service`: Translation service to use (default: gemini)
- `api_key`: API key for the translation service (optional)

### Download Processed PDF

```http
GET /pdf/download/<filename>
```

Downloads a processed PDF file.

### Get Available Services

```http
GET /config/services
```

Returns the available translation services.

### Get Available Languages

```http
GET /config/languages
```

Returns the available languages for translation.

### Set API Key

```http
POST /config/api-key
```

Sets an API key for a specific service.

Parameters (JSON):

- `service`: Service name (e.g., "gemini", "openai")
- `api_key`: API key for the service

## Integration with Main Application

The main application integrates with this service through the `pdf-service-client.ts` module, which provides functions for:

- Processing structured PDFs
- Checking the health of the PDF service
- Getting available services and languages from the PDF service
- Setting API keys in the PDF service

The application will automatically use this service for structured PDFs if it's available, and fall back to OpenRouter processing if not.

## Performance Improvements

The async service includes several performance improvements:

1. **Asynchronous Processing**: Uses asyncio to handle requests asynchronously
2. **Gunicorn WSGI Server**: Uses Gunicorn with multiple workers for better concurrency
3. **Swagger Documentation**: Provides interactive API documentation with Flask-RESTX
4. **Improved Error Handling**: Better error reporting and exception handling
5. **Efficient File Handling**: Proper cleanup of temporary files

## Troubleshooting

If you encounter issues with the PDF processing service:

1. Check that the Python environment is set up correctly
2. Verify that PDFMathTranslate is installed properly
3. Check that the service is running and accessible
4. Check the logs for any error messages
5. Verify that the API keys are set correctly
6. Check the Swagger documentation at `/api/docs` for API details

If the service is not available, the main application will fall back to using OpenRouter for all PDF processing.
