# ABOUTME: This file contains test-specific Celery tasks used for integration testing
# ABOUTME: These tasks simulate various scenarios like failures, retries, and performance testing

from celery import shared_task
from celery.exceptions import Retry
import time
import random
from utils.contentAnalysis import ContentAnalyzer


@shared_task
def ping():
    """Simple ping task to test Celery worker availability"""
    return 'pong'


@shared_task(bind=True, max_retries=3)
def test_task(self, message="test"):
    """Simple echo task for performance testing"""
    return {"message": message, "task_id": self.request.id}


@shared_task(bind=True, max_retries=3)
def flaky_task(self, attempt_count=None):
    """Task that fails first 2 attempts, succeeds on 3rd for retry testing"""
    if attempt_count is None:
        attempt_count = getattr(self.request, 'retries', 0) + 1
    
    if attempt_count < 3:
        raise self.retry(
            exc=Exception(f"Simulated failure on attempt {attempt_count}"),
            countdown=1
        )
    
    return {"success": True, "attempts": attempt_count}


@shared_task
def analyze_content_toxicity_task(comment_id, content):
    """Mock content toxicity analysis task"""
    # Simulate content analysis
    analyzer = ContentAnalyzer()
    
    # Mock analysis results
    toxicity_score = random.uniform(0, 1)
    is_toxic = toxicity_score > 0.7
    
    return {
        "comment_id": comment_id,
        "content": content[:100],  # Truncate for safety
        "toxicity_score": toxicity_score,
        "is_toxic": is_toxic,
        "categories": {
            "toxic": toxicity_score > 0.7,
            "severe_toxic": toxicity_score > 0.9,
            "obscene": False,
            "threat": False,
            "insult": False,
            "identity_hate": False
        }
    }


@shared_task
def generate_recommendations_task(user_id, count=10):
    """Alias for precompute_user_recommendations for test compatibility"""
    from .recommendation_tasks import precompute_user_recommendations
    return precompute_user_recommendations.apply(args=[user_id]).get()


@shared_task
def calculate_user_statistics_task(user_id):
    """Mock user statistics calculation task"""
    # Simulate statistics calculation
    time.sleep(0.1)  # Simulate work
    
    return {
        "user_id": user_id,
        "stats": {
            "total_items": random.randint(0, 100),
            "completed_items": random.randint(0, 50),
            "average_rating": round(random.uniform(1, 10), 2),
            "hours_watched": random.randint(0, 1000),
            "genres_count": random.randint(1, 20)
        },
        "calculated_at": time.time()
    }