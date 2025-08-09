# ABOUTME: Real hybrid cache tests - NO MOCKS
# ABOUTME: Tests actual cache operations with real memory and database caching

"""
Real Hybrid Cache Tests for AniManga Recommender

Test Coverage:
- Memory LRU cache with real operations
- Database cache with actual database
- Hybrid cache tier management
- TTL expiration with real timing
- Cache eviction policies
- Performance characteristics

NO MOCKS - All tests use real cache implementations and actual timing
"""

import pytest
import time
import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy import text

# Import test dependencies
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.memory_cache import MemoryLRUCache, CacheEntry
from utils.database_cache import DatabaseCache
from utils.hybrid_cache import HybridCache, get_hybrid_cache
from tests.test_utils import TestDataManager


@pytest.mark.real_integration
class TestMemoryCache:
    """Test the in-memory LRU cache with real operations"""
    
    def test_basic_get_set(self):
        """Test basic cache operations with real memory"""
        cache = MemoryLRUCache(max_size=10)
        
        # Test set and get
        assert cache.set("key1", "value1")
        assert cache.get("key1") == "value1"
        
        # Test missing key
        assert cache.get("missing") is None
        
        # Test overwrite
        assert cache.set("key1", "new_value")
        assert cache.get("key1") == "new_value"
        
        # Test different data types
        cache.set("int_key", 42)
        cache.set("list_key", [1, 2, 3])
        cache.set("dict_key", {"nested": "value"})
        
        assert cache.get("int_key") == 42
        assert cache.get("list_key") == [1, 2, 3]
        assert cache.get("dict_key") == {"nested": "value"}
    
    def test_ttl_expiration_real_timing(self):
        """Test TTL expiration with real time delays"""
        cache = MemoryLRUCache(max_size=10)
        
        # Set with 0.5 second TTL
        cache.set("expire_key", "value", ttl_seconds=0.5)
        
        # Should exist immediately
        assert cache.get("expire_key") == "value"
        
        # Wait partial time - should still exist
        time.sleep(0.3)
        assert cache.get("expire_key") == "value"
        
        # Wait for full expiration
        time.sleep(0.3)
        assert cache.get("expire_key") is None
        
        # Test longer TTL
        cache.set("long_ttl", "persistent", ttl_seconds=10)
        time.sleep(1)
        assert cache.get("long_ttl") == "persistent"  # Still there after 1 second
    
    def test_lru_eviction_real(self):
        """Test LRU eviction with real memory constraints"""
        cache = MemoryLRUCache(max_size=3)
        
        # Fill cache
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")
        
        # Verify all present
        assert cache.get("key1") == "value1"
        assert cache.get("key2") == "value2"
        assert cache.get("key3") == "value3"
        
        # Access pattern to establish LRU order
        time.sleep(0.01)  # Small delay to ensure different timestamps
        cache.get("key1")  # Most recent
        time.sleep(0.01)
        cache.get("key2")  # Second most recent
        # key3 is now least recently used
        
        # Add new key - should evict key3
        cache.set("key4", "value4")
        
        assert cache.get("key1") == "value1"
        assert cache.get("key2") == "value2"
        assert cache.get("key3") is None  # Evicted
        assert cache.get("key4") == "value4"
    
    def test_memory_limit_real_data(self):
        """Test memory-based eviction with real data sizes"""
        # Small memory limit (0.01 MB = ~10KB)
        cache = MemoryLRUCache(max_size=1000, max_memory_mb=0.01)
        
        # Create realistically sized values
        small_value = {"id": 1, "name": "test", "data": "x" * 100}  # ~150 bytes
        medium_value = {"data": "x" * 1000, "array": list(range(100))}  # ~1.5KB
        large_value = {"huge": "x" * 5000, "numbers": list(range(500))}  # ~7KB
        
        # Add values
        cache.set("small1", small_value)
        cache.set("small2", small_value)
        cache.set("medium1", medium_value)
        
        # Check current state
        assert cache.get("small1") is not None
        assert cache.get("medium1") is not None
        
        # Adding large value should trigger eviction
        cache.set("large1", large_value)
        
        # Large value should be present, some others evicted
        assert cache.get("large1") is not None
        
        # Not all original keys should remain
        remaining = sum(1 for k in ["small1", "small2", "medium1"] if cache.get(k))
        assert remaining < 3  # Some were evicted
    
    def test_concurrent_access_simulation(self):
        """Simulate concurrent cache access patterns"""
        cache = MemoryLRUCache(max_size=50)
        
        # Simulate multiple "users" accessing cache
        for user_id in range(10):
            cache.set(f"user_{user_id}_profile", {"id": user_id, "active": True})
            cache.set(f"user_{user_id}_preferences", {"theme": "dark"})
        
        # Simulate access pattern
        hits = 0
        misses = 0
        
        for _ in range(100):
            user_id = _ % 10
            if _ % 3 == 0:
                # Access profile
                if cache.get(f"user_{user_id}_profile"):
                    hits += 1
                else:
                    misses += 1
            else:
                # Access preferences
                if cache.get(f"user_{user_id}_preferences"):
                    hits += 1
                else:
                    misses += 1
        
        # Should have good hit rate since cache is large enough
        hit_rate = hits / (hits + misses) * 100
        assert hit_rate > 90  # Expect high hit rate
        
        # Verify statistics
        stats = cache.get_stats()
        assert stats['current_size'] <= 50
        assert stats['hits'] > 0
        assert stats['misses'] >= 0


@pytest.mark.real_integration
class TestDatabaseCache:
    """Test database-backed cache with real database operations"""
    
    def test_database_cache_operations(self, database_connection):
        """Test database cache with real database"""
        # Create cache table if it doesn't exist
        database_connection.execute(text("""
            CREATE TABLE IF NOT EXISTS cache_store (
                cache_key VARCHAR(255) PRIMARY KEY,
                cache_value TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        database_connection.commit()
        
        # Test basic operations
        test_key = f"test_cache_{uuid.uuid4().hex[:8]}"
        test_value = {"data": "test_value", "number": 42}
        
        # Store in cache
        expires_at = datetime.utcnow() + timedelta(hours=1)
        database_connection.execute(
            text("""
                INSERT INTO cache_store (cache_key, cache_value, expires_at)
                VALUES (:key, :value, :expires)
                ON CONFLICT (cache_key) DO UPDATE
                SET cache_value = EXCLUDED.cache_value,
                    expires_at = EXCLUDED.expires_at,
                    updated_at = NOW()
            """),
            {
                "key": test_key,
                "value": json.dumps(test_value),
                "expires": expires_at
            }
        )
        database_connection.commit()
        
        # Retrieve from cache
        result = database_connection.execute(
            text("""
                SELECT cache_value 
                FROM cache_store 
                WHERE cache_key = :key 
                AND expires_at > NOW()
            """),
            {"key": test_key}
        )
        
        row = result.fetchone()
        assert row is not None
        
        cached_value = json.loads(row[0])
        assert cached_value == test_value
        
        # Clean up
        database_connection.execute(
            text("DELETE FROM cache_store WHERE cache_key = :key"),
            {"key": test_key}
        )
        database_connection.commit()
    
    def test_database_cache_expiration(self, database_connection):
        """Test cache expiration in database"""
        # Ensure cache table exists
        database_connection.execute(text("""
            CREATE TABLE IF NOT EXISTS cache_store (
                cache_key VARCHAR(255) PRIMARY KEY,
                cache_value TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        database_connection.commit()
        
        # Insert expired entry
        expired_key = f"expired_{uuid.uuid4().hex[:8]}"
        database_connection.execute(
            text("""
                INSERT INTO cache_store (cache_key, cache_value, expires_at)
                VALUES (:key, :value, :expires)
            """),
            {
                "key": expired_key,
                "value": json.dumps({"expired": True}),
                "expires": datetime.utcnow() - timedelta(hours=1)  # Already expired
            }
        )
        
        # Insert valid entry
        valid_key = f"valid_{uuid.uuid4().hex[:8]}"
        database_connection.execute(
            text("""
                INSERT INTO cache_store (cache_key, cache_value, expires_at)
                VALUES (:key, :value, :expires)
            """),
            {
                "key": valid_key,
                "value": json.dumps({"valid": True}),
                "expires": datetime.utcnow() + timedelta(hours=1)
            }
        )
        database_connection.commit()
        
        # Query for non-expired entries
        result = database_connection.execute(
            text("""
                SELECT cache_key 
                FROM cache_store 
                WHERE cache_key IN (:expired, :valid)
                AND expires_at > NOW()
            """),
            {"expired": expired_key, "valid": valid_key}
        )
        
        valid_keys = [row[0] for row in result.fetchall()]
        
        assert expired_key not in valid_keys
        assert valid_key in valid_keys
        
        # Clean up
        database_connection.execute(
            text("DELETE FROM cache_store WHERE cache_key IN (:expired, :valid)"),
            {"expired": expired_key, "valid": valid_key}
        )
        database_connection.commit()
    
    def test_database_cache_cleanup(self, database_connection):
        """Test cleaning up expired cache entries"""
        # Ensure cache table exists
        database_connection.execute(text("""
            CREATE TABLE IF NOT EXISTS cache_store (
                cache_key VARCHAR(255) PRIMARY KEY,
                cache_value TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        database_connection.commit()
        
        # Insert multiple entries with different expiration times
        now = datetime.utcnow()
        entries = []
        
        for i in range(5):
            key = f"cleanup_test_{i}_{uuid.uuid4().hex[:8]}"
            entries.append(key)
            
            # Half expired, half valid
            if i < 3:
                expires = now - timedelta(hours=1)  # Expired
            else:
                expires = now + timedelta(hours=1)  # Valid
            
            database_connection.execute(
                text("""
                    INSERT INTO cache_store (cache_key, cache_value, expires_at)
                    VALUES (:key, :value, :expires)
                """),
                {
                    "key": key,
                    "value": json.dumps({"index": i}),
                    "expires": expires
                }
            )
        
        database_connection.commit()
        
        # Clean up expired entries
        result = database_connection.execute(
            text("""
                DELETE FROM cache_store 
                WHERE expires_at < NOW()
                AND cache_key LIKE 'cleanup_test_%'
                RETURNING cache_key
            """)
        )
        
        deleted_keys = [row[0] for row in result.fetchall()]
        database_connection.commit()
        
        # Should have deleted 3 expired entries
        assert len(deleted_keys) == 3
        
        # Verify remaining entries
        result = database_connection.execute(
            text("""
                SELECT COUNT(*) 
                FROM cache_store 
                WHERE cache_key LIKE 'cleanup_test_%'
            """)
        )
        
        remaining = result.scalar()
        assert remaining == 2  # 2 valid entries remain
        
        # Final cleanup
        database_connection.execute(
            text("DELETE FROM cache_store WHERE cache_key LIKE 'cleanup_test_%'")
        )
        database_connection.commit()


@pytest.mark.real_integration
class TestHybridCache:
    """Test hybrid cache with real memory and database tiers"""
    
    def test_hybrid_cache_tiering(self, database_connection):
        """Test data movement between cache tiers"""
        # Ensure cache table exists
        database_connection.execute(text("""
            CREATE TABLE IF NOT EXISTS cache_store (
                cache_key VARCHAR(255) PRIMARY KEY,
                cache_value TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        database_connection.commit()
        
        # Create hybrid cache with small memory tier
        memory_cache = MemoryLRUCache(max_size=3)
        hybrid = HybridCache(memory_cache=memory_cache)
        
        # Add items that will overflow memory
        for i in range(5):
            key = f"hybrid_{i}"
            value = f"value_{i}"
            hybrid.set(key, value, ttl_seconds=3600)
        
        # Recent items should be in memory
        assert memory_cache.get("hybrid_4") is not None
        assert memory_cache.get("hybrid_3") is not None
        
        # Older items might be evicted from memory
        # but should still be retrievable through hybrid cache
        for i in range(5):
            assert hybrid.get(f"hybrid_{i}") == f"value_{i}"
    
    def test_hybrid_cache_fallback(self):
        """Test fallback from memory to database"""
        memory_cache = MemoryLRUCache(max_size=2)
        hybrid = HybridCache(memory_cache=memory_cache)
        
        # Set value in hybrid cache
        hybrid.set("fallback_test", {"data": "important"}, ttl_seconds=3600)
        
        # Should be in memory initially
        assert memory_cache.get("fallback_test") is not None
        
        # Fill memory to evict our key
        hybrid.set("evict1", "data1", ttl_seconds=3600)
        hybrid.set("evict2", "data2", ttl_seconds=3600)
        
        # Original key might be evicted from memory
        # but hybrid should still retrieve it
        result = hybrid.get("fallback_test")
        assert result == {"data": "important"}
    
    def test_hybrid_cache_performance(self):
        """Test performance characteristics of hybrid cache"""
        hybrid = HybridCache()
        
        # Measure write performance
        start_time = time.time()
        for i in range(100):
            hybrid.set(f"perf_key_{i}", f"value_{i}", ttl_seconds=60)
        write_time = time.time() - start_time
        
        # Should complete reasonably quickly
        assert write_time < 2.0  # 100 writes in under 2 seconds
        
        # Measure read performance (memory hits)
        start_time = time.time()
        hits = 0
        for i in range(100):
            if hybrid.get(f"perf_key_{i}"):
                hits += 1
        read_time = time.time() - start_time
        
        # Reads should be very fast
        assert read_time < 0.5  # 100 reads in under 0.5 seconds
        
        # Should have good hit rate for recent items
        assert hits > 50  # At least 50% hit rate
    
    def test_cache_invalidation(self):
        """Test cache invalidation across tiers"""
        hybrid = HybridCache()
        
        # Set value
        hybrid.set("invalid_key", "original_value", ttl_seconds=3600)
        assert hybrid.get("invalid_key") == "original_value"
        
        # Invalidate
        hybrid.delete("invalid_key")
        
        # Should be gone from all tiers
        assert hybrid.get("invalid_key") is None
        
        # Set new value with same key
        hybrid.set("invalid_key", "new_value", ttl_seconds=3600)
        assert hybrid.get("invalid_key") == "new_value"
    
    def test_cache_statistics(self):
        """Test cache statistics collection"""
        hybrid = HybridCache()
        
        # Generate activity
        for i in range(10):
            hybrid.set(f"stat_key_{i}", f"value_{i}")
        
        for i in range(20):
            hybrid.get(f"stat_key_{i % 15}")  # Some hits, some misses
        
        stats = hybrid.get_stats()
        
        assert 'memory' in stats
        assert 'hits' in stats['memory']
        assert 'misses' in stats['memory']
        assert stats['memory']['hits'] > 0
        assert stats['memory']['misses'] > 0