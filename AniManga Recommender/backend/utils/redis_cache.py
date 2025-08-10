# ABOUTME: Redis cache implementation for AniManga Recommender
# ABOUTME: Provides Redis operations with Upstash compatibility
"""
Redis Cache Implementation for AniManga Recommender

This module provides Redis caching functionality with support for both
standard Redis and Upstash Redis (cloud service). Designed to cache
large objects like TF-IDF matrices and DataFrames efficiently.

Key Features:
    - Standard Redis and Upstash compatibility
    - Automatic serialization/deserialization
    - Large object compression support
    - Connection pooling
    - Graceful fallback on connection errors
    - TTL management
"""

import os
import json
import pickle
import zlib
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import timedelta
import redis
from redis.exceptions import ConnectionError, TimeoutError, RedisError

# Configure logging
logger = logging.getLogger(__name__)

# Cache TTL configuration (in hours)
DEFAULT_TTL_HOURS = 168  # 7 days for TF-IDF data
CACHE_TTL_CONFIG = {
    'tfidf_matrix': 168,      # 7 days
    'tfidf_vectorizer': 168,   # 7 days
    'df_processed': 168,       # 7 days
    'uid_to_idx': 168,         # 7 days
    'user_stats': 24,          # 1 day
    'recommendations': 4,      # 4 hours
}

class RedisCache:
    """
    Redis cache client with Upstash support and large object handling.
    
    Provides high-level caching operations with automatic serialization,
    compression for large objects, and graceful error handling.
    """
    
    def __init__(self, redis_url: Optional[str] = None, 
                 connection_pool_kwargs: Optional[Dict] = None):
        """
        Initialize Redis cache connection.
        
        Args:
            redis_url: Redis connection URL (defaults to env REDIS_URL)
            connection_pool_kwargs: Additional connection pool parameters
        """
        self.redis_url = redis_url or os.getenv('REDIS_URL')
        self.connected = False
        self.client = None
        self.is_upstash = False
        
        if not self.redis_url:
            logger.warning("No Redis URL configured, cache disabled")
            return
        
        # Detect if this is Upstash (contains upstash.io)
        self.is_upstash = 'upstash.io' in self.redis_url
        
        try:
            # Configure connection pool
            pool_kwargs = {
                'decode_responses': False,  # We handle encoding ourselves
                'socket_connect_timeout': 5,
                'socket_timeout': 5,
                'retry_on_timeout': True,
                'max_connections': 10,
            }
            
            if connection_pool_kwargs:
                pool_kwargs.update(connection_pool_kwargs)
            
            # Create Redis client with connection pooling
            if self.is_upstash:
                # Upstash uses standard Redis protocol
                self.client = redis.from_url(
                    self.redis_url,
                    **pool_kwargs
                )
            else:
                # Standard Redis connection
                self.client = redis.from_url(
                    self.redis_url,
                    **pool_kwargs
                )
            
            # Test connection
            self.client.ping()
            self.connected = True
            logger.info(f"Redis cache connected {'(Upstash)' if self.is_upstash else ''}")
            
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis connection failed: {e}")
            self.connected = False
        except Exception as e:
            logger.error(f"Redis initialization error: {e}")
            self.connected = False
    
    def _serialize_value(self, value: Any, compress_threshold: int = 1024 * 100) -> bytes:
        """
        Serialize value with optional compression for large objects.
        
        Args:
            value: Value to serialize
            compress_threshold: Compress if serialized size exceeds this (bytes)
            
        Returns:
            Serialized (and possibly compressed) bytes
        """
        # Try JSON first for simple types
        if isinstance(value, (str, int, float, bool, list, dict)):
            try:
                serialized = json.dumps(value).encode('utf-8')
                # Mark as JSON with a prefix
                return b'json:' + serialized
            except (TypeError, ValueError):
                pass
        
        # Use pickle for complex objects
        serialized = pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
        
        # Compress large objects
        if len(serialized) > compress_threshold:
            compressed = zlib.compress(serialized, level=6)
            # Only use compression if it actually reduces size
            if len(compressed) < len(serialized) * 0.9:
                return b'zlib:' + compressed
        
        return b'pickle:' + serialized
    
    def _deserialize_value(self, data: bytes) -> Any:
        """
        Deserialize value with automatic format detection.
        
        Args:
            data: Serialized bytes
            
        Returns:
            Deserialized value
        """
        if not data:
            return None
        
        # Check format prefix
        if data.startswith(b'json:'):
            return json.loads(data[5:].decode('utf-8'))
        elif data.startswith(b'zlib:'):
            decompressed = zlib.decompress(data[5:])
            return pickle.loads(decompressed)
        elif data.startswith(b'pickle:'):
            return pickle.loads(data[7:])
        else:
            # Try to decode as string for backwards compatibility
            try:
                return data.decode('utf-8')
            except UnicodeDecodeError:
                # Fall back to pickle
                return pickle.loads(data)
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from Redis cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if not self.connected or not self.client:
            return None
        
        try:
            data = self.client.get(key)
            if data is None:
                return None
            
            return self._deserialize_value(data)
            
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis get error for key {key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Redis deserialization error for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl_hours: Optional[float] = None) -> bool:
        """
        Set value in Redis cache with optional TTL.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_hours: Time to live in hours (defaults to config or 7 days)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.connected or not self.client:
            return False
        
        try:
            # Serialize value
            data = self._serialize_value(value)
            
            # Determine TTL
            if ttl_hours is None:
                # Check if key has a configured TTL
                for pattern, hours in CACHE_TTL_CONFIG.items():
                    if pattern in key:
                        ttl_hours = hours
                        break
                else:
                    ttl_hours = DEFAULT_TTL_HOURS
            
            # Set with expiration
            ttl_seconds = int(ttl_hours * 3600)
            result = self.client.setex(key, ttl_seconds, data)
            
            if result:
                logger.debug(f"Cached {key} ({len(data)} bytes, TTL: {ttl_hours}h)")
            
            return bool(result)
            
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis set error for key {key}: {e}")
            return False
        except Exception as e:
            logger.error(f"Redis serialization error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete key from Redis cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if deleted, False otherwise
        """
        if not self.connected or not self.client:
            return False
        
        try:
            result = self.client.delete(key)
            return bool(result)
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis delete error for key {key}: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """
        Check if key exists in Redis cache.
        
        Args:
            key: Cache key to check
            
        Returns:
            True if exists, False otherwise
        """
        if not self.connected or not self.client:
            return False
        
        try:
            return bool(self.client.exists(key))
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis exists error for key {key}: {e}")
            return False
    
    def mget(self, keys: List[str]) -> Dict[str, Any]:
        """
        Get multiple values from Redis cache.
        
        Args:
            keys: List of cache keys
            
        Returns:
            Dictionary of key-value pairs
        """
        if not self.connected or not self.client:
            return {}
        
        try:
            values = self.client.mget(keys)
            result = {}
            
            for key, data in zip(keys, values):
                if data is not None:
                    try:
                        result[key] = self._deserialize_value(data)
                    except Exception as e:
                        logger.error(f"Failed to deserialize {key}: {e}")
                        
            return result
            
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis mget error: {e}")
            return {}
    
    def mset(self, mapping: Dict[str, Any], ttl_hours: Optional[float] = None) -> bool:
        """
        Set multiple values in Redis cache.
        
        Args:
            mapping: Dictionary of key-value pairs
            ttl_hours: Time to live in hours
            
        Returns:
            True if successful, False otherwise
        """
        if not self.connected or not self.client:
            return False
        
        try:
            # Use pipeline for atomic multi-set with TTL
            pipe = self.client.pipeline()
            
            for key, value in mapping.items():
                data = self._serialize_value(value)
                
                # Determine TTL for this key
                key_ttl = ttl_hours
                if key_ttl is None:
                    for pattern, hours in CACHE_TTL_CONFIG.items():
                        if pattern in key:
                            key_ttl = hours
                            break
                    else:
                        key_ttl = DEFAULT_TTL_HOURS
                
                ttl_seconds = int(key_ttl * 3600)
                pipe.setex(key, ttl_seconds, data)
            
            results = pipe.execute()
            return all(results)
            
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis mset error: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.
        
        Args:
            pattern: Redis key pattern (e.g., "tfidf_*")
            
        Returns:
            Number of keys deleted
        """
        if not self.connected or not self.client:
            return 0
        
        try:
            # Use SCAN to avoid blocking with KEYS
            deleted = 0
            cursor = 0
            
            while True:
                cursor, keys = self.client.scan(cursor, match=pattern, count=100)
                if keys:
                    deleted += self.client.delete(*keys)
                if cursor == 0:
                    break
            
            logger.info(f"Deleted {deleted} keys matching pattern: {pattern}")
            return deleted
            
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis clear_pattern error: {e}")
            return 0
    
    def info(self) -> Dict[str, Any]:
        """
        Get Redis server information and statistics.
        
        Returns:
            Dictionary with connection status and server info
        """
        info = {
            'connected': self.connected,
            'is_upstash': self.is_upstash,
            'url': self.redis_url[:20] + '...' if self.redis_url else None
        }
        
        if self.connected and self.client:
            try:
                server_info = self.client.info()
                info.update({
                    'used_memory_human': server_info.get('used_memory_human'),
                    'connected_clients': server_info.get('connected_clients'),
                    'total_commands_processed': server_info.get('total_commands_processed'),
                    'keyspace': server_info.get('db0', {})
                })
            except Exception as e:
                logger.warning(f"Failed to get Redis info: {e}")
        
        return info
    
    def ping(self) -> bool:
        """
        Test Redis connection.
        
        Returns:
            True if connected, False otherwise
        """
        if not self.client:
            return False
        
        try:
            return bool(self.client.ping())
        except Exception:
            return False


# Global Redis cache instance
_redis_cache = None

def get_redis_cache() -> RedisCache:
    """
    Get global Redis cache instance (singleton pattern).
    
    Returns:
        RedisCache instance
    """
    global _redis_cache
    if _redis_cache is None:
        _redis_cache = RedisCache()
    return _redis_cache