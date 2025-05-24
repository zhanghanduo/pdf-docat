# PDF-Docat Backend API

A standalone FastAPI backend service for PDF translation using PDFMathTranslate (v2-rc branch).

## Features

- PDF translation between multiple languages
- RESTful API with automatic documentation
- File upload/download support
- Health check endpoint
- CORS support for frontend integration
- Docker support
- Replit deployment ready
- Automatic PDFMathTranslate installation (v2-rc branch)

## API Endpoints

### Core Endpoints
- `GET /` - API information
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation

### Translation Endpoints
- `POST /api/v1/translate` - Upload and translate PDF
- `GET /api/v1/download/{task_id}` - Download translated PDF
- `DELETE /api/v1/cleanup/{task_id}` - Clean up temporary files
- `GET /api/v1/supported-languages` - Get supported languages

## Quick Start

### Option 1: Automatic Setup (Recommended)

1. Install dependencies and PDFMathTranslate automatically:
```bash
python setup.py
```

2. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Option 2: Manual Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Install PDFMathTranslate (v2-rc branch):
```bash
git clone https://github.com/awwaawwa/PDFMathTranslate.git
cd PDFMathTranslate
git checkout v2-rc
pip install -e .
cd ..
```

3. Run the server:
```bash
python main.py
```

### Option 3: Docker Deployment

```bash
docker build -t pdf-docat-api .
docker run -p 8000:8000 pdf-docat-api
```

### Option 4: Replit Deployment

1. Create a new Python Replit project
2. Upload all files from this directory
3. Run the automatic setup:
```bash
python setup.py
```
4. Start the application:
```bash
python main.py
```

Your API will be accessible at your Replit domain: `https://{your-repl-name}.{your-username}.replit.dev`

## PDFMathTranslate Integration

This backend automatically handles PDFMathTranslate installation and integration:

### Automatic Installation
- The `setup.py` script automatically clones PDFMathTranslate from awwaawwa/PDFMathTranslate repository
- Automatically checks out the `v2-rc` branch for latest features
- No manual intervention required
- Verifies installation success

### Repository Details
- **Repository**: https://github.com/awwaawwa/PDFMathTranslate.git
- **Branch**: v2-rc
- **Installation**: Automatic via setup.py script

### Fallback Handling
- If PDFMathTranslate is not available, the API will still start
- Health endpoint will report translation availability status
- Graceful error handling for translation requests
- If branch checkout fails, continues with default branch

### Directory Structure
```
backend-api/
├── main.py              # Main FastAPI application
├── setup.py             # Automatic setup script
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker configuration
├── .replit             # Replit configuration
├── .gitignore          # Git ignore rules
├── README.md           # This file
├── PDFMathTranslate/   # Auto-installed (v2-rc branch, ignored by git)
├── uploads/            # Temporary upload directory (auto-created)
├── outputs/            # Translated files directory (auto-created)
└── logs/               # Log files directory (auto-created)
```

## Usage Example

```python
import requests

# Health check
response = requests.get("https://your-api-domain.com/health")
print(response.json())

# Upload and translate PDF
with open("document.pdf", "rb") as file:
    files = {"file": file}
    data = {
        "source_lang": "en",
        "target_lang": "zh",
        "dual": False
    }
    response = requests.post(
        "https://your-api-domain.com/api/v1/translate",
        files=files,
        data=data
    )
    result = response.json()
    task_id = result["task_id"]

# Download translated PDF
response = requests.get(f"https://your-api-domain.com/api/v1/download/{task_id}")
with open("translated.pdf", "wb") as f:
    f.write(response.content)
```

## Environment Variables

- `PORT` - Server port (default: 8000)
- `PYTHONPATH` - Python path configuration

## Supported Languages

- English (en)
- Chinese Simplified (zh)
- Chinese Traditional (zh-TW)
- Japanese (ja)
- Korean (ko)
- French (fr)
- German (de)
- Spanish (es)
- Italian (it)
- Portuguese (pt)
- Russian (ru)
- Arabic (ar)

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid file type, missing parameters)
- `404` - File not found
- `500` - Internal server error
- `503` - Service unavailable (PDFMathTranslate not loaded)

## Troubleshooting

### Common Issues

1. **PDFMathTranslate Installation Failed**
   - Ensure git is available in the environment
   - Check internet connectivity
   - Run `python setup.py` manually

2. **Branch Checkout Failed**
   - Verify the v2-rc branch exists in the repository
   - Check git permissions and connectivity
   - The script will continue with default branch if checkout fails

3. **Import Errors**
   - Verify PDFMathTranslate installation: `python -c "import PDFMathTranslate"`
   - Check Python path configuration
   - Reinstall dependencies: `pip install -r requirements.txt`

4. **Translation Service Unavailable**
   - Check the `/health` endpoint for service status
   - Review application logs for error details
   - Ensure PDFMathTranslate is properly installed

### Debug Commands

```bash
# Check PDFMathTranslate installation
python -c "import PDFMathTranslate; print('✅ PDFMathTranslate available')"

# Check current branch
cd PDFMathTranslate && git branch --show-current

# Run setup script
python setup.py

# Check health endpoint
curl http://localhost:8000/health

# View API documentation
# Open http://localhost:8000/docs in browser
```

## Security

- CORS configured for frontend integration
- Optional authentication headers support
- File validation and cleanup
- Temporary file management
- Input sanitization and validation

## Performance

- Asynchronous file processing
- Automatic cleanup of temporary files
- Efficient memory management
- Request timeout handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes thoroughly
4. Submit a pull request

## License

This project is open source and available under the MIT License. 