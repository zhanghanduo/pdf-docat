from typing import Any, Optional
from uuid import uuid4
import hashlib
import os
import time

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.services.background_processor import task_manager
from app.services.replit_cache import cache_manager
from app.services.rate_limiter import rate_limiter
from app.models.user import User
from app.schemas.processing import TranslationOptions

router = APIRouter()

# File processing function for background tasks
async def process_pdf_file(file_path: str, engine: str, translation_options: dict, 
                          cache_key: str, user_id: int, filename: str) -> dict:
    """
    Process PDF file in background - replaces Celery task
    """
    import logging
    
    logger = logging.getLogger(__name__)
    start_time = time.time()
    
    try:
        # Import PDF processing service
        from app.services.pdf_service import PDFService
        
        logger.info(f"Starting PDF processing: {filename}")
        
        # Initialize PDF service
        pdf_service = PDFService()
        
        # Process the PDF
        if translation_options.get('translate_enabled', False):
            # Translation enabled
            result = await pdf_service.translate_pdf(
                file_path=file_path,
                engine=engine,
                target_language=translation_options.get('target_language', 'simplified-chinese'),
                dual_language=translation_options.get('dual_language', False)
            )
        else:
            # OCR only
            result = await pdf_service.extract_text_from_pdf(file_path)
        
        processing_time = time.time() - start_time
        
        # Prepare final result
        final_result = {
            'content': result,
            'processing_time': processing_time,
            'engine': engine,
            'translation_options': translation_options,
            'completed_at': time.time(),
            'filename': filename
        }
        
        # Cache the result
        cache_manager.set(cache_key, final_result, ttl=7200)  # 2 hours
        
        logger.info(f"PDF processing completed in {processing_time:.2f}s: {filename}")
        
        # Clean up file
        try:
            os.remove(file_path)
        except:
            pass
        
        return final_result
        
    except Exception as e:
        logger.error(f"PDF processing failed: {e}", exc_info=True)
        
        # Clean up file
        try:
            os.remove(file_path)
        except:
            pass
        
        raise e


@router.post("/process-async")
async def process_pdf_async_endpoint(
    *,
    background_tasks: BackgroundTasks,
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
    Start asynchronous PDF processing using FastAPI BackgroundTasks
    Returns task ID for status tracking
    """
    from app.core.config import settings
    
    # Validate engine
    available_engines = getattr(settings, 'ENGINE_TYPES', ['auto', 'google', 'azure', 'openrouter'])
    if engine not in available_engines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid engine type. Must be one of: {', '.join(available_engines)}",
        )
    
    # Validate target language
    available_languages = getattr(settings, 'TARGET_LANGUAGES', ['simplified-chinese', 'traditional-chinese', 'english'])
    if target_language not in available_languages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target language. Must be one of: {', '.join(available_languages)}",
        )
    
    # Check rate limits
    rate_limit_result = rate_limiter.check_rate_limit(
        user_id=str(current_user.id),
        limit=10,  # 10 requests per hour
        window=3600
    )
    
    if not rate_limit_result['allowed']:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. {rate_limit_result['remaining']} requests remaining. Try again in {rate_limit_result['reset_time'] - time.time():.0f} seconds",
            headers={"Retry-After": str(int(rate_limit_result['reset_time'] - time.time()))}
        )
    
    try:
        # Read file data
        file_data = await file.read()
        
        # Check file size (50MB limit for Replit)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(file_data) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size too large. Maximum {max_size // (1024*1024)}MB allowed."
            )
        
        # Generate file hash for caching
        file_hash = hashlib.md5(file_data).hexdigest()
        
        # Create translation options
        translation_options = {
            'translate_enabled': translate_enabled,
            'target_language': target_language,
            'dual_language': dual_language
        }
        
        # Check cache first
        cache_key = cache_manager.generate_cache_key(file_hash, engine, translation_options)
        cached_result = cache_manager.get(cache_key)
        
        if cached_result:
            return JSONResponse(content={
                'status': 'CACHED',
                'result': cached_result,
                'message': 'Result retrieved from cache',
                'rate_limit': {
                    'remaining': rate_limit_result['remaining'],
                    'reset_time': rate_limit_result['reset_time']
                }
            })
        
        # Save file to local storage (Replit has persistent storage)
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, f"{file_hash}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(file_data)
        
        # Create background task
        task_id = task_manager.create_task(
            background_tasks,
            process_pdf_file,
            file_path=file_path,
            engine=engine,
            translation_options=translation_options,
            cache_key=cache_key,
            user_id=current_user.id,
            filename=file.filename
        )
        
        return JSONResponse(content={
            'task_id': task_id,
            'status': 'QUEUED',
            'message': 'PDF processing started',
            'estimated_time': '30-120 seconds',
            'rate_limit': {
                'remaining': rate_limit_result['remaining'],
                'reset_time': rate_limit_result['reset_time']
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start PDF processing: {str(e)}"
        )


@router.get("/status/{task_id}")
async def get_processing_status(
    task_id: str,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get real-time processing status for a task
    """
    try:
        # Get task status from our task manager
        task_info = task_manager.get_task_status(task_id)
        
        if task_info['status'] == 'NOT_FOUND':
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found or expired"
            )
        
        elif task_info['status'] == 'PENDING':
            return JSONResponse(content={
                'task_id': task_id,
                'status': 'PENDING',
                'progress': 0,
                'message': 'Task is waiting to be processed',
                'created_at': task_info.get('created_at')
            })
        
        elif task_info['status'] == 'PROCESSING':
            return JSONResponse(content={
                'task_id': task_id,
                'status': 'PROCESSING',
                'progress': 50,  # Estimate
                'message': 'Processing PDF...',
                'started_at': task_info.get('started_at'),
                'function': task_info.get('function')
            })
        
        elif task_info['status'] == 'SUCCESS':
            result = task_info.get('result', {})
            
            return JSONResponse(content={
                'task_id': task_id,
                'status': 'SUCCESS',
                'progress': 100,
                'message': 'Processing completed successfully',
                'result': result,
                'processing_time': result.get('processing_time') if isinstance(result, dict) else None,
                'completed_at': task_info.get('completed_at')
            })
        
        elif task_info['status'] == 'FAILURE':
            error_msg = task_info.get('error', 'Unknown error occurred')
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    'task_id': task_id,
                    'status': 'FAILURE',
                    'progress': 0,
                    'message': 'Processing failed',
                    'error': error_msg,
                    'completed_at': task_info.get('completed_at')
                }
            )
        
        elif task_info['status'] == 'CANCELLED':
            return JSONResponse(content={
                'task_id': task_id,
                'status': 'CANCELLED',
                'progress': 0,
                'message': 'Task was cancelled',
                'completed_at': task_info.get('completed_at')
            })
        
        else:
            return JSONResponse(content={
                'task_id': task_id,
                'status': task_info['status'],
                'progress': 0,
                'message': f'Task in state: {task_info["status"]}',
                'created_at': task_info.get('created_at')
            })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task status: {str(e)}"
        )


@router.delete("/cancel/{task_id}")
async def cancel_processing(
    task_id: str,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Cancel a pending task (can't cancel already running tasks)
    """
    try:
        cancelled = task_manager.cancel_task(task_id)
        
        if cancelled:
            return JSONResponse(content={
                'task_id': task_id,
                'status': 'CANCELLED',
                'message': 'Task cancelled successfully'
            })
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    'task_id': task_id,
                    'message': 'Task cannot be cancelled (not found or already running/completed)'
                }
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel task: {str(e)}"
        )


@router.get("/stats")
async def get_processing_stats(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get processing statistics
    """
    try:
        task_stats = task_manager.get_task_stats()
        cache_stats = cache_manager.get_stats()
        rate_limit_stats = rate_limiter.get_global_stats()
        
        return JSONResponse(content={
            'tasks': task_stats,
            'cache': cache_stats,
            'rate_limiting': rate_limit_stats,
            'timestamp': time.time()
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Any:
    """
    Health check for all Replit services
    """
    try:
        task_health = task_manager.get_task_stats()
        cache_health = cache_manager.health_check()
        rate_limit_health = rate_limiter.health_check()
        
        all_healthy = (
            cache_health.get('status') == 'healthy' and
            rate_limit_health.get('status') == 'healthy' and
            task_health.get('total_tasks', 0) >= 0
        )
        
        return JSONResponse(content={
            'status': 'healthy' if all_healthy else 'unhealthy',
            'services': {
                'task_manager': {
                    'status': 'healthy',
                    'stats': task_health
                },
                'cache_manager': cache_health,
                'rate_limiter': rate_limit_health
            },
            'deployment': 'replit',
            'timestamp': time.time()
        })
        
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': time.time()
            }
        ) 