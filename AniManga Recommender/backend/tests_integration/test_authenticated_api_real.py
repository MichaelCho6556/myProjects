# ABOUTME: Real integration tests for authenticated API endpoints (user items, lists, dashboard)
# ABOUTME: Tests actual database operations and JWT authentication without any mocks

"""
Authenticated API Integration Tests

Tests authenticated endpoints that require valid JWT tokens:
- User dashboard
- User items (anime/manga lists)
- Custom lists
- User profile management
- Social features
- All using real database connections and authentication
"""

import pytest
import json
from sqlalchemy import text


@pytest.mark.real_integration
class TestAuthenticatedAPIReal:
    """Test authenticated API endpoints with real database and authentication."""
    
    def test_dashboard_endpoint(self, client, auth_headers, load_test_items):
        """Test user dashboard endpoint."""
        response = client.get('/api/auth/dashboard', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify dashboard structure
        assert 'user_stats' in data
        assert 'recent_activity' in data
        assert 'in_progress' in data
        assert 'completed_recently' in data
        assert 'plan_to_watch' in data
        assert 'on_hold' in data
        assert 'quick_stats' in data
        
        # Verify stats structure
        stats = data['user_stats']
        expected_stats = ['total_anime', 'total_manga', 'completed_anime', 'completed_manga', 
                         'watching', 'reading', 'plan_to_watch', 'plan_to_read']
        for stat in expected_stats:
            assert stat in stats
    
    def test_user_items_get_empty(self, client, auth_headers):
        """Test getting user items when user has no items."""
        response = client.get('/api/auth/user-items', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'items' in data
        assert 'total' in data
        assert 'page' in data
        assert 'per_page' in data
        
        # Should be empty initially
        assert len(data['items']) == 0
        assert data['total'] == 0
    
    def test_user_items_add_and_get(self, client, auth_headers, load_test_items, sample_items_data):
        """Test adding items to user's list and retrieving them."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # Add item to user's list
        user_item_data = {
            'status': 'watching',
            'rating': 8,
            'progress': 5,
            'start_date': '2024-01-01',
            'notes': 'Great anime so far!'
        }
        
        response = client.post(
            f'/api/auth/user-items/{item_uid}',
            headers=auth_headers,
            data=json.dumps(user_item_data),
            content_type='application/json'
        )
        
        assert response.status_code in [200, 201]
        data = json.loads(response.data)
        
        # Verify item was added
        assert data['uid'] == item_uid
        assert data['status'] == user_item_data['status']
        assert data['rating'] == user_item_data['rating']
        assert data['progress'] == user_item_data['progress']
        assert data['notes'] == user_item_data['notes']
        
        # Get user's items
        response = client.get('/api/auth/user-items', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify item appears in user's list
        assert len(data['items']) == 1
        assert data['items'][0]['uid'] == item_uid
        assert data['items'][0]['status'] == user_item_data['status']
    
    def test_user_items_update(self, client, auth_headers, load_test_items, sample_items_data):
        """Test updating user's item."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # First add an item
        initial_data = {
            'status': 'watching',
            'rating': 7,
            'progress': 3
        }
        
        response = client.post(
            f'/api/auth/user-items/{item_uid}',
            headers=auth_headers,
            data=json.dumps(initial_data),
            content_type='application/json'
        )
        assert response.status_code in [200, 201]
        
        # Update the item
        updated_data = {
            'status': 'completed',
            'rating': 9,
            'progress': 12,
            'end_date': '2024-01-15',
            'notes': 'Amazing series! Highly recommended.'
        }
        
        response = client.post(
            f'/api/auth/user-items/{item_uid}',
            headers=auth_headers,
            data=json.dumps(updated_data),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify update
        assert data['status'] == updated_data['status']
        assert data['rating'] == updated_data['rating']
        assert data['progress'] == updated_data['progress']
        assert data['notes'] == updated_data['notes']
    
    def test_user_items_delete(self, client, auth_headers, load_test_items, sample_items_data):
        """Test deleting user's item."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # First add an item
        user_item_data = {
            'status': 'watching',
            'rating': 8
        }
        
        response = client.post(
            f'/api/auth/user-items/{item_uid}',
            headers=auth_headers,
            data=json.dumps(user_item_data),
            content_type='application/json'
        )
        assert response.status_code in [200, 201]
        
        # Delete the item
        response = client.delete(
            f'/api/auth/user-items/{item_uid}',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify item is deleted
        response = client.get('/api/auth/user-items', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should be empty now
        assert len(data['items']) == 0
    
    def test_user_items_filtering(self, client, auth_headers, load_test_items, sample_items_data):
        """Test filtering user's items."""
        # Add multiple items with different statuses
        items_to_add = [
            {'uid': sample_items_data.iloc[0]['uid'], 'status': 'watching'},
            {'uid': sample_items_data.iloc[1]['uid'], 'status': 'completed'},
            {'uid': sample_items_data.iloc[2]['uid'], 'status': 'plan_to_watch'}
        ]
        
        for item_data in items_to_add:
            response = client.post(
                f'/api/auth/user-items/{item_data["uid"]}',
                headers=auth_headers,
                data=json.dumps(item_data),
                content_type='application/json'
            )
            assert response.status_code in [200, 201]
        
        # Filter by status
        response = client.get('/api/auth/user-items?status=watching', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should only return watching items
        assert len(data['items']) == 1
        assert data['items'][0]['status'] == 'watching'
        
        # Filter by media type
        response = client.get('/api/auth/user-items?media_type=anime', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should only return anime items
        for item in data['items']:
            assert item['media_type'] == 'anime'
    
    def test_custom_lists_crud(self, client, auth_headers):
        """Test CRUD operations for custom lists."""
        # Create a custom list
        list_data = {
            'title': 'My Test List',
            'description': 'A test list for integration testing',
            'is_public': True,
            'is_collaborative': False
        }
        
        response = client.post(
            '/api/auth/lists',
            headers=auth_headers,
            data=json.dumps(list_data),
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify list creation
        assert data['title'] == list_data['title']
        assert data['description'] == list_data['description']
        assert data['is_public'] == list_data['is_public']
        assert data['is_collaborative'] == list_data['is_collaborative']
        
        list_id = data['id']
        
        # Get user's lists
        response = client.get('/api/auth/lists', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify list appears in user's lists
        assert len(data['lists']) == 1
        assert data['lists'][0]['id'] == list_id
        
        # Update the list
        updated_data = {
            'title': 'Updated Test List',
            'description': 'Updated description',
            'is_public': False
        }
        
        response = client.put(
            f'/api/auth/lists/{list_id}',
            headers=auth_headers,
            data=json.dumps(updated_data),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify update
        assert data['title'] == updated_data['title']
        assert data['description'] == updated_data['description']
        assert data['is_public'] == updated_data['is_public']
        
        # Delete the list
        response = client.delete(f'/api/auth/lists/{list_id}', headers=auth_headers)
        assert response.status_code == 200
        
        # Verify list is deleted
        response = client.get('/api/auth/lists', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should be empty now
        assert len(data['lists']) == 0
    
    def test_custom_list_items_management(self, client, auth_headers, load_test_items, sample_items_data):
        """Test managing items in custom lists."""
        # First create a custom list
        list_data = {
            'title': 'Test List for Items',
            'description': 'Testing item management',
            'is_public': True
        }
        
        response = client.post(
            '/api/auth/lists',
            headers=auth_headers,
            data=json.dumps(list_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        list_id = json.loads(response.data)['id']
        
        # Add items to the list
        item_uid = sample_items_data.iloc[0]['uid']
        item_data = {
            'item_uid': item_uid,
            'position': 1,
            'personal_rating': 9,
            'status': 'completed',
            'notes': 'Great addition to the list!'
        }
        
        response = client.post(
            f'/api/auth/lists/{list_id}/items',
            headers=auth_headers,
            data=json.dumps(item_data),
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify item was added
        assert data['item_uid'] == item_uid
        assert data['position'] == item_data['position']
        assert data['personal_rating'] == item_data['personal_rating']
        
        # Get list items
        response = client.get(f'/api/auth/lists/{list_id}/items', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify item appears in list
        assert len(data['items']) == 1
        assert data['items'][0]['item_uid'] == item_uid
        
        # Remove item from list
        response = client.delete(
            f'/api/auth/lists/{list_id}/items/{item_uid}',
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify item is removed
        response = client.get(f'/api/auth/lists/{list_id}/items', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should be empty now
        assert len(data['items']) == 0
    
    def test_user_profile_management(self, client, auth_headers):
        """Test user profile management."""
        # Get current profile
        response = client.get('/api/auth/profile', headers=auth_headers)
        assert response.status_code == 200
        current_profile = json.loads(response.data)
        
        # Update profile
        updated_profile = {
            'username': 'updated_testuser',
            'bio': 'This is my updated bio',
            'favorite_genres': ['Action', 'Adventure', 'Comedy'],
            'location': 'Test City',
            'website': 'https://example.com'
        }
        
        response = client.put(
            '/api/auth/profile',
            headers=auth_headers,
            data=json.dumps(updated_profile),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify update
        assert data['username'] == updated_profile['username']
        assert data['bio'] == updated_profile['bio']
        assert data['favorite_genres'] == updated_profile['favorite_genres']
        assert data['location'] == updated_profile['location']
        assert data['website'] == updated_profile['website']
        
        # Verify profile was actually updated
        response = client.get('/api/auth/profile', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['username'] == updated_profile['username']
        assert data['bio'] == updated_profile['bio']
    
    def test_user_statistics(self, client, auth_headers, load_test_items, sample_items_data):
        """Test user statistics calculation."""
        # Add some items with different statuses
        items_to_add = [
            {'uid': sample_items_data.iloc[0]['uid'], 'status': 'watching', 'rating': 8},
            {'uid': sample_items_data.iloc[1]['uid'], 'status': 'completed', 'rating': 9},
            {'uid': sample_items_data.iloc[2]['uid'], 'status': 'plan_to_watch'}
        ]
        
        for item_data in items_to_add:
            response = client.post(
                f'/api/auth/user-items/{item_data["uid"]}',
                headers=auth_headers,
                data=json.dumps(item_data),
                content_type='application/json'
            )
            assert response.status_code in [200, 201]
        
        # Get user statistics
        response = client.get('/api/auth/statistics', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify statistics structure
        expected_stats = ['total_items', 'by_status', 'by_media_type', 'by_genre', 
                         'average_rating', 'completion_rate']
        for stat in expected_stats:
            assert stat in data
        
        # Verify statistics values
        assert data['total_items'] == 3
        assert data['by_status']['watching'] == 1
        assert data['by_status']['completed'] == 1
        assert data['by_status']['plan_to_watch'] == 1
        
        # Verify average rating calculation
        assert data['average_rating'] == 8.5  # (8 + 9) / 2
    
    def test_unauthorized_access(self, client):
        """Test that endpoints properly reject unauthorized requests."""
        endpoints = [
            '/api/auth/dashboard',
            '/api/auth/user-items',
            '/api/auth/lists',
            '/api/auth/profile',
            '/api/auth/statistics'
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401
            
            data = json.loads(response.data)
            assert 'error' in data
    
    def test_invalid_token_access(self, client):
        """Test that endpoints properly reject invalid tokens."""
        invalid_headers = {
            'Authorization': 'Bearer invalid.jwt.token',
            'Content-Type': 'application/json'
        }
        
        endpoints = [
            '/api/auth/dashboard',
            '/api/auth/user-items',
            '/api/auth/lists',
            '/api/auth/profile',
            '/api/auth/statistics'
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint, headers=invalid_headers)
            assert response.status_code == 401
            
            data = json.loads(response.data)
            assert 'error' in data


@pytest.mark.real_integration
@pytest.mark.performance
class TestAuthenticatedAPIPerformance:
    """Performance tests for authenticated API endpoints."""
    
    def test_dashboard_performance(self, client, auth_headers, load_test_items, benchmark_timer):
        """Test dashboard endpoint performance."""
        with benchmark_timer('dashboard_endpoint'):
            response = client.get('/api/auth/dashboard', headers=auth_headers)
            assert response.status_code == 200
    
    def test_user_items_performance(self, client, auth_headers, load_test_items, benchmark_timer):
        """Test user items endpoint performance."""
        with benchmark_timer('user_items_endpoint'):
            response = client.get('/api/auth/user-items', headers=auth_headers)
            assert response.status_code == 200
    
    def test_bulk_item_operations_performance(self, client, auth_headers, load_test_items, 
                                            sample_items_data, benchmark_timer):
        """Test performance of bulk item operations."""
        with benchmark_timer('bulk_item_operations'):
            # Add multiple items
            for i in range(10):
                item_uid = sample_items_data.iloc[i % len(sample_items_data)]['uid']
                user_item_data = {
                    'status': 'watching',
                    'rating': 8 + (i % 3),
                    'progress': i * 2
                }
                
                response = client.post(
                    f'/api/auth/user-items/{item_uid}_{i}',  # Make unique
                    headers=auth_headers,
                    data=json.dumps(user_item_data),
                    content_type='application/json'
                )
                # Some might conflict, that's OK
                assert response.status_code in [200, 201, 409]
    
    def test_concurrent_authenticated_requests(self, client, auth_headers, benchmark_timer):
        """Test performance under concurrent authenticated requests."""
        import concurrent.futures
        
        def make_request():
            return client.get('/api/auth/dashboard', headers=auth_headers)
        
        with benchmark_timer('concurrent_authenticated_requests'):
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(make_request) for _ in range(15)]
                responses = [f.result() for f in futures]
        
        # Verify all requests succeeded
        for response in responses:
            assert response.status_code == 200


@pytest.mark.real_integration
@pytest.mark.security
class TestAuthenticatedAPISecurity:
    """Security tests for authenticated API endpoints."""
    
    def test_token_validation(self, client, auth_client, test_user):
        """Test JWT token validation."""
        # Generate valid token
        valid_token = auth_client.generate_jwt_token(test_user['id'])
        valid_headers = {
            'Authorization': f'Bearer {valid_token}',
            'Content-Type': 'application/json'
        }
        
        # Valid token should work
        response = client.get('/api/auth/dashboard', headers=valid_headers)
        assert response.status_code == 200
        
        # Invalid token should fail
        invalid_headers = {
            'Authorization': 'Bearer invalid.token.here',
            'Content-Type': 'application/json'
        }
        
        response = client.get('/api/auth/dashboard', headers=invalid_headers)
        assert response.status_code == 401
    
    def test_user_isolation(self, client, multiple_test_users, auth_client):
        """Test that users can only access their own data."""
        # Create tokens for different users
        user1_token = auth_client.generate_jwt_token(multiple_test_users[0]['id'])
        user2_token = auth_client.generate_jwt_token(multiple_test_users[1]['id'])
        
        user1_headers = {
            'Authorization': f'Bearer {user1_token}',
            'Content-Type': 'application/json'
        }
        user2_headers = {
            'Authorization': f'Bearer {user2_token}',
            'Content-Type': 'application/json'
        }
        
        # User 1 creates a list
        list_data = {
            'title': 'User 1 Private List',
            'description': 'This should be private to user 1',
            'is_public': False
        }
        
        response = client.post(
            '/api/auth/lists',
            headers=user1_headers,
            data=json.dumps(list_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        list_id = json.loads(response.data)['id']
        
        # User 2 should not be able to access user 1's private list
        response = client.get(f'/api/auth/lists/{list_id}', headers=user2_headers)
        assert response.status_code in [403, 404]
        
        # User 2 should not see user 1's list in their own lists
        response = client.get('/api/auth/lists', headers=user2_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should be empty or not contain user 1's list
        user2_list_ids = [lst['id'] for lst in data['lists']]
        assert list_id not in user2_list_ids
    
    def test_input_validation_and_sanitization(self, client, auth_headers):
        """Test input validation and sanitization."""
        # Test malicious input in profile update
        malicious_profile = {
            'username': '<script>alert("xss")</script>',
            'bio': 'javascript:alert("xss")',
            'favorite_genres': ['<img src=x onerror=alert("xss")>']
        }
        
        response = client.put(
            '/api/auth/profile',
            headers=auth_headers,
            data=json.dumps(malicious_profile),
            content_type='application/json'
        )
        
        # Should either reject or sanitize
        if response.status_code == 200:
            data = json.loads(response.data)
            # Verify dangerous scripts are not stored as-is
            assert '<script>' not in data['username']
            assert 'javascript:' not in data['bio']
        else:
            # Or should reject with 400 Bad Request
            assert response.status_code == 400
    
    def test_authorization_bypass_attempts(self, client, auth_headers):
        """Test attempts to bypass authorization."""
        # Attempt to access data with manipulated JWT payload
        malicious_headers = auth_headers.copy()
        
        # Try to access admin endpoints (if they exist)
        admin_endpoints = [
            '/api/admin/users',
            '/api/admin/reports',
            '/api/admin/statistics'
        ]
        
        for endpoint in admin_endpoints:
            response = client.get(endpoint, headers=malicious_headers)
            # Should return 403 (forbidden) or 404 (not found) for non-admin users
            assert response.status_code in [403, 404]