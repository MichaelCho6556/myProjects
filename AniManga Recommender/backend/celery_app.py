"""
Celery Configuration for AniManga Recommender Background Tasks

This module configures Celery for handling background job processing including:
- Personalized recommendation pre-computation
- Cache warming for active users
- Scheduled task management
- Performance monitoring and metrics

Configuration includes Redis broker setup, task routing, error handling,
and monitoring capabilities for scalable background processing.
"""

import os
from celery import Celery
from datetime import timedelta

def make_celery():
    """
    Create and configure Celery application for background task processing.
    
    Configures Celery with Redis broker, task routing, scheduling, and
    performance optimizations for recommendation system background jobs.
    
    Returns:
        Celery: Configured Celery application instance
        
    Configuration Features:
        - Redis broker with connection pooling
        - Separate queues for different task priorities  
        - Automatic task retry with exponential backoff
        - Result backend for task status tracking
        - Performance monitoring and logging
        - Scheduled task support (Celery Beat)
    """
    
    # Redis connection configuration
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_db = int(os.getenv('REDIS_DB', 0))
    
    broker_url = f"redis://{redis_host}:{redis_port}/{redis_db}"
    result_backend = f"redis://{redis_host}:{redis_port}/{redis_db + 1}"  # Use different DB for results
    
    celery = Celery(
        'recommendation_worker',
        broker=broker_url,
        backend=result_backend,
        include=[
            'tasks.recommendation_tasks', 
            'tasks.scheduling_tasks',
            'tasks.content_moderation_tasks',
            'tasks.statistics_tasks',
            'tasks.ml_pipeline_tasks'
        ]
    )
    
    # Celery configuration
    celery.conf.update(
        # Task routing configuration
        task_routes={
            # Recommendation tasks
            'tasks.recommendation_tasks.precompute_user_recommendations': {'queue': 'recommendations'},
            'tasks.recommendation_tasks.batch_precompute_recommendations': {'queue': 'recommendations'},
            'tasks.recommendation_tasks.warm_user_cache': {'queue': 'cache_warming'},
            'tasks.recommendation_tasks.calculate_popular_lists': {'queue': 'recommendations'},
            # Scheduling tasks
            'tasks.scheduling_tasks.schedule_recommendation_updates': {'queue': 'scheduling'},
            'tasks.scheduling_tasks.cleanup_stale_caches': {'queue': 'maintenance'},
            'tasks.scheduling_tasks.monitor_task_performance': {'queue': 'monitoring'},
            # Content moderation tasks
            'tasks.content_moderation_tasks.analyze_content_toxicity_task': {'queue': 'moderation'},
            'tasks.content_moderation_tasks.batch_content_moderation': {'queue': 'moderation'},
            # Statistics tasks
            'tasks.statistics_tasks.calculate_user_statistics_task': {'queue': 'analytics'},
            'tasks.statistics_tasks.update_all_user_statistics': {'queue': 'analytics'},
            'tasks.statistics_tasks.calculate_platform_statistics': {'queue': 'analytics'},
            # ML pipeline tasks
            'tasks.ml_pipeline_tasks.preprocess_recommendation_data': {'queue': 'ml_pipeline'},
            'tasks.ml_pipeline_tasks.warm_recommendation_cache_all_users': {'queue': 'cache_warming'},
        },
        
        # Task execution configuration
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        
        # Worker configuration
        worker_concurrency=int(os.getenv('CELERY_WORKER_CONCURRENCY', 4)),
        worker_prefetch_multiplier=int(os.getenv('CELERY_WORKER_PREFETCH', 1)),
        task_acks_late=True,
        worker_disable_rate_limits=False,
        
        # Task retry configuration
        task_default_retry_delay=60,  # 1 minute base delay
        task_max_retries=3,
        task_retry_jitter=True,  # Add randomness to retry delays
        
        # Result backend configuration
        result_expires=3600,  # Results expire after 1 hour
        result_persistent=False,
        result_compression='gzip',
        
        # Performance optimizations
        task_ignore_result=False,  # Track task results for monitoring
        task_store_eager_result=True,
        task_track_started=True,
        
        # Connection settings
        broker_connection_retry_on_startup=True,
        broker_connection_retry=True,
        broker_connection_max_retries=10,
        
        # Monitoring and logging
        worker_send_task_events=True,
        task_send_sent_event=True,
        
        # Beat scheduling (for periodic tasks)
        beat_schedule={
            # Original scheduling tasks
            'schedule-recommendation-updates': {
                'task': 'tasks.scheduling_tasks.schedule_recommendation_updates',
                'schedule': timedelta(hours=2),  # Every 2 hours
                'options': {'queue': 'scheduling'}
            },
            'cleanup-stale-caches': {
                'task': 'tasks.scheduling_tasks.cleanup_stale_caches', 
                'schedule': timedelta(hours=6),  # Every 6 hours
                'options': {'queue': 'maintenance'}
            },
            'monitor-task-performance': {
                'task': 'tasks.scheduling_tasks.monitor_task_performance',
                'schedule': timedelta(minutes=15),  # Every 15 minutes
                'options': {'queue': 'monitoring'}
            },
            # Statistics updates
            'daily-statistics-update': {
                'task': 'tasks.statistics_tasks.update_all_user_statistics',
                'schedule': timedelta(hours=24),  # Daily at midnight
                'options': {'queue': 'analytics'}
            },
            'platform-statistics': {
                'task': 'tasks.statistics_tasks.calculate_platform_statistics',
                'schedule': timedelta(hours=1),  # Every hour
                'options': {'queue': 'analytics'}
            },
            # ML pipeline updates
            'preprocess-recommendation-data': {
                'task': 'tasks.ml_pipeline_tasks.preprocess_recommendation_data',
                'schedule': timedelta(hours=24),  # Daily
                'options': {'queue': 'ml_pipeline'}
            },
            'warm-all-user-caches': {
                'task': 'tasks.ml_pipeline_tasks.warm_recommendation_cache_all_users',
                'schedule': timedelta(hours=4),  # Every 4 hours
                'options': {'queue': 'cache_warming'}
            },
            # Popular content calculation
            'calculate-popular-lists': {
                'task': 'tasks.recommendation_tasks.calculate_popular_lists',
                'schedule': timedelta(hours=12),  # Twice daily
                'options': {'queue': 'recommendations'}
            }
        },
        beat_scheduler='celery.beat:PersistentScheduler',
    )
    
    # Configure task annotations for monitoring
    celery.conf.task_annotations = {
        '*': {
            'rate_limit': '100/m',  # Default rate limit
            'time_limit': 300,      # 5 minutes max execution time
            'soft_time_limit': 240, # 4 minutes soft limit
        },
        'tasks.recommendation_tasks.batch_precompute_recommendations': {
            'rate_limit': '10/m',   # Lower rate for batch operations
            'time_limit': 600,      # 10 minutes for batch processing
            'soft_time_limit': 540, # 9 minutes soft limit
        }
    }
    
    return celery

# Create Celery application instance
celery_app = make_celery()

# Test Redis connection on startup
def test_redis_connection():
    """
    Test Redis connection and log status.
    
    Returns:
        bool: True if Redis is available, False otherwise
    """
    try:
        import redis
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        
        r = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        r.ping()
        print(f"✅ Celery Redis connection successful: {redis_host}:{redis_port}")
        return True
    except Exception as e:
        print(f"❌ Celery Redis connection failed: {e}")
        return False

# Test connection on import
if __name__ != '__main__':
    test_redis_connection() 