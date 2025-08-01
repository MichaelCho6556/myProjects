"""
Test suite for hybrid cache system (memory + database)

Tests the new two-tier caching implementation that replaces Redis
for production deployment on free-tier hosting.
"""

import pytest
import time
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

# Import cache modules
from utils.memory_cache import MemoryLRUCache, CacheEntry
from utils.database_cache import DatabaseCache
from utils.hybrid_cache import HybridCache, get_hybrid_cache


class TestMemoryCache:
    """Test the in-memory LRU cache implementation."""
    
    def test_basic_get_set(self):
        """Test basic cache operations."""
        cache = MemoryLRUCache(max_size=10)
        
        # Test set and get
        assert cache.set("key1", "value1")
        assert cache.get("key1") == "value1"
        
        # Test missing key
        assert cache.get("missing") is None
        
        # Test overwrite
        assert cache.set("key1", "new_value")
        assert cache.get("key1") == "new_value"
    
    def test_ttl_expiration(self):
        """Test TTL-based expiration."""
        cache = MemoryLRUCache(max_size=10)
        
        # Set with 0.1 second TTL
        cache.set("expire_key", "value", ttl_seconds=0.1)
        assert cache.get("expire_key") == "value"
        
        # Wait for expiration
        time.sleep(0.2)
        assert cache.get("expire_key") is None
    
    def test_lru_eviction(self):
        """Test LRU eviction when cache is full."""
        cache = MemoryLRUCache(max_size=3)
        
        # Fill cache
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")
        
        # Access key1 and key2 to make them more recent
        cache.get("key1")
        cache.get("key2")
        
        # Add new key - should evict key3 (least recently used)
        cache.set("key4", "value4")
        
        assert cache.get("key1") == "value1"
        assert cache.get("key2") == "value2"
        assert cache.get("key3") is None  # Evicted
        assert cache.get("key4") == "value4"
    
    def test_memory_limit(self):
        """Test memory-based eviction."""
        # Small memory limit (1KB)
        cache = MemoryLRUCache(max_size=100, max_memory_mb=0.001)
        
        # Add large values
        large_value = "x" * 500  # ~500 bytes
        cache.set("key1", large_value)
        cache.set("key2", large_value)
        
        # Third value should trigger memory eviction
        cache.set("key3", large_value)
        
        # At least one key should be evicted
        existing_keys = sum(1 for k in ["key1", "key2", "key3"] if cache.get(k))
        assert existing_keys < 3
    
    def test_statistics(self):
        """Test cache statistics tracking."""
        cache = MemoryLRUCache(max_size=10)
        
        # Generate some activity
        cache.set("key1", "value1")
        cache.get("key1")  # Hit
        cache.get("key2")  # Miss
        cache.get("key1")  # Hit
        
        stats = cache.get_stats()
        assert stats['hits'] == 2
        assert stats['misses'] == 1
        assert stats['hit_rate'] == 66.67  # 2/3 * 100
        assert stats['current_size'] == 1


class TestDatabaseCache:
    """Test the database-backed cache implementation."""
    
    @pytest.fixture
    def mock_supabase(self):
        """Mock Supabase client for testing."""
        with patch('utils.database_cache.SupabaseClient') as mock:
            # Mock the client attribute and its methods
            mock_client = Mock()
            mock.return_value.client = mock_client
            
            # Mock successful table check
            mock_client.table.return_value.select.return_value.limit.return_value.execute.return_value = Mock(data=[])
            
            yield mock_client
    
    def test_connection_check(self, mock_supabase):
        """Test database connection checking."""
        cache = DatabaseCache()
        
        # Should have tested connection
        mock_supabase.table.assert_called_with('cache_store')
        assert cache.connected is True
    
    def test_key_sanitization(self):
        """Test cache key sanitization."""
        cache = DatabaseCache()
        
        # Normal key
        assert cache._sanitize_key("normal_key") == "normal_key"
        
        # Long key should be truncated and hashed
        long_key = "x" * 300
        sanitized = cache._sanitize_key(long_key)
        assert len(sanitized) <= 255
        assert "..." in sanitized
    
    def test_value_serialization(self):
        """Test JSON serialization of values."""
        cache = DatabaseCache()
        
        # Test various data types
        assert cache._serialize_value("string") == '"string"'
        assert cache._serialize_value(123) == '123'
        assert cache._serialize_value({"key": "value"}) == '{"key":"value"}'
        assert cache._serialize_value([1, 2, 3]) == '[1,2,3]'
        
        # Test datetime serialization
        now = datetime.utcnow()
        serialized = cache._serialize_value(now)
        assert now.isoformat() in serialized
    
    def test_cache_type_determination(self):
        """Test cache type detection from key patterns."""
        cache = DatabaseCache()
        
        assert cache._determine_cache_type("user_stats:123") == "user_stats"
        assert cache._determine_cache_type("recommendations:456") == "recommendations"
        assert cache._determine_cache_type("toxicity_analysis:comment:789") == "toxicity_analysis"
        assert cache._determine_cache_type("random_key") == "general"


class TestHybridCache:
    """Test the hybrid two-tier cache system."""
    
    def test_initialization(self):
        """Test hybrid cache initialization."""
        cache = HybridCache(memory_size=50, memory_mb=10)
        
        assert cache.memory_cache is not None
        assert cache.database_cache is not None
        assert cache.write_through is True
    
    def test_memory_first_retrieval(self):
        """Test that memory cache is checked first."""
        cache = HybridCache()
        
        # Set in memory only
        cache.memory_cache.set("test_key", "memory_value")
        
        # Mock database to ensure it's not called
        with patch.object(cache.database_cache, 'get') as mock_db_get:
            value = cache.get("test_key")
            
            assert value == "memory_value"
            mock_db_get.assert_not_called()
    
    def test_database_fallback(self):
        """Test fallback to database when not in memory."""
        cache = HybridCache()
        
        # Mock database response
        with patch.object(cache.database_cache, 'get') as mock_db_get:
            mock_db_get.return_value = "db_value"
            
            value = cache.get("test_key")
            
            assert value == "db_value"
            mock_db_get.assert_called_once_with("test_key")
    
    def test_write_through(self):
        """Test write-through to both cache tiers."""
        cache = HybridCache()
        
        with patch.object(cache.database_cache, 'set') as mock_db_set:
            mock_db_set.return_value = True
            
            # Set value
            result = cache.set("test_key", "test_value", ttl_hours=2)
            
            assert result is True
            # Check memory cache
            assert cache.memory_cache.get("test_key") == "test_value"
            # Check database was called
            mock_db_set.assert_called_once_with("test_key", "test_value", 2)
    
    def test_promotion_logic(self):
        """Test promotion of hot data from database to memory."""
        cache = HybridCache()
        
        # Mock database return
        with patch.object(cache.database_cache, 'get') as mock_db_get:
            mock_db_get.return_value = {"data": "important"}
            
            # Get user stats (high priority type)
            value = cache.get("user_stats:123")
            
            # Should be promoted to memory
            assert cache.memory_cache.get("user_stats:123") == {"data": "important"}
            assert cache.stats['promotions'] == 1
    
    def test_statistics_aggregation(self):
        """Test combined statistics from both tiers."""
        cache = HybridCache()
        
        # Generate some activity
        cache.set("key1", "value1")
        cache.get("key1")  # Memory hit
        cache.get("missing")  # Miss
        
        stats = cache.get_stats()
        
        assert stats['memory_hits'] == 1
        assert stats['total_misses'] == 1
        assert stats['total_requests'] == 2
        assert 'memory_tier' in stats
        assert 'database_tier' in stats


class TestCacheHelpers:
    """Test the cache helper functions with new backend."""
    
    def test_backward_compatibility(self):
        """Test that old Redis-style API still works."""
        from utils.cache_helpers import get_cache, RedisCache, HybridCache
        
        # RedisCache should be an alias for HybridCache
        assert RedisCache == HybridCache
        
        # get_cache should return HybridCache instance
        cache = get_cache()
        assert isinstance(cache, HybridCache)
    
    def test_cache_helper_functions(self):
        """Test specific cache helper functions."""
        from utils.cache_helpers import (
            get_user_stats_from_cache,
            set_user_stats_in_cache
        )
        
        # Test user stats caching
        user_id = "test_user_123"
        stats = {
            'total_anime': 50,
            'completed_anime': 30,
            'average_rating': 7.5
        }
        
        # Set stats
        result = set_user_stats_in_cache(user_id, stats)
        assert result is True
        
        # Get stats
        cached_stats = get_user_stats_from_cache(user_id)
        assert cached_stats is not None
        assert cached_stats['total_anime'] == 50
        assert 'cached_at' in cached_stats


@pytest.mark.integration
class TestCacheIntegration:
    """Integration tests for the complete cache system."""
    
    def test_end_to_end_caching(self):
        """Test complete caching workflow."""
        cache = get_hybrid_cache()
        
        # Clear cache
        cache.clear_memory()
        
        # Test data
        test_data = {
            'user_stats:user1': {'anime': 100, 'manga': 50},
            'recommendations:anime123': ['anime456', 'anime789'],
            'platform_stats:global': {'users': 1000, 'items': 50000}
        }
        
        # Set all data
        for key, value in test_data.items():
            assert cache.set(key, value)
        
        # Verify all data retrievable
        for key, expected_value in test_data.items():
            assert cache.get(key) == expected_value
        
        # Test cache warming
        cache.clear_memory()
        cache.warm_up(list(test_data.keys()))
        
        # Data should be in memory now
        for key in test_data:
            assert cache.memory_cache.get(key) is not None
    
    def test_performance_comparison(self):
        """Compare performance of memory vs database cache."""
        cache = get_hybrid_cache()
        
        # Prepare test data
        cache.set("perf_test", {"data": "x" * 1000})
        
        # Measure memory cache performance
        start = time.time()
        for _ in range(100):
            cache.memory_cache.get("perf_test")
        memory_time = time.time() - start
        
        # Clear memory to force database access
        cache.clear_memory()
        
        # Measure database cache performance (mocked)
        with patch.object(cache.database_cache, 'get') as mock_db:
            mock_db.return_value = {"data": "x" * 1000}
            
            start = time.time()
            for _ in range(100):
                cache.get("perf_test")
            db_time = time.time() - start
        
        # Memory should be significantly faster
        # In real scenario, memory is ~1000x faster
        print(f"Memory time: {memory_time:.4f}s, DB time: {db_time:.4f}s")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])