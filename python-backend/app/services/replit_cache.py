import os
import json
import pickle
import time
import hashlib
from typing import Any, Optional, Dict
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Try to import Replit DB
try:
    from replit import db
    REPLIT_DB_AVAILABLE = True
    logger.info("Replit DB available for persistent caching")
except ImportError:
    REPLIT_DB_AVAILABLE = False
    db = None
    logger.warning("Replit DB not available, using memory-only caching")

class ReplitCacheManager:
    """Cache manager using Replit DB + in-memory for speed - replaces Redis"""
    
    def __init__(self):
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        self.max_memory_items = 1000  # Prevent memory overflow
        self._cleanup_interval = 300  # 5 minutes
        self._last_cleanup = time.time()
    
    def _is_expired(self, item: Dict[str, Any]) -> bool:
        """Check if cached item is expired"""
        if 'expires_at' not in item:
            return False
        try:
            expires_at = datetime.fromisoformat(item['expires_at'])
            return datetime.utcnow() > expires_at
        except (ValueError, TypeError):
            return True  # Invalid expiry format, consider expired
    
    def _cleanup_memory(self):
        """Remove expired items from memory cache"""
        current_time = time.time()
        
        # Only cleanup every 5 minutes
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        # Remove expired items
        expired_keys = [
            key for key, item in self.memory_cache.items()
            if self._is_expired(item)
        ]
        for key in expired_keys:
            del self.memory_cache[key]
        
        # Limit memory cache size (LRU-style)
        if len(self.memory_cache) > self.max_memory_items:
            # Sort by creation time and keep most recent
            sorted_items = sorted(
                self.memory_cache.items(),
                key=lambda x: x[1].get('created_at', ''),
                reverse=True
            )
            self.memory_cache = dict(sorted_items[:self.max_memory_items])
        
        self._last_cleanup = current_time
        logger.debug(f"Cache cleanup: removed {len(expired_keys)} expired items")
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Cache a value with TTL"""
        try:
            expires_at = datetime.utcnow() + timedelta(seconds=ttl)
            cache_item = {
                'value': value,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': expires_at.isoformat(),
                'ttl': ttl
            }
            
            # Store in memory for fast access
            self.memory_cache[key] = cache_item
            
            # Store in Replit DB for persistence
            if REPLIT_DB_AVAILABLE and db is not None:
                try:
                    # Serialize complex objects to JSON when possible
                    if isinstance(value, (dict, list, str, int, float, bool)) or value is None:
                        serialized_item = json.dumps(cache_item, default=str)
                    else:
                        # Use pickle for complex objects
                        cache_item['value'] = pickle.dumps(value).decode('latin1')
                        cache_item['_pickled'] = True
                        serialized_item = json.dumps(cache_item, default=str)
                    
                    db[f"cache:{key}"] = serialized_item
                except Exception as e:
                    logger.warning(f"Failed to store in Replit DB: {e}")
            
            self._cleanup_memory()
            logger.debug(f"Cached key '{key}' with TTL {ttl}s")
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for key '{key}': {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        try:
            # Try memory cache first (fastest)
            if key in self.memory_cache:
                item = self.memory_cache[key]
                if not self._is_expired(item):
                    logger.debug(f"Cache hit (memory): {key}")
                    return item['value']
                else:
                    del self.memory_cache[key]
            
            # Try Replit DB (persistent)
            if REPLIT_DB_AVAILABLE and db is not None:
                db_key = f"cache:{key}"
                if db_key in db:
                    try:
                        item = json.loads(db[db_key])
                        if not self._is_expired(item):
                            # Handle pickled objects
                            if item.get('_pickled'):
                                item['value'] = pickle.loads(item['value'].encode('latin1'))
                                del item['_pickled']
                            
                            # Restore to memory cache
                            self.memory_cache[key] = item
                            logger.debug(f"Cache hit (Replit DB): {key}")
                            return item['value']
                        else:
                            # Expired, remove from DB
                            del db[db_key]
                    except Exception as e:
                        logger.warning(f"Failed to deserialize cache item {key}: {e}")
                        # Remove corrupted item
                        try:
                            del db[db_key]
                        except:
                            pass
            
            logger.debug(f"Cache miss: {key}")
            return None
            
        except Exception as e:
            logger.error(f"Cache get error for key '{key}': {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete cached value"""
        try:
            deleted = False
            
            # Remove from memory
            if key in self.memory_cache:
                del self.memory_cache[key]
                deleted = True
            
            # Remove from Replit DB
            if REPLIT_DB_AVAILABLE and db is not None:
                db_key = f"cache:{key}"
                if db_key in db:
                    del db[db_key]
                    deleted = True
            
            logger.debug(f"Deleted cache key: {key}")
            return deleted
            
        except Exception as e:
            logger.error(f"Cache delete error for key '{key}': {e}")
            return False
    
    def clear(self) -> bool:
        """Clear all cached values"""
        try:
            # Clear memory cache
            self.memory_cache.clear()
            
            # Clear Replit DB cache entries
            if REPLIT_DB_AVAILABLE and db is not None:
                cache_keys = [key for key in db.keys() if key.startswith("cache:")]
                for key in cache_keys:
                    del db[key]
            
            logger.info("Cleared all cache entries")
            return True
            
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False
    
    def generate_cache_key(self, file_hash: str, engine: str, options: Dict[str, Any]) -> str:
        """Generate cache key for PDF processing results"""
        options_str = json.dumps(options, sort_keys=True)
        combined = f"{file_hash}:{engine}:{options_str}"
        return f"pdf_result:{hashlib.md5(combined.encode()).hexdigest()}"
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        memory_count = len(self.memory_cache)
        memory_expired = sum(1 for item in self.memory_cache.values() if self._is_expired(item))
        
        db_count = 0
        if REPLIT_DB_AVAILABLE and db is not None:
            try:
                db_count = len([key for key in db.keys() if key.startswith("cache:")])
            except:
                db_count = -1  # Error reading DB
        
        return {
            'memory_cache_size': memory_count,
            'memory_expired_items': memory_expired,
            'db_cache_size': db_count,
            'replit_db_available': REPLIT_DB_AVAILABLE,
            'max_memory_items': self.max_memory_items
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Check cache health"""
        try:
            # Test memory cache
            test_key = "_health_check_" + str(time.time())
            self.set(test_key, "test", ttl=10)
            retrieved = self.get(test_key)
            self.delete(test_key)
            
            memory_ok = retrieved == "test"
            
            # Test Replit DB
            db_ok = True
            if REPLIT_DB_AVAILABLE and db is not None:
                try:
                    db["_health_check"] = "test"
                    db_ok = db.get("_health_check") == "test"
                    del db["_health_check"]
                except:
                    db_ok = False
            
            return {
                'status': 'healthy' if memory_ok else 'unhealthy',
                'memory_cache': 'ok' if memory_ok else 'error',
                'replit_db': 'ok' if db_ok else 'error',
                'replit_db_available': REPLIT_DB_AVAILABLE
            }
            
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e)
            }

# Global cache manager instance
cache_manager = ReplitCacheManager() 