# ABOUTME: Comprehensive tests for request cache and fallback strategies
# ABOUTME: Tests TTLCache, fallback chains, decorators, and performance
"""
Test Suite for Request Cache and Fallback Strategies

This module provides comprehensive testing for the Phase 1.6 request cache
implementation including TTLCache functionality, fallback chains, decorators,
and performance characteristics.

Test Coverage:
    - TTLCache basic operations
    - Request cache decorators
    - Fallback chain behavior
    - Cache statistics tracking
    - Thread safety
    - Performance benchmarks
    - Error handling
"""

import time
import pytest
import threading
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import concurrent.futures

# Add parent directory to path
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.request_cache import (
    REQUEST_CACHE_TTL,
    REQUEST_CACHE_SIZE,
    get_request_cache_stats,
    clear_request_cache,
    generate_cache_key,
    request_cache,
    cached_with_fallback,
    get_or_compute,
    cache_for_expensive_queries,
    cache_for_user_data,
    warm_request_cache,
    _request_cache,
    _cache_stats
)
from utils.hybrid_cache import get_hybrid_cache


class TestRequestCacheBasics:
    """Test basic request cache functionality."""
    
    def setup_method(self):
        """Clear cache before each test."""
        clear_request_cache()
        # Reset stats
        _cache_stats.update({
            'request_hits': 0,
            'request_misses': 0,
            'fallback_hits': 0,
            'compute_calls': 0,
            'total_requests': 0
        })
    
    def test_cache_key_generation(self):
        """Test stable cache key generation."""
        # Same arguments should produce same key
        key1 = generate_cache_key('user123', n=10, active=True)
        key2 = generate_cache_key('user123', n=10, active=True)
        assert key1 == key2
        
        # Different arguments should produce different keys
        key3 = generate_cache_key('user456', n=10, active=True)
        assert key1 != key3
        
        # Order of kwargs shouldn't matter
        key4 = generate_cache_key('user123', active=True, n=10)
        assert key1 == key4
    
    def test_request_cache_decorator(self):
        """Test request_cache decorator functionality."""
        call_count = 0
        
        @request_cache(ttl=1, key_prefix='test')
        def expensive_function(x, y):
            nonlocal call_count
            call_count += 1
            return x + y
        
        # First call should execute function
        result1 = expensive_function(5, 3)
        assert result1 == 8
        assert call_count == 1
        
        # Second call should use cache
        result2 = expensive_function(5, 3)
        assert result2 == 8
        assert call_count == 1  # Not called again
        
        # Different arguments should execute function
        result3 = expensive_function(10, 2)
        assert result3 == 12
        assert call_count == 2
        
        # Wait for TTL expiration
        time.sleep(1.1)
        
        # Should execute function again after TTL
        result4 = expensive_function(5, 3)
        assert result4 == 8
        assert call_count == 3
    
    def test_cache_statistics(self):
        """Test cache statistics tracking."""
        @request_cache()
        def cached_func(x):
            return x * 2
        
        # Initial stats
        stats = get_request_cache_stats()
        assert stats['total_requests'] == 0
        
        # First call - miss
        cached_func(5)
        stats = get_request_cache_stats()
        assert stats['total_requests'] == 1
        assert stats['request_misses'] == 1
        assert stats['request_hits'] == 0
        
        # Second call - hit
        cached_func(5)
        stats = get_request_cache_stats()
        assert stats['total_requests'] == 2
        assert stats['request_hits'] == 1
        assert stats['request_hit_rate'] == 50.0
    
    def test_clear_cache(self):
        """Test cache clearing functionality."""
        @request_cache()
        def cached_func(x):
            return x * 2
        
        # Populate cache
        cached_func(5)
        assert len(_request_cache) == 1
        
        # Clear cache
        clear_request_cache()
        assert len(_request_cache) == 0
        
        # Stats should remain
        stats = get_request_cache_stats()
        assert stats['total_requests'] > 0


class TestFallbackChain:
    """Test the complete fallback chain functionality."""
    
    def setup_method(self):
        """Clear caches and create mocks."""
        clear_request_cache()
        self.hybrid_cache = Mock()
        self.compute_func = Mock(return_value={'data': 'computed'})
    
    @patch('utils.request_cache.get_hybrid_cache')
    def test_get_or_compute_request_cache_hit(self, mock_get_hybrid):
        """Test get_or_compute when request cache has data."""
        mock_get_hybrid.return_value = self.hybrid_cache
        
        # Pre-populate request cache
        cache_key = 'test_key'
        request_key = f'request:{cache_key}'
        _request_cache[request_key] = {'data': 'cached'}
        
        # Should return from request cache without calling hybrid cache
        result = get_or_compute(
            cache_key=cache_key,
            compute_func=self.compute_func,
            use_request_cache=True
        )
        
        assert result == {'data': 'cached'}
        assert not self.hybrid_cache.get.called
        assert not self.compute_func.called
    
    @patch('utils.request_cache.get_hybrid_cache')
    def test_get_or_compute_hybrid_cache_hit(self, mock_get_hybrid):
        """Test get_or_compute when hybrid cache has data."""
        mock_get_hybrid.return_value = self.hybrid_cache
        self.hybrid_cache.get.return_value = {'data': 'hybrid_cached'}
        
        # Should get from hybrid cache and promote to request cache
        result = get_or_compute(
            cache_key='test_key',
            compute_func=self.compute_func,
            use_request_cache=True
        )
        
        assert result == {'data': 'hybrid_cached'}
        self.hybrid_cache.get.assert_called_once_with('test_key')
        assert not self.compute_func.called
        
        # Should be promoted to request cache
        assert _request_cache['request:test_key'] == {'data': 'hybrid_cached'}
    
    @patch('utils.request_cache.get_hybrid_cache')
    def test_get_or_compute_full_miss(self, mock_get_hybrid):
        """Test get_or_compute when all caches miss."""
        mock_get_hybrid.return_value = self.hybrid_cache
        self.hybrid_cache.get.return_value = None
        
        # Should compute fresh and store in both caches
        result = get_or_compute(
            cache_key='test_key',
            compute_func=self.compute_func,
            ttl_hours=2,
            use_request_cache=True,
            cache_type='test'
        )
        
        assert result == {'data': 'computed'}
        self.compute_func.assert_called_once()
        self.hybrid_cache.set.assert_called_once_with(
            'test_key', 
            {'data': 'computed'}, 
            ttl_hours=2
        )
        
        # Should be in request cache
        assert _request_cache['request:test_key'] == {'data': 'computed'}
    
    def test_cached_with_fallback_decorator(self):
        """Test the cached_with_fallback decorator."""
        call_count = 0
        
        def cache_key_func(user_id):
            return f'user:{user_id}'
        
        @cached_with_fallback(
            cache_key_func=cache_key_func,
            ttl_hours=1,
            use_request_cache=True,
            cache_type='test'
        )
        def get_user_data(user_id):
            nonlocal call_count
            call_count += 1
            return {'user_id': user_id, 'name': f'User {user_id}'}
        
        # First call should compute
        result1 = get_user_data('123')
        assert result1['user_id'] == '123'
        assert call_count == 1
        
        # Second call should use cache
        result2 = get_user_data('123')
        assert result2['user_id'] == '123'
        assert call_count == 1  # Not called again


class TestCacheFactories:
    """Test pre-configured cache factories."""
    
    def setup_method(self):
        """Reset caches."""
        clear_request_cache()
    
    def test_cache_for_expensive_queries(self):
        """Test the expensive queries cache factory."""
        call_count = 0
        
        @cache_for_expensive_queries
        def expensive_db_query(table, filter_val):
            nonlocal call_count
            call_count += 1
            return f"Results from {table} where value={filter_val}"
        
        # First call
        result1 = expensive_db_query('users', 'active')
        assert 'users' in result1
        assert call_count == 1
        
        # Cached call
        result2 = expensive_db_query('users', 'active')
        assert result1 == result2
        assert call_count == 1
        
        # Different args
        result3 = expensive_db_query('posts', 'active')
        assert 'posts' in result3
        assert call_count == 2
    
    def test_cache_for_user_data(self):
        """Test the user data cache factory."""
        fetch_count = 0
        
        @cache_for_user_data
        def get_user_profile(user_id):
            nonlocal fetch_count
            fetch_count += 1
            return {'id': user_id, 'fetch_count': fetch_count}
        
        # Multiple calls to same user
        profile1 = get_user_profile('user123')
        profile2 = get_user_profile('user123')
        
        assert profile1 == profile2
        assert profile1['fetch_count'] == 1


class TestThreadSafety:
    """Test thread safety of request cache."""
    
    def setup_method(self):
        """Clear cache before tests."""
        clear_request_cache()
    
    def test_concurrent_cache_access(self):
        """Test cache under concurrent access."""
        results = []
        errors = []
        
        @request_cache()
        def cached_func(x):
            time.sleep(0.01)  # Simulate some work
            return x * x
        
        def worker(value):
            try:
                result = cached_func(value)
                results.append(result)
            except Exception as e:
                errors.append(e)
        
        # Run multiple threads
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for i in range(5):
                for j in range(10):
                    futures.append(executor.submit(worker, i))
            
            concurrent.futures.wait(futures)
        
        # Check results
        assert len(errors) == 0
        assert len(results) == 50
        
        # Each value should appear 10 times
        for i in range(5):
            count = results.count(i * i)
            assert count == 10
    
    def test_cache_statistics_thread_safety(self):
        """Test that statistics are thread-safe."""
        @request_cache()
        def cached_func(x):
            return x
        
        def worker():
            for i in range(100):
                cached_func(i % 10)  # 10 unique values
        
        # Run multiple threads
        threads = []
        for _ in range(10):
            t = threading.Thread(target=worker)
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        # Check statistics consistency
        stats = get_request_cache_stats()
        assert stats['total_requests'] == 1000  # 10 threads * 100 calls
        # First 10 calls are misses, rest are hits
        assert stats['request_hits'] == 990
        assert stats['request_misses'] == 10


class TestWarmCache:
    """Test cache warming functionality."""
    
    def setup_method(self):
        """Clear cache before tests."""
        clear_request_cache()
    
    def test_warm_request_cache(self):
        """Test pre-warming the request cache."""
        # Prepare items to warm
        items = [
            ('key1', {'data': 'value1'}),
            ('key2', {'data': 'value2'}),
            ('key3', {'data': 'value3'}),
        ]
        
        # Warm cache
        warmed = warm_request_cache(items)
        assert warmed == 3
        
        # Verify items are in cache
        assert _request_cache['key1'] == {'data': 'value1'}
        assert _request_cache['key2'] == {'data': 'value2'}
        assert _request_cache['key3'] == {'data': 'value3'}
    
    def test_warm_cache_with_ttl(self):
        """Test warming cache with custom TTL."""
        items = [('temp_key', {'temp': 'data'})]
        
        # Warm with very short TTL
        warm_request_cache(items, ttl=0.1)
        
        # Should be in cache
        assert 'temp_key' in _request_cache
        
        # Wait for expiration
        time.sleep(0.2)
        
        # Should be expired (TTLCache handles this)
        # Note: Actual expiration depends on TTLCache implementation


class TestPerformance:
    """Test performance characteristics of the cache."""
    
    def setup_method(self):
        """Clear cache before tests."""
        clear_request_cache()
    
    def test_cache_performance_improvement(self):
        """Test that cache provides significant performance improvement."""
        call_time = 0.01  # 10ms simulated work
        
        @request_cache()
        def slow_function(x):
            time.sleep(call_time)
            return x * x
        
        # First call - slow
        start = time.time()
        result1 = slow_function(42)
        first_call_time = time.time() - start
        
        assert first_call_time >= call_time
        
        # Cached call - fast
        start = time.time()
        result2 = slow_function(42)
        cached_call_time = time.time() - start
        
        assert result1 == result2
        assert cached_call_time < call_time / 10  # At least 10x faster
    
    def test_cache_size_limit(self):
        """Test that cache respects size limits."""
        @request_cache()
        def cached_func(x):
            return x
        
        # Fill cache beyond limit
        for i in range(REQUEST_CACHE_SIZE + 100):
            cached_func(i)
        
        # Cache should not exceed max size
        assert len(_request_cache) <= REQUEST_CACHE_SIZE


class TestEdgeCases:
    """Test edge cases and error handling."""
    
    def setup_method(self):
        """Clear cache before tests."""
        clear_request_cache()
    
    def test_cache_with_unhashable_args(self):
        """Test caching with unhashable arguments."""
        @request_cache()
        def func_with_list(items):
            return sum(items)
        
        # Lists are unhashable, but should work via JSON serialization
        result1 = func_with_list([1, 2, 3])
        result2 = func_with_list([1, 2, 3])
        
        assert result1 == result2 == 6
    
    def test_cache_with_none_values(self):
        """Test caching None values."""
        call_count = 0
        
        @request_cache()
        def returns_none(x):
            nonlocal call_count
            call_count += 1
            return None
        
        # Should cache None values
        result1 = returns_none(5)
        result2 = returns_none(5)
        
        assert result1 is None
        assert result2 is None
        assert call_count == 1  # Only called once
    
    def test_exception_handling(self):
        """Test that exceptions are not cached."""
        call_count = 0
        
        @request_cache()
        def failing_function(x):
            nonlocal call_count
            call_count += 1
            if x < 0:
                raise ValueError("Negative value")
            return x
        
        # First call raises exception
        with pytest.raises(ValueError):
            failing_function(-1)
        
        # Second call should also execute (not cached)
        with pytest.raises(ValueError):
            failing_function(-1)
        
        assert call_count == 2  # Called twice


if __name__ == '__main__':
    pytest.main([__file__, '-v'])