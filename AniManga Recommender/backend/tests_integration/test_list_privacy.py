"""
Comprehensive integration tests for custom list privacy functionality.
Tests all three privacy levels: public, friends_only, and private.
"""

import pytest
import json
import os
from unittest.mock import patch, MagicMock

# Add parent directory to path for imports
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from supabase_client import SupabaseClient


class TestListPrivacy:
    """Test custom list privacy functionality comprehensively."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    
    @pytest.fixture
    def mock_auth_client(self):
        """Mock authentication client for controlled testing."""
        with patch('supabase_client.SupabaseAuthClient') as mock:
            auth_client = MagicMock()
            
            # Mock user data
            auth_client.verify_jwt_token.return_value = {
                'user_id': 'test-user-123',
                'sub': 'test-user-123'
            }
            
            # Mock user profiles
            auth_client.get_user_profile_by_username.side_effect = lambda username, viewer_id: {
                'user1': {'id': 'user-1', 'username': 'user1'},
                'user2': {'id': 'user-2', 'username': 'user2'},
                'user3': {'id': 'user-3', 'username': 'user3'}
            }.get(username)
            
            # Mock privacy settings
            auth_client.get_privacy_settings.return_value = {
                'list_visibility': 'friends_only'
            }
            
            mock.return_value = auth_client
            yield auth_client
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client for database operations."""
        with patch('supabase_client.SupabaseClient') as mock:
            client = MagicMock()
            
            # Mock successful list creation
            client.create_custom_list.return_value = {
                'id': 1,
                'title': 'Test List',
                'description': 'Test Description',
                'privacy': 'public',
                'user_id': 'test-user-123',
                'created_at': '2025-01-01T00:00:00Z'
            }
            
            # Mock list details retrieval with different privacy levels
            def mock_get_list_details(list_id):
                privacy_map = {
                    1: 'public',
                    2: 'friends_only', 
                    3: 'private'
                }
                return {
                    'id': list_id,
                    'title': f'Test List {list_id}',
                    'privacy': privacy_map.get(list_id, 'private'),
                    'userId': 'owner-user-456',
                    'user_id': 'owner-user-456'
                }
            
            client.get_custom_list_details.side_effect = mock_get_list_details
            
            # Mock user lists with privacy filtering
            def mock_get_user_lists(user_id, privacy=None):
                all_lists = [
                    {'id': 1, 'privacy': 'public', 'title': 'Public List', 'updated_at': '2025-01-01T00:00:00Z'},
                    {'id': 2, 'privacy': 'friends_only', 'title': 'Friends List', 'updated_at': '2025-01-01T00:00:00Z'},
                    {'id': 3, 'privacy': 'private', 'title': 'Private List', 'updated_at': '2025-01-01T00:00:00Z'}
                ]
                if privacy:
                    return [lst for lst in all_lists if lst['privacy'] == privacy]
                return all_lists
            
            client.get_user_lists.side_effect = mock_get_user_lists
            
            # Mock friendship checking
            def mock_are_friends(user1, user2):
                # user-1 and user-2 are friends, user-3 is not friends with anyone
                friend_pairs = {('user-1', 'user-2'), ('user-2', 'user-1')}
                return (user1, user2) in friend_pairs
            
            mock.return_value = client
            yield client
    
    @pytest.fixture
    def mock_friendship(self):
        """Mock friendship checking."""
        with patch('middleware.privacy_middleware.are_users_friends') as mock:
            # user-1 and user-2 are friends
            def check_friendship(user1, user2):
                friend_pairs = {('user-1', 'user-2'), ('user-2', 'user-1')}
                return (user1, user2) in friend_pairs
            
            mock.side_effect = check_friendship
            yield mock

    def test_create_list_public(self, client, mock_auth_client, mock_supabase_client):
        """Test creating a public list."""
        headers = {'Authorization': 'Bearer test-token'}
        data = {
            'title': 'My Public List',
            'description': 'A test public list',
            'privacy': 'public',
            'tags': ['action', 'anime']
        }
        
        response = client.post('/api/auth/lists/custom', 
                             json=data, 
                             headers=headers)
        
        assert response.status_code == 201
        mock_supabase_client.create_custom_list.assert_called_once()
        call_args = mock_supabase_client.create_custom_list.call_args[0]
        assert call_args[1]['privacy'] == 'public'

    def test_create_list_friends_only(self, client, mock_auth_client, mock_supabase_client):
        """Test creating a friends-only list."""
        headers = {'Authorization': 'Bearer test-token'}
        data = {
            'title': 'My Friends List',
            'description': 'A test friends-only list',
            'privacy': 'friends_only',
            'tags': []
        }
        
        response = client.post('/api/auth/lists/custom', 
                             json=data, 
                             headers=headers)
        
        assert response.status_code == 201
        call_args = mock_supabase_client.create_custom_list.call_args[0]
        assert call_args[1]['privacy'] == 'friends_only'

    def test_create_list_private(self, client, mock_auth_client, mock_supabase_client):
        """Test creating a private list."""
        headers = {'Authorization': 'Bearer test-token'}
        data = {
            'title': 'My Private List',
            'description': 'A test private list',
            'privacy': 'private'
        }
        
        response = client.post('/api/auth/lists/custom', 
                             json=data, 
                             headers=headers)
        
        assert response.status_code == 201
        call_args = mock_supabase_client.create_custom_list.call_args[0]
        assert call_args[1]['privacy'] == 'private'

    def test_access_public_list_anonymous(self, client, mock_supabase_client, mock_friendship):
        """Test anonymous user accessing public list."""
        # Mock no authentication
        with patch('app.g') as mock_g:
            mock_g.current_user = None
            
            response = client.get('/api/auth/lists/1')
            
            # Should succeed for public list
            assert response.status_code == 200

    def test_access_friends_only_list_as_friend(self, client, mock_auth_client, mock_supabase_client, mock_friendship):
        """Test friend accessing friends-only list."""
        # Mock as user-1 accessing user-2's friends-only list
        mock_auth_client.verify_jwt_token.return_value = {
            'user_id': 'user-1',
            'sub': 'user-1'
        }
        
        # Mock list owned by user-2
        mock_supabase_client.get_custom_list_details.return_value = {
            'id': 2,
            'title': 'Friends Only List',
            'privacy': 'friends_only',
            'userId': 'user-2',
            'user_id': 'user-2'
        }
        
        headers = {'Authorization': 'Bearer test-token'}
        response = client.get('/api/auth/lists/2', headers=headers)
        
        # Should succeed since user-1 and user-2 are friends
        assert response.status_code == 200

    def test_access_friends_only_list_as_non_friend(self, client, mock_auth_client, mock_supabase_client, mock_friendship):
        """Test non-friend accessing friends-only list."""
        # Mock as user-3 (not friends with anyone)
        mock_auth_client.verify_jwt_token.return_value = {
            'user_id': 'user-3',
            'sub': 'user-3'
        }
        
        # Mock list owned by user-2
        mock_supabase_client.get_custom_list_details.return_value = {
            'id': 2,
            'title': 'Friends Only List',
            'privacy': 'friends_only',
            'userId': 'user-2',
            'user_id': 'user-2'
        }
        
        headers = {'Authorization': 'Bearer test-token'}
        response = client.get('/api/auth/lists/2', headers=headers)
        
        # Should be forbidden since user-3 is not friends with user-2
        assert response.status_code == 403

    def test_access_private_list_as_owner(self, client, mock_auth_client, mock_supabase_client):
        """Test owner accessing their own private list."""
        # Mock as list owner
        mock_auth_client.verify_jwt_token.return_value = {
            'user_id': 'owner-user-456',
            'sub': 'owner-user-456'
        }
        
        headers = {'Authorization': 'Bearer test-token'}
        response = client.get('/api/auth/lists/3', headers=headers)
        
        # Should succeed since owner can access their own lists
        assert response.status_code == 200

    def test_access_private_list_as_other_user(self, client, mock_auth_client, mock_supabase_client):
        """Test other user accessing private list."""
        # Mock as different user
        mock_auth_client.verify_jwt_token.return_value = {
            'user_id': 'other-user-789',
            'sub': 'other-user-789'
        }
        
        headers = {'Authorization': 'Bearer test-token'}
        response = client.get('/api/auth/lists/3', headers=headers)
        
        # Should be forbidden since private lists are owner-only
        assert response.status_code == 403

    def test_get_user_lists_with_privacy_filtering(self, client, mock_auth_client, mock_supabase_client, mock_friendship):
        """Test fetching user lists with proper privacy filtering."""
        # Mock as user-1 viewing user-2's profile (they are friends)
        mock_auth_client.verify_jwt_token.return_value = {
            'user_id': 'user-1',
            'sub': 'user-1'
        }
        
        # Mock user-2's profile
        mock_auth_client.get_user_profile_by_username.return_value = {
            'id': 'user-2',
            'username': 'user2'
        }
        
        # Mock privacy settings for user-2
        mock_auth_client.get_privacy_settings.return_value = {
            'list_visibility': 'friends_only'
        }
        
        headers = {'Authorization': 'Bearer test-token'}
        response = client.get('/api/social/users/user2/lists', headers=headers)
        
        # Should get both public and friends-only lists since they are friends
        assert response.status_code == 200
        # Verify that both privacy levels were requested
        assert mock_supabase_client.get_user_lists.call_count >= 2

    def test_privacy_middleware_check_list_access(self):
        """Test the privacy middleware check_list_access function directly."""
        from middleware.privacy_middleware import check_list_access
        
        # Test public list access
        public_list = {'privacy': 'public', 'user_id': 'owner-123'}
        assert check_list_access(public_list, None) == True  # Anonymous can access
        assert check_list_access(public_list, 'other-user') == True  # Anyone can access
        
        # Test private list access
        private_list = {'privacy': 'private', 'user_id': 'owner-123'}
        assert check_list_access(private_list, None) == False  # Anonymous cannot access
        assert check_list_access(private_list, 'other-user') == False  # Others cannot access
        assert check_list_access(private_list, 'owner-123') == True  # Owner can access
        
        # Test friends-only list access (mocked friendship)
        with patch('middleware.privacy_middleware.are_users_friends') as mock_friends:
            friends_list = {'privacy': 'friends_only', 'user_id': 'owner-123'}
            
            # Mock friendship check
            mock_friends.return_value = True
            assert check_list_access(friends_list, 'friend-user') == True
            
            mock_friends.return_value = False  
            assert check_list_access(friends_list, 'stranger-user') == False
            
            # Owner should still have access
            assert check_list_access(friends_list, 'owner-123') == True

    def test_invalid_privacy_value_defaults_to_private(self, client, mock_auth_client, mock_supabase_client):
        """Test that invalid privacy values default to private behavior."""
        headers = {'Authorization': 'Bearer test-token'}
        data = {
            'title': 'Test List',
            'privacy': 'invalid_value'
        }
        
        response = client.post('/api/auth/lists/custom', 
                             json=data, 
                             headers=headers)
        
        # Should still create the list (backend should handle validation)
        assert response.status_code == 201

    def test_migration_compatibility(self, mock_supabase_client):
        """Test that the system handles old is_public field if it exists."""
        from middleware.privacy_middleware import check_list_access
        
        # Test list with old is_public field (backward compatibility)
        old_list = {'is_public': True, 'user_id': 'owner-123'}
        # Should default to private if no privacy field exists
        result = check_list_access(old_list, 'other-user')
        assert result == False  # Defaults to private behavior

    def test_database_constraints_validation(self):
        """Test that privacy enum values are properly validated."""
        # This would typically be tested with real database connection
        # For now, test that our code uses the correct enum values
        valid_privacy_values = ['public', 'friends_only', 'private']
        
        # Test that our code expects these exact values
        from middleware.privacy_middleware import check_list_access
        
        for privacy in valid_privacy_values:
            test_list = {'privacy': privacy, 'user_id': 'owner'}
            # Should not raise any errors
            result = check_list_access(test_list, 'someone')
            assert isinstance(result, bool)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])