# ABOUTME: Real integration tests for public API endpoints (items, recommendations)
# ABOUTME: Tests actual database queries and API responses without any mocks

"""
Public API Integration Tests

Tests public endpoints that don't require authentication:
- Item listing and filtering
- Item details
- Recommendations
- Search functionality
- All using real database connections
"""

import pytest
import json
from sqlalchemy import text


@pytest.mark.real_integration
class TestPublicAPIReal:
    """Test public API endpoints with real database connections."""
    
    def test_health_check_endpoint(self, client):
        """Test the health check endpoint."""
        response = client.get('/')
        
        assert response.status_code == 200
        assert b"AniManga Recommender Backend" in response.data
    
    def test_items_endpoint_basic(self, client, load_test_items):
        """Test basic items endpoint functionality."""
        response = client.get('/api/items')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'items' in data
        assert 'total' in data
        assert 'page' in data
        assert 'per_page' in data
        assert 'total_pages' in data
        
        # Verify items are returned
        assert len(data['items']) > 0
        
        # Verify item structure
        item = data['items'][0]
        required_fields = ['uid', 'title', 'media_type', 'score', 'synopsis', 'main_picture']
        for field in required_fields:
            assert field in item
    
    def test_items_endpoint_pagination(self, client, load_test_items):
        """Test items endpoint pagination."""
        # Test first page
        response = client.get('/api/items?page=1&per_page=2')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['page'] == 1
        assert data['per_page'] == 2
        assert len(data['items']) <= 2
        
        # Test second page if items exist
        if data['total_pages'] > 1:
            response = client.get('/api/items?page=2&per_page=2')
            assert response.status_code == 200
            data2 = json.loads(response.data)
            assert data2['page'] == 2
    
    def test_items_endpoint_filtering_by_media_type(self, client, load_test_items):
        """Test filtering items by media type."""
        # Filter by anime
        response = client.get('/api/items?media_type=anime')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        for item in data['items']:
            assert item['media_type'] == 'anime'
        
        # Filter by manga
        response = client.get('/api/items?media_type=manga')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        for item in data['items']:
            assert item['media_type'] == 'manga'
    
    def test_items_endpoint_filtering_by_genre(self, client, load_test_items):
        """Test filtering items by genre."""
        response = client.get('/api/items?genres=Action')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify all returned items have the Action genre
        for item in data['items']:
            assert 'Action' in item.get('genres', [])
    
    def test_items_endpoint_search_by_title(self, client, load_test_items):
        """Test searching items by title."""
        response = client.get('/api/items?search=Test Anime')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify search results contain the search term
        for item in data['items']:
            assert 'Test Anime' in item['title'] or 'Test' in item['title']
    
    def test_items_endpoint_score_filtering(self, client, load_test_items):
        """Test filtering items by score."""
        response = client.get('/api/items?min_score=8.0')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify all returned items have score >= 8.0
        for item in data['items']:
            assert item['score'] >= 8.0
    
    def test_items_endpoint_sorting(self, client, load_test_items):
        """Test sorting items."""
        # Sort by score descending
        response = client.get('/api/items?sort=score&order=desc')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify items are sorted by score descending
        scores = [item['score'] for item in data['items']]
        assert scores == sorted(scores, reverse=True)
        
        # Sort by title ascending
        response = client.get('/api/items?sort=title&order=asc')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify items are sorted by title ascending
        titles = [item['title'] for item in data['items']]
        assert titles == sorted(titles)
    
    def test_item_detail_endpoint(self, client, load_test_items, sample_items_data):
        """Test item detail endpoint."""
        # Get a specific item
        item_uid = sample_items_data.iloc[0]['uid']
        response = client.get(f'/api/items/{item_uid}')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify item details
        assert data['uid'] == item_uid
        assert data['title'] == sample_items_data.iloc[0]['title']
        assert data['media_type'] == sample_items_data.iloc[0]['media_type']
        assert data['score'] == sample_items_data.iloc[0]['score']
        
        # Verify detailed fields are present
        detailed_fields = ['synopsis', 'status', 'genres', 'main_picture']
        for field in detailed_fields:
            assert field in data
    
    def test_item_detail_not_found(self, client):
        """Test item detail endpoint with non-existent item."""
        response = client.get('/api/items/non-existent-item')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_recommendations_endpoint(self, client, load_test_items, sample_items_data):
        """Test recommendations endpoint."""
        # Get recommendations for a specific item
        item_uid = sample_items_data.iloc[0]['uid']
        response = client.get(f'/api/recommendations/{item_uid}')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'recommendations' in data
        assert 'target_item' in data
        assert 'algorithm' in data
        
        # Verify target item
        assert data['target_item']['uid'] == item_uid
        
        # Verify recommendations structure
        if data['recommendations']:
            rec = data['recommendations'][0]
            assert 'uid' in rec
            assert 'title' in rec
            assert 'similarity_score' in rec
            assert 'reason' in rec
    
    def test_recommendations_with_limit(self, client, load_test_items, sample_items_data):
        """Test recommendations endpoint with limit parameter."""
        item_uid = sample_items_data.iloc[0]['uid']
        response = client.get(f'/api/recommendations/{item_uid}?limit=2')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify limit is respected
        assert len(data['recommendations']) <= 2
    
    def test_recommendations_not_found(self, client):
        """Test recommendations endpoint with non-existent item."""
        response = client.get('/api/recommendations/non-existent-item')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_items_endpoint_complex_filtering(self, client, load_test_items):
        """Test complex filtering combinations."""
        # Multiple filters
        response = client.get('/api/items?media_type=anime&min_score=7.0&genres=Action&sort=score&order=desc')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify all filters are applied
        for item in data['items']:
            assert item['media_type'] == 'anime'
            assert item['score'] >= 7.0
            assert 'Action' in item.get('genres', [])
        
        # Verify sorting
        scores = [item['score'] for item in data['items']]
        assert scores == sorted(scores, reverse=True)
    
    def test_items_endpoint_invalid_parameters(self, client):
        """Test items endpoint with invalid parameters."""
        # Invalid page number
        response = client.get('/api/items?page=0')
        assert response.status_code == 400
        
        # Invalid per_page
        response = client.get('/api/items?per_page=0')
        assert response.status_code == 400
        
        # Invalid sort field
        response = client.get('/api/items?sort=invalid_field')
        assert response.status_code == 400
        
        # Invalid order
        response = client.get('/api/items?order=invalid_order')
        assert response.status_code == 400
    
    def test_items_endpoint_sfw_filtering(self, client, load_test_items):
        """Test SFW (Safe For Work) filtering."""
        # Request only SFW content
        response = client.get('/api/items?sfw=true')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify all items are SFW
        for item in data['items']:
            assert item.get('sfw', True) is True
        
        # Request all content (including NSFW)
        response = client.get('/api/items?sfw=false')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should include both SFW and NSFW content
        sfw_statuses = [item.get('sfw', True) for item in data['items']]
        assert True in sfw_statuses  # At least some SFW content
    
    def test_items_endpoint_status_filtering(self, client, load_test_items):
        """Test filtering by status."""
        response = client.get('/api/items?status=Finished Airing')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify all items have the specified status
        for item in data['items']:
            assert item['status'] == 'Finished Airing'


@pytest.mark.real_integration
@pytest.mark.performance
class TestPublicAPIPerformance:
    """Performance tests for public API endpoints."""
    
    def test_items_endpoint_performance(self, client, load_test_items, benchmark_timer):
        """Test performance of items endpoint."""
        with benchmark_timer('items_endpoint_basic'):
            response = client.get('/api/items')
            assert response.status_code == 200
    
    def test_items_endpoint_with_filtering_performance(self, client, load_test_items, benchmark_timer):
        """Test performance of items endpoint with filtering."""
        with benchmark_timer('items_endpoint_filtered'):
            response = client.get('/api/items?media_type=anime&min_score=8.0&genres=Action')
            assert response.status_code == 200
    
    def test_item_detail_performance(self, client, load_test_items, sample_items_data, benchmark_timer):
        """Test performance of item detail endpoint."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        with benchmark_timer('item_detail'):
            response = client.get(f'/api/items/{item_uid}')
            assert response.status_code == 200
    
    def test_recommendations_performance(self, client, load_test_items, sample_items_data, benchmark_timer):
        """Test performance of recommendations endpoint."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        with benchmark_timer('recommendations'):
            response = client.get(f'/api/recommendations/{item_uid}')
            assert response.status_code == 200
    
    def test_concurrent_requests_performance(self, client, load_test_items, benchmark_timer):
        """Test performance under concurrent requests."""
        import concurrent.futures
        
        def make_request():
            return client.get('/api/items')
        
        with benchmark_timer('concurrent_requests'):
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(make_request) for _ in range(20)]
                responses = [f.result() for f in futures]
        
        # Verify all requests succeeded
        for response in responses:
            assert response.status_code == 200


@pytest.mark.real_integration
@pytest.mark.security
class TestPublicAPISecurity:
    """Security tests for public API endpoints."""
    
    def test_sql_injection_protection(self, client):
        """Test protection against SQL injection attacks."""
        # Attempt SQL injection in search parameter
        malicious_queries = [
            "'; DROP TABLE items; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM user_profiles --",
            "'; DELETE FROM items WHERE '1'='1"
        ]
        
        for query in malicious_queries:
            response = client.get(f'/api/items?search={query}')
            # Should not return 500 error (SQL injection blocked)
            assert response.status_code in [200, 400]
            
            # Verify database is still intact by making normal request
            normal_response = client.get('/api/items')
            assert normal_response.status_code == 200
    
    def test_xss_protection(self, client):
        """Test protection against XSS attacks."""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//"
        ]
        
        for payload in xss_payloads:
            response = client.get(f'/api/items?search={payload}')
            assert response.status_code in [200, 400]
            
            # Verify response doesn't contain unescaped script tags
            if response.status_code == 200:
                response_text = response.data.decode('utf-8')
                assert '<script>' not in response_text
                assert 'javascript:' not in response_text
    
    def test_parameter_validation(self, client):
        """Test parameter validation and sanitization."""
        # Test extremely long parameters
        long_string = 'x' * 10000
        response = client.get(f'/api/items?search={long_string}')
        assert response.status_code in [200, 400]
        
        # Test invalid characters
        response = client.get('/api/items?search=\x00\x01\x02')
        assert response.status_code in [200, 400]
        
        # Test unicode handling
        response = client.get('/api/items?search=漫画')
        assert response.status_code == 200
    
    def test_rate_limiting_simulation(self, client, load_test_items):
        """Test behavior under rapid requests (rate limiting simulation)."""
        # Make rapid requests
        responses = []
        for i in range(50):
            response = client.get('/api/items')
            responses.append(response)
        
        # Verify system handles rapid requests gracefully
        success_count = sum(1 for r in responses if r.status_code == 200)
        rate_limited_count = sum(1 for r in responses if r.status_code == 429)
        
        # Should have mostly successful requests
        assert success_count > 0
        # If rate limiting is implemented, some requests might be rate limited
        assert success_count + rate_limited_count == len(responses)