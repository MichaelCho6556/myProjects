#!/usr/bin/env python3
"""
Setup script for test database schema
Creates all necessary tables for integration testing
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Test database configuration
TEST_DB_CONFIG = {
    'host': 'localhost',
    'port': 5433,
    'database': 'animanga_test',
    'user': 'test_user',
    'password': 'test_password'
}

def create_test_schema():
    """Create all necessary tables for testing"""
    conn = psycopg2.connect(**TEST_DB_CONFIG)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    # Create tables matching Supabase schema
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
        allow_friend_requests BOOLEAN DEFAULT true
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
        type VARCHAR(20),
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
        genres TEXT[],
        themes TEXT[],
        demographics TEXT[],
        studios TEXT[],
        authors TEXT[],
        serializations TEXT[],
        aired VARCHAR(100),
        published VARCHAR(100),
        source VARCHAR(100),
        rating VARCHAR(50),
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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Custom list items
    CREATE TABLE IF NOT EXISTS custom_list_items (
        list_id UUID REFERENCES custom_lists(id) ON DELETE CASCADE,
        item_uid VARCHAR(100) REFERENCES items(uid) ON DELETE CASCADE,
        added_by UUID REFERENCES user_profiles(id),
        position INTEGER,
        personal_rating FLOAT,
        status VARCHAR(50),
        tags TEXT[],
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
        cur.execute(schema_sql)
        print("✅ Test database schema created successfully!")
    except Exception as e:
        print(f"❌ Error creating schema: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_test_schema()