import asyncio
import uuid
import time
import os
import hashlib
from typing import Dict, Any, Optional, Callable
from fastapi import BackgroundTasks
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class TaskManager:
    """Simple task manager for Replit deployment - replaces Celery + Redis"""
    
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.results: Dict[str, Any] = {}
        self.max_tasks_in_memory = 1000  # Prevent memory overflow
        self._cleanup_interval = 3600  # 1 hour
        self._last_cleanup = time.time()
    
    def _cleanup_old_tasks(self):
        """Remove old completed tasks to prevent memory overflow"""
        current_time = time.time()
        
        # Only cleanup every hour
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        # Remove tasks older than 24 hours
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        old_task_ids = []
        
        for task_id, task_info in self.tasks.items():
            created_at = task_info.get('created_at')
            if created_at and created_at < cutoff_time:
                old_task_ids.append(task_id)
        
        for task_id in old_task_ids:
            self.tasks.pop(task_id, None)
            self.results.pop(task_id, None)
        
        # If still too many tasks, remove oldest completed ones
        if len(self.tasks) > self.max_tasks_in_memory:
            completed_tasks = [
                (task_id, task_info) for task_id, task_info in self.tasks.items()
                if task_info.get('status') in ['SUCCESS', 'FAILURE']
            ]
            completed_tasks.sort(key=lambda x: x[1].get('completed_at', datetime.min))
            
            # Remove oldest half of completed tasks
            to_remove = len(completed_tasks) // 2
            for task_id, _ in completed_tasks[:to_remove]:
                self.tasks.pop(task_id, None)
                self.results.pop(task_id, None)
        
        self._last_cleanup = current_time
        logger.info(f"Cleaned up {len(old_task_ids)} old tasks")
    
    def create_task(self, background_tasks: BackgroundTasks, 
                   func: Callable, *args, **kwargs) -> str:
        """Create and queue a background task"""
        task_id = str(uuid.uuid4())
        
        # Store task info
        self.tasks[task_id] = {
            'status': 'PENDING',
            'created_at': datetime.utcnow(),
            'function': func.__name__,
            'args': str(args)[:100],  # Truncated for memory
            'kwargs': str(kwargs)[:100]  # Truncated for memory
        }
        
        # Queue the task
        background_tasks.add_task(self._execute_task, task_id, func, *args, **kwargs)
        
        # Cleanup old tasks periodically
        self._cleanup_old_tasks()
        
        logger.info(f"Created task {task_id} for function {func.__name__}")
        return task_id
    
    async def _execute_task(self, task_id: str, func: Callable, *args, **kwargs):
        """Execute the background task"""
        try:
            # Update status
            self.tasks[task_id]['status'] = 'PROCESSING'
            self.tasks[task_id]['started_at'] = datetime.utcnow()
            
            logger.info(f"Starting task {task_id}: {func.__name__}")
            
            # Execute function
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Store result
            self.tasks[task_id]['status'] = 'SUCCESS'
            self.tasks[task_id]['completed_at'] = datetime.utcnow()
            self.results[task_id] = result
            
            logger.info(f"Task {task_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}", exc_info=True)
            self.tasks[task_id]['status'] = 'FAILURE'
            self.tasks[task_id]['error'] = str(e)
            self.tasks[task_id]['completed_at'] = datetime.utcnow()
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get task status and result"""
        task_info = self.tasks.get(task_id, {})
        result = self.results.get(task_id)
        
        if not task_info:
            return {
                'task_id': task_id,
                'status': 'NOT_FOUND',
                'error': 'Task not found or expired'
            }
        
        response = {
            'task_id': task_id,
            'status': task_info.get('status', 'UNKNOWN'),
            'function': task_info.get('function'),
            'created_at': task_info.get('created_at'),
            'started_at': task_info.get('started_at'),
            'completed_at': task_info.get('completed_at'),
        }
        
        if task_info.get('status') == 'SUCCESS' and result is not None:
            response['result'] = result
        elif task_info.get('status') == 'FAILURE':
            response['error'] = task_info.get('error')
        
        return response
    
    def get_task_stats(self) -> Dict[str, Any]:
        """Get overall task statistics"""
        total_tasks = len(self.tasks)
        pending_tasks = sum(1 for t in self.tasks.values() if t.get('status') == 'PENDING')
        processing_tasks = sum(1 for t in self.tasks.values() if t.get('status') == 'PROCESSING')
        completed_tasks = sum(1 for t in self.tasks.values() if t.get('status') == 'SUCCESS')
        failed_tasks = sum(1 for t in self.tasks.values() if t.get('status') == 'FAILURE')
        
        return {
            'total_tasks': total_tasks,
            'pending': pending_tasks,
            'processing': processing_tasks,
            'completed': completed_tasks,
            'failed': failed_tasks,
            'success_rate': completed_tasks / max(1, completed_tasks + failed_tasks)
        }
    
    def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending task (can't cancel already running tasks)"""
        task_info = self.tasks.get(task_id, {})
        if task_info.get('status') == 'PENDING':
            self.tasks[task_id]['status'] = 'CANCELLED'
            self.tasks[task_id]['completed_at'] = datetime.utcnow()
            logger.info(f"Cancelled task {task_id}")
            return True
        return False

# Global task manager instance
task_manager = TaskManager() 