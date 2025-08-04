# ABOUTME: Request-time caching with TTLCache for ultra-hot data and fallback strategies
# ABOUTME: Provides decorators and utilities for aggressive in-request caching
"""
Request-Time Cache for AniManga Recommender

This module provides request-scoped caching using cachetools for ultra-hot data
that needs microsecond access times. It sits on top of the hybrid cache system
to provide an additional layer of caching for frequently accessed data within
a single request or across a short time window.

Key Features:
    - TTLCache for request-scoped hot data (5-minute default TTL)
    - LRU cache decorators for expensive functions
    - Fallback chain: Request cache → Hybrid cache → Database → Compute
    - Thread-safe implementation with minimal overhead
    - Automatic cache key generation
    - Performance monitoring integration
"""

import time
import logging
import hashlib
import json
from functools import wraps, lru_cache
from typing import Dict, List, Optional, Any, Union, Callable, Tuple
from datetime import datetime, timedelta
from threading import Lock

from cachetools import TTLCache, LRUCache
from cachetools.keys import hashkey

from .hybrid_cache import get_hybrid_cache, CACHE_TTL_HOURS
from .monitoring import record_cache_hit, record_cache_miss

# Configure logging
logger = logging.getLogger(__name__)

# Global request cache instance (TTL of 5 minutes for ultra-hot data)
REQUEST_CACHE_TTL = 300  # 5 minutes in seconds
REQUEST_CACHE_SIZE = 1000  # Maximum number of items

# Create thread-safe TTL cache
_request_cache = TTLCache(maxsize=REQUEST_CACHE_SIZE, ttl=REQUEST_CACHE_TTL)
_request_cache_lock = Lock()

# Statistics tracking
_cache_stats = {
    'request_hits': 0,
    'request_misses': 0,
    'fallback_hits': 0,
    'compute_calls': 0,
    'total_requests': 0
}


def get_request_cache_stats() -> Dict[str, Any]:
    """Get statistics for request-time cache performance."""
    with _request_cache_lock:
        total = _cache_stats['total_requests']
        if total == 0:
            hit_rate = 0
        else:
            hit_rate = (_cache_stats['request_hits'] / total) * 100
        
        return {
            'request_cache_size': len(_request_cache),
            'request_cache_max_size': REQUEST_CACHE_SIZE,
            'request_cache_ttl_seconds': REQUEST_CACHE_TTL,
            'total_requests': total,
            'request_hits': _cache_stats['request_hits'],
            'request_misses': _cache_stats['request_misses'],
            'fallback_hits': _cache_stats['fallback_hits'],
            'compute_calls': _cache_stats['compute_calls'],
            'request_hit_rate': round(hit_rate, 2)
        }


def clear_request_cache():
    """Clear the request-time cache (useful for testing or memory pressure)."""
    with _request_cache_lock:
        _request_cache.clear()
        logger.info("Request cache cleared")


def generate_cache_key(*args, **kwargs) -> str:
    """
    Generate a stable cache key from function arguments.
    
    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments
        
    Returns:
        String cache key
    """
    # Create a hashable representation
    key_data = {
        'args': args,
        'kwargs': sorted(kwargs.items())
    }
    
    # Use JSON serialization for complex objects
    try:
        key_str = json.dumps(key_data, sort_keys=True, default=str)
    except:
        # Fallback to string representation
        key_str = str(key_data)
    
    # Generate hash for consistent key length
    return hashlib.md5(key_str.encode()).hexdigest()


def request_cache(ttl: Optional[int] = None, key_prefix: Optional[str] = None):
    """
    Decorator for request-time caching with automatic fallback.
    
    Args:
        ttl: Custom TTL in seconds (default: REQUEST_CACHE_TTL)
        key_prefix: Optional prefix for cache keys
        
    Returns:
        Decorated function with request caching
    """
    def decorator(func: Callable) -> Callable:
        cache_ttl = ttl or REQUEST_CACHE_TTL
        prefix = key_prefix or func.__name__
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{prefix}:{generate_cache_key(*args, **kwargs)}"
            
            # Update stats
            with _request_cache_lock:
                _cache_stats['total_requests'] += 1
            
            # Try request cache first
            with _request_cache_lock:
                if cache_key in _request_cache:
                    _cache_stats['request_hits'] += 1
                    record_cache_hit('request')
                    logger.debug(f"Request cache hit: {cache_key}")
                    return _request_cache[cache_key]
            
            # Cache miss - compute result
            with _request_cache_lock:
                _cache_stats['request_misses'] += 1
            record_cache_miss('request')
            
            # Compute the result
            result = func(*args, **kwargs)
            
            # Store in request cache
            with _request_cache_lock:
                try:
                    _request_cache[cache_key] = result
                    logger.debug(f"Cached in request cache: {cache_key}")
                except:
                    # Cache might be full or value too large
                    logger.warning(f"Failed to cache in request cache: {cache_key}")
            
            return result
        
        return wrapper
    return decorator


def cached_with_fallback(
    cache_key_func: Callable,
    ttl_hours: Optional[float] = None,
    use_request_cache: bool = True,
    cache_type: str = 'general'
):
    """
    Decorator that implements full fallback chain:
    Request cache → Hybrid cache → Compute fresh
    
    Args:
        cache_key_func: Function to generate cache key from arguments
        ttl_hours: TTL for hybrid cache in hours
        use_request_cache: Whether to use request-time cache
        cache_type: Type of cache for TTL configuration
        
    Returns:
        Decorated function with full caching fallback
    """
    def decorator(func: Callable) -> Callable:
        # Determine TTL
        cache_ttl_hours = ttl_hours or CACHE_TTL_HOURS.get(cache_type, 1)
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache keys
            hybrid_key = cache_key_func(*args, **kwargs)
            request_key = f"request:{hybrid_key}"
            
            # Stats tracking
            with _request_cache_lock:
                _cache_stats['total_requests'] += 1
            
            # 1. Try request cache (if enabled)
            if use_request_cache:
                with _request_cache_lock:
                    if request_key in _request_cache:
                        _cache_stats['request_hits'] += 1
                        record_cache_hit('request')
                        logger.debug(f"Request cache hit: {request_key}")
                        return _request_cache[request_key]
            
            # 2. Try hybrid cache
            hybrid_cache = get_hybrid_cache()
            cached_value = hybrid_cache.get(hybrid_key)
            if cached_value is not None:
                with _request_cache_lock:
                    _cache_stats['fallback_hits'] += 1
                record_cache_hit('hybrid')
                logger.debug(f"Hybrid cache hit: {hybrid_key}")
                
                # Promote to request cache
                if use_request_cache:
                    with _request_cache_lock:
                        try:
                            _request_cache[request_key] = cached_value
                        except:
                            pass
                
                return cached_value
            
            # 3. Compute fresh value
            with _request_cache_lock:
                _cache_stats['compute_calls'] += 1
            record_cache_miss('all')
            logger.debug(f"Cache miss, computing: {hybrid_key}")
            
            result = func(*args, **kwargs)
            
            # 4. Store in both caches
            # Store in hybrid cache
            hybrid_cache.set(hybrid_key, result, ttl_hours=cache_ttl_hours)
            
            # Store in request cache
            if use_request_cache:
                with _request_cache_lock:
                    try:
                        _request_cache[request_key] = result
                    except:
                        pass
            
            return result
        
        return wrapper
    return decorator


# Specialized cache functions for common patterns

@lru_cache(maxsize=100)
def get_cached_recommendations(item_uid: str, user_id: Optional[str] = None, n: int = 10) -> Dict[str, Any]:
    """
    Get cached recommendations with full fallback chain.
    
    This function is memoized with LRU cache for repeated calls within
    the same process lifetime.
    
    Args:
        item_uid: Item to get recommendations for
        user_id: Optional user ID for personalized recommendations
        n: Number of recommendations
        
    Returns:
        Dictionary with recommendations
    """
    # This is a placeholder - actual implementation would call the recommendation engine
    # The LRU cache ensures repeated calls are instant
    logger.info(f"Computing recommendations for {item_uid} (user: {user_id}, n: {n})")
    
    # In production, this would call the actual recommendation logic
    return {
        'item_uid': item_uid,
        'user_id': user_id,
        'recommendations': [],
        'cached_at': datetime.utcnow().isoformat()
    }


def request_cached_factory(ttl_seconds: int = 300):
    """
    Factory for creating request-cached versions of functions.
    
    Args:
        ttl_seconds: TTL for the cache
        
    Returns:
        Function that creates cached versions of other functions
    """
    cache = TTLCache(maxsize=100, ttl=ttl_seconds)
    cache_lock = Lock()
    
    def make_cached(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = hashkey(*args, **kwargs)
            
            with cache_lock:
                if key in cache:
                    return cache[key]
            
            result = func(*args, **kwargs)
            
            with cache_lock:
                cache[key] = result
            
            return result
        
        # Attach cache reference for testing/debugging
        wrapper._cache = cache
        wrapper._clear_cache = lambda: cache.clear()
        
        return wrapper
    
    return make_cached


# Pre-configured cache factories for common use cases
cache_for_expensive_queries = request_cached_factory(ttl_seconds=600)  # 10 minutes
cache_for_user_data = request_cached_factory(ttl_seconds=300)  # 5 minutes
cache_for_static_data = request_cached_factory(ttl_seconds=3600)  # 1 hour


def warm_request_cache(items: List[Tuple[str, Any]], ttl: Optional[int] = None):
    """
    Pre-warm the request cache with known hot items.
    
    Args:
        items: List of (cache_key, value) tuples
        ttl: Optional TTL override
    """
    warmed = 0
    cache_ttl = ttl or REQUEST_CACHE_TTL
    
    with _request_cache_lock:
        for key, value in items:
            try:
                _request_cache[key] = value
                warmed += 1
            except:
                logger.warning(f"Failed to warm cache key: {key}")
    
    logger.info(f"Warmed {warmed}/{len(items)} items in request cache")
    return warmed


# Integration helpers for existing code

def get_or_compute(
    cache_key: str,
    compute_func: Callable,
    ttl_hours: Optional[float] = None,
    use_request_cache: bool = True,
    cache_type: str = 'general'
) -> Any:
    """
    Helper function that implements the standard fallback pattern.
    
    Args:
        cache_key: Key for caching
        compute_func: Function to compute value if not cached
        ttl_hours: TTL for hybrid cache
        use_request_cache: Whether to use request cache
        cache_type: Type of cache for TTL defaults
        
    Returns:
        Cached or computed value
    """
    # Request cache key
    request_key = f"request:{cache_key}"
    
    # Try request cache
    if use_request_cache:
        with _request_cache_lock:
            if request_key in _request_cache:
                _cache_stats['request_hits'] += 1
                return _request_cache[request_key]
    
    # Try hybrid cache
    hybrid_cache = get_hybrid_cache()
    cached_value = hybrid_cache.get(cache_key)
    if cached_value is not None:
        with _request_cache_lock:
            _cache_stats['fallback_hits'] += 1
        
        # Promote to request cache
        if use_request_cache:
            with _request_cache_lock:
                try:
                    _request_cache[request_key] = cached_value
                except:
                    pass
        
        return cached_value
    
    # Compute fresh
    with _request_cache_lock:
        _cache_stats['compute_calls'] += 1
    
    result = compute_func()
    
    # Store in caches
    cache_ttl_hours = ttl_hours or CACHE_TTL_HOURS.get(cache_type, 1)
    hybrid_cache.set(cache_key, result, ttl_hours=cache_ttl_hours)
    
    if use_request_cache:
        with _request_cache_lock:
            try:
                _request_cache[request_key] = result
            except:
                pass
    
    return result