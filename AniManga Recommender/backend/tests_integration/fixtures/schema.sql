-- ABOUTME: Database schema for integration tests with essential tables
-- ABOUTME: Creates core tables needed for testing without full production schema

-- Create items table (core content)
CREATE TABLE IF NOT EXISTS items (
    uid VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    genres JSONB,
    score FLOAT,
    synopsis TEXT,
    status VARCHAR(100),
    main_picture TEXT,
    sfw BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_profiles table (standalone for testing)
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    favorite_genres JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_items table (user lists)
CREATE TABLE IF NOT EXISTS user_items (
    user_id VARCHAR(255) NOT NULL,
    item_uid VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    rating NUMERIC(3,1),
    progress INTEGER DEFAULT 0,
    notes TEXT,
    start_date TIMESTAMP,
    completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, item_uid),
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (item_uid) REFERENCES items(uid) ON DELETE CASCADE
);

-- Create custom_lists table
CREATE TABLE IF NOT EXISTS custom_lists (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    is_collaborative BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create custom_list_items table
CREATE TABLE IF NOT EXISTS custom_list_items (
    list_id VARCHAR(255) NOT NULL,
    item_uid VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    personal_rating INTEGER,
    status VARCHAR(50),
    tags JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (list_id, item_uid),
    FOREIGN KEY (list_id) REFERENCES custom_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (item_uid) REFERENCES items(uid) ON DELETE CASCADE
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    parent_type VARCHAR(50) NOT NULL,
    parent_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_spoiler BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    item_uid VARCHAR(255) NOT NULL,
    overall_rating INTEGER NOT NULL,
    story_rating INTEGER,
    art_rating INTEGER,
    character_rating INTEGER,
    enjoyment_rating INTEGER,
    content TEXT NOT NULL,
    is_spoiler BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (item_uid) REFERENCES items(uid) ON DELETE CASCADE
);

-- Create user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id VARCHAR(255) NOT NULL,
    following_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create user_privacy_settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id VARCHAR(255) PRIMARY KEY,
    profile_visibility VARCHAR(50) DEFAULT 'public',
    list_visibility VARCHAR(50) DEFAULT 'public',
    activity_visibility VARCHAR(50) DEFAULT 'public',
    show_statistics BOOLEAN DEFAULT true,
    show_following BOOLEAN DEFAULT true,
    allow_friend_requests BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create comment_reports table
CREATE TABLE IF NOT EXISTS comment_reports (
    id VARCHAR(255) PRIMARY KEY,
    reporter_id VARCHAR(255) NOT NULL,
    reported_content_type VARCHAR(50) NOT NULL,
    reported_content_id VARCHAR(255) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (reporter_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create user_activity table
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    item_uid VARCHAR(255) NOT NULL,
    activity_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (item_uid) REFERENCES items(uid) ON DELETE CASCADE
);

-- Create user_statistics table for caching
CREATE TABLE IF NOT EXISTS user_statistics (
    user_id VARCHAR(255) PRIMARY KEY,
    total_anime INTEGER DEFAULT 0,
    total_manga INTEGER DEFAULT 0,
    completed_anime INTEGER DEFAULT 0,
    completed_manga INTEGER DEFAULT 0,
    watching INTEGER DEFAULT 0,
    reading INTEGER DEFAULT 0,
    plan_to_watch INTEGER DEFAULT 0,
    plan_to_read INTEGER DEFAULT 0,
    total_anime_watched INTEGER DEFAULT 0,
    total_manga_read INTEGER DEFAULT 0,
    total_hours_watched DECIMAL(10,2) DEFAULT 0,
    total_chapters_read INTEGER DEFAULT 0,
    average_score DECIMAL(3,1) DEFAULT 0,
    favorite_genres JSONB,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_media_type ON items(media_type);
CREATE INDEX IF NOT EXISTS idx_items_score ON items(score);
CREATE INDEX IF NOT EXISTS idx_user_items_status ON user_items(status);
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_reviews_item_uid ON reviews(item_uid);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at DESC);