import time
from typing import Dict, Any, Deque
from collections import defaultdict, deque
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class SimpleRateLimiter:
    """In-memory rate limiter for Replit - replaces Redis rate limiting"""
    
    def __init__(self):
        self.requests: Dict[str, Deque[float]] = defaultdict(deque)
        self._cleanup_interval = 300  # 5 minutes
        self._last_cleanup = time.time()
        self.max_users_tracked = 10000  # Prevent memory overflow
    
    def _cleanup_old_data(self):
        """Clean up old request data to prevent memory overflow"""
        current_time = time.time()
        
        # Only cleanup every 5 minutes
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        # Remove users with no recent activity (older than 1 hour)
        cutoff_time = current_time - 3600  # 1 hour
        inactive_users = []
        
        for user_id, user_requests in self.requests.items():
            # Remove old requests
            while user_requests and user_requests[0] < cutoff_time:
                user_requests.popleft()
            
            # Mark users with no recent requests for removal
            if not user_requests:
                inactive_users.append(user_id)
        
        # Remove inactive users
        for user_id in inactive_users:
            del self.requests[user_id]
        
        # If still too many users, remove oldest inactive ones
        if len(self.requests) > self.max_users_tracked:
            # Sort by most recent request time and keep most active users
            sorted_users = sorted(
                self.requests.items(),
                key=lambda x: x[1][-1] if x[1] else 0,
                reverse=True
            )
            
            # Keep only the most active users
            keep_count = int(self.max_users_tracked * 0.8)  # Keep 80%
            users_to_remove = [user_id for user_id, _ in sorted_users[keep_count:]]
            
            for user_id in users_to_remove:
                del self.requests[user_id]
        
        self._last_cleanup = current_time
        logger.debug(f"Rate limiter cleanup: removed {len(inactive_users)} inactive users")
    
    def check_rate_limit(self, user_id: str, limit: int, window: int) -> Dict[str, Any]:
        """
        Check rate limit for user
        
        Args:
            user_id: User identifier (can be user ID, IP address, etc.)
            limit: Maximum number of requests allowed
            window: Time window in seconds
            
        Returns:
            Dict with 'allowed' (bool), 'remaining' (int), 'reset_time' (int), 'current_count' (int)
        """
        try:
            current_time = time.time()
            window_start = current_time - window
            
            # Get user's request history
            user_requests = self.requests[user_id]
            
            # Remove requests outside the current window
            while user_requests and user_requests[0] < window_start:
                user_requests.popleft()
            
            # Check if limit is exceeded
            current_count = len(user_requests)
            allowed = current_count < limit
            
            # Add current request if allowed
            if allowed:
                user_requests.append(current_time)
                current_count += 1
            
            # Calculate remaining requests and reset time
            remaining = max(0, limit - current_count)
            reset_time = int(window_start + window)
            
            # Periodic cleanup
            self._cleanup_old_data()
            
            result = {
                'allowed': allowed,
                'remaining': remaining,
                'reset_time': reset_time,
                'current_count': current_count,
                'limit': limit,
                'window': window
            }
            
            if not allowed:
                logger.warning(f"Rate limit exceeded for user {user_id}: {current_count}/{limit} in {window}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Rate limit check failed for user {user_id}: {e}")
            # On error, allow the request (fail open)
            return {
                'allowed': True,
                'remaining': limit,
                'reset_time': int(time.time() + window),
                'current_count': 0,
                'error': str(e)
            }
    
    def get_user_stats(self, user_id: str, window: int = 3600) -> Dict[str, Any]:
        """Get request statistics for a specific user"""
        try:
            current_time = time.time()
            window_start = current_time - window
            
            user_requests = self.requests.get(user_id, deque())
            
            # Count requests in the window
            recent_requests = [req for req in user_requests if req >= window_start]
            
            if not recent_requests:
                return {
                    'user_id': user_id,
                    'requests_in_window': 0,
                    'window_seconds': window,
                    'first_request': None,
                    'last_request': None
                }
            
            return {
                'user_id': user_id,
                'requests_in_window': len(recent_requests),
                'window_seconds': window,
                'first_request': datetime.fromtimestamp(recent_requests[0]).isoformat(),
                'last_request': datetime.fromtimestamp(recent_requests[-1]).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get user stats for {user_id}: {e}")
            return {'error': str(e)}
    
    def get_global_stats(self) -> Dict[str, Any]:
        """Get global rate limiter statistics"""
        try:
            total_users = len(self.requests)
            total_tracked_requests = sum(len(requests) for requests in self.requests.values())
            
            # Count active users (with requests in last hour)
            current_time = time.time()
            hour_ago = current_time - 3600
            active_users = sum(
                1 for requests in self.requests.values()
                if requests and requests[-1] >= hour_ago
            )
            
            return {
                'total_users_tracked': total_users,
                'active_users_last_hour': active_users,
                'total_requests_tracked': total_tracked_requests,
                'max_users_tracked': self.max_users_tracked,
                'cleanup_interval_seconds': self._cleanup_interval
            }
            
        except Exception as e:
            logger.error(f"Failed to get global stats: {e}")
            return {'error': str(e)}
    
    def reset_user(self, user_id: str) -> bool:
        """Reset rate limit for a specific user"""
        try:
            if user_id in self.requests:
                del self.requests[user_id]
                logger.info(f"Reset rate limit for user {user_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to reset user {user_id}: {e}")
            return False
    
    def clear_all(self) -> bool:
        """Clear all rate limit data"""
        try:
            self.requests.clear()
            logger.info("Cleared all rate limit data")
            return True
        except Exception as e:
            logger.error(f"Failed to clear rate limit data: {e}")
            return False
    
    def health_check(self) -> Dict[str, Any]:
        """Check rate limiter health"""
        try:
            # Test basic functionality
            test_user = f"_health_check_{time.time()}"
            result = self.check_rate_limit(test_user, 10, 60)
            
            # Clean up test data
            self.reset_user(test_user)
            
            is_healthy = result.get('allowed', False) and 'error' not in result
            
            return {
                'status': 'healthy' if is_healthy else 'unhealthy',
                'test_result': result,
                'total_users_tracked': len(self.requests)
            }
            
        except Exception as e:
            logger.error(f"Rate limiter health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e)
            }

# Global rate limiter instance
rate_limiter = SimpleRateLimiter() 