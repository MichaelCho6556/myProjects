# ABOUTME: Real API integration tests - NO MOCKS  
# ABOUTME: Tests actual Flask endpoints with real database and test client

"""
Real API Integration Tests for AniManga Recommender Backend

Test Coverage:
- Health check endpoint
- Distinct values endpoint
- Items listing with filtering and pagination
- Search functionality
- Authentication-protected endpoints
- Error handling

NO MOCKS - All tests use real Flask test client and database
"""

import pytest
import json
from sqlalchemy import text

# Import test dependencies
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from tests.test_utils import TestDataManager, generate_jwt_token, create_auth_headers


@pytest.mark.real_integration
class TestHealthEndpoint:
    """Test the health check endpoint with real app."""
    
    def test_health_check_basic(self, client):
        """Test basic health check endpoint."""
        response = client.get('/')
        
        assert response.status_code == 200
        assert b"AniManga Recommender Backend" in response.data
    
    def test_health_check_with_database(self, client, database_connection):
        """Test health check with database connectivity."""
        # Verify database is accessible
        result = database_connection.execute(text("SELECT 1"))
        assert result.fetchone()[0] == 1
        
        response = client.get('/')
        assert response.status_code == 200


@pytest.mark.real_integration
class TestDistinctValuesEndpoint:
    """Test the /api/distinct-values endpoint with real data."""
    
    def test_get_distinct_values_with_data(self, client, database_connection):
        """Test retrieving distinct values from real database."""
        manager = TestDataManager(database_connection)
        
        # Create test items with various attributes
        items = [
            manager.create_test_item(
                uid="distinct_test_1",
                title="Action Anime",
                genres=["Action", "Adventure"],
                themes=["School", "Superpowers"]
            ),
            manager.create_test_item(
                uid="distinct_test_2",
                title="Comedy Anime",
                genres=["Comedy", "Romance"],
                themes=["School", "Love"]
            ),
            manager.create_test_item(
                uid="distinct_test_3",
                title="Drama Manga",
                item_type="manga",
                genres=["Drama", "Action"],
                themes=["Military"]
            )
        ]
        
        try:
            response = client.get('/api/distinct-values')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Check required keys
            required_keys = ['genres', 'statuses', 'media_types', 'themes', 
                           'demographics', 'studios', 'authors']
            for key in required_keys:
                assert key in data
                assert isinstance(data[key], list)
            
            # Check that our test data appears
            assert 'Action' in data['genres']
            assert 'Comedy' in data['genres']
            assert 'Drama' in data['genres']
            assert 'School' in data['themes']
            assert 'anime' in data['media_types']
            assert 'manga' in data['media_types']
            
        finally:
            manager.cleanup()
    
    def test_get_distinct_values_empty_database(self, client, database_connection):
        """Test distinct values with empty database."""
        # Clear any existing items
        database_connection.execute(text("DELETE FROM items"))
        database_connection.commit()
        
        response = client.get('/api/distinct-values')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # All lists should be empty or contain defaults
        for key in ['genres', 'themes', 'demographics', 'studios', 'authors']:
            assert isinstance(data[key], list)


@pytest.mark.real_integration
class TestItemsEndpoint:
    """Test the /api/items endpoint with real data."""
    
    def test_get_items_default_params(self, client, database_connection):
        """Test getting items with default parameters."""
        manager = TestDataManager(database_connection)
        
        # Create test items
        items = []
        for i in range(5):
            items.append(manager.create_test_item(
                uid=f"api_test_{i}",
                title=f"Test Anime {i}",
                score=7.0 + i * 0.5,
                episodes=12 + i
            ))
        
        try:
            response = client.get('/api/items')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Check response structure
            required_keys = ['items', 'page', 'per_page', 'total_items', 'total_pages', 'sort_by']
            for key in required_keys:
                assert key in data
            
            assert data['page'] == 1
            assert data['per_page'] == 30
            assert data['total_items'] >= 5
            assert len(data['items']) >= 5
            
            # Check that our test items are included
            item_uids = [item['uid'] for item in data['items']]
            for test_item in items:
                assert test_item['uid'] in item_uids
                
        finally:
            manager.cleanup()
    
    def test_get_items_pagination(self, client, database_connection):
        """Test pagination with real data."""
        manager = TestDataManager(database_connection)
        
        # Create 10 test items
        for i in range(10):
            manager.create_test_item(
                uid=f"page_test_{i}",
                title=f"Page Test Item {i}",
                score=8.0
            )
        
        try:
            # Request first page with 3 items per page
            response = client.get('/api/items?page=1&per_page=3')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['page'] == 1
            assert data['per_page'] == 3
            assert len(data['items']) <= 3
            assert data['total_items'] >= 10
            
            first_page_items = data['items']
            
            # Request second page
            response = client.get('/api/items?page=2&per_page=3')
            data = json.loads(response.data)
            
            assert data['page'] == 2
            assert len(data['items']) <= 3
            
            # Verify different items on different pages
            second_page_uids = [item['uid'] for item in data['items']]
            first_page_uids = [item['uid'] for item in first_page_items]
            
            # No overlap between pages
            assert not any(uid in first_page_uids for uid in second_page_uids)
            
        finally:
            manager.cleanup()
    
    def test_get_items_search_query(self, client, database_connection):
        """Test text search functionality with real data."""
        manager = TestDataManager(database_connection)
        
        # Create items with specific titles
        item1 = manager.create_test_item(
            uid="search_test_1",
            title="Attack on Titan",
            synopsis="Humanity fights against titans"
        )
        
        item2 = manager.create_test_item(
            uid="search_test_2",
            title="Death Note",
            synopsis="A notebook that can kill people"
        )
        
        item3 = manager.create_test_item(
            uid="search_test_3",
            title="Titan Academy",
            synopsis="School for young heroes"
        )
        
        try:
            # Search for "Titan"
            response = client.get('/api/items?q=Titan')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Should find items with "Titan" in title or synopsis
            found_uids = [item['uid'] for item in data['items']]
            assert "search_test_1" in found_uids  # "Attack on Titan"
            assert "search_test_3" in found_uids  # "Titan Academy"
            assert "search_test_2" not in found_uids  # "Death Note" doesn't match
            
        finally:
            manager.cleanup()
    
    def test_get_items_genre_filter(self, client, database_connection):
        """Test genre filtering with real data."""
        manager = TestDataManager(database_connection)
        
        # Create items with specific genres
        action_item = manager.create_test_item(
            uid="genre_test_1",
            title="Action Only",
            genres=["Action"]
        )
        
        action_adventure = manager.create_test_item(
            uid="genre_test_2",
            title="Action Adventure",
            genres=["Action", "Adventure"]
        )
        
        comedy_item = manager.create_test_item(
            uid="genre_test_3",
            title="Comedy Only",
            genres=["Comedy"]
        )
        
        try:
            # Filter by single genre
            response = client.get('/api/items?genre=Action')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            found_uids = [item['uid'] for item in data['items']]
            assert "genre_test_1" in found_uids  # Has Action
            assert "genre_test_2" in found_uids  # Has Action
            assert "genre_test_3" not in found_uids  # No Action
            
            # Filter by multiple genres (AND logic)
            response = client.get('/api/items?genre=Action,Adventure')
            data = json.loads(response.data)
            
            found_uids = [item['uid'] for item in data['items']]
            assert "genre_test_1" not in found_uids  # Missing Adventure
            assert "genre_test_2" in found_uids  # Has both
            assert "genre_test_3" not in found_uids  # Has neither
            
        finally:
            manager.cleanup()
    
    def test_get_items_score_filter(self, client, database_connection):
        """Test score filtering with real data."""
        manager = TestDataManager(database_connection)
        
        # Create items with different scores
        high_score = manager.create_test_item(
            uid="score_test_1",
            title="High Score Anime",
            score=9.2
        )
        
        medium_score = manager.create_test_item(
            uid="score_test_2",
            title="Medium Score Anime",
            score=7.5
        )
        
        low_score = manager.create_test_item(
            uid="score_test_3",
            title="Low Score Anime",
            score=5.8
        )
        
        try:
            # Filter by minimum score
            response = client.get('/api/items?min_score=7.0')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            found_uids = [item['uid'] for item in data['items']]
            assert "score_test_1" in found_uids  # 9.2 >= 7.0
            assert "score_test_2" in found_uids  # 7.5 >= 7.0
            assert "score_test_3" not in found_uids  # 5.8 < 7.0
            
            # Verify actual scores
            for item in data['items']:
                if item['uid'] in ["score_test_1", "score_test_2"]:
                    assert float(item['score']) >= 7.0
                    
        finally:
            manager.cleanup()
    
    def test_get_items_media_type_filter(self, client, database_connection):
        """Test media type filtering with real data."""
        manager = TestDataManager(database_connection)
        
        # Create different media types
        anime1 = manager.create_test_item(
            uid="media_test_1",
            title="Test Anime",
            item_type="anime"
        )
        
        anime2 = manager.create_test_item(
            uid="media_test_2",
            title="Another Anime",
            item_type="anime"
        )
        
        manga1 = manager.create_test_item(
            uid="media_test_3",
            title="Test Manga",
            item_type="manga"
        )
        
        try:
            # Filter by anime
            response = client.get('/api/items?media_type=anime')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            found_uids = [item['uid'] for item in data['items']]
            assert "media_test_1" in found_uids
            assert "media_test_2" in found_uids
            assert "media_test_3" not in found_uids
            
            # Verify all are anime
            for item in data['items']:
                if item['uid'].startswith("media_test_"):
                    assert item['type'] == 'anime'
            
            # Filter by manga
            response = client.get('/api/items?media_type=manga')
            data = json.loads(response.data)
            
            found_uids = [item['uid'] for item in data['items']]
            assert "media_test_1" not in found_uids
            assert "media_test_2" not in found_uids
            assert "media_test_3" in found_uids
            
        finally:
            manager.cleanup()
    
    def test_get_items_sorting(self, client, database_connection):
        """Test different sorting options with real data."""
        manager = TestDataManager(database_connection)
        
        # Create items with different scores and titles
        items = [
            manager.create_test_item(uid="sort_1", title="Zebra Show", score=8.5),
            manager.create_test_item(uid="sort_2", title="Alpha Series", score=9.0),
            manager.create_test_item(uid="sort_3", title="Beta Program", score=7.5)
        ]
        
        try:
            # Sort by score descending (default)
            response = client.get('/api/items?sort_by=score_desc')
            data = json.loads(response.data)
            
            scores = [item['score'] for item in data['items'] if item['uid'].startswith("sort_")]
            assert scores == sorted(scores, reverse=True)
            
            # Sort by title ascending
            response = client.get('/api/items?sort_by=title_asc')
            data = json.loads(response.data)
            
            titles = [item['title'] for item in data['items'] if item['uid'].startswith("sort_")]
            assert titles == sorted(titles)
            
        finally:
            manager.cleanup()
    
    def test_get_items_combined_filters(self, client, database_connection):
        """Test combining multiple filters with real data."""
        manager = TestDataManager(database_connection)
        
        # Create diverse test items
        item1 = manager.create_test_item(
            uid="combined_1",
            title="High Score Action Anime",
            item_type="anime",
            genres=["Action", "Adventure"],
            score=9.0
        )
        
        item2 = manager.create_test_item(
            uid="combined_2",
            title="Low Score Action Anime",
            item_type="anime",
            genres=["Action"],
            score=6.0
        )
        
        item3 = manager.create_test_item(
            uid="combined_3",
            title="High Score Comedy Manga",
            item_type="manga",
            genres=["Comedy"],
            score=8.5
        )
        
        try:
            # Combine media type, genre, and score filters
            response = client.get('/api/items?media_type=anime&genre=Action&min_score=7.0')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            found_uids = [item['uid'] for item in data['items']]
            
            # Only item1 matches all criteria
            assert "combined_1" in found_uids  # anime, Action, score 9.0
            assert "combined_2" not in found_uids  # score too low
            assert "combined_3" not in found_uids  # wrong media type and genre
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestItemDetailEndpoint:
    """Test the /api/items/<uid> endpoint with real data."""
    
    def test_get_item_by_uid_success(self, client, database_connection):
        """Test retrieving a specific item by UID."""
        manager = TestDataManager(database_connection)
        
        test_item = manager.create_test_item(
            uid="detail_test_123",
            title="Detailed Test Anime",
            synopsis="A very detailed synopsis for testing",
            score=8.7,
            episodes=24,
            genres=["Action", "Drama", "Mystery"]
        )
        
        try:
            response = client.get(f'/api/items/{test_item["uid"]}')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['uid'] == test_item['uid']
            assert data['title'] == test_item['title']
            assert data['synopsis'] == test_item['synopsis']
            assert data['score'] == test_item['score']
            assert data['episodes'] == test_item['episodes']
            assert set(data['genres']) == set(["Action", "Drama", "Mystery"])
            
        finally:
            manager.cleanup()
    
    def test_get_item_by_uid_not_found(self, client):
        """Test retrieving a non-existent item."""
        response = client.get('/api/items/non_existent_uid_12345')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data


@pytest.mark.real_integration  
class TestAuthenticatedEndpoints:
    """Test endpoints that require authentication with real auth."""
    
    def test_user_items_endpoint_authenticated(self, client, database_connection, app):
        """Test authenticated access to user items."""
        manager = TestDataManager(database_connection)
        
        # Create user and items
        user = manager.create_test_user(
            email="auth_api_test@example.com",
            username="auth_api_tester"
        )
        
        item = manager.create_test_item(
            uid="auth_item_test",
            title="User's Anime"
        )
        
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=item['uid'],
            status="watching",
            score=8.0,
            progress=5
        )
        
        try:
            # Generate auth token
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            
            headers = create_auth_headers(token)
            
            # Access user items endpoint
            response = client.get('/api/auth/user-items', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert 'items' in data
            assert len(data['items']) == 1
            assert data['items'][0]['item_uid'] == item['uid']
            assert data['items'][0]['status'] == 'watching'
            assert data['items'][0]['score'] == 8.0
            assert data['items'][0]['progress'] == 5
            
        finally:
            manager.cleanup()
    
    def test_user_items_endpoint_unauthenticated(self, client):
        """Test unauthenticated access is rejected."""
        response = client.get('/api/auth/user-items')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data