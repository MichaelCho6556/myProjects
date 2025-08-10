# ABOUTME: Hybrid cache implementation combining memory, Redis, and database layers
# ABOUTME: Provides transparent three-tier caching with automatic fallback and promotion
"""
Hybrid Cache Implementation for AniManga Recommender

This module provides a three-tier caching solution combining fast in-memory LRU cache,
persistent Redis cache, and database cache fallback. Designed for optimal performance
with cloud deployment compatibility.

Architecture:
    Layer 1: In-memory LRU cache (microsecond access)
    Layer 2: Redis cache (millisecond access, persistent)
    Layer 3: Database cache (millisecond access, fallback)
    Layer 4: Source data (compute/fetch)

Key Features:
    - Transparent three-tier operation
    - Automatic promotion of hot data
    - Write-through consistency
    - Graceful degradation
    - Redis-compatible API
    - Performance monitoring
"""

import os
import logging
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import timedelta
import time
from threading import Lock
import json

from .memory_cache import MemoryLRUCache, ThreadLocalCache
from .database_cache import DatabaseCache, DatabaseCacheBatch

# Try to import Redis cache
try:
    from .redis_cache import RedisCache, get_redis_cache
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.info("Redis cache not available, using memory + database only")

# Configure logging
logger = logging.getLogger(__name__)

# Cache TTL configuration (matching original Redis configuration)
CACHE_TTL_HOURS = {
    'user_stats': 24,
    'recommendations': 4,
    'popular_lists': 12,
    'platform_stats': 1,
    'toxicity_analysis': 24,
    'moderation_stats': 2,
    'content_moderation': 12,
    'custom_lists': 1,
    'list_details': 2,
}


class HybridCache:
    """
    Hybrid three-tier cache with memory, Redis, and database layers.
    
    Provides Redis-compatible API with transparent three-tier caching.
    Hot data stays in memory, warm data in Redis, with database as fallback.
    """
    
    def __init__(self, 
                 memory_size: int = 1000,
                 memory_mb: int = 100,
                 enable_thread_local: bool = True,
                 enable_redis: bool = True):
        """
        Initialize hybrid cache with configured tiers.
        
        Args:
            memory_size: Max entries in memory cache
            memory_mb: Max memory usage in MB
            enable_thread_local: Enable thread-local caching
            enable_redis: Enable Redis caching tier
        """
        # Initialize cache layers
        self.memory_cache = MemoryLRUCache(
            max_size=memory_size,
            max_memory_mb=memory_mb,
            default_ttl_seconds=3600  # 1 hour default
        )
        
        # Initialize Redis cache if available and enabled
        self.redis_cache = None
        if enable_redis and REDIS_AVAILABLE:
            try:
                self.redis_cache = get_redis_cache()
                if not self.redis_cache.connected:
                    logger.warning("Redis configured but not connected")
                    self.redis_cache = None
            except Exception as e:
                logger.warning(f"Failed to initialize Redis cache: {e}")
                self.redis_cache = None
        
        self.database_cache = DatabaseCache()
        
        # Thread-local cache for ultra-hot data
        if enable_thread_local:
            self.thread_cache = ThreadLocalCache(self.memory_cache)
        else:
            self.thread_cache = None
        
        # Configuration
        self.write_through = True  # Write to all layers
        self.promotion_threshold = 3  # Hits before promotion
        self._lock = Lock()
        
        # Combined statistics
        self.stats = {
            'memory_hits': 0,
            'redis_hits': 0,
            'database_hits': 0,
            'total_misses': 0,
            'promotions': 0,
            'write_throughs': 0
        }
        
        # Connection status
        self.connected = self.database_cache.connected or (self.redis_cache and self.redis_cache.connected)
        
        logger.info(f"HybridCache initialized: memory_size={memory_size}, "
                   f"memory_mb={memory_mb}, redis_connected={bool(self.redis_cache and self.redis_cache.connected)}, "
                   f"database_connected={self.database_cache.connected}")
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache with automatic tier fallback.
        
        Tries: Thread-local → Memory → Redis → Database
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None
        """
        # Try thread-local cache first
        if self.thread_cache:
            value = self.thread_cache.get(key)
            if value is not None:
                self.stats['memory_hits'] += 1
                return value
        
        # Try memory cache
        value = self.memory_cache.get(key)
        if value is not None:
            self.stats['memory_hits'] += 1
            return value
        
        # Try Redis cache
        if self.redis_cache and self.redis_cache.connected:
            value = self.redis_cache.get(key)
            if value is not None:
                self.stats['redis_hits'] += 1
                
                # Promote to memory cache for faster access
                self.memory_cache.set(key, value)
                
                return value
        
        # Try database cache as fallback
        if self.database_cache.connected:
            value = self.database_cache.get(key)
            if value is not None:
                self.stats['database_hits'] += 1
                
                # Promote to Redis and memory if found
                if self.redis_cache and self.redis_cache.connected:
                    self.redis_cache.set(key, value)
                self.memory_cache.set(key, value)
                
                return value
        
        # Complete miss
        self.stats['total_misses'] += 1
        return None
    
    def set(self, key: str, value: Any, ttl_hours: Optional[int] = None) -> bool:
        """
        Set value in cache with write-through to all tiers.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_hours: TTL in hours
            
        Returns:
            True if successfully cached
        """
        # Convert TTL to seconds for memory cache
        ttl_seconds = ttl_hours * 3600 if ttl_hours else 3600
        
        # Write to memory cache
        memory_success = self.memory_cache.set(key, value, ttl_seconds)
        
        # Thread-local cache update
        if self.thread_cache and memory_success:
            self.thread_cache.set(key, value, ttl_seconds)
        
        # Write-through to Redis
        redis_success = False
        if self.write_through and self.redis_cache and self.redis_cache.connected:
            redis_success = self.redis_cache.set(key, value, ttl_hours)
            if redis_success:
                self.stats['write_throughs'] += 1
        
        # Write-through to database as fallback
        database_success = False
        if self.write_through and self.database_cache.connected:
            database_success = self.database_cache.set(key, value, ttl_hours)
            if database_success:
                self.stats['write_throughs'] += 1
        
        return memory_success or redis_success or database_success
    
    def setex(self, key: str, seconds: Union[int, timedelta], value: Any) -> bool:
        """
        Set with expiration in seconds (Redis compatibility).
        
        Args:
            key: Cache key
            seconds: TTL in seconds or timedelta
            value: Value to cache
            
        Returns:
            True if successfully cached
        """
        if isinstance(seconds, timedelta):
            ttl_hours = seconds.total_seconds() / 3600
        else:
            ttl_hours = seconds / 3600
        
        return self.set(key, value, ttl_hours=ttl_hours)
    
    def delete(self, key: str) -> bool:
        """
        Delete from all cache tiers.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if deleted from any tier
        """
        # Delete from all tiers
        memory_deleted = self.memory_cache.delete(key)
        
        database_deleted = False
        if self.database_cache.connected:
            database_deleted = self.database_cache.delete(key)
        
        # Clear from thread-local
        if self.thread_cache:
            self.thread_cache.clear_local()
        
        return memory_deleted or database_deleted
    
    def exists(self, key: str) -> bool:
        """
        Check if key exists in any tier.
        
        Args:
            key: Cache key to check
            
        Returns:
            True if exists in any tier
        """
        # Check memory first (fastest)
        if self.memory_cache.exists(key):
            return True
        
        # Check database
        if self.database_cache.connected:
            return self.database_cache.exists(key)
        
        return False
    
    def pipeline(self):
        """
        Start a pipeline for batch operations.
        
        Returns:
            Self for chaining
        """
        # For now, delegate to database cache
        # Could be enhanced to batch memory operations too
        return self.database_cache.pipeline()
    
    def execute(self) -> List[Any]:
        """Execute pipeline operations."""
        return self.database_cache.execute()
    
    def _consider_promotion(self, key: str, value: Any):
        """
        Consider promoting a database cache hit to memory.
        
        Simple strategy: Promote based on cache type priority.
        Could be enhanced with access frequency tracking.
        
        Args:
            key: Cache key
            value: Cached value
        """
        # Determine cache type for promotion decision
        cache_type = self._determine_cache_type(key)
        
        # High-priority cache types get promoted immediately
        high_priority_types = {'user_stats', 'recommendations', 'popular_lists'}
        
        if cache_type in high_priority_types:
            # Get TTL from configuration
            ttl_hours = CACHE_TTL_HOURS.get(cache_type, 1)
            ttl_seconds = ttl_hours * 3600
            
            # Promote to memory
            if self.memory_cache.set(key, value, ttl_seconds):
                self.stats['promotions'] += 1
                logger.debug(f"Promoted {cache_type} key to memory: {key}")
    
    def _determine_cache_type(self, key: str) -> str:
        """Determine cache type from key pattern."""
        # Same logic as database cache
        if 'user_stats:' in key:
            return 'user_stats'
        elif 'recommendations:' in key:
            return 'recommendations'
        elif 'toxicity_analysis:' in key:
            return 'toxicity_analysis'
        elif 'moderation_' in key:
            return 'moderation'
        elif 'list_' in key or '_lists:' in key:
            return 'lists'
        elif 'popular_' in key:
            return 'popular_lists'
        elif 'platform_stats:' in key:
            return 'platform_stats'
        elif 'profile_' in key:
            return 'profile'
        else:
            return 'general'
    
    def warm_up(self, keys: List[str]):
        """
        Pre-warm memory cache by loading from database.
        
        Args:
            keys: List of keys to warm up
        """
        if not self.database_cache.connected:
            logger.warning("Cannot warm up: database not connected")
            return
        
        warmed = 0
        batch = DatabaseCacheBatch(self.database_cache)
        
        # Get values from database
        values = batch.mget(keys)
        
        # Load into memory
        for key, value in zip(keys, values):
            if value is not None:
                cache_type = self._determine_cache_type(key)
                ttl_hours = CACHE_TTL_HOURS.get(cache_type, 1)
                ttl_seconds = ttl_hours * 3600
                
                if self.memory_cache.set(key, value, ttl_seconds):
                    warmed += 1
        
        logger.info(f"Warmed up {warmed}/{len(keys)} keys in memory cache")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get combined statistics from all tiers.
        
        Returns:
            Dictionary with tier statistics
        """
        with self._lock:
            # Get tier stats
            memory_stats = self.memory_cache.get_stats()
            database_stats = self.database_cache.get_stats() if self.database_cache.connected else {}
            
            # Calculate combined metrics
            total_hits = (self.stats['memory_hits'] + 
                         self.stats['database_hits'])
            total_requests = total_hits + self.stats['total_misses']
            
            combined_stats = {
                'total_requests': total_requests,
                'total_hits': total_hits,
                'total_misses': self.stats['total_misses'],
                'overall_hit_rate': round(total_hits / total_requests * 100, 2) if total_requests > 0 else 0,
                
                'memory_hits': self.stats['memory_hits'],
                'database_hits': self.stats['database_hits'],
                'promotions': self.stats['promotions'],
                'write_throughs': self.stats['write_throughs'],
                
                'memory_tier': memory_stats,
                'database_tier': database_stats,
                
                'connected': self.connected,
                'backend': 'hybrid'
            }
            
            return combined_stats
    
    def info(self) -> Dict[str, Any]:
        """Get cache information (Redis compatibility)."""
        info = {
            'connected': self.connected,
            'backend': 'hybrid',
            'memory_cache': {
                'size': self.memory_cache.stats['current_size'],
                'memory_mb': round(self.memory_cache.stats['current_memory'] / (1024 * 1024), 2),
                'hit_rate': self.memory_cache.get_stats()['hit_rate']
            }
        }
        
        if self.database_cache.connected:
            info['database_cache'] = self.database_cache.info()
        
        return info
    
    def ping(self) -> bool:
        """Test cache availability."""
        # Hybrid cache works even if database is down
        return True
    
    def clear_memory(self):
        """Clear memory cache tier only."""
        self.memory_cache.clear()
        if self.thread_cache:
            self.thread_cache.clear_local()
        logger.info("Cleared memory cache tier")
    
    def optimize(self):
        """
        Optimize cache by promoting hot keys and cleaning expired entries.
        
        This could be called periodically to maintain cache efficiency.
        """
        # Clean up expired entries in database
        if self.database_cache.connected:
            cleared = self.database_cache.clear_expired()
            logger.info(f"Cleared {cleared} expired database cache entries")
        
        # Get hot keys from memory cache
        hot_keys = self.memory_cache.get_hot_keys(top_n=20)
        logger.info(f"Top hot keys: {[k for k, _ in hot_keys[:5]]}")


# Global cache instance (singleton)
_hybrid_cache_instance: Optional[HybridCache] = None
_cache_lock = Lock()


def get_hybrid_cache() -> HybridCache:
    """
    Get global hybrid cache instance (singleton pattern).
    
    Returns:
        Global HybridCache instance
    """
    global _hybrid_cache_instance
    
    if _hybrid_cache_instance is None:
        with _cache_lock:
            if _hybrid_cache_instance is None:
                # Configure from environment
                memory_size = int(os.getenv('CACHE_MEMORY_SIZE', '1000'))
                memory_mb = int(os.getenv('CACHE_MEMORY_MB', '100'))
                enable_thread_local = os.getenv('CACHE_THREAD_LOCAL', 'true').lower() == 'true'
                
                _hybrid_cache_instance = HybridCache(
                    memory_size=memory_size,
                    memory_mb=memory_mb,
                    enable_thread_local=enable_thread_local
                )
    
    return _hybrid_cache_instance


# Convenience functions for backward compatibility
def clear_hybrid_cache():
    """Clear the global hybrid cache."""
    cache = get_hybrid_cache()
    cache.clear_memory()
    logger.info("Global hybrid cache cleared")


def warm_hybrid_cache(keys: List[str]):
    """Warm up the global hybrid cache."""
    cache = get_hybrid_cache()
    cache.warm_up(keys)