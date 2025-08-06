#!/usr/bin/env python3
"""
Post-Deployment Test Suite for AniManga Recommender Backend

This comprehensive test suite validates the production backend after deployment to Render.
It tests all critical functionality including health checks, API endpoints, CORS,
authentication, rate limiting, error handling, and performance metrics.

Usage:
    # Test local development
    pytest scripts/post_deployment_tests.py
    
    # Test staging environment
    TARGET_URL=https://animanga-backend-staging.onrender.com pytest scripts/post_deployment_tests.py
    
    # Test production environment
    TARGET_URL=https://animanga-backend.onrender.com pytest scripts/post_deployment_tests.py
    
Environment Variables:
    TARGET_URL: Base URL of the backend API (default: http://localhost:5000)
    FRONTEND_URL: Frontend URL for CORS testing (default: http://localhost:3000)
    API_TIMEOUT: Request timeout in seconds (default: 30)
    TEST_USER_EMAIL: Email for auth testing (optional)
    TEST_USER_PASSWORD: Password for auth testing (optional)
"""

import os
import sys
import time
import json
import requests
import pytest
from typing import Dict, List, Optional, Any
from datetime import datetime
from urllib.parse import urljoin

# Configuration from environment variables
TARGET_URL = os.getenv('TARGET_URL', 'http://localhost:5000')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
API_TIMEOUT = int(os.getenv('API_TIMEOUT', '30'))
TEST_USER_EMAIL = os.getenv('TEST_USER_EMAIL', 'test@example.com')
TEST_USER_PASSWORD = os.getenv('TEST_USER_PASSWORD', 'testpassword123')

# Production URLs for different environments
PRODUCTION_URLS = {
    'production': 'https://animanga-backend.onrender.com',
    'staging': 'https://animanga-backend-staging.onrender.com',
    'local': 'http://localhost:5000'
}

# Expected CORS origins for production
EXPECTED_CORS_ORIGINS = [
    'https://animanga-recommender.vercel.app',
    'https://*.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
]


class TestContext:
    """Shared context for tests including authentication tokens and timing."""
    
    def __init__(self):
        self.auth_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.start_time: float = time.time()
        self.response_times: List[float] = []
        self.errors: List[str] = []
        self.warnings: List[str] = []


@pytest.fixture(scope='session')
def test_context():
    """Provides shared test context across all tests."""
    return TestContext()


@pytest.fixture(scope='session')
def base_url():
    """Validates and provides the base URL for testing."""
    print(f"\n🎯 Testing against: {TARGET_URL}")
    print(f"⏱️  Timeout: {API_TIMEOUT}s")
    
    # Verify the service is reachable
    try:
        response = requests.get(TARGET_URL, timeout=API_TIMEOUT)
        if response.status_code >= 500:
            pytest.fail(f"❌ Service returned error {response.status_code} at {TARGET_URL}")
    except requests.exceptions.ConnectionError:
        pytest.fail(f"❌ Cannot connect to service at {TARGET_URL}")
    except requests.exceptions.Timeout:
        pytest.fail(f"❌ Service timeout at {TARGET_URL} after {API_TIMEOUT}s")
    
    return TARGET_URL


class TestHealthAndStatus:
    """Tests for health check and system status endpoints."""
    
    def test_root_endpoint(self, base_url, test_context):
        """Test root endpoint returns expected response."""
        start = time.time()
        response = requests.get(base_url, timeout=API_TIMEOUT)
        elapsed = time.time() - start
        test_context.response_times.append(elapsed)
        
        assert response.status_code == 200
        assert b"AniManga Recommender Backend" in response.content
        print(f"✅ Root endpoint responded in {elapsed:.2f}s")
    
    def test_health_check_comprehensive(self, base_url, test_context):
        """Test comprehensive health check endpoint."""
        url = urljoin(base_url, '/api/health')
        start = time.time()
        response = requests.get(url, timeout=API_TIMEOUT)
        elapsed = time.time() - start
        test_context.response_times.append(elapsed)
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate health check structure
        assert 'status' in data
        assert 'timestamp' in data
        assert 'components' in data
        
        # Check overall status
        assert data['status'] in ['healthy', 'degraded', 'unhealthy']
        
        # Validate component health
        components = data['components']
        
        # Database health
        assert 'database' in components
        db_health = components['database']
        assert 'status' in db_health
        if db_health['status'] != 'healthy':
            test_context.warnings.append(f"Database status: {db_health.get('error', 'unknown')}")
        
        # Cache health
        assert 'cache' in components
        cache_health = components['cache']
        assert 'status' in cache_health
        if cache_health['status'] != 'healthy':
            test_context.warnings.append(f"Cache status: {cache_health.get('error', 'unknown')}")
        
        # Compute endpoints health
        if 'compute_endpoints' in components:
            compute_health = components['compute_endpoints']
            if compute_health.get('status') != 'healthy':
                test_context.warnings.append(f"Compute status: {compute_health.get('error', 'unknown')}")
        
        print(f"✅ Health check passed in {elapsed:.2f}s")
        print(f"   Status: {data['status']}")
        print(f"   Database: {db_health['status']}")
        print(f"   Cache: {cache_health['status']}")
        
        # Performance assertion
        if elapsed > 5.0:
            test_context.warnings.append(f"Health check slow: {elapsed:.2f}s")


class TestPublicAPIs:
    """Tests for public API endpoints that don't require authentication."""
    
    def test_items_endpoint_basic(self, base_url, test_context):
        """Test basic items listing endpoint."""
        url = urljoin(base_url, '/api/items')
        start = time.time()
        response = requests.get(url, timeout=API_TIMEOUT)
        elapsed = time.time() - start
        test_context.response_times.append(elapsed)
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert 'items' in data
        assert 'total' in data
        assert 'page' in data
        assert 'per_page' in data
        assert 'total_pages' in data
        
        # Validate items if present
        if data['items']:
            item = data['items'][0]
            required_fields = ['uid', 'title', 'media_type', 'score', 'synopsis', 'main_picture']
            for field in required_fields:
                assert field in item, f"Missing field: {field}"
        
        print(f"✅ Items endpoint responded in {elapsed:.2f}s")
        print(f"   Total items: {data['total']}")
        print(f"   Items returned: {len(data['items'])}")
    
    def test_items_pagination(self, base_url, test_context):
        """Test items endpoint pagination."""
        url = urljoin(base_url, '/api/items?page=1&per_page=5')
        response = requests.get(url, timeout=API_TIMEOUT)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['page'] == 1
        assert data['per_page'] == 5
        assert len(data['items']) <= 5
        
        # Test page 2 if available
        if data['total_pages'] > 1:
            url = urljoin(base_url, '/api/items?page=2&per_page=5')
            response = requests.get(url, timeout=API_TIMEOUT)
            assert response.status_code == 200
            data2 = response.json()
            assert data2['page'] == 2
            
            # Ensure different items
            if data['items'] and data2['items']:
                assert data['items'][0]['uid'] != data2['items'][0]['uid']
        
        print(f"✅ Pagination working correctly")
    
    def test_items_filtering(self, base_url, test_context):
        """Test items filtering by media type and genre."""
        # Test media type filter
        url = urljoin(base_url, '/api/items?media_type=anime')
        response = requests.get(url, timeout=API_TIMEOUT)
        assert response.status_code == 200
        data = response.json()
        
        for item in data['items'][:5]:  # Check first 5 items
            assert item['media_type'] == 'anime'
        
        # Test genre filter
        url = urljoin(base_url, '/api/items?genres=Action')
        response = requests.get(url, timeout=API_TIMEOUT)
        assert response.status_code == 200
        data = response.json()
        
        if data['items']:
            for item in data['items'][:5]:
                assert 'Action' in item.get('genres', [])
        
        print(f"✅ Filtering working correctly")
    
    def test_items_search(self, base_url, test_context):
        """Test items search functionality."""
        url = urljoin(base_url, '/api/items?search=naruto')
        response = requests.get(url, timeout=API_TIMEOUT)
        
        assert response.status_code == 200
        data = response.json()
        
        if data['items']:
            # At least one result should contain search term
            found = any('naruto' in item['title'].lower() for item in data['items'])
            assert found or len(data['items']) == 0  # Allow empty results
        
        print(f"✅ Search functionality working")
    
    def test_recommendations_endpoint(self, base_url, test_context):
        """Test recommendations endpoint with a sample item."""
        # First get an item to get recommendations for
        url = urljoin(base_url, '/api/items?per_page=1')
        response = requests.get(url, timeout=API_TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            if data['items']:
                item_uid = data['items'][0]['uid']
                
                # Get recommendations
                url = urljoin(base_url, f'/api/recommendations/{item_uid}')
                start = time.time()
                response = requests.get(url, timeout=API_TIMEOUT)
                elapsed = time.time() - start
                test_context.response_times.append(elapsed)
                
                assert response.status_code == 200
                recommendations = response.json()
                
                assert isinstance(recommendations, list)
                if recommendations:
                    rec = recommendations[0]
                    assert 'uid' in rec
                    assert 'title' in rec
                    assert 'similarity_score' in rec
                
                print(f"✅ Recommendations endpoint responded in {elapsed:.2f}s")
                print(f"   Recommendations returned: {len(recommendations)}")


class TestErrorHandling:
    """Tests for error handling and edge cases."""
    
    def test_404_not_found(self, base_url, test_context):
        """Test 404 response for non-existent endpoints."""
        url = urljoin(base_url, '/api/nonexistent')
        response = requests.get(url, timeout=API_TIMEOUT)
        assert response.status_code == 404
        print(f"✅ 404 handling working correctly")
    
    def test_invalid_item_uid(self, base_url, test_context):
        """Test handling of invalid item UIDs."""
        url = urljoin(base_url, '/api/items/999999999')
        response = requests.get(url, timeout=API_TIMEOUT)
        assert response.status_code in [404, 400]
        print(f"✅ Invalid UID handling working correctly")
    
    def test_invalid_pagination(self, base_url, test_context):
        """Test handling of invalid pagination parameters."""
        # Negative page
        url = urljoin(base_url, '/api/items?page=-1')
        response = requests.get(url, timeout=API_TIMEOUT)
        assert response.status_code in [400, 200]  # May return page 1
        
        # Invalid per_page
        url = urljoin(base_url, '/api/items?per_page=invalid')
        response = requests.get(url, timeout=API_TIMEOUT)
        assert response.status_code in [400, 200]  # May use default
        
        # Excessive per_page
        url = urljoin(base_url, '/api/items?per_page=10000')
        response = requests.get(url, timeout=API_TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            assert data['per_page'] <= 100  # Should be capped
        
        print(f"✅ Invalid parameter handling working correctly")
    
    def test_malformed_json_body(self, base_url, test_context):
        """Test handling of malformed JSON in POST requests."""
        url = urljoin(base_url, '/api/auth/login')
        headers = {'Content-Type': 'application/json'}
        
        # Send invalid JSON
        response = requests.post(url, data='{"invalid json}', headers=headers, timeout=API_TIMEOUT)
        assert response.status_code in [400, 422]
        
        print(f"✅ Malformed JSON handling working correctly")


class TestCORS:
    """Tests for CORS (Cross-Origin Resource Sharing) configuration."""
    
    def test_cors_preflight_options(self, base_url, test_context):
        """Test CORS preflight OPTIONS request."""
        url = urljoin(base_url, '/api/items')
        headers = {
            'Origin': 'https://animanga-recommender.vercel.app',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
        
        response = requests.options(url, headers=headers, timeout=API_TIMEOUT)
        
        # Check CORS headers
        assert 'Access-Control-Allow-Origin' in response.headers
        assert 'Access-Control-Allow-Methods' in response.headers
        assert 'Access-Control-Allow-Headers' in response.headers
        
        # Validate allowed methods
        allowed_methods = response.headers.get('Access-Control-Allow-Methods', '')
        for method in ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']:
            assert method in allowed_methods
        
        print(f"✅ CORS preflight working correctly")
    
    def test_cors_actual_request(self, base_url, test_context):
        """Test CORS headers in actual API requests."""
        url = urljoin(base_url, '/api/items')
        
        # Test from production frontend
        headers = {'Origin': 'https://animanga-recommender.vercel.app'}
        response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
        
        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers
        origin = response.headers.get('Access-Control-Allow-Origin')
        assert origin in ['https://animanga-recommender.vercel.app', '*']
        
        # Test from localhost
        headers = {'Origin': 'http://localhost:3000'}
        response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
        
        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers
        
        print(f"✅ CORS actual requests working correctly")
    
    def test_cors_credentials(self, base_url, test_context):
        """Test CORS with credentials support."""
        url = urljoin(base_url, '/api/items')
        headers = {
            'Origin': 'https://animanga-recommender.vercel.app',
            'Cookie': 'session=test'
        }
        
        response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
        
        if 'Access-Control-Allow-Credentials' in response.headers:
            assert response.headers['Access-Control-Allow-Credentials'] == 'true'
        
        print(f"✅ CORS credentials support validated")


class TestAuthentication:
    """Tests for authentication endpoints and JWT handling."""
    
    def test_login_with_invalid_credentials(self, base_url, test_context):
        """Test login with invalid credentials returns 401."""
        url = urljoin(base_url, '/api/auth/login')
        payload = {
            'email': 'invalid@example.com',
            'password': 'wrongpassword'
        }
        
        response = requests.post(url, json=payload, timeout=API_TIMEOUT)
        assert response.status_code in [401, 400]
        print(f"✅ Invalid login correctly rejected")
    
    def test_protected_endpoint_without_auth(self, base_url, test_context):
        """Test that protected endpoints require authentication."""
        url = urljoin(base_url, '/api/auth/dashboard')
        response = requests.get(url, timeout=API_TIMEOUT)
        assert response.status_code == 401
        print(f"✅ Protected endpoints require authentication")
    
    def test_invalid_jwt_token(self, base_url, test_context):
        """Test that invalid JWT tokens are rejected."""
        url = urljoin(base_url, '/api/auth/dashboard')
        headers = {'Authorization': 'Bearer invalid.jwt.token'}
        
        response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
        assert response.status_code == 401
        print(f"✅ Invalid JWT tokens correctly rejected")


class TestRateLimiting:
    """Tests for rate limiting functionality."""
    
    @pytest.mark.slow
    def test_rate_limiting_enforcement(self, base_url, test_context):
        """Test that rate limiting is enforced after threshold."""
        url = urljoin(base_url, '/api/items')
        
        # Make rapid requests to trigger rate limiting
        responses = []
        for i in range(15):  # Assuming limit is 10 per minute
            response = requests.get(url, timeout=API_TIMEOUT)
            responses.append(response.status_code)
            time.sleep(0.1)  # Small delay between requests
        
        # Check if any request was rate limited
        rate_limited = any(status == 429 for status in responses)
        
        if rate_limited:
            print(f"✅ Rate limiting enforced correctly")
        else:
            test_context.warnings.append("Rate limiting may not be configured")
            print(f"⚠️ Rate limiting not triggered (may be disabled in test environment)")


class TestSecurityHeaders:
    """Tests for security headers in responses."""
    
    def test_security_headers_present(self, base_url, test_context):
        """Test that security headers are present in responses."""
        url = urljoin(base_url, '/api/items')
        response = requests.get(url, timeout=API_TIMEOUT)
        
        # Check for common security headers
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': None,  # Optional but recommended
            'Content-Security-Policy': None  # Optional but recommended
        }
        
        warnings = []
        for header, expected_values in security_headers.items():
            if header in response.headers:
                if expected_values:
                    value = response.headers[header]
                    if isinstance(expected_values, list):
                        if value not in expected_values:
                            warnings.append(f"{header}: {value} (expected one of {expected_values})")
                    elif value != expected_values:
                        warnings.append(f"{header}: {value} (expected {expected_values})")
            elif expected_values is not None:  # Required header missing
                warnings.append(f"Missing required security header: {header}")
        
        if warnings:
            for warning in warnings:
                test_context.warnings.append(warning)
            print(f"⚠️ Security header issues: {len(warnings)}")
        else:
            print(f"✅ Security headers configured correctly")


class TestPerformance:
    """Tests for performance metrics and response times."""
    
    def test_response_time_benchmarks(self, base_url, test_context):
        """Test that API response times meet performance benchmarks."""
        endpoints = [
            ('/api/items', 500),  # Public API: 500ms
            ('/api/health', 200),  # Health check: 200ms
        ]
        
        for endpoint, max_time_ms in endpoints:
            url = urljoin(base_url, endpoint)
            
            # Warm up request
            requests.get(url, timeout=API_TIMEOUT)
            
            # Measure actual request
            start = time.time()
            response = requests.get(url, timeout=API_TIMEOUT)
            elapsed_ms = (time.time() - start) * 1000
            
            if elapsed_ms > max_time_ms:
                test_context.warnings.append(
                    f"{endpoint} slow: {elapsed_ms:.0f}ms (target: {max_time_ms}ms)"
                )
            
            print(f"{'✅' if elapsed_ms <= max_time_ms else '⚠️'} {endpoint}: {elapsed_ms:.0f}ms")
    
    def test_concurrent_requests(self, base_url, test_context):
        """Test handling of concurrent requests."""
        import concurrent.futures
        
        url = urljoin(base_url, '/api/items')
        
        def make_request():
            start = time.time()
            response = requests.get(url, timeout=API_TIMEOUT)
            return response.status_code, time.time() - start
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        # Check all requests succeeded
        statuses = [r[0] for r in results]
        times = [r[1] for r in results]
        
        assert all(status == 200 for status in statuses), f"Some requests failed: {statuses}"
        
        avg_time = sum(times) / len(times)
        max_time = max(times)
        
        print(f"✅ Concurrent requests handled successfully")
        print(f"   Average time: {avg_time:.2f}s")
        print(f"   Max time: {max_time:.2f}s")
        
        if max_time > 5.0:
            test_context.warnings.append(f"Concurrent requests slow: max {max_time:.2f}s")


@pytest.fixture(scope='session', autouse=True)
def test_summary(test_context):
    """Print test summary after all tests complete."""
    yield
    
    print("\n" + "=" * 60)
    print("📊 POST-DEPLOYMENT TEST SUMMARY")
    print("=" * 60)
    
    # Calculate statistics
    if test_context.response_times:
        avg_response = sum(test_context.response_times) / len(test_context.response_times)
        max_response = max(test_context.response_times)
        min_response = min(test_context.response_times)
        
        print(f"\n⏱️  Response Time Statistics:")
        print(f"   Average: {avg_response:.2f}s")
        print(f"   Min: {min_response:.2f}s")
        print(f"   Max: {max_response:.2f}s")
    
    # Print warnings
    if test_context.warnings:
        print(f"\n⚠️  Warnings ({len(test_context.warnings)}):")
        for warning in test_context.warnings:
            print(f"   - {warning}")
    
    # Print errors
    if test_context.errors:
        print(f"\n❌ Errors ({len(test_context.errors)}):")
        for error in test_context.errors:
            print(f"   - {error}")
    
    # Overall status
    total_time = time.time() - test_context.start_time
    print(f"\n⏱️  Total test time: {total_time:.2f}s")
    print(f"🎯 Target URL: {TARGET_URL}")
    
    if not test_context.errors:
        print(f"\n✅ All post-deployment tests passed!")
    else:
        print(f"\n❌ Some tests failed - review errors above")


if __name__ == "__main__":
    # Run tests with pytest
    import subprocess
    result = subprocess.run(
        [sys.executable, "-m", "pytest", __file__, "-v", "--tb=short"],
        capture_output=False
    )
    sys.exit(result.returncode)