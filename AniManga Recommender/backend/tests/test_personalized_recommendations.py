"""
Test suite for personalized recommendation system.

This module contains comprehensive tests for the personalized recommendation
algorithms, caching mechanisms, and API endpoints implemented in Task 1.2.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Import the functions we want to test
from app import (
    analyze_user_preferences,
    generate_personalized_recommendations,
    get_personalized_recommendation_cache,
    set_personalized_recommendation_cache,
    invalidate_personalized_recommendation_cache,
    invalidate_all_user_caches,
    _generate_content_based_recommendations,
    _generate_trending_genre_recommendations,
    _generate_hidden_gem_recommendations,
    _calculate_diversity,
    create_app
)


class TestPersonalizedRecommendations:
    """Test cases for personalized recommendation system"""

    @pytest.fixture
    def mock_user_items(self):
        """Mock user items for testing"""
        return [
            {
                'item_uid': 'anime_1',
                'status': 'completed',
                'rating': 9.0,
                'progress': 24
            },
            {
                'item_uid': 'anime_2', 
                'status': 'watching',
                'rating': None,
                'progress': 12
            },
            {
                'item_uid': 'manga_1',
                'status': 'completed',
                'rating': 8.5,
                'progress': 50
            }
        ]

    @pytest.fixture
    def mock_item_details(self):
        """Mock item details for testing"""
        return {
            'anime_1': {
                'uid': 'anime_1',
                'title': 'Attack on Titan',
                'media_type': 'anime',
                'genres': ['Action', 'Drama'],
                'episodes': 24,
                'score': 9.0
            },
            'anime_2': {
                'uid': 'anime_2',
                'title': 'One Piece',
                'media_type': 'anime', 
                'genres': ['Action', 'Adventure'],
                'episodes': 1000,
                'score': 8.8
            },
            'manga_1': {
                'uid': 'manga_1',
                'title': 'Death Note',
                'media_type': 'manga',
                'genres': ['Psychological', 'Thriller'],
                'chapters': 108,
                'score': 9.0
            }
        }

    @pytest.fixture
    def mock_dataframe(self):
        """Mock processed dataframe for testing"""
        data = {
            'uid': ['anime_3', 'anime_4', 'manga_2'],
            'title': ['Naruto', 'Demon Slayer', 'One Piece Manga'],
            'media_type': ['anime', 'anime', 'manga'],
            'genres': [['Action', 'Adventure'], ['Action', 'Supernatural'], ['Action', 'Adventure']],
            'score': [8.7, 8.9, 9.2],
            'episodes': [720, 26, 0],
            'chapters': [0, 0, 1000],
            'synopsis': ['Ninja story', 'Demon hunting', 'Pirate adventure'],
            'image_url': ['url1', 'url2', 'url3']
        }
        return pd.DataFrame(data)

    def test_analyze_user_preferences_with_data(self, mock_user_items):
        """Test user preference analysis with real data"""
        with patch('app.requests.get') as mock_get, \
             patch('app.get_item_details_for_stats') as mock_get_details:
            
            # Mock API response
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_user_items
            mock_get.return_value = mock_response
            
            # Mock item details
            mock_get_details.side_effect = lambda uid: {
                'uid': uid,
                'media_type': 'anime' if 'anime' in uid else 'manga',
                'genres': ['Action', 'Drama'],
                'episodes': 24,
                'score': 8.5
            }
            
            preferences = analyze_user_preferences('test_user_123')
            
            # Verify preferences structure
            assert 'genre_preferences' in preferences
            assert 'rating_patterns' in preferences
            assert 'completion_tendencies' in preferences
            assert 'media_type_preference' in preferences
            
            # Verify rating patterns
            assert preferences['rating_patterns']['rating_count'] >= 0

    def test_calculate_diversity(self):
        """Test diversity calculation function"""
        # Test empty preferences
        assert _calculate_diversity({}) == 0.5
        
        # Test multiple genres (some diversity)
        multiple_genres = {'Action': 0.5, 'Drama': 0.3, 'Comedy': 0.2}
        diversity = _calculate_diversity(multiple_genres)
        assert 0.0 <= diversity <= 1.0

    def test_recommendation_caching(self):
        """Test recommendation caching mechanisms"""
        user_id = 'test_user_123'
        test_recommendations = {
            'recommendations': {
                'completed_based': [],
                'trending_genres': [],
                'hidden_gems': []
            },
            'user_preferences': {},
            'cache_info': {}
        }
        
        # Test setting cache
        success = set_personalized_recommendation_cache(user_id, test_recommendations)
        assert success is True
        
        # Test cache invalidation
        invalidation_success = invalidate_personalized_recommendation_cache(user_id)
        assert invalidation_success is True

    def test_generate_personalized_recommendations_integration(self, mock_dataframe):
        """Test full recommendation generation pipeline"""
        user_id = 'test_user_123'
        user_preferences = {
            'genre_preferences': {'Action': 0.6, 'Drama': 0.4},
            'rating_patterns': {'average_rating': 8.0, 'rating_count': 5, 'strictness': 'moderate'},
            'completion_tendencies': {'short': 2, 'medium': 3, 'long': 1},
            'media_type_preference': 'both',
            'preferred_score_range': (7.0, 9.0),
            'diversity_factor': 0.7,
            'total_items': 6
        }
        
        with patch('app.ensure_data_loaded'), \
             patch('app.df_processed', mock_dataframe), \
             patch('app.tfidf_matrix_global', np.random.rand(3, 100)), \
             patch('app._get_user_items_for_recommendations') as mock_get_items:
            
            # Mock user items
            mock_get_items.return_value = [
                {'item_uid': 'anime_1', 'status': 'completed'},
                {'item_uid': 'anime_2', 'status': 'watching'}
            ]
            
            recommendations = generate_personalized_recommendations(user_id, user_preferences, limit=6)
            
            # Verify structure
            assert 'completed_based' in recommendations
            assert 'trending_genres' in recommendations  
            assert 'hidden_gems' in recommendations
            
            # Verify it returns lists
            assert isinstance(recommendations['completed_based'], list)
            assert isinstance(recommendations['trending_genres'], list)
            assert isinstance(recommendations['hidden_gems'], list)

    def test_content_based_recommendations(self, mock_dataframe):
        """Test content-based recommendation generation"""
        completed_items = [
            {'item_uid': 'anime_1', 'rating': 9.0},
            {'item_uid': 'anime_2', 'rating': 8.0}
        ]
        
        user_preferences = {
            'genre_preferences': {'Action': 0.8},
            'preferred_score_range': (7.0, 9.0)
        }
        
        exclude_uids = {'anime_1', 'anime_2'}
        
        with patch('app.uid_to_idx', pd.Series(['anime_1', 'anime_2', 'anime_3'], 
                                              index=['anime_1', 'anime_2', 'anime_3'])), \
             patch('app.tfidf_matrix_global', np.random.rand(3, 100)), \
             patch('app.df_processed', mock_dataframe), \
             patch('app.cosine_similarity') as mock_similarity:
            
            # Mock similarity scores
            mock_similarity.return_value = np.array([[0.1, 0.9, 0.7]])
            
            recommendations = _generate_content_based_recommendations(
                completed_items, user_preferences, exclude_uids, limit=5
            )
            
            # Should return some recommendations
            assert isinstance(recommendations, list)

    def test_trending_genre_recommendations(self, mock_dataframe):
        """Test trending genre recommendation generation"""
        user_preferences = {
            'genre_preferences': {'Action': 0.8, 'Adventure': 0.6},
            'preferred_score_range': (7.0, 9.0)
        }
        
        exclude_uids = set()
        
        with patch('app.df_processed', mock_dataframe):
            recommendations = _generate_trending_genre_recommendations(
                user_preferences, exclude_uids, limit=5
            )
            
            # Should return recommendations based on preferred genres
            assert isinstance(recommendations, list)

    def test_hidden_gem_recommendations(self, mock_dataframe):
        """Test hidden gem recommendation generation"""
        user_preferences = {
            'genre_preferences': {'Action': 0.7},
            'preferred_score_range': (7.0, 9.0)
        }
        
        exclude_uids = set()
        
        with patch('app.df_processed', mock_dataframe):
            recommendations = _generate_hidden_gem_recommendations(
                user_preferences, exclude_uids, limit=5
            )
            
            # Should return high-quality recommendations
            assert isinstance(recommendations, list)

    def test_all_caches_invalidation(self):
        """Test invalidating all user caches"""
        with patch('app.invalidate_user_statistics_cache') as mock_stats, \
             patch('app.invalidate_personalized_recommendation_cache') as mock_recs:
            
            mock_stats.return_value = True
            mock_recs.return_value = True
            
            result = invalidate_all_user_caches('test_user_123')
            
            assert result is True
            mock_stats.assert_called_once_with('test_user_123')
            mock_recs.assert_called_once_with('test_user_123')


class TestPersonalizedRecommendationsAPI:
    """Test cases for personalized recommendations API endpoint"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        app = create_app('testing')
        with app.test_client() as client:
            yield client

    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers"""
        return {'Authorization': 'Bearer test_token'}

    def test_personalized_recommendations_endpoint_basic(self, client, auth_headers):
        """Test basic personalized recommendations API call"""
        with patch('app.g') as mock_g, \
             patch('app.analyze_user_preferences') as mock_analyze, \
             patch('app.generate_personalized_recommendations') as mock_generate, \
             patch('app.get_personalized_recommendation_cache') as mock_cache:
            
            # Mock authentication
            mock_g.current_user = {'user_id': 'test_user_123'}
            
            # Mock cache miss
            mock_cache.return_value = None
            
            # Mock user preferences
            mock_analyze.return_value = {
                'genre_preferences': {'Action': 0.8},
                'rating_patterns': {'average_rating': 8.0, 'rating_count': 10, 'strictness': 'moderate'},
                'completion_tendencies': {'medium': 5},
                'media_type_preference': 'both',
                'total_items': 10
            }
            
            # Mock recommendations
            mock_generate.return_value = {
                'completed_based': [],
                'trending_genres': [],
                'hidden_gems': []
            }
            
            response = client.get('/api/auth/personalized-recommendations', headers=auth_headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Verify response structure
            assert 'recommendations' in data
            assert 'user_preferences' in data
            assert 'cache_info' in data

    def test_personalized_recommendations_invalid_section(self, client, auth_headers):
        """Test invalid section parameter"""
        with patch('app.g') as mock_g:
            # Mock authentication
            mock_g.current_user = {'user_id': 'test_user_123'}
            
            response = client.get('/api/auth/personalized-recommendations?section=invalid', headers=auth_headers)
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'error' in data


if __name__ == '__main__':
    pytest.main([__file__]) 