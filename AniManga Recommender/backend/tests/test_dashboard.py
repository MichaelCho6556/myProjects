"""
Comprehensive Dashboard Data Tests for AniManga Recommender
Phase A2: Dashboard Data Testing

Test Coverage:
- Dashboard statistics calculation accuracy
- Activity feed generation and filtering
- Completion rate calculations  
- Dashboard data caching behavior
- Cache invalidation mechanisms
- Performance with large datasets
- Real-time statistics computation
- Quick stats accuracy
"""

import pytest
import json
import time
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import requests

# Import test dependencies
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import (
    app, get_user_statistics, get_cached_user_statistics, is_cache_fresh,
    update_user_statistics_cache, invalidate_user_statistics_cache,
    calculate_user_statistics_realtime, get_recent_user_activity,
    get_user_items_by_status, get_recently_completed, get_quick_stats,
    log_user_activity, calculate_watch_time, calculate_chapters_read,
    get_user_favorite_genres, calculate_current_streak, calculate_longest_streak,
    calculate_average_user_score, calculate_completion_rate, get_default_user_statistics
)


class TestDashboardCalculations:
    """Test suite for dashboard statistics calculations"""
    
    @pytest.mark.unit
    def test_statistics_calculation_empty_user(self, client):
        """Test dashboard stats for new user with no items"""
        user_id = 'empty_user_123'
        
        with patch('requests.get') as mock_get:
            # Mock empty user items response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = []
            mock_get.return_value = mock_response
            
            stats = calculate_user_statistics_realtime(user_id)
            
            # Verify empty user defaults
            assert stats['total_anime_watched'] == 0
            assert stats['total_manga_read'] == 0
            assert stats['total_hours_watched'] == 0.0
            assert stats['total_chapters_read'] == 0
            assert stats['average_score'] == 0.0
            assert stats['favorite_genres'] == []
            assert stats['current_streak_days'] == 0
            assert stats['longest_streak_days'] == 0
            assert stats['completion_rate'] == 0.0
    
    @pytest.mark.unit
    def test_statistics_calculation_populated_user(self, client):
        """Test dashboard stats calculation accuracy"""
        user_id = 'populated_user_123'
        
        # Mock user items with different statuses
        mock_user_items = [
            {'item_uid': 'anime_1', 'status': 'completed', 'rating': 8.5},
            {'item_uid': 'anime_2', 'status': 'completed', 'rating': 9.0},
            {'item_uid': 'manga_1', 'status': 'completed', 'rating': 7.5},
            {'item_uid': 'anime_3', 'status': 'watching', 'rating': None},
            {'item_uid': 'manga_2', 'status': 'plan_to_watch', 'rating': None}
        ]
        
        with patch('requests.get') as mock_get, \
             patch('app.get_item_media_type') as mock_media_type, \
             patch('app.calculate_watch_time') as mock_watch_time, \
             patch('app.calculate_chapters_read') as mock_chapters, \
             patch('app.get_user_favorite_genres') as mock_genres, \
             patch('app.calculate_current_streak') as mock_current_streak, \
             patch('app.calculate_longest_streak') as mock_longest_streak:
            
            # Mock API response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_user_items
            mock_get.return_value = mock_response
            
            # Mock media type detection
            def mock_media_type_side_effect(item_uid):
                if 'anime' in item_uid:
                    return 'anime'
                elif 'manga' in item_uid:
                    return 'manga'
                return 'unknown'
            
            mock_media_type.side_effect = mock_media_type_side_effect
            
            # Mock calculation functions
            mock_watch_time.return_value = 48.5  # hours
            mock_chapters.return_value = 250      # chapters
            mock_genres.return_value = ['Action', 'Adventure', 'Comedy']
            mock_current_streak.return_value = 5
            mock_longest_streak.return_value = 12
            
            stats = calculate_user_statistics_realtime(user_id)
            
            # Verify calculated statistics
            assert stats['total_anime_watched'] == 2  # anime_1, anime_2 completed
            assert stats['total_manga_read'] == 1     # manga_1 completed
            assert stats['total_hours_watched'] == 48.5
            assert stats['total_chapters_read'] == 250
            assert stats['average_score'] == 8.33    # (8.5 + 9.0 + 7.5) / 3
            assert stats['favorite_genres'] == ['Action', 'Adventure', 'Comedy']
            assert stats['current_streak_days'] == 5
            assert stats['longest_streak_days'] == 12
            assert stats['completion_rate'] == 60.0  # 3 completed out of 5 total
    
    @pytest.mark.unit
    def test_activity_feed_generation(self, client):
        """Test recent activity list creation"""
        user_id = 'activity_user_123'
        
        # Mock recent activities
        mock_activities = [
            {
                'id': 1,
                'user_id': user_id,
                'activity_type': 'status_changed',
                'item_uid': 'anime_1',
                'activity_data': {'new_status': 'completed'},
                'created_at': '2024-01-15T10:00:00Z'
            },
            {
                'id': 2,
                'user_id': user_id,
                'activity_type': 'rating_updated',
                'item_uid': 'anime_2',
                'activity_data': {'rating': 9.0},
                'created_at': '2024-01-14T15:30:00Z'
            }
        ]
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_activities
            mock_get.return_value = mock_response
            
            activities = get_recent_user_activity(user_id, limit=10)
            
            assert len(activities) == 2
            assert activities[0]['activity_type'] == 'status_changed'
            assert activities[1]['activity_type'] == 'rating_updated'
    
    @pytest.mark.unit
    def test_completion_rate_calculation(self, client):
        """Test completion percentage accuracy"""
        # Test various completion scenarios
        test_cases = [
            {
                'items': [
                    {'status': 'completed'},
                    {'status': 'completed'},
                    {'status': 'watching'},
                    {'status': 'plan_to_watch'}
                ],
                'expected_rate': 50.0  # 2 completed out of 4 total
            },
            {
                'items': [
                    {'status': 'completed'},
                    {'status': 'completed'},
                    {'status': 'completed'}
                ],
                'expected_rate': 100.0  # All completed
            },
            {
                'items': [
                    {'status': 'watching'},
                    {'status': 'plan_to_watch'},
                    {'status': 'on_hold'}
                ],
                'expected_rate': 0.0  # None completed
            },
            {
                'items': [],
                'expected_rate': 0.0  # Empty list
            }
        ]
        
        for case in test_cases:
            completion_rate = calculate_completion_rate(case['items'])
            assert completion_rate == case['expected_rate']


class TestDashboardCaching:
    """Test suite for dashboard caching mechanisms"""
    
    @pytest.mark.integration
    def test_dashboard_data_caching(self, client):
        """Test dashboard response caching behavior"""
        user_id = 'cache_user_123'
        
        # Mock fresh cached data
        mock_cached_stats = {
            'user_id': user_id,
            'total_anime_watched': 5,
            'total_manga_read': 3,
            'updated_at': datetime.now().isoformat()
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = [mock_cached_stats]
            mock_get.return_value = mock_response
            
            # First call should hit cache
            cached_stats = get_cached_user_statistics(user_id)
            
            assert cached_stats is not None
            assert cached_stats['user_id'] == user_id
            assert cached_stats['total_anime_watched'] == 5
            assert cached_stats['total_manga_read'] == 3
    
    @pytest.mark.integration
    def test_cache_freshness_validation(self, client):
        """Test cache freshness checking"""
        # Test fresh cache (within 5 minutes)
        fresh_cache = {
            'updated_at': datetime.now().isoformat()
        }
        assert is_cache_fresh(fresh_cache, max_age_minutes=5) == True
        
        # Test stale cache (older than 5 minutes)
        stale_cache = {
            'updated_at': (datetime.now() - timedelta(minutes=10)).isoformat()
        }
        assert is_cache_fresh(stale_cache, max_age_minutes=5) == False
        
        # Test cache without timestamp
        invalid_cache = {'user_id': 'test'}
        assert is_cache_fresh(invalid_cache) == False
        
        # Test None cache
        assert is_cache_fresh(None) == False
    
    @pytest.mark.integration
    def test_cache_invalidation_on_user_action(self, client):
        """Test cache clearing when user updates items"""
        user_id = 'invalidation_user_123'
        
        with patch('requests.delete') as mock_delete:
            mock_response = Mock()
            mock_response.status_code = 204
            mock_delete.return_value = mock_response
            
            result = invalidate_user_statistics_cache(user_id)
            
            assert result == True
            mock_delete.assert_called_once()
    
    @pytest.mark.integration
    def test_cache_update_mechanism(self, client):
        """Test cache updating with new data"""
        user_id = 'update_user_123'
        new_stats = {
            'total_anime_watched': 10,
            'total_manga_read': 5,
            'average_score': 8.5
        }
        
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 201
            mock_post.return_value = mock_response
            
            result = update_user_statistics_cache(user_id, new_stats)
            
            assert result == True
            mock_post.assert_called_once()


class TestQuickStatistics:
    """Test suite for quick statistics calculations"""
    
    @pytest.mark.unit
    def test_quick_stats_accuracy(self, client):
        """Test quick stats calculation correctness"""
        user_id = 'quickstats_user_123'
        
        # Mock user items with various statuses
        mock_items = [
            {'status': 'watching'},
            {'status': 'watching'},
            {'status': 'completed'},
            {'status': 'completed'},
            {'status': 'completed'},
            {'status': 'plan_to_watch'},
            {'status': 'on_hold'},
            {'status': 'dropped'}
        ]
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_items
            mock_get.return_value = mock_response
            
            quick_stats = get_quick_stats(user_id)
            
            assert quick_stats['total_items'] == 8
            assert quick_stats['watching'] == 2
            assert quick_stats['completed'] == 3
            assert quick_stats['plan_to_watch'] == 1
            assert quick_stats['on_hold'] == 1
            assert quick_stats['dropped'] == 1
    
    @pytest.mark.unit
    def test_watch_time_calculation(self, client):
        """Test watch time calculation accuracy"""
        # Mock completed anime items
        completed_items = [
            {'item_uid': 'anime_1'},
            {'item_uid': 'anime_2'},
            {'item_uid': 'manga_1'}  # Should be ignored
        ]
        
        with patch('app.get_item_media_type') as mock_media_type, \
             patch('app.get_item_details_for_stats') as mock_details:
            
            def mock_media_type_side_effect(item_uid):
                return 'anime' if 'anime' in item_uid else 'manga'
            
            def mock_details_side_effect(item_uid):
                if item_uid == 'anime_1':
                    return {'episodes': 24, 'duration_minutes': 24}
                elif item_uid == 'anime_2':
                    return {'episodes': 12, 'duration_minutes': 22}
                return None
            
            mock_media_type.side_effect = mock_media_type_side_effect
            mock_details.side_effect = mock_details_side_effect
            
            total_hours = calculate_watch_time(completed_items)
            
            # Expected: (24 * 24 + 12 * 22) / 60 = (576 + 264) / 60 = 14.0 hours
            assert total_hours == 14.0
    
    @pytest.mark.unit
    def test_chapters_read_calculation(self, client):
        """Test chapters read calculation accuracy"""
        # Mock completed manga items
        completed_items = [
            {'item_uid': 'manga_1'},
            {'item_uid': 'manga_2'},
            {'item_uid': 'anime_1'}  # Should be ignored
        ]
        
        with patch('app.get_item_media_type') as mock_media_type, \
             patch('app.get_item_details_for_stats') as mock_details:
            
            def mock_media_type_side_effect(item_uid):
                return 'manga' if 'manga' in item_uid else 'anime'
            
            def mock_details_side_effect(item_uid):
                if item_uid == 'manga_1':
                    return {'chapters': 150}
                elif item_uid == 'manga_2':
                    return {'chapters': 75}
                return None
            
            mock_media_type.side_effect = mock_media_type_side_effect
            mock_details.side_effect = mock_details_side_effect
            
            total_chapters = calculate_chapters_read(completed_items)
            
            # Expected: 150 + 75 = 225 chapters
            assert total_chapters == 225


class TestStreakCalculations:
    """Test suite for streak calculations"""
    
    @pytest.mark.unit
    def test_current_streak_calculation(self, client):
        """Test current streak calculation accuracy"""
        user_id = 'streak_user_123'
        
        # Mock activities for consecutive days
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        day_before = today - timedelta(days=2)
        
        mock_activities = [
            {'created_at': f'{today}T10:00:00Z'},
            {'created_at': f'{yesterday}T15:00:00Z'},
            {'created_at': f'{day_before}T12:00:00Z'},
            # Gap here - no activity 3 days ago
            {'created_at': f'{today - timedelta(days=5)}T10:00:00Z'}
        ]
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_activities
            mock_get.return_value = mock_response
            
            current_streak = calculate_current_streak(user_id)
            
            # Should be 3 days (today, yesterday, day before)
            assert current_streak == 3
    
    @pytest.mark.unit
    def test_longest_streak_calculation(self, client):
        """Test longest streak calculation accuracy"""
        user_id = 'longest_streak_user_123'
        
        # Mock activities with different streak periods
        base_date = datetime.now().date() - timedelta(days=30)
        mock_activities = []
        
        # Create 5-day streak
        for i in range(5):
            date = base_date + timedelta(days=i)
            mock_activities.append({'created_at': f'{date}T10:00:00Z'})
        
        # Gap of 3 days
        
        # Create 7-day streak (longest)
        for i in range(8, 15):
            date = base_date + timedelta(days=i)
            mock_activities.append({'created_at': f'{date}T10:00:00Z'})
        
        # Another gap
        
        # Create 3-day streak
        for i in range(20, 23):
            date = base_date + timedelta(days=i)
            mock_activities.append({'created_at': f'{date}T10:00:00Z'})
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_activities
            mock_get.return_value = mock_response
            
            longest_streak = calculate_longest_streak(user_id)
            
            # Should be 7 days (the longest consecutive period)
            assert longest_streak == 7


class TestActivityLogging:
    """Test suite for activity logging functionality"""
    
    @pytest.mark.unit
    def test_activity_logging_success(self, client):
        """Test successful activity logging"""
        user_id = 'activity_log_user_123'
        activity_type = 'status_changed'
        item_uid = 'anime_1'
        activity_data = {'new_status': 'completed', 'rating': 9.0}
        
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 201
            mock_post.return_value = mock_response
            
            result = log_user_activity(user_id, activity_type, item_uid, activity_data)
            
            assert result == True
            mock_post.assert_called_once()
            
            # Verify the data structure sent
            call_args = mock_post.call_args
            sent_data = call_args[1]['json']
            
            assert sent_data['user_id'] == user_id
            assert sent_data['activity_type'] == activity_type
            assert sent_data['item_uid'] == item_uid
            assert sent_data['activity_data'] == activity_data
    
    @pytest.mark.unit
    def test_activity_logging_failure(self, client):
        """Test activity logging error handling"""
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 500
            mock_post.return_value = mock_response
            
            result = log_user_activity('user_123', 'test', 'item_123')
            
            assert result == False


class TestDashboardEndpoint:
    """Test suite for dashboard API endpoint"""
    
    @pytest.mark.integration
    def test_dashboard_endpoint_success(self, client):
        """Test successful dashboard data retrieval"""
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_user_statistics') as mock_stats, \
             patch('app.get_recent_user_activity') as mock_activity, \
             patch('app.get_user_items_by_status') as mock_items, \
             patch('app.get_recently_completed') as mock_completed, \
             patch('app.get_quick_stats') as mock_quick:
            
            # Mock authentication
            mock_verify.return_value = {
                'user_id': 'dashboard_user_123',
                'email': 'test@example.com'
            }
            
            # Mock dashboard data
            mock_stats.return_value = {'total_anime_watched': 5}
            mock_activity.return_value = [{'activity_type': 'completed'}]
            mock_items.return_value = [{'item_uid': 'anime_1'}]
            mock_completed.return_value = [{'item_uid': 'anime_2'}]
            mock_quick.return_value = {'total_items': 10}
            
            response = client.get(
                '/api/auth/dashboard',
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert 'user_stats' in data
            assert 'recent_activity' in data
            assert 'in_progress' in data
            assert 'completed_recently' in data
            assert 'plan_to_watch' in data
            assert 'on_hold' in data
            assert 'quick_stats' in data
    
    @pytest.mark.integration
    def test_dashboard_endpoint_unauthorized(self, client):
        """Test dashboard endpoint without authentication"""
        response = client.get('/api/auth/dashboard')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data


class TestDashboardPerformance:
    """Test suite for dashboard performance"""
    
    @pytest.mark.performance
    def test_dashboard_performance_large_dataset(self, client):
        """Test dashboard response time with many user items"""
        user_id = 'performance_user_123'
        
        # Mock large dataset (1000 items)
        large_dataset = []
        for i in range(1000):
            large_dataset.append({
                'item_uid': f'item_{i}',
                'status': 'completed' if i % 3 == 0 else 'watching',
                'rating': 8.0 if i % 2 == 0 else None
            })
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = large_dataset
            mock_get.return_value = mock_response
            
            start_time = time.time()
            stats = calculate_user_statistics_realtime(user_id)
            end_time = time.time()
            
            calculation_time = end_time - start_time
            
            # Should complete within reasonable time even with large dataset
            assert calculation_time < 5.0  # Less than 5 seconds
            assert stats is not None
    
    @pytest.mark.performance
    def test_cache_vs_realtime_performance(self, client):
        """Test performance difference between cached and real-time calculations"""
        user_id = 'cache_performance_user_123'
        
        # Mock cached data retrieval (should be fast)
        cached_stats = {
            'user_id': user_id,
            'total_anime_watched': 50,
            'updated_at': datetime.now().isoformat()
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = [cached_stats]
            mock_get.return_value = mock_response
            
            # Test cached retrieval time
            start_time = time.time()
            cached_result = get_cached_user_statistics(user_id)
            cached_time = time.time() - start_time
            
            assert cached_result is not None
            assert cached_time < 1.0  # Should be very fast
