from celery import current_task
from typing import Dict, Any, Optional
import json
import logging
import time
from datetime import datetime
import hashlib
import tempfile
import os

from app.tasks.celery_app import celery_app
from app.services.redis_client import redis_manager
from app.services import pdf_service
from app.models.user import User
from app.models.processing_log import ProcessingLog
from app.core.database import SessionLocal
from app.schemas.processing import TranslationOptions
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_pdf_async(
    self,
    user_id: int,
    file_key: str,
    filename: str,
    engine: str,
    translation_options: Dict[str, Any],
    file_annotations: Optional[str] = None
) -> Dict[str, Any]:
    """
    Asynchronously process PDF file in background
    
    Args:
        user_id: User ID
        file_key: Redis key for uploaded file data
        filename: Original filename
        engine: Processing engine ('auto', 'openrouter', 'pdftranslate')
        translation_options: Translation configuration
        file_annotations: Optional file annotations
    
    Returns:
        Processing result with status and data
    """
    task_id = self.request.id
    start_time = time.time()
    
    try:
        # Update task status
        self.update_state(
            state='PROCESSING',
            meta={
                'progress': 5,
                'status': 'Initializing',
                'started_at': datetime.utcnow().isoformat()
            }
        )
        
        # Get database session
        db = SessionLocal()
        
        try:
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            # Get file data from Redis
            file_data = redis_manager.get_file_data(file_key)
            if not file_data:
                raise ValueError("File data not found or expired")
            
            self.update_state(
                state='PROCESSING',
                meta={'progress': 10, 'status': 'File loaded, starting processing'}
            )
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_file.write(file_data)
                temp_file_path = temp_file.name
            
            try:
                # Create mock UploadFile object
                class MockUploadFile:
                    def __init__(self, file_path: str, filename: str):
                        self.file_path = file_path
                        self.filename = filename
                        self.content_type = 'application/pdf'
                    
                    async def read(self):
                        with open(self.file_path, 'rb') as f:
                            return f.read()
                    
                    async def seek(self, position):
                        pass
                
                mock_file = MockUploadFile(temp_file_path, filename)
                
                # Convert translation options
                translation_opts = TranslationOptions(**translation_options)
                
                self.update_state(
                    state='PROCESSING',
                    meta={'progress': 20, 'status': 'Starting PDF processing'}
                )
                
                # Process PDF (synchronous in Celery worker)
                # Note: We'll need to modify pdf_service.process_pdf to have a sync version
                # or call the async version properly
                import asyncio
                result = asyncio.run(pdf_service.process_pdf(
                    db=db,
                    current_user=user,
                    file=mock_file,
                    engine=engine,
                    translation_options=translation_opts,
                    file_annotations=file_annotations,
                    task_callback=lambda progress, status: self.update_state(
                        state='PROCESSING',
                        meta={'progress': 20 + (progress * 0.7), 'status': status}
                    )
                ))
                
                self.update_state(
                    state='PROCESSING',
                    meta={'progress': 95, 'status': 'Finalizing results'}
                )
                
                # Cache the result
                result_key = f"pdf_result:{task_id}"
                redis_manager.cache_result(result_key, result, ttl=3600)
                
                # Calculate file hash for future caching
                file_hash = hashlib.md5(file_data).hexdigest()
                cache_key = f"pdf_cache:{file_hash}:{engine}"
                redis_manager.cache_result(cache_key, result, ttl=7200)  # 2 hours
                
                # Clean up uploaded file
                redis_manager.delete_file_data(file_key)
                
                processing_time = time.time() - start_time
                
                final_result = {
                    'status': 'SUCCESS',
                    'task_id': task_id,
                    'result': result,
                    'processing_time': processing_time,
                    'completed_at': datetime.utcnow().isoformat()
                }
                
                self.update_state(
                    state='SUCCESS',
                    meta={'progress': 100, 'status': 'Complete', **final_result}
                )
                
                logger.info(f"PDF processing completed for user {user_id}, file {filename} in {processing_time:.2f}s")
                
                return final_result
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        finally:
            db.close()
            
    except Exception as exc:
        logger.error(f"PDF processing failed for user {user_id}: {str(exc)}")
        
        # Clean up on error
        try:
            redis_manager.delete_file_data(file_key)
        except:
            pass
        
        # Update task state
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(exc),
                'progress': 0,
                'status': 'Failed',
                'failed_at': datetime.utcnow().isoformat()
            }
        )
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying PDF processing task {task_id}, attempt {self.request.retries + 1}")
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        
        raise exc


@celery_app.task
def cleanup_old_results():
    """
    Periodic task to clean up old processing results and temp files
    """
    try:
        # Clean up old Redis results
        redis_manager.cleanup_old_results()
        
        # Clean up old temporary files
        temp_dir = tempfile.gettempdir()
        cutoff_time = time.time() - 86400  # 24 hours ago
        
        for filename in os.listdir(temp_dir):
            if filename.endswith('.pdf'):
                file_path = os.path.join(temp_dir, filename)
                if os.path.getmtime(file_path) < cutoff_time:
                    try:
                        os.unlink(file_path)
                        logger.info(f"Cleaned up old temp file: {filename}")
                    except Exception as e:
                        logger.warning(f"Failed to clean up temp file {filename}: {e}")
        
        logger.info("Cleanup task completed successfully")
        
    except Exception as e:
        logger.error(f"Cleanup task failed: {e}")


@celery_app.task
def send_processing_notification(user_id: int, task_id: str, result: Dict[str, Any]):
    """
    Send notification when PDF processing is complete
    """
    try:
        # Here you can implement:
        # - Email notifications
        # - WebSocket push notifications
        # - Slack/Discord webhooks
        # - Mobile push notifications
        
        logger.info(f"Sending notification to user {user_id} for task {task_id}")
        
        # Example: WebSocket notification
        # websocket_manager.send_to_user(user_id, {
        #     'type': 'processing_complete',
        #     'task_id': task_id,
        #     'status': result.get('status'),
        #     'filename': result.get('filename')
        # })
        
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")


# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    'cleanup-old-results': {
        'task': 'app.tasks.pdf_tasks.cleanup_old_results',
        'schedule': 3600.0,  # Every hour
    },
}
celery_app.conf.timezone = 'Asia/Singapore' 