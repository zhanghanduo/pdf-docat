import redis
import json
import time
import hashlib
import logging
from typing import Any, Dict, Optional, List
from datetime import datetime, timedelta
import pickle
import os

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisManager:
    """Redis manager for caching, sessions, and temporary file storage"""
    
    def __init__(self):
        self.client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            decode_responses=False,  # For binary data
            max_connections=20,
            socket_timeout=30,
            socket_connect_timeout=30,
            health_check_interval=30
        )
        
        # Text client for JSON data
        self.text_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            decode_responses=True,
            max_connections=20
        )
        
        try:
            self.client.ping()
            logger.info("Redis connection established successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    # File Storage Methods
    def store_file_data(self, file_key: str, file_data: bytes, ttl: int = 3600) -> bool:
        """Store file data temporarily in Redis"""
        try:
            self.client.setex(file_key, ttl, file_data)
            logger.info(f"Stored file data with key {file_key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Failed to store file data: {e}")
            return False
    
    def get_file_data(self, file_key: str) -> Optional[bytes]:
        """Retrieve file data from Redis"""
        try:
            data = self.client.get(file_key)
            if data:
                logger.info(f"Retrieved file data for key {file_key}")
            return data
        except Exception as e:
            logger.error(f"Failed to get file data: {e}")
            return None
    
    def delete_file_data(self, file_key: str) -> bool:
        """Delete file data from Redis"""
        try:
            result = self.client.delete(file_key)
            if result:
                logger.info(f"Deleted file data for key {file_key}")
            return bool(result)
        except Exception as e:
            logger.error(f"Failed to delete file data: {e}")
            return False
    
    # Caching Methods
    def cache_result(self, cache_key: str, result: Any, ttl: int = 3600) -> bool:
        """Cache processing results"""
        try:
            if isinstance(result, (dict, list)):
                data = json.dumps(result)
                self.text_client.setex(cache_key, ttl, data)
            else:
                data = pickle.dumps(result)
                self.client.setex(cache_key, ttl, data)
            
            logger.info(f"Cached result with key {cache_key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Failed to cache result: {e}")
            return False
    
    def get_cached_result(self, cache_key: str) -> Optional[Any]:
        """Get cached processing result"""
        try:
            # Try JSON first
            data = self.text_client.get(cache_key)
            if data:
                try:
                    return json.loads(data)
                except json.JSONDecodeError:
                    pass
            
            # Try pickle
            data = self.client.get(cache_key)
            if data:
                try:
                    return pickle.loads(data)
                except Exception:
                    pass
            
            return None
        except Exception as e:
            logger.error(f"Failed to get cached result: {e}")
            return None
    
    def generate_cache_key(self, file_hash: str, engine: str, options: Dict[str, Any]) -> str:
        """Generate cache key for PDF processing results"""
        options_str = json.dumps(options, sort_keys=True)
        combined = f"{file_hash}:{engine}:{options_str}"
        return f"pdf_cache:{hashlib.md5(combined.encode()).hexdigest()}"
    
    # Rate Limiting Methods
    def check_rate_limit(self, user_id: int, limit: int, window: int) -> Dict[str, Any]:
        """
        Check rate limit for user
        
        Returns:
            Dict with 'allowed' (bool), 'remaining' (int), 'reset_time' (int)
        """
        try:
            current_window = int(time.time()) // window
            key = f"rate_limit:{user_id}:{current_window}"
            
            current_count = self.text_client.incr(key)
            
            if current_count == 1:
                self.text_client.expire(key, window)
            
            remaining = max(0, limit - current_count)
            reset_time = (current_window + 1) * window
            
            return {
                'allowed': current_count <= limit,
                'remaining': remaining,
                'reset_time': reset_time,
                'current_count': current_count
            }
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return {'allowed': True, 'remaining': limit, 'reset_time': 0, 'current_count': 0}
    
    # Session Management
    def store_session(self, session_id: str, data: Dict[str, Any], ttl: int = 86400) -> bool:
        """Store user session data"""
        try:
            session_data = json.dumps(data)
            self.text_client.setex(f"session:{session_id}", ttl, session_data)
            return True
        except Exception as e:
            logger.error(f"Failed to store session: {e}")
            return False
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get user session data"""
        try:
            data = self.text_client.get(f"session:{session_id}")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to get session: {e}")
            return None
    
    def delete_session(self, session_id: str) -> bool:
        """Delete user session"""
        try:
            result = self.text_client.delete(f"session:{session_id}")
            return bool(result)
        except Exception as e:
            logger.error(f"Failed to delete session: {e}")
            return False
    
    def extend_session(self, session_id: str, ttl: int = 86400) -> bool:
        """Extend session TTL"""
        try:
            result = self.text_client.expire(f"session:{session_id}", ttl)
            return bool(result)
        except Exception as e:
            logger.error(f"Failed to extend session: {e}")
            return False
    
    # Task Status Management
    def set_task_status(self, task_id: str, status: Dict[str, Any], ttl: int = 3600) -> bool:
        """Store task processing status"""
        try:
            status_data = json.dumps(status)
            self.text_client.setex(f"task_status:{task_id}", ttl, status_data)
            return True
        except Exception as e:
            logger.error(f"Failed to set task status: {e}")
            return False
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task processing status"""
        try:
            data = self.text_client.get(f"task_status:{task_id}")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to get task status: {e}")
            return None
    
    # Pub/Sub for Real-time Updates
    def publish_update(self, channel: str, message: Dict[str, Any]) -> bool:
        """Publish real-time update"""
        try:
            message_data = json.dumps(message)
            self.text_client.publish(channel, message_data)
            return True
        except Exception as e:
            logger.error(f"Failed to publish update: {e}")
            return False
    
    def subscribe_to_updates(self, channels: List[str]):
        """Subscribe to real-time updates"""
        try:
            pubsub = self.text_client.pubsub()
            pubsub.subscribe(*channels)
            return pubsub
        except Exception as e:
            logger.error(f"Failed to subscribe to updates: {e}")
            return None
    
    # Cleanup Methods
    def cleanup_old_results(self, max_age_hours: int = 24) -> int:
        """Clean up old cached results and temporary data"""
        try:
            patterns = [
                "pdf_cache:*",
                "pdf_result:*",
                "task_status:*",
                "upload:*"
            ]
            
            cleaned_count = 0
            cutoff_time = time.time() - (max_age_hours * 3600)
            
            for pattern in patterns:
                keys = self.text_client.keys(pattern)
                for key in keys:
                    # Check if key is old (simple TTL check)
                    ttl = self.text_client.ttl(key)
                    if ttl == -1 or ttl < 3600:  # No TTL or expires soon
                        self.text_client.delete(key)
                        cleaned_count += 1
            
            logger.info(f"Cleaned up {cleaned_count} old Redis keys")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return 0
    
    # Health Check
    def health_check(self) -> Dict[str, Any]:
        """Check Redis health and get basic stats"""
        try:
            start_time = time.time()
            self.client.ping()
            ping_time = time.time() - start_time
            
            info = self.client.info()
            
            return {
                'status': 'healthy',
                'ping_time_ms': round(ping_time * 1000, 2),
                'connected_clients': info.get('connected_clients', 0),
                'used_memory_human': info.get('used_memory_human', '0B'),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'uptime_in_seconds': info.get('uptime_in_seconds', 0)
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }


# Global Redis manager instance
redis_manager = RedisManager() 