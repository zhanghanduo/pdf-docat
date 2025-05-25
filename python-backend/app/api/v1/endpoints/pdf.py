from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import json

from app.api import deps
from app.core.logging import log_user_action
from app.services import pdf_service
from app.models.user import User
from app.models.processing_log import ProcessingLog
from app.schemas.processing import ProcessingLog as ProcessingLogSchema, TranslationOptions

router = APIRouter()


@router.post("/process")
@router.post("/process-pdf")  # Add alias to match frontend endpoint
async def process_pdf(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    engine: str = Form("auto"),
    translate_enabled: bool = Form(False),
    target_language: str = Form("simplified-chinese"),
    dual_language: bool = Form(False),
    file_annotations: Optional[str] = Form(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Process a PDF file.
    """
    # Validate engine
    from app.core.config import settings
    if engine not in settings.ENGINE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid engine type. Must be one of: {', '.join(settings.ENGINE_TYPES)}",
        )
    
    # Validate target language
    if target_language not in settings.TARGET_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target language. Must be one of: {', '.join(settings.TARGET_LANGUAGES)}",
        )
    
    # Create translation options
    translation_options = TranslationOptions(
        translate_enabled=translate_enabled,
        target_language=target_language,
        dual_language=dual_language
    )
    
    # Process the PDF
    result = await pdf_service.process_pdf(
        db,
        current_user,
        file,
        engine,
        translation_options,
        file_annotations
    )
    
    # Log PDF processing
    log_user_action(
        db, 
        current_user.id, 
        "Processed PDF", 
        {
            "filename": file.filename,
            "engine": engine,
            "logId": result.get("logId")
        }
    )
    
    return JSONResponse(content=result)


@router.get("/logs", response_model=List[ProcessingLogSchema])
@router.get("/processing-logs", response_model=List[ProcessingLogSchema])  # Add alias to match frontend endpoint
def read_processing_logs(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    limit: int = 10,
    offset: int = 0,
    page: int = 1,  # Add pagination parameter expected by frontend
) -> Any:
    """
    Get current user's processing logs.
    Supports both offset/limit and page/limit pagination.
    """
    # Convert page to offset if page parameter is used
    if page > 1:
        offset = (page - 1) * limit
    logs = db.query(ProcessingLog).filter(
        ProcessingLog.user_id == current_user.id
    ).order_by(
        ProcessingLog.timestamp.desc()
    ).offset(offset).limit(limit).all()
    
    return logs


@router.get("/logs/{log_id}", response_model=ProcessingLogSchema)
@router.get("/processing-logs/{log_id}", response_model=ProcessingLogSchema)  # Add alias to match frontend endpoint
def read_processing_log(
    *,
    db: Session = Depends(deps.get_db),
    log_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get a specific processing log.
    """
    log = db.query(ProcessingLog).filter(
        ProcessingLog.id == log_id
    ).first()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processing log not found",
        )
    
    # Regular users can only access their own logs
    if current_user.role != "admin" and log.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    return log


@router.get("/logs/user/{user_id}", response_model=List[ProcessingLogSchema])
def read_user_processing_logs(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Get a specific user's processing logs. Admin only.
    """
    logs = db.query(ProcessingLog).filter(
        ProcessingLog.user_id == user_id
    ).order_by(
        ProcessingLog.timestamp.desc()
    ).offset(offset).limit(limit).all()
    
    return logs


@router.post("/translate")
async def translate_pdf(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    source_lang: str = Form("en"),
    target_lang: str = Form("zh"),
    dual: bool = Form(False),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Direct PDF translation endpoint.
    """
    # Validate source and target languages
    from app.core.config import settings
    
    # Map common language codes to our system
    lang_mapping = {
        "en": "english",
        "zh": "simplified-chinese",
        "zh-cn": "simplified-chinese", 
        "zh-tw": "traditional-chinese",
        "de": "german",
        "ja": "japanese",
        "es": "spanish",
        "fr": "french"
    }
    
    # Convert to our internal language codes
    mapped_target = lang_mapping.get(target_lang, target_lang)
    if mapped_target not in settings.TARGET_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target language. Must be one of: {', '.join(settings.TARGET_LANGUAGES)}",
        )
    
    # Create translation options with translate enabled
    translation_options = TranslationOptions(
        translate_enabled=True,
        target_language=mapped_target,
        dual_language=dual
    )
    
    # Use auto engine for translation
    result = await pdf_service.process_pdf(
        db,
        current_user,
        file,
        "auto",  # Use auto engine
        translation_options,
        None  # No file annotations
    )
    
    # Log translation action
    log_user_action(
        db, 
        current_user.id, 
        "Translated PDF", 
        {
            "filename": file.filename,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "dual": dual,
            "logId": result.get("logId")
        }
    )
    
    return JSONResponse(content=result)
