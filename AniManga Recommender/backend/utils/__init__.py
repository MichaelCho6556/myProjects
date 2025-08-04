"""
ABOUTME: Utils package for AniManga Recommender backend
ABOUTME: Contains caching, batch operations, content analysis, and monitoring utilities
"""

# Export commonly used utilities for easier imports
from .cache_helpers import (
    get_user_stats_from_cache,
    set_user_stats_in_cache,
    get_recommendations_from_cache,
    set_recommendations_in_cache,
    get_cache_status,
    invalidate_user_cache,
    get_toxicity_analysis_from_cache,
    set_toxicity_analysis_in_cache,
    get_moderation_stats_from_cache,
    set_moderation_stats_in_cache,
    get_content_moderation_status_from_cache,
    set_content_moderation_status_in_cache,
)

from .hybrid_cache import HybridCache, get_hybrid_cache
from .monitoring import monitor_endpoint, get_metrics_collector
from .contentAnalysis import analyze_content, should_auto_moderate, should_auto_flag
from .batchOperations import BatchOperationsManager

# Request cache utilities (optional)
try:
    from .request_cache import (
        request_cache,
        cached_with_fallback,
        get_or_compute,
        get_cached_recommendations,
        get_request_cache_stats,
        clear_request_cache,
        cache_for_expensive_queries,
        cache_for_user_data,
        cache_for_static_data
    )
    REQUEST_CACHE_AVAILABLE = True
except ImportError:
    REQUEST_CACHE_AVAILABLE = False

__all__ = [
    # Cache functions
    'get_user_stats_from_cache',
    'set_user_stats_in_cache',
    'get_recommendations_from_cache', 
    'set_recommendations_in_cache',
    'get_cache_status',
    'invalidate_user_cache',
    'get_toxicity_analysis_from_cache',
    'set_toxicity_analysis_in_cache',
    'get_moderation_stats_from_cache',
    'set_moderation_stats_in_cache',
    'get_content_moderation_status_from_cache',
    'set_content_moderation_status_in_cache',
    
    # Cache classes
    'HybridCache',
    'get_hybrid_cache',
    
    # Monitoring
    'monitor_endpoint',
    'get_metrics_collector',
    
    # Content analysis
    'analyze_content',
    'should_auto_moderate',
    'should_auto_flag',
    
    # Batch operations
    'BatchOperationsManager',
]

# Add request cache exports if available
if REQUEST_CACHE_AVAILABLE:
    __all__.extend([
        'request_cache',
        'cached_with_fallback',
        'get_or_compute',
        'get_cached_recommendations',
        'get_request_cache_stats',
        'clear_request_cache',
        'cache_for_expensive_queries',
        'cache_for_user_data',
        'cache_for_static_data',
    ])