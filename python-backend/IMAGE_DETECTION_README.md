# PDF Image Detection and OpenRouter OCR Integration

This document describes the new intelligent PDF processing logic that automatically determines whether to use PDFMathTranslate (for text-based PDFs) or OpenRouter OCR (for image-containing PDFs).

## Overview

The system now automatically analyzes PDF documents to detect whether they contain images and chooses the optimal processing method:

- **No images detected**: Use PDFMathTranslate for efficient text extraction
- **Images detected**: Use OpenRouter.ai for OCR processing

## Architecture

### Components

1. **Image Detection Service** (`app/services/image_detection.py`)
   - Analyzes PDF structure using PyMuPDF
   - Detects images, text blocks, and content ratios
   - Provides confidence scores and recommendations

2. **OpenRouter Service** (`app/services/openrouter_service.py`) 
   - Integrates with OpenRouter.ai API for OCR
   - Supports multiple engines (mistral-ocr, pdf-text)
   - Handles translation and structured output

3. **Enhanced PDF Service** (`app/services/pdf_service.py`)
   - Updated main processing logic
   - Automatic engine selection
   - Fallback mechanisms

## Usage

### Automatic Detection (Recommended)

```python
# The system automatically detects the PDF type
result = await process_pdf(
    db=db,
    user=user,
    file=pdf_file,
    engine="auto",  # Automatic detection
    translation_options=translation_options
)
```

### Manual Testing

```bash
# Test image detection on a PDF file
cd python-backend
python test_image_detection.py path/to/your/document.pdf
```

## Detection Logic

### Image Analysis

The system uses PyMuPDF to analyze PDF structure:

```python
# Per-page analysis
for page in document:
    images = page.get_images()
    text_blocks = page.get_text("dict")
    
    # Analyze image size and density
    # Determine text-to-image ratio
    # Calculate confidence scores
```

### Decision Rules

1. **High confidence structured** (text-to-image ratio > 2, no large images)
   → Use PDFMathTranslate

2. **High confidence scanned** (>50% pages with large images, little text)
   → Use OpenRouter OCR

3. **Low confidence** 
   → Use OpenRouter OCR (conservative approach)

## Configuration

### Environment Variables

```bash
# Required for OpenRouter OCR
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Optional: Gemini for translation (if using PDFMathTranslate)
GEMINI_API_KEY=your-gemini-key-here
```

### Engine Selection

- `auto`: Automatic detection (recommended)
- `pdf-text`: Force PDFMathTranslate
- `mistral-ocr`: Force OpenRouter OCR

## OpenRouter Integration

### Supported Engines

1. **mistral-ocr**: Best for scanned documents ($2 per 1,000 pages)
2. **pdf-text**: For text-based PDFs (Free)
3. **native**: Model-specific processing (charged as input tokens)

### API Features Used

- PDF file upload with base64 encoding
- Plugin-based engine selection
- File annotations for caching
- Structured JSON responses

## Error Handling

### Fallback Strategy

1. **Primary**: Use detected method (OCR or text extraction)
2. **Fallback**: If OCR fails, attempt text extraction with warning
3. **Final**: Return error if both methods fail

### Error Types

- OpenRouter API failures
- Image detection errors
- PyMuPDF unavailable
- API key missing/invalid

## Performance Considerations

### Caching

- File-based caching using SHA-256 hash
- Detection results cached with processing logs
- OpenRouter file annotations for repeat requests

### Rate Limiting

- OpenRouter: 20 requests/minute
- Automatic retry with exponential backoff
- Queue management for concurrent requests

## Monitoring and Logging

### Detection Metrics

```python
{
    "analysis_method": "pymupdf",
    "has_images": true,
    "image_count": 5,
    "confidence": 0.85,
    "recommendation": "ocr",
    "scanned_pages": [1, 2, 3],
    "structured_pages": [4, 5]
}
```

### Processing Logs

All decisions and results are logged with:
- Detection confidence scores
- Processing method used
- Fallback reasons (if any)
- Performance metrics

## Testing

### Unit Tests

```bash
# Test image detection
python test_image_detection.py document.pdf

# Test with multiple files
python test_image_detection.py doc1.pdf doc2.pdf doc3.pdf
```

### Sample Output

```
🔍 Analyzing PDF: document.pdf
==================================================
📄 File size: 2,345.6 KB

🔬 Detection Results:
  • Analysis method: pymupdf
  • Has images: true
  • Image count: 8
  • Total pages: 10
  • Text-to-image ratio: 1.25
  • Confidence: 0.87
  • Recommendation: ocr

📋 Processing Decision:
  • Recommended method: OpenRouter OCR
  • Use OCR: true

📊 Per-page Analysis:
  Page 1: 🖼️  Scanned (conf: 0.90, images: 2, text: 45 chars)
  Page 2: 🖼️  Scanned (conf: 0.85, images: 1, text: 123 chars)
  Page 3: 📝 Structured (conf: 0.80, images: 0, text: 1,234 chars)
```

## Migration Guide

### For Existing Users

The new logic is backward compatible:

- `engine="auto"` uses intelligent detection
- `engine="pdf-text"` forces PDFMathTranslate (old behavior)
- `engine="mistral-ocr"` forces OpenRouter OCR

### API Changes

No breaking changes to existing endpoints. New metadata added to responses:

```json
{
    "metadata": {
        "detection_info": {
            "has_images": true,
            "image_count": 5,
            "analysis_method": "pymupdf",
            "confidence": 0.87,
            "scanned_pages": [1, 2, 3]
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **PyMuPDF not available**
   - Falls back to basic binary analysis
   - Install: `pip install pymupdf`

2. **OpenRouter API errors**
   - Check API key configuration
   - Verify account credits/limits
   - Check network connectivity

3. **Low detection confidence**
   - Review PDF structure manually
   - Force specific engine if needed
   - Check processing logs for details

### Debug Commands

```bash
# Check API key
echo $OPENROUTER_API_KEY

# Test basic detection
python -c "from app.services.image_detection import detect_images_in_pdf; print('Detection service loaded')"

# Check logs
tail -f logs/app.log | grep -E "(Detection|OCR|image)"
```

## Future Enhancements

- Machine learning-based detection
- Custom confidence thresholds
- Per-user processing preferences
- Advanced OCR post-processing
- Multi-language detection optimization 