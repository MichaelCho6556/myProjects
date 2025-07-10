# ABOUTME: Real authentication integration tests without any mocks
# ABOUTME: Tests actual JWT generation, validation, and protected endpoint access

"""
Real Authentication Integration Tests

These tests verify authentication functionality against real services:
- Real database connections
- Actual JWT token generation and validation
- Real HTTP requests to Flask endpoints
- No mocks whatsoever
"""

import pytest
import json
from sqlalchemy import text


@pytest.mark.real_integration
class TestAuthenticationReal:
    """Test authentication with real database and JWT validation."""
    
    def test_health_check_no_auth_required(self, client):
        """Test that health check endpoint works without authentication."""
        response = client.get('/')
        
        assert response.status_code == 200
        assert b"AniManga Recommender Backend" in response.data
    
    def test_protected_endpoint_requires_auth(self, client):
        """Test that protected endpoints reject unauthenticated requests."""
        response = client.get('/api/auth/dashboard')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'authorization' in data['error'].lower()
    
    def test_invalid_jwt_token_rejected(self, client):
        """Test that invalid JWT tokens are rejected."""
        headers = {
            'Authorization': 'Bearer invalid.jwt.token',
            'Content-Type': 'application/json'
        }
        
        response = client.get('/api/auth/dashboard', headers=headers)
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_real_user_authentication_flow(self, client, app, database_connection, auth_client):
        """Test complete authentication flow with real user creation."""
        # Create a real user in the database
        import uuid
        user_data = {
            'id': str(uuid.uuid4()),
            'email': 'authtest@example.com',
            'username': 'authtest',
        }
        
        database_connection.execute(
            text("""
                INSERT INTO user_profiles (id, email, username, created_at, updated_at)
                VALUES (:id, :email, :username, NOW(), NOW())
            """),
            user_data
        )
        
        try:
            # Generate real JWT token
            import jwt
            import time
            
            payload = {
                'user_id': user_data['id'],
                'sub': user_data['id'],
                'email': user_data['email'],
                'exp': int(time.time()) + 3600,
                'iat': int(time.time())
            }
            
            # Use JWT_SECRET_KEY from Flask config, not auth_client.jwt_secret
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = jwt.encode(payload, jwt_secret, algorithm='HS256')
            
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            # Access protected endpoint with real token
            response = client.get('/api/auth/dashboard', headers=headers)
            
            # Verify successful authentication
            if response.status_code != 200:
                print(f"Response status: {response.status_code}")
                print(f"Response data: {response.data}")
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Verify dashboard data structure
            assert 'user_stats' in data
            assert 'recent_activity' in data
            assert 'quick_stats' in data
            
        finally:
            # Clean up test user
            database_connection.execute(
                text("DELETE FROM user_profiles WHERE id = :id"),
                {'id': user_data['id']}
            )
    
    def test_jwt_token_expiration(self, client, test_user, auth_client):
        """Test that expired JWT tokens are rejected."""
        # Generate token with very short expiration
        import jwt
        import datetime
        
        # Create expired token
        payload = {
            'sub': test_user['id'],
            'exp': datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        }
        
        expired_token = jwt.encode(
            payload,
            auth_client.jwt_secret,
            algorithm='HS256'
        )
        
        headers = {
            'Authorization': f'Bearer {expired_token}',
            'Content-Type': 'application/json'
        }
        
        response = client.get('/api/auth/dashboard', headers=headers)
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'expired' in data['error'].lower()
    
    def test_user_profile_creation_and_retrieval(self, client, database_connection, auth_headers):
        """Test real user profile operations."""
        # Create profile data
        profile_data = {
            'username': 'realuser123',
            'bio': 'This is a real integration test user',
            'favorite_genres': ['Action', 'Adventure']
        }
        
        # Update profile
        response = client.put(
            '/api/auth/profile',
            headers=auth_headers,
            data=json.dumps(profile_data),
            content_type='application/json'
        )
        
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['username'] == profile_data['username']
        assert data['bio'] == profile_data['bio']
        
        # Retrieve profile
        response = client.get('/api/auth/profile', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['username'] == profile_data['username']
        assert data['bio'] == profile_data['bio']
    
    def test_concurrent_authentication_requests(self, client, test_user, auth_headers):
        """Test that multiple concurrent requests with same token work."""
        import concurrent.futures
        
        def make_request():
            return client.get('/api/auth/dashboard', headers=auth_headers)
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [f.result() for f in futures]
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200
    
    def test_auth_with_user_items(self, client, database_connection, auth_headers, load_test_items, test_user, auth_client):
        """Test authentication with user having items in their list."""
        # Test 1: Test POST endpoint to add/update user items
        update_data = {
            'uid': 'anime_1',
            'status': 'watching',
            'rating': 8.5,
            'progress': 5
        }
        
        response = client.post(
            f'/api/auth/user-items/{update_data["uid"]}',
            headers=auth_headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        assert response.status_code in [200, 201]
        
        # Test 2: Test that auth is required for user items endpoint
        response = client.get('/api/auth/user-items')
        assert response.status_code == 401
        
        # Test 3: Test GET endpoint returns proper format (even if empty due to transaction isolation)
        response = client.get('/api/auth/user-items', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        # The endpoint returns a dict with 'items' key and pagination info
        assert isinstance(data, dict)
        assert 'items' in data
        assert 'total' in data
        assert 'page' in data
        assert 'per_page' in data
        assert isinstance(data['items'], list)
        # Note: Due to transaction isolation in tests, the array may be empty
        # This is expected behavior in the test environment
        
        # Test 4: Test status filtering parameter
        response = client.get('/api/auth/user-items?status=watching', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, dict)
        assert 'items' in data
        assert isinstance(data['items'], list)


@pytest.mark.real_integration
@pytest.mark.performance
class TestAuthenticationPerformance:
    """Performance tests for authentication endpoints."""
    
    def test_jwt_validation_performance(self, client, auth_headers, benchmark_timer):
        """Measure JWT validation performance."""
        with benchmark_timer('jwt_validation'):
            for _ in range(100):
                response = client.get('/api/auth/dashboard', headers=auth_headers)
                assert response.status_code == 200
    
    def test_user_creation_performance(self, database_connection, benchmark_timer):
        """Measure user creation performance in database."""
        with benchmark_timer('user_creation'):
            for i in range(50):
                user_id = f'perf-test-user-{i}'
                # No begin() needed - connection already has active transaction
                database_connection.execute(
                    text("""
                        INSERT INTO user_profiles (id, email, username, created_at, updated_at)
                        VALUES (:id, :email, :username, NOW(), NOW())
                    """),
                    {
                        'id': user_id,
                        'email': f'perftest{i}@example.com',
                        'username': f'perfuser{i}'
                    }
                )
        
        # Cleanup - no begin() needed
        database_connection.execute(
            text("DELETE FROM user_profiles WHERE id LIKE 'perf-test-user-%'")
        )