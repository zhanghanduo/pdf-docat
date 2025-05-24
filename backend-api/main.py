from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import os
import uuid
import shutil
from pathlib import Path
import logging
from typing import Optional
import tempfile
import asyncio
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create upload directories
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Request/Response models
class TranslateRequest(BaseModel):
    source_lang: str = "en"
    target_lang: str = "zh"
    dual: bool = False

class TranslateResponse(BaseModel):
    task_id: str
    message: str
    status: str

class HealthResponse(BaseModel):
    status: str
    version: str
    pdftranslate_available: bool

# Global variables for PDF translation
pdftranslate_available = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global pdftranslate_available
    try:
        # Try to import PDFMathTranslate
        global translate_pdf_func
        from PDFMathTranslate.pdf2zh.high_level import translate
        translate_pdf_func = translate
        pdftranslate_available = True
        logger.info("PDFMathTranslate loaded successfully")
    except ImportError as e:
        logger.warning(f"PDFMathTranslate not available: {e}")
        pdftranslate_available = False
    
    yield
    # Shutdown
    logger.info("Application shutting down")

# Initialize FastAPI app
app = FastAPI(
    title="PDF-Docat API",
    description="A standalone PDF translation API using PDFMathTranslate",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Optional authentication - for future use"""
    return credentials

@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API information"""
    return {
        "message": "PDF-Docat API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        pdftranslate_available=pdftranslate_available
    )

@app.post("/api/v1/translate", response_model=TranslateResponse)
async def translate_pdf(
    file: UploadFile = File(...),
    source_lang: str = "en",
    target_lang: str = "zh",
    dual: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(get_current_user)
):
    """
    Translate a PDF file from source language to target language
    """
    if not pdftranslate_available:
        raise HTTPException(
            status_code=503,
            detail="PDF translation service is not available"
        )
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )
    
    task_id = str(uuid.uuid4())
    
    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as input_temp:
            # Save uploaded file
            content = await file.read()
            input_temp.write(content)
            input_temp.flush()
            
            # Create output filename
            output_filename = f"translated_{task_id}.pdf"
            output_path = OUTPUT_DIR / output_filename
            
            # Run translation in a thread to avoid blocking
            def run_translation():
                return translate_pdf_func(
                    pdf_path=input_temp.name,
                    output_path=str(output_path),
                    lang_in=source_lang,
                    lang_out=target_lang,
                    dual=dual
                )
            
            # Execute translation
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, run_translation)
            
            # Clean up input file
            os.unlink(input_temp.name)
            
            return TranslateResponse(
                task_id=task_id,
                message="Translation completed successfully",
                status="completed"
            )
            
    except Exception as e:
        logger.error(f"Translation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Translation failed: {str(e)}"
        )

@app.get("/api/v1/download/{task_id}")
async def download_translated_pdf(
    task_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(get_current_user)
):
    """
    Download the translated PDF file
    """
    output_filename = f"translated_{task_id}.pdf"
    output_path = OUTPUT_DIR / output_filename
    
    if not output_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Translated file not found"
        )
    
    return FileResponse(
        path=str(output_path),
        filename=f"translated_{task_id}.pdf",
        media_type="application/pdf"
    )

@app.delete("/api/v1/cleanup/{task_id}")
async def cleanup_files(
    task_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(get_current_user)
):
    """
    Clean up temporary files for a task
    """
    output_filename = f"translated_{task_id}.pdf"
    output_path = OUTPUT_DIR / output_filename
    
    if output_path.exists():
        os.unlink(output_path)
        return {"message": "Files cleaned up successfully"}
    
    return {"message": "No files to clean up"}

@app.get("/api/v1/supported-languages")
async def get_supported_languages():
    """
    Get list of supported languages
    """
    return {
        "languages": {
            "en": "English",
            "zh": "Chinese (Simplified)",
            "zh-TW": "Chinese (Traditional)",
            "ja": "Japanese",
            "ko": "Korean",
            "fr": "French",
            "de": "German",
            "es": "Spanish",
            "it": "Italian",
            "pt": "Portuguese",
            "ru": "Russian",
            "ar": "Arabic"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", 8000)),
        reload=True
    ) 