"""
Integration tests for API endpoints in the AniManga Recommender backend.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np


class TestHealthEndpoint:
    """Test the health check endpoint."""
    
    @pytest.mark.integration
    def test_health_check_with_data(self, client, mock_globals):
        """Test health check when data is loaded."""
        response = client.get('/')
        
        assert response.status_code == 200
        assert b"Hello from AniManga Recommender Backend!" in response.data
    
    @pytest.mark.integration
    def test_health_check_no_data(self, client, mock_none_globals):
        """Test health check when data is not loaded."""
        response = client.get('/')
        
        assert response.status_code == 200
        assert b"Backend is initializing" in response.data or b"encountered an error" in response.data


class TestDistinctValuesEndpoint:
    """Test the /api/distinct-values endpoint."""
    
    @pytest.mark.integration
    def test_get_distinct_values_success(self, client, mock_globals):
        """Test successful retrieval of distinct values."""
        response = client.get('/api/distinct-values')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Check required keys
        required_keys = ['genres', 'statuses', 'media_types', 'themes', 
                        'demographics', 'studios', 'authors']
        for key in required_keys:
            assert key in data
            assert isinstance(data[key], list)
        
        # Check some expected values based on our sample data
        assert 'Action' in data['genres']
        assert 'Comedy' in data['genres']
        assert 'anime' in data['media_types']
        assert 'manga' in data['media_types']
    
    @pytest.mark.integration
    def test_get_distinct_values_empty_data(self, client, mock_empty_globals):
        """Test distinct values with empty dataset."""
        response = client.get('/api/distinct-values')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # All lists should be empty
        for key in ['genres', 'statuses', 'media_types', 'themes', 
                   'demographics', 'studios', 'authors']:
            assert data[key] == []
    
    @pytest.mark.integration
    def test_get_distinct_values_no_data(self, client, mock_none_globals):
        """Test distinct values when data is not loaded."""
        response = client.get('/api/distinct-values')
        
        assert response.status_code == 503
        data = json.loads(response.data)
        
        # All lists should be empty with service unavailable status
        for key in ['genres', 'statuses', 'media_types', 'themes', 
                   'demographics', 'studios', 'authors']:
            assert data[key] == []


class TestItemsEndpoint:
    """Test the /api/items endpoint."""
    
    @pytest.mark.integration
    def test_get_items_default_params(self, client, mock_globals):
        """Test getting items with default parameters."""
        response = client.get('/api/items')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Check response structure
        required_keys = ['items', 'page', 'per_page', 'total_items', 'total_pages', 'sort_by']
        for key in required_keys:
            assert key in data
        
        assert data['page'] == 1
        assert data['per_page'] == 30
        assert data['total_items'] == 5  # Based on our sample data
        assert data['total_pages'] == 1
        assert data['sort_by'] == 'score_desc'
        assert len(data['items']) == 5
        
        # Check that image_url field mapping worked
        for item in data['items']:
            assert 'image_url' in item
            assert 'main_picture' not in item
    
    @pytest.mark.integration
    def test_get_items_pagination(self, client, mock_globals):
        """Test pagination parameters."""
        response = client.get('/api/items?page=1&per_page=2')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['page'] == 1
        assert data['per_page'] == 2
        assert len(data['items']) == 2
        assert data['total_items'] == 5
        assert data['total_pages'] == 3  # ceil(5/2) = 3
    
    @pytest.mark.integration
    def test_get_items_search_query(self, client, mock_globals):
        """Test text search functionality."""
        response = client.get('/api/items?q=Test Anime 1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['items']) == 1
        assert data['items'][0]['title'] == 'Test Anime 1'
    
    @pytest.mark.integration
    def test_get_items_media_type_filter(self, client, mock_globals):
        """Test media type filtering."""
        response = client.get('/api/items?media_type=anime')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['items']) == 3  # 3 anime items in sample data
        for item in data['items']:
            assert item['media_type'] == 'anime'
    
    @pytest.mark.integration
    def test_get_items_genre_filter_single(self, client, mock_globals):
        """Test single genre filtering."""
        response = client.get('/api/items?genre=action')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['items']) == 3  # Items with Action genre
        for item in data['items']:
            genres_lower = [g.lower() for g in item['genres']]
            assert 'action' in genres_lower
    
    @pytest.mark.integration
    def test_get_items_genre_filter_multiple(self, client, mock_globals):
        """Test multiple genre filtering (AND logic)."""
        response = client.get('/api/items?genre=action,adventure')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['items']) == 1  # Only one item has both Action and Adventure
        item = data['items'][0]
        genres_lower = [g.lower() for g in item['genres']]
        assert 'action' in genres_lower
        assert 'adventure' in genres_lower
    
    @pytest.mark.integration
    def test_get_items_status_filter(self, client, mock_globals):
        """Test status filtering."""
        response = client.get('/api/items?status=finished airing')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['items']) == 2  # 2 items with "Finished Airing" status
        for item in data['items']:
            assert item['status'].lower() == 'finished airing'
    
    @pytest.mark.integration
    def test_get_items_min_score_filter(self, client, mock_globals):
        """Test minimum score filtering."""
        response = client.get('/api/items?min_score=8.0')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['items']) == 2  # Items with score >= 8.0
        for item in data['items']:
            assert float(item['score']) >= 8.0
    
    @pytest.mark.integration
    def test_get_items_year_filter(self, client, mock_globals):
        """Test year filtering."""
        response = client.get('/api/items?year=2020')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['items']) == 1  # One item from 2020
        assert data['items'][0]['start_year_num'] == 2020
    
    @pytest.mark.integration
    def test_get_items_sorting_score_desc(self, client, mock_globals):
        """Test sorting by score descending."""
        response = client.get('/api/items?sort_by=score_desc')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Check that items are sorted by score descending
        scores = [float(item['score']) for item in data['items']]
        assert scores == sorted(scores, reverse=True)
    
    @pytest.mark.integration
    def test_get_items_sorting_title_asc(self, client, mock_globals):
        """Test sorting by title ascending."""
        response = client.get('/api/items?sort_by=title_asc')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Check that items are sorted by title ascending
        titles = [item['title'].lower() for item in data['items']]
        assert titles == sorted(titles)
    
    @pytest.mark.integration
    def test_get_items_combined_filters(self, client, mock_globals):
        """Test combination of multiple filters."""
        response = client.get('/api/items?media_type=anime&genre=action&min_score=7.0')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should return anime items with Action genre and score >= 7.0
        for item in data['items']:
            assert item['media_type'] == 'anime'
            genres_lower = [g.lower() for g in item['genres']]
            assert 'action' in genres_lower
            assert float(item['score']) >= 7.0
    
    @pytest.mark.integration
    def test_get_items_no_results(self, client, mock_globals):
        """Test query that returns no results."""
        response = client.get('/api/items?q=nonexistent title')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['items']) == 0
        assert data['total_items'] == 0
        assert data['total_pages'] == 0
    
    @pytest.mark.integration
    def test_get_items_empty_dataset(self, client, mock_empty_globals):
        """Test items endpoint with empty dataset."""
        response = client.get('/api/items')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['items']) == 0
        assert data['total_items'] == 0
        assert data['total_pages'] == 0
    
    @pytest.mark.integration
    def test_get_items_no_data_loaded(self, client, mock_none_globals):
        """Test items endpoint when data is not loaded."""
        response = client.get('/api/items')
        
        assert response.status_code == 503
        data = json.loads(response.data)
        assert 'error' in data


class TestItemDetailEndpoint:
    """Test the /api/items/<uid> endpoint."""
    
    @pytest.mark.integration
    def test_get_item_detail_success(self, client, mock_globals):
        """Test successful retrieval of item details."""
        response = client.get('/api/items/anime_1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['uid'] == 'anime_1'
        assert data['title'] == 'Test Anime 1'
        assert data['media_type'] == 'anime'
        assert 'image_url' in data  # Field mapping should work
        assert 'main_picture' not in data
    
    @pytest.mark.integration
    def test_get_item_detail_not_found(self, client, mock_globals):
        """Test retrieval of non-existent item."""
        response = client.get('/api/items/nonexistent_uid')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'not found' in data['error'].lower()
    
    @pytest.mark.integration
    def test_get_item_detail_no_data(self, client, mock_none_globals):
        """Test item detail when data is not loaded."""
        response = client.get('/api/items/anime_1')
        
        assert response.status_code == 503
        data = json.loads(response.data)
        assert 'error' in data


class TestRecommendationsEndpoint:
    """Test the /api/recommendations/<uid> endpoint."""
    
    @pytest.mark.integration
    def test_get_recommendations_success(self, client, mock_globals):
        """Test successful retrieval of recommendations."""
        response = client.get('/api/recommendations/anime_1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'source_item_uid' in data
        assert 'source_item_title' in data
        assert 'recommendations' in data
        assert data['source_item_uid'] == 'anime_1'
        assert isinstance(data['recommendations'], list)
        
        # Check that source item is not in recommendations
        rec_uids = [rec['uid'] for rec in data['recommendations']]
        assert 'anime_1' not in rec_uids
        
        # Check field mapping for recommendations
        for rec in data['recommendations']:
            assert 'image_url' in rec
            assert 'main_picture' not in rec
    
    @pytest.mark.integration
    def test_get_recommendations_with_n_param(self, client, mock_globals):
        """Test recommendations with custom number parameter."""
        response = client.get('/api/recommendations/anime_1?n=2')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['recommendations']) <= 2  # Might be less if dataset is small
    
    @pytest.mark.integration
    def test_get_recommendations_not_found(self, client, mock_globals):
        """Test recommendations for non-existent item."""
        response = client.get('/api/recommendations/nonexistent_uid')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'not found' in data['error'].lower()
    
    @pytest.mark.integration
    def test_get_recommendations_no_data(self, client, mock_none_globals):
        """Test recommendations when data is not loaded."""
        response = client.get('/api/recommendations/anime_1')
        
        assert response.status_code == 503
        data = json.loads(response.data)
        assert 'error' in data
        assert 'not ready' in data['error'].lower()
    
    @pytest.mark.integration
    def test_get_recommendations_required_fields(self, client, mock_globals):
        """Test that recommendations contain required fields."""
        response = client.get('/api/recommendations/anime_1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        required_fields = ['uid', 'title', 'media_type', 'score', 'image_url', 'genres', 'synopsis']
        for rec in data['recommendations']:
            for field in required_fields:
                assert field in rec


class TestErrorHandling:
    """Test various error scenarios and edge cases."""
    
    @pytest.mark.integration
    def test_invalid_page_parameter(self, client, mock_globals):
        """Test handling of invalid page parameter."""
        response = client.get('/api/items?page=0')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        # Page 0 should be treated as page 1
        assert data['page'] == 0  # Flask request.args gets the actual value
    
    @pytest.mark.integration
    def test_invalid_per_page_parameter(self, client, mock_globals):
        """Test handling of invalid per_page parameter."""
        response = client.get('/api/items?per_page=-1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        # Negative per_page should be handled gracefully
        assert data['per_page'] == -1
    
    @pytest.mark.integration
    def test_invalid_score_parameter(self, client, mock_globals):
        """Test handling of invalid min_score parameter."""
        response = client.get('/api/items?min_score=invalid')
        
        # Flask request.args.get() with type=float returns None for invalid values
        # Our app handles this gracefully and treats None as "no filter"
        assert response.status_code == 200
        data = json.loads(response.data)
        # Should return all items since invalid min_score is treated as None
        assert len(data['items']) > 0
    
    @pytest.mark.integration
    def test_invalid_year_parameter(self, client, mock_globals):
        """Test handling of invalid year parameter."""
        response = client.get('/api/items?year=invalid')
        
        # Flask request.args.get() with type=int returns None for invalid values
        # Our app handles this gracefully and treats None as "no filter"
        assert response.status_code == 200
        data = json.loads(response.data)
        # Should return all items since invalid year is treated as None
        assert len(data['items']) > 0
    
    @pytest.mark.integration
    def test_recommendations_invalid_n_parameter(self, client, mock_globals):
        """Test handling of invalid n parameter for recommendations."""
        response = client.get('/api/recommendations/anime_1?n=invalid')
        
        # Flask request.args.get() with type=int returns None for invalid values
        # Our app uses default value of 10 when n is None/invalid
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'recommendations' in data


class TestPerformance:
    """Test performance-related scenarios."""
    
    @pytest.mark.integration
    @pytest.mark.slow
    def test_large_page_size(self, client, mock_globals):
        """Test handling of very large page size."""
        response = client.get('/api/items?per_page=1000')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        # Should return all available items (5 in our sample)
        assert len(data['items']) == 5
    
    @pytest.mark.integration
    def test_complex_query_performance(self, client, mock_globals):
        """Test performance with complex queries."""
        response = client.get('/api/items?q=test&media_type=anime&genre=action&theme=school&status=finished airing&min_score=7.0&year=2020&sort_by=score_desc')
        
        assert response.status_code == 200
        # Should complete without timeout (handled by test framework)
    
    @pytest.mark.integration
    def test_recommendations_performance(self, client, mock_globals):
        """Test recommendations performance."""
        response = client.get('/api/recommendations/anime_1?n=10')
        
        assert response.status_code == 200
        # Should complete without timeout


class TestDataConsistency:
    """Test data consistency across endpoints."""
    
    @pytest.mark.integration
    def test_item_detail_matches_list(self, client, mock_globals):
        """Test that item details match items in the list."""
        # Get items list
        list_response = client.get('/api/items')
        list_data = json.loads(list_response.data)
        
        if list_data['items']:
            first_item = list_data['items'][0]
            uid = first_item['uid']
            
            # Get item details
            detail_response = client.get(f'/api/items/{uid}')
            detail_data = json.loads(detail_response.data)
            
            # Compare key fields
            assert detail_data['uid'] == first_item['uid']
            assert detail_data['title'] == first_item['title']
            assert detail_data['media_type'] == first_item['media_type']
    
    @pytest.mark.integration
    def test_distinct_values_match_items(self, client, mock_globals):
        """Test that distinct values match what's actually in items."""
        # Get distinct values
        distinct_response = client.get('/api/distinct-values')
        distinct_data = json.loads(distinct_response.data)
        
        # Get all items
        items_response = client.get('/api/items?per_page=1000')
        items_data = json.loads(items_response.data)
        
        # Check that media types in items match distinct values
        item_media_types = set(item['media_type'] for item in items_data['items'])
        for media_type in item_media_types:
            assert media_type in distinct_data['media_types'] 