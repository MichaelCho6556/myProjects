# ABOUTME: Real integration test configuration - NO MOCKS
# ABOUTME: Provides real database connections and test fixtures

"""
Real Test Configuration for AniManga Recommender Backend

Provides real database connections and test fixtures for all tests.
NO MOCKS - All fixtures connect to actual test databases.
"""

import os
import sys
import pytest
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Set test environment variables BEFORE importing app
os.environ['TESTING'] = 'true'
os.environ['JWT_SECRET_KEY'] = 'test-jwt-secret-key'
# Clear Supabase URLs to force local JWT verification in tests
os.environ['SUPABASE_URL'] = ''
os.environ['SUPABASE_KEY'] = ''
os.environ['SUPABASE_SERVICE_KEY'] = ''

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app as flask_app
from tests.test_utils import TestDataManager, generate_jwt_token, create_auth_headers


# ======================== Environment Configuration ========================

# Test database configuration
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://test_user:test_password@localhost:5433/animanga_test"
)


# ======================== Database Fixtures ========================

@pytest.fixture(scope="session")
def database_engine():
    """Create a real database engine for the test session."""
    engine = create_engine(TEST_DATABASE_URL)
    
    # Create tables if they don't exist
    try:
        with engine.connect() as conn:
            # Check if tables exist
            result = conn.execute(text("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'user_profiles'
            """))
            
            if result.scalar() == 0:
                # Tables don't exist, create them
                _create_test_schema(conn)
                
    except Exception as e:
        print(f"Warning: Could not check/create database schema: {e}")
    
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def database_connection(database_engine):
    """Provide a real database connection without transaction rollback."""
    connection = database_engine.connect()
    
    yield connection
    
    # Close connection after test
    connection.close()


@pytest.fixture(scope="function")
def database_session(database_connection):
    """Provide a database session for ORM operations."""
    Session = sessionmaker(bind=database_connection)
    session = Session()
    
    yield session
    
    session.close()


# ======================== Flask App Fixtures ========================

@pytest.fixture(scope="function")
def app():
    """Create a Flask app instance for testing."""
    flask_app.config['TESTING'] = True
    flask_app.config['WTF_CSRF_ENABLED'] = False
    flask_app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key'
    
    # Configure database connection
    flask_app.config['DATABASE_URL'] = TEST_DATABASE_URL
    
    yield flask_app


@pytest.fixture(scope="function")
def client(app):
    """Create a test client for the Flask application."""
    with app.test_client() as test_client:
        with app.app_context():
            yield test_client


# ======================== Authentication Fixtures ========================

@pytest.fixture(scope="function")
def auth_client(app):
    """Provide a real authentication client for testing."""
    from supabase_client import SupabaseAuthClient
    
    client = SupabaseAuthClient(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_KEY'],
        os.environ['SUPABASE_SERVICE_KEY']
    )
    
    # Set JWT secret for testing
    client.jwt_secret = app.config['JWT_SECRET_KEY']
    
    yield client


@pytest.fixture(scope="function")
def authenticated_user(database_connection, app):
    """Create an authenticated test user with JWT token."""
    manager = TestDataManager(database_connection)
    
    # Create test user
    user = manager.create_test_user(
        email="auth_fixture@example.com",
        username="auth_fixture_user"
    )
    
    # Generate JWT token
    jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
    token = generate_jwt_token(
        user_id=user['id'],
        email=user['email'],
        secret_key=jwt_secret
    )
    
    # Create auth headers
    headers = create_auth_headers(token)
    
    yield {
        'user': user,
        'token': token,
        'headers': headers,
        'manager': manager
    }
    
    # Cleanup
    manager.cleanup()


@pytest.fixture(scope="function")
def auth_headers(authenticated_user):
    """Generate test authentication headers with real JWT."""
    return authenticated_user['headers']


# ======================== Test Data Fixtures ========================

@pytest.fixture(scope="function")
def test_data_manager(database_connection):
    """Provide a test data manager for creating test data."""
    manager = TestDataManager(database_connection)
    
    yield manager
    
    # Cleanup all created test data
    manager.cleanup()


@pytest.fixture(scope="function")
def sample_items(test_data_manager):
    """Create sample items for testing."""
    items = []
    
    # Create anime items
    items.append(test_data_manager.create_test_item(
        uid="sample_anime_1",
        title="Sample Anime One",
        item_type="anime",
        score=8.5,
        episodes=24,
        genres=["Action", "Adventure"],
        themes=["School"]
    ))
    
    items.append(test_data_manager.create_test_item(
        uid="sample_anime_2",
        title="Sample Anime Two",
        item_type="anime",
        score=7.8,
        episodes=12,
        genres=["Comedy", "Romance"],
        themes=["Love"]
    ))
    
    # Create manga item
    items.append(test_data_manager.create_test_item(
        uid="sample_manga_1",
        title="Sample Manga One",
        item_type="manga",
        score=8.2,
        genres=["Drama", "Mystery"],
        themes=["Detective"]
    ))
    
    return items


@pytest.fixture(scope="function")
def sample_users(test_data_manager):
    """Create sample users for testing."""
    users = []
    
    users.append(test_data_manager.create_test_user(
        email="sample_user1@example.com",
        username="sample_user1",
        bio="First sample user"
    ))
    
    users.append(test_data_manager.create_test_user(
        email="sample_user2@example.com",
        username="sample_user2",
        bio="Second sample user"
    ))
    
    return users


# ======================== Helper Functions ========================

def _create_test_schema(connection):
    """Create database schema for testing."""
    schema_sql = """
    -- User profiles table
    CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        bio TEXT,
        avatar_url TEXT,
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
        allow_friend_requests BOOLEAN DEFAULT true
    );
    
    -- User statistics
    CREATE TABLE IF NOT EXISTS user_statistics (
        user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
        total_anime INTEGER DEFAULT 0,
        total_manga INTEGER DEFAULT 0,
        anime_days_watched DECIMAL DEFAULT 0,
        manga_chapters_read INTEGER DEFAULT 0,
        mean_score DECIMAL DEFAULT 0,
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
        title TEXT NOT NULL,
        type VARCHAR(20),
        media_type VARCHAR(20),
        synopsis TEXT,
        score DECIMAL,
        scored_by INTEGER,
        rank INTEGER,
        popularity INTEGER,
        members INTEGER,
        favorites INTEGER,
        episodes INTEGER,
        genres TEXT[],
        themes TEXT[],
        demographics TEXT[],
        studios TEXT[],
        authors TEXT[],
        aired VARCHAR(100),
        source VARCHAR(100),
        rating VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- User items
    CREATE TABLE IF NOT EXISTS user_items (
        user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        item_uid VARCHAR(100) REFERENCES items(uid) ON DELETE CASCADE,
        status VARCHAR(50),
        score DECIMAL,
        progress INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, item_uid)
    );
    
    -- Custom lists
    CREATE TABLE IF NOT EXISTS custom_lists (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT true,
        is_collaborative BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Custom list items
    CREATE TABLE IF NOT EXISTS custom_list_items (
        list_id UUID REFERENCES custom_lists(id) ON DELETE CASCADE,
        item_uid VARCHAR(100) REFERENCES items(uid) ON DELETE CASCADE,
        added_by UUID REFERENCES user_profiles(id),
        position INTEGER,
        personal_rating DECIMAL,
        status VARCHAR(50),
        tags TEXT[],
        added_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (list_id, item_uid)
    );
    
    -- Comments
    CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY,
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
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        item_uid VARCHAR(100) REFERENCES items(uid) ON DELETE CASCADE,
        overall_rating INTEGER NOT NULL,
        story_rating INTEGER,
        animation_rating INTEGER,
        character_rating INTEGER,
        enjoyment_rating INTEGER,
        review_text TEXT,
        contains_spoilers BOOLEAN DEFAULT false,
        helpful_count INTEGER DEFAULT 0,
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
    
    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        type VARCHAR(50),
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- User activity
    CREATE TABLE IF NOT EXISTS user_activity (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        activity_type VARCHAR(50),
        activity_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Recommendations cache table
    CREATE TABLE IF NOT EXISTS recommendations_cache (
        item_uid VARCHAR PRIMARY KEY,
        recommendations JSONB NOT NULL,
        computed_at TIMESTAMP DEFAULT NOW(),
        similarity_scores JSONB,
        version INTEGER DEFAULT 1
    );
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_recommendations_cache_computed ON recommendations_cache(computed_at);
    
    -- Distinct values cache table
    CREATE TABLE IF NOT EXISTS distinct_values_cache (
        id INTEGER PRIMARY KEY DEFAULT 1,
        genres JSONB NOT NULL DEFAULT '[]',
        themes JSONB NOT NULL DEFAULT '[]',
        demographics JSONB NOT NULL DEFAULT '[]',
        studios JSONB NOT NULL DEFAULT '[]',
        authors JSONB NOT NULL DEFAULT '[]',
        statuses JSONB NOT NULL DEFAULT '[]',
        media_types JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Ensure only one row exists
    ALTER TABLE distinct_values_cache ADD CONSTRAINT single_row CHECK (id = 1);
    
    -- Create index for update timestamp
    CREATE INDEX IF NOT EXISTS idx_distinct_values_updated ON distinct_values_cache(updated_at);
    """
    
    connection.execute(text(schema_sql))
    connection.commit()


# ======================== Pytest Configuration ========================

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "real_integration: mark test as using real database connections"
    )
    config.addinivalue_line(
        "markers", "requires_db: mark test as requiring database access"
    )