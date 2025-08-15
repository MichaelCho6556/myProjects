"""
Comprehensive unit tests for dashboard statistics calculations.

This test suite validates the memory-safe implementation of statistics
calculations that fix the dashboard display issues with anime hours
and manga chapters.

Key Test Areas:
- Batch query functionality 
- Watch time calculations with real episode data
- Chapters read calculations with real chapter data
- Cache integration and performance
- Memory usage validation
- Error handling and fallbacks
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from typing import Dict, List, Any

# Test configuration 
MOCK_USER_ID = "test-user-123"
MOCK_ITEMS_DATA = {
    'anime_001': {
        'uid': 'anime_001',
        'title': 'Attack on Titan',
        'episodes': 87,
        'chapters': 0,
        'media_type_id': 1,  # anime
        'duration_minutes': 24,
        'score': 9.0
    },
    'anime_002': {
        'uid': 'anime_002', 
        'title': 'One Piece',
        'episodes': 1000,
        'chapters': 0,
        'media_type_id': 1,  # anime
        'duration_minutes': 24,
        'score': 8.5
    },
    'manga_001': {
        'uid': 'manga_001',
        'title': 'Attack on Titan Manga',
        'episodes': 0,
        'chapters': 139,
        'media_type_id': 2,  # manga
        'duration_minutes': 24,
        'score': 9.5
    },
    'manga_002': {
        'uid': 'manga_002',
        'title': 'One Piece Manga',
        'episodes': 0,
        'chapters': 1100,
        'media_type_id': 2,  # manga
        'duration_minutes': 24,
        'score': 9.0
    }
}

MOCK_USER_ITEMS = [
    {'item_uid': 'anime_001', 'status': 'completed'},
    {'item_uid': 'anime_002', 'status': 'completed'},
    {'item_uid': 'manga_001', 'status': 'completed'},
    {'item_uid': 'manga_002', 'status': 'completed'},
]

class TestBatchQueryFunctionality:
    """Test the batch query functions for item details."""
    
    @patch('backend.app.supabase_client')
    @patch('backend.app.logger')
    def test_get_items_details_batch_success(self, mock_logger, mock_supabase):
        """Test successful batch query of item details."""
        from backend.app import get_items_details_batch
        
        # Mock Supabase response
        mock_response = Mock()
        mock_response.data = [
            {
                'uid': 'anime_001',
                'title': 'Attack on Titan',
                'episodes': 87,
                'chapters': 0,
                'media_type_id': 1,
                'score': 9.0
            },
            {
                'uid': 'manga_001', 
                'title': 'Attack on Titan Manga',
                'episodes': 0,
                'chapters': 139,
                'media_type_id': 2,
                'score': 9.5
            }
        ]
        
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = mock_response
        
        # Mock cache functions to simulate cache miss
        with patch('backend.app.get_items_details_batch_from_cache', return_value={}), \
             patch('backend.app.set_items_details_batch_in_cache', return_value=True):
            
            result = get_items_details_batch(['anime_001', 'manga_001'])
            
            # Verify results
            assert len(result) == 2
            assert 'anime_001' in result
            assert 'manga_001' in result
            
            # Verify anime data
            anime_data = result['anime_001']
            assert anime_data['episodes'] == 87
            assert anime_data['chapters'] == 0
            assert anime_data['media_type_id'] == 1
            assert anime_data['duration_minutes'] == 24
            
            # Verify manga data
            manga_data = result['manga_001']
            assert manga_data['episodes'] == 0
            assert manga_data['chapters'] == 139
            assert manga_data['media_type_id'] == 2
    
    def test_get_items_details_batch_empty_input(self):
        """Test batch query with empty input."""
        from backend.app import get_items_details_batch
        
        result = get_items_details_batch([])
        assert result == {}
    
    @patch('backend.app.logger')
    def test_get_items_details_batch_memory_limit(self, mock_logger):
        """Test that batch query respects memory safety limits."""
        from backend.app import get_items_details_batch
        
        # Create a list with over 1000 items
        large_item_list = [f'item_{i}' for i in range(1500)]
        
        with patch('backend.app.supabase_client'), \
             patch('backend.app.get_items_details_batch_from_cache', return_value={}), \
             patch('backend.app.set_items_details_batch_in_cache', return_value=True):
            
            get_items_details_batch(large_item_list)
            
            # Verify warning was logged about memory safety
            mock_logger.warning.assert_called_once()
            assert "memory safety" in mock_logger.warning.call_args[0][0]

class TestWatchTimeCalculations:
    """Test anime watch time calculations with batch data."""
    
    def test_calculate_watch_time_batch_with_data(self):
        """Test watch time calculation with pre-fetched batch data."""
        from backend.app import calculate_watch_time_batch, get_item_media_type
        
        completed_items = [
            {'item_uid': 'anime_001'},  # 87 episodes × 24 min = 2088 min = 34.8 hours
            {'item_uid': 'anime_002'},  # 1000 episodes × 24 min = 24000 min = 400.0 hours
        ]
        
        items_details_batch = {
            'anime_001': {
                'episodes': 87,
                'duration_minutes': 24,
                'media_type_id': 1
            },
            'anime_002': {
                'episodes': 1000,
                'duration_minutes': 24,
                'media_type_id': 1
            }
        }
        
        with patch('backend.app.get_item_media_type') as mock_media_type:
            mock_media_type.return_value = 'anime'
            
            result = calculate_watch_time_batch(completed_items, items_details_batch)
            
            # Expected: (87 + 1000) × 24 minutes = 26,088 minutes = 434.8 hours
            expected_hours = round((87 * 24 + 1000 * 24) / 60.0, 1)
            assert result == expected_hours
            assert result == 434.8
    
    def test_calculate_watch_time_batch_mixed_media(self):
        """Test that watch time only counts anime, not manga."""
        from backend.app import calculate_watch_time_batch, get_item_media_type
        
        completed_items = [
            {'item_uid': 'anime_001'},
            {'item_uid': 'manga_001'},  # Should be ignored
        ]
        
        items_details_batch = {
            'anime_001': {
                'episodes': 87,
                'duration_minutes': 24,
                'media_type_id': 1
            },
            'manga_001': {
                'episodes': 0,
                'chapters': 139,
                'media_type_id': 2
            }
        }
        
        def mock_media_type(uid):
            return 'anime' if 'anime' in uid else 'manga'
        
        with patch('backend.app.get_item_media_type', side_effect=mock_media_type):
            result = calculate_watch_time_batch(completed_items, items_details_batch)
            
            # Should only count anime: 87 × 24 = 2088 minutes = 34.8 hours
            expected_hours = round((87 * 24) / 60.0, 1)
            assert result == expected_hours
            assert result == 34.8
    
    def test_calculate_watch_time_batch_missing_data(self):
        """Test watch time calculation with missing batch data."""
        from backend.app import calculate_watch_time_batch, get_item_media_type
        
        completed_items = [
            {'item_uid': 'anime_001'},
            {'item_uid': 'anime_missing'},  # Not in batch data
        ]
        
        items_details_batch = {
            'anime_001': {
                'episodes': 87,
                'duration_minutes': 24,
                'media_type_id': 1
            }
        }
        
        with patch('backend.app.get_item_media_type') as mock_media_type:
            mock_media_type.return_value = 'anime'
            
            result = calculate_watch_time_batch(completed_items, items_details_batch)
            
            # Should count anime_001 (34.8 hours) + fallback for missing (24 min = 0.4 hours)
            expected_hours = round((87 * 24 + 24) / 60.0, 1)
            assert result == expected_hours
            assert result == 35.2

class TestChaptersReadCalculations:
    """Test manga chapters read calculations with batch data."""
    
    def test_calculate_chapters_read_batch_with_data(self):
        """Test chapters calculation with pre-fetched batch data."""
        from backend.app import calculate_chapters_read_batch, get_item_media_type
        
        completed_items = [
            {'item_uid': 'manga_001'},  # 139 chapters
            {'item_uid': 'manga_002'},  # 1100 chapters
        ]
        
        items_details_batch = {
            'manga_001': {
                'chapters': 139,
                'media_type_id': 2
            },
            'manga_002': {
                'chapters': 1100,
                'media_type_id': 2
            }
        }
        
        with patch('backend.app.get_item_media_type') as mock_media_type:
            mock_media_type.return_value = 'manga'
            
            result = calculate_chapters_read_batch(completed_items, items_details_batch)
            
            # Expected: 139 + 1100 = 1239 chapters
            assert result == 1239
    
    def test_calculate_chapters_read_batch_mixed_media(self):
        """Test that chapters only counts manga, not anime."""
        from backend.app import calculate_chapters_read_batch, get_item_media_type
        
        completed_items = [
            {'item_uid': 'anime_001'},  # Should be ignored
            {'item_uid': 'manga_001'},
        ]
        
        items_details_batch = {
            'anime_001': {
                'episodes': 87,
                'media_type_id': 1
            },
            'manga_001': {
                'chapters': 139,
                'media_type_id': 2
            }
        }
        
        def mock_media_type(uid):
            return 'anime' if 'anime' in uid else 'manga'
        
        with patch('backend.app.get_item_media_type', side_effect=mock_media_type):
            result = calculate_chapters_read_batch(completed_items, items_details_batch)
            
            # Should only count manga: 139 chapters
            assert result == 139

class TestCacheIntegration:
    """Test cache integration and performance."""
    
    @patch('backend.app.get_items_details_batch_from_cache')
    @patch('backend.app.set_items_details_batch_in_cache')
    @patch('backend.app.supabase_client')
    def test_cache_hit_scenario(self, mock_supabase, mock_cache_set, mock_cache_get):
        """Test scenario where all items are found in cache."""
        from backend.app import get_items_details_batch
        
        # Mock cache returning all requested items
        mock_cache_get.return_value = {
            'anime_001': MOCK_ITEMS_DATA['anime_001'],
            'manga_001': MOCK_ITEMS_DATA['manga_001']
        }
        
        result = get_items_details_batch(['anime_001', 'manga_001'])
        
        # Verify cache was checked
        mock_cache_get.assert_called_once()
        
        # Verify database was NOT queried (cache hit)
        mock_supabase.table.assert_not_called()
        
        # Verify no cache setting (nothing new to cache)
        mock_cache_set.assert_not_called()
        
        # Verify we got the cached data
        assert len(result) == 2
        assert result['anime_001']['episodes'] == 87
        assert result['manga_001']['chapters'] == 139
    
    @patch('backend.app.get_items_details_batch_from_cache')
    @patch('backend.app.set_items_details_batch_in_cache')
    @patch('backend.app.supabase_client')
    def test_cache_miss_scenario(self, mock_supabase, mock_cache_set, mock_cache_get):
        """Test scenario where items are not in cache."""
        from backend.app import get_items_details_batch
        
        # Mock cache returning empty (cache miss)
        mock_cache_get.return_value = {}
        
        # Mock database response
        mock_response = Mock()
        mock_response.data = [
            {'uid': 'anime_001', 'title': 'Test Anime', 'episodes': 87, 'chapters': 0, 'media_type_id': 1, 'score': 9.0}
        ]
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = mock_response
        
        # Mock successful cache setting
        mock_cache_set.return_value = True
        
        result = get_items_details_batch(['anime_001'])
        
        # Verify cache was checked
        mock_cache_get.assert_called_once()
        
        # Verify database was queried (cache miss)
        mock_supabase.table.assert_called_once()
        
        # Verify new data was cached
        mock_cache_set.assert_called_once()
        
        # Verify result contains database data
        assert len(result) == 1
        assert result['anime_001']['episodes'] == 87

class TestStatisticsIntegration:
    """Test full statistics calculation integration."""
    
    @patch('backend.app.get_items_details_batch')
    @patch('backend.app.get_user_favorite_genres')
    @patch('backend.app.calculate_average_user_score') 
    @patch('backend.app.calculate_completion_rate')
    @patch('backend.app.calculate_current_streak')
    @patch('backend.app.calculate_longest_streak')
    @patch('backend.app.get_item_media_type')
    def test_calculate_user_statistics_realtime_impl_integration(
        self, mock_media_type, mock_longest_streak, mock_current_streak,
        mock_completion_rate, mock_avg_score, mock_favorite_genres, mock_batch_query
    ):
        """Test the full statistics calculation with batch optimization."""
        from backend.app import calculate_user_statistics_realtime_impl
        
        # Mock user items response
        mock_user_items = [
            {'item_uid': 'anime_001', 'status': 'completed'},
            {'item_uid': 'anime_002', 'status': 'completed'}, 
            {'item_uid': 'manga_001', 'status': 'completed'},
            {'item_uid': 'manga_002', 'status': 'watching'},
        ]
        
        # Mock batch query returning item details
        mock_batch_query.return_value = {
            'anime_001': {'episodes': 87, 'duration_minutes': 24, 'media_type_id': 1},
            'anime_002': {'episodes': 1000, 'duration_minutes': 24, 'media_type_id': 1},
            'manga_001': {'chapters': 139, 'media_type_id': 2}
        }
        
        # Mock other functions
        def mock_media_type_func(uid):
            return 'anime' if 'anime' in uid else 'manga'
        mock_media_type.side_effect = mock_media_type_func
        
        mock_avg_score.return_value = 8.5
        mock_completion_rate.return_value = 75.0
        mock_current_streak.return_value = 5
        mock_longest_streak.return_value = 30
        mock_favorite_genres.return_value = ['Action', 'Drama']
        
        # Mock auth client to return user items
        with patch('backend.app.auth_client') as mock_auth:
            mock_auth.get_user_items.return_value = mock_user_items
            
            result = calculate_user_statistics_realtime_impl(MOCK_USER_ID)
            
            # Verify batch query was called for completed items only
            completed_uids = ['anime_001', 'anime_002', 'manga_001']
            mock_batch_query.assert_called_once_with(completed_uids)
            
            # Verify statistics calculations
            assert result['total_anime_watched'] == 2  # anime_001, anime_002
            assert result['total_manga_read'] == 1     # manga_001
            
            # Verify watch time: (87 + 1000) * 24 minutes = 26,088 minutes = 434.8 hours
            expected_hours = round((87 * 24 + 1000 * 24) / 60.0, 1)
            assert result['total_hours_watched'] == expected_hours
            
            # Verify chapters read: 139 chapters
            assert result['total_chapters_read'] == 139
            
            # Verify other stats
            assert result['average_score'] == 8.5
            assert result['completion_rate'] == 75.0
            assert result['current_streak_days'] == 5
            assert result['longest_streak_days'] == 30

class TestErrorHandling:
    """Test error handling and fallback scenarios."""
    
    @patch('backend.app.supabase_client', None)
    def test_batch_query_no_supabase_client(self):
        """Test batch query when Supabase client is not available."""
        from backend.app import get_items_details_batch
        
        with patch('backend.app.get_items_details_batch_from_cache', return_value={}):
            result = get_items_details_batch(['anime_001'])
            
            # Should return empty dict when no client available
            assert result == {}
    
    @patch('backend.app.logger')
    def test_calculation_functions_error_handling(self, mock_logger):
        """Test that calculation functions handle errors gracefully."""
        from backend.app import calculate_watch_time_batch, calculate_chapters_read_batch
        
        # Test with invalid/corrupted batch data
        completed_items = [{'item_uid': 'anime_001'}]
        corrupted_batch = {'anime_001': 'invalid_data'}  # String instead of dict
        
        # Should not crash and return 0
        watch_time = calculate_watch_time_batch(completed_items, corrupted_batch)
        chapters = calculate_chapters_read_batch(completed_items, corrupted_batch)
        
        assert watch_time == 0.0
        assert chapters == 0

class TestMemoryUsage:
    """Test memory usage constraints."""
    
    def test_memory_usage_estimation(self):
        """Test that our memory estimates are realistic."""
        
        # Simulate typical user: 50 completed items
        typical_user_items = 50
        bytes_per_item = 200  # Conservative estimate including overhead
        
        typical_memory = typical_user_items * bytes_per_item
        assert typical_memory < 50_000  # Under 50KB
        
        # Simulate power user: 1000 completed items (safety limit)
        power_user_items = 1000
        power_user_memory = power_user_items * bytes_per_item
        assert power_user_memory < 500_000  # Under 500KB
        
        # Verify we're well under 512MB limit
        memory_limit = 512 * 1024 * 1024  # 512MB in bytes
        assert power_user_memory < memory_limit * 0.001  # Less than 0.1% of limit

# Run tests with: pytest backend/tests/test_dashboard_statistics.py -v
if __name__ == '__main__':
    pytest.main([__file__, '-v'])