#!/usr/bin/env python3
# ABOUTME: Quick script to verify if the SQL optimization is working
# ABOUTME: Tests the RPC function and compares performance with fallback

"""
Quick Verification Script for List Query Optimization

This script verifies that the optimization is working by:
1. Testing if the RPC function exists and works
2. Comparing performance between optimized and fallback
3. Showing actual query counts
"""

import os
import sys
import time
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import SupabaseClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def verify_optimization():
    """Verify the optimization is working"""
    client = SupabaseClient()
    
    # Use the existing test user
    test_user_id = "c9e8312c-1469-48d6-a5b2-40a72bc2ac5a"
    
    print("=" * 60)
    print("VERIFYING LIST QUERY OPTIMIZATION")
    print("=" * 60)
    
    # Test 1: Try the optimized method
    print("\n1. Testing optimized method...")
    start_time = time.time()
    optimized_result = client.get_user_custom_lists(test_user_id, page=1, limit=20)
    optimized_time = time.time() - start_time
    
    print(f"   - Time: {optimized_time:.3f}s")
    print(f"   - Lists: {len(optimized_result.get('data', optimized_result.get('lists', [])))}")
    
    # Test 2: Try the fallback method
    print("\n2. Testing fallback method...")
    start_time = time.time()
    fallback_result = client._get_user_custom_lists_fallback(test_user_id, page=1, limit=20)
    fallback_time = time.time() - start_time
    
    print(f"   - Time: {fallback_time:.3f}s")
    print(f"   - Lists: {len(fallback_result.get('data', fallback_result.get('lists', [])))}")
    
    # Results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    
    if optimized_time < fallback_time:
        speedup = fallback_time / optimized_time
        print(f"✅ Optimization is working! {speedup:.2f}x faster")
    else:
        print("❌ Optimization might not be working (check if RPC function exists)")
    
    print(f"\nTime saved: {(fallback_time - optimized_time):.3f}s")
    
    # Check if we're actually using the optimized path
    import requests
    response = requests.post(
        f"{client.base_url}/rest/v1/rpc/get_user_lists_optimized",
        headers=client.headers,
        json={
            'p_user_id': test_user_id,
            'p_limit': 20,
            'p_offset': 0
        }
    )
    
    print(f"\nRPC Function Status: {response.status_code}")
    if response.status_code == 404:
        print("⚠️  RPC function not found - using fallback")
        print("   Run the SQL in sql/get_user_lists_optimized_v2.sql")
    elif response.status_code == 200:
        print("✅ RPC function is available")
    else:
        print(f"❓ Unexpected status: {response.text[:200]}")


if __name__ == "__main__":
    verify_optimization()