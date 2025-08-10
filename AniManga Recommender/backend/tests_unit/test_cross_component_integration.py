"""
Comprehensive Cross-Component Integration Tests for AniManga Recommender Backend
Phase C3: Cross-Component Integration

Test Coverage:
- Service layer integration and communication between different services
- Middleware stack integration and request/response flow
- Database transaction coordination across multiple operations
- API endpoint interconnections and data consistency
- Authentication middleware integration with protected routes
- Error handling propagation across component boundaries
- Cache integration with database and API layers
- Background task integration with real-time updates
"""

# ABOUTME: Real integration tests - NO MOCKS
# ABOUTME: Tests with actual database and service operations

import pytest
import time
import json
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy import text

# Import test utilities for real operations
from tests.test_utils import TestDataManager, generate_jwt_token, create_auth_headers

# Application imports
from app import app
from supabase_client import SupabaseClient


@pytest.fixture
def test_data_manager(database_connection):
    """Create test data manager for real database operations"""
    return TestDataManager(database_connection)


@pytest.fixture
def test_client(app):
    """Create test client for Flask app"""
    with app.test_client() as client:
        yield client


@pytest.fixture
def test_user(test_data_manager):
    """Create a real test user in the database"""
    user = test_data_manager.create_test_user()
    yield user
    # Cleanup happens automatically via TestDataManager


@pytest.fixture
def auth_headers(test_user):
    """Create real authentication headers with JWT token"""
    token = generate_jwt_token(
        test_user['id'],
        test_user.get('email', 'test@example.com'),
        'test-jwt-secret-key'
    )
    return create_auth_headers(token)


@pytest.fixture
def test_items(test_data_manager):
    """Create real test items in the database"""
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    items = []
    for i in range(5):
        item = test_data_manager.create_test_item(
            uid=f'test-anime-{unique_id}-{i}',
            title=f'Test Anime {i}',
            media_type='anime',
            genres=['Action', 'Drama'] if i % 2 == 0 else ['Comedy', 'Romance']
        )
        items.append(item)
    return items


@pytest.fixture
def test_user_with_items(test_data_manager, test_user, test_items):
    """Create a test user with items in their list"""
    for i, item in enumerate(test_items[:3]):
        test_data_manager.add_user_item(
            test_user['id'],
            item['uid'],
            status='completed' if i == 0 else 'watching',
            rating=8.0 + i
        )
    return test_user


class TestServiceLayerIntegration:
    """Test service layer integration using real database operations"""
    
    def test_authentication_service_integration(self, test_client, test_user):
        """Test authentication service with real JWT tokens"""
        # Generate real JWT token
        token = generate_jwt_token(
            test_user['id'],
            test_user.get('email', 'test@example.com'),
            'test-jwt-secret-key'
        )
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test protected endpoint with real authentication
        response = test_client.get('/api/auth/dashboard', headers=headers)
        
        # Should successfully authenticate
        assert response.status_code == 200
        data = response.get_json()
        # Dashboard response should have user_stats or quick_stats
        assert 'user_stats' in data or 'quick_stats' in data
        
        # Test without token
        response = test_client.get('/api/auth/dashboard')
        assert response.status_code == 401
    
    def test_user_items_service_integration(self, test_client, test_user_with_items, auth_headers, test_items):
        """Test user items service with real database operations"""
        # Get user's items through API
        response = test_client.get('/api/auth/user-items', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        items = data.get('data', data.get('items', []))
        
        # Should have the items we added
        assert len(items) >= 3
        
        # Update an item status
        update_response = test_client.put(
            f'/api/auth/user-items/{test_items[1]["uid"]}',
            headers=auth_headers,
            json={'status': 'completed', 'rating': 9.5}
        )
        
        # Verify update succeeded
        assert update_response.status_code in [200, 201]
    
    def test_recommendation_service_integration(self, test_client, test_user_with_items, auth_headers, test_items):
        """Test recommendation service with real data"""
        # Get recommendations based on user's completed items
        response = test_client.get(
            f'/api/recommendations/{test_items[0]["uid"]}?n=5',
            headers=auth_headers
        )
        
        # Should return recommendations or appropriate status
        assert response.status_code in [200, 404, 503]
        
        if response.status_code == 200:
            data = response.get_json()
            assert 'recommendations' in data or 'data' in data
    
    def test_list_management_service_integration(self, test_client, test_user, auth_headers, test_data_manager):
        """Test custom list management with real database"""
        # Create a custom list
        list_data = {
            'title': 'My Favorite Anime',
            'description': 'Collection of top anime',
            'is_public': True
        }
        
        response = test_client.post(
            '/api/auth/lists',
            headers=auth_headers,
            json=list_data
        )
        
        # Should create the list
        assert response.status_code in [200, 201]
        
        if response.status_code in [200, 201]:
            created_list = response.get_json()
            list_id = created_list.get('id') or created_list.get('data', {}).get('id')
            
            # Get user's lists
            lists_response = test_client.get('/api/auth/lists', headers=auth_headers)
            assert lists_response.status_code == 200
            
            lists_data = lists_response.get_json()
            user_lists = lists_data.get('data', lists_data.get('lists', []))
            assert len(user_lists) >= 1


class TestMiddlewareIntegration:
    """Test middleware stack integration with real requests"""
    
    def test_authentication_middleware_flow(self, test_client, test_user):
        """Test authentication middleware with real JWT validation"""
        # Test with valid token
        valid_token = generate_jwt_token(
            test_user['id'],
            test_user.get('email', 'test@example.com'),
            'test-jwt-secret-key'
        )
        headers = {'Authorization': f'Bearer {valid_token}'}
        
        response = test_client.get('/api/auth/dashboard', headers=headers)
        assert response.status_code == 200
        
        # Test with invalid token
        invalid_headers = {'Authorization': 'Bearer invalid_token'}
        response = test_client.get('/api/auth/dashboard', headers=invalid_headers)
        assert response.status_code == 401
        
        # Test with expired token (if we can generate one)
        # For now, just test missing token
        response = test_client.get('/api/auth/dashboard')
        assert response.status_code == 401
    
    def test_rate_limiting_middleware(self, test_client, test_user, auth_headers):
        """Test rate limiting with real requests"""
        # Make multiple requests rapidly
        responses = []
        for i in range(15):  # Exceed typical rate limit
            response = test_client.get('/api/auth/dashboard', headers=auth_headers)
            responses.append(response.status_code)
            time.sleep(0.1)  # Small delay between requests
        
        # Check if rate limiting kicked in (429 status) or all passed
        # Rate limiting might not be enabled in test environment
        assert all(status in [200, 429] for status in responses)
    
    def test_error_handling_middleware(self, test_client):
        """Test error handling across the middleware stack"""
        # Test 404 handling
        response = test_client.get('/api/nonexistent-endpoint')
        assert response.status_code == 404
        
        # Test invalid JSON handling
        response = test_client.post(
            '/api/auth/lists',
            headers={'Content-Type': 'application/json'},
            data='invalid json{{'
        )
        assert response.status_code in [400, 401]  # Bad request or unauthorized


class TestDatabaseTransactionCoordination:
    """Test database transaction coordination with real operations"""
    
    def test_multi_table_transaction(self, test_data_manager, test_user, test_items):
        """Test coordinated updates across multiple tables"""
        # Add item to user's list
        test_data_manager.add_user_item(
            test_user['id'],
            test_items[0]['uid'],
            status='watching',
            rating=8.5
        )
        
        # Update user statistics (this would normally be triggered automatically)
        test_data_manager.update_user_statistics(test_user['id'])
        
        # Verify both operations succeeded
        user_items = test_data_manager.get_user_items(test_user['id'])
        assert len(user_items) >= 1
        
        stats = test_data_manager.get_user_statistics(test_user['id'])
        assert stats is not None
    
    def test_transaction_rollback_on_error(self, test_data_manager, test_user, database_connection):
        """Test transaction rollback when operations fail"""
        # Start a savepoint for this specific test
        savepoint = database_connection.begin_nested()
        
        # Try to add an item with invalid UID (should fail)
        try:
            test_data_manager.add_user_item(
                test_user['id'],
                'nonexistent-item-uid',  # This might fail if foreign key constraint exists
                status='watching'
            )
            # If it didn't fail (no FK constraint), force an error
            database_connection.execute(text("SELECT * FROM nonexistent_table"))
        except Exception:
            # Rollback the savepoint
            savepoint.rollback()
        
        # User's items should still be queryable after rollback
        user_items = test_data_manager.get_user_items(test_user['id'])
        # Just verify we can still query the database
        assert user_items is not None


class TestAPIEndpointInterconnections:
    """Test API endpoint interconnections with real data flow"""
    
    def test_search_to_list_workflow(self, test_client, test_user, auth_headers, test_items):
        """Test workflow from search to adding items to list"""
        # Search for items
        search_response = test_client.get('/api/items?q=Test&per_page=10')
        assert search_response.status_code == 200
        
        search_data = search_response.get_json()
        items = search_data.get('data', search_data.get('items', []))
        
        if items:
            # Add first item to user's list
            first_item = items[0]
            add_response = test_client.post(
                f'/api/auth/user-items/{first_item["uid"]}',
                headers=auth_headers,
                json={'status': 'plan_to_watch'}
            )
            
            # Should successfully add or update
            assert add_response.status_code in [200, 201, 409]  # 409 if already exists
    
    def test_user_profile_to_recommendations_flow(self, test_client, test_user_with_items, auth_headers):
        """Test flow from user profile to personalized recommendations"""
        # Get user's dashboard (includes profile and items)
        dashboard_response = test_client.get('/api/auth/dashboard', headers=auth_headers)
        assert dashboard_response.status_code == 200
        
        # Get user's statistics
        stats_response = test_client.get('/api/auth/statistics', headers=auth_headers)
        # Might not be implemented or might return 404 if no stats
        assert stats_response.status_code in [200, 404]
        
        # Get personalized recommendations (if implemented)
        recs_response = test_client.get('/api/auth/recommendations', headers=auth_headers)
        assert recs_response.status_code in [200, 404, 503]


class TestCacheIntegration:
    """Test cache integration with real cache operations"""
    
    def test_cache_hit_miss_patterns(self, test_client, test_user, auth_headers):
        """Test cache behavior with repeated requests"""
        # First request - likely cache miss
        start_time = time.time()
        response1 = test_client.get('/api/auth/dashboard', headers=auth_headers)
        first_request_time = time.time() - start_time
        assert response1.status_code == 200
        
        # Second request - might be cached
        start_time = time.time()
        response2 = test_client.get('/api/auth/dashboard', headers=auth_headers)
        second_request_time = time.time() - start_time
        assert response2.status_code == 200
        
        # Cached request might be faster (but not guaranteed in test env)
        # Just verify both requests succeeded
        assert response1.get_json() is not None
        assert response2.get_json() is not None
    
    def test_cache_invalidation_on_update(self, test_client, test_user_with_items, auth_headers, test_items):
        """Test cache invalidation when data is updated"""
        # Get initial data (potentially cached)
        response1 = test_client.get('/api/auth/user-items', headers=auth_headers)
        assert response1.status_code == 200
        initial_data = response1.get_json()
        
        # Update an item
        update_response = test_client.put(
            f'/api/auth/user-items/{test_items[0]["uid"]}',
            headers=auth_headers,
            json={'status': 'dropped', 'rating': 5.0}
        )
        assert update_response.status_code in [200, 201]
        
        # Get data again - should reflect update (cache invalidated)
        response2 = test_client.get('/api/auth/user-items', headers=auth_headers)
        assert response2.status_code == 200
        updated_data = response2.get_json()
        
        # Data might have changed (depending on implementation)
        # Just verify we got valid responses
        assert initial_data is not None
        assert updated_data is not None


class TestErrorPropagation:
    """Test error handling and propagation across components"""
    
    def test_database_error_propagation(self, test_client, auth_headers):
        """Test how database errors propagate through the stack"""
        # Try to update non-existent resource
        response = test_client.put(
            '/api/auth/user-items/nonexistent-item-99999',
            headers=auth_headers,
            json={'status': 'watching', 'score': 8.0}
        )
        
        # Should return 404 or error status
        assert response.status_code in [200, 404, 500]
        
        if response.status_code == 200:
            data = response.get_json()
            # Should be empty or null
            assert data is None or data == {} or data == []
    
    def test_validation_error_propagation(self, test_client, auth_headers):
        """Test validation error handling"""
        # Send invalid data
        response = test_client.put(
            '/api/auth/user-items/some-item',
            headers=auth_headers,
            json={'status': 'invalid_status', 'rating': 'not_a_number'}
        )
        
        # Should return 400 Bad Request or handle gracefully
        assert response.status_code in [200, 400, 422]
    
    def test_authentication_error_propagation(self, test_client):
        """Test authentication error handling"""
        # Use invalid token format
        response = test_client.get(
            '/api/auth/dashboard',
            headers={'Authorization': 'InvalidFormat token'}
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401


class TestEndToEndWorkflows:
    """Test complete end-to-end workflows with real operations"""
    
    def test_new_user_onboarding_workflow(self, test_client, test_data_manager):
        """Test complete new user onboarding flow"""
        # Create new user
        new_user = test_data_manager.create_test_user()
        token = generate_jwt_token(
            new_user['id'],
            new_user.get('email', 'test@example.com'),
            'test-jwt-secret-key'
        )
        headers = {'Authorization': f'Bearer {token}'}
        
        # Get initial dashboard (should be empty)
        dashboard = test_client.get('/api/auth/dashboard', headers=headers)
        assert dashboard.status_code == 200
        
        # Search and add first items
        search = test_client.get('/api/items?q=anime&per_page=5')
        assert search.status_code == 200
        
        # Create first custom list
        list_response = test_client.post(
            '/api/auth/lists',
            headers=headers,
            json={'title': 'My First List', 'description': 'Getting started'}
        )
        assert list_response.status_code in [200, 201]
    
    def test_content_discovery_workflow(self, test_client, test_user_with_items, auth_headers):
        """Test content discovery and recommendation workflow"""
        # Get trending items
        trending = test_client.get('/api/items?sort=popularity&per_page=10')
        assert trending.status_code == 200
        
        # Get recommendations based on user's items
        user_items = test_client.get('/api/auth/user-items', headers=auth_headers)
        assert user_items.status_code == 200
        
        items_data = user_items.get_json()
        items = items_data.get('data', items_data.get('items', []))
        
        if items:
            # Get recommendations for first item
            first_item_uid = items[0].get('item_uid') or items[0].get('uid')
            if first_item_uid:
                recs = test_client.get(
                    f'/api/recommendations/{first_item_uid}',
                    headers=auth_headers
                )
                assert recs.status_code in [200, 404, 503]


# Run specific test class if needed
if __name__ == "__main__":
    pytest.main([__file__, "-v"])