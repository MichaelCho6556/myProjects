# ABOUTME: This file contains Redis cache helper functions for the AniManga Recommender
# ABOUTME: Provides cache operations with TTL, fallback handling, and error resilience
"""
Cache Helper Functions for AniManga Recommender

This module provides Redis cache operations with proper error handling,
TTL management, and fallback mechanisms for the recommendation system.

Key Features:
    - User statistics caching with 24-hour TTL
    - Recommendation caching with configurable TTL
    - Automatic JSON serialization/deserialization
    - Graceful fallback on Redis connection failures
    - Cache warming utilities
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
import redis
from redis.exceptions import RedisError, ConnectionError

# Import monitoring
try:
    from utils.monitoring import record_cache_hit, record_cache_miss, get_metrics_collector
    MONITORING_AVAILABLE = True
except ImportError:
    MONITORING_AVAILABLE = False
    # Fallback no-op functions
    def record_cache_hit(cache_type: str = "default"): pass
    def record_cache_miss(cache_type: str = "default"): pass
    def get_metrics_collector(): return None

# Configure logging
logger = logging.getLogger(__name__)

# Cache configuration
CACHE_TTL_HOURS = {
    'user_stats': 24,
    'recommendations': 4,
    'popular_lists': 12,
    'platform_stats': 1,
    'toxicity_analysis': 24,  # Cache toxicity analysis for 24 hours
    'moderation_stats': 2,    # Cache moderation stats for 2 hours
    'content_moderation': 12, # Cache moderation status for 12 hours
    'custom_lists': 1,        # Cache user's custom lists for 1 hour
    'list_details': 2,        # Cache individual list details for 2 hours
}

class RedisCache:
    """Redis cache wrapper with automatic fallback and error handling"""
    
    def __init__(self):
        """Initialize Redis connection with environment configuration"""
        self.redis_client = None
        self.connected = False
        self._connect()
    
    def _connect(self):
        """Establish Redis connection with retry logic"""
        try:
            redis_host = os.getenv('REDIS_HOST', 'localhost')
            redis_port = int(os.getenv('REDIS_PORT', 6379))
            redis_db = int(os.getenv('REDIS_DB', 0))
            
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30
            )
            
            # Test connection
            self.redis_client.ping()
            self.connected = True
            logger.info(f"Redis cache connected: {redis_host}:{redis_port}")
            
        except (RedisError, ConnectionError) as e:
            logger.warning(f"Redis connection failed: {e}")
            self.connected = False
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache with automatic JSON deserialization"""
        if not self.connected:
            if MONITORING_AVAILABLE:
                record_cache_miss("redis")
            return None
            
        try:
            value = self.redis_client.get(key)
            if value:
                if MONITORING_AVAILABLE:
                    record_cache_hit("redis")
                return json.loads(value)
            else:
                if MONITORING_AVAILABLE:
                    record_cache_miss("redis")
            return None
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Cache get error for key {key}: {e}")
            if MONITORING_AVAILABLE:
                record_cache_miss("redis")
            return None
    
    def set(self, key: str, value: Any, ttl_hours: Optional[int] = None) -> bool:
        """Set value in cache with automatic JSON serialization"""
        if not self.connected:
            return False
            
        try:
            serialized = json.dumps(value, default=str)
            if ttl_hours:
                self.redis_client.setex(key, timedelta(hours=ttl_hours), serialized)
            else:
                self.redis_client.set(key, serialized)
            return True
        except (RedisError, json.JSONEncodeError) as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.connected:
            return False
            
        try:
            self.redis_client.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.connected:
            return False
            
        try:
            return bool(self.redis_client.exists(key))
        except RedisError as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False

# Global cache instance
_cache = None

def get_cache() -> RedisCache:
    """Get global cache instance (singleton pattern)"""
    global _cache
    if _cache is None:
        _cache = RedisCache()
    return _cache

def get_user_stats_from_cache(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get user statistics from cache
    
    Args:
        user_id: User ID to fetch stats for
        
    Returns:
        Dict with user statistics or None if not cached
    """
    cache = get_cache()
    key = f"user_stats:{user_id}"
    
    data = cache.get(key)
    if data:
        logger.debug(f"Cache hit for user stats: {user_id}")
        return data
    
    logger.debug(f"Cache miss for user stats: {user_id}")
    return None

def set_user_stats_in_cache(user_id: str, stats: Dict[str, Any]) -> bool:
    """
    Store user statistics in cache
    
    Args:
        user_id: User ID
        stats: Statistics dictionary
        
    Returns:
        True if successfully cached
    """
    cache = get_cache()
    key = f"user_stats:{user_id}"
    
    # Add timestamp
    stats['cached_at'] = datetime.utcnow().isoformat()
    stats['last_updated'] = datetime.utcnow().isoformat()
    
    return cache.set(key, stats, ttl_hours=CACHE_TTL_HOURS['user_stats'])

def get_recommendations_from_cache(item_uid: str, user_id: Optional[str] = None) -> Optional[List[Dict]]:
    """
    Get recommendations from cache
    
    Args:
        item_uid: Item UID to get recommendations for
        user_id: Optional user ID for personalized recommendations
        
    Returns:
        List of recommendation dicts or None if not cached
    """
    cache = get_cache()
    
    # Use user-specific key if user_id provided
    if user_id:
        key = f"recommendations:{user_id}:{item_uid}"
    else:
        key = f"recommendations:{item_uid}"
    
    data = cache.get(key)
    if data:
        logger.debug(f"Cache hit for recommendations: {item_uid}")
        return data
    
    logger.debug(f"Cache miss for recommendations: {item_uid}")
    return None

def set_recommendations_in_cache(
    item_uid: str, 
    recommendations: List[Dict], 
    user_id: Optional[str] = None
) -> bool:
    """
    Store recommendations in cache
    
    Args:
        item_uid: Item UID
        recommendations: List of recommendation dictionaries
        user_id: Optional user ID for personalized recommendations
        
    Returns:
        True if successfully cached
    """
    cache = get_cache()
    
    if user_id:
        key = f"recommendations:{user_id}:{item_uid}"
    else:
        key = f"recommendations:{item_uid}"
    
    # Add metadata
    cache_data = {
        'recommendations': recommendations,
        'cached_at': datetime.utcnow().isoformat(),
        'item_uid': item_uid,
        'user_id': user_id
    }
    
    return cache.set(key, cache_data, ttl_hours=CACHE_TTL_HOURS['recommendations'])

def get_popular_lists_from_cache() -> Optional[List[Dict]]:
    """Get popular/trending lists from cache"""
    cache = get_cache()
    key = "popular_lists:global"
    
    data = cache.get(key)
    if data:
        logger.debug("Cache hit for popular lists")
        return data
    
    logger.debug("Cache miss for popular lists")
    return None

def set_popular_lists_in_cache(lists: List[Dict]) -> bool:
    """Store popular lists in cache"""
    cache = get_cache()
    key = "popular_lists:global"
    
    cache_data = {
        'lists': lists,
        'cached_at': datetime.utcnow().isoformat()
    }
    
    return cache.set(key, cache_data, ttl_hours=CACHE_TTL_HOURS['popular_lists'])

def get_platform_stats_from_cache() -> Optional[Dict[str, Any]]:
    """Get platform-wide statistics from cache"""
    cache = get_cache()
    key = "platform_stats:global"
    
    return cache.get(key)

def set_platform_stats_in_cache(stats: Dict[str, Any]) -> bool:
    """Store platform statistics in cache"""
    cache = get_cache()
    key = "platform_stats:global"
    
    stats['cached_at'] = datetime.utcnow().isoformat()
    
    return cache.set(key, stats, ttl_hours=CACHE_TTL_HOURS['platform_stats'])

def invalidate_user_cache(user_id: str) -> bool:
    """
    Invalidate all cache entries for a specific user
    
    Args:
        user_id: User ID to invalidate cache for
        
    Returns:
        True if successful
    """
    cache = get_cache()
    
    # Delete user stats
    cache.delete(f"user_stats:{user_id}")
    
    # Note: In production, you might want to delete personalized recommendations too
    # This would require maintaining a list of recommendation keys per user
    
    logger.info(f"Invalidated cache for user: {user_id}")
    return True

def warm_cache_for_user(user_id: str, stats: Dict[str, Any]) -> bool:
    """
    Pre-warm cache for a user (called by background tasks)
    
    Args:
        user_id: User ID
        stats: Pre-calculated statistics
        
    Returns:
        True if successful
    """
    return set_user_stats_in_cache(user_id, stats)

def get_cache_status() -> Dict[str, Any]:
    """
    Get cache connection status and statistics
    
    Returns:
        Dictionary with cache status information
    """
    cache = get_cache()
    
    status = {
        'connected': cache.connected,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if cache.connected:
        try:
            info = cache.redis_client.info()
            status.update({
                'used_memory_human': info.get('used_memory_human', 'N/A'),
                'connected_clients': info.get('connected_clients', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
            })
            
            # Calculate hit rate
            hits = status['keyspace_hits']
            misses = status['keyspace_misses']
            if hits + misses > 0:
                status['hit_rate'] = round(hits / (hits + misses) * 100, 2)
            else:
                status['hit_rate'] = 0
                
        except RedisError as e:
            logger.error(f"Error getting cache status: {e}")
    
    return status

# For backward compatibility and testing
def handle_cache_miss(cache_key: str, fetch_function, *args, **kwargs):
    """
    Generic cache miss handler with automatic caching
    
    Args:
        cache_key: Key to cache under
        fetch_function: Function to call on cache miss
        *args, **kwargs: Arguments for fetch_function
        
    Returns:
        Data from cache or fetch_function
    """
    cache = get_cache()
    
    # Try cache first
    data = cache.get(cache_key)
    if data:
        return data
    
    # Fetch fresh data
    fresh_data = fetch_function(*args, **kwargs)
    
    # Cache for appropriate TTL based on key pattern
    ttl = 24  # Default 24 hours
    if 'recommendations' in cache_key:
        ttl = CACHE_TTL_HOURS['recommendations']
    elif 'platform_stats' in cache_key:
        ttl = CACHE_TTL_HOURS['platform_stats']
    
    cache.set(cache_key, fresh_data, ttl_hours=ttl)
    
    return fresh_data

# ==========================================
# MODERATION CACHE FUNCTIONS
# ==========================================

def get_toxicity_analysis_from_cache(content_id: str, content_type: str = 'comment') -> Optional[Dict[str, Any]]:
    """
    Get toxicity analysis results from cache
    
    Args:
        content_id: ID of the comment/review
        content_type: Type of content ('comment' or 'review')
        
    Returns:
        Dict with toxicity analysis results or None if not cached
    """
    cache = get_cache()
    key = f"toxicity_analysis:{content_type}:{content_id}"
    
    data = cache.get(key)
    if data:
        logger.debug(f"Cache hit for toxicity analysis: {content_type}:{content_id}")
        return data
    
    logger.debug(f"Cache miss for toxicity analysis: {content_type}:{content_id}")
    return None

def set_toxicity_analysis_in_cache(
    content_id: str, 
    analysis_result: Dict[str, Any], 
    content_type: str = 'comment'
) -> bool:
    """
    Store toxicity analysis results in cache
    
    Args:
        content_id: ID of the comment/review
        analysis_result: Analysis results dictionary
        content_type: Type of content ('comment' or 'review')
        
    Returns:
        True if successfully cached
    """
    cache = get_cache()
    key = f"toxicity_analysis:{content_type}:{content_id}"
    
    # Add metadata
    cache_data = {
        'content_id': content_id,
        'content_type': content_type,
        'toxicity_score': analysis_result.get('toxicity_score', 0),
        'is_toxic': analysis_result.get('is_toxic', False),
        'confidence': analysis_result.get('confidence', 0.95),
        'categories': analysis_result.get('categories', {}),
        'analyzed_at': analysis_result.get('analyzed_at', datetime.utcnow().isoformat()),
        'cached_at': datetime.utcnow().isoformat(),
        'analysis_status': 'completed',
        'auto_flagged': analysis_result.get('auto_flagged', False)
    }
    
    success = cache.set(key, cache_data, ttl_hours=CACHE_TTL_HOURS['toxicity_analysis'])
    if success:
        logger.debug(f"Cached toxicity analysis for {content_type}:{content_id}")
    return success

def get_moderation_stats_from_cache(user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Get moderation statistics from cache
    
    Args:
        user_id: Optional user ID for user-specific stats, None for global stats
        
    Returns:
        Dict with moderation statistics or None if not cached
    """
    cache = get_cache()
    
    if user_id:
        key = f"moderation_stats:user:{user_id}"
    else:
        key = "moderation_stats:global"
    
    data = cache.get(key)
    if data:
        logger.debug(f"Cache hit for moderation stats: {key}")
        return data
    
    logger.debug(f"Cache miss for moderation stats: {key}")
    return None

def set_moderation_stats_in_cache(
    stats: Dict[str, Any], 
    user_id: Optional[str] = None
) -> bool:
    """
    Store moderation statistics in cache
    
    Args:
        stats: Statistics dictionary
        user_id: Optional user ID for user-specific stats
        
    Returns:
        True if successfully cached
    """
    cache = get_cache()
    
    if user_id:
        key = f"moderation_stats:user:{user_id}"
    else:
        key = "moderation_stats:global"
    
    # Add metadata
    cache_data = {
        **stats,
        'cached_at': datetime.utcnow().isoformat(),
        'user_id': user_id,
        'cache_hit': True
    }
    
    success = cache.set(key, cache_data, ttl_hours=CACHE_TTL_HOURS['moderation_stats'])
    if success:
        logger.debug(f"Cached moderation stats: {key}")
    return success

def get_content_moderation_status_from_cache(content_id: str, content_type: str) -> Optional[Dict[str, Any]]:
    """
    Get content moderation status from cache
    
    Args:
        content_id: ID of the content
        content_type: Type of content ('comment' or 'review')
        
    Returns:
        Dict with moderation status or None if not cached
    """
    cache = get_cache()
    key = f"moderation_status:{content_type}:{content_id}"
    
    data = cache.get(key)
    if data:
        logger.debug(f"Cache hit for moderation status: {content_type}:{content_id}")
        return data
    
    logger.debug(f"Cache miss for moderation status: {content_type}:{content_id}")
    return None

def set_content_moderation_status_in_cache(
    content_id: str, 
    moderation_data: Dict[str, Any], 
    content_type: str
) -> bool:
    """
    Store content moderation status in cache
    
    Args:
        content_id: ID of the content
        moderation_data: Moderation data dictionary
        content_type: Type of content ('comment' or 'review')
        
    Returns:
        True if successfully cached
    """
    cache = get_cache()
    key = f"moderation_status:{content_type}:{content_id}"
    
    # Add metadata
    cache_data = {
        'content_id': content_id,
        'content_type': content_type,
        'moderation_status': moderation_data.get('moderation_status', 'clean'),
        'is_flagged': moderation_data.get('is_flagged', False),
        'flag_reason': moderation_data.get('flag_reason'),
        'toxicity_score': moderation_data.get('toxicity_score', 0),
        'analysis_status': moderation_data.get('analysis_status', 'pending'),
        'cached_at': datetime.utcnow().isoformat(),
        'last_updated': moderation_data.get('last_updated', datetime.utcnow().isoformat())
    }
    
    success = cache.set(key, cache_data, ttl_hours=CACHE_TTL_HOURS['content_moderation'])
    if success:
        logger.debug(f"Cached moderation status for {content_type}:{content_id}")
    return success

def invalidate_moderation_cache(content_id: str, content_type: str) -> bool:
    """
    Invalidate all moderation-related cache entries for specific content
    
    Args:
        content_id: ID of the content
        content_type: Type of content ('comment' or 'review')
        
    Returns:
        True if successful
    """
    cache = get_cache()
    
    # Delete toxicity analysis cache
    cache.delete(f"toxicity_analysis:{content_type}:{content_id}")
    
    # Delete moderation status cache
    cache.delete(f"moderation_status:{content_type}:{content_id}")
    
    logger.info(f"Invalidated moderation cache for {content_type}:{content_id}")
    return True

def warm_moderation_cache_for_content(
    content_id: str, 
    content_type: str, 
    analysis_data: Dict[str, Any],
    moderation_data: Dict[str, Any]
) -> bool:
    """
    Pre-warm moderation cache for content (called by background tasks)
    
    Args:
        content_id: Content ID
        content_type: Type of content ('comment' or 'review')
        analysis_data: Pre-calculated analysis data
        moderation_data: Pre-calculated moderation data
        
    Returns:
        True if successful
    """
    success1 = set_toxicity_analysis_in_cache(content_id, analysis_data, content_type)
    success2 = set_content_moderation_status_in_cache(content_id, moderation_data, content_type)
    
    return success1 and success2

def batch_set_toxicity_analysis(analyses: List[Dict[str, Any]]) -> int:
    """
    Batch set multiple toxicity analyses in cache
    
    Args:
        analyses: List of analysis dictionaries with content_id, content_type, and analysis data
        
    Returns:
        Number of successful cache operations
    """
    cache = get_cache()
    success_count = 0
    
    for analysis in analyses:
        try:
            content_id = analysis['content_id']
            content_type = analysis.get('content_type', 'comment')
            
            if set_toxicity_analysis_in_cache(content_id, analysis, content_type):
                success_count += 1
        except KeyError as e:
            logger.error(f"Missing required field in analysis data: {e}")
        except Exception as e:
            logger.error(f"Error caching analysis for {analysis.get('content_id', 'unknown')}: {e}")
    
    logger.info(f"Batch cached {success_count}/{len(analyses)} toxicity analyses")
    return success_count

def get_moderation_cache_summary() -> Dict[str, Any]:
    """
    Get summary of moderation cache usage and performance
    
    Returns:
        Dictionary with cache summary information
    """
    cache = get_cache()
    
    summary = {
        'cache_connected': cache.connected,
        'timestamp': datetime.utcnow().isoformat(),
        'cache_types': {
            'toxicity_analysis': {'ttl_hours': CACHE_TTL_HOURS['toxicity_analysis']},
            'moderation_stats': {'ttl_hours': CACHE_TTL_HOURS['moderation_stats']},
            'content_moderation': {'ttl_hours': CACHE_TTL_HOURS['content_moderation']}
        }
    }
    
    if cache.connected:
        try:
            # Get basic Redis info
            info = cache.redis_client.info()
            summary.update({
                'memory_usage': info.get('used_memory_human', 'N/A'),
                'total_keys': info.get('db0', {}).get('keys', 0) if 'db0' in info else 0,
                'hit_rate': 0
            })
            
            # Calculate hit rate if available
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            if hits + misses > 0:
                summary['hit_rate'] = round(hits / (hits + misses) * 100, 2)
                
        except RedisError as e:
            logger.error(f"Error getting moderation cache summary: {e}")
            summary['error'] = str(e)
    
    return summary

# ==========================================
# CUSTOM LISTS CACHE FUNCTIONS
# ==========================================

def get_user_lists_from_cache(user_id: str, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
    """
    Get user's custom lists from cache
    
    Args:
        user_id: User ID to fetch lists for
        page: Page number for pagination
        limit: Items per page
        
    Returns:
        Dict with lists data or None if not cached
    """
    cache = get_cache()
    key = f"user_lists:{user_id}:page_{page}_limit_{limit}"
    
    data = cache.get(key)
    if data:
        logger.debug(f"Cache hit for user lists: {user_id} (page {page})")
        return data
    
    logger.debug(f"Cache miss for user lists: {user_id} (page {page})")
    return None

def set_user_lists_in_cache(user_id: str, lists_data: Dict[str, Any], page: int = 1, limit: int = 20) -> bool:
    """
    Store user's custom lists in cache
    
    Args:
        user_id: User ID
        lists_data: Lists data dictionary containing lists array and pagination info
        page: Page number
        limit: Items per page
        
    Returns:
        True if successfully cached
    """
    cache = get_cache()
    key = f"user_lists:{user_id}:page_{page}_limit_{limit}"
    
    # Add timestamp
    lists_data['cached_at'] = datetime.utcnow().isoformat()
    lists_data['cache_key'] = key
    
    # Cache for 1 hour (lists change less frequently than user stats)
    return cache.set(key, lists_data, ttl_hours=1)

def invalidate_user_lists_cache(user_id: str) -> bool:
    """
    Invalidate all cached pages of user's custom lists
    
    Args:
        user_id: User ID to invalidate lists cache for
        
    Returns:
        True if successful
    """
    cache = get_cache()
    
    # We need to invalidate all possible page combinations
    # In practice, we'll invalidate the most common ones
    for page in range(1, 6):  # First 5 pages
        for limit in [10, 20, 50]:  # Common limit values
            key = f"user_lists:{user_id}:page_{page}_limit_{limit}"
            cache.delete(key)
    
    logger.info(f"Invalidated custom lists cache for user: {user_id}")
    return True

def get_list_details_from_cache(list_id: int) -> Optional[Dict[str, Any]]:
    """
    Get custom list details from cache
    
    Args:
        list_id: List ID to fetch details for
        
    Returns:
        Dict with list details or None if not cached
    """
    cache = get_cache()
    key = f"list_details:{list_id}"
    
    data = cache.get(key)
    if data:
        logger.debug(f"Cache hit for list details: {list_id}")
        return data
    
    logger.debug(f"Cache miss for list details: {list_id}")
    return None

def set_list_details_in_cache(list_id: int, list_data: Dict[str, Any]) -> bool:
    """
    Store custom list details in cache
    
    Args:
        list_id: List ID
        list_data: List details dictionary
        
    Returns:
        True if successfully cached
    """
    cache = get_cache()
    key = f"list_details:{list_id}"
    
    # Add timestamp
    list_data['cached_at'] = datetime.utcnow().isoformat()
    
    # Cache for 2 hours
    return cache.set(key, list_data, ttl_hours=2)

def invalidate_list_cache(list_id: int, user_id: Optional[str] = None) -> bool:
    """
    Invalidate cache for a specific list and optionally the user's lists cache
    
    Args:
        list_id: List ID to invalidate
        user_id: Optional user ID to also invalidate their lists cache
        
    Returns:
        True if successful
    """
    cache = get_cache()
    
    # Delete list details cache
    cache.delete(f"list_details:{list_id}")
    
    # If user_id provided, invalidate their lists cache too
    if user_id:
        invalidate_user_lists_cache(user_id)
    
    logger.info(f"Invalidated cache for list: {list_id}")
    return True

def warm_lists_cache_for_user(user_id: str, lists_data: Dict[str, Any], page: int = 1, limit: int = 20) -> bool:
    """
    Pre-warm lists cache for a user (called by background tasks)
    
    Args:
        user_id: User ID
        lists_data: Pre-calculated lists data
        page: Page number
        limit: Items per page
        
    Returns:
        True if successful
    """
    return set_user_lists_in_cache(user_id, lists_data, page, limit)

# ==========================================
# USER PROFILE CACHE FUNCTIONS
# ==========================================

def get_user_profile_full_from_cache(cache_key: str) -> Optional[Dict[str, Any]]:
    """
    Get complete user profile data from cache
    
    Args:
        cache_key: Cache key for the profile (e.g., "profile_full:username" or "profile_full:username:viewer_id")
        
    Returns:
        Dict with complete profile data or None if not cached
    """
    cache = get_cache()
    data = cache.get(cache_key)
    
    if data:
        logger.debug(f"Cache hit for user profile: {cache_key}")
        return data
    
    logger.debug(f"Cache miss for user profile: {cache_key}")
    return None

def set_user_profile_full_cache(cache_key: str, profile_data: Dict[str, Any]) -> bool:
    """
    Cache complete user profile data
    
    Args:
        cache_key: Cache key for the profile
        profile_data: Complete profile data including stats, lists, activities
        
    Returns:
        True if successfully cached
    """
    cache = get_cache()
    
    # Add timestamp
    profile_data['cached_at'] = datetime.utcnow().isoformat()
    
    # Cache for 1 hour - profiles change less frequently than activities
    return cache.set(cache_key, profile_data, ttl_hours=1)

def invalidate_user_profile_cache(username: str, user_id: Optional[str] = None) -> bool:
    """
    Invalidate all cached variations of a user's profile
    
    Args:
        username: Username to invalidate cache for
        user_id: Optional user ID for more thorough invalidation
        
    Returns:
        True if successful
    """
    cache = get_cache()
    
    # Delete base profile cache
    cache.delete(f"profile_full:{username}")
    
    # If we have user_id, also invalidate viewer-specific caches
    # This is a simplified approach - in production you might track viewers
    if user_id:
        # Invalidate stats cache
        cache.delete(f"user_stats:{user_id}")
        # Invalidate lists cache
        invalidate_user_lists_cache(user_id)
    
    logger.info(f"Invalidated profile cache for user: {username}")
    return True

def get_user_profile_from_cache(username: str, viewer_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Get individual user profile data from cache (not the full data)
    
    Args:
        username: Username to fetch profile for
        viewer_id: Optional viewer ID for personalized data
        
    Returns:
        Dict with profile data or None if not cached
    """
    cache = get_cache()
    key = f"user_profile:{username}"
    if viewer_id:
        key += f":{viewer_id}"
    
    return cache.get(key)

def set_user_profile_cache(username: str, profile_data: Dict[str, Any], viewer_id: Optional[str] = None) -> bool:
    """
    Cache individual user profile data
    
    Args:
        username: Username
        profile_data: Profile data
        viewer_id: Optional viewer ID
        
    Returns:
        True if successfully cached
    """
    cache = get_cache()
    key = f"user_profile:{username}"
    if viewer_id:
        key += f":{viewer_id}"
    
    # Add timestamp
    profile_data['cached_at'] = datetime.utcnow().isoformat()
    
    # Cache for 2 hours
    return cache.set(key, profile_data, ttl_hours=2)