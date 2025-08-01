# ABOUTME: Synchronous compute endpoints to replace Celery background tasks
# ABOUTME: Provides on-demand computation APIs for production deployment without background workers
"""
Compute Endpoints for AniManga Recommender

This module provides synchronous API endpoints that replace Celery background tasks
for deployment on free-tier hosting services. These endpoints perform computations
on-demand with progress tracking and caching.

Key Features:
    - User statistics calculation
    - Recommendation generation
    - Content moderation analysis
    - Platform statistics aggregation
    - Progress tracking for long operations
    - Automatic caching of results
"""

import os
import sys
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from functools import wraps
from threading import Thread
import uuid

from flask import Blueprint, jsonify, request, g
from flask_cors import cross_origin

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from middleware.auth_middleware import token_required
from utils.cache_helpers import (
    get_user_stats_from_cache,
    set_user_stats_in_cache,
    get_recommendations_from_cache,
    set_recommendations_in_cache,
    get_platform_stats_from_cache,
    set_platform_stats_in_cache,
    get_toxicity_analysis_from_cache,
    set_toxicity_analysis_in_cache,
    invalidate_user_cache
)
from supabase_client import SupabaseClient

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint
compute_bp = Blueprint('compute', __name__, url_prefix='/api/compute')

# In-memory task status tracking (for production, use database)
task_status = {}


def track_progress(task_id: str, status: str, progress: int, result: Any = None):
    """Update task progress in tracking system."""
    task_status[task_id] = {
        'task_id': task_id,
        'status': status,
        'progress': progress,
        'result': result,
        'updated_at': datetime.utcnow().isoformat()
    }
    
    # Clean up old tasks (older than 1 hour)
    cutoff_time = datetime.utcnow() - timedelta(hours=1)
    for tid, info in list(task_status.items()):
        if tid != task_id:
            try:
                updated = datetime.fromisoformat(info['updated_at'].replace('Z', '+00:00'))
                if updated < cutoff_time:
                    del task_status[tid]
            except:
                pass


@compute_bp.route('/status/<task_id>', methods=['GET'])
@cross_origin()
def get_task_status(task_id: str):
    """
    Get status of a compute task.
    
    Returns task progress and result when complete.
    """
    status = task_status.get(task_id)
    if not status:
        return jsonify({'error': 'Task not found'}), 404
    
    return jsonify(status), 200


@compute_bp.route('/user-stats/<user_id>', methods=['POST'])
@cross_origin()
@token_required
def compute_user_statistics(user_id: str):
    """
    Compute user statistics on demand.
    
    This endpoint replaces the Celery task for calculating user statistics.
    Results are automatically cached for 24 hours.
    
    Query Parameters:
        force_refresh (bool): Force recalculation even if cached
        async (bool): Return immediately with task ID for polling
    """
    try:
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        async_mode = request.args.get('async', 'false').lower() == 'true'
        
        # Check cache first unless force refresh
        if not force_refresh:
            cached_stats = get_user_stats_from_cache(user_id)
            if cached_stats:
                return jsonify({
                    'status': 'success',
                    'data': cached_stats,
                    'cached': True
                }), 200
        
        # For async mode, start computation in background
        if async_mode:
            task_id = str(uuid.uuid4())
            track_progress(task_id, 'pending', 0)
            
            # Start computation in background thread
            thread = Thread(
                target=_compute_user_stats_async,
                args=(user_id, task_id)
            )
            thread.daemon = True
            thread.start()
            
            return jsonify({
                'status': 'accepted',
                'task_id': task_id,
                'message': 'Statistics computation started'
            }), 202
        
        # Synchronous computation
        stats = _calculate_user_statistics(user_id)
        
        # Cache the results
        set_user_stats_in_cache(user_id, stats)
        
        return jsonify({
            'status': 'success',
            'data': stats,
            'cached': False
        }), 200
        
    except Exception as e:
        logger.error(f"Error computing user statistics: {e}")
        return jsonify({'error': 'Failed to compute statistics'}), 500


def _compute_user_stats_async(user_id: str, task_id: str):
    """Background function for async statistics computation."""
    try:
        track_progress(task_id, 'processing', 10)
        
        # Calculate statistics
        stats = _calculate_user_statistics(user_id, task_id)
        
        # Cache results
        set_user_stats_in_cache(user_id, stats)
        
        track_progress(task_id, 'completed', 100, stats)
        
    except Exception as e:
        logger.error(f"Error in async stats computation: {e}")
        track_progress(task_id, 'failed', 100, {'error': str(e)})


def _calculate_user_statistics(user_id: str, task_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculate comprehensive user statistics.
    
    This is the core logic extracted from the Celery task.
    """
    supabase = SupabaseClient()
    
    if task_id:
        track_progress(task_id, 'processing', 20)
    
    # Get user's items with details
    user_items = supabase.get_user_items_data(user_id, include_item_details=True)
    
    if not user_items:
        return {
            'user_id': user_id,
            'total_anime': 0,
            'total_manga': 0,
            'completed_anime': 0,
            'completed_manga': 0,
            'average_rating': 0,
            'hours_watched': 0,
            'chapters_read': 0,
            'favorite_genres': [],
            'completion_rate': 0,
            'calculated_at': datetime.utcnow().isoformat()
        }
    
    if task_id:
        track_progress(task_id, 'processing', 40)
    
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
    for i, item in enumerate(user_items):
        if task_id and i % 10 == 0:
            progress = 40 + int((i / len(user_items)) * 40)
            track_progress(task_id, 'processing', progress)
        
        item_type = item.get('media_type', 'unknown')
        status = item.get('status', 'unknown')
        rating = item.get('rating')
        
        # Count by type
        if 'anime' in item_type.lower():
            stats['total_anime'] += 1
            if status == 'completed':
                stats['completed_anime'] += 1
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
        
        # Track ratings and genres
        if rating and rating > 0:
            stats['ratings'].append(rating)
        
        item_genres = item.get('genres', [])
        if isinstance(item_genres, str):
            item_genres = [g.strip() for g in item_genres.split(',')]
        stats['genres'].extend(item_genres)
    
    if task_id:
        track_progress(task_id, 'processing', 80)
    
    # Calculate aggregates
    from collections import Counter
    import statistics as stat_utils
    
    total_items = stats['total_anime'] + stats['total_manga']
    completed_items = stats['completed_anime'] + stats['completed_manga']
    
    # Genre analysis
    genre_counts = Counter(stats['genres'])
    top_genres = [genre for genre, _ in genre_counts.most_common(5)]
    
    # Rating statistics
    avg_rating = stat_utils.mean(stats['ratings']) if stats['ratings'] else 0
    
    # Completion rate
    completion_rate = (completed_items / total_items * 100) if total_items > 0 else 0
    
    if task_id:
        track_progress(task_id, 'processing', 90)
    
    # Build final statistics
    final_stats = {
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
        'hours_watched': round(stats['hours_watched'], 1),
        'chapters_read': stats['chapters_read'],
        'episodes_watched': stats['episodes_watched'],
        'favorite_genres': top_genres,
        'completion_rate': round(completion_rate, 1),
        'total_items': total_items,
        'calculated_at': datetime.utcnow().isoformat()
    }
    
    if task_id:
        track_progress(task_id, 'processing', 95)
    
    # Update database statistics table
    try:
        supabase.client.table('user_statistics').upsert({
            'user_id': user_id,
            'total_anime': final_stats['total_anime'],
            'total_manga': final_stats['total_manga'],
            'completed_anime': final_stats['completed_anime'],
            'completed_manga': final_stats['completed_manga'],
            'average_rating': final_stats['average_rating'],
            'hours_watched': final_stats['hours_watched'],
            'chapters_read': final_stats['chapters_read'],
            'completion_rate_anime': (stats['completed_anime'] / stats['total_anime'] * 100) if stats['total_anime'] > 0 else 0,
            'completion_rate_manga': (stats['completed_manga'] / stats['total_manga'] * 100) if stats['total_manga'] > 0 else 0,
            'last_calculated': datetime.utcnow().isoformat()
        }, on_conflict='user_id').execute()
    except Exception as e:
        logger.error(f"Failed to update user statistics table: {e}")
    
    return final_stats


@compute_bp.route('/recommendations/<item_uid>', methods=['POST'])
@cross_origin()
def compute_recommendations(item_uid: str):
    """
    Generate recommendations for an item on demand.
    
    This endpoint replaces the Celery task for generating recommendations.
    Results are automatically cached for 4 hours.
    
    Query Parameters:
        user_id (str): Optional user ID for personalized recommendations
        limit (int): Number of recommendations to return (default: 10)
        force_refresh (bool): Force recalculation even if cached
    """
    try:
        user_id = request.args.get('user_id')
        limit = int(request.args.get('limit', 10))
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        
        # Check cache first
        if not force_refresh:
            cached_recs = get_recommendations_from_cache(item_uid, user_id)
            if cached_recs:
                # Extract just the recommendations list
                recs = cached_recs.get('recommendations', cached_recs)
                return jsonify({
                    'status': 'success',
                    'data': recs[:limit],
                    'cached': True
                }), 200
        
        # Generate recommendations
        from models import RecommendationEngine
        
        engine = RecommendationEngine()
        recommendations = engine.get_content_based_recommendations(
            item_uid,
            top_n=limit,
            user_id=user_id
        )
        
        # Cache the results
        set_recommendations_in_cache(item_uid, recommendations, user_id)
        
        return jsonify({
            'status': 'success',
            'data': recommendations,
            'cached': False
        }), 200
        
    except Exception as e:
        logger.error(f"Error computing recommendations: {e}")
        return jsonify({'error': 'Failed to generate recommendations'}), 500


@compute_bp.route('/moderation/<content_type>/<content_id>', methods=['POST'])
@cross_origin()
@token_required
def analyze_content_moderation(content_type: str, content_id: str):
    """
    Analyze content for moderation on demand.
    
    This endpoint replaces the Celery task for content moderation.
    Results are automatically cached for 24 hours.
    
    Path Parameters:
        content_type: Type of content ('comment' or 'review')
        content_id: ID of the content to analyze
    """
    try:
        # Validate content type
        if content_type not in ['comment', 'review']:
            return jsonify({'error': 'Invalid content type'}), 400
        
        # Check cache first
        cached_analysis = get_toxicity_analysis_from_cache(content_id, content_type)
        if cached_analysis:
            return jsonify({
                'status': 'success',
                'data': cached_analysis,
                'cached': True
            }), 200
        
        # Get content from database
        supabase = SupabaseClient()
        table_name = 'comments' if content_type == 'comment' else 'reviews'
        
        result = supabase.client.table(table_name).select('*').eq('id', content_id).single().execute()
        if not result.data:
            return jsonify({'error': 'Content not found'}), 404
        
        content_data = result.data
        text_to_analyze = content_data.get('content', '')
        
        # Perform toxicity analysis
        from utils.contentAnalysis import analyze_text_toxicity
        
        analysis = analyze_text_toxicity(text_to_analyze)
        
        # Add metadata
        analysis_result = {
            'content_id': content_id,
            'content_type': content_type,
            'toxicity_score': analysis['toxicity_score'],
            'is_toxic': analysis['is_toxic'],
            'confidence': analysis.get('confidence', 0.95),
            'categories': analysis.get('categories', {}),
            'analyzed_at': datetime.utcnow().isoformat(),
            'auto_flagged': analysis['toxicity_score'] > 0.7
        }
        
        # Cache the results
        set_toxicity_analysis_in_cache(content_id, analysis_result, content_type)
        
        # Update content with moderation status if toxic
        if analysis_result['auto_flagged']:
            try:
                supabase.client.table(table_name).update({
                    'moderation_status': 'flagged',
                    'toxicity_score': analysis_result['toxicity_score'],
                    'moderated_at': datetime.utcnow().isoformat()
                }).eq('id', content_id).execute()
            except Exception as e:
                logger.error(f"Failed to update moderation status: {e}")
        
        return jsonify({
            'status': 'success',
            'data': analysis_result,
            'cached': False
        }), 200
        
    except Exception as e:
        logger.error(f"Error analyzing content: {e}")
        return jsonify({'error': 'Failed to analyze content'}), 500


@compute_bp.route('/platform-stats', methods=['POST'])
@cross_origin()
def compute_platform_statistics():
    """
    Calculate platform-wide statistics on demand.
    
    This endpoint replaces the Celery task for platform statistics.
    Results are automatically cached for 1 hour.
    """
    try:
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        
        # Check cache first
        if not force_refresh:
            cached_stats = get_platform_stats_from_cache()
            if cached_stats:
                return jsonify({
                    'status': 'success',
                    'data': cached_stats,
                    'cached': True
                }), 200
        
        # Calculate platform statistics
        supabase = SupabaseClient()
        
        stats = {
            'total_users': 0,
            'total_items': 0,
            'total_lists': 0,
            'total_reviews': 0,
            'total_comments': 0,
            'active_users_today': 0,
            'popular_genres': [],
            'average_rating': 0,
            'calculated_at': datetime.utcnow().isoformat()
        }
        
        try:
            # Get counts
            stats['total_users'] = supabase.client.table('user_profiles').select('id', count='exact').execute().count
            stats['total_items'] = supabase.client.table('items').select('uid', count='exact').execute().count
            stats['total_lists'] = supabase.client.table('custom_lists').select('id', count='exact').execute().count
            stats['total_reviews'] = supabase.client.table('reviews').select('id', count='exact').execute().count
            stats['total_comments'] = supabase.client.table('comments').select('id', count='exact').execute().count
            
            # Get active users (logged in within 24 hours)
            yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
            active = supabase.client.table('user_profiles').select('id', count='exact').gte('last_active', yesterday).execute()
            stats['active_users_today'] = active.count
            
            # Get popular genres
            genres = supabase.client.table('genres').select('name').limit(10).execute()
            stats['popular_genres'] = [g['name'] for g in genres.data]
            
            # Get average rating
            ratings = supabase.client.table('user_items').select('rating').gt('rating', 0).execute()
            if ratings.data:
                ratings_list = [r['rating'] for r in ratings.data]
                stats['average_rating'] = round(sum(ratings_list) / len(ratings_list), 2)
            
        except Exception as e:
            logger.error(f"Error calculating platform stats: {e}")
        
        # Cache the results
        set_platform_stats_in_cache(stats)
        
        return jsonify({
            'status': 'success',
            'data': stats,
            'cached': False
        }), 200
        
    except Exception as e:
        logger.error(f"Error computing platform statistics: {e}")
        return jsonify({'error': 'Failed to compute statistics'}), 500


@compute_bp.route('/batch/user-stats', methods=['POST'])
@cross_origin()
@token_required
def batch_compute_user_stats():
    """
    Compute statistics for multiple users.
    
    This is useful for warming up caches or bulk updates.
    
    Request Body:
        user_ids (list): List of user IDs to compute stats for
        max_batch_size (int): Maximum batch size (default: 10, max: 50)
    """
    try:
        data = request.get_json()
        user_ids = data.get('user_ids', [])
        max_batch_size = min(int(data.get('max_batch_size', 10)), 50)
        
        if not user_ids:
            return jsonify({'error': 'No user IDs provided'}), 400
        
        # Limit batch size
        user_ids = user_ids[:max_batch_size]
        
        results = {
            'successful': 0,
            'failed': 0,
            'users': {}
        }
        
        for user_id in user_ids:
            try:
                stats = _calculate_user_statistics(user_id)
                set_user_stats_in_cache(user_id, stats)
                results['successful'] += 1
                results['users'][user_id] = 'success'
            except Exception as e:
                logger.error(f"Failed to compute stats for user {user_id}: {e}")
                results['failed'] += 1
                results['users'][user_id] = 'failed'
        
        return jsonify({
            'status': 'success',
            'data': results
        }), 200
        
    except Exception as e:
        logger.error(f"Error in batch computation: {e}")
        return jsonify({'error': 'Failed to process batch'}), 500


# Health check endpoint
@compute_bp.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Check if compute endpoints are healthy."""
    return jsonify({
        'status': 'healthy',
        'endpoints': [
            '/api/compute/user-stats/<user_id>',
            '/api/compute/recommendations/<item_uid>',
            '/api/compute/moderation/<content_type>/<content_id>',
            '/api/compute/platform-stats',
            '/api/compute/batch/user-stats'
        ],
        'active_tasks': len(task_status)
    }), 200