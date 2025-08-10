"""
Enhanced Performance Testing Suite

This test suite provides comprehensive performance validation for the AniManga
Recommender backend with focus on API response times, database efficiency, and scalability.

Phase 4.2: Performance Testing and Optimization
Tests backend performance metrics and identifies bottlenecks
"""

# ABOUTME: Real integration tests - NO MOCKS
# ABOUTME: Tests with actual database and service operations

import pytest
from sqlalchemy import text
from tests.test_utils import TestDataManager, generate_jwt_token, create_auth_headers


import pytest
import time
import asyncio
import threading
import psutil
import json
import sqlite3
# Real integration imports - no mocks
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import tempfile
import os
import gc

# Import Flask app and modules
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import app
from utils.monitoring import get_metrics_collector, record_cache_hit, record_cache_miss
from utils.cache_helpers import get_cache, get_user_stats_from_cache, set_user_stats_in_cache
from utils.contentAnalysis import analyze_content, should_auto_moderate
from utils.batchOperations import BatchOperationsManager

@pytest.mark.real_integration
@pytest.mark.requires_db
class TestPerformanceEnhanced:
    """Enhanced performance test suite for backend operations."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    
    @pytest.fixture
    def performance_metrics(self):
        """Initialize performance metrics collection."""
        return get_metrics_collector()
    
    @pytest.fixture
    def temp_database(self):
        """Create temporary database for performance testing."""
        db_fd, db_path = tempfile.mkstemp(suffix='.db')
        
        # Create test database with sample data
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create test tables
        cursor.execute('''
            CREATE TABLE test_items (
                id INTEGER PRIMARY KEY,
                title TEXT,
                synopsis TEXT,
                score REAL,
                created_at TIMESTAMP
            )
        ''')
        
        # Insert test data
        test_data = [
            (i, f'Test Item {i}', f'Synopsis for item {i}', 
             round(i * 0.5, 1), datetime.now())
            for i in range(1, 10001)  # 10k items
        ]
        
        cursor.executemany(
            'INSERT INTO test_items VALUES (?, ?, ?, ?, ?)',
            test_data
        )
        
        conn.commit()
        conn.close()
        
        yield db_path
        
        os.close(db_fd)
        os.unlink(db_path)

    def test_api_endpoint_response_times(self, client, performance_metrics):
        """Test API endpoint response times."""
        endpoints = [
            '/',
            '/api/items',
            '/api/items?limit=10',
            '/api/items?limit=50',
            '/api/distinct-values'
        ]
        
        performance_results = {}
        
        for endpoint in endpoints:
            start_time = time.time()
            response = client.get(endpoint)
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to ms
            performance_results[endpoint] = response_time
            
            # Assert response time thresholds
            if endpoint == '/':
                assert response_time < 50, f"Health check too slow: {response_time}ms"
            elif 'limit=10' in endpoint:
                assert response_time < 200, f"Small list too slow: {response_time}ms"
            elif 'limit=50' in endpoint:
                assert response_time < 500, f"Medium list too slow: {response_time}ms"
            else:
                assert response_time < 1000, f"Endpoint too slow: {response_time}ms"
            
            assert response.status_code in [200, 404], f"Unexpected status for {endpoint}"
        
        # Print performance summary
        print(f"\nAPI Performance Results:")
        for endpoint, time_ms in performance_results.items():
            print(f"  {endpoint}: {time_ms:.2f}ms")

    def test_database_query_performance(self, temp_database):
        """Test database query performance."""
        conn = sqlite3.connect(temp_database)
        cursor = conn.cursor()
        
        # Test different query patterns
        query_tests = [
            ("SELECT * FROM test_items LIMIT 10", 50),
            ("SELECT * FROM test_items LIMIT 100", 200),
            ("SELECT * FROM test_items WHERE score > 5.0", 300),
            ("SELECT * FROM test_items WHERE title LIKE '%Item 1%'", 500),
            ("SELECT COUNT(*) FROM test_items", 100),
            ("SELECT AVG(score) FROM test_items", 200)
        ]
        
        for query, max_time_ms in query_tests:
            start_time = time.time()
            cursor.execute(query)
            results = cursor.fetchall()
            end_time = time.time()
            
            query_time = (end_time - start_time) * 1000
            
            assert query_time < max_time_ms, f"Query too slow: {query} took {query_time}ms"
            assert len(results) > 0 or "COUNT" in query or "AVG" in query
        
        conn.close()

    def test_concurrent_request_handling(self, client):
        """Test concurrent request handling performance."""
        def make_request():
            start_time = time.time()
            response = client.get('/api/items?limit=10')
            end_time = time.time()
            return {
                'status_code': response.status_code,
                'response_time': (end_time - start_time) * 1000,
                'thread_id': threading.current_thread().ident
            }
        
        # Test with different concurrency levels
        concurrency_levels = [1, 5, 10, 20]
        
        for concurrency in concurrency_levels:
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=concurrency) as executor:
                futures = [executor.submit(make_request) for _ in range(concurrency)]
                results = [future.result() for future in futures]
            
            end_time = time.time()
            total_time = (end_time - start_time) * 1000
            
            # Analyze results
            avg_response_time = sum(r['response_time'] for r in results) / len(results)
            max_response_time = max(r['response_time'] for r in results)
            successful_requests = sum(1 for r in results if r['status_code'] == 200)
            
            print(f"\nConcurrency {concurrency}:")
            print(f"  Total time: {total_time:.2f}ms")
            print(f"  Avg response time: {avg_response_time:.2f}ms")
            print(f"  Max response time: {max_response_time:.2f}ms")
            print(f"  Success rate: {successful_requests}/{concurrency}")
            
            # Performance assertions
            assert successful_requests >= concurrency * 0.9, "Too many failed requests"
            assert avg_response_time < 1000, f"Average response time too high: {avg_response_time}ms"
            assert max_response_time < 2000, f"Max response time too high: {max_response_time}ms"

    def test_memory_usage_optimization(self):
        """Test memory usage optimization."""
        # Test memory usage with large data structures
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # Create large data structure
        large_data = []
        for i in range(100000):
            large_data.append({
                'id': i,
                'title': f'Item {i}',
                'description': f'Description for item {i}' * 10,
                'metadata': {
                    'score': i * 0.001,
                    'tags': [f'tag_{j}' for j in range(10)]
                }
            })
        
        peak_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # Process the data
        processed_data = []
        for item in large_data:
            processed_data.append({
                'id': item['id'],
                'title': item['title'],
                'score': item['metadata']['score']
            })
        
        # Clear original data
        large_data.clear()
        del large_data
        gc.collect()
        
        final_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        print(f"\nMemory Usage:")
        print(f"  Initial: {initial_memory:.2f}MB")
        print(f"  Peak: {peak_memory:.2f}MB")
        print(f"  Final: {final_memory:.2f}MB")
        print(f"  Memory increase: {peak_memory - initial_memory:.2f}MB")
        print(f"  Memory freed: {peak_memory - final_memory:.2f}MB")
        
        # Assertions
        assert peak_memory - initial_memory < 500, "Memory usage too high"
        assert peak_memory - final_memory > 0, "Memory not properly freed"
        assert len(processed_data) == 100000, "Data processing failed"

    def test_cache_performance(self):
        """Test cache performance optimization."""
        cache = get_cache()
        
        # Test cache write performance
        cache_data = {
            'user_id': 'test_user',
            'stats': {
                'total_anime': 100,
                'total_manga': 50,
                'avg_score': 7.5,
                'genres': ['Action', 'Comedy', 'Drama']
            }
        }
        
        # Write performance test
        write_times = []
        for i in range(100):
            start_time = time.time()
            set_user_stats_in_cache(f'user_{i}', cache_data)
            end_time = time.time()
            write_times.append((end_time - start_time) * 1000)
        
        avg_write_time = sum(write_times) / len(write_times)
        
        # Read performance test
        read_times = []
        for i in range(100):
            start_time = time.time()
            result = get_user_stats_from_cache(f'user_{i}')
            end_time = time.time()
            read_times.append((end_time - start_time) * 1000)
        
        avg_read_time = sum(read_times) / len(read_times)
        
        print(f"\nCache Performance:")
        print(f"  Average write time: {avg_write_time:.2f}ms")
        print(f"  Average read time: {avg_read_time:.2f}ms")
        
        # Assertions
        assert avg_write_time < 10, f"Cache write too slow: {avg_write_time}ms"
        assert avg_read_time < 5, f"Cache read too slow: {avg_read_time}ms"

    def test_content_analysis_performance(self):
        """Test content analysis performance."""
        # Test content samples
        test_contents = [
            "This is a normal comment about anime.",
            "I really love this manga series!",
            "The animation quality is amazing.",
            "Great character development in this show.",
            "Highly recommend this to anyone.",
            "The story is very engaging and well-written."
        ]
        
        # Single analysis performance
        single_times = []
        for content in test_contents:
            start_time = time.time()
            result = analyze_content(content)
            end_time = time.time()
            single_times.append((end_time - start_time) * 1000)
        
        avg_single_time = sum(single_times) / len(single_times)
        
        # Batch analysis performance
        start_time = time.time()
        batch_results = [analyze_content(content) for content in test_contents]
        end_time = time.time()
        batch_time = (end_time - start_time) * 1000
        
        print(f"\nContent Analysis Performance:")
        print(f"  Average single analysis: {avg_single_time:.2f}ms")
        print(f"  Batch analysis total: {batch_time:.2f}ms")
        print(f"  Batch per item: {batch_time/len(test_contents):.2f}ms")
        
        # Assertions
        assert avg_single_time < 100, f"Single analysis too slow: {avg_single_time}ms"
        assert batch_time < 500, f"Batch analysis too slow: {batch_time}ms"
        assert len(batch_results) == len(test_contents)

    def test_batch_operations_performance(self):
        """Test batch operations performance."""
        manager = BatchOperationsManager()
        
        # Test batch user item updates
        batch_updates = []
        for i in range(1000):
            batch_updates.append({
                'user_id': f'user_{i % 100}',  # 100 users
                'item_uid': f'item_{i}',
                'status': 'completed',
                'rating': (i % 10) + 1,
                'progress': 100
            })
        
        start_time = time.time()
        # Perform real batch operation
        result = manager.bulk_update_user_items(batch_updates)
        end_time = time.time()
        
        batch_time = (end_time - start_time) * 1000
        
        print(f"\nBatch Operations Performance:")
        print(f"  Batch update time: {batch_time:.2f}ms")
        print(f"  Items per second: {len(batch_updates) / (batch_time/1000):.0f}")
        
        # Assertions
        assert batch_time < 5000, f"Batch operation too slow: {batch_time}ms"
        assert result['success'] is True

    def test_pagination_performance(self, client):
        """Test pagination performance."""
        page_sizes = [10, 25, 50, 100]
        
        for page_size in page_sizes:
            # Test first page
            start_time = time.time()
            response = client.get(f'/api/items?limit={page_size}&offset=0')
            end_time = time.time()
            
            first_page_time = (end_time - start_time) * 1000
            
            # Test middle page
            start_time = time.time()
            response = client.get(f'/api/items?limit={page_size}&offset={page_size * 10}')
            end_time = time.time()
            
            middle_page_time = (end_time - start_time) * 1000
            
            print(f"\nPagination Performance (limit={page_size}):")
            print(f"  First page: {first_page_time:.2f}ms")
            print(f"  Middle page: {middle_page_time:.2f}ms")
            
            # Assertions
            assert first_page_time < 500, f"First page too slow: {first_page_time}ms"
            assert middle_page_time < 1000, f"Middle page too slow: {middle_page_time}ms"
            assert response.status_code in [200, 404]

    def test_filtering_performance(self, client):
        """Test filtering performance."""
        filter_tests = [
            ('/api/items?media_type=anime', 'media_type filter'),
            ('/api/items?genre=Action', 'genre filter'),
            ('/api/items?score_min=8.0', 'score filter'),
            ('/api/items?media_type=anime&genre=Action', 'combined filters'),
            ('/api/items?search=attack', 'search filter')
        ]
        
        for endpoint, description in filter_tests:
            start_time = time.time()
            response = client.get(endpoint)
            end_time = time.time()
            
            filter_time = (end_time - start_time) * 1000
            
            print(f"\nFilter Performance ({description}):")
            print(f"  Response time: {filter_time:.2f}ms")
            print(f"  Status code: {response.status_code}")
            
            # Assertions
            assert filter_time < 1000, f"Filter too slow: {filter_time}ms"
            assert response.status_code in [200, 404]

    def test_recommendation_performance(self, client):
        """Test recommendation engine performance."""
        # Test recommendations for different items
        test_items = ['anime_1', 'manga_1', 'anime_2', 'manga_2']
        
        for item_uid in test_items:
            start_time = time.time()
            response = client.get(f'/api/recommendations/{item_uid}')
            end_time = time.time()
            
            recommendation_time = (end_time - start_time) * 1000
            
            print(f"\nRecommendation Performance ({item_uid}):")
            print(f"  Response time: {recommendation_time:.2f}ms")
            print(f"  Status code: {response.status_code}")
            
            # Assertions
            assert recommendation_time < 2000, f"Recommendation too slow: {recommendation_time}ms"
            assert response.status_code in [200, 404]

    def test_stress_testing(self, client):
        """Test system under stress conditions."""
        # Stress test with rapid requests
        num_requests = 100
        max_concurrent = 10
        
        def make_stress_request():
            try:
                response = client.get('/api/items?limit=10')
                return {
                    'status_code': response.status_code,
                    'success': response.status_code == 200,
                    'response_time': time.time()
                }
            except Exception as e:
                return {
                    'status_code': 500,
                    'success': False,
                    'error': str(e),
                    'response_time': time.time()
                }
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=max_concurrent) as executor:
            futures = [executor.submit(make_stress_request) for _ in range(num_requests)]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Analyze stress test results
        successful_requests = sum(1 for r in results if r['success'])
        success_rate = successful_requests / num_requests
        requests_per_second = num_requests / total_time
        
        print(f"\nStress Test Results:")
        print(f"  Total requests: {num_requests}")
        print(f"  Successful requests: {successful_requests}")
        print(f"  Success rate: {success_rate:.2%}")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Requests per second: {requests_per_second:.2f}")
        
        # Assertions
        assert success_rate >= 0.95, f"Success rate too low: {success_rate:.2%}"
        assert requests_per_second >= 10, f"Throughput too low: {requests_per_second:.2f} req/s"

    def test_error_handling_performance(self, client):
        """Test error handling performance."""
        error_endpoints = [
            '/api/nonexistent',
            '/api/items/invalid_id',
            '/api/recommendations/invalid_item',
            '/api/items?invalid_param=value'
        ]
        
        for endpoint in error_endpoints:
            start_time = time.time()
            response = client.get(endpoint)
            end_time = time.time()
            
            error_handling_time = (end_time - start_time) * 1000
            
            print(f"\nError Handling Performance ({endpoint}):")
            print(f"  Response time: {error_handling_time:.2f}ms")
            print(f"  Status code: {response.status_code}")
            
            # Assertions
            assert error_handling_time < 200, f"Error handling too slow: {error_handling_time}ms"
            assert response.status_code in [400, 404, 500]

    def test_monitoring_overhead(self, performance_metrics):
        """Test monitoring system overhead."""
        # Test monitoring overhead
        def operation_without_monitoring():
            time.sleep(0.01)  # Simulate work
            return "result"
        
        def operation_with_monitoring():
            start_time = time.time()
            result = operation_without_monitoring()
            end_time = time.time()
            
            # Record metrics
            performance_metrics.record_timer('test_operation', (end_time - start_time) * 1000)
            performance_metrics.increment_counter('test_operations')
            
            return result
        
        # Measure without monitoring
        start_time = time.time()
        for _ in range(100):
            operation_without_monitoring()
        end_time = time.time()
        without_monitoring_time = (end_time - start_time) * 1000
        
        # Measure with monitoring
        start_time = time.time()
        for _ in range(100):
            operation_with_monitoring()
        end_time = time.time()
        with_monitoring_time = (end_time - start_time) * 1000
        
        overhead = with_monitoring_time - without_monitoring_time
        overhead_percentage = (overhead / without_monitoring_time) * 100
        
        print(f"\nMonitoring Overhead:")
        print(f"  Without monitoring: {without_monitoring_time:.2f}ms")
        print(f"  With monitoring: {with_monitoring_time:.2f}ms")
        print(f"  Overhead: {overhead:.2f}ms ({overhead_percentage:.1f}%)")
        
        # Assertions
        assert overhead_percentage < 10, f"Monitoring overhead too high: {overhead_percentage:.1f}%"
        assert overhead < 100, f"Absolute overhead too high: {overhead:.2f}ms"

    def test_gc_performance(self):
        """Test garbage collection performance."""
        # Force garbage collection and measure
        gc.collect()
        
        # Create objects that will need GC
        test_objects = []
        for i in range(10000):
            test_objects.append({
                'id': i,
                'data': [j for j in range(100)],
                'nested': {'key': f'value_{i}'}
            })
        
        # Measure GC performance
        start_time = time.time()
        gc.collect()
        end_time = time.time()
        
        gc_time = (end_time - start_time) * 1000
        
        print(f"\nGarbage Collection Performance:")
        print(f"  GC time: {gc_time:.2f}ms")
        print(f"  Objects created: {len(test_objects)}")
        
        # Clean up
        test_objects.clear()
        gc.collect()
        
        # Assertions
        assert gc_time < 1000, f"GC too slow: {gc_time}ms"

    def test_cpu_intensive_operations(self):
        """Test CPU-intensive operations performance."""
        # Test CPU-intensive content analysis
        large_content = "This is a very long piece of content. " * 1000
        
        start_time = time.time()
        result = analyze_content(large_content)
        end_time = time.time()
        
        analysis_time = (end_time - start_time) * 1000
        
        print(f"\nCPU-Intensive Operations:")
        print(f"  Content analysis time: {analysis_time:.2f}ms")
        print(f"  Content length: {len(large_content)} characters")
        
        # Assertions
        assert analysis_time < 5000, f"Content analysis too slow: {analysis_time}ms"
        assert result is not None

    def test_io_performance(self):
        """Test I/O operations performance."""
        # Test file I/O performance
        test_data = {'test': 'data'} * 1000
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
            temp_file = f.name
            
            # Write performance
            start_time = time.time()
            json.dump(test_data, f)
            end_time = time.time()
            
            write_time = (end_time - start_time) * 1000
        
        # Read performance
        start_time = time.time()
        with open(temp_file, 'r') as f:
            loaded_data = json.load(f)
        end_time = time.time()
        
        read_time = (end_time - start_time) * 1000
        
        print(f"\nI/O Performance:")
        print(f"  Write time: {write_time:.2f}ms")
        print(f"  Read time: {read_time:.2f}ms")
        print(f"  Data size: {len(str(test_data))} characters")
        
        # Clean up
        os.unlink(temp_file)
        
        # Assertions
        assert write_time < 500, f"File write too slow: {write_time}ms"
        assert read_time < 200, f"File read too slow: {read_time}ms"
        assert loaded_data == test_data

if __name__ == "__main__":
    pytest.main([__file__, "-v"])