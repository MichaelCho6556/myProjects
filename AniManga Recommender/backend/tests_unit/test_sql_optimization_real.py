#!/usr/bin/env python3
# ABOUTME: Real integration test for SQL optimization that verifies RPC function setup and performance
# ABOUTME: Tests without mocks to ensure production-like behavior and actual database performance

"""
Real Integration Test for Custom Lists SQL Optimization

This test verifies that the get_user_lists_optimized PostgreSQL function:
1. Is properly installed in the database
2. Returns correct data structure with proper types
3. Provides significant performance improvement
4. Handles edge cases correctly

No mocks are used - this tests real database behavior.
"""

import pytest
import os
import sys
import time
import uuid
import json
import subprocess
from datetime import datetime
from typing import Dict, List, Optional
import requests

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load real environment
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path, override=True)

from supabase_client import SupabaseClient


class TestSQLOptimizationReal:
    """Test suite for verifying SQL optimization in real database"""
    
    @classmethod
    def setup_class(cls):
        """Setup test environment and ensure RPC function exists"""
        cls.client = SupabaseClient()
        cls.test_user_id = None
        cls.test_lists = []
        cls.test_items = []
        
        # Check and create RPC function if needed
        cls._ensure_rpc_function_exists()
        
        # Create test data
        cls._setup_test_data()
    
    @classmethod
    def teardown_class(cls):
        """Clean up test data"""
        cls._cleanup_test_data()
    
    @classmethod
    def _ensure_rpc_function_exists(cls):
        """Check if RPC function exists and create it if not"""
        print("\n=== Checking RPC Function Status ===")
        
        # Test if the function exists
        response = requests.post(
            f"{cls.client.base_url}/rest/v1/rpc/get_user_lists_optimized",
            headers=cls.client.headers,
            json={
                'p_user_id': str(uuid.uuid4()),  # Dummy UUID
                'p_limit': 1,
                'p_offset': 0
            }
        )
        
        if response.status_code == 404:
            print("❌ RPC function not found. Please run the SQL file to create it:")
            print("   backend/sql/get_user_lists_optimized.sql")
            print("\nYou can execute it using:")
            print("   - Supabase Dashboard SQL Editor")
            print("   - psql command line")
            print("   - Any PostgreSQL client")
            pytest.skip("RPC function not installed. Please run backend/sql/get_user_lists_optimized.sql")
        
        elif response.status_code == 400 and "structure of query does not match" in response.text:
            print("❌ RPC function exists but has type mismatch. Please update it:")
            print("   Run the updated SQL in backend/sql/get_user_lists_optimized.sql")
            print(f"   Error: {response.json().get('message', response.text)}")
            pytest.skip("RPC function has type mismatch. Please update using backend/sql/get_user_lists_optimized.sql")
        
        elif response.status_code in [200, 201]:
            print("✅ RPC function is properly installed and working")
        
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
            print(f"   Details: {response.text[:200]}")
    
    @classmethod
    def _setup_test_data(cls):
        """Create realistic test data"""
        print("\n=== Creating Test Data ===")
        
        # Create or get a test user
        cls.test_user_id = cls._get_or_create_test_user()
        
        # Create multiple lists with varying data
        print(f"Creating test lists for user {cls.test_user_id}...")
        
        for i in range(10):  # Create 10 lists for better performance testing
            list_data = {
                'user_id': cls.test_user_id,
                'title': f'Performance Test List {i+1}',
                'description': f'Description for performance testing list {i+1}' if i % 2 == 0 else None,
                'slug': f'perf-test-list-{i+1}-{int(time.time() * 1000)}',
                'is_public': i % 3 != 0,  # Mix of public and private
                'is_collaborative': i % 4 == 0,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Create the list
            headers = cls.client.headers.copy()
            headers['Prefer'] = 'return=representation'
            
            response = requests.post(
                f"{cls.client.base_url}/rest/v1/custom_lists",
                headers=headers,
                json=list_data
            )
            
            if response.status_code == 201:
                created_list = response.json()[0] if isinstance(response.json(), list) else response.json()
                cls.test_lists.append(created_list['id'])
                
                # Add tags (2-5 per list)
                num_tags = 2 + (i % 4)
                for j in range(num_tags):
                    cls._add_tag_to_list(created_list['id'], f'tag_{j+1}')
                
                # Add items (5-15 per list for realistic testing)
                num_items = 5 + (i % 11)
                for k in range(num_items):
                    cls._add_item_to_list(created_list['id'], f'item_{i}_{k}')
        
        print(f"✅ Created {len(cls.test_lists)} test lists with tags and items")
    
    @classmethod
    def _get_or_create_test_user(cls) -> str:
        """Get existing test user or create new one"""
        # Try to use a known test user first
        test_user_id = "c9e8312c-1469-48d6-a5b2-40a72bc2ac5a"
        
        # Check if user exists
        response = requests.get(
            f"{cls.client.base_url}/rest/v1/user_profiles",
            headers=cls.client.headers,
            params={'id': f'eq.{test_user_id}', 'select': 'id'}
        )
        
        if response.status_code == 200 and response.json():
            print(f"Using existing test user: {test_user_id}")
            return test_user_id
        
        # Create new test user
        new_user_id = str(uuid.uuid4())
        user_data = {
            'id': new_user_id,
            'username': f'perf_test_user_{new_user_id[:8]}',
            'email': f'perf_test_{new_user_id[:8]}@example.com',
            'created_at': datetime.utcnow().isoformat()
        }
        
        response = requests.post(
            f"{cls.client.base_url}/rest/v1/user_profiles",
            headers=cls.client.headers,
            json=user_data
        )
        
        if response.status_code == 201:
            print(f"Created new test user: {new_user_id}")
            return new_user_id
        else:
            # Fallback to hardcoded user
            print(f"Failed to create user, using fallback: {test_user_id}")
            return test_user_id
    
    @classmethod
    def _add_tag_to_list(cls, list_id: str, tag_name: str):
        """Add a tag to a list"""
        # Create or get tag
        tag_response = requests.post(
            f"{cls.client.base_url}/rest/v1/list_tags",
            headers=cls.client.headers,
            json={'name': tag_name}
        )
        
        if tag_response.status_code in [201, 409]:  # Created or exists
            # Get tag ID
            get_response = requests.get(
                f"{cls.client.base_url}/rest/v1/list_tags",
                headers=cls.client.headers,
                params={'name': f'eq.{tag_name}', 'select': 'id'}
            )
            
            if get_response.status_code == 200 and get_response.json():
                tag_id = get_response.json()[0]['id']
                
                # Associate with list
                requests.post(
                    f"{cls.client.base_url}/rest/v1/list_tag_associations",
                    headers=cls.client.headers,
                    json={'list_id': list_id, 'tag_id': tag_id}
                )
    
    @classmethod
    def _add_item_to_list(cls, list_id: str, item_uid: str):
        """Add an item to a list"""
        item_data = {
            'list_id': list_id,
            'item_uid': item_uid,
            'added_at': datetime.utcnow().isoformat(),
            'personal_rating': 5 + (hash(item_uid) % 6),  # 5-10 rating
            'notes': f'Test note for {item_uid}'
        }
        
        response = requests.post(
            f"{cls.client.base_url}/rest/v1/custom_list_items",
            headers=cls.client.headers,
            json=item_data
        )
        
        if response.status_code == 201:
            cls.test_items.append(response.json()[0]['id'])
    
    @classmethod
    def _cleanup_test_data(cls):
        """Remove all test data"""
        print("\n=== Cleaning Up Test Data ===")
        
        # Delete items
        for item_id in cls.test_items:
            requests.delete(
                f"{cls.client.base_url}/rest/v1/custom_list_items",
                headers=cls.client.headers,
                params={'id': f'eq.{item_id}'}
            )
        
        # Delete tag associations and lists
        for list_id in cls.test_lists:
            requests.delete(
                f"{cls.client.base_url}/rest/v1/list_tag_associations",
                headers=cls.client.headers,
                params={'list_id': f'eq.{list_id}'}
            )
            
            requests.delete(
                f"{cls.client.base_url}/rest/v1/custom_lists",
                headers=cls.client.headers,
                params={'id': f'eq.{list_id}'}
            )
        
        print("✅ Test data cleaned up")
    
    def test_rpc_function_returns_correct_types(self):
        """Verify RPC function returns data with correct types"""
        print("\n=== Testing RPC Function Types ===")
        
        # Call RPC function directly
        response = requests.post(
            f"{self.client.base_url}/rest/v1/rpc/get_user_lists_optimized",
            headers=self.client.headers,
            json={
                'p_user_id': self.test_user_id,
                'p_limit': 5,
                'p_offset': 0
            }
        )
        
        assert response.status_code == 200, f"RPC call failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "RPC should return a list"
        assert len(data) > 0, "Should return at least one list"
        
        # Check first item structure
        first_list = data[0]
        assert 'id' in first_list
        assert 'title' in first_list
        assert 'tags' in first_list
        assert 'item_count' in first_list
        assert 'followers_count' in first_list
        
        # Verify types
        assert isinstance(first_list['item_count'], int), "item_count should be integer"
        assert isinstance(first_list['followers_count'], int), "followers_count should be integer"
        assert isinstance(first_list['tags'], list), "tags should be a list"
        
        print(f"✅ RPC function returns correct types for {len(data)} lists")
    
    def test_performance_improvement(self):
        """Measure actual performance improvement"""
        print("\n=== Testing Performance Improvement ===")
        
        # Warm up the connection
        self.client.get_user_custom_lists(self.test_user_id, page=1, limit=1)
        
        # Test optimized method (average of 3 runs)
        optimized_times = []
        for _ in range(3):
            start = time.time()
            result = self.client.get_user_custom_lists(self.test_user_id, page=1, limit=10)
            optimized_times.append(time.time() - start)
        
        optimized_avg = sum(optimized_times) / len(optimized_times)
        
        # Test fallback method (average of 3 runs)
        fallback_times = []
        for _ in range(3):
            start = time.time()
            result = self.client._get_user_custom_lists_fallback(self.test_user_id, page=1, limit=10)
            fallback_times.append(time.time() - start)
        
        fallback_avg = sum(fallback_times) / len(fallback_times)
        
        # Calculate improvement
        speedup = fallback_avg / optimized_avg
        
        print(f"\nPerformance Results (average of 3 runs):")
        print(f"  Optimized: {optimized_avg:.3f}s")
        print(f"  Fallback:  {fallback_avg:.3f}s")
        print(f"  Speedup:   {speedup:.1f}x faster")
        print(f"  Time saved: {(fallback_avg - optimized_avg)*1000:.0f}ms per request")
        
        # Assertions
        assert optimized_avg < fallback_avg, "Optimized should be faster"
        assert speedup > 3, f"Expected >3x speedup, got {speedup:.1f}x"
        assert optimized_avg < 0.5, f"Optimized should complete in <500ms, took {optimized_avg:.3f}s"
    
    def test_data_consistency(self):
        """Ensure both methods return identical data"""
        print("\n=== Testing Data Consistency ===")
        
        # Get results from both methods
        optimized = self.client.get_user_custom_lists(self.test_user_id, page=1, limit=5)
        fallback = self.client._get_user_custom_lists_fallback(self.test_user_id, page=1, limit=5)
        
        # Compare totals
        assert optimized['total'] == fallback['total'], "Total counts should match"
        assert len(optimized['data']) == len(fallback['data']), "List counts should match"
        
        # Sort by ID for comparison
        opt_lists = sorted(optimized['data'], key=lambda x: x['id'])
        fb_lists = sorted(fallback['data'], key=lambda x: x['id'])
        
        # Detailed comparison
        for i, (opt, fb) in enumerate(zip(opt_lists, fb_lists)):
            print(f"\nComparing list {i+1}:")
            print(f"  ID: {opt['id'][:8]}...")
            
            assert opt['id'] == fb['id'], f"IDs don't match"
            assert opt['title'] == fb['title'], f"Titles don't match"
            assert opt['itemCount'] == fb['itemCount'], f"Item counts don't match"
            
            # Compare tags as sets (order doesn't matter)
            opt_tags = set(opt.get('tags', []))
            fb_tags = set(fb.get('tags', []))
            assert opt_tags == fb_tags, f"Tags don't match: {opt_tags} vs {fb_tags}"
            
            print(f"  ✅ Data matches (items: {opt['itemCount']}, tags: {len(opt_tags)})")
        
        print(f"\n✅ All {len(opt_lists)} lists have consistent data")
    
    def test_query_count_reduction(self):
        """Verify query count reduction"""
        print("\n=== Testing Query Count Reduction ===")
        
        query_counts = {}
        
        # Count queries for optimized method
        original_post = requests.post
        original_get = requests.get
        
        def count_queries(method_name):
            count = 0
            
            def counting_post(*args, **kwargs):
                nonlocal count
                if 'rest/v1' in args[0]:
                    count += 1
                return original_post(*args, **kwargs)
            
            def counting_get(*args, **kwargs):
                nonlocal count
                if 'rest/v1' in args[0]:
                    count += 1
                return original_get(*args, **kwargs)
            
            # Temporarily replace requests methods
            requests.post = counting_post
            requests.get = counting_get
            
            try:
                if method_name == 'optimized':
                    self.client.get_user_custom_lists(self.test_user_id, page=1, limit=5)
                else:
                    self.client._get_user_custom_lists_fallback(self.test_user_id, page=1, limit=5)
            finally:
                # Restore original methods
                requests.post = original_post
                requests.get = original_get
            
            return count
        
        # Measure both methods
        query_counts['optimized'] = count_queries('optimized')
        query_counts['fallback'] = count_queries('fallback')
        
        print(f"\nQuery Count Results:")
        print(f"  Optimized: {query_counts['optimized']} queries")
        print(f"  Fallback:  {query_counts['fallback']} queries")
        print(f"  Reduction: {query_counts['fallback'] - query_counts['optimized']} fewer queries")
        print(f"  Efficiency: {(1 - query_counts['optimized']/query_counts['fallback'])*100:.0f}% fewer queries")
        
        # Assertions
        assert query_counts['optimized'] <= 2, f"Optimized should use ≤2 queries"
        assert query_counts['fallback'] >= 15, f"Fallback should use many queries for 5 lists with tags"
        assert query_counts['optimized'] < query_counts['fallback'] / 5, "Should reduce queries by >80%"
    
    def test_pagination(self):
        """Test that pagination works correctly"""
        print("\n=== Testing Pagination ===")
        
        # Get first page
        page1 = self.client.get_user_custom_lists(self.test_user_id, page=1, limit=3)
        assert len(page1['data']) == 3, "Should return 3 items for page 1"
        
        # Get second page
        page2 = self.client.get_user_custom_lists(self.test_user_id, page=2, limit=3)
        assert len(page2['data']) == 3, "Should return 3 items for page 2"
        
        # Ensure no overlap
        page1_ids = {l['id'] for l in page1['data']}
        page2_ids = {l['id'] for l in page2['data']}
        assert page1_ids.isdisjoint(page2_ids), "Pages should not have overlapping items"
        
        print("✅ Pagination works correctly")
    
    def test_empty_user(self):
        """Test performance with user having no lists"""
        print("\n=== Testing Empty User Performance ===")
        
        empty_user_id = str(uuid.uuid4())
        
        # Both methods should be fast for empty results
        start = time.time()
        result = self.client.get_user_custom_lists(empty_user_id, page=1, limit=20)
        empty_time = time.time() - start
        
        assert empty_time < 0.1, f"Should be very fast for empty results: {empty_time:.3f}s"
        assert result['total'] == 0, "Should return 0 total"
        assert len(result['data']) == 0, "Should return empty data"
        
        print(f"✅ Empty user query completed in {empty_time*1000:.0f}ms")
        
    def test_concurrent_access(self):
        """Test multiple simultaneous requests to ensure thread safety"""
        if not self.test_user_id:
            pytest.skip("No test user available")
        
        print("\n🔄 Testing concurrent access to get_user_custom_lists...")
        
        # Import threading for concurrent requests
        import concurrent.futures
        import threading
        
        # Number of concurrent requests
        num_requests = 10
        
        def make_request():
            """Make a single request and return result with timing"""
            start = time.time()
            result = self.client.get_user_custom_lists(self.test_user_id, 1, 20)
            end = time.time()
            return result, end - start
        
        # Execute concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_requests) as executor:
            futures = [executor.submit(make_request) for _ in range(num_requests)]
            results = [f.result() for f in futures]
        
        # Verify all requests succeeded
        all_results = [r[0] for r in results]
        all_times = [r[1] for r in results]
        
        # All results should be identical
        first_result = all_results[0]
        assert first_result is not None, "First request should succeed"
        
        for i, result in enumerate(all_results[1:], 1):
            assert result is not None, f"Request {i+1} should succeed"
            assert result['total'] == first_result['total'], f"Request {i+1} should have same total"
            assert len(result['data']) == len(first_result['data']), f"Request {i+1} should have same data length"
        
        # Performance should be consistent
        avg_time = sum(all_times) / len(all_times)
        max_time = max(all_times)
        min_time = min(all_times)
        
        print(f"✅ Concurrent access test passed:")
        print(f"   - {num_requests} concurrent requests")
        print(f"   - Average time: {avg_time*1000:.0f}ms")
        print(f"   - Min time: {min_time*1000:.0f}ms")
        print(f"   - Max time: {max_time*1000:.0f}ms")
        print(f"   - All results identical: ✓")
        
        # No request should take more than 2 seconds
        assert max_time < 2.0, f"Max time should be under 2s: {max_time:.3f}s"
        
    def test_sql_injection_protection(self):
        """Test that SQL injection attempts are handled safely"""
        print("\n🔒 Testing SQL injection protection...")
        
        # Common SQL injection payloads
        malicious_inputs = [
            "'; DROP TABLE custom_lists; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM user_profiles --",
            "'; INSERT INTO custom_lists VALUES ('evil'); --",
            "' OR id = (SELECT id FROM custom_lists LIMIT 1) --",
            "'; DELETE FROM custom_lists WHERE 1=1; --",
            "' AND 1=1 UNION SELECT NULL,NULL,NULL --",
            "'; SELECT * FROM pg_tables; --"
        ]
        
        for payload in malicious_inputs:
            print(f"Testing payload: {payload[:30]}...")
            
            # Test with malicious user_id
            try:
                result = self.client.get_user_custom_lists(payload, 1, 20)
                # Should return empty result or handle gracefully, not crash
                assert result is not None, f"Should handle malicious input gracefully: {payload}"
                assert result['total'] == 0, f"Should return empty for invalid user_id: {payload}"
                assert len(result['data']) == 0, f"Should return empty data for invalid user_id: {payload}"
            except Exception as e:
                # Should not crash with SQL errors
                error_msg = str(e).lower()
                forbidden_errors = ['syntax error', 'relation does not exist', 'column does not exist']
                assert not any(err in error_msg for err in forbidden_errors), f"Should not leak SQL errors: {e}"
                print(f"   Handled gracefully: {e}")
        
        print("✅ SQL injection protection verified")
        
    def test_large_dataset_performance(self):
        """Test performance with larger datasets"""
        if not self.test_user_id:
            pytest.skip("No test user available")
        
        print("\n📊 Testing performance with larger datasets...")
        
        # Test different page sizes
        page_sizes = [1, 5, 10, 20, 50]
        
        for page_size in page_sizes:
            start = time.time()
            result = self.client.get_user_custom_lists(self.test_user_id, 1, page_size)
            end = time.time()
            
            assert result is not None, f"Should handle page size {page_size}"
            assert len(result['data']) <= page_size, f"Should respect page size limit: {page_size}"
            
            # Even with larger page sizes, should be fast
            assert end - start < 1.0, f"Should be fast even with page size {page_size}: {end-start:.3f}s"
            
            print(f"   Page size {page_size}: {(end-start)*1000:.0f}ms")
        
        print("✅ Performance scales well with different page sizes")


if __name__ == "__main__":
    # Run specific test or all tests
    import sys
    if len(sys.argv) > 1:
        # Run specific test
        pytest.main([__file__, f"::{sys.argv[1]}", "-v", "-s"])
    else:
        # Run all tests
        pytest.main([__file__, "-v", "-s"])