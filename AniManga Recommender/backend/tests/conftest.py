"""
Test configuration and fixtures for AniManga Recommender backend tests.

CRITICAL: Environment variables must be set BEFORE any app imports!
"""
import os
import sys
import importlib

# Set test environment variables FIRST, before any other imports
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_KEY'] = 'test_key'
os.environ['SUPABASE_SERVICE_KEY'] = 'test_service_key'
os.environ['JWT_SECRET_KEY'] = 'test-jwt-secret'
os.environ['TESTING'] = 'true'

# Add the parent directory to the Python path so we can import our app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from unittest.mock import Mock, patch, MagicMock, PropertyMock

# Global test session cleanup
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set up test environment for the entire session."""
    # Force reload app modules to ensure they use test environment variables
    modules_to_reload = ['app', 'supabase_client', 'config']
    
    for module_name in modules_to_reload:
        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])
    
    yield
    
    # Cleanup after session
    for module_name in modules_to_reload:
        if module_name in sys.modules:
            del sys.modules[module_name]

# Auto-use fixture to ensure proper test isolation
@pytest.fixture(autouse=True)
def reset_test_state():
    """Reset test state before each test."""
    # Clear any cached imports
    modules_to_clear = [name for name in sys.modules.keys() if name.startswith('app') or name.startswith('supabase_client')]
    
    yield
    
    # Cleanup after each test
    try:
        # Force garbage collection of any hanging contexts
        import gc
        gc.collect()
    except:
        pass


@pytest.fixture
def client():
    """Create a test client for the Flask application with proper mocking."""
    # Import app fresh for each test
    import importlib
    import sys
    
    # Reload modules to ensure clean state
    for module_name in ['app', 'supabase_client']:
        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])
    
    from app import app
    
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'
    
    with app.test_client() as test_client:
        with app.app_context():
            yield test_client


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

@pytest.fixture(autouse=True)
def mock_authentication_globally():
    """Mock authentication globally for all tests."""
    with patch('app.auth_client') as mock_auth_client, \
         patch('supabase_client.SupabaseAuthClient') as mock_supabase_auth:
        
        # Set up comprehensive auth mocking
        mock_auth_client.verify_jwt_token.return_value = {
            'sub': 'test-user-123',
            'user_id': 'test-user-123', 
            'email': 'test@example.com',
            'role': 'authenticated'
        }
        
        mock_auth_client.get_user_items.return_value = []
        mock_auth_client.get_user_profile.return_value = {
            'id': 'test-user-123',
            'username': 'testuser',
            'email': 'test@example.com'
        }
        
        # Mock privacy settings methods with stateful behavior
        privacy_settings_state = {
            'profile_visibility': 'public',
            'list_visibility': 'public',
            'activity_visibility': 'public',
            'show_statistics': True,
            'show_following': True,
            'show_followers': True,
            'allow_friend_requests': True,
            'show_recently_watched': True
        }
        
        def mock_get_privacy_settings(user_id):
            return privacy_settings_state.copy()
        
        def mock_update_privacy_settings(user_id, settings):
            # Update the state with new settings
            privacy_settings_state.update(settings)
            return privacy_settings_state.copy()
        
        mock_auth_client.get_privacy_settings.side_effect = mock_get_privacy_settings
        mock_auth_client.update_privacy_settings.side_effect = mock_update_privacy_settings
        
        # Mock the class and instance methods
        mock_supabase_auth.return_value.verify_jwt_token.return_value = {
            'sub': 'test-user-123',
            'user_id': 'test-user-123'
        }
        
        yield {
            'auth_client': mock_auth_client,
            'supabase_auth': mock_supabase_auth
        }


@pytest.fixture
def test_app_with_mocks(mock_auth_client, sample_dataframe):
    """Create test app with all necessary mocks applied."""
    # Import app fresh for each test
    import importlib
    import sys
    
    # Force reload app modules to ensure fresh state with test environment
    for module_name in ['app', 'supabase_client']:
        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])
    
    # NOW import app after ensuring clean state
    from app import app
    
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'
    
    with app.test_client() as client:
        with app.app_context():
            # Create TF-IDF data for recommendations
            vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
            tfidf_matrix = vectorizer.fit_transform(sample_dataframe['combined_text_features'])
            uid_mapping = pd.Series(sample_dataframe.index, index=sample_dataframe['uid'])
            
            # Patch global variables with test data
            with patch('app.df_processed', sample_dataframe), \
                 patch('app.auth_client', mock_auth_client), \
                 patch('app.supabase_client', Mock()), \
                 patch('app.tfidf_vectorizer_global', vectorizer), \
                 patch('app.tfidf_matrix_global', tfidf_matrix), \
                 patch('app.uid_to_idx', uid_mapping), \
                 patch('supabase_client.SupabaseAuthClient.verify_jwt_token', 
                       return_value={'sub': 'test-user-123', 'user_id': 'test-user-123'}):
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
        'empty_list_string': "[]",
        'mixed_data': ["['Action', 'Adventure']", "Comedy, Drama", "[]"]
    }


@pytest.fixture
def sample_filter_data():
    """Sample filter data for testing filter functions."""
    return {
        'genres': ['Action', 'Comedy', 'Drama'],
        'themes': ['School', 'Military'],
        'demographics': ['Shounen', 'Shoujo'],
        'media_types': ['anime', 'manga'],
        'statuses': ['Finished Airing', 'Currently Airing', 'Publishing']
    }


@pytest.fixture
def mock_globals(monkeypatch, sample_dataframe):
    """Mock global variables with sample data."""
    vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
    tfidf_matrix = vectorizer.fit_transform(sample_dataframe['combined_text_features'])
    uid_mapping = pd.Series(sample_dataframe.index, index=sample_dataframe['uid'])
    
    monkeypatch.setattr('app.df_processed', sample_dataframe)
    monkeypatch.setattr('app.tfidf_vectorizer_global', vectorizer)
    monkeypatch.setattr('app.tfidf_matrix_global', tfidf_matrix)
    monkeypatch.setattr('app.uid_to_idx', uid_mapping)
    
    return {
        'dataframe': sample_dataframe,
        'vectorizer': vectorizer,
        'tfidf_matrix': tfidf_matrix,
        'uid_to_idx': uid_mapping
    }


@pytest.fixture
def mock_empty_globals(monkeypatch, mock_empty_dataframe):
    """Mock global variables with empty data."""
    monkeypatch.setattr('app.df_processed', mock_empty_dataframe)
    monkeypatch.setattr('app.tfidf_vectorizer_global', None)
    monkeypatch.setattr('app.tfidf_matrix_global', None)
    monkeypatch.setattr('app.uid_to_idx', None)
    
    return {
        'dataframe': mock_empty_dataframe,
        'vectorizer': None,
        'tfidf_matrix': None,
        'uid_to_idx': None
    }


@pytest.fixture
def mock_none_globals(monkeypatch):
    """Mock global variables as None for testing uninitialized state."""
    monkeypatch.setattr('app.df_processed', None)
    monkeypatch.setattr('app.tfidf_vectorizer_global', None)
    monkeypatch.setattr('app.tfidf_matrix_global', None)
    monkeypatch.setattr('app.uid_to_idx', None)
    
    return {
        'dataframe': None,
        'vectorizer': None,
        'tfidf_matrix': None,
        'uid_to_idx': None
    } 