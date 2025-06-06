"""
Test configuration and fixtures for AniManga Recommender backend tests.
"""
import pytest
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import sys
import os
from unittest.mock import Mock, patch, MagicMock

# Add the parent directory to the Python path so we can import our app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, df_processed, tfidf_vectorizer_global, tfidf_matrix_global, uid_to_idx


@pytest.fixture
def client():
    """Create a test client for the Flask application."""
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    os.environ['SUPABASE_URL'] = 'http://test.supabase.co'
    os.environ['SUPABASE_KEY'] = 'test_key'
    os.environ['SUPABASE_SERVICE_KEY'] = 'test_service_key'
    
    with app.test_client() as client:
        with app.app_context():
            yield client


@pytest.fixture
def mock_auth_client():
    """Mock the Supabase authentication client for testing."""
    mock = Mock()
    
    # Mock verify_jwt_token to return a valid user
    mock.verify_jwt_token.return_value = {
        'sub': 'test-user-123',
        'user_id': 'test-user-123', 
        'email': 'test@example.com',
        'role': 'authenticated'
    }
    
    # Mock get_user_items to return empty list by default
    mock.get_user_items.return_value = []
    
    # Mock update_user_item_status_comprehensive to return success
    mock.update_user_item_status_comprehensive.return_value = {
        'success': True,
        'data': {'status': 'watching', 'progress': 0}
    }
    
    # Mock get_user_profile
    mock.get_user_profile.return_value = {
        'id': 'test-user-123',
        'username': 'testuser',
        'email': 'test@example.com'
    }
    
    # Mock update_user_profile
    mock.update_user_profile.return_value = {
        'id': 'test-user-123',
        'username': 'testuser',
        'email': 'test@example.com'
    }
    
    return mock


@pytest.fixture
def auth_headers():
    """Generate test authentication headers."""
    return {
        'Authorization': 'Bearer test-jwt-token',
        'Content-Type': 'application/json'
    }


@pytest.fixture
def test_app_with_mocks(mock_auth_client, sample_dataframe):
    """Create test app with all necessary mocks applied."""
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.test_client() as client:
        with app.app_context():
            # Patch global variables with test data
            with patch('app.df_processed', sample_dataframe), \
                 patch('app.auth_client', mock_auth_client), \
                 patch('app.supabase_client', Mock()), \
                 patch('supabase_client.SupabaseAuthClient.verify_jwt_token', 
                       return_value={'sub': 'test-user-123', 'user_id': 'test-user-123'}):
                
                # Create TF-IDF data for recommendations
                vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
                tfidf_matrix = vectorizer.fit_transform(sample_dataframe['combined_text_features'])
                uid_mapping = pd.Series(sample_dataframe.index, index=sample_dataframe['uid'])
                
                with patch('app.tfidf_vectorizer_global', vectorizer), \
                     patch('app.tfidf_matrix_global', tfidf_matrix), \
                     patch('app.uid_to_idx', uid_mapping):
                    yield client


@pytest.fixture
def sample_dataframe():
    """Create a sample DataFrame for testing."""
    data = {
        'uid': ['anime_1', 'anime_2', 'manga_1', 'manga_2', 'anime_3'],
        'title': ['Test Anime 1', 'Test Anime 2', 'Test Manga 1', 'Test Manga 2', 'Test Anime 3'],
        'media_type': ['anime', 'anime', 'manga', 'manga', 'anime'],
        'genres': [
            ['Action', 'Adventure'],
            ['Comedy', 'Romance'],
            ['Drama', 'Action'],
            ['Romance', 'Slice of Life'],
            ['Action', 'Comedy']
        ],
        'themes': [
            ['School', 'Military'],
            ['High School', 'Romance'],
            ['Historical'],
            ['School', 'Romance'],
            ['Comedy', 'Adventure']
        ],
        'demographics': [
            ['Shounen'],
            ['Shoujo'],
            ['Seinen'],
            ['Josei'],
            ['Shounen']
        ],
        'studios': [
            ['Studio A', 'Studio B'],
            ['Studio C'],
            [],  # Manga doesn't have studios
            [],
            ['Studio A']
        ],
        'authors': [
            [],  # Anime doesn't have authors
            [],
            ['Author X', 'Author Y'],
            ['Author Z'],
            []
        ],
        'producers': [
            ['Producer A'],
            ['Producer B'],
            [],
            [],
            ['Producer A']
        ],
        'licensors': [
            ['Licensor X'],
            [],
            [],
            [],
            ['Licensor Y']
        ],
        'serializations': [
            [],
            [],
            ['Magazine A'],
            ['Magazine B'],
            []
        ],
        'title_synonyms': [
            ['Alt Title 1'],
            [],
            ['Alt Manga 1'],
            [],
            ['Alt Title 3']
        ],
        'status': ['Finished Airing', 'Currently Airing', 'Publishing', 'Finished', 'Finished Airing'],
        'score': [8.5, 7.2, 9.1, 6.8, 7.9],
        'scored_by': [10000, 5000, 15000, 3000, 8000],
        'members': [50000, 25000, 75000, 15000, 40000],
        'popularity': [100, 200, 50, 300, 150],
        'favorites': [5000, 2000, 8000, 1000, 3500],
        'synopsis': [
            'An epic adventure anime about heroes',
            'A romantic comedy in high school',
            'A dramatic manga with historical elements',
            'A slice of life romance manga',
            'An action comedy adventure'
        ],
        'background': [
            'Background info for anime 1',
            'Background info for anime 2',
            'Background info for manga 1',
            'Background info for manga 2',
            'Background info for anime 3'
        ],
        'start_date': ['2020-01-01', '2023-04-01', '2019-06-01', '2021-02-01', '2022-07-01'],
        'end_date': ['2020-12-31', None, None, '2023-01-01', '2022-12-31'],
        'start_year_num': [2020, 2023, 2019, 2021, 2022],
        'rating': ['PG-13', 'PG', 'PG-13', 'G', 'PG-13'],
        'episodes': [24, 12, None, None, 13],
        'chapters': [None, None, 150, 80, None],
        'volumes': [None, None, 15, 8, None],
        'duration': ['24 min', '24 min', None, None, '24 min'],
        'season': ['Winter', 'Spring', None, None, 'Summer'],
        'year': [2020, 2023, None, None, 2022],
        'broadcast': ['Sundays at 17:00', 'Fridays at 23:30', None, None, 'Wednesdays at 19:00'],
        'source': ['Manga', 'Light Novel', 'Original', 'Novel', 'Game'],
        'main_picture': [
            'https://example.com/anime1.jpg',
            'https://example.com/anime2.jpg',
            'https://example.com/manga1.jpg',
            'https://example.com/manga2.jpg',
            'https://example.com/anime3.jpg'
        ],
        'trailer_url': [
            'https://youtube.com/watch?v=test1',
            'https://youtube.com/watch?v=test2',
            None,
            None,
            'https://youtube.com/watch?v=test3'
        ],
        'title_english': ['Test Anime 1 EN', 'Test Anime 2 EN', 'Test Manga 1 EN', 'Test Manga 2 EN', 'Test Anime 3 EN'],
        'title_japanese': ['テストアニメ1', 'テストアニメ2', 'テストマンガ1', 'テストマンガ2', 'テストアニメ3'],
        'type': ['TV', 'TV', 'Manga', 'Manga', 'ONA'],
        'aired': ['Jan 1, 2020 to Dec 31, 2020', 'Apr 1, 2023 to ?', None, None, 'Jul 1, 2022 to Dec 31, 2022'],
        'published': [None, None, 'Jun 1, 2019 to ?', 'Feb 1, 2021 to Jan 1, 2023', None],
        'url': [
            'https://myanimelist.net/anime/test1',
            'https://myanimelist.net/anime/test2',
            'https://myanimelist.net/manga/test1',
            'https://myanimelist.net/manga/test2',
            'https://myanimelist.net/anime/test3'
        ],
        'sfw': [True, True, True, True, True],
        'combined_text_features': [
            'Action Adventure School Military Shounen heroes epic',
            'Comedy Romance High School Romance Shoujo romantic high school',
            'Drama Action Historical Seinen dramatic historical elements',
            'Romance Slice of Life School Romance Josei slice life romance',
            'Action Comedy Comedy Adventure Shounen action comedy adventure'
        ]
    }
    
    return pd.DataFrame(data)


@pytest.fixture
def sample_tfidf_data(sample_dataframe):
    """Create sample TF-IDF data for testing."""
    vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
    tfidf_matrix = vectorizer.fit_transform(sample_dataframe['combined_text_features'])
    uid_mapping = pd.Series(sample_dataframe.index, index=sample_dataframe['uid'])
    
    return {
        'vectorizer': vectorizer,
        'matrix': tfidf_matrix,
        'uid_to_idx': uid_mapping,
        'dataframe': sample_dataframe
    }


@pytest.fixture
def mock_empty_dataframe():
    """Create an empty DataFrame for testing empty state scenarios."""
    columns = ['uid', 'title', 'media_type', 'genres', 'themes', 'demographics', 
               'studios', 'authors', 'status', 'score', 'scored_by', 'members',
               'synopsis', 'main_picture', 'combined_text_features', 'sfw']
    return pd.DataFrame(columns=columns)


@pytest.fixture
def sample_list_data():
    """Sample data for testing list parsing functions."""
    return {
        'valid_list_string': "['Action', 'Adventure', 'Comedy']",
        'invalid_list_string': "Action, Adventure, Comedy",
        'actual_list': ['Action', 'Adventure', 'Comedy'],
        'empty_list': [],
        'none_value': None,
        'nan_value': np.nan,
        'single_item_list': ['Action'],
        'mixed_types': ['Action', 123, 'Adventure'],
        'nested_malformed': "['Action', 'Adventure'",  # Missing closing bracket
        'empty_string': "",
        'non_list_string': "Not a list at all"
    }


@pytest.fixture
def sample_filter_data():
    """Sample data for testing filter functions."""
    return {
        'single_filter': 'action',
        'multi_filter': 'action,adventure,comedy',
        'multi_filter_with_spaces': ' action , adventure , comedy ',
        'empty_filter': '',
        'all_filter': 'all',
        'none_filter': None,
        'case_mixed': 'Action,ADVENTURE,Comedy'
    }


# Mock functions for global variable patching
@pytest.fixture
def mock_globals(monkeypatch, sample_dataframe):
    """Mock global variables for testing."""
    # Create mock TF-IDF data
    vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
    tfidf_matrix = vectorizer.fit_transform(sample_dataframe['combined_text_features'])
    uid_mapping = pd.Series(sample_dataframe.index, index=sample_dataframe['uid'])
    
    # Patch global variables
    monkeypatch.setattr('app.df_processed', sample_dataframe)
    monkeypatch.setattr('app.tfidf_vectorizer_global', vectorizer)
    monkeypatch.setattr('app.tfidf_matrix_global', tfidf_matrix)
    monkeypatch.setattr('app.uid_to_idx', uid_mapping)
    
    return {
        'df_processed': sample_dataframe,
        'tfidf_vectorizer_global': vectorizer,
        'tfidf_matrix_global': tfidf_matrix,
        'uid_to_idx': uid_mapping
    }


@pytest.fixture
def mock_empty_globals(monkeypatch, mock_empty_dataframe):
    """Mock empty global variables for testing empty states."""
    monkeypatch.setattr('app.df_processed', mock_empty_dataframe)
    monkeypatch.setattr('app.tfidf_vectorizer_global', None)
    monkeypatch.setattr('app.tfidf_matrix_global', None)
    monkeypatch.setattr('app.uid_to_idx', pd.Series(dtype='int64'))
    
    return {
        'df_processed': mock_empty_dataframe,
        'tfidf_vectorizer_global': None,
        'tfidf_matrix_global': None,
        'uid_to_idx': pd.Series(dtype='int64')
    }


@pytest.fixture
def mock_none_globals(monkeypatch):
    """Mock None global variables for testing uninitialized states."""
    monkeypatch.setattr('app.df_processed', None)
    monkeypatch.setattr('app.tfidf_vectorizer_global', None)
    monkeypatch.setattr('app.tfidf_matrix_global', None)
    monkeypatch.setattr('app.uid_to_idx', None)
    
    return {
        'df_processed': None,
        'tfidf_vectorizer_global': None,
        'tfidf_matrix_global': None,
        'uid_to_idx': None
    } 