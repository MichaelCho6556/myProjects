#!/usr/bin/env python3
# ABOUTME: Script to test the performance improvement of the optimized get_user_custom_lists function
# ABOUTME: Compares query counts and execution time between original and optimized implementations

import os
import time
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import SupabaseClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_list_performance():
    """Test and compare performance of list fetching methods"""
    
    # Initialize client
    client = SupabaseClient()
    
    # Test user ID - you'll need to replace this with a real user ID from your database
    test_user_id = "YOUR_TEST_USER_ID_HERE"  # Replace with actual user ID
    
    print("=" * 60)
    print("Testing List Fetching Performance")
    print("=" * 60)
    
    # Test 1: Optimized method (will fallback if function doesn't exist)
    print("\n1. Testing optimized method:")
    start_time = time.time()
    result_optimized = client.get_user_custom_lists(test_user_id, page=1, limit=20)
    optimized_time = time.time() - start_time
    
    print(f"   - Execution time: {optimized_time:.3f} seconds")
    print(f"   - Lists fetched: {len(result_optimized.get('data', []))}")
    print(f"   - Total lists: {result_optimized.get('total', 0)}")
    
    # Test 2: Force fallback method
    print("\n2. Testing fallback method (with N+1 queries):")
    start_time = time.time()
    result_fallback = client._get_user_custom_lists_fallback(test_user_id, page=1, limit=20)
    fallback_time = time.time() - start_time
    
    print(f"   - Execution time: {fallback_time:.3f} seconds")
    print(f"   - Lists fetched: {len(result_fallback.get('data', []))}")
    print(f"   - Total lists: {result_fallback.get('total', 0)}")
    
    # Performance comparison
    print("\n" + "=" * 60)
    print("PERFORMANCE COMPARISON")
    print("=" * 60)
    
    if fallback_time > 0:
        speedup = fallback_time / optimized_time
        print(f"Speedup factor: {speedup:.2f}x faster")
        print(f"Time saved: {(fallback_time - optimized_time):.3f} seconds")
        
        # Estimate query reduction
        num_lists = len(result_fallback.get('data', []))
        original_queries = 1 + (num_lists * 2)  # 1 for lists + 2 per list (tags + counts)
        optimized_queries = 2  # 1 for function + 1 for total count
        
        print(f"\nQuery reduction:")
        print(f"  - Original: ~{original_queries} queries")
        print(f"  - Optimized: {optimized_queries} queries")
        print(f"  - Reduction: {((original_queries - optimized_queries) / original_queries * 100):.1f}%")
    
    # Data consistency check
    print("\n" + "=" * 60)
    print("DATA CONSISTENCY CHECK")
    print("=" * 60)
    
    # Compare the results to ensure they're identical
    if result_optimized.get('total') == result_fallback.get('total'):
        print("✓ Total count matches")
    else:
        print("✗ Total count mismatch!")
        
    # Check if list data matches (comparing IDs)
    optimized_ids = {l['id'] for l in result_optimized.get('data', [])}
    fallback_ids = {l['id'] for l in result_fallback.get('data', [])}
    
    if optimized_ids == fallback_ids:
        print("✓ List IDs match")
    else:
        print("✗ List IDs mismatch!")
        missing_in_optimized = fallback_ids - optimized_ids
        missing_in_fallback = optimized_ids - fallback_ids
        if missing_in_optimized:
            print(f"  Missing in optimized: {missing_in_optimized}")
        if missing_in_fallback:
            print(f"  Missing in fallback: {missing_in_fallback}")

if __name__ == "__main__":
    print("\nIMPORTANT: Before running this test:")
    print("1. Make sure you've created the PostgreSQL function in Supabase")
    print("2. Replace 'YOUR_TEST_USER_ID_HERE' with a real user ID that has lists")
    print("3. Ensure your .env file has the correct Supabase credentials\n")
    
    try:
        test_list_performance()
    except Exception as e:
        print(f"\nError during testing: {e}")
        print("\nTroubleshooting:")
        print("- Check if the PostgreSQL function was created successfully")
        print("- Verify your Supabase credentials in .env")
        print("- Ensure the test user ID exists and has lists")