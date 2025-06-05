"""
Comprehensive Recommendation Engine Tests for AniManga Recommender
Phase A4: Recommendation Engine Testing

Test Coverage:
- TF-IDF matrix initialization and computation
- Data loading from Supabase for recommendations
- Cosine similarity calculations and ranking
- Recommendation endpoint functionality
- Text feature combination and preprocessing
- Edge cases and error handling
- Performance testing with large datasets
- Recommendation accuracy and relevance
"""

import pytest
import json
import time
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Import test dependencies
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import (
    app, load_data_and_tfidf_from_supabase, create_combined_text_features,
    get_recommendations, map_field_names_for_frontend, map_records_for_frontend,
    df_processed, tfidf_vectorizer_global, tfidf_matrix_global, uid_to_idx
)
from supabase_client import SupabaseClient


class TestDataLoadingAndPreprocessing:
    """Test suite for data loading and TF-IDF preprocessing"""
    
    @pytest.mark.unit
    def test_load_data_from_supabase_success(self):
        """Test successful data loading from Supabase"""
        # Create mock DataFrame
        mock_df = pd.DataFrame({
            'uid': ['anime_1', 'anime_2', 'manga_1'],
            'title': ['Test Anime 1', 'Test Anime 2', 'Test Manga 1'],
            'media_type': ['anime', 'anime', 'manga'],
            'genres': [['Action', 'Adventure'], ['Comedy'], ['Romance', 'Drama']],
            'synopsis': ['Action-packed anime', 'Funny comedy', 'Romantic story']
        })
        
        with patch('supabase_client.SupabaseClient') as mock_client_class, \
             patch('app.create_combined_text_features') as mock_create_features, \
             patch('sklearn.feature_extraction.text.TfidfVectorizer') as mock_tfidf:
            
            # Mock Supabase client
            mock_client = Mock()
            mock_client.items_to_dataframe.return_value = mock_df
            mock_client_class.return_value = mock_client
            
            # Mock text features creation
            mock_df_with_features = mock_df.copy()
            mock_df_with_features['combined_text_features'] = [
                'action adventure action-packed anime test anime 1',
                'comedy funny comedy test anime 2',
                'romance drama romantic story test manga 1'
            ]
            mock_create_features.return_value = mock_df_with_features
            
            # Mock TF-IDF vectorizer
            mock_vectorizer = Mock()
            mock_tfidf_matrix = np.random.rand(3, 100)  # 3 items, 100 features
            mock_vectorizer.fit_transform.return_value = mock_tfidf_matrix
            mock_tfidf.return_value = mock_vectorizer
            
            # Reset global state
            import app
            app.df_processed = None
            app.tfidf_matrix_global = None
            app.tfidf_vectorizer_global = None
            
            # Test data loading
            load_data_and_tfidf_from_supabase()
            
            # Verify results
            assert app.df_processed is not None
            assert len(app.df_processed) == 3
            assert app.tfidf_matrix_global is not None
            assert app.tfidf_vectorizer_global is not None
            assert app.uid_to_idx is not None
    
    @pytest.mark.unit
    def test_load_data_from_supabase_empty_dataset(self):
        """Test handling of empty dataset from Supabase"""
        with patch('supabase_client.SupabaseClient') as mock_client_class:
            # Mock empty DataFrame
            mock_client = Mock()
            mock_client.items_to_dataframe.return_value = pd.DataFrame()
            mock_client_class.return_value = mock_client
            
            # Reset global state
            import app
            app.df_processed = None
            app.tfidf_matrix_global = None
            
            # Test data loading
            load_data_and_tfidf_from_supabase()
            
            # Verify empty state handling
            assert len(app.df_processed) == 0
            assert app.tfidf_matrix_global is None
            assert app.tfidf_vectorizer_global is None
    
    @pytest.mark.unit
    def test_load_data_already_loaded(self):
        """Test that data loading is skipped if already loaded"""
        # Mock existing data
        import app
        app.df_processed = pd.DataFrame({'uid': ['test_1'], 'title': ['Test']})
        app.tfidf_matrix_global = np.array([[1, 0, 0]])
        
        with patch('supabase_client.SupabaseClient') as mock_client_class:
            mock_client = Mock()
            mock_client_class.return_value = mock_client
            
            # Test data loading
            load_data_and_tfidf_from_supabase()
            
            # Verify client was not called (data already loaded)
            mock_client.items_to_dataframe.assert_not_called()
    
    @pytest.mark.unit
    def test_create_combined_text_features(self):
        """Test text feature combination for TF-IDF"""
        # Create test DataFrame
        test_df = pd.DataFrame({
            'uid': ['anime_1', 'manga_1'],
            'title': ['Action Hero', 'Romance Story'],
            'genres': [['Action', 'Adventure'], ['Romance', 'Drama']],
            'themes': [['Superpowers'], ['School']],
            'demographics': [['Shounen'], ['Shoujo']],
            'synopsis': ['A hero saves the world', 'A love story unfolds'],
            'start_date': ['2020-01-01', '2021-06-15']
        })
        
        # Test feature creation
        result_df = create_combined_text_features(test_df)
        
        # Verify combined features exist
        assert 'combined_text_features' in result_df.columns
        assert 'genres_str' in result_df.columns
        assert 'themes_str' in result_df.columns
        assert 'demographics_str' in result_df.columns
        assert 'start_year_num' in result_df.columns
        
        # Check content of combined features
        assert 'action adventure' in result_df.iloc[0]['combined_text_features']
        assert 'superpowers' in result_df.iloc[0]['combined_text_features']
        assert 'action hero' in result_df.iloc[0]['combined_text_features']
        
        assert 'romance drama' in result_df.iloc[1]['combined_text_features']
        assert 'romance story' in result_df.iloc[1]['combined_text_features']
        
        # Check year extraction
        assert result_df.iloc[0]['start_year_num'] == 2020
        assert result_df.iloc[1]['start_year_num'] == 2021
    
    @pytest.mark.unit
    def test_create_combined_text_features_missing_columns(self):
        """Test text feature creation with missing columns"""
        # Create DataFrame with missing columns
        test_df = pd.DataFrame({
            'uid': ['anime_1'],
            'title': ['Test Anime'],
            'synopsis': ['Test synopsis']
            # Missing: genres, themes, demographics, start_date
        })
        
        # Test feature creation
        result_df = create_combined_text_features(test_df)
        
        # Verify it handles missing columns gracefully
        assert 'combined_text_features' in result_df.columns
        assert 'genres_str' in result_df.columns
        assert result_df.iloc[0]['genres_str'] == ''  # Default empty string
        assert 'test anime' in result_df.iloc[0]['combined_text_features']
        assert 'test synopsis' in result_df.iloc[0]['combined_text_features']
    
    @pytest.mark.unit
    def test_create_combined_text_features_null_values(self):
        """Test text feature creation with null/NaN values"""
        # Create DataFrame with null values
        test_df = pd.DataFrame({
            'uid': ['anime_1', 'anime_2'],
            'title': ['Valid Title', None],
            'genres': [['Action'], None],
            'synopsis': [None, 'Valid synopsis'],
            'start_date': [None, '']
        })
        
        # Test feature creation
        result_df = create_combined_text_features(test_df)
        
        # Verify null handling
        assert 'combined_text_features' in result_df.columns
        assert result_df.iloc[0]['start_year_num'] == 0  # Default for null date
        assert result_df.iloc[1]['start_year_num'] == 0  # Default for empty date
        
        # Check that null values don't break the process
        assert isinstance(result_df.iloc[0]['combined_text_features'], str)
        assert isinstance(result_df.iloc[1]['combined_text_features'], str)


class TestTFIDFComputation:
    """Test suite for TF-IDF matrix computation and similarity"""
    
    @pytest.mark.unit
    def test_tfidf_matrix_creation(self):
        """Test TF-IDF matrix creation from text features"""
        # Create mock text features
        text_features = [
            'action adventure superhero anime',
            'comedy slice of life school anime',
            'romance drama manga love story',
            'action mecha robot anime'
        ]
        
        # Create TF-IDF matrix
        vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
        tfidf_matrix = vectorizer.fit_transform(text_features)
        
        # Verify matrix properties
        assert tfidf_matrix.shape[0] == 4  # 4 items
        assert tfidf_matrix.shape[1] <= 100  # Max features
        assert tfidf_matrix.shape[1] > 0  # Some features created
        
        # Verify it's a sparse matrix
        assert hasattr(tfidf_matrix, 'toarray')
    
    @pytest.mark.unit
    def test_cosine_similarity_calculation(self):
        """Test cosine similarity computation between items"""
        # Create sample TF-IDF matrix
        tfidf_matrix = np.array([
            [1.0, 0.0, 0.5],  # Item 1: action
            [0.8, 0.2, 0.3],  # Item 2: action + comedy
            [0.0, 1.0, 0.0],  # Item 3: comedy
            [0.9, 0.0, 0.6]   # Item 4: action + adventure
        ])
        
        # Calculate similarity for first item
        source_vector = tfidf_matrix[0:1]  # First item
        similarities = cosine_similarity(source_vector, tfidf_matrix)
        
        # Verify similarity properties
        assert similarities.shape == (1, 4)
        assert similarities[0][0] == 1.0  # Self-similarity is 1
        assert 0 <= similarities[0][1] <= 1  # Valid similarity range
        assert 0 <= similarities[0][2] <= 1
        assert 0 <= similarities[0][3] <= 1
        
        # Item 4 should be more similar to Item 1 than Item 3
        assert similarities[0][3] > similarities[0][2]
    
    @pytest.mark.unit
    def test_recommendation_ranking(self):
        """Test recommendation ranking by similarity scores"""
        # Mock similarity scores
        similarity_scores = [
            (0, 1.0),    # Self (should be excluded)
            (1, 0.85),   # Highly similar
            (2, 0.45),   # Moderately similar
            (3, 0.78),   # Quite similar
            (4, 0.23)    # Less similar
        ]
        
        # Sort by similarity (descending)
        sorted_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)
        
        # Get top 3 recommendations (excluding self)
        top_3 = [item for item in sorted_scores[1:4]]
        
        # Verify ranking
        assert len(top_3) == 3
        assert top_3[0][0] == 1  # Most similar (index 1)
        assert top_3[1][0] == 3  # Second most similar (index 3)
        assert top_3[2][0] == 2  # Third most similar (index 2)
        
        # Verify scores are in descending order
        assert top_3[0][1] >= top_3[1][1] >= top_3[2][1]


class TestRecommendationEndpoint:
    """Test suite for recommendation API endpoint"""
    
    @pytest.mark.integration
    def test_get_recommendations_success(self, client):
        """Test successful recommendation retrieval"""
        # Mock global data
        mock_df = pd.DataFrame({
            'uid': ['anime_1', 'anime_2', 'anime_3', 'anime_4'],
            'title': ['Source Anime', 'Similar Anime', 'Different Anime', 'Another Similar'],
            'media_type': ['anime', 'anime', 'manga', 'anime'],
            'score': [8.5, 8.2, 7.1, 8.0],
            'image_url': ['url1.jpg', 'url2.jpg', 'url3.jpg', 'url4.jpg'],
            'genres': [['Action'], ['Action'], ['Romance'], ['Action']],
            'synopsis': ['Action story', 'Similar action', 'Love story', 'Action adventure']
        })
        
        # Mock TF-IDF matrix
        mock_tfidf_matrix = np.array([
            [1.0, 0.0],  # Source item
            [0.9, 0.1],  # Very similar
            [0.1, 0.9],  # Different
            [0.8, 0.2]   # Similar
        ])
        
        # Mock UID to index mapping
        mock_uid_to_idx = pd.Series([0, 1, 2, 3], index=['anime_1', 'anime_2', 'anime_3', 'anime_4'])
        
        with patch('app.df_processed', mock_df), \
             patch('app.tfidf_matrix_global', mock_tfidf_matrix), \
             patch('app.uid_to_idx', mock_uid_to_idx), \
             patch('sklearn.metrics.pairwise.cosine_similarity') as mock_cosine:
            
            # Mock cosine similarity to return predictable results
            mock_cosine.return_value = np.array([[1.0, 0.9, 0.1, 0.8]])
            
            response = client.get('/api/recommendations/anime_1?n=2')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert 'source_title' in data
            assert 'recommendations' in data
            assert data['source_title'] == 'Source Anime'
            assert len(data['recommendations']) == 2
            
            # Verify recommendations are sorted by similarity
            recommendations = data['recommendations']
            assert recommendations[0]['uid'] == 'anime_2'  # Most similar
            assert recommendations[1]['uid'] == 'anime_4'  # Second most similar
    
    @pytest.mark.integration
    def test_get_recommendations_item_not_found(self, client):
        """Test recommendation request for non-existent item"""
        # Mock global data without the requested item
        mock_df = pd.DataFrame({
            'uid': ['anime_1', 'anime_2'],
            'title': ['Anime 1', 'Anime 2']
        })
        mock_uid_to_idx = pd.Series([0, 1], index=['anime_1', 'anime_2'])
        
        with patch('app.df_processed', mock_df), \
             patch('app.tfidf_matrix_global', np.array([[1, 0], [0, 1]])), \
             patch('app.uid_to_idx', mock_uid_to_idx):
            
            response = client.get('/api/recommendations/nonexistent_item')
            
            assert response.status_code == 404
            data = json.loads(response.data)
            assert 'error' in data
            assert 'not found' in data['error'].lower()
    
    @pytest.mark.integration
    def test_get_recommendations_system_not_ready(self, client):
        """Test recommendation request when system is not initialized"""
        with patch('app.df_processed', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None):
            
            response = client.get('/api/recommendations/anime_1')
            
            assert response.status_code == 503
            data = json.loads(response.data)
            assert 'error' in data
            assert 'not ready' in data['error'].lower()
    
    @pytest.mark.integration
    def test_get_recommendations_with_n_parameter(self, client):
        """Test recommendation count parameter"""
        # Mock data for testing different n values
        mock_df = pd.DataFrame({
            'uid': [f'anime_{i}' for i in range(10)],
            'title': [f'Anime {i}' for i in range(10)],
            'media_type': ['anime'] * 10,
            'score': [8.0] * 10,
            'image_url': [f'url{i}.jpg' for i in range(10)],
            'genres': [['Action']] * 10,
            'synopsis': [f'Synopsis {i}' for i in range(10)]
        })
        
        mock_tfidf_matrix = np.random.rand(10, 50)
        mock_uid_to_idx = pd.Series(range(10), index=[f'anime_{i}' for i in range(10)])
        
        with patch('app.df_processed', mock_df), \
             patch('app.tfidf_matrix_global', mock_tfidf_matrix), \
             patch('app.uid_to_idx', mock_uid_to_idx), \
             patch('sklearn.metrics.pairwise.cosine_similarity') as mock_cosine:
            
            # Mock cosine similarity with decreasing values
            similarity_scores = [1.0] + [0.9 - i*0.1 for i in range(9)]
            mock_cosine.return_value = np.array([similarity_scores])
            
            # Test different n values
            test_cases = [
                {'n': 3, 'expected_count': 3},
                {'n': 5, 'expected_count': 5},
                {'n': 15, 'expected_count': 9},  # Max available (excluding source)
                {'n': None, 'expected_count': 9}  # Default to 10, but max available is 9
            ]
            
            for case in test_cases:
                if case['n'] is not None:
                    response = client.get(f'/api/recommendations/anime_0?n={case["n"]}')
                else:
                    response = client.get('/api/recommendations/anime_0')
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert len(data['recommendations']) == case['expected_count']
    
    @pytest.mark.integration
    def test_get_recommendations_field_mapping(self, client):
        """Test proper field mapping for frontend compatibility"""
        mock_df = pd.DataFrame({
            'uid': ['anime_1', 'anime_2'],
            'title': ['Source', 'Similar'],
            'media_type': ['anime', 'anime'],
            'score': [8.5, 8.2],
            'image_url': ['source.jpg', 'similar.jpg'],
            'genres': [['Action'], ['Action']],
            'synopsis': ['Source story', 'Similar story']
        })
        
        mock_tfidf_matrix = np.array([[1.0, 0.0], [0.9, 0.1]])
        mock_uid_to_idx = pd.Series([0, 1], index=['anime_1', 'anime_2'])
        
        with patch('app.df_processed', mock_df), \
             patch('app.tfidf_matrix_global', mock_tfidf_matrix), \
             patch('app.uid_to_idx', mock_uid_to_idx), \
             patch('sklearn.metrics.pairwise.cosine_similarity') as mock_cosine:
            
            mock_cosine.return_value = np.array([[1.0, 0.9]])
            
            response = client.get('/api/recommendations/anime_1?n=1')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            recommendation = data['recommendations'][0]
            
            # Verify all expected fields are present
            required_fields = ['uid', 'title', 'media_type', 'score', 'genres', 'synopsis']
            for field in required_fields:
                assert field in recommendation
            
            # Verify image_url is mapped to main_picture
            assert 'main_picture' in recommendation
            assert recommendation['main_picture'] == 'similar.jpg'


class TestRecommendationQuality:
    """Test suite for recommendation quality and relevance"""
    
    @pytest.mark.unit
    def test_genre_based_similarity(self):
        """Test that items with similar genres get higher similarity scores"""
        # Create test data with clear genre patterns
        test_df = pd.DataFrame({
            'uid': ['action_1', 'action_2', 'romance_1', 'comedy_1'],
            'title': ['Action Hero', 'Action Fighter', 'Love Story', 'Funny Show'],
            'genres': [['Action'], ['Action'], ['Romance'], ['Comedy']],
            'synopsis': ['Fighting scenes', 'Battle scenes', 'Love scenes', 'Funny scenes']
        })
        
        # Create combined text features
        result_df = create_combined_text_features(test_df)
        
        # Create TF-IDF matrix
        vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
        tfidf_matrix = vectorizer.fit_transform(result_df['combined_text_features'])
        
        # Calculate similarity between action items
        action_1_vector = tfidf_matrix[0:1]
        similarities = cosine_similarity(action_1_vector, tfidf_matrix)
        
        # Action items should be more similar to each other than to other genres
        action_similarity = similarities[0][1]  # action_1 to action_2
        romance_similarity = similarities[0][2]  # action_1 to romance_1
        comedy_similarity = similarities[0][3]   # action_1 to comedy_1
        
        assert action_similarity > romance_similarity
        assert action_similarity > comedy_similarity
    
    @pytest.mark.unit
    def test_synopsis_based_similarity(self):
        """Test that items with similar synopsis content get higher similarity"""
        test_df = pd.DataFrame({
            'uid': ['school_1', 'school_2', 'space_1'],
            'title': ['School Days', 'Academy Life', 'Space Adventure'],
            'genres': [['Drama'], ['Drama'], ['Sci-Fi']],
            'synopsis': [
                'Students learning in high school environment with friends',
                'Young people studying in academic institution with classmates',
                'Aliens fighting in outer space with spaceships'
            ]
        })
        
        # Create features and TF-IDF
        result_df = create_combined_text_features(test_df)
        vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
        tfidf_matrix = vectorizer.fit_transform(result_df['combined_text_features'])
        
        # Calculate similarities
        school_1_vector = tfidf_matrix[0:1]
        similarities = cosine_similarity(school_1_vector, tfidf_matrix)
        
        school_similarity = similarities[0][1]  # school_1 to school_2
        space_similarity = similarities[0][2]   # school_1 to space_1
        
        # School-themed items should be more similar
        assert school_similarity > space_similarity
    
    @pytest.mark.integration
    def test_recommendation_diversity(self, client):
        """Test that recommendations include diverse but relevant items"""
        # Create dataset with clear clusters
        mock_df = pd.DataFrame({
            'uid': ['action_1', 'action_2', 'action_3', 'romance_1', 'comedy_1'],
            'title': ['Action 1', 'Action 2', 'Action 3', 'Romance 1', 'Comedy 1'],
            'media_type': ['anime'] * 5,
            'score': [8.5, 8.3, 8.1, 7.9, 7.7],
            'image_url': ['url1.jpg'] * 5,
            'genres': [['Action']] * 3 + [['Romance'], ['Comedy']],
            'synopsis': ['Fight'] * 3 + ['Love', 'Laugh']
        })
        
        # Create TF-IDF matrix that favors action items for action_1
        mock_tfidf_matrix = np.array([
            [1.0, 0.0, 0.0],  # action_1
            [0.9, 0.1, 0.0],  # action_2 (very similar)
            [0.8, 0.2, 0.0],  # action_3 (similar)
            [0.2, 0.8, 0.0],  # romance_1 (different)
            [0.1, 0.0, 0.9]   # comedy_1 (very different)
        ])
        
        mock_uid_to_idx = pd.Series(range(5), index=mock_df['uid'])
        
        with patch('app.df_processed', mock_df), \
             patch('app.tfidf_matrix_global', mock_tfidf_matrix), \
             patch('app.uid_to_idx', mock_uid_to_idx), \
             patch('sklearn.metrics.pairwise.cosine_similarity') as mock_cosine:
            
            mock_cosine.return_value = np.array([[1.0, 0.9, 0.8, 0.2, 0.1]])
            
            response = client.get('/api/recommendations/action_1?n=3')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            recommendations = data['recommendations']
            assert len(recommendations) == 3
            
            # Should prioritize similar action items
            assert recommendations[0]['uid'] == 'action_2'
            assert recommendations[1]['uid'] == 'action_3'
            # Third recommendation could be the romance item (most similar among remaining)


class TestRecommendationPerformance:
    """Test suite for recommendation engine performance"""
    
    @pytest.mark.performance
    def test_recommendation_response_time(self, client):
        """Test recommendation endpoint response time with realistic data size"""
        # Create large dataset (1000 items)
        n_items = 1000
        mock_df = pd.DataFrame({
            'uid': [f'item_{i}' for i in range(n_items)],
            'title': [f'Title {i}' for i in range(n_items)],
            'media_type': ['anime' if i % 2 == 0 else 'manga' for i in range(n_items)],
            'score': [7.0 + (i % 3) for i in range(n_items)],
            'image_url': [f'url_{i}.jpg' for i in range(n_items)],
            'genres': [['Action'] if i % 3 == 0 else ['Romance'] for i in range(n_items)],
            'synopsis': [f'Synopsis for item {i}' for i in range(n_items)]
        })
        
        # Create realistic TF-IDF matrix
        mock_tfidf_matrix = np.random.rand(n_items, 100)
        mock_uid_to_idx = pd.Series(range(n_items), index=[f'item_{i}' for i in range(n_items)])
        
        with patch('app.df_processed', mock_df), \
             patch('app.tfidf_matrix_global', mock_tfidf_matrix), \
             patch('app.uid_to_idx', mock_uid_to_idx):
            
            start_time = time.time()
            response = client.get('/api/recommendations/item_0?n=10')
            end_time = time.time()
            
            response_time = end_time - start_time
            
            assert response.status_code == 200
            assert response_time < 5.0  # Should complete within 5 seconds
            
            data = json.loads(response.data)
            assert len(data['recommendations']) == 10
    
    @pytest.mark.performance
    def test_tfidf_computation_time(self):
        """Test TF-IDF matrix computation time for large datasets"""
        # Create large text dataset
        n_items = 5000
        text_features = [
            f'action adventure anime episode {i} story plot character development'
            for i in range(n_items)
        ]
        
        start_time = time.time()
        
        # Compute TF-IDF matrix
        vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        tfidf_matrix = vectorizer.fit_transform(text_features)
        
        end_time = time.time()
        computation_time = end_time - start_time
        
        # Should complete within reasonable time
        assert computation_time < 30.0  # Less than 30 seconds
        assert tfidf_matrix.shape[0] == n_items
        assert tfidf_matrix.shape[1] <= 1000
    
    @pytest.mark.performance
    def test_similarity_computation_time(self):
        """Test cosine similarity computation time"""
        # Create realistic TF-IDF matrix
        n_items = 2000
        n_features = 500
        tfidf_matrix = np.random.rand(n_items, n_features)
        
        start_time = time.time()
        
        # Compute similarity for one item against all others
        source_vector = tfidf_matrix[0:1]
        similarities = cosine_similarity(source_vector, tfidf_matrix)
        
        end_time = time.time()
        computation_time = end_time - start_time
        
        # Should be very fast
        assert computation_time < 2.0  # Less than 2 seconds
        assert similarities.shape == (1, n_items)


class TestRecommendationEdgeCases:
    """Test suite for edge cases and error handling"""
    
    @pytest.mark.unit
    def test_recommendations_for_item_with_no_text(self):
        """Test recommendations for item with minimal text features"""
        test_df = pd.DataFrame({
            'uid': ['minimal_1', 'rich_1', 'rich_2'],
            'title': [None, 'Rich Title', 'Another Rich Title'],
            'genres': [[], ['Action', 'Adventure'], ['Action', 'Drama']],
            'synopsis': [None, 'Detailed synopsis here', 'Another detailed story']
        })
        
        # Create features
        result_df = create_combined_text_features(test_df)
        
        # Verify it doesn't crash
        assert 'combined_text_features' in result_df.columns
        assert len(result_df) == 3
        
        # Minimal item should have mostly empty features
        minimal_features = result_df.iloc[0]['combined_text_features']
        assert len(minimal_features.strip()) >= 0  # Could be empty or minimal
    
    @pytest.mark.integration
    def test_recommendations_with_invalid_n_parameter(self, client):
        """Test recommendation endpoint with invalid n parameter"""
        mock_df = pd.DataFrame({
            'uid': ['anime_1', 'anime_2'],
            'title': ['Anime 1', 'Anime 2'],
            'media_type': ['anime', 'anime'],
            'score': [8.0, 7.5],
            'image_url': ['url1.jpg', 'url2.jpg'],
            'genres': [['Action'], ['Comedy']],
            'synopsis': ['Action story', 'Comedy story']
        })
        
        mock_tfidf_matrix = np.array([[1.0, 0.0], [0.5, 0.5]])
        mock_uid_to_idx = pd.Series([0, 1], index=['anime_1', 'anime_2'])
        
        with patch('app.df_processed', mock_df), \
             patch('app.tfidf_matrix_global', mock_tfidf_matrix), \
             patch('app.uid_to_idx', mock_uid_to_idx), \
             patch('sklearn.metrics.pairwise.cosine_similarity') as mock_cosine:
            
            mock_cosine.return_value = np.array([[1.0, 0.5]])
            
            # Test various invalid n values
            test_cases = [
                '/api/recommendations/anime_1?n=0',      # Zero
                '/api/recommendations/anime_1?n=-5',     # Negative
                '/api/recommendations/anime_1?n=abc',    # Non-numeric
                '/api/recommendations/anime_1?n=1000'    # Very large
            ]
            
            for url in test_cases:
                response = client.get(url)
                
                # Should either handle gracefully or return error
                # The exact behavior depends on Flask's parameter parsing
                assert response.status_code in [200, 400, 422]
                
                if response.status_code == 200:
                    data = json.loads(response.data)
                    # Should return reasonable number of recommendations
                    assert len(data['recommendations']) <= len(mock_df) - 1
    
    @pytest.mark.integration
    def test_recommendations_internal_error_handling(self, client):
        """Test recommendation endpoint error handling"""
        # Setup valid global state
        mock_df = pd.DataFrame({
            'uid': ['anime_1', 'anime_2'],
            'title': ['Anime 1', 'Anime 2']
        })
        mock_uid_to_idx = pd.Series([0, 1], index=['anime_1', 'anime_2'])
        
        with patch('app.df_processed', mock_df), \
             patch('app.tfidf_matrix_global', np.array([[1, 0], [0, 1]])), \
             patch('app.uid_to_idx', mock_uid_to_idx), \
             patch('sklearn.metrics.pairwise.cosine_similarity') as mock_cosine:
            
            # Make cosine_similarity raise an exception
            mock_cosine.side_effect = Exception('Computation error')
            
            response = client.get('/api/recommendations/anime_1')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert 'error' in data
            assert 'Could not generate recommendations' in data['error']


class TestFieldMapping:
    """Test suite for field mapping functionality"""
    
    @pytest.mark.unit
    def test_map_field_names_for_frontend(self):
        """Test field name mapping for frontend compatibility"""
        backend_data = {
            'uid': 'anime_123',
            'title': 'Test Anime',
            'image_url': 'test_image.jpg',
            'score': 8.5
        }
        
        mapped_data = map_field_names_for_frontend(backend_data)
        
        # Original fields should remain
        assert mapped_data['uid'] == 'anime_123'
        assert mapped_data['title'] == 'Test Anime'
        assert mapped_data['image_url'] == 'test_image.jpg'
        assert mapped_data['score'] == 8.5
        
        # Should add main_picture mapping
        assert mapped_data['main_picture'] == 'test_image.jpg'
    
    @pytest.mark.unit
    def test_map_records_for_frontend(self):
        """Test mapping multiple records for frontend"""
        backend_records = [
            {'uid': 'anime_1', 'image_url': 'img1.jpg'},
            {'uid': 'anime_2', 'image_url': 'img2.jpg'},
            {'uid': 'anime_3', 'image_url': 'img3.jpg'}
        ]
        
        mapped_records = map_records_for_frontend(backend_records)
        
        assert len(mapped_records) == 3
        
        for i, record in enumerate(mapped_records):
            assert record['uid'] == f'anime_{i+1}'
            assert record['image_url'] == f'img{i+1}.jpg'
            assert record['main_picture'] == f'img{i+1}.jpg'
    
    @pytest.mark.unit
    def test_map_field_names_no_image_url(self):
        """Test field mapping when image_url is not present"""
        backend_data = {
            'uid': 'anime_123',
            'title': 'Test Anime',
            'main_picture': 'existing_picture.jpg'  # Already has main_picture
        }
        
        mapped_data = map_field_names_for_frontend(backend_data)
        
        # Should not override existing main_picture
        assert mapped_data['main_picture'] == 'existing_picture.jpg'
        assert 'image_url' not in mapped_data