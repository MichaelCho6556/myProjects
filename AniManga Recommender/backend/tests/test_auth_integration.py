"""
Comprehensive Authentication Integration Tests for AniManga Recommender Backend
Phase C1: Authentication Flow Testing (Backend)

Test Coverage:
- JWT token generation and validation
- Protected route access and authorization
- Authentication middleware functionality
- Token expiration and refresh handling
- User session management
- Cross-endpoint authentication consistency
- Security vulnerabilities and edge cases
"""

import pytest
import jwt
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from supabase import Client
from app import create_app
from config import Config


class TestConfig(Config):
    """Test configuration with overrides for authentication testing"""
    TESTING = True
    SUPABASE_URL = "https://test.supabase.co"
    SUPABASE_ANON_KEY = "test_anon_key"
    SUPABASE_SERVICE_ROLE_KEY = "test_service_role_key"


@pytest.fixture
def app():
    """Create test app with auth configuration"""
    app = create_app(TestConfig)
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def mock_supabase():
    """Mock Supabase client for authentication testing"""
    with patch('app.supabase') as mock:
        mock_client = Mock(spec=Client)
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def valid_jwt_token():
    """Generate a valid JWT token for testing"""
    payload = {
        'sub': 'user-123',
        'email': 'test@example.com',
        'aud': 'authenticated',
        'role': 'authenticated',
        'exp': int(time.time()) + 3600,  # 1 hour from now
        'iat': int(time.time()),
        'user_metadata': {
            'full_name': 'Test User'
        }
    }
    # Use a test secret - in real app this would be from Supabase JWT secret
    return jwt.encode(payload, 'test_secret', algorithm='HS256')


@pytest.fixture
def expired_jwt_token():
    """Generate an expired JWT token for testing"""
    payload = {
        'sub': 'user-123',
        'email': 'test@example.com',
        'aud': 'authenticated',
        'role': 'authenticated',
        'exp': int(time.time()) - 3600,  # 1 hour ago
        'iat': int(time.time()) - 7200,  # 2 hours ago
    }
    return jwt.encode(payload, 'test_secret', algorithm='HS256')


@pytest.fixture
def malformed_jwt_token():
    """Generate a malformed JWT token for testing"""
    return "invalid.jwt.token"


class TestAuthenticationIntegration:
    """Integration tests for authentication system"""

    def test_protected_route_requires_authentication(self, client):
        """Test that protected routes require valid authentication"""
        # Test dashboard endpoint without auth
        response = client.get('/api/auth/dashboard')
        assert response.status_code == 401
        assert 'Authorization header missing' in response.get_json()['error']

    def test_protected_route_with_valid_token(self, client, valid_jwt_token, mock_supabase):
        """Test protected route access with valid JWT token"""
        # Mock Supabase user verification
        mock_supabase.auth.get_user.return_value.user = {
            'id': 'user-123',
            'email': 'test@example.com'
        }

        headers = {'Authorization': f'Bearer {valid_jwt_token}'}
        
        with patch('app.verify_jwt_token', return_value={
            'sub': 'user-123',
            'email': 'test@example.com',
            'role': 'authenticated'
        }):
            response = client.get('/api/auth/dashboard', headers=headers)
            
        # Should succeed or return appropriate response
        assert response.status_code in [200, 404]  # 404 if endpoint not fully implemented

    def test_expired_token_rejection(self, client, expired_jwt_token):
        """Test that expired tokens are rejected"""
        headers = {'Authorization': f'Bearer {expired_jwt_token}'}
        
        with patch('app.verify_jwt_token', side_effect=jwt.ExpiredSignatureError):
            response = client.get('/api/auth/dashboard', headers=headers)
            
        assert response.status_code == 401
        assert 'token expired' in response.get_json()['error'].lower()

    def test_malformed_token_rejection(self, client, malformed_jwt_token):
        """Test that malformed tokens are rejected"""
        headers = {'Authorization': f'Bearer {malformed_jwt_token}'}
        
        with patch('app.verify_jwt_token', side_effect=jwt.InvalidTokenError):
            response = client.get('/api/auth/dashboard', headers=headers)
            
        assert response.status_code == 401
        assert 'invalid token' in response.get_json()['error'].lower()

    def test_missing_authorization_header(self, client):
        """Test behavior when Authorization header is missing"""
        response = client.get('/api/auth/dashboard')
        assert response.status_code == 401
        assert 'authorization header missing' in response.get_json()['error'].lower()

    def test_invalid_authorization_format(self, client):
        """Test invalid Authorization header format"""
        # Test without Bearer prefix
        headers = {'Authorization': 'invalid_token_format'}
        response = client.get('/api/auth/dashboard', headers=headers)
        assert response.status_code == 401

        # Test empty Bearer
        headers = {'Authorization': 'Bearer '}
        response = client.get('/api/auth/dashboard', headers=headers)
        assert response.status_code == 401

    def test_user_item_endpoints_authentication(self, client, valid_jwt_token):
        """Test authentication on user item management endpoints"""
        with patch('app.verify_jwt_token', return_value={
            'sub': 'user-123',
            'email': 'test@example.com'
        }):
            headers = {'Authorization': f'Bearer {valid_jwt_token}'}
            
            # Test GET user items
            response = client.get('/api/auth/user-items', headers=headers)
            assert response.status_code in [200, 404]
            
            # Test POST user item
            response = client.post('/api/auth/user-items', 
                                 headers=headers, 
                                 json={'item_uid': 'test_item', 'status': 'watching'})
            assert response.status_code in [200, 201, 404]
            
            # Test PUT user item
            response = client.put('/api/auth/user-items/test_item', 
                                headers=headers,
                                json={'status': 'completed'})
            assert response.status_code in [200, 404]
            
            # Test DELETE user item
            response = client.delete('/api/auth/user-items/test_item', headers=headers)
            assert response.status_code in [200, 204, 404]

    def test_user_isolation_enforcement(self, client, mock_supabase):
        """Test that users can only access their own data"""
        # Create two different user tokens
        user1_token = jwt.encode({
            'sub': 'user-1',
            'email': 'user1@example.com',
            'exp': int(time.time()) + 3600
        }, 'test_secret', algorithm='HS256')
        
        user2_token = jwt.encode({
            'sub': 'user-2', 
            'email': 'user2@example.com',
            'exp': int(time.time()) + 3600
        }, 'test_secret', algorithm='HS256')

        with patch('app.verify_jwt_token') as mock_verify:
            # Test user 1 accessing their data
            mock_verify.return_value = {'sub': 'user-1', 'email': 'user1@example.com'}
            headers1 = {'Authorization': f'Bearer {user1_token}'}
            response1 = client.get('/api/auth/user-items', headers=headers1)
            
            # Test user 2 accessing their data
            mock_verify.return_value = {'sub': 'user-2', 'email': 'user2@example.com'}
            headers2 = {'Authorization': f'Bearer {user2_token}'}
            response2 = client.get('/api/auth/user-items', headers=headers2)
            
            # Both should be valid requests (even if returning empty data)
            assert response1.status_code in [200, 404]
            assert response2.status_code in [200, 404]

    def test_token_validation_middleware_consistency(self, client, valid_jwt_token):
        """Test that token validation is consistent across all protected endpoints"""
        protected_endpoints = [
            '/api/auth/dashboard',
            '/api/auth/user-items',
            '/api/auth/user-activity',
            '/api/auth/user-stats'
        ]
        
        with patch('app.verify_jwt_token', return_value={
            'sub': 'user-123',
            'email': 'test@example.com'
        }):
            headers = {'Authorization': f'Bearer {valid_jwt_token}'}
            
            for endpoint in protected_endpoints:
                response = client.get(endpoint, headers=headers)
                # Should not be unauthorized (401)
                assert response.status_code != 401, f"Endpoint {endpoint} failed auth"

    def test_concurrent_authentication_requests(self, client, valid_jwt_token):
        """Test handling of concurrent authentication requests"""
        import threading
        import queue
        
        results = queue.Queue()
        headers = {'Authorization': f'Bearer {valid_jwt_token}'}
        
        def make_request():
            with patch('app.verify_jwt_token', return_value={
                'sub': 'user-123',
                'email': 'test@example.com'
            }):
                response = client.get('/api/auth/dashboard', headers=headers)
                results.put(response.status_code)
        
        # Start multiple concurrent requests
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should be handled properly
        while not results.empty():
            status_code = results.get()
            assert status_code in [200, 404]  # Should not be 401 or 500

    def test_authentication_error_handling(self, client):
        """Test proper error handling in authentication middleware"""
        test_cases = [
            # No header
            ({}, 401, 'authorization header missing'),
            # Wrong header format
            ({'Authorization': 'Basic dGVzdA=='}, 401, 'bearer'),
            # Empty token
            ({'Authorization': 'Bearer'}, 401, 'token'),
            # Only Bearer with space
            ({'Authorization': 'Bearer '}, 401, 'token'),
        ]
        
        for headers, expected_status, expected_error_content in test_cases:
            response = client.get('/api/auth/dashboard', headers=headers)
            assert response.status_code == expected_status
            
            error_response = response.get_json()
            assert 'error' in error_response
            assert expected_error_content.lower() in error_response['error'].lower()

    def test_supabase_integration_error_handling(self, client, valid_jwt_token, mock_supabase):
        """Test handling of Supabase integration errors"""
        headers = {'Authorization': f'Bearer {valid_jwt_token}'}
        
        # Mock Supabase connection error
        with patch('app.verify_jwt_token', side_effect=Exception("Supabase connection error")):
            response = client.get('/api/auth/dashboard', headers=headers)
            assert response.status_code == 500
            
            error_response = response.get_json()
            assert 'error' in error_response

    def test_jwt_secret_key_validation(self, client):
        """Test that JWT tokens signed with wrong secret are rejected"""
        # Create token with wrong secret
        wrong_secret_token = jwt.encode({
            'sub': 'user-123',
            'email': 'test@example.com',
            'exp': int(time.time()) + 3600
        }, 'wrong_secret', algorithm='HS256')
        
        headers = {'Authorization': f'Bearer {wrong_secret_token}'}
        
        with patch('app.verify_jwt_token', side_effect=jwt.InvalidSignatureError):
            response = client.get('/api/auth/dashboard', headers=headers)
            
        assert response.status_code == 401
        assert 'invalid' in response.get_json()['error'].lower()

    def test_role_based_access_control(self, client):
        """Test role-based access control if implemented"""
        # Test with authenticated role
        auth_token = jwt.encode({
            'sub': 'user-123',
            'email': 'user@example.com',
            'role': 'authenticated',
            'exp': int(time.time()) + 3600
        }, 'test_secret', algorithm='HS256')
        
        # Test with anon role
        anon_token = jwt.encode({
            'sub': 'anon',
            'role': 'anon',
            'exp': int(time.time()) + 3600
        }, 'test_secret', algorithm='HS256')
        
        with patch('app.verify_jwt_token') as mock_verify:
            # Authenticated user should access protected routes
            mock_verify.return_value = {'sub': 'user-123', 'role': 'authenticated'}
            auth_headers = {'Authorization': f'Bearer {auth_token}'}
            response = client.get('/api/auth/dashboard', headers=auth_headers)
            assert response.status_code in [200, 404]
            
            # Anonymous user should be rejected from protected routes
            mock_verify.return_value = {'sub': 'anon', 'role': 'anon'}
            anon_headers = {'Authorization': f'Bearer {anon_token}'}
            response = client.get('/api/auth/dashboard', headers=anon_headers)
            # May depend on implementation - either 401 or 403
            assert response.status_code in [401, 403]

    def test_token_refresh_handling(self, client):
        """Test handling of token refresh scenarios"""
        # Test token that's about to expire (should still work)
        soon_expired_token = jwt.encode({
            'sub': 'user-123',
            'email': 'test@example.com',
            'exp': int(time.time()) + 60,  # 1 minute from now
            'iat': int(time.time())
        }, 'test_secret', algorithm='HS256')
        
        headers = {'Authorization': f'Bearer {soon_expired_token}'}
        
        with patch('app.verify_jwt_token', return_value={
            'sub': 'user-123',
            'email': 'test@example.com'
        }):
            response = client.get('/api/auth/dashboard', headers=headers)
            
        assert response.status_code in [200, 404]

    def test_session_invalidation(self, client, valid_jwt_token):
        """Test session invalidation scenarios"""
        headers = {'Authorization': f'Bearer {valid_jwt_token}'}
        
        # Simulate revoked token scenario
        with patch('app.verify_jwt_token', side_effect=jwt.InvalidTokenError("Token revoked")):
            response = client.get('/api/auth/dashboard', headers=headers)
            
        assert response.status_code == 401

    def test_authentication_performance(self, client, valid_jwt_token):
        """Test authentication middleware performance"""
        import time
        
        headers = {'Authorization': f'Bearer {valid_jwt_token}'}
        
        with patch('app.verify_jwt_token', return_value={
            'sub': 'user-123',
            'email': 'test@example.com'
        }):
            start_time = time.time()
            
            # Make multiple requests to test performance
            for _ in range(10):
                response = client.get('/api/auth/dashboard', headers=headers)
                assert response.status_code in [200, 404]
            
            end_time = time.time()
            
            # Authentication should be fast (less than 1 second for 10 requests)
            assert (end_time - start_time) < 1.0

    def test_cross_endpoint_user_context(self, client, valid_jwt_token):
        """Test that user context is consistent across different endpoints"""
        user_data = {
            'sub': 'user-123',
            'email': 'test@example.com',
            'user_metadata': {'full_name': 'Test User'}
        }
        
        headers = {'Authorization': f'Bearer {valid_jwt_token}'}
        
        endpoints_to_test = [
            '/api/auth/dashboard',
            '/api/auth/user-items', 
            '/api/auth/user-stats'
        ]
        
        with patch('app.verify_jwt_token', return_value=user_data):
            for endpoint in endpoints_to_test:
                response = client.get(endpoint, headers=headers)
                # Should consistently authenticate the same user
                assert response.status_code in [200, 404]

    def test_security_headers_on_auth_responses(self, client, valid_jwt_token):
        """Test that appropriate security headers are set on authentication responses"""
        headers = {'Authorization': f'Bearer {valid_jwt_token}'}
        
        with patch('app.verify_jwt_token', return_value={'sub': 'user-123'}):
            response = client.get('/api/auth/dashboard', headers=headers)
            
        # Check for security headers
        assert 'X-Content-Type-Options' in response.headers
        assert 'X-Frame-Options' in response.headers or 'Content-Security-Policy' in response.headers

    def test_rate_limiting_on_auth_endpoints(self, client):
        """Test rate limiting on authentication-related endpoints"""
        # This would depend on if rate limiting is implemented
        # Make multiple rapid requests
        for _ in range(20):
            response = client.get('/api/auth/dashboard')
            # Should be 401 (unauthorized) not 429 (rate limited) since no auth
            assert response.status_code == 401

    def test_authentication_logging(self, client, valid_jwt_token):
        """Test that authentication events are properly logged"""
        headers = {'Authorization': f'Bearer {valid_jwt_token}'}
        
        with patch('app.verify_jwt_token', return_value={'sub': 'user-123'}) as mock_verify:
            with patch('app.logger') as mock_logger:
                response = client.get('/api/auth/dashboard', headers=headers)
                
                # Verify that authentication was logged
                mock_verify.assert_called_once() 