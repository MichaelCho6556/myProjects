# ABOUTME: In-memory LRU cache implementation for hot data caching
# ABOUTME: Provides fast thread-safe caching with automatic eviction and TTL support
"""
In-Memory LRU Cache for AniManga Recommender

This module provides a high-performance in-memory LRU (Least Recently Used) cache
layer that sits in front of the database cache for frequently accessed data.
Designed for production use with thread safety and memory management.

Key Features:
    - Thread-safe LRU eviction with configurable size
    - TTL support with automatic expiration
    - Memory pressure management
    - Hit/miss statistics tracking
    - Warm-up capabilities for preloading
    - Batch operations support
"""

import time
import threading
from typing import Dict, List, Optional, Any, Tuple, Union
from collections import OrderedDict
from datetime import datetime, timedelta
import json
import logging
import sys
from functools import wraps

# Configure logging
logger = logging.getLogger(__name__)


class CacheEntry:
    """Represents a single cache entry with value, expiration, and metadata."""
    
    __slots__ = ['value', 'expires_at', 'created_at', 'hit_count', 'size']
    
    def __init__(self, value: Any, ttl_seconds: Optional[float] = None):
        self.value = value
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl_seconds if ttl_seconds else None
        self.hit_count = 0
        self.size = self._estimate_size(value)
    
    def is_expired(self) -> bool:
        """Check if this entry has expired."""
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at
    
    def access(self):
        """Record an access to this entry."""
        self.hit_count += 1
    
    def _estimate_size(self, value: Any) -> int:
        """Estimate memory size of the cached value."""
        try:
            # Simple estimation based on JSON serialization
            return len(json.dumps(value, default=str))
        except:
            # Fallback to sys.getsizeof
            return sys.getsizeof(value)


class MemoryLRUCache:
    """
    Thread-safe in-memory LRU cache with TTL support.
    
    Provides fast caching for hot data with automatic eviction based on
    LRU policy and memory constraints. Designed as the first tier in a
    multi-tier caching strategy.
    """
    
    def __init__(self, 
                 max_size: int = 1000,
                 max_memory_mb: int = 100,
                 default_ttl_seconds: float = 3600):
        """
        Initialize memory cache with size and memory limits.
        
        Args:
            max_size: Maximum number of entries (default: 1000)
            max_memory_mb: Maximum memory usage in MB (default: 100)
            default_ttl_seconds: Default TTL in seconds (default: 3600)
        """
        self.max_size = max_size
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.default_ttl = default_ttl_seconds
        
        # Thread-safe cache storage
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        
        # Statistics
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'expirations': 0,
            'current_size': 0,
            'current_memory': 0
        }
        
        # Background cleanup thread
        self._cleanup_interval = 60  # seconds
        self._cleanup_thread = threading.Thread(
            target=self._cleanup_expired,
            daemon=True
        )
        self._cleanup_thread.start()
        
        logger.info(f"MemoryLRUCache initialized: max_size={max_size}, max_memory={max_memory_mb}MB")
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache with LRU update.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            entry = self._cache.get(key)
            
            if entry is None:
                self.stats['misses'] += 1
                return None
            
            # Check expiration
            if entry.is_expired():
                self._remove_entry(key)
                self.stats['expirations'] += 1
                self.stats['misses'] += 1
                return None
            
            # Update LRU order
            self._cache.move_to_end(key)
            entry.access()
            
            self.stats['hits'] += 1
            return entry.value
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[float] = None) -> bool:
        """
        Set value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: TTL in seconds (uses default if None)
            
        Returns:
            True if successfully cached
        """
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        
        with self._lock:
            # Create new entry
            entry = CacheEntry(value, ttl)
            
            # Check if we need to evict
            if key not in self._cache:
                self._evict_if_needed(entry.size)
            
            # Update or add entry
            if key in self._cache:
                old_entry = self._cache[key]
                self.stats['current_memory'] -= old_entry.size
            
            self._cache[key] = entry
            self._cache.move_to_end(key)
            
            self.stats['current_size'] = len(self._cache)
            self.stats['current_memory'] += entry.size
            
            return True
    
    def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if key was deleted
        """
        with self._lock:
            if key in self._cache:
                self._remove_entry(key)
                return True
            return False
    
    def exists(self, key: str) -> bool:
        """
        Check if key exists and is not expired.
        
        Args:
            key: Cache key to check
            
        Returns:
            True if key exists and is valid
        """
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return False
            
            if entry.is_expired():
                self._remove_entry(key)
                return False
            
            return True
    
    def clear(self):
        """Clear all entries from cache."""
        with self._lock:
            self._cache.clear()
            self.stats['current_size'] = 0
            self.stats['current_memory'] = 0
            logger.info("Memory cache cleared")
    
    def _remove_entry(self, key: str):
        """Remove entry and update statistics."""
        if key in self._cache:
            entry = self._cache[key]
            self.stats['current_memory'] -= entry.size
            del self._cache[key]
            self.stats['current_size'] = len(self._cache)
    
    def _evict_if_needed(self, new_entry_size: int):
        """
        Evict entries if needed to make room for new entry.
        
        Args:
            new_entry_size: Size of the new entry to be added
        """
        # Check size limit
        while len(self._cache) >= self.max_size:
            self._evict_lru()
        
        # Check memory limit
        while (self.stats['current_memory'] + new_entry_size > self.max_memory_bytes 
               and len(self._cache) > 0):
            self._evict_lru()
    
    def _evict_lru(self):
        """Evict the least recently used entry."""
        if self._cache:
            # Get the least recently used key (first in OrderedDict)
            lru_key = next(iter(self._cache))
            self._remove_entry(lru_key)
            self.stats['evictions'] += 1
            logger.debug(f"Evicted LRU entry: {lru_key}")
    
    def _cleanup_expired(self):
        """Background thread to clean up expired entries."""
        while True:
            time.sleep(self._cleanup_interval)
            
            with self._lock:
                expired_keys = []
                for key, entry in self._cache.items():
                    if entry.is_expired():
                        expired_keys.append(key)
                
                for key in expired_keys:
                    self._remove_entry(key)
                    self.stats['expirations'] += 1
                
                if expired_keys:
                    logger.debug(f"Cleaned up {len(expired_keys)} expired entries")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        with self._lock:
            stats = self.stats.copy()
            
            # Calculate hit rate
            total_ops = stats['hits'] + stats['misses']
            if total_ops > 0:
                stats['hit_rate'] = round(stats['hits'] / total_ops * 100, 2)
            else:
                stats['hit_rate'] = 0
            
            # Memory usage
            stats['memory_usage_mb'] = round(stats['current_memory'] / (1024 * 1024), 2)
            stats['memory_usage_percent'] = round(
                stats['current_memory'] / self.max_memory_bytes * 100, 2
            )
            
            # Capacity
            stats['size_usage_percent'] = round(
                stats['current_size'] / self.max_size * 100, 2
            )
            
            return stats
    
    def warm_up(self, entries: List[Tuple[str, Any, Optional[float]]]):
        """
        Pre-warm cache with multiple entries.
        
        Args:
            entries: List of (key, value, ttl_seconds) tuples
        """
        loaded = 0
        for entry in entries:
            key, value = entry[0], entry[1]
            ttl = entry[2] if len(entry) > 2 else None
            
            if self.set(key, value, ttl):
                loaded += 1
        
        logger.info(f"Warmed up cache with {loaded} entries")
    
    def get_hot_keys(self, top_n: int = 10) -> List[Tuple[str, int]]:
        """
        Get the most frequently accessed keys.
        
        Args:
            top_n: Number of top keys to return
            
        Returns:
            List of (key, hit_count) tuples
        """
        with self._lock:
            # Sort by hit count
            hot_keys = [
                (key, entry.hit_count) 
                for key, entry in self._cache.items()
            ]
            hot_keys.sort(key=lambda x: x[1], reverse=True)
            
            return hot_keys[:top_n]


class ThreadLocalCache:
    """
    Thread-local cache for reducing lock contention.
    
    Provides a small per-thread cache that reduces contention on the
    main cache lock for very hot keys.
    """
    
    def __init__(self, main_cache: MemoryLRUCache, local_size: int = 100):
        self.main_cache = main_cache
        self.local_size = local_size
        self._local = threading.local()
    
    def _get_local_cache(self) -> Dict[str, Tuple[Any, float]]:
        """Get or create thread-local cache."""
        if not hasattr(self._local, 'cache'):
            self._local.cache = {}
        return self._local.cache
    
    def get(self, key: str) -> Optional[Any]:
        """Get from thread-local cache first, then main cache."""
        local_cache = self._get_local_cache()
        
        # Check local cache
        if key in local_cache:
            value, expires_at = local_cache[key]
            if expires_at is None or time.time() < expires_at:
                return value
            else:
                del local_cache[key]
        
        # Fall back to main cache
        value = self.main_cache.get(key)
        if value is not None:
            # Cache locally with short TTL
            expires_at = time.time() + 60  # 1 minute local cache
            local_cache[key] = (value, expires_at)
            
            # Maintain local cache size
            if len(local_cache) > self.local_size:
                # Remove oldest entry
                oldest_key = next(iter(local_cache))
                del local_cache[oldest_key]
        
        return value
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[float] = None) -> bool:
        """Set in both main and local cache."""
        # Set in main cache
        result = self.main_cache.set(key, value, ttl_seconds)
        
        if result:
            # Also set in local cache
            local_cache = self._get_local_cache()
            expires_at = time.time() + 60 if ttl_seconds is None else time.time() + ttl_seconds
            local_cache[key] = (value, expires_at)
        
        return result
    
    def clear_local(self):
        """Clear thread-local cache."""
        if hasattr(self._local, 'cache'):
            self._local.cache.clear()


def cached_result(ttl_seconds: float = 300):
    """
    Decorator for caching function results in memory.
    
    Args:
        ttl_seconds: TTL for cached results
    
    Example:
        @cached_result(ttl_seconds=600)
        def expensive_function(param):
            # Expensive computation
            return result
    """
    def decorator(func):
        # Use function-specific cache
        cache = MemoryLRUCache(max_size=100, max_memory_mb=10)
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Compute and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl_seconds)
            
            return result
        
        # Add cache access for testing/debugging
        wrapper._cache = cache
        return wrapper
    
    return decorator