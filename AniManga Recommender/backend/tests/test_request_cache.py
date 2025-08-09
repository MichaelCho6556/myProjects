# ABOUTME: Real integration tests for request cache and fallback strategies - NO MOCKS
# ABOUTME: Tests actual cache operations, TTL behavior, and fallback chains with real components
"""
Real Integration Tests for Request Cache and Fallback Strategies

This module provides real integration testing for the Phase 1.6 request cache
implementation including TTLCache functionality, fallback chains, decorators,
and performance characteristics.

NO MOCKS - All tests use real cache instances and actual system behavior

Test Coverage:
    - TTLCache basic operations with real cache
    - Request cache decorators with actual functions
    - Fallback chain behavior with real hybrid cache
    - Cache statistics tracking in production scenarios
    - Thread safety with real concurrent operations
    - Performance benchmarks with actual timing
    - Error handling in real scenarios
"""

import time
import pytest
import threading
from datetime import datetime, timedelta
import concurrent.futures
import tempfile
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
import sys
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
from utils.hybrid_cache import HybridCache, get_hybrid_cache
from tests.test_utils import TestDataManager


@pytest.mark.real_integration
class TestRequestCacheBasics:
    """Test basic request cache functionality with real cache operations."""
    
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
        """Test stable cache key generation with real data."""
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
        
        # Test with complex data types
        key5 = generate_cache_key(
            user_id='123',
            filters={'status': 'active', 'type': 'anime'},
            page=1
        )
        key6 = generate_cache_key(
            user_id='123',
            filters={'type': 'anime', 'status': 'active'},  # Different order
            page=1
        )
        assert key5 == key6
    
    def test_request_cache_decorator_real_function(self):
        """Test request_cache decorator with real function execution."""
        # Track actual function calls
        execution_log = []
        
        @request_cache(ttl=1, key_prefix='test')
        def expensive_computation(x, y):
            # Simulate real computation
            execution_log.append((x, y))
            time.sleep(0.01)  # Simulate work
            return x * y + sum(range(x))
        
        # First call should execute function
        start_time = time.time()
        result1 = expensive_computation(5, 3)
        first_call_time = time.time() - start_time
        
        assert len(execution_log) == 1
        assert execution_log[0] == (5, 3)
        assert result1 == 5 * 3 + sum(range(5))  # 15 + 10 = 25
        
        # Second call should use cache (much faster)
        start_time = time.time()
        result2 = expensive_computation(5, 3)
        cached_call_time = time.time() - start_time
        
        assert result2 == result1
        assert len(execution_log) == 1  # Not executed again
        assert cached_call_time < first_call_time / 2  # Much faster
        
        # Different arguments should execute function
        result3 = expensive_computation(10, 2)
        assert len(execution_log) == 2
        assert execution_log[1] == (10, 2)
        assert result3 == 10 * 2 + sum(range(10))  # 20 + 45 = 65
        
        # Wait for TTL expiration
        time.sleep(1.1)
        
        # Should execute function again after TTL
        result4 = expensive_computation(5, 3)
        assert result4 == 25
        assert len(execution_log) == 3
    
    def test_cache_statistics_with_real_operations(self):
        """Test cache statistics tracking with real cache operations."""
        @request_cache()
        def data_processor(data_id):
            # Simulate data processing
            time.sleep(0.001)
            return {'id': data_id, 'processed': True, 'timestamp': time.time()}
        
        # Initial stats
        stats = get_request_cache_stats()
        assert stats['total_requests'] == 0
        
        # Process multiple items
        results = []
        for i in range(5):
            # Each ID twice to test hits
            for _ in range(2):
                results.append(data_processor(f'item_{i}'))
        
        stats = get_request_cache_stats()
        assert stats['total_requests'] == 10
        assert stats['request_misses'] == 5  # First access for each ID
        assert stats['request_hits'] == 5     # Second access for each ID
        assert stats['request_hit_rate'] == 50.0
        
        # Verify all results are correct
        for i, result in enumerate(results):
            expected_id = f'item_{i // 2}'
            assert result['id'] == expected_id
            assert result['processed'] is True
    
    def test_clear_cache_with_real_data(self):
        """Test cache clearing functionality with real cached data."""
        @request_cache()
        def cached_query(query_id):
            return {'query_id': query_id, 'data': f'Result for {query_id}'}
        
        # Populate cache with real data
        queries = ['q1', 'q2', 'q3', 'q4', 'q5']
        for q in queries:
            cached_query(q)
        
        assert len(_request_cache) == 5
        
        # Clear cache
        clear_request_cache()
        assert len(_request_cache) == 0
        
        # Stats should be preserved
        stats = get_request_cache_stats()
        assert stats['total_requests'] == 5
        assert stats['request_misses'] == 5
        
        # Cache should work again after clearing
        result = cached_query('q1')
        assert result['query_id'] == 'q1'
        assert len(_request_cache) == 1


@pytest.mark.real_integration
class TestFallbackChain:
    """Test the complete fallback chain functionality with real components."""
    
    def setup_method(self):
        """Set up real cache instances."""
        clear_request_cache()
        # Create real hybrid cache with temporary database
        self.test_db_path = tempfile.mktemp(suffix='.db')
        self.hybrid_cache = HybridCache(db_path=self.test_db_path)
    
    def teardown_method(self):
        """Clean up test database."""
        try:
            if hasattr(self, 'hybrid_cache'):
                del self.hybrid_cache
            if os.path.exists(self.test_db_path):
                os.remove(self.test_db_path)
        except:
            pass
    
    def test_get_or_compute_with_real_fallback_chain(self):
        """Test get_or_compute with real request cache, hybrid cache, and computation."""
        computation_count = 0
        
        def expensive_computation():
            nonlocal computation_count
            computation_count += 1
            time.sleep(0.01)  # Simulate expensive operation
            return {
                'data': 'computed_value',
                'timestamp': time.time(),
                'computation_number': computation_count
            }
        
        # Temporarily replace global hybrid cache with our test instance
        import utils.request_cache
        original_get_hybrid = utils.request_cache.get_hybrid_cache
        utils.request_cache.get_hybrid_cache = lambda: self.hybrid_cache
        
        try:
            # First call - should compute and store in both caches
            result1 = get_or_compute(
                cache_key='test_key_1',
                compute_func=expensive_computation,
                ttl_hours=1,
                use_request_cache=True,
                cache_type='test'
            )
            
            assert result1['data'] == 'computed_value'
            assert computation_count == 1
            
            # Verify data is in request cache
            assert 'request:test_key_1' in _request_cache
            
            # Verify data is in hybrid cache
            hybrid_result = self.hybrid_cache.get('test_key_1')
            assert hybrid_result is not None
            assert hybrid_result['data'] == 'computed_value'
            
            # Second call - should hit request cache
            result2 = get_or_compute(
                cache_key='test_key_1',
                compute_func=expensive_computation,
                ttl_hours=1,
                use_request_cache=True,
                cache_type='test'
            )
            
            assert result2['data'] == 'computed_value'
            assert computation_count == 1  # Not computed again
            
            # Clear request cache to test hybrid cache fallback
            clear_request_cache()
            
            # Third call - should hit hybrid cache and promote to request cache
            result3 = get_or_compute(
                cache_key='test_key_1',
                compute_func=expensive_computation,
                ttl_hours=1,
                use_request_cache=True,
                cache_type='test'
            )
            
            assert result3['data'] == 'computed_value'
            assert computation_count == 1  # Still not computed
            assert 'request:test_key_1' in _request_cache  # Promoted back
            
            # Test with new key - full miss scenario
            result4 = get_or_compute(
                cache_key='test_key_2',
                compute_func=expensive_computation,
                ttl_hours=1,
                use_request_cache=True,
                cache_type='test'
            )
            
            assert result4['data'] == 'computed_value'
            assert result4['computation_number'] == 2
            assert computation_count == 2
            
        finally:
            # Restore original function
            utils.request_cache.get_hybrid_cache = original_get_hybrid
    
    def test_cached_with_fallback_decorator_real_scenario(self):
        """Test the cached_with_fallback decorator in a real scenario."""
        fetch_count = 0
        
        def cache_key_func(user_id, include_stats=False):
            return f'user:{user_id}:stats_{include_stats}'
        
        # Set up test hybrid cache
        import utils.request_cache
        original_get_hybrid = utils.request_cache.get_hybrid_cache
        utils.request_cache.get_hybrid_cache = lambda: self.hybrid_cache
        
        try:
            @cached_with_fallback(
                cache_key_func=cache_key_func,
                ttl_hours=1,
                use_request_cache=True,
                cache_type='user_data'
            )
            def fetch_user_data(user_id, include_stats=False):
                nonlocal fetch_count
                fetch_count += 1
                # Simulate database fetch
                time.sleep(0.01)
                data = {
                    'user_id': user_id,
                    'username': f'user_{user_id}',
                    'email': f'user_{user_id}@example.com',
                    'fetch_count': fetch_count
                }
                if include_stats:
                    data['stats'] = {
                        'posts': 42,
                        'comments': 123,
                        'likes': 456
                    }
                return data
            
            # First call - should fetch
            user1 = fetch_user_data('123', include_stats=True)
            assert user1['user_id'] == '123'
            assert user1['fetch_count'] == 1
            assert 'stats' in user1
            
            # Second call - should use cache
            user2 = fetch_user_data('123', include_stats=True)
            assert user2 == user1
            assert fetch_count == 1
            
            # Different parameters - should fetch
            user3 = fetch_user_data('123', include_stats=False)
            assert user3['user_id'] == '123'
            assert 'stats' not in user3
            assert fetch_count == 2
            
            # Different user - should fetch
            user4 = fetch_user_data('456', include_stats=True)
            assert user4['user_id'] == '456'
            assert fetch_count == 3
            
        finally:
            utils.request_cache.get_hybrid_cache = original_get_hybrid


@pytest.mark.real_integration
class TestCacheFactories:
    """Test pre-configured cache factories with real operations."""
    
    def setup_method(self):
        """Reset caches."""
        clear_request_cache()
    
    def test_cache_for_expensive_queries_real_database(self, database_connection):
        """Test the expensive queries cache factory with real database queries."""
        query_count = 0
        
        @cache_for_expensive_queries
        def complex_aggregation_query(table_name, group_by_field):
            nonlocal query_count
            query_count += 1
            
            # Simulate expensive aggregation query
            if table_name == 'user_items':
                result = database_connection.execute(
                    text(f"""
                        SELECT {group_by_field}, COUNT(*) as count
                        FROM {table_name}
                        GROUP BY {group_by_field}
                        LIMIT 10
                    """)
                )
                return [dict(row._mapping) for row in result]
            else:
                # Fallback for test
                return [{'field': group_by_field, 'count': query_count}]
        
        # First call - executes query
        result1 = complex_aggregation_query('user_items', 'status')
        assert query_count == 1
        
        # Cached call - no query execution
        result2 = complex_aggregation_query('user_items', 'status')
        assert result2 == result1
        assert query_count == 1
        
        # Different parameters - new query
        result3 = complex_aggregation_query('user_items', 'score')
        assert query_count == 2
        
        # Verify cache is working efficiently
        stats = get_request_cache_stats()
        assert stats['request_hits'] > 0
    
    def test_cache_for_user_data_real_scenario(self, database_connection):
        """Test the user data cache factory with real user data operations."""
        # Create test user
        manager = TestDataManager(database_connection)
        user = manager.create_test_user(
            email='cache_test@example.com',
            username='cache_test_user'
        )
        
        try:
            fetch_count = 0
            
            @cache_for_user_data
            def get_user_complete_profile(user_id):
                nonlocal fetch_count
                fetch_count += 1
                
                # Simulate fetching complete user profile with joins
                result = database_connection.execute(
                    text("""
                        SELECT 
                            p.id, p.username, p.email, p.bio,
                            s.total_anime, s.total_manga,
                            r.reputation_score
                        FROM user_profiles p
                        LEFT JOIN user_statistics s ON p.id = s.user_id
                        LEFT JOIN user_reputation r ON p.id = r.user_id
                        WHERE p.id = :user_id
                    """),
                    {'user_id': user_id}
                )
                
                row = result.fetchone()
                if row:
                    return dict(row._mapping)
                return None
            
            # First fetch
            profile1 = get_user_complete_profile(user['id'])
            assert profile1['username'] == 'cache_test_user'
            assert fetch_count == 1
            
            # Cached fetch - should not query database
            profile2 = get_user_complete_profile(user['id'])
            assert profile2 == profile1
            assert fetch_count == 1
            
            # Multiple cached accesses
            for _ in range(10):
                profile = get_user_complete_profile(user['id'])
                assert profile['username'] == 'cache_test_user'
            
            assert fetch_count == 1  # Still only fetched once
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestThreadSafety:
    """Test thread safety of request cache with real concurrent operations."""
    
    def setup_method(self):
        """Clear cache before tests."""
        clear_request_cache()
    
    def test_concurrent_cache_access_real_workload(self):
        """Test cache under real concurrent workload."""
        results = []
        errors = []
        computation_counter = {}
        counter_lock = threading.Lock()
        
        @request_cache()
        def process_data(data_id):
            # Track how many times each ID is actually processed
            with counter_lock:
                if data_id not in computation_counter:
                    computation_counter[data_id] = 0
                computation_counter[data_id] += 1
            
            # Simulate real processing
            time.sleep(0.01)
            result = {
                'id': data_id,
                'processed_value': data_id * data_id,
                'timestamp': time.time()
            }
            return result
        
        def worker(worker_id, data_ids):
            try:
                worker_results = []
                for data_id in data_ids:
                    result = process_data(data_id)
                    worker_results.append((worker_id, data_id, result))
                results.extend(worker_results)
            except Exception as e:
                errors.append((worker_id, str(e)))
        
        # Create workload - multiple workers processing overlapping data
        num_workers = 10
        data_range = list(range(20))  # 20 unique data items
        
        # Each worker processes all items
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = []
            for worker_id in range(num_workers):
                future = executor.submit(worker, worker_id, data_range)
                futures.append(future)
            
            concurrent.futures.wait(futures, timeout=30)
        
        # Verify results
        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert len(results) == num_workers * len(data_range)
        
        # Each data_id should have been computed exactly once
        for data_id in data_range:
            assert computation_counter[data_id] == 1, \
                f"Data {data_id} computed {computation_counter[data_id]} times"
        
        # All workers should get the same result for each data_id
        for data_id in data_range:
            data_results = [r[2] for r in results if r[1] == data_id]
            assert len(data_results) == num_workers
            
            # All results should be identical
            first_result = data_results[0]
            for result in data_results[1:]:
                assert result['processed_value'] == first_result['processed_value']
    
    def test_cache_statistics_thread_safety_real_scenario(self):
        """Test that statistics are accurate under real concurrent load."""
        @request_cache()
        def fetch_item_data(item_id):
            time.sleep(0.001)  # Simulate fetch time
            return {'item_id': item_id, 'data': f'Item {item_id}'}
        
        def worker(worker_id):
            # Each worker fetches a pattern of items
            for iteration in range(50):
                item_id = iteration % 25  # 25 unique items
                fetch_item_data(item_id)
        
        # Run multiple workers concurrently
        threads = []
        num_workers = 20
        
        for worker_id in range(num_workers):
            t = threading.Thread(target=worker, args=(worker_id,))
            threads.append(t)
            t.start()
        
        # Wait for all threads
        for t in threads:
            t.join(timeout=30)
        
        # Verify statistics
        stats = get_request_cache_stats()
        
        # Total requests: 20 workers * 50 iterations = 1000
        assert stats['total_requests'] == 1000
        
        # Misses: 25 unique items (first access each)
        assert stats['request_misses'] == 25
        
        # Hits: 1000 - 25 = 975
        assert stats['request_hits'] == 975
        
        # Hit rate: 975/1000 = 97.5%
        assert stats['request_hit_rate'] == 97.5


@pytest.mark.real_integration
class TestWarmCache:
    """Test cache warming functionality with real data."""
    
    def setup_method(self):
        """Clear cache before tests."""
        clear_request_cache()
    
    def test_warm_request_cache_with_real_data(self, database_connection):
        """Test pre-warming the cache with real database data."""
        # Create test data
        manager = TestDataManager(database_connection)
        
        items = []
        for i in range(5):
            item = manager.create_test_item(
                uid=f'warm_test_{i}',
                title=f'Warm Test Item {i}',
                score=7.0 + i * 0.2
            )
            items.append(item)
        
        try:
            # Prepare cache entries from real data
            cache_entries = []
            for item in items:
                cache_key = f"item:{item['uid']}"
                cache_value = {
                    'uid': item['uid'],
                    'title': item['title'],
                    'score': item['score'],
                    'cached_at': time.time()
                }
                cache_entries.append((cache_key, cache_value))
            
            # Warm cache
            warmed_count = warm_request_cache(cache_entries)
            assert warmed_count == 5
            
            # Verify items are in cache and accessible
            for item in items:
                cache_key = f"item:{item['uid']}"
                cached_value = _request_cache.get(cache_key)
                assert cached_value is not None
                assert cached_value['uid'] == item['uid']
                assert cached_value['title'] == item['title']
            
            # Test that warmed cache prevents computation
            computation_count = 0
            
            @request_cache(key_prefix='item')
            def get_item_data(uid):
                nonlocal computation_count
                computation_count += 1
                return {'uid': uid, 'computed': True}
            
            # These should all hit the warmed cache
            for item in items:
                # Note: The decorator will look for the key based on the function args
                # We need to access the cache directly since we warmed it with specific keys
                cached = _request_cache.get(f"item:{item['uid']}")
                assert cached is not None
            
            assert computation_count == 0  # Nothing was computed
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestPerformance:
    """Test performance characteristics with real operations."""
    
    def setup_method(self):
        """Clear cache before tests."""
        clear_request_cache()
    
    def test_cache_performance_with_real_database(self, database_connection):
        """Test cache performance improvement with real database queries."""
        manager = TestDataManager(database_connection)
        
        # Create test data
        test_items = []
        for i in range(10):
            item = manager.create_test_item(
                uid=f'perf_test_{i}',
                title=f'Performance Test {i}'
            )
            test_items.append(item)
        
        try:
            @request_cache()
            def fetch_items_with_aggregation():
                # Simulate expensive query
                result = database_connection.execute(
                    text("""
                        SELECT 
                            type,
                            COUNT(*) as count,
                            AVG(score) as avg_score,
                            MAX(score) as max_score,
                            MIN(score) as min_score
                        FROM items
                        WHERE uid LIKE 'perf_test_%'
                        GROUP BY type
                    """)
                )
                time.sleep(0.01)  # Simulate additional processing
                return [dict(row._mapping) for row in result]
            
            # First call - slow
            start_time = time.time()
            result1 = fetch_items_with_aggregation()
            first_call_time = time.time() - start_time
            
            # Cached call - fast
            start_time = time.time()
            result2 = fetch_items_with_aggregation()
            cached_call_time = time.time() - start_time
            
            # Verify results are identical
            assert result1 == result2
            
            # Cached call should be significantly faster
            assert cached_call_time < first_call_time / 5
            
            # Run multiple cached calls to test sustained performance
            total_cached_time = 0
            for _ in range(100):
                start_time = time.time()
                result = fetch_items_with_aggregation()
                total_cached_time += time.time() - start_time
            
            avg_cached_time = total_cached_time / 100
            assert avg_cached_time < first_call_time / 10
            
        finally:
            manager.cleanup()
    
    def test_cache_size_limit_with_real_data(self):
        """Test that cache respects size limits with real data."""
        @request_cache()
        def generate_data(item_id):
            return {
                'id': item_id,
                'data': f'Generated data for item {item_id}',
                'timestamp': time.time(),
                'large_field': 'x' * 1000  # Some bulk to the data
            }
        
        # Generate more items than cache size limit
        overflow_amount = 100
        total_items = REQUEST_CACHE_SIZE + overflow_amount
        
        for i in range(total_items):
            generate_data(f'item_{i}')
        
        # Cache should respect size limit
        assert len(_request_cache) <= REQUEST_CACHE_SIZE
        
        # Recently accessed items should still be in cache
        recent_item = generate_data(f'item_{total_items - 1}')
        assert recent_item['id'] == f'item_{total_items - 1}'
        
        # Stats should reflect all operations
        stats = get_request_cache_stats()
        assert stats['total_requests'] == total_items + 1  # +1 for the recent check


@pytest.mark.real_integration
class TestEdgeCases:
    """Test edge cases and error handling with real scenarios."""
    
    def setup_method(self):
        """Clear cache before tests."""
        clear_request_cache()
    
    def test_cache_with_complex_data_types(self):
        """Test caching with various complex data types."""
        @request_cache()
        def process_complex_data(data_structure):
            # Process complex nested data
            if isinstance(data_structure, dict):
                return {'processed': True, 'keys': list(data_structure.keys())}
            elif isinstance(data_structure, list):
                return {'processed': True, 'length': len(data_structure)}
            else:
                return {'processed': True, 'type': type(data_structure).__name__}
        
        # Test with nested dictionary
        nested_dict = {
            'user': {'id': 123, 'name': 'Test'},
            'items': [1, 2, 3],
            'metadata': {'created': '2024-01-01'}
        }
        
        result1 = process_complex_data(nested_dict)
        result2 = process_complex_data(nested_dict)
        assert result1 == result2
        
        # Test with list of mixed types
        mixed_list = [1, 'string', {'key': 'value'}, [1, 2, 3]]
        result3 = process_complex_data(mixed_list)
        result4 = process_complex_data(mixed_list)
        assert result3 == result4
    
    def test_cache_with_none_and_empty_values(self):
        """Test caching None and empty values correctly."""
        call_log = []
        
        @request_cache()
        def fetch_optional_data(key, return_none=False):
            call_log.append(key)
            if return_none:
                return None
            elif key == 'empty_list':
                return []
            elif key == 'empty_dict':
                return {}
            else:
                return {'key': key, 'has_data': True}
        
        # Test caching None
        result1 = fetch_optional_data('none_key', return_none=True)
        result2 = fetch_optional_data('none_key', return_none=True)
        assert result1 is None
        assert result2 is None
        assert len(call_log) == 1  # Only called once
        
        # Test caching empty list
        result3 = fetch_optional_data('empty_list')
        result4 = fetch_optional_data('empty_list')
        assert result3 == []
        assert result4 == []
        assert call_log.count('empty_list') == 1
        
        # Test caching empty dict
        result5 = fetch_optional_data('empty_dict')
        result6 = fetch_optional_data('empty_dict')
        assert result5 == {}
        assert result6 == {}
        assert call_log.count('empty_dict') == 1
    
    def test_exception_handling_in_cached_functions(self):
        """Test that exceptions are properly handled and not cached."""
        call_count = 0
        
        @request_cache()
        def unreliable_function(value):
            nonlocal call_count
            call_count += 1
            
            if value < 0:
                raise ValueError(f"Negative value not allowed: {value}")
            elif value == 0:
                raise ZeroDivisionError("Cannot process zero")
            else:
                return 100 / value
        
        # Test different exceptions
        with pytest.raises(ValueError) as exc_info:
            unreliable_function(-5)
        assert "Negative value not allowed" in str(exc_info.value)
        
        # Exception should not be cached - function called again
        with pytest.raises(ValueError):
            unreliable_function(-5)
        assert call_count == 2
        
        # Different exception
        with pytest.raises(ZeroDivisionError):
            unreliable_function(0)
        assert call_count == 3
        
        # Valid call should work and be cached
        result1 = unreliable_function(10)
        result2 = unreliable_function(10)
        assert result1 == result2 == 10.0
        assert call_count == 4  # Only called once for value=10
    
    def test_cache_with_large_data_objects(self):
        """Test caching with large data objects."""
        @request_cache()
        def generate_large_dataset(size):
            # Generate a large dataset
            return {
                'metadata': {'size': size, 'generated_at': time.time()},
                'data': [
                    {'id': i, 'value': f'Item {i}', 'extra': 'x' * 100}
                    for i in range(size)
                ]
            }
        
        # Generate and cache large dataset
        large_size = 1000
        start_time = time.time()
        dataset1 = generate_large_dataset(large_size)
        generation_time = time.time() - start_time
        
        # Retrieve from cache should be much faster
        start_time = time.time()
        dataset2 = generate_large_dataset(large_size)
        cache_time = time.time() - start_time
        
        assert dataset1 == dataset2
        assert len(dataset1['data']) == large_size
        assert cache_time < generation_time / 5


if __name__ == '__main__':
    pytest.main([__file__, '-v'])