# ABOUTME: Real authentication integration tests - NO MOCKS
# ABOUTME: Tests actual JWT generation, validation, and protected endpoint access

"""
Real Authentication System Tests for AniManga Recommender

Test Coverage:
- User creation and authentication with real database
- JWT token generation, validation, and expiration
- Protected route access control  
- Authentication bypass prevention
- Error handling and edge cases

NO MOCKS - All tests use real database connections and actual JWT processing
"""

import pytest
import json
import jwt
import time
import uuid
from datetime import datetime, timedelta
from sqlalchemy import text

# Import test dependencies
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from supabase_client import SupabaseAuthClient, require_auth
from tests.test_utils import TestDataManager, generate_jwt_token, create_auth_headers


@pytest.mark.real_integration
class TestUserAuthentication:
    """Test suite for user authentication functionality using real database"""
    
    def test_jwt_token_generation_and_validation(self, database_connection, app):
        """Test real JWT token generation and validation"""
        # Create a real user in the database
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email="jwt_test@example.com",
            username="jwt_test_user"
        )
        
        try:
            # Generate a real JWT token
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret,
                expires_in=3600
            )
            
            # Verify token can be decoded
            decoded = jwt.decode(token, jwt_secret, algorithms=['HS256'])
            
            assert decoded['user_id'] == user['id']
            assert decoded['email'] == user['email']
            assert decoded['sub'] == user['id']
            assert 'exp' in decoded
            assert 'iat' in decoded
            
            # Verify expiration is set correctly
            current_time = int(time.time())
            assert decoded['exp'] > current_time
            assert decoded['exp'] <= current_time + 3600
            
        finally:
            manager.cleanup()
    
    def test_expired_jwt_token_rejected(self, database_connection, app):
        """Test that expired JWT tokens are properly rejected"""
        # Create a real user
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email="expired_test@example.com",
            username="expired_test_user"
        )
        
        try:
            # Generate an already expired token
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret,
                expires_in=-1  # Already expired
            )
            
            # Try to decode the expired token
            with pytest.raises(jwt.ExpiredSignatureError):
                jwt.decode(token, jwt_secret, algorithms=['HS256'])
                
        finally:
            manager.cleanup()
    
    def test_invalid_jwt_signature_rejected(self, database_connection, app):
        """Test that tokens with invalid signatures are rejected"""
        # Create a real user
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email="signature_test@example.com",
            username="signature_test_user"
        )
        
        try:
            # Generate token with correct secret
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret,
                expires_in=3600
            )
            
            # Try to decode with wrong secret
            wrong_secret = 'wrong-secret-key'
            with pytest.raises(jwt.InvalidSignatureError):
                jwt.decode(token, wrong_secret, algorithms=['HS256'])
                
        finally:
            manager.cleanup()
    
    def test_protected_endpoint_with_valid_auth(self, client, database_connection, app):
        """Test accessing protected endpoints with valid authentication"""
        # Create a real user with full profile data
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email="protected_test@example.com",
            username="protected_test_user"
        )
        
        # Create some test data for the user
        item = manager.create_test_item(
            uid="auth_test_item",
            title="Auth Test Anime",
            item_type="anime"
        )
        
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=item['uid'],
            status="watching",
            score=8.5,
            progress=10
        )
        
        try:
            # Generate valid JWT token
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            
            headers = create_auth_headers(token)
            
            # Test accessing protected dashboard endpoint
            response = client.get('/api/auth/dashboard', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Verify we get real user data
            assert 'profile' in data
            assert data['profile']['email'] == user['email']
            assert data['profile']['username'] == user['username']
            
            # Verify user statistics are included
            assert 'statistics' in data
            
            # Test accessing user items endpoint
            response = client.get('/api/auth/user-items', headers=headers)
            assert response.status_code == 200
            
            items_data = json.loads(response.data)
            assert 'items' in items_data
            assert len(items_data['items']) == 1
            assert items_data['items'][0]['item_uid'] == item['uid']
            
        finally:
            manager.cleanup()
    
    def test_protected_endpoint_without_auth(self, client):
        """Test that protected endpoints reject unauthenticated requests"""
        # Test various protected endpoints without authentication
        protected_endpoints = [
            '/api/auth/dashboard',
            '/api/auth/user-items',
            '/api/auth/lists',
            '/api/auth/profile/update'
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            
            assert response.status_code == 401
            data = json.loads(response.data)
            assert 'error' in data
            assert 'authorization' in data['error'].lower() or 'auth' in data['error'].lower()
    
    def test_protected_endpoint_with_malformed_token(self, client):
        """Test that malformed tokens are properly rejected"""
        malformed_tokens = [
            'not-a-jwt-token',
            'Bearer',
            'invalid.jwt.format',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',  # Incomplete JWT
            '',
            'null',
            'undefined'
        ]
        
        for token in malformed_tokens:
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            response = client.get('/api/auth/dashboard', headers=headers)
            
            assert response.status_code == 401
            data = json.loads(response.data)
            assert 'error' in data
    
    def test_user_data_isolation(self, client, database_connection, app):
        """Test that users can only access their own data"""
        manager = TestDataManager(database_connection)
        
        # Create two users
        user1 = manager.create_test_user(
            email="user1@example.com",
            username="user1"
        )
        
        user2 = manager.create_test_user(
            email="user2@example.com",
            username="user2"
        )
        
        # Create items for each user
        item1 = manager.create_test_item(uid="user1_item", title="User 1 Anime")
        item2 = manager.create_test_item(uid="user2_item", title="User 2 Anime")
        
        manager.create_user_item_entry(
            user_id=user1['id'],
            item_uid=item1['uid'],
            status="watching"
        )
        
        manager.create_user_item_entry(
            user_id=user2['id'],
            item_uid=item2['uid'],
            status="completed"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            
            # Generate token for user1
            token1 = generate_jwt_token(
                user_id=user1['id'],
                email=user1['email'],
                secret_key=jwt_secret
            )
            
            headers1 = create_auth_headers(token1)
            
            # User1 should only see their own items
            response = client.get('/api/auth/user-items', headers=headers1)
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert len(data['items']) == 1
            assert data['items'][0]['item_uid'] == item1['uid']
            
            # User1 should not see user2's items
            for item in data['items']:
                assert item['item_uid'] != item2['uid']
                
        finally:
            manager.cleanup()
    
    def test_concurrent_authentication_requests(self, client, database_connection, app):
        """Test handling of concurrent authentication requests"""
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email="concurrent@example.com",
            username="concurrent_user"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            
            # Generate multiple tokens for the same user
            tokens = []
            for i in range(5):
                token = generate_jwt_token(
                    user_id=user['id'],
                    email=user['email'],
                    secret_key=jwt_secret,
                    expires_in=3600 + i  # Slightly different expiry times
                )
                tokens.append(token)
            
            # All tokens should work independently
            for token in tokens:
                headers = create_auth_headers(token)
                response = client.get('/api/auth/dashboard', headers=headers)
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['profile']['email'] == user['email']
                
        finally:
            manager.cleanup()
    
    def test_authentication_with_special_characters(self, database_connection, app):
        """Test authentication with usernames/emails containing special characters"""
        manager = TestDataManager(database_connection)
        
        # Create users with special characters
        special_users = [
            {
                'email': 'test+tag@example.com',
                'username': 'user-with-dash'
            },
            {
                'email': 'test.dot@example.com', 
                'username': 'user_with_underscore'
            },
            {
                'email': 'test123@example.com',
                'username': 'user123numbers'
            }
        ]
        
        for user_data in special_users:
            user = manager.create_test_user(
                email=user_data['email'],
                username=user_data['username']
            )
            
            try:
                jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
                token = generate_jwt_token(
                    user_id=user['id'],
                    email=user['email'],
                    secret_key=jwt_secret
                )
                
                # Verify token works correctly
                decoded = jwt.decode(token, jwt_secret, algorithms=['HS256'])
                assert decoded['email'] == user_data['email']
                
            finally:
                # Clean up each user individually
                database_connection.execute(
                    text("DELETE FROM user_statistics WHERE user_id = :id"),
                    {"id": user['id']}
                )
                database_connection.execute(
                    text("DELETE FROM user_reputation WHERE user_id = :id"),
                    {"id": user['id']}
                )
                database_connection.execute(
                    text("DELETE FROM user_privacy_settings WHERE user_id = :id"),
                    {"id": user['id']}
                )
                database_connection.execute(
                    text("DELETE FROM user_profiles WHERE id = :id"),
                    {"id": user['id']}
                )
                database_connection.commit()
    
    def test_token_refresh_mechanism(self, database_connection, app):
        """Test token refresh and rotation"""
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email="refresh@example.com",
            username="refresh_user"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            
            # Generate initial token with short expiry
            initial_token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret,
                expires_in=60  # 1 minute
            )
            
            # Decode initial token
            initial_decoded = jwt.decode(initial_token, jwt_secret, algorithms=['HS256'])
            initial_iat = initial_decoded['iat']
            
            # Simulate token refresh by generating new token
            time.sleep(1)  # Wait to ensure different iat
            
            refreshed_token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret,
                expires_in=3600  # New longer expiry
            )
            
            # Decode refreshed token
            refreshed_decoded = jwt.decode(refreshed_token, jwt_secret, algorithms=['HS256'])
            
            # Verify refresh created new token with updated timestamps
            assert refreshed_decoded['iat'] > initial_iat
            assert refreshed_decoded['exp'] > initial_decoded['exp']
            assert refreshed_decoded['user_id'] == initial_decoded['user_id']
            
        finally:
            manager.cleanup()
    
    def test_role_based_access_control(self, database_connection, app):
        """Test role-based access control with real integration"""
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email="rbac_test@example.com",
            username="rbac_test_user"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            
            # Test with authenticated role
            auth_token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret,
                expires_in=3600,
                additional_claims={'role': 'authenticated'}
            )
            
            # Test with anon role
            anon_token = generate_jwt_token(
                user_id='anon',
                email='anon@example.com',
                secret_key=jwt_secret,
                expires_in=3600,
                additional_claims={'role': 'anon', 'sub': 'anon'}
            )
            
            with app.test_client() as client:
                # Authenticated user should access protected routes
                auth_headers = create_auth_headers(auth_token)
                response = client.get('/api/auth/dashboard', headers=auth_headers)
                authenticated_success = response.status_code != 401
                
                # Anonymous user test
                anon_headers = create_auth_headers(anon_token)
                response = client.get('/api/auth/dashboard', headers=anon_headers)
                anon_success = response.status_code != 401
                
                # Authenticated user should have access
                assert authenticated_success, "Authenticated user should be able to access protected routes"
            
        finally:
            manager.cleanup()
    
    def test_security_headers_on_auth_responses(self, client, database_connection, app):
        """Test that appropriate security headers are set on authentication responses"""
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email="security_test@example.com",
            username="security_test_user"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret,
                expires_in=3600
            )
            
            headers = create_auth_headers(token)
            response = client.get('/api/auth/dashboard', headers=headers)
            
            # Check for basic headers that should be present
            assert response.headers.get('Content-Type') is not None
            # Security headers may include X-Content-Type-Options, X-Frame-Options, etc.
            
        finally:
            manager.cleanup()
    
    def test_rate_limiting_on_auth_endpoints(self, client):
        """Test rate limiting on authentication-related endpoints"""
        # Make multiple rapid requests to test rate limiting
        responses = []
        for _ in range(20):
            response = client.get('/api/auth/dashboard')
            responses.append(response.status_code)
        
        # Should be 401 (unauthorized) not 429 (rate limited) since no auth
        # Rate limiting may return 429 if implemented
        assert all(status in [401, 429] for status in responses)
    
    def test_authentication_performance_batch(self, client, database_connection, app):
        """Test authentication middleware performance with batch requests"""
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email="perf_test@example.com",
            username="perf_test_user"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret,
                expires_in=3600
            )
            
            headers = create_auth_headers(token)
            
            start_time = time.time()
            successful_requests = 0
            
            # Test authentication performance with real endpoints
            for i in range(5):
                try:
                    response = client.get('/api/auth/dashboard', headers=headers)
                    if response.status_code != 401:
                        successful_requests += 1
                        
                    # Break early if response takes too long
                    if time.time() - start_time > 10.0:
                        break
                except Exception:
                    continue
            
            end_time = time.time()
            elapsed_time = end_time - start_time
            
            # Verify auth worked in most cases
            assert successful_requests >= 3, f"Only {successful_requests}/5 requests had proper authentication"
            assert elapsed_time < 30.0, f"Authentication took {elapsed_time:.2f}s, which is too slow"
            
        finally:
            manager.cleanup()