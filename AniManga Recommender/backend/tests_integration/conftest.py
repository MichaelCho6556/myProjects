# ABOUTME: Integration test configuration with REAL database connections
# ABOUTME: NO MOCKS - all tests use actual PostgreSQL instances

"""
Integration Test Configuration for AniManga Recommender Backend

CRITICAL: This file contains NO MOCKS. All fixtures provide real connections
to actual services (PostgreSQL) for true integration testing.
"""

import os
import sys
import time
import uuid
import pytest
import pandas as pd
import psycopg
import json
from pathlib import Path
from typing import Generator, Dict, Any
from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our application modules
from app import app as flask_app
from supabase_client import SupabaseClient, SupabaseAuthClient
from tests_integration.test_supabase_client import TestSupabaseClient, TestSupabaseAuthClient


# ======================== Environment Configuration ========================

# Integration test environment variables
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://test_user:test_password@localhost:5433/animanga_test"
)
# Cache configuration for hybrid cache
TEST_CACHE_MEMORY_SIZE = int(os.getenv("TEST_CACHE_MEMORY_SIZE", "100"))
TEST_CACHE_MEMORY_MB = int(os.getenv("TEST_CACHE_MEMORY_MB", "10"))

# Supabase test configuration - use local test setup instead of external service
TEST_SUPABASE_URL = os.getenv("TEST_SUPABASE_URL", "http://localhost:8000")
TEST_SUPABASE_KEY = os.getenv("TEST_SUPABASE_KEY", "test-anon-key")
TEST_SUPABASE_SERVICE_KEY = os.getenv("TEST_SUPABASE_SERVICE_KEY", "test-service-key")

# Redis test configuration
TEST_REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6380/0")


# ======================== pytest-databases Configuration ========================

# Enable PostgreSQL plugin for real database testing
pytest_plugins = ["pytest_databases.docker.postgres"]


# ======================== Database Fixtures ========================

@pytest.fixture(scope="session")
def database_engine():
    """Create a real database engine for the test session."""
    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def database_connection(database_engine, setup_database_schema):
    """Provide a real database connection with transaction rollback."""
    connection = database_engine.connect()
    transaction = connection.begin()
    
    yield connection
    
    # Rollback transaction to clean up after each test
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def database_session(database_connection):
    """Provide a database session for ORM operations."""
    from sqlalchemy.orm import sessionmaker
    
    Session = sessionmaker(bind=database_connection)
    session = Session()
    
    yield session
    
    session.close()


@pytest.fixture(scope="session")
def setup_database_schema(database_engine):
    """Create database schema for tests (run once per session)."""
    # First, drop existing application tables to ensure clean state
    # Using CASCADE handles foreign key dependencies automatically
    drop_statements = """
        DROP TABLE IF EXISTS comment_reports CASCADE;
        DROP TABLE IF EXISTS review_reports CASCADE;
        DROP TABLE IF EXISTS moderation_actions CASCADE;
        DROP TABLE IF EXISTS appeals CASCADE;
        DROP TABLE IF EXISTS user_roles CASCADE;
        DROP TABLE IF EXISTS list_analytics_cache CASCADE;
        DROP TABLE IF EXISTS batch_operations CASCADE;
        DROP TABLE IF EXISTS filter_presets CASCADE;
        DROP TABLE IF EXISTS notifications CASCADE;
        DROP TABLE IF EXISTS user_follows CASCADE;
        DROP TABLE IF EXISTS reviews CASCADE;
        DROP TABLE IF EXISTS comments CASCADE;
        DROP TABLE IF EXISTS custom_list_items CASCADE;
        DROP TABLE IF EXISTS custom_lists CASCADE;
        DROP TABLE IF EXISTS user_privacy_settings CASCADE;
        DROP TABLE IF EXISTS user_statistics CASCADE;
        DROP TABLE IF EXISTS user_reputation CASCADE;
        DROP TABLE IF EXISTS user_activity CASCADE;
        DROP TABLE IF EXISTS user_items CASCADE;
        DROP TABLE IF EXISTS user_profiles CASCADE;
        DROP TABLE IF EXISTS items CASCADE;
        DROP TABLE IF EXISTS genres CASCADE;
        DROP TABLE IF EXISTS themes CASCADE;
        DROP TABLE IF EXISTS demographics CASCADE;
        DROP TABLE IF EXISTS studios CASCADE;
        DROP TABLE IF EXISTS authors CASCADE;
        DROP TABLE IF EXISTS media_types CASCADE;
    """
    
    with database_engine.connect() as conn:
        # Drop existing tables
        conn.execute(text(drop_statements))
        conn.commit()
        
        # Create schema using the SQL from setup_test_db.py
        schema_sql = """
        -- User profiles table
        CREATE TABLE IF NOT EXISTS user_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(100) UNIQUE,
            bio TEXT,
            avatar_url TEXT,
            favorite_genres TEXT[],
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- User privacy settings
        CREATE TABLE IF NOT EXISTS user_privacy_settings (
            user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
            profile_visibility VARCHAR(20) DEFAULT 'public',
            list_visibility VARCHAR(20) DEFAULT 'public',
            activity_visibility VARCHAR(20) DEFAULT 'public',
            stats_visibility VARCHAR(20) DEFAULT 'public',
            following_visibility VARCHAR(20) DEFAULT 'public',
            show_statistics BOOLEAN DEFAULT true,
            show_following BOOLEAN DEFAULT true,
            allow_friend_requests BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- User statistics
        CREATE TABLE IF NOT EXISTS user_statistics (
            user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
            total_anime INTEGER DEFAULT 0,
            total_manga INTEGER DEFAULT 0,
            anime_days_watched FLOAT DEFAULT 0,
            manga_chapters_read INTEGER DEFAULT 0,
            mean_score FLOAT DEFAULT 0,
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- User reputation
        CREATE TABLE IF NOT EXISTS user_reputation (
            user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
            reputation_score INTEGER DEFAULT 0,
            helpful_reviews INTEGER DEFAULT 0,
            quality_lists INTEGER DEFAULT 0
        );
        
        -- Items table
        CREATE TABLE IF NOT EXISTS items (
            uid VARCHAR(100) PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            media_type VARCHAR(20),
            synopsis TEXT,
            score FLOAT,
            scored_by INTEGER,
            rank INTEGER,
            popularity INTEGER,
            members INTEGER,
            favorites INTEGER,
            episodes INTEGER,
            chapters INTEGER,
            volumes INTEGER,
            genres TEXT,
            themes TEXT[],
            demographics TEXT[],
            studios TEXT[],
            authors TEXT[],
            serializations TEXT[],
            aired VARCHAR(100),
            published VARCHAR(100),
            status VARCHAR(100),
            source VARCHAR(100),
            rating VARCHAR(50),
            main_picture TEXT,
            sfw BOOLEAN DEFAULT true,
            start_date VARCHAR(100),
            end_date VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- User items (watchlist/readlist)
        CREATE TABLE IF NOT EXISTS user_items (
            user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
            item_uid VARCHAR(100) REFERENCES items(uid) ON DELETE CASCADE,
            status VARCHAR(50),
            score FLOAT,
            progress INTEGER DEFAULT 0,
            notes TEXT,
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (user_id, item_uid)
        );
        
        -- Custom lists
        CREATE TABLE IF NOT EXISTS custom_lists (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT true,
            is_collaborative BOOLEAN DEFAULT false,
            item_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Custom list items
        CREATE TABLE IF NOT EXISTS custom_list_items (
            list_id UUID REFERENCES custom_lists(id) ON DELETE CASCADE,
            item_uid VARCHAR(100) REFERENCES items(uid) ON DELETE CASCADE,
            title VARCHAR(500),
            media_type VARCHAR(20),
            image_url TEXT,
            added_by UUID REFERENCES user_profiles(id),
            position INTEGER,
            personal_rating FLOAT,
            status VARCHAR(50),
            notes TEXT,
            tags TEXT[],
            personal_data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            added_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (list_id, item_uid)
        );
        
        -- Comments
        CREATE TABLE IF NOT EXISTS comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
            parent_type VARCHAR(50),
            parent_id VARCHAR(100),
            content TEXT NOT NULL,
            is_spoiler BOOLEAN DEFAULT false,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Reviews
        CREATE TABLE IF NOT EXISTS reviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
            item_uid VARCHAR(100) REFERENCES items(uid) ON DELETE CASCADE,
            overall_rating INTEGER NOT NULL,
            story_rating INTEGER,
            art_rating INTEGER,
            animation_rating INTEGER,
            character_rating INTEGER,
            enjoyment_rating INTEGER,
            content TEXT,
            is_spoiler BOOLEAN DEFAULT false,
            helpful_count INTEGER DEFAULT 0,
            total_votes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- User follows
        CREATE TABLE IF NOT EXISTS user_follows (
            follower_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
            following_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (follower_id, following_id)
        );
        
        -- Comment reports
        CREATE TABLE IF NOT EXISTS comment_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reporter_id UUID REFERENCES user_profiles(id),
            reported_content_type VARCHAR(50),
            reported_content_id UUID,
            reason VARCHAR(100),
            description TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Notifications
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
            type VARCHAR(50),
            content TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- User activity
        CREATE TABLE IF NOT EXISTS user_activity (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
            activity_type VARCHAR(50),
            details JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_items_item_uid ON user_items(item_uid);
        CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_type, parent_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_item ON reviews(item_uid);
        CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
        """
        
        try:
            conn.execute(text(schema_sql))
            conn.commit()
            print("Test database schema created successfully in conftest.py!")
        except Exception as e:
            print(f"Error creating schema: {e}")
            raise


# ======================== Cache Fixtures ========================

@pytest.fixture(scope="function")
def hybrid_cache():
    """Provide a hybrid cache instance for testing."""
    from utils.hybrid_cache import HybridCache
    
    # Create test cache with smaller memory limits
    cache = HybridCache(
        memory_size=TEST_CACHE_MEMORY_SIZE,
        memory_mb=TEST_CACHE_MEMORY_MB,
        use_thread_local=False  # Disable for testing
    )
    
    yield cache
    
    # Clear cache after test
    cache.clear()


# ======================== Flask App Fixtures ========================

@pytest.fixture
def app(load_test_items, supabase_client, auth_client):
    """Create Flask app configured for integration testing."""
    # Configure app for testing
    flask_app.config.update({
        'TESTING': True,
        'WTF_CSRF_ENABLED': False,
        'JWT_SECRET_KEY': 'test-jwt-secret-key',
        'SUPABASE_URL': TEST_SUPABASE_URL,
        'SUPABASE_KEY': TEST_SUPABASE_KEY,
        'SUPABASE_SERVICE_KEY': TEST_SUPABASE_SERVICE_KEY,
        'DATABASE_URL': TEST_DATABASE_URL,
        'REDIS_URL': TEST_REDIS_URL,
    })
    
    # Set up application context and populate test data for health check
    with flask_app.app_context():
        # Import here to avoid circular imports
        import app as app_module
        
        # Set df_processed to test data for health check to work
        app_module.df_processed = load_test_items
        
        # Replace the real Supabase clients with test ones
        app_module.supabase_client = supabase_client
        app_module.auth_client = auth_client
        
        yield flask_app


@pytest.fixture
def client(app):
    """Create a test client for the Flask app."""
    return app.test_client()


# ======================== Authentication Fixtures ========================

@pytest.fixture
def supabase_client(database_connection):
    """Create a test Supabase client for testing."""
    return TestSupabaseClient(database_connection)


@pytest.fixture
def auth_client(database_connection):
    """Create a test Supabase auth client for testing."""
    return TestSupabaseAuthClient(
        database_connection,
        base_url=TEST_SUPABASE_URL,
        api_key=TEST_SUPABASE_KEY,
        service_key=TEST_SUPABASE_SERVICE_KEY
    )


@pytest.fixture
def test_user(auth_client, database_connection):
    """Create a real test user in the database."""
    import uuid
    # Create user in database
    user_data = {
        'id': str(uuid.uuid4()),
        'email': 'test@example.com',
        'username': 'testuser',
        'created_at': 'NOW()',
        'updated_at': 'NOW()'
    }
    
    database_connection.execute(
        text("""
            INSERT INTO user_profiles (id, email, username, created_at, updated_at)
            VALUES (:id, :email, :username, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """),
        user_data
    )
    
    yield user_data
    
    # Cleanup
    database_connection.execute(
        text("DELETE FROM user_profiles WHERE id = :id"),
        {'id': user_data['id']}
    )


@pytest.fixture
def auth_headers(app, test_user):
    """Generate real JWT authentication headers."""
    import jwt
    import time
    
    # Generate real JWT token using Flask's JWT_SECRET_KEY
    payload = {
        'user_id': test_user['id'],
        'sub': test_user['id'],
        'email': test_user['email'],
        'exp': int(time.time()) + 3600,
        'iat': int(time.time())
    }
    
    jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
    token = jwt.encode(payload, jwt_secret, algorithm='HS256')
    
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }


# ======================== Test Data Fixtures ========================

@pytest.fixture
def sample_items_data():
    """Load sample anime/manga data for testing."""
    return pd.DataFrame({
        'uid': ['anime_1', 'anime_2', 'manga_1', 'anime_3', 'manga_2'],
        'title': ['Test Anime 1', 'Test Anime 2', 'Test Manga 1', 'Test Anime 3', 'Test Manga 2'],
        'media_type': ['anime', 'anime', 'manga', 'anime', 'manga'],
        'genres': [['Action', 'Adventure'], ['Comedy'], ['Drama'], ['Romance', 'School'], ['Thriller', 'Mystery']],
        'score': [8.5, 7.2, 9.1, 6.8, 8.9],
        'synopsis': [
            'An epic adventure anime with amazing battles',
            'A comedy anime that will make you laugh',
            'A dramatic manga with deep character development',
            'A romantic school anime with sweet moments',
            'A thrilling mystery manga with plot twists'
        ],
        'status': ['Finished Airing', 'Currently Airing', 'Publishing', 'Finished Airing', 'Completed'],
        'main_picture': [
            'https://example.com/anime1.jpg',
            'https://example.com/anime2.jpg',
            'https://example.com/manga1.jpg',
            'https://example.com/anime3.jpg',
            'https://example.com/manga2.jpg'
        ],
        'sfw': [True, True, True, True, False],
        'episodes': [24, 12, None, 13, None],
        'chapters': [None, None, 150, None, 89],
        'start_date': ['2023-01-01', '2024-01-01', '2022-06-15', '2023-04-01', '2021-03-20'],
        'end_date': ['2023-06-30', None, None, '2023-06-30', '2022-11-15'],
        'rating': ['PG-13', 'PG', 'R', 'PG-13', 'R'],
        'popularity': [1234, 5678, 9012, 3456, 7890],
        'ranked': [156, 892, 42, 1205, 78],
        'favorites': [12500, 3400, 18900, 1200, 9800],
        'members': [250000, 45000, 180000, 15000, 95000]
    })


@pytest.fixture
def load_test_items(database_connection, sample_items_data):
    """Load sample items into the real database."""
    # Insert items into database (database_connection already has active transaction)
    try:
        for _, item in sample_items_data.iterrows():
            database_connection.execute(
                text("""
                    INSERT INTO items (uid, title, media_type, genres, score, 
                                     synopsis, status, main_picture, sfw)
                    VALUES (:uid, :title, :media_type, :genres, :score,
                           :synopsis, :status, :main_picture, :sfw)
                    ON CONFLICT (uid) DO NOTHING
                """),
                {
                    'uid': item['uid'],
                    'title': item['title'],
                    'media_type': item['media_type'],
                    'genres': json.dumps(item['genres']),  # Convert list to JSON string
                    'score': item['score'],
                    'synopsis': item['synopsis'],
                    'status': item['status'],
                    'main_picture': item['main_picture'],
                    'sfw': item['sfw']
                }
            )
    except Exception as e:
        print(f"Warning: Failed to load test items: {e}")
    
    yield sample_items_data
    
    # Cleanup (no begin() needed since connection has active transaction)
    try:
        database_connection.execute(
            text("DELETE FROM items WHERE uid IN :uids"),
            {'uids': tuple(sample_items_data['uid'].tolist())}
        )
    except Exception as e:
        print(f"Warning: Failed to cleanup test items: {e}")


# ======================== Performance Testing Fixtures ========================

@pytest.fixture
def benchmark_timer():
    """Simple timer for performance measurements."""
    times = {}
    
    class Timer:
        def __init__(self, name):
            self.name = name
            self.start_time = None
        
        def __enter__(self):
            self.start_time = time.time()
            return self
        
        def __exit__(self, *args):
            times[self.name] = time.time() - self.start_time
    
    yield Timer
    
    # Print performance results
    if times:
        print("\nPerformance Metrics:")
        for name, duration in times.items():
            print(f"  {name}: {duration:.3f}s")


# ======================== Cleanup Fixtures ========================

@pytest.fixture(autouse=True)
def cleanup_test_data(request, database_connection):
    """Ensure test data is cleaned up after each test."""
    yield
    
    # Clean up any test data created during the test
    # Note: database_connection already has an active transaction, so we don't call begin()
    try:
        # Clean up test users
        database_connection.execute(
            text("DELETE FROM user_profiles WHERE email LIKE 'test%'")
        )
        
        # Clean up test items
        database_connection.execute(
            text("DELETE FROM items WHERE title LIKE 'Test%'")
        )
        
        # Clean up test lists
        database_connection.execute(
            text("DELETE FROM custom_lists WHERE title LIKE 'Test%'")
        )
    except Exception as e:
        # If cleanup fails, log but don't break test execution
        print(f"Warning: Test cleanup failed: {e}")


# ======================== Additional Test Data Fixtures ========================

@pytest.fixture
def multiple_test_users(database_connection):
    """Create multiple test users for social features testing."""
    users = [
        {
            'id': 'test-user-alice',
            'email': 'alice@example.com',
            'username': 'alice_test',
            'bio': 'Alice loves anime and manga'
        },
        {
            'id': 'test-user-bob',
            'email': 'bob@example.com',
            'username': 'bob_test',
            'bio': 'Bob is a manga enthusiast'
        },
        {
            'id': 'test-user-charlie',
            'email': 'charlie@example.com',
            'username': 'charlie_test',
            'bio': 'Charlie watches everything'
        }
    ]
    
    # Create users in database
    for user in users:
        database_connection.execute(
            text("""
                INSERT INTO user_profiles (id, email, username, bio, created_at, updated_at)
                VALUES (:id, :email, :username, :bio, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """),
            user
        )
    
    yield users
    
    # Cleanup
    user_ids = [user['id'] for user in users]
    database_connection.execute(
        text("DELETE FROM user_profiles WHERE id = ANY(:ids)"),
        {'ids': user_ids}
    )


@pytest.fixture
def sample_custom_lists(database_connection, test_user):
    """Create sample custom lists for testing."""
    lists = [
        {
            'id': str(uuid.uuid4()),
            'user_id': test_user['id'],
            'title': 'Test Favorites',
            'description': 'My favorite anime and manga',
            'is_public': True,
            'is_collaborative': False
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': test_user['id'],
            'title': 'Test Watchlist',
            'description': 'Plan to watch these',
            'is_public': False,
            'is_collaborative': False
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': test_user['id'],
            'title': 'Test Collaborative',
            'description': 'Shared recommendations',
            'is_public': True,
            'is_collaborative': True
        }
    ]
    
    # Create lists in database
    for list_data in lists:
        database_connection.execute(
            text("""
                INSERT INTO custom_lists (id, user_id, title, description, is_public, is_collaborative, created_at, updated_at)
                VALUES (:id, :user_id, :title, :description, :is_public, :is_collaborative, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """),
            list_data
        )
    
    yield lists
    
    # Cleanup
    list_ids = [list_data['id'] for list_data in lists]
    database_connection.execute(
        text("DELETE FROM custom_lists WHERE id = ANY(CAST(:ids AS uuid[]))"),
        {'ids': list_ids}
    )


@pytest.fixture
def sample_comments(database_connection, test_user, load_test_items):
    """Create sample comments for testing."""
    comment_id_1 = str(uuid.uuid4())
    comment_id_2 = str(uuid.uuid4())
    comment_id_3 = str(uuid.uuid4())
    
    comments = [
        {
            'id': comment_id_1,
            'user_id': test_user['id'],
            'parent_type': 'item',
            'parent_id': 'anime_1',
            'content': 'This anime is amazing! Great animation quality.',
            'is_spoiler': False
        },
        {
            'id': comment_id_2,
            'user_id': test_user['id'],
            'parent_type': 'item',
            'parent_id': 'manga_1',
            'content': 'Warning: Contains spoilers! The ending was unexpected.',
            'is_spoiler': True
        },
        {
            'id': comment_id_3,
            'user_id': test_user['id'],
            'parent_type': 'comment',
            'parent_id': comment_id_1,  # Reference the actual UUID of the first comment
            'content': 'I agree! The fight scenes were incredible.',
            'is_spoiler': False
        }
    ]
    
    # Create comments in database
    for comment in comments:
        database_connection.execute(
            text("""
                INSERT INTO comments (id, user_id, parent_type, parent_id, content, is_spoiler, created_at, updated_at)
                VALUES (:id, :user_id, :parent_type, :parent_id, :content, :is_spoiler, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """),
            comment
        )
    
    yield comments
    
    # Cleanup
    comment_ids = [comment['id'] for comment in comments]
    database_connection.execute(
        text("DELETE FROM comments WHERE id = ANY(CAST(:ids AS uuid[]))"),
        {'ids': comment_ids}
    )


@pytest.fixture
def sample_reviews(database_connection, test_user, load_test_items):
    """Create sample reviews for testing."""
    reviews = [
        {
            'id': str(uuid.uuid4()),
            'user_id': test_user['id'],
            'item_uid': 'anime_1',
            'overall_rating': 9,
            'story_rating': 8,
            'art_rating': 10,
            'character_rating': 9,
            'enjoyment_rating': 9,
            'content': 'Fantastic anime with great character development and stunning visuals.',
            'is_spoiler': False,
            'helpful_count': 5,
            'total_votes': 8
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': test_user['id'],
            'item_uid': 'manga_1',
            'overall_rating': 8,
            'story_rating': 9,
            'art_rating': 7,
            'character_rating': 8,
            'enjoyment_rating': 8,
            'content': 'Great story but the art could be better in some chapters.',
            'is_spoiler': False,
            'helpful_count': 3,
            'total_votes': 4
        }
    ]
    
    # Create reviews in database
    for review in reviews:
        database_connection.execute(
            text("""
                INSERT INTO reviews (id, user_id, item_uid, overall_rating, story_rating, art_rating, 
                                   character_rating, enjoyment_rating, content, is_spoiler, 
                                   helpful_count, total_votes, created_at, updated_at)
                VALUES (:id, :user_id, :item_uid, :overall_rating, :story_rating, :art_rating,
                       :character_rating, :enjoyment_rating, :content, :is_spoiler,
                       :helpful_count, :total_votes, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """),
            review
        )
    
    yield reviews
    
    # Cleanup
    review_ids = [review['id'] for review in reviews]
    database_connection.execute(
        text("DELETE FROM reviews WHERE id = ANY(:ids)"),
        {'ids': review_ids}
    )


@pytest.fixture
def sample_user_follows(database_connection, multiple_test_users):
    """Create sample user follows for social features testing."""
    follows = [
        {
            'follower_id': multiple_test_users[0]['id'],  # alice follows bob
            'following_id': multiple_test_users[1]['id']
        },
        {
            'follower_id': multiple_test_users[1]['id'],  # bob follows charlie
            'following_id': multiple_test_users[2]['id']
        },
        {
            'follower_id': multiple_test_users[2]['id'],  # charlie follows alice
            'following_id': multiple_test_users[0]['id']
        }
    ]
    
    # Create follows in database
    for follow in follows:
        database_connection.execute(
            text("""
                INSERT INTO user_follows (follower_id, following_id, created_at)
                VALUES (:follower_id, :following_id, NOW())
                ON CONFLICT (follower_id, following_id) DO NOTHING
            """),
            follow
        )
    
    yield follows
    
    # Cleanup
    database_connection.execute(
        text("DELETE FROM user_follows WHERE follower_id = ANY(:ids) OR following_id = ANY(:ids)"),
        {'ids': [user['id'] for user in multiple_test_users]}
    )


@pytest.fixture
def sample_moderation_data(database_connection, multiple_test_users, sample_comments):
    """Create sample moderation data for testing."""
    reports = [
        {
            'id': 'test-report-1',
            'reporter_id': multiple_test_users[0]['id'],
            'reported_content_type': 'comment',
            'reported_content_id': sample_comments[0]['id'],
            'reason': 'spam',
            'description': 'This comment is spam',
            'status': 'pending'
        },
        {
            'id': 'test-report-2',
            'reporter_id': multiple_test_users[1]['id'],
            'reported_content_type': 'comment',
            'reported_content_id': sample_comments[1]['id'],
            'reason': 'harassment',
            'description': 'Inappropriate language',
            'status': 'reviewed'
        }
    ]
    
    # Create reports in database
    for report in reports:
        database_connection.execute(
            text("""
                INSERT INTO comment_reports (id, reporter_id, reported_content_type, reported_content_id, 
                                           reason, description, status, created_at, updated_at)
                VALUES (:id, :reporter_id, :reported_content_type, :reported_content_id,
                       :reason, :description, :status, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """),
            report
        )
    
    yield reports
    
    # Cleanup
    report_ids = [report['id'] for report in reports]
    database_connection.execute(
        text("DELETE FROM comment_reports WHERE id = ANY(:ids)"),
        {'ids': report_ids}
    )


@pytest.fixture
def sample_privacy_settings(database_connection, test_user):
    """Create sample privacy settings for testing."""
    privacy_settings = {
        'user_id': test_user['id'],
        'profile_visibility': 'public',
        'list_visibility': 'friends',
        'activity_visibility': 'private',
        'show_statistics': True,
        'show_following': False,
        'allow_friend_requests': True
    }
    
    # Create privacy settings in database
    database_connection.execute(
        text("""
            INSERT INTO user_privacy_settings (user_id, profile_visibility, list_visibility, 
                                             activity_visibility, show_statistics, show_following, 
                                             allow_friend_requests, created_at, updated_at)
            VALUES (:user_id, :profile_visibility, :list_visibility, :activity_visibility,
                   :show_statistics, :show_following, :allow_friend_requests, NOW(), NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                profile_visibility = EXCLUDED.profile_visibility,
                list_visibility = EXCLUDED.list_visibility,
                activity_visibility = EXCLUDED.activity_visibility,
                show_statistics = EXCLUDED.show_statistics,
                show_following = EXCLUDED.show_following,
                allow_friend_requests = EXCLUDED.allow_friend_requests,
                updated_at = NOW()
        """),
        privacy_settings
    )
    
    yield privacy_settings
    
    # Cleanup
    database_connection.execute(
        text("DELETE FROM user_privacy_settings WHERE user_id = :user_id"),
        {'user_id': test_user['id']}
    )


# ======================== Pytest Configuration ========================

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "real_integration: Real integration tests without mocks"
    )
    config.addinivalue_line(
        "markers", "performance: Performance benchmark tests"
    )
    config.addinivalue_line(
        "markers", "security: Security validation tests"
    )