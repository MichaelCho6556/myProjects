# ABOUTME: This file contains production statistics calculation tasks for user analytics
# ABOUTME: Implements user statistics updates, analytics aggregation, and performance metrics

import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from collections import Counter
import statistics

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from celery_app import celery_app
from supabase_client import SupabaseClient, SupabaseAuthClient


@celery_app.task(bind=True, max_retries=3)
def calculate_user_statistics_task(self, user_id: str) -> Dict[str, Any]:
    """
    Calculate comprehensive statistics for a single user.
    
    Updates the user_statistics table with:
    - Total items (anime/manga)
    - Completion rates
    - Average ratings
    - Time spent watching/reading
    - Genre preferences
    - Activity streaks
    
    Args:
        user_id: The user ID to calculate statistics for
        
    Returns:
        Dict containing calculated statistics
    """
    try:
        print(f"📊 Calculating statistics for user {user_id}")
        
        # Initialize clients
        supabase = SupabaseClient()
        base_url = os.getenv('SUPABASE_URL', '').strip()
        api_key = os.getenv('SUPABASE_KEY', '').strip()
        service_key = os.getenv('SUPABASE_SERVICE_KEY', '').strip()
        auth_client = SupabaseAuthClient(base_url, api_key, service_key)
        
        # Get user's items
        user_items = supabase.get_user_items_data(user_id, include_item_details=True)
        
        if not user_items:
            print(f"No items found for user {user_id}")
            return {
                'user_id': user_id,
                'stats': {
                    'total_anime': 0,
                    'total_manga': 0,
                    'completed_anime': 0,
                    'completed_manga': 0,
                    'average_rating': 0,
                    'hours_watched': 0,
                    'chapters_read': 0,
                    'favorite_genres': [],
                    'completion_rate': 0
                },
                'calculated_at': datetime.utcnow().isoformat()
            }
        
        # Initialize counters
        stats = {
            'total_anime': 0,
            'total_manga': 0,
            'completed_anime': 0,
            'completed_manga': 0,
            'watching': 0,
            'reading': 0,
            'plan_to_watch': 0,
            'plan_to_read': 0,
            'dropped': 0,
            'on_hold': 0,
            'ratings': [],
            'genres': [],
            'hours_watched': 0,
            'chapters_read': 0,
            'episodes_watched': 0
        }
        
        # Process each item
        for item in user_items:
            item_type = item.get('media_type', 'unknown')
            status = item.get('status', 'unknown')
            rating = item.get('rating')
            
            # Count by type
            if 'anime' in item_type.lower():
                stats['total_anime'] += 1
                if status == 'completed':
                    stats['completed_anime'] += 1
                    # Calculate watch time (assume 24 min per episode)
                    episodes = item.get('episodes_watched', 0) or item.get('episodes', 0)
                    stats['episodes_watched'] += episodes
                    stats['hours_watched'] += (episodes * 24) / 60
                elif status == 'watching':
                    stats['watching'] += 1
                elif status == 'plan_to_watch':
                    stats['plan_to_watch'] += 1
                    
            elif 'manga' in item_type.lower():
                stats['total_manga'] += 1
                if status == 'completed':
                    stats['completed_manga'] += 1
                    chapters = item.get('chapters_read', 0) or item.get('chapters', 0)
                    stats['chapters_read'] += chapters
                elif status == 'reading':
                    stats['reading'] += 1
                elif status == 'plan_to_read':
                    stats['plan_to_read'] += 1
            
            # Common status tracking
            if status == 'dropped':
                stats['dropped'] += 1
            elif status == 'on_hold':
                stats['on_hold'] += 1
            
            # Collect ratings
            if rating and rating > 0:
                stats['ratings'].append(rating)
            
            # Collect genres
            item_genres = item.get('genres', [])
            if isinstance(item_genres, str):
                item_genres = [g.strip() for g in item_genres.split(',')]
            stats['genres'].extend(item_genres)
        
        # Calculate aggregates
        total_items = stats['total_anime'] + stats['total_manga']
        completed_items = stats['completed_anime'] + stats['completed_manga']
        
        # Genre analysis
        genre_counts = Counter(stats['genres'])
        top_genres = [genre for genre, _ in genre_counts.most_common(5)]
        
        # Rating statistics
        avg_rating = statistics.mean(stats['ratings']) if stats['ratings'] else 0
        rating_stddev = statistics.stdev(stats['ratings']) if len(stats['ratings']) > 1 else 0
        
        # Completion rate
        completion_rate = (completed_items / total_items * 100) if total_items > 0 else 0
        
        # Activity analysis
        current_activity = stats['watching'] + stats['reading']
        
        # Prepare final statistics
        user_stats = {
            'user_id': user_id,
            'total_anime': stats['total_anime'],
            'total_manga': stats['total_manga'],
            'completed_anime': stats['completed_anime'],
            'completed_manga': stats['completed_manga'],
            'watching': stats['watching'],
            'reading': stats['reading'],
            'plan_to_watch': stats['plan_to_watch'],
            'plan_to_read': stats['plan_to_read'],
            'dropped': stats['dropped'],
            'on_hold': stats['on_hold'],
            'average_rating': round(avg_rating, 2),
            'rating_stddev': round(rating_stddev, 2),
            'total_ratings': len(stats['ratings']),
            'hours_watched': round(stats['hours_watched'], 1),
            'episodes_watched': stats['episodes_watched'],
            'chapters_read': stats['chapters_read'],
            'favorite_genres': top_genres,
            'genre_diversity': len(set(stats['genres'])),
            'completion_rate': round(completion_rate, 1),
            'current_activity_count': current_activity,
            'last_updated': datetime.utcnow().isoformat()
        }
        
        # Update database
        try:
            # Check if user statistics exist
            existing = supabase.execute_query(
                f"SELECT id FROM user_statistics WHERE user_id = '{user_id}'"
            )
            
            if existing and existing[0]:
                # Update existing record
                supabase.update_data('user_statistics', existing[0][0]['id'], user_stats)
            else:
                # Create new record
                supabase.create_data('user_statistics', user_stats)
                
            print(f"✅ Statistics updated for user {user_id}")
            
        except Exception as e:
            print(f"❌ Failed to update database: {e}")
            # Return stats even if DB update fails
        
        return {
            'user_id': user_id,
            'stats': user_stats,
            'calculated_at': datetime.utcnow().isoformat(),
            'items_processed': total_items
        }
        
    except Exception as exc:
        print(f"❌ Statistics calculation failed for user {user_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            retry_in = 60 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=retry_in)
        
        return {
            'user_id': user_id,
            'error': str(exc),
            'stats': {},
            'calculated_at': datetime.utcnow().isoformat()
        }


@celery_app.task(bind=True)
def update_all_user_statistics(self, batch_size: int = 50) -> Dict[str, Any]:
    """
    Update statistics for all active users.
    
    This is a scheduled task that runs daily to keep statistics fresh.
    Processes users in batches to avoid overwhelming the system.
    """
    try:
        print("📊 Starting daily statistics update for all users")
        
        supabase = SupabaseClient()
        start_time = datetime.utcnow()
        
        # Get all active users (users with items in last 30 days)
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        
        active_users_query = f"""
            SELECT DISTINCT user_id 
            FROM user_items 
            WHERE updated_at > '{thirty_days_ago}'
            ORDER BY updated_at DESC
        """
        
        active_users = supabase.execute_query(active_users_query)
        
        if not active_users or not active_users[0]:
            return {
                'status': 'completed',
                'message': 'No active users found',
                'users_processed': 0
            }
        
        user_ids = [user['user_id'] for user in active_users[0]]
        total_users = len(user_ids)
        
        print(f"Found {total_users} active users to process")
        
        # Process in batches
        results = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        for i in range(0, total_users, batch_size):
            batch = user_ids[i:i + batch_size]
            print(f"Processing batch {i//batch_size + 1} ({len(batch)} users)")
            
            for user_id in batch:
                try:
                    # Use the individual calculation task
                    result = calculate_user_statistics_task.apply(args=[user_id]).get()
                    
                    results['processed'] += 1
                    if 'error' not in result:
                        results['successful'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append({
                            'user_id': user_id,
                            'error': result['error']
                        })
                        
                except Exception as e:
                    results['processed'] += 1
                    results['failed'] += 1
                    results['errors'].append({
                        'user_id': user_id,
                        'error': str(e)
                    })
            
            # Small delay between batches
            time.sleep(1)
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        return {
            'status': 'completed',
            'results': results,
            'total_users': total_users,
            'execution_time': execution_time,
            'users_per_minute': (total_users / execution_time * 60) if execution_time > 0 else 0,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as exc:
        print(f"❌ Daily statistics update failed: {exc}")
        return {
            'status': 'failed',
            'error': str(exc),
            'completed_at': datetime.utcnow().isoformat()
        }


@celery_app.task
def calculate_platform_statistics() -> Dict[str, Any]:
    """
    Calculate platform-wide statistics for admin dashboard.
    
    Includes:
    - Total users, items, lists
    - Activity metrics
    - Content popularity
    - Engagement rates
    """
    try:
        print("📊 Calculating platform-wide statistics")
        
        supabase = SupabaseClient()
        
        # Platform metrics queries
        metrics = {}
        
        # User metrics
        user_metrics_query = """
            SELECT 
                COUNT(DISTINCT u.id) as total_users,
                COUNT(DISTINCT CASE WHEN ui.updated_at > NOW() - INTERVAL '7 days' 
                    THEN u.id END) as active_users_week,
                COUNT(DISTINCT CASE WHEN ui.updated_at > NOW() - INTERVAL '30 days' 
                    THEN u.id END) as active_users_month
            FROM users u
            LEFT JOIN user_items ui ON u.id = ui.user_id
        """
        
        # Content metrics
        content_metrics_query = """
            SELECT 
                COUNT(DISTINCT id) as total_items,
                COUNT(DISTINCT CASE WHEN media_type LIKE '%anime%' THEN id END) as total_anime,
                COUNT(DISTINCT CASE WHEN media_type LIKE '%manga%' THEN id END) as total_manga,
                AVG(score) as average_score,
                COUNT(DISTINCT CASE WHEN score >= 8 THEN id END) as high_rated_items
            FROM items
        """
        
        # Engagement metrics
        engagement_query = """
            SELECT 
                COUNT(*) as total_user_items,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_items,
                COUNT(CASE WHEN rating > 0 THEN 1 END) as rated_items,
                AVG(rating) as average_user_rating
            FROM user_items
            WHERE rating > 0
        """
        
        # Execute queries
        user_results = supabase.execute_query(user_metrics_query)
        content_results = supabase.execute_query(content_metrics_query)
        engagement_results = supabase.execute_query(engagement_query)
        
        # Compile results
        platform_stats = {
            'users': user_results[0][0] if user_results and user_results[0] else {},
            'content': content_results[0][0] if content_results and content_results[0] else {},
            'engagement': engagement_results[0][0] if engagement_results and engagement_results[0] else {},
            'calculated_at': datetime.utcnow().isoformat()
        }
        
        print("✅ Platform statistics calculated successfully")
        return platform_stats
        
    except Exception as exc:
        print(f"❌ Platform statistics calculation failed: {exc}")
        return {
            'error': str(exc),
            'calculated_at': datetime.utcnow().isoformat()
        }


@celery_app.task(bind=True, max_retries=3)
def update_user_statistics_cache(self, user_id: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Update user statistics cache for improved dashboard performance.
    
    This task calculates user statistics and stores them in Redis cache
    with appropriate TTL. Used for background cache warming and updates.
    
    Args:
        user_id: The user ID to update cache for
        force_refresh: If True, recalculate even if cache exists
        
    Returns:
        Dict containing cache update results and timing information
    """
    try:
        print(f"🔄 Updating cache for user {user_id} (force_refresh: {force_refresh})")
        start_time = datetime.utcnow()
        
        # Import cache helpers
        from utils.cache_helpers import (
            get_user_stats_from_cache,
            set_user_stats_in_cache,
            get_cache_status
        )
        from models import get_user_statistics
        
        # Check if cache update is needed
        if not force_refresh:
            existing_cache = get_user_stats_from_cache(user_id)
            if existing_cache:
                print(f"📋 Cache already exists for user {user_id}, skipping update")
                return {
                    'status': 'skipped',
                    'user_id': user_id,
                    'reason': 'cache_exists',
                    'completed_at': datetime.utcnow().isoformat()
                }
        
        # Calculate fresh statistics
        stats = get_user_statistics(user_id)
        
        if not stats:
            print(f"⚠️  No statistics found for user {user_id}")
            return {
                'status': 'no_data',
                'user_id': user_id,
                'reason': 'no_statistics_available',
                'completed_at': datetime.utcnow().isoformat()
            }
        
        # Update cache
        cache_success = set_user_stats_in_cache(user_id, stats)
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Get cache status for monitoring
        cache_status = get_cache_status()
        
        result = {
            'status': 'success' if cache_success else 'cache_failed',
            'user_id': user_id,
            'cache_updated': cache_success,
            'execution_time': execution_time,
            'stats_count': len(stats) if isinstance(stats, dict) else 0,
            'cache_connection': cache_status.get('connected', False),
            'completed_at': datetime.utcnow().isoformat()
        }
        
        if cache_success:
            print(f"✅ Cache updated successfully for user {user_id} in {execution_time:.2f}s")
        else:
            print(f"⚠️  Cache update failed for user {user_id}, but statistics calculated")
        
        return result
        
    except Exception as exc:
        print(f"❌ Cache update failed for user {user_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            retry_in = 30 * (2 ** self.request.retries)
            print(f"🔄 Retrying cache update for user {user_id} in {retry_in}s")
            raise self.retry(exc=exc, countdown=retry_in)
        
        return {
            'status': 'error',
            'user_id': user_id,
            'error': str(exc),
            'retries_exhausted': True,
            'completed_at': datetime.utcnow().isoformat()
        }


@celery_app.task(bind=True)
def batch_update_statistics_cache(self, user_ids: List[str], force_refresh: bool = False) -> Dict[str, Any]:
    """
    Batch update user statistics cache for multiple users.
    
    Used for cache warming during off-peak hours or after system updates.
    
    Args:
        user_ids: List of user IDs to update
        force_refresh: If True, refresh all caches regardless of existing data
        
    Returns:
        Dict containing batch processing results
    """
    try:
        print(f"🔄 Starting batch cache update for {len(user_ids)} users")
        start_time = datetime.utcnow()
        
        results = {
            'processed': 0,
            'successful': 0,
            'skipped': 0,
            'failed': 0,
            'errors': []
        }
        
        for user_id in user_ids:
            try:
                # Use the individual cache update task
                result = update_user_statistics_cache.apply(
                    args=[user_id, force_refresh]
                ).get()
                
                results['processed'] += 1
                
                if result['status'] == 'success':
                    results['successful'] += 1
                elif result['status'] == 'skipped':
                    results['skipped'] += 1
                else:
                    results['failed'] += 1
                    if 'error' in result:
                        results['errors'].append({
                            'user_id': user_id,
                            'error': result['error']
                        })
                        
            except Exception as e:
                results['processed'] += 1
                results['failed'] += 1
                results['errors'].append({
                    'user_id': user_id,
                    'error': str(e)
                })
                print(f"❌ Failed to update cache for user {user_id}: {e}")
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        print(f"✅ Batch cache update completed: {results['successful']} successful, "
              f"{results['failed']} failed, {results['skipped']} skipped in {execution_time:.2f}s")
        
        return {
            'status': 'completed',
            'results': results,
            'total_users': len(user_ids),
            'execution_time': execution_time,
            'users_per_minute': (len(user_ids) / execution_time * 60) if execution_time > 0 else 0,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as exc:
        print(f"❌ Batch cache update failed: {exc}")
        return {
            'status': 'failed',
            'error': str(exc),
            'completed_at': datetime.utcnow().isoformat()
        }