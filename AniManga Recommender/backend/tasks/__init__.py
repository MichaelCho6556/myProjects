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
    
    # Import content moderation tasks
    try:
        from .content_moderation_tasks import (
            analyze_content_toxicity_task,
            batch_content_moderation,
            cleanup_old_moderation_data
        )
        moderation_tasks_available = True
    except ImportError:
        moderation_tasks_available = False
    
    # Import statistics tasks
    try:
        from .statistics_tasks import (
            calculate_user_statistics_task,
            update_all_user_statistics,
            calculate_platform_statistics
        )
        statistics_tasks_available = True
    except ImportError:
        statistics_tasks_available = False
    
    # Import ML pipeline tasks
    try:
        from .ml_pipeline_tasks import (
            preprocess_recommendation_data,
            warm_recommendation_cache_all_users,
            cleanup_old_ml_caches
        )
        ml_tasks_available = True
    except ImportError:
        ml_tasks_available = False
    
    # Import test tasks when in test environment
    try:
        from .test_tasks import (
            ping,
            test_task,
            flaky_task,
            generate_recommendations_task
        )
        test_tasks_available = True
    except ImportError:
        test_tasks_available = False
    
    __all__ = [
        'precompute_user_recommendations',
        'batch_precompute_recommendations', 
        'warm_user_cache',
        'schedule_recommendation_updates',
        'cleanup_stale_caches',
        'monitor_task_performance'
    ]
    
    if moderation_tasks_available:
        __all__.extend([
            'analyze_content_toxicity_task',
            'batch_content_moderation',
            'cleanup_old_moderation_data'
        ])
    
    if statistics_tasks_available:
        __all__.extend([
            'calculate_user_statistics_task',
            'update_all_user_statistics',
            'calculate_platform_statistics'
        ])
    
    if ml_tasks_available:
        __all__.extend([
            'preprocess_recommendation_data',
            'warm_recommendation_cache_all_users',
            'cleanup_old_ml_caches'
        ])
    
    if test_tasks_available:
        __all__.extend([
            'ping',
            'test_task',
            'flaky_task',
            'generate_recommendations_task'
        ])
    
except ImportError:
    # Handle case where task modules don't exist yet during development
    __all__ = [] 