# Gemini 2.5 Flash Configuration Guide

This guide explains how to configure and use Gemini 2.5 Flash model with the PDF processing service.

## Overview

The PDF processing service now supports Gemini 2.5 Flash model (`gemini-2.5-flash-preview-05-20`) as the default model for PDF translation tasks. This model offers improved performance, reasoning capabilities, and cost efficiency compared to previous versions.

## Features

### Gemini 2.5 Flash Preview 05-20
- **Model ID**: `gemini-2.5-flash-preview-05-20`
- **Performance**: Better reasoning, code understanding, and long context handling
- **Efficiency**: 22% efficiency gains over previous versions
- **Cost**: More cost-effective than larger models
- **Context**: Large context window for processing extensive documents

## Configuration

### 1. Default Configuration

The service is now configured with Gemini 2.5 Flash as the default model:

```python
# Default parameters
model = 'gemini-2.5-flash-preview-05-20'
service = 'gemini'
source_lang = 'en'
target_lang = 'zh'
```

### 2. API Endpoints

#### Set Gemini Model
```bash
POST /config/model
Content-Type: application/json

{
  "service": "gemini",
  "model": "gemini-2.5-flash-preview-05-20"
}
```

#### Get Available Models
```bash
GET /config/models
```

Response:
```json
{
  "gemini": [
    "gemini-2.5-flash-preview-05-20",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-2.5-pro-preview-05-06"
  ],
  "openai": [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-3.5-turbo"
  ]
}
```

#### Process PDF with Specific Model
```bash
POST /pdf/process
Content-Type: multipart/form-data

pdf: [PDF file]
source_lang: en
target_lang: zh
service: gemini
model: gemini-2.5-flash-preview-05-20
api_key: [your_api_key]
```

### 3. Environment Variables

Set your Gemini API key:
```bash
export GEMINI_API_KEY="your_gemini_api_key_here"
```

### 4. Python Client Usage

```python
from pdf_service_async import process_pdf_async

# Process PDF with Gemini 2.5 Flash
result_files, metadata = await process_pdf_async(
    filepath="document.pdf",
    source_lang="en",
    target_lang="zh",
    service="gemini",
    api_key="your_api_key",
    model="gemini-2.5-flash-preview-05-20"
)
```

### 5. TypeScript Client Usage

```typescript
import { processStructuredPDF } from './api/pdf-service-client';

// Process PDF with Gemini 2.5 Flash
const result = await processStructuredPDF(
  pdfBuffer,
  "document.pdf",
  "en",
  "zh",
  "gemini-2.5-flash-preview-05-20"
);
```

## Testing

Run the test script to verify the configuration:

```bash
cd legacy_backup/scripts
python test_gemini_model.py
```

The test script will:
1. Check service health
2. List available models
3. Set the Gemini 2.5 Flash model
4. Configure API key (if provided)

## Available Models

### Gemini Models
- `gemini-2.5-flash-preview-05-20` (Default) - Latest Flash model with improved performance
- `gemini-1.5-flash` - Previous Flash model
- `gemini-1.5-pro` - Pro model for complex tasks
- `gemini-2.0-flash` - General 2.0 Flash model
- `gemini-2.5-pro-preview-05-06` - Latest Pro model

### Model Selection Guidelines

| Use Case | Recommended Model | Notes |
|----------|-------------------|--------|
| General PDF Translation | `gemini-2.5-flash-preview-05-20` | Best balance of performance and cost |
| Complex Documents | `gemini-2.5-pro-preview-05-06` | Better for complex reasoning |
| High Volume Processing | `gemini-1.5-flash` | Most cost-effective |
| Technical Documents | `gemini-2.5-flash-preview-05-20` | Improved code understanding |

## Migration from Previous Versions

If you're migrating from older versions:

1. **API Compatibility**: All existing endpoints remain functional
2. **Default Model**: The default model is now Gemini 2.5 Flash
3. **Configuration**: Use the new `/config/model` endpoint to set specific models
4. **Performance**: Expect better translation quality and faster processing

## Troubleshooting

### Common Issues

1. **Model Not Found**: Ensure you're using a valid model ID from the available models list
2. **API Key Issues**: Verify your Gemini API key is correctly set
3. **Service Errors**: Check the service logs for detailed error information

### Debug Commands

```bash
# Check service health
curl http://localhost:5000/health/check

# List available models
curl http://localhost:5000/config/models

# Set model
curl -X POST http://localhost:5000/config/model \
  -H "Content-Type: application/json" \
  -d '{"service": "gemini", "model": "gemini-2.5-flash-preview-05-20"}'
```

## Performance Notes

- Gemini 2.5 Flash offers 22% efficiency gains over previous versions
- Better handling of mathematical content and technical documents
- Improved reasoning capabilities for complex translation tasks
- Lower latency for real-time processing

## API Reference

For complete API documentation, visit: `http://localhost:5000/api/docs` when the service is running. 