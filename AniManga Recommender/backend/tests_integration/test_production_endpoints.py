#!/usr/bin/env python3
"""
Production Endpoint Integration Tests for AniManga Recommender

Integration tests specifically designed to run against production deployment.
These tests verify end-to-end functionality of the deployed backend.

Usage:
    # Test production
    TARGET_URL=https://animanga-backend.onrender.com pytest tests_integration/test_production_endpoints.py
    
    # Test with authentication
    TARGET_URL=https://animanga-backend.onrender.com \
    TEST_USER_EMAIL=test@example.com \
    TEST_USER_PASSWORD=password123 \
    pytest tests_integration/test_production_endpoints.py
    
    # Run specific test class
    TARGET_URL=https://animanga-backend.onrender.com \
    pytest tests_integration/test_production_endpoints.py::TestProductionAuth -v

Requirements:
    - Backend must be deployed and accessible
    - Database must contain test data
    - All services must be operational
"""

import os
import sys
import time
import json
import pytest
import requests
from typing import Dict, Optional, Any
from datetime import datetime
from urllib.parse import urljoin

# Configuration from environment
TARGET_URL = os.getenv('TARGET_URL', 'http://localhost:5000')
TEST_USER_EMAIL = os.getenv('TEST_USER_EMAIL')
TEST_USER_PASSWORD = os.getenv('TEST_USER_PASSWORD')
API_TIMEOUT = int(os.getenv('API_TIMEOUT', '30'))
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://animanga-recommender.vercel.app')


class ProductionTestSession:
    """Shared session for production tests."""
    
    def __init__(self):
        self.base_url = TARGET_URL
        self.session = requests.Session()
        self.auth_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.test_data = {}
        
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with proper error handling."""
        url = urljoin(self.base_url, endpoint)
        
        # Add auth header if available
        if self.auth_token and 'headers' not in kwargs:
            kwargs['headers'] = {}
        if self.auth_token and 'headers' in kwargs:
            kwargs['headers']['Authorization'] = f'Bearer {self.auth_token}'
        
        # Set timeout if not specified
        if 'timeout' not in kwargs:
            kwargs['timeout'] = API_TIMEOUT
        
        # Make request
        return self.session.request(method, url, **kwargs)
    
    def get(self, endpoint: str, **kwargs) -> requests.Response:
        """Make GET request."""
        return self.make_request('GET', endpoint, **kwargs)
    
    def post(self, endpoint: str, **kwargs) -> requests.Response:
        """Make POST request."""
        return self.make_request('POST', endpoint, **kwargs)
    
    def put(self, endpoint: str, **kwargs) -> requests.Response:
        """Make PUT request."""
        return self.make_request('PUT', endpoint, **kwargs)
    
    def delete(self, endpoint: str, **kwargs) -> requests.Response:
        """Make DELETE request."""
        return self.make_request('DELETE', endpoint, **kwargs)


@pytest.fixture(scope='session')
def prod_session():
    """Create production test session."""
    session = ProductionTestSession()
    
    # Verify service is reachable
    try:
        response = session.get('/')
        assert response.status_code == 200, f"Service not reachable at {TARGET_URL}"
    except requests.exceptions.ConnectionError:
        pytest.fail(f"Cannot connect to {TARGET_URL}")
    except requests.exceptions.Timeout:
        pytest.fail(f"Service timeout at {TARGET_URL}")
    
    return session


@pytest.fixture(scope='session')
def auth_session(prod_session):
    """Create authenticated session if credentials provided."""
    if not TEST_USER_EMAIL or not TEST_USER_PASSWORD:
        pytest.skip("No test credentials provided")
    
    # Attempt login
    response = prod_session.post('/api/auth/login', json={
        'email': TEST_USER_EMAIL,
        'password': TEST_USER_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        prod_session.auth_token = data.get('access_token')
        prod_session.user_id = data.get('user_id')
    else:
        # Try to register new user
        response = prod_session.post('/api/auth/register', json={
            'email': TEST_USER_EMAIL,
            'password': TEST_USER_PASSWORD,
            'username': 'testuser'
        })
        
        if response.status_code in [200, 201]:
            data = response.json()
            prod_session.auth_token = data.get('access_token')
            prod_session.user_id = data.get('user_id')
        else:
            pytest.fail(f"Cannot authenticate: {response.status_code}")
    
    return prod_session


class TestProductionHealth:
    """Test health and status endpoints in production."""
    
    def test_root_endpoint(self, prod_session):
        """Test root endpoint is accessible."""
        response = prod_session.get('/')
        assert response.status_code == 200
        assert b"AniManga Recommender Backend" in response.content
    
    def test_health_check(self, prod_session):
        """Test comprehensive health check."""
        response = prod_session.get('/api/health')
        assert response.status_code == 200
        
        data = response.json()
        assert 'status' in data
        assert 'timestamp' in data
        assert 'components' in data
        
        # Check component health
        components = data['components']
        assert 'database' in components
        assert 'cache' in components
        
        # Verify database is healthy
        db_status = components['database']['status']
        assert db_status in ['healthy', 'degraded'], f"Database unhealthy: {db_status}"
        
        # Verify cache is operational
        cache_status = components['cache']['status']
        assert cache_status in ['healthy', 'degraded'], f"Cache unhealthy: {cache_status}"
    
    def test_health_check_performance(self, prod_session):
        """Test health check response time."""
        start = time.time()
        response = prod_session.get('/api/health')
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 5.0, f"Health check too slow: {elapsed:.2f}s"


class TestProductionPublicAPI:
    """Test public API endpoints in production."""
    
    def test_items_listing(self, prod_session):
        """Test items listing endpoint."""
        response = prod_session.get('/api/items')
        assert response.status_code == 200
        
        data = response.json()
        assert 'items' in data
        assert 'total' in data
        assert 'page' in data
        assert 'per_page' in data
        assert 'total_pages' in data
        
        # Store item for later tests
        if data['items']:
            prod_session.test_data['sample_item'] = data['items'][0]
    
    def test_items_pagination(self, prod_session):
        """Test pagination functionality."""
        # Get first page
        response = prod_session.get('/api/items?page=1&per_page=5')
        assert response.status_code == 200
        
        data1 = response.json()
        assert data1['page'] == 1
        assert data1['per_page'] == 5
        assert len(data1['items']) <= 5
        
        # Get second page if available
        if data1['total_pages'] > 1:
            response = prod_session.get('/api/items?page=2&per_page=5')
            assert response.status_code == 200
            
            data2 = response.json()
            assert data2['page'] == 2
            
            # Ensure different items
            if data1['items'] and data2['items']:
                uid1 = data1['items'][0]['uid']
                uid2 = data2['items'][0]['uid']
                assert uid1 != uid2, "Same items on different pages"
    
    def test_items_filtering(self, prod_session):
        """Test filtering functionality."""
        # Filter by media type
        response = prod_session.get('/api/items?media_type=anime')
        assert response.status_code == 200
        
        data = response.json()
        for item in data['items'][:5]:
            assert item['media_type'] == 'anime'
        
        # Filter by genre
        response = prod_session.get('/api/items?genres=Action')
        assert response.status_code == 200
        
        data = response.json()
        if data['items']:
            for item in data['items'][:5]:
                assert 'Action' in item.get('genres', [])
    
    def test_items_search(self, prod_session):
        """Test search functionality."""
        response = prod_session.get('/api/items?search=naruto')
        assert response.status_code == 200
        
        data = response.json()
        # Search might return empty results
        assert 'items' in data
        assert isinstance(data['items'], list)
    
    def test_item_details(self, prod_session):
        """Test individual item details."""
        # Get an item first
        response = prod_session.get('/api/items?per_page=1')
        assert response.status_code == 200
        
        data = response.json()
        if data['items']:
            item_uid = data['items'][0]['uid']
            
            # Get item details
            response = prod_session.get(f'/api/items/{item_uid}')
            assert response.status_code == 200
            
            item = response.json()
            assert item['uid'] == item_uid
            assert 'title' in item
            assert 'synopsis' in item
    
    def test_recommendations(self, prod_session):
        """Test recommendations endpoint."""
        # Get an item to get recommendations for
        if 'sample_item' in prod_session.test_data:
            item_uid = prod_session.test_data['sample_item']['uid']
        else:
            response = prod_session.get('/api/items?per_page=1')
            data = response.json()
            if not data['items']:
                pytest.skip("No items available for recommendations")
            item_uid = data['items'][0]['uid']
        
        # Get recommendations
        response = prod_session.get(f'/api/recommendations/{item_uid}')
        assert response.status_code == 200
        
        recommendations = response.json()
        assert isinstance(recommendations, list)
        
        if recommendations:
            rec = recommendations[0]
            assert 'uid' in rec
            assert 'title' in rec
            assert 'similarity_score' in rec
            assert 0 <= rec['similarity_score'] <= 1


class TestProductionAuth:
    """Test authentication endpoints in production."""
    
    @pytest.mark.skipif(not TEST_USER_EMAIL, reason="No test credentials")
    def test_login_flow(self, prod_session):
        """Test complete login flow."""
        # Test with invalid credentials
        response = prod_session.post('/api/auth/login', json={
            'email': 'invalid@example.com',
            'password': 'wrongpassword'
        })
        assert response.status_code in [400, 401]
        
        # Test with valid credentials (if provided)
        if TEST_USER_EMAIL and TEST_USER_PASSWORD:
            response = prod_session.post('/api/auth/login', json={
                'email': TEST_USER_EMAIL,
                'password': TEST_USER_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                assert 'access_token' in data
                assert 'user_id' in data
    
    def test_protected_endpoints_require_auth(self, prod_session):
        """Test that protected endpoints require authentication."""
        protected_endpoints = [
            '/api/auth/dashboard',
            '/api/auth/user-items',
            '/api/auth/lists',
            '/api/auth/profile'
        ]
        
        for endpoint in protected_endpoints:
            response = prod_session.get(endpoint)
            assert response.status_code == 401, f"{endpoint} accessible without auth"
    
    @pytest.mark.skipif(not TEST_USER_EMAIL, reason="No test credentials")
    def test_authenticated_access(self, auth_session):
        """Test authenticated access to protected endpoints."""
        response = auth_session.get('/api/auth/dashboard')
        assert response.status_code == 200
        
        data = response.json()
        assert 'user_id' in data or 'user' in data


class TestProductionSocial:
    """Test social features in production."""
    
    def test_public_user_profiles(self, prod_session):
        """Test public user profile access."""
        # This might return 404 if no users exist
        response = prod_session.get('/api/social/users/1/profile')
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert 'username' in data or 'user' in data
    
    def test_comments_endpoint(self, prod_session):
        """Test comments retrieval."""
        # Get an item first
        response = prod_session.get('/api/items?per_page=1')
        data = response.json()
        
        if data['items']:
            item_uid = data['items'][0]['uid']
            
            # Get comments for item
            response = prod_session.get(f'/api/social/comments/item/{item_uid}')
            assert response.status_code == 200
            
            comments = response.json()
            assert isinstance(comments, list) or 'comments' in comments
    
    def test_reviews_endpoint(self, prod_session):
        """Test reviews retrieval."""
        # Get an item first
        response = prod_session.get('/api/items?per_page=1')
        data = response.json()
        
        if data['items']:
            item_uid = data['items'][0]['uid']
            
            # Get reviews for item
            response = prod_session.get(f'/api/social/reviews/{item_uid}')
            assert response.status_code == 200
            
            reviews = response.json()
            assert isinstance(reviews, list) or 'reviews' in reviews


class TestProductionCORS:
    """Test CORS configuration in production."""
    
    def test_cors_headers_present(self, prod_session):
        """Test CORS headers are present."""
        headers = {'Origin': FRONTEND_URL}
        response = prod_session.get('/api/items', headers=headers)
        
        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers
    
    def test_preflight_request(self, prod_session):
        """Test preflight OPTIONS request."""
        headers = {
            'Origin': FRONTEND_URL,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
        
        response = prod_session.make_request('OPTIONS', '/api/items', headers=headers)
        
        # Should return 200 or 204 for preflight
        assert response.status_code in [200, 204]
        assert 'Access-Control-Allow-Methods' in response.headers
        assert 'Access-Control-Allow-Headers' in response.headers
    
    def test_cors_with_credentials(self, prod_session):
        """Test CORS with credentials."""
        headers = {
            'Origin': FRONTEND_URL,
            'Cookie': 'session=test'
        }
        
        response = prod_session.get('/api/items', headers=headers)
        assert response.status_code == 200
        
        if 'Access-Control-Allow-Credentials' in response.headers:
            assert response.headers['Access-Control-Allow-Credentials'] == 'true'


class TestProductionPerformance:
    """Test performance metrics in production."""
    
    def test_api_response_times(self, prod_session):
        """Test API response time benchmarks."""
        endpoints = [
            ('/api/items', 1.0),
            ('/api/health', 0.5),
        ]
        
        for endpoint, max_time in endpoints:
            # Warm-up request
            prod_session.get(endpoint)
            
            # Measure actual request
            start = time.time()
            response = prod_session.get(endpoint)
            elapsed = time.time() - start
            
            assert response.status_code == 200
            assert elapsed < max_time, f"{endpoint} too slow: {elapsed:.2f}s (max: {max_time}s)"
    
    def test_concurrent_requests(self, prod_session):
        """Test handling of concurrent requests."""
        import concurrent.futures
        
        def make_request():
            response = prod_session.get('/api/items')
            return response.status_code
        
        # Make 5 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        # All should succeed
        assert all(status == 200 for status in results)


class TestProductionErrorHandling:
    """Test error handling in production."""
    
    def test_404_handling(self, prod_session):
        """Test 404 error handling."""
        response = prod_session.get('/api/nonexistent')
        assert response.status_code == 404
        
        # Should not expose internal details
        assert 'traceback' not in response.text.lower()
        assert 'stack trace' not in response.text.lower()
    
    def test_invalid_parameters(self, prod_session):
        """Test handling of invalid parameters."""
        # Invalid page number
        response = prod_session.get('/api/items?page=-1')
        assert response.status_code in [200, 400]  # May return default page
        
        # Invalid per_page
        response = prod_session.get('/api/items?per_page=invalid')
        assert response.status_code in [200, 400]  # May use default
        
        # Excessive per_page
        response = prod_session.get('/api/items?per_page=10000')
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data['per_page'] <= 100  # Should be capped
    
    def test_malformed_json(self, prod_session):
        """Test handling of malformed JSON."""
        headers = {'Content-Type': 'application/json'}
        response = prod_session.post('/api/auth/login', 
                                    data='{"invalid json}',
                                    headers=headers)
        
        assert response.status_code in [400, 422]


@pytest.fixture(scope='session', autouse=True)
def production_test_summary(prod_session):
    """Print summary after all production tests."""
    yield
    
    print("\n" + "=" * 60)
    print("PRODUCTION ENDPOINT TESTS COMPLETE")
    print("=" * 60)
    print(f"Target: {TARGET_URL}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if prod_session.auth_token:
        print(f"Authentication: ✅ Successful")
    else:
        print(f"Authentication: ⚠️  Not tested (no credentials)")
    
    print("=" * 60)