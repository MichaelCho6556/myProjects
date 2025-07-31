#!/usr/bin/env python3
# ABOUTME: Test script to verify custom lists performance optimizations
# ABOUTME: Compares performance between optimized and fallback methods, tests caching

import os
import sys
import time
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import SupabaseClient
from utils.cache_helpers import get_cache, get_user_lists_from_cache, invalidate_user_lists_cache
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_list_optimization():
    """Test the custom lists optimization"""
    
    print("=" * 60)
    print("Custom Lists Optimization Test")
    print("=" * 60)
    
    # Initialize client
    client = SupabaseClient()
    
    # Get a test user ID - you'll need to replace this with a real user ID
    test_user_id = os.getenv('TEST_USER_ID', 'YOUR_TEST_USER_ID_HERE')
    
    if test_user_id == 'YOUR_TEST_USER_ID_HERE':
        print("\n❌ ERROR: Please set TEST_USER_ID in your .env file")
        print("   You need a valid user ID that has some custom lists")
        return
    
    print(f"\nTesting with user ID: {test_user_id}")
    
    # Test 1: Clear cache and test cold performance
    print("\n1. Testing cold performance (no cache):")
    invalidate_user_lists_cache(test_user_id)
    
    start_time = time.time()
    result1 = client.get_user_custom_lists(test_user_id, page=1, limit=20)
    cold_time = time.time() - start_time
    
    print(f"   ✓ Cold request time: {cold_time:.3f} seconds")
    print(f"   ✓ Lists fetched: {len(result1.get('data', []))}")
    print(f"   ✓ Total lists: {result1.get('total', 0)}")
    
    # Test 2: Test warm cache performance
    print("\n2. Testing warm cache performance:")
    
    start_time = time.time()
    result2 = client.get_user_custom_lists(test_user_id, page=1, limit=20)
    warm_time = time.time() - start_time
    
    print(f"   ✓ Warm request time: {warm_time:.3f} seconds")
    
    # Verify cache was used
    cached_data = get_user_lists_from_cache(test_user_id, 1, 20)
    if cached_data:
        print("   ✓ Cache hit confirmed")
        if 'cached_at' in cached_data:
            print(f"   ✓ Cached at: {cached_data['cached_at']}")
    else:
        print("   ❌ Cache miss - this shouldn't happen!")
    
    # Test 3: Compare with fallback method
    print("\n3. Testing fallback method (N+1 queries):")
    
    start_time = time.time()
    result3 = client._get_user_custom_lists_fallback(test_user_id, page=1, limit=20)
    fallback_time = time.time() - start_time
    
    print(f"   ✓ Fallback request time: {fallback_time:.3f} seconds")
    print(f"   ✓ Lists fetched: {len(result3.get('data', []))}")
    
    # Performance comparison
    print("\n" + "=" * 60)
    print("PERFORMANCE COMPARISON")
    print("=" * 60)
    
    print(f"\nMethod               | Time (s) | vs Fallback")
    print("-" * 50)
    print(f"Fallback (N+1)       | {fallback_time:8.3f} | 1.00x (baseline)")
    
    if cold_time > 0:
        speedup_cold = fallback_time / cold_time
        print(f"Optimized (cold)     | {cold_time:8.3f} | {speedup_cold:.2f}x faster")
    
    if warm_time > 0:
        speedup_warm = fallback_time / warm_time
        print(f"Optimized (cached)   | {warm_time:8.3f} | {speedup_warm:.2f}x faster")
    
    # Cache performance
    print(f"\nCache Performance:")
    print(f"  - Cache speedup: {cold_time / warm_time:.2f}x")
    print(f"  - Time saved with cache: {(cold_time - warm_time) * 1000:.0f}ms")
    
    # Test 4: Verify data consistency
    print("\n" + "=" * 60)
    print("DATA CONSISTENCY CHECK")
    print("=" * 60)
    
    # Compare totals
    if result1.get('total') == result3.get('total'):
        print("✓ Total count matches between methods")
    else:
        print(f"❌ Total mismatch: Optimized={result1.get('total')}, Fallback={result3.get('total')}")
    
    # Compare list IDs
    opt_ids = {l['id'] for l in result1.get('data', [])}
    fallback_ids = {l['id'] for l in result3.get('data', [])}
    
    if opt_ids == fallback_ids:
        print("✓ List IDs match between methods")
    else:
        print("❌ List IDs mismatch!")
        missing_in_opt = fallback_ids - opt_ids
        missing_in_fallback = opt_ids - fallback_ids
        if missing_in_opt:
            print(f"  Missing in optimized: {missing_in_opt}")
        if missing_in_fallback:
            print(f"  Missing in fallback: {missing_in_fallback}")
    
    # Test 5: Redis connection status
    print("\n" + "=" * 60)
    print("REDIS STATUS")
    print("=" * 60)
    
    cache = get_cache()
    if cache.connected:
        print("✓ Redis connected")
        try:
            from utils.cache_helpers import get_cache_status
            status = get_cache_status()
            print(f"  - Memory usage: {status.get('used_memory_human', 'N/A')}")
            print(f"  - Hit rate: {status.get('hit_rate', 0)}%")
        except:
            pass
    else:
        print("❌ Redis not connected - caching disabled")
    
    # Summary
    print("\n" + "=" * 60)
    print("OPTIMIZATION SUMMARY")
    print("=" * 60)
    
    if cold_time < fallback_time:
        print("✅ Optimization is working! Lists load significantly faster.")
    else:
        print("⚠️  Optimization may not be working. Check if:")
        print("   - The PostgreSQL function is deployed")
        print("   - Database indexes are created")
        print("   - Check server logs for errors")
    
    if warm_time < cold_time / 2:
        print("✅ Caching is working! Cached requests are very fast.")
    else:
        print("⚠️  Caching may not be working properly.")
    
    print("\n💡 Next steps:")
    print("   1. Deploy the SQL function from backend/sql/get_user_lists_optimized.sql")
    print("   2. Ensure Redis is running for caching")
    print("   3. Monitor production performance")

if __name__ == "__main__":
    print("\nIMPORTANT: Before running this test:")
    print("1. Set TEST_USER_ID in your .env file")
    print("2. Ensure that user has some custom lists")
    print("3. Make sure Redis is running (for cache tests)")
    print("\nPress Enter to continue...")
    input()
    
    test_list_optimization()