-- Create recommendations cache table
CREATE TABLE IF NOT EXISTS recommendations_cache (
    item_uid VARCHAR PRIMARY KEY,
    recommendations JSONB NOT NULL,
    computed_at TIMESTAMP DEFAULT NOW(),
    similarity_scores JSONB,
    version INTEGER DEFAULT 1
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recommendations_cache_computed ON recommendations_cache(computed_at);

-- Create distinct values cache table
CREATE TABLE IF NOT EXISTS distinct_values_cache (
    id INTEGER PRIMARY KEY DEFAULT 1,  -- Single row table
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

-- Grant permissions (adjust based on your Supabase setup)
GRANT SELECT ON recommendations_cache TO anon, authenticated;
GRANT SELECT ON distinct_values_cache TO anon, authenticated;
GRANT INSERT, UPDATE ON recommendations_cache TO service_role;
GRANT INSERT, UPDATE ON distinct_values_cache TO service_role;