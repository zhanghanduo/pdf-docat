from typing import Any, Optional
from uuid import uuid4
import hashlib

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.services.redis_client import redis_manager
from app.tasks.pdf_tasks import process_pdf_async
from app.tasks.celery_app import celery_app
from app.models.user import User
from app.schemas.processing import TranslationOptions

router = APIRouter()


@router.post("/process-async")
async def process_pdf_async_endpoint(
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
    Start asynchronous PDF processing
    Returns task ID for status tracking
    """
    from app.core.config import settings
    
    # Validate engine
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
    
    # Check rate limits
    rate_limit = redis_manager.check_rate_limit(
        user_id=current_user.id,
        limit=10,  # 10 requests per hour
        window=3600
    )
    
    if not rate_limit['allowed']:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. {rate_limit['remaining']} requests remaining. Reset at {rate_limit['reset_time']}",
            headers={"Retry-After": str(rate_limit['reset_time'])}
        )
    
    try:
        # Read file data
        file_data = await file.read()
        
        # Check file size (25MB limit)
        if len(file_data) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size too large. Maximum 25MB allowed."
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
        cache_key = redis_manager.generate_cache_key(file_hash, engine, translation_options)
        cached_result = redis_manager.get_cached_result(cache_key)
        
        if cached_result:
            return JSONResponse(content={
                'status': 'CACHED',
                'result': cached_result,
                'message': 'Result retrieved from cache'
            })
        
        # Store file data temporarily
        file_key = f"upload:{uuid4()}"
        if not redis_manager.store_file_data(file_key, file_data, ttl=3600):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store file for processing"
            )
        
        # Queue processing task
        task = process_pdf_async.delay(
            user_id=current_user.id,
            file_key=file_key,
            filename=file.filename,
            engine=engine,
            translation_options=translation_options,
            file_annotations=file_annotations
        )
        
        return JSONResponse(content={
            'task_id': task.id,
            'status': 'QUEUED',
            'message': 'PDF processing started',
            'estimated_time': '30-120 seconds',
            'rate_limit': {
                'remaining': rate_limit['remaining'],
                'reset_time': rate_limit['reset_time']
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
        # Get task result from Celery
        task = celery_app.AsyncResult(task_id)
        
        if task.state == 'PENDING':
            return JSONResponse(content={
                'task_id': task_id,
                'status': 'PENDING',
                'progress': 0,
                'message': 'Task is waiting to be processed'
            })
        
        elif task.state == 'PROCESSING':
            progress = task.info.get('progress', 0) if task.info else 0
            status_msg = task.info.get('status', 'Processing') if task.info else 'Processing'
            
            return JSONResponse(content={
                'task_id': task_id,
                'status': 'PROCESSING',
                'progress': progress,
                'message': status_msg,
                'started_at': task.info.get('started_at') if task.info else None
            })
        
        elif task.state == 'SUCCESS':
            result = task.info or task.result
            
            return JSONResponse(content={
                'task_id': task_id,
                'status': 'SUCCESS',
                'progress': 100,
                'message': 'Processing completed successfully',
                'result': result.get('result') if isinstance(result, dict) else result,
                'processing_time': result.get('processing_time') if isinstance(result, dict) else None,
                'completed_at': result.get('completed_at') if isinstance(result, dict) else None
            })
        
        elif task.state == 'FAILURE':
            error_msg = str(task.info) if task.info else 'Unknown error occurred'
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    'task_id': task_id,
                    'status': 'FAILURE',
                    'progress': 0,
                    'message': 'Processing failed',
                    'error': error_msg,
                    'failed_at': task.info.get('failed_at') if isinstance(task.info, dict) else None
                }
            )
        
        else:
            return JSONResponse(content={
                'task_id': task_id,
                'status': task.state,
                'progress': 0,
                'message': f'Task in state: {task.state}'
            })
    
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
    Cancel a running processing task
    """
    try:
        # Revoke the task
        celery_app.control.revoke(task_id, terminate=True)
        
        # Get task to check current state
        task = celery_app.AsyncResult(task_id)
        
        return JSONResponse(content={
            'task_id': task_id,
            'status': 'CANCELLED',
            'message': 'Task cancellation requested',
            'previous_state': task.state
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel task: {str(e)}"
        )


@router.get("/queue-status")
async def get_queue_status(
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Get current queue status (Admin only)
    """
    try:
        # Get Celery stats
        inspect = celery_app.control.inspect()
        
        active_tasks = inspect.active()
        scheduled_tasks = inspect.scheduled()
        stats = inspect.stats()
        
        return JSONResponse(content={
            'active_tasks': active_tasks,
            'scheduled_tasks': scheduled_tasks,
            'worker_stats': stats,
            'redis_health': redis_manager.health_check()
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get queue status: {str(e)}"
        )


@router.post("/retry/{task_id}")
async def retry_failed_task(
    task_id: str,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retry a failed processing task
    """
    try:
        # Get original task
        task = celery_app.AsyncResult(task_id)
        
        if task.state != 'FAILURE':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only retry failed tasks"
            )
        
        # For now, return instruction to resubmit
        # In a full implementation, you'd store original parameters
        return JSONResponse(content={
            'message': 'Please resubmit the file for processing',
            'original_task_id': task_id,
            'status': 'RETRY_REQUIRED'
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retry task: {str(e)}"
        ) 