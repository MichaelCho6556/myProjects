"""
Background Tasks Package for AniManga Recommender

This package contains Celery background tasks for:
- Personalized recommendation pre-computation
- Cache warming and invalidation
- Scheduled maintenance and monitoring
- Performance optimization tasks

Modules:
- recommendation_tasks: Core recommendation processing tasks
- scheduling_tasks: Periodic and scheduled task management
"""

# Import main task functions for easy access
try:
    from .recommendation_tasks import (
        precompute_user_recommendations,
        batch_precompute_recommendations,
        warm_user_cache
    )
    from .scheduling_tasks import (
        schedule_recommendation_updates,
        cleanup_stale_caches,
        monitor_task_performance
    )
    
    __all__ = [
        'precompute_user_recommendations',
        'batch_precompute_recommendations', 
        'warm_user_cache',
        'schedule_recommendation_updates',
        'cleanup_stale_caches',
        'monitor_task_performance'
    ]
    
except ImportError:
    # Handle case where task modules don't exist yet during development
    __all__ = [] 