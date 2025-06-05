"""
Comprehensive User Item Management Tests for AniManga Recommender
Phase A3: User Item Management Testing

Test Coverage:
- Adding items to user lists with various statuses
- Updating item status, progress, rating, notes
- Removing items from user lists
- Input validation for ratings, progress, dates
- Status change workflow validation
- Progress auto-calculation for completed items
- Activity logging for item changes
- Cache invalidation on updates
- Edge cases and error handling
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
    app, get_user_items, update_user_item_status, remove_user_item,
    get_user_items_by_status_route, log_user_activity, 
    invalidate_user_statistics_cache, get_item_details_simple
)
from supabase_client import SupabaseAuthClient


class TestUserItemAddition:
    """Test suite for adding items to user lists"""
    
    @pytest.mark.unit
    def test_add_new_item_to_list(self, client):
        """Test adding a new anime/manga to user's list"""
        item_uid = 'anime_new_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details, \
             patch('supabase_client.SupabaseAuthClient.update_user_item_status_comprehensive') as mock_update, \
             patch('app.invalidate_user_statistics_cache') as mock_invalidate, \
             patch('app.log_user_activity') as mock_log:
            
            # Mock authentication
            mock_verify.return_value = {'user_id': 'user_123', 'email': 'test@example.com'}
            
            # Mock item details
            mock_details.return_value = {
                'uid': item_uid,
                'title': 'Test Anime',
                'media_type': 'anime',
                'episodes': 24
            }
            
            # Mock successful update
            mock_update.return_value = {'success': True, 'data': {'id': 1}}
            mock_invalidate.return_value = True
            mock_log.return_value = True
            
            response = client.post(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={
                    'status': 'plan_to_watch',
                    'progress': 0,
                    'rating': None,
                    'notes': 'Looks interesting'
                }
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            
            # Verify cache invalidation and activity logging
            mock_invalidate.assert_called_once()
            mock_log.assert_called_once()
    
    @pytest.mark.unit
    def test_add_item_with_invalid_rating(self, client):
        """Test adding item with invalid rating values"""
        item_uid = 'anime_invalid_rating_123'
        
        test_cases = [
            {'rating': -1, 'error': 'Rating must be between 0 and 10'},
            {'rating': 11, 'error': 'Rating must be between 0 and 10'},
            {'rating': 'invalid', 'error': 'Rating must be a valid number'}
        ]
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details:
            
            mock_verify.return_value = {'user_id': 'user_123', 'email': 'test@example.com'}
            mock_details.return_value = {'uid': item_uid, 'title': 'Test'}
            
            for case in test_cases:
                response = client.post(
                    f'/api/auth/user-items/{item_uid}',
                    headers={'Authorization': 'Bearer valid_token'},
                    json={
                        'status': 'completed',
                        'rating': case['rating']
                    }
                )
                
                assert response.status_code == 400
                data = json.loads(response.data)
                assert case['error'] in data['error']
    
    @pytest.mark.unit
    def test_add_nonexistent_item(self, client):
        """Test adding item that doesn't exist in database"""
        item_uid = 'nonexistent_item_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details:
            
            mock_verify.return_value = {'user_id': 'user_123', 'email': 'test@example.com'}
            mock_details.return_value = None  # Item not found
            
            response = client.post(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={'status': 'plan_to_watch'}
            )
            
            assert response.status_code == 404
            data = json.loads(response.data)
            assert 'Item not found' in data['error']


class TestUserItemUpdates:
    """Test suite for updating user items"""
    
    @pytest.mark.unit
    def test_update_item_status_basic(self, client):
        """Test basic status update (plan_to_watch -> watching)"""
        item_uid = 'anime_update_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details, \
             patch('supabase_client.SupabaseAuthClient.update_user_item_status_comprehensive') as mock_update, \
             patch('app.invalidate_user_statistics_cache') as mock_invalidate, \
             patch('app.log_user_activity') as mock_log:
            
            mock_verify.return_value = {'user_id': 'user_123'}
            mock_details.return_value = {
                'uid': item_uid,
                'media_type': 'anime',
                'episodes': 12
            }
            mock_update.return_value = {'success': True}
            
            response = client.put(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={
                    'status': 'watching',
                    'progress': 5,
                    'notes': 'Really enjoying this!'
                }
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
    
    @pytest.mark.unit
    def test_update_item_completion_auto_progress(self, client):
        """Test auto-setting progress when marking as completed"""
        item_uid = 'anime_completion_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details, \
             patch('supabase_client.SupabaseAuthClient.update_user_item_status_comprehensive') as mock_update, \
             patch('app.invalidate_user_statistics_cache'), \
             patch('app.log_user_activity'):
            
            mock_verify.return_value = {'user_id': 'user_123'}
            mock_details.return_value = {
                'uid': item_uid,
                'media_type': 'anime',
                'episodes': 24
            }
            mock_update.return_value = {'success': True}
            
            # Test with progress=0 initially - should auto-set to episodes count
            response = client.put(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={
                    'status': 'completed',
                    'progress': 0,  # Should be auto-set to 24
                    'rating': 9.5
                }
            )
            
            assert response.status_code == 200
            
            # Verify that update was called with auto-calculated progress
            call_args = mock_update.call_args[0]
            status_data = call_args[2]  # Third argument is status_data
            assert status_data['progress'] == 24
    
    @pytest.mark.unit
    def test_update_item_rating_validation_and_rounding(self, client):
        """Test rating validation and decimal rounding"""
        item_uid = 'anime_rating_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details, \
             patch('supabase_client.SupabaseAuthClient.update_user_item_status_comprehensive') as mock_update, \
             patch('app.invalidate_user_statistics_cache'), \
             patch('app.log_user_activity'):
            
            mock_verify.return_value = {'user_id': 'user_123'}
            mock_details.return_value = {'uid': item_uid, 'media_type': 'anime'}
            mock_update.return_value = {'success': True}
            
            # Test rating rounding (8.67 should become 8.7)
            response = client.put(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={
                    'status': 'completed',
                    'rating': 8.67  # Should be rounded to 8.7
                }
            )
            
            assert response.status_code == 200
            
            # Verify rounding occurred
            call_args = mock_update.call_args[0]
            status_data = call_args[2]
            assert status_data['rating'] == 8.7
    
    @pytest.mark.unit
    def test_update_manga_chapters_progress(self, client):
        """Test updating manga with chapters progress"""
        item_uid = 'manga_chapters_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details, \
             patch('supabase_client.SupabaseAuthClient.update_user_item_status_comprehensive') as mock_update, \
             patch('app.invalidate_user_statistics_cache'), \
             patch('app.log_user_activity'):
            
            mock_verify.return_value = {'user_id': 'user_123'}
            mock_details.return_value = {
                'uid': item_uid,
                'media_type': 'manga',
                'chapters': 150
            }
            mock_update.return_value = {'success': True}
            
            # Mark as completed with 0 progress - should auto-set to chapters count
            response = client.put(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={
                    'status': 'completed',
                    'progress': 0  # Should auto-set to 150
                }
            )
            
            assert response.status_code == 200
            
            # Verify chapters were auto-set
            call_args = mock_update.call_args[0]
            status_data = call_args[2]
            assert status_data['progress'] == 150
    
    @pytest.mark.unit
    def test_update_with_completion_date(self, client):
        """Test updating item with custom completion date"""
        item_uid = 'anime_date_123'
        completion_date = '2024-01-15'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details, \
             patch('supabase_client.SupabaseAuthClient.update_user_item_status_comprehensive') as mock_update, \
             patch('app.invalidate_user_statistics_cache'), \
             patch('app.log_user_activity'):
            
            mock_verify.return_value = {'user_id': 'user_123'}
            mock_details.return_value = {'uid': item_uid, 'media_type': 'anime'}
            mock_update.return_value = {'success': True}
            
            response = client.put(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={
                    'status': 'completed',
                    'completion_date': completion_date,
                    'rating': 8.5
                }
            )
            
            assert response.status_code == 200
            
            # Verify completion date was included
            call_args = mock_update.call_args[0]
            status_data = call_args[2]
            assert status_data['completion_date'] == completion_date


class TestUserItemRetrieval:
    """Test suite for retrieving user items"""
    
    @pytest.mark.integration
    def test_get_all_user_items(self, client):
        """Test retrieving all user items with enrichment"""
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('supabase_client.SupabaseAuthClient.get_user_items') as mock_get_items, \
             patch('app.get_item_details_simple') as mock_details:
            
            mock_verify.return_value = {'user_id': 'user_123'}
            
            # Mock user items from database
            mock_user_items = [
                {
                    'item_uid': 'anime_1',
                    'status': 'completed',
                    'progress': 24,
                    'rating': 9.0
                },
                {
                    'item_uid': 'manga_1',
                    'status': 'reading',
                    'progress': 50,
                    'rating': None
                }
            ]
            mock_get_items.return_value = mock_user_items
            
            # Mock item details enrichment
            def mock_details_side_effect(item_uid):
                if item_uid == 'anime_1':
                    return {'uid': 'anime_1', 'title': 'Test Anime', 'media_type': 'anime'}
                elif item_uid == 'manga_1':
                    return {'uid': 'manga_1', 'title': 'Test Manga', 'media_type': 'manga'}
                return None
            
            mock_details.side_effect = mock_details_side_effect
            
            response = client.get(
                '/api/auth/user-items',
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert len(data) == 2
            assert data[0]['item']['title'] == 'Test Anime'
            assert data[1]['item']['title'] == 'Test Manga'
    
    @pytest.mark.integration
    def test_get_user_items_filtered_by_status(self, client):
        """Test retrieving user items filtered by status"""
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('supabase_client.SupabaseAuthClient.get_user_items') as mock_get_items, \
             patch('app.get_item_details_simple') as mock_details:
            
            mock_verify.return_value = {'user_id': 'user_123'}
            
            # Mock filtered items (only completed)
            mock_user_items = [
                {
                    'item_uid': 'anime_1',
                    'status': 'completed',
                    'rating': 9.0
                }
            ]
            mock_get_items.return_value = mock_user_items
            mock_details.return_value = {'uid': 'anime_1', 'title': 'Completed Anime'}
            
            response = client.get(
                '/api/auth/user-items?status=completed',
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert len(data) == 1
            assert data[0]['status'] == 'completed'
            
            # Verify that get_user_items was called with status filter
            mock_get_items.assert_called_with('user_123', 'completed')
    
    @pytest.mark.integration
    def test_get_user_items_by_status_route(self, client):
        """Test the dedicated by-status route"""
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_user_items_by_status') as mock_get_by_status:
            
            mock_verify.return_value = {'user_id': 'user_123'}
            
            mock_items = [
                {'item_uid': 'anime_1', 'status': 'watching'},
                {'item_uid': 'anime_2', 'status': 'watching'}
            ]
            mock_get_by_status.return_value = mock_items
            
            response = client.get(
                '/api/auth/user-items/by-status/watching',
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['count'] == 2
            assert len(data['items']) == 2
            assert all(item['status'] == 'watching' for item in data['items'])
    
    @pytest.mark.integration
    def test_get_user_items_data_integrity(self, client):
        """Test handling of items with missing details (data integrity)"""
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('supabase_client.SupabaseAuthClient.get_user_items') as mock_get_items, \
             patch('app.get_item_details_simple') as mock_details:
            
            mock_verify.return_value = {'user_id': 'user_123'}
            
            # Mock user items where one has missing details
            mock_user_items = [
                {'item_uid': 'anime_valid', 'status': 'completed'},
                {'item_uid': 'anime_missing', 'status': 'watching'},  # This one will have no details
                {'item_uid': 'anime_valid_2', 'status': 'plan_to_watch'}
            ]
            mock_get_items.return_value = mock_user_items
            
            def mock_details_side_effect(item_uid):
                if item_uid == 'anime_missing':
                    return None  # Missing details
                return {'uid': item_uid, 'title': f'Title for {item_uid}'}
            
            mock_details.side_effect = mock_details_side_effect
            
            response = client.get(
                '/api/auth/user-items',
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Should only return 2 items (skipping the one with missing details)
            assert len(data) == 2
            item_uids = [item['item_uid'] for item in data]
            assert 'anime_valid' in item_uids
            assert 'anime_valid_2' in item_uids
            assert 'anime_missing' not in item_uids


class TestUserItemRemoval:
    """Test suite for removing items from user lists"""
    
    @pytest.mark.unit
    def test_remove_item_success(self, client):
        """Test successfully removing item from user's list"""
        item_uid = 'anime_remove_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('requests.delete') as mock_delete:
            
            mock_verify.return_value = {'user_id': 'user_123'}
            
            # Mock successful deletion
            mock_response = Mock()
            mock_response.status_code = 204
            mock_delete.return_value = mock_response
            
            response = client.delete(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'Item removed successfully' in data['message']
    
    @pytest.mark.unit
    def test_remove_item_failure(self, client):
        """Test handling removal failure"""
        item_uid = 'anime_remove_fail_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('requests.delete') as mock_delete:
            
            mock_verify.return_value = {'user_id': 'user_123'}
            
            # Mock failed deletion
            mock_response = Mock()
            mock_response.status_code = 500
            mock_delete.return_value = mock_response
            
            response = client.delete(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'Failed to remove item' in data['error']
    
    @pytest.mark.unit
    def test_remove_nonexistent_item(self, client):
        """Test removing item that doesn't exist in user's list"""
        item_uid = 'nonexistent_item_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('requests.delete') as mock_delete:
            
            mock_verify.return_value = {'user_id': 'user_123'}
            
            # Mock 204 response even for non-existent items (Supabase behavior)
            mock_response = Mock()
            mock_response.status_code = 204
            mock_delete.return_value = mock_response
            
            response = client.delete(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'Item removed successfully' in data['message']


class TestSupabaseClientItemMethods:
    """Test suite for Supabase client item management methods"""
    
    @pytest.mark.unit
    def test_update_user_item_status_comprehensive(self):
        """Test comprehensive status update in Supabase client"""
        # Create mock auth client
        auth_client = SupabaseAuthClient(
            'http://test-url',
            'test-key',
            'test-service-key'
        )
        
        user_id = 'user_123'
        item_uid = 'anime_123'
        status_data = {
            'status': 'completed',
            'progress': 24,
            'rating': 8.5,
            'notes': 'Great anime!',
            'completion_date': '2024-01-15'
        }
        
        with patch('requests.get') as mock_get, \
             patch('requests.patch') as mock_patch:
            
            # Mock existing record check
            mock_get_response = Mock()
            mock_get_response.status_code = 200
            mock_get_response.json.return_value = [{'id': 1, 'status': 'watching'}]
            mock_get.return_value = mock_get_response
            
            # Mock successful update
            mock_patch_response = Mock()
            mock_patch_response.status_code = 200
            mock_patch_response.json.return_value = {'id': 1, 'status': 'completed'}
            mock_patch_response.content = b'{"id": 1}'
            mock_patch.return_value = mock_patch_response
            
            result = auth_client.update_user_item_status_comprehensive(
                user_id, item_uid, status_data
            )
            
            assert result['success'] == True
            
            # Verify the data sent to Supabase
            call_args = mock_patch.call_args
            sent_data = call_args[1]['json']
            
            assert sent_data['status'] == 'completed'
            assert sent_data['progress'] == 24
            assert sent_data['rating'] == 8.5  # Should be kept as is (already valid)
            assert sent_data['notes'] == 'Great anime!'
            assert sent_data['completion_date'] == '2024-01-15'
    
    @pytest.mark.unit
    def test_update_user_item_rating_validation(self):
        """Test rating validation in Supabase client"""
        auth_client = SupabaseAuthClient(
            'http://test-url',
            'test-key',
            'test-service-key'
        )
        
        # Test invalid rating values
        test_cases = [
            {'rating': -1, 'should_fail': True},
            {'rating': 11, 'should_fail': True},
            {'rating': 'invalid', 'should_fail': True},
            {'rating': 8.67, 'should_fail': False, 'expected': 8.7},
            {'rating': 10, 'should_fail': False, 'expected': 10.0}
        ]
        
        for case in test_cases:
            status_data = {
                'status': 'completed',
                'rating': case['rating']
            }
            
            try:
                with patch('requests.get'), patch('requests.patch'):
                    # Mock existing record
                    mock_get_response = Mock()
                    mock_get_response.json.return_value = []
                    
                    result = auth_client.update_user_item_status_comprehensive(
                        'user_123', 'item_123', status_data
                    )
                    
                    if case['should_fail']:
                        assert result is None  # Should fail validation
                    else:
                        # Should pass and round properly
                        assert result is not None
                        
            except ValueError:
                assert case['should_fail']  # Expected failure
    
    @pytest.mark.unit
    def test_get_user_items_filtering(self):
        """Test user items retrieval with status filtering"""
        auth_client = SupabaseAuthClient(
            'http://test-url',
            'test-key',
            'test-service-key'
        )
        
        user_id = 'user_123'
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {'item_uid': 'anime_1', 'status': 'completed'},
                {'item_uid': 'anime_2', 'status': 'completed'}
            ]
            mock_get.return_value = mock_response
            
            # Test without status filter
            items = auth_client.get_user_items(user_id)
            
            assert len(items) == 2
            
            # Verify request was made with correct parameters
            call_args = mock_get.call_args
            params = call_args[1]['params']
            assert params['user_id'] == f'eq.{user_id}'
            assert 'status' not in params
            
            # Test with status filter
            items_filtered = auth_client.get_user_items(user_id, 'completed')
            
            call_args = mock_get.call_args
            params = call_args[1]['params']
            assert params['status'] == 'eq.completed'


class TestUserItemWorkflows:
    """Test suite for complete user item workflows"""
    
    @pytest.mark.integration
    def test_complete_item_workflow(self, client):
        """Test complete workflow: add -> update -> complete -> remove"""
        item_uid = 'workflow_anime_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details, \
             patch('supabase_client.SupabaseAuthClient.update_user_item_status_comprehensive') as mock_update, \
             patch('app.invalidate_user_statistics_cache'), \
             patch('app.log_user_activity'), \
             patch('requests.delete') as mock_delete:
            
            mock_verify.return_value = {'user_id': 'workflow_user_123'}
            mock_details.return_value = {
                'uid': item_uid,
                'media_type': 'anime',
                'episodes': 12
            }
            mock_update.return_value = {'success': True}
            
            # Step 1: Add to plan_to_watch
            response = client.post(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={'status': 'plan_to_watch'}
            )
            assert response.status_code == 200
            
            # Step 2: Start watching
            response = client.put(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={'status': 'watching', 'progress': 3}
            )
            assert response.status_code == 200
            
            # Step 3: Update progress
            response = client.put(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={'status': 'watching', 'progress': 8}
            )
            assert response.status_code == 200
            
            # Step 4: Complete with rating
            response = client.put(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'},
                json={
                    'status': 'completed',
                    'progress': 0,  # Should auto-set to 12
                    'rating': 9.2
                }
            )
            assert response.status_code == 200
            
            # Step 5: Remove from list
            mock_delete_response = Mock()
            mock_delete_response.status_code = 204
            mock_delete.return_value = mock_delete_response
            
            response = client.delete(
                f'/api/auth/user-items/{item_uid}',
                headers={'Authorization': 'Bearer valid_token'}
            )
            assert response.status_code == 200
    
    @pytest.mark.integration
    def test_batch_status_changes(self, client):
        """Test handling multiple rapid status changes"""
        item_uid = 'batch_anime_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details, \
             patch('supabase_client.SupabaseAuthClient.update_user_item_status_comprehensive') as mock_update, \
             patch('app.invalidate_user_statistics_cache'), \
             patch('app.log_user_activity'):
            
            mock_verify.return_value = {'user_id': 'batch_user_123'}
            mock_details.return_value = {
                'uid': item_uid,
                'media_type': 'anime',
                'episodes': 24
            }
            mock_update.return_value = {'success': True}
            
            # Rapid status changes
            statuses = ['plan_to_watch', 'watching', 'on_hold', 'watching', 'completed']
            
            for status in statuses:
                response = client.put(
                    f'/api/auth/user-items/{item_uid}',
                    headers={'Authorization': 'Bearer valid_token'},
                    json={'status': status}
                )
                assert response.status_code == 200
            
            # Verify all calls were made successfully
            assert mock_update.call_count == len(statuses)


class TestItemManagementAuthentication:
    """Test suite for authentication in item management"""
    
    @pytest.mark.unit
    def test_item_operations_require_auth(self, client):
        """Test that all item operations require authentication"""
        item_uid = 'auth_test_123'
        
        # Test endpoints without authorization header
        endpoints = [
            ('GET', '/api/auth/user-items'),
            ('POST', f'/api/auth/user-items/{item_uid}'),
            ('PUT', f'/api/auth/user-items/{item_uid}'),
            ('DELETE', f'/api/auth/user-items/{item_uid}'),
            ('GET', '/api/auth/user-items/by-status/watching')
        ]
        
        for method, endpoint in endpoints:
            response = client.open(method=method, path=endpoint)
            assert response.status_code == 401
    
    @pytest.mark.unit
    def test_item_operations_invalid_token(self, client):
        """Test item operations with invalid authentication token"""
        item_uid = 'invalid_auth_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify:
            mock_verify.side_effect = ValueError('Invalid token')
            
            response = client.get(
                '/api/auth/user-items',
                headers={'Authorization': 'Bearer invalid_token'}
            )
            
            assert response.status_code == 401
            data = json.loads(response.data)
            assert 'Invalid token' in data['error']


class TestItemManagementPerformance:
    """Test suite for item management performance"""
    
    @pytest.mark.performance
    def test_user_items_retrieval_performance(self, client):
        """Test performance of retrieving large user item lists"""
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('supabase_client.SupabaseAuthClient.get_user_items') as mock_get_items, \
             patch('app.get_item_details_simple') as mock_details:
            
            mock_verify.return_value = {'user_id': 'performance_user_123'}
            
            # Mock large dataset (500 items)
            large_user_items = []
            for i in range(500):
                large_user_items.append({
                    'item_uid': f'item_{i}',
                    'status': 'completed' if i % 3 == 0 else 'watching'
                })
            
            mock_get_items.return_value = large_user_items
            mock_details.side_effect = lambda uid: {'uid': uid, 'title': f'Title {uid}'}
            
            start_time = time.time()
            response = client.get(
                '/api/auth/user-items',
                headers={'Authorization': 'Bearer valid_token'}
            )
            end_time = time.time()
            
            response_time = end_time - start_time
            
            assert response.status_code == 200
            assert response_time < 10.0  # Should complete within 10 seconds
            
            data = json.loads(response.data)
            assert len(data) == 500
    
    @pytest.mark.performance
    def test_rapid_status_updates_performance(self, client):
        """Test performance of rapid consecutive status updates"""
        item_uid = 'rapid_update_123'
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token') as mock_verify, \
             patch('app.get_item_details_simple') as mock_details, \
             patch('supabase_client.SupabaseAuthClient.update_user_item_status_comprehensive') as mock_update, \
             patch('app.invalidate_user_statistics_cache'), \
             patch('app.log_user_activity'):
            
            mock_verify.return_value = {'user_id': 'rapid_user_123'}
            mock_details.return_value = {'uid': item_uid, 'media_type': 'anime'}
            mock_update.return_value = {'success': True}
            
            # Perform 50 rapid updates
            start_time = time.time()
            
            for i in range(50):
                response = client.put(
                    f'/api/auth/user-items/{item_uid}',
                    headers={'Authorization': 'Bearer valid_token'},
                    json={'status': 'watching', 'progress': i}
                )
                assert response.status_code == 200
            
            end_time = time.time()
            total_time = end_time - start_time
            avg_time_per_update = total_time / 50
            
            # Each update should complete quickly
            assert avg_time_per_update < 0.5  # Less than 0.5 seconds per update
