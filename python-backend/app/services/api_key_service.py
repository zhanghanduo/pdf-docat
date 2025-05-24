"""
API Key Pool Service for managing multiple API keys with rotation and load balancing
"""
import os
import random
import time
from typing import Dict, List, Optional, Tuple
import threading
from datetime import datetime, timedelta
import logging

from app.core.logging import logger
from app.services import settings_service
from sqlalchemy.orm import Session


class ApiKeyPool:
    """
    A class to manage a pool of API keys with rotation and rate limiting
    """
    def __init__(self, service_name: str, keys: List[str], rate_limit_per_minute: int = 60):
        self.service_name = service_name
        self.keys = keys
        self.rate_limit_per_minute = rate_limit_per_minute
        self.usage_counts: Dict[str, List[float]] = {key: [] for key in keys}
        self.last_used_index = -1
        self.lock = threading.Lock()
    
    def get_key(self) -> str:
        """
        Get the next available API key using a round-robin approach with rate limiting
        """
        with self.lock:
            # Clean up old usage timestamps (older than 1 minute)
            current_time = time.time()
            one_minute_ago = current_time - 60
            
            for key in self.keys:
                self.usage_counts[key] = [
                    timestamp for timestamp in self.usage_counts[key] 
                    if timestamp > one_minute_ago
                ]
            
            # Try to find a key that hasn't hit the rate limit
            for _ in range(len(self.keys)):
                self.last_used_index = (self.last_used_index + 1) % len(self.keys)
                key = self.keys[self.last_used_index]
                
                if len(self.usage_counts[key]) < self.rate_limit_per_minute:
                    # Record usage
                    self.usage_counts[key].append(current_time)
                    return key
            
            # All keys are at their rate limit, use the one with the oldest request
            # that will expire soonest
            oldest_timestamps = {
                key: min(timestamps) if timestamps else float('inf') 
                for key, timestamps in self.usage_counts.items()
            }
            
            key_with_oldest = min(oldest_timestamps, key=oldest_timestamps.get)
            self.usage_counts[key_with_oldest].append(current_time)
            
            # Log that we're exceeding rate limits
            logger.warning(
                f"All {self.service_name} API keys are at their rate limit. Using key with oldest request."
            )
            
            return key_with_oldest
    
    def add_key(self, key: str) -> None:
        """
        Add a new API key to the pool
        """
        with self.lock:
            if key not in self.keys:
                self.keys.append(key)
                self.usage_counts[key] = []
    
    def remove_key(self, key: str) -> None:
        """
        Remove an API key from the pool
        """
        with self.lock:
            if key in self.keys:
                self.keys.remove(key)
                del self.usage_counts[key]
    
    def get_usage_stats(self) -> Dict[str, Dict[str, int]]:
        """
        Get usage statistics for all keys
        """
        with self.lock:
            current_time = time.time()
            one_minute_ago = current_time - 60
            
            stats = {}
            for key in self.keys:
                # Mask the key for security
                masked_key = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "***"
                
                # Count requests in the last minute
                recent_requests = len([
                    timestamp for timestamp in self.usage_counts[key] 
                    if timestamp > one_minute_ago
                ])
                
                stats[masked_key] = {
                    "requests_last_minute": recent_requests,
                    "rate_limit_percent": (recent_requests / self.rate_limit_per_minute) * 100
                }
            
            return stats


# Global API key pools
_api_key_pools: Dict[str, ApiKeyPool] = {}


def get_api_keys_from_db_or_env(db: Session, key_name: str) -> List[str]:
    """
    Get API keys from database first, then fallback to environment
    """
    # Try database first
    setting = settings_service.get_setting(db, key_name)
    if setting and setting.value:
        if "," in setting.value:
            # Multiple keys separated by comma
            return [key.strip() for key in setting.value.split(",") if key.strip()]
        else:
            # Single key
            return [setting.value.strip()]
    
    # Fallback to environment variables
    env_value = os.environ.get(key_name, "")
    if env_value:
        if "," in env_value:
            return [key.strip() for key in env_value.split(",") if key.strip()]
        else:
            return [env_value.strip()]
    
    return []


def initialize_api_key_pools() -> None:
    """
    Initialize API key pools from database first, then environment variables
    """
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        
        try:
            # Initialize Gemini API key pool
            gemini_keys = get_api_keys_from_db_or_env(db, "GEMINI_API_KEY_POOL")
            if not gemini_keys:
                # Try legacy single key
                gemini_keys = get_api_keys_from_db_or_env(db, "GEMINI_API_KEY")
            
            if gemini_keys:
                _api_key_pools["gemini"] = ApiKeyPool(
                    service_name="gemini",
                    keys=gemini_keys,
                    rate_limit_per_minute=60  # Gemini has a default limit of 60 requests per minute per key
                )
                logger.info(f"Initialized Gemini API key pool with {len(gemini_keys)} keys")
            
            # Initialize OpenRouter API key pool
            openrouter_keys = get_api_keys_from_db_or_env(db, "OPENROUTER_API_KEY")
            if openrouter_keys:
                _api_key_pools["openrouter"] = ApiKeyPool(
                    service_name="openrouter",
                    keys=openrouter_keys,
                    rate_limit_per_minute=20  # OpenRouter typically has lower rate limits
                )
                logger.info("Initialized OpenRouter API key pool")
                
        finally:
            db.close()
            
    except Exception as e:
        logger.warning(f"Could not initialize API keys from database, falling back to environment: {e}")
        
        # Fallback to environment variables only
        gemini_keys_str = os.environ.get("GEMINI_API_KEY_POOL", os.environ.get("GEMINI_API_KEYS", ""))
        if gemini_keys_str:
            gemini_keys = [key.strip() for key in gemini_keys_str.split(",") if key.strip()]
            if gemini_keys:
                _api_key_pools["gemini"] = ApiKeyPool(
                    service_name="gemini",
                    keys=gemini_keys,
                    rate_limit_per_minute=60
                )
                logger.info(f"Initialized Gemini API key pool from environment with {len(gemini_keys)} keys")
        
        openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")
        if openrouter_key:
            _api_key_pools["openrouter"] = ApiKeyPool(
                service_name="openrouter",
                keys=[openrouter_key],
                rate_limit_per_minute=20
            )
            logger.info("Initialized OpenRouter API key pool from environment")


def get_api_key(service_name: str) -> str:
    """
    Get an API key for the specified service
    """
    if service_name in _api_key_pools:
        return _api_key_pools[service_name].get_key()
    
    # Fallback to environment variables if no pool exists
    if service_name == "gemini":
        return os.environ.get("GEMINI_API_KEY", "")
    elif service_name == "openrouter":
        return os.environ.get("OPENROUTER_API_KEY", "")
    
    return ""


def get_api_key_from_db(db: Session, service_name: str) -> str:
    """
    Get an API key from the database settings
    """
    setting_key = f"{service_name.upper()}_API_KEY"
    if service_name == "gemini":
        # Try pool first, then single key
        setting = settings_service.get_setting(db, "GEMINI_API_KEY_POOL")
        if not setting or not setting.value:
            setting = settings_service.get_setting(db, "GEMINI_API_KEY")
    else:
        setting = settings_service.get_setting(db, setting_key)
    
    if setting and setting.value:
        # If it's a pool, return the first key
        if "," in setting.value:
            keys = [key.strip() for key in setting.value.split(",") if key.strip()]
            return keys[0] if keys else ""
        return setting.value
    
    # Fallback to the pool
    return get_api_key(service_name)


def update_api_key_pool_from_db(db: Session) -> None:
    """
    Update API key pools from database settings
    """
    # Update Gemini API key pool
    gemini_keys = get_api_keys_from_db_or_env(db, "GEMINI_API_KEY_POOL")
    if not gemini_keys:
        gemini_keys = get_api_keys_from_db_or_env(db, "GEMINI_API_KEY")
    
    if gemini_keys:
        if "gemini" not in _api_key_pools:
            _api_key_pools["gemini"] = ApiKeyPool(
                service_name="gemini",
                keys=gemini_keys,
                rate_limit_per_minute=60
            )
        else:
            # Update existing pool
            _api_key_pools["gemini"].keys = gemini_keys
            _api_key_pools["gemini"].usage_counts = {key: [] for key in gemini_keys}
        
        logger.info(f"Updated Gemini API key pool from database with {len(gemini_keys)} keys")
    
    # Update OpenRouter API key pool
    openrouter_keys = get_api_keys_from_db_or_env(db, "OPENROUTER_API_KEY")
    if openrouter_keys:
        if "openrouter" not in _api_key_pools:
            _api_key_pools["openrouter"] = ApiKeyPool(
                service_name="openrouter",
                keys=openrouter_keys,
                rate_limit_per_minute=20
            )
        else:
            # Update existing pool
            _api_key_pools["openrouter"].keys = openrouter_keys
            _api_key_pools["openrouter"].usage_counts = {key: [] for key in openrouter_keys}
        
        logger.info(f"Updated OpenRouter API key pool from database with {len(openrouter_keys)} keys")


def get_api_key_usage_stats() -> Dict[str, Dict[str, Dict[str, int]]]:
    """
    Get usage statistics for all API key pools
    """
    stats = {}
    for service_name, pool in _api_key_pools.items():
        stats[service_name] = pool.get_usage_stats()
    
    return stats


# Initialize pools on module import
initialize_api_key_pools()
