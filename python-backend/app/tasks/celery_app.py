from celery import Celery
from app.core.config import settings
import os

# Create Celery instance
celery_app = Celery('pdf_processor')

# Configure Celery
celery_app.conf.update(
    broker_url=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_annotations={
        '*': {'rate_limit': '10/m'},  # Global rate limit
        'app.tasks.pdf_tasks.process_pdf_async': {'rate_limit': '5/m'},
    },
    task_routes={
        'app.tasks.pdf_tasks.process_pdf_async': {'queue': 'pdf_processing'},
        'app.tasks.cleanup_tasks.*': {'queue': 'cleanup'},
    },
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    task_soft_time_limit=600,  # 10 minutes
    task_time_limit=1200,      # 20 minutes
    result_expires=3600,       # Results expire after 1 hour
)

# Auto-discover tasks
celery_app.autodiscover_tasks(['app.tasks']) 