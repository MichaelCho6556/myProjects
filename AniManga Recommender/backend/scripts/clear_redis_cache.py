#!/usr/bin/env python3
"""
Clear Redis cache for recommendations.

This script clears all cached recommendations from Redis, forcing
the system to recompute them using the new TF-IDF artifacts.

Usage:
    python scripts/clear_redis_cache.py
    python scripts/clear_redis_cache.py --pattern "recs:*"
    python scripts/clear_redis_cache.py --all
"""

import os
import sys
import argparse
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Try to import Redis cache
try:
    from utils.redis_cache import get_redis_cache
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("Redis not available")
    sys.exit(1)

# Load environment variables
if os.path.exists('.env'):
    load_dotenv()

def clear_recommendation_cache(pattern="recs:*"):
    """
    Clear Redis cache entries matching the pattern.
    
    Args:
        pattern: Redis key pattern to match (default: "recs:*" for recommendations)
    """
    redis = get_redis_cache()
    
    if not redis or not redis.connected:
        print("ERROR: Could not connect to Redis")
        return False
    
    print(f"Connected to Redis")
    print(f"Searching for keys matching pattern: {pattern}")
    
    # Get all keys matching the pattern
    try:
        # For Upstash Redis, we need to use scan differently
        deleted_count = 0
        
        if pattern == "*":
            # Clear all keys (use with caution!)
            print("WARNING: Clearing ALL Redis cache entries!")
            response = input("Are you sure? (yes/no): ")
            if response.lower() != 'yes':
                print("Aborted")
                return False
            
            # Upstash doesn't support FLUSHDB directly, need to delete keys individually
            cursor = 0
            while True:
                # Scan for keys - using redis.client instead of redis.redis_client
                result = redis.client.scan(cursor, match="*", count=100)
                cursor = result[0]
                keys = result[1]
                
                if keys:
                    # Delete keys in batch
                    for key in keys:
                        redis.client.delete(key)
                        deleted_count += 1
                        print(f"Deleted: {key}")
                
                if cursor == 0:
                    break
        else:
            # Delete keys matching specific pattern
            cursor = 0
            while True:
                # Scan for keys matching pattern - using redis.client
                result = redis.client.scan(cursor, match=pattern, count=100)
                cursor = result[0]
                keys = result[1]
                
                if keys:
                    # Delete keys in batch
                    for key in keys:
                        redis.client.delete(key)
                        deleted_count += 1
                        print(f"Deleted: {key}")
                
                if cursor == 0:
                    break
        
        print(f"\nSuccessfully deleted {deleted_count} cache entries")
        
        # Also clear TF-IDF cache keys if clearing recommendations
        if pattern == "recs:*":
            print("\nAlso checking for TF-IDF cache keys...")
            tfidf_patterns = ["tfidf:*", "recommendations_cache:*"]
            
            for tfidf_pattern in tfidf_patterns:
                cursor = 0
                tfidf_deleted = 0
                while True:
                    result = redis.client.scan(cursor, match=tfidf_pattern, count=100)
                    cursor = result[0]
                    keys = result[1]
                    
                    if keys:
                        for key in keys:
                            # Convert bytes to string if needed
                            key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                            # Don't delete the actual TF-IDF artifacts
                            if "matrix" not in key_str and "vectorizer" not in key_str and "uid_mapping" not in key_str:
                                redis.client.delete(key)
                                tfidf_deleted += 1
                                print(f"Deleted: {key}")
                    
                    if cursor == 0:
                        break
                
                if tfidf_deleted > 0:
                    print(f"Deleted {tfidf_deleted} {tfidf_pattern} entries")
        
        return True
        
    except Exception as e:
        print(f"ERROR clearing cache: {e}")
        return False

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Clear Redis cache entries')
    parser.add_argument('--pattern', default='recs:*', 
                        help='Redis key pattern to delete (default: recs:*)')
    parser.add_argument('--all', action='store_true',
                        help='Clear ALL Redis cache (use with caution!)')
    
    args = parser.parse_args()
    
    if args.all:
        pattern = "*"
    else:
        pattern = args.pattern
    
    print("=" * 60)
    print("REDIS CACHE CLEARING")
    print("=" * 60)
    
    success = clear_recommendation_cache(pattern)
    
    if success:
        print("\n[SUCCESS] Cache cleared successfully!")
        print("Recommendations will be recomputed on next request")
    else:
        print("\n[FAILED] Failed to clear cache")
        sys.exit(1)

if __name__ == '__main__':
    main()