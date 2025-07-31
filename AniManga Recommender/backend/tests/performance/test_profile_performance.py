#!/usr/bin/env python3
# ABOUTME: Test script to verify profile page performance optimizations
# ABOUTME: Compares performance between old separate endpoints and new unified endpoint
# ABOUTME: Updated to test PostgreSQL function optimization

import os
import sys
import time
import requests
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_profile_performance():
    """Test and compare performance of profile fetching methods"""
    
    print("=" * 60)
    print("Profile Page Performance Test")
    print("=" * 60)
    
    # Configuration
    base_url = "http://localhost:5000"
    test_username = os.getenv('TEST_USERNAME', 'test_user')  # Replace with actual username or set in .env
    
    if test_username == 'test_user':
        print("\n❌ ERROR: Please set TEST_USERNAME in your .env file")
        print("   You need a valid username that has profile data")
        return
    
    # Optional: Add auth token if testing authenticated endpoints
    headers = {}
    auth_token = os.getenv('TEST_AUTH_TOKEN')
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    print(f"\nTesting with username: {test_username}")
    
    # Test 1: Old method - 4 separate API calls
    print("\n1. Testing OLD method (4 separate API calls):")
    start_time = time.time()
    
    try:
        # Profile call
        profile_start = time.time()
        profile_resp = requests.get(f"{base_url}/api/users/{test_username}/profile", headers=headers)
        profile_time = time.time() - profile_start
        
        # Stats call
        stats_start = time.time()
        stats_resp = requests.get(f"{base_url}/api/users/{test_username}/stats", headers=headers)
        stats_time = time.time() - stats_start
        
        # Lists call
        lists_start = time.time()
        lists_resp = requests.get(f"{base_url}/api/users/{test_username}/lists", headers=headers)
        lists_time = time.time() - lists_start
        
        # Activity call
        activity_start = time.time()
        activity_resp = requests.get(f"{base_url}/api/users/{test_username}/activity?limit=20", headers=headers)
        activity_time = time.time() - activity_start
        
        old_method_time = time.time() - start_time
        
        print(f"   ✓ Profile endpoint: {profile_time:.3f}s (status: {profile_resp.status_code})")
        print(f"   ✓ Stats endpoint: {stats_time:.3f}s (status: {stats_resp.status_code})")
        print(f"   ✓ Lists endpoint: {lists_time:.3f}s (status: {lists_resp.status_code})")
        print(f"   ✓ Activity endpoint: {activity_time:.3f}s (status: {activity_resp.status_code})")
        print(f"   Total time: {old_method_time:.3f}s")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        old_method_time = None
    
    # Test 2: New unified endpoint
    print("\n2. Testing NEW unified endpoint:")
    start_time = time.time()
    
    try:
        unified_resp = requests.get(f"{base_url}/api/users/{test_username}/profile-full?activity_limit=20", headers=headers)
        new_method_time = time.time() - start_time
        
        print(f"   ✓ Unified endpoint: {new_method_time:.3f}s (status: {unified_resp.status_code})")
        
        if unified_resp.status_code == 200:
            data = unified_resp.json()
            
            # Check cache hit
            cache_hit = data.get('cache_metadata', {}).get('cache_hit', False)
            if cache_hit:
                print(f"   ✓ Data served from cache")
                cached_at = data.get('cache_metadata', {}).get('cached_at')
                if cached_at:
                    print(f"   ✓ Cached at: {cached_at}")
            else:
                print(f"   ✓ Fresh data (not cached)")
            
            # Verify all data is present
            has_profile = 'profile' in data and data['profile']
            has_stats = 'stats' in data and data['stats']
            has_lists = 'lists' in data
            has_activities = 'activities' in data
            
            print(f"\n   Data completeness:")
            print(f"   - Profile data: {'✓' if has_profile else '✗'}")
            print(f"   - Stats data: {'✓' if has_stats else '✗'}")
            print(f"   - Lists data: {'✓' if has_lists else '✗'}")
            print(f"   - Activities data: {'✓' if has_activities else '✗'}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        new_method_time = None
    
    # Test 3: Test cache performance (call again)
    print("\n3. Testing cached performance (second call):")
    start_time = time.time()
    
    try:
        cached_resp = requests.get(f"{base_url}/api/users/{test_username}/profile-full?activity_limit=20", headers=headers)
        cached_time = time.time() - start_time
        
        print(f"   ✓ Cached request: {cached_time:.3f}s (status: {cached_resp.status_code})")
        
        if cached_resp.status_code == 200:
            data = cached_resp.json()
            cache_hit = data.get('cache_metadata', {}).get('cache_hit', False)
            if cache_hit:
                print(f"   ✓ Confirmed cache hit")
            else:
                print(f"   ⚠️  Expected cache hit but got fresh data")
                
    except Exception as e:
        print(f"   ❌ Error: {e}")
        cached_time = None
    
    # Performance comparison
    print("\n" + "=" * 60)
    print("PERFORMANCE COMPARISON")
    print("=" * 60)
    
    if old_method_time and new_method_time:
        speedup = old_method_time / new_method_time
        print(f"\nOld method (4 calls): {old_method_time:.3f}s")
        print(f"New method (unified): {new_method_time:.3f}s")
        print(f"Speedup factor: {speedup:.2f}x faster")
        print(f"Time saved: {(old_method_time - new_method_time):.3f}s")
        
        if cached_time:
            cache_speedup = old_method_time / cached_time
            print(f"\nCached response: {cached_time:.3f}s")
            print(f"Cache speedup: {cache_speedup:.2f}x faster than old method")
            print(f"Cache speedup: {new_method_time / cached_time:.2f}x faster than first unified call")
    
    # Summary
    print("\n" + "=" * 60)
    print("OPTIMIZATION SUMMARY")
    print("=" * 60)
    
    if new_method_time and old_method_time and new_method_time < old_method_time:
        print("✅ Optimization is working! Profile loads significantly faster.")
        print(f"   - Reduced API calls from 4 to 1")
        print(f"   - {((1 - new_method_time/old_method_time) * 100):.1f}% performance improvement")
    else:
        print("⚠️  Optimization may not be working properly. Check:")
        print("   - Is the unified endpoint properly implemented?")
        print("   - Are all services running (Redis, backend)?")
        print("   - Check server logs for errors")
    
    if cached_time and new_method_time and cached_time < new_method_time / 2:
        print("✅ Caching is working! Cached requests are very fast.")
    else:
        print("⚠️  Caching may not be working properly.")
        print("   - Is Redis running and connected?")
        print("   - Check cache configuration")

if __name__ == "__main__":
    print("\nIMPORTANT: Before running this test:")
    print("1. Set TEST_USERNAME in your .env file")
    print("2. Ensure backend server is running (python app.py)")
    print("3. Ensure Redis is running")
    print("4. Optional: Set TEST_AUTH_TOKEN if testing authenticated access")
    print("\nPress Enter to continue...")
    input()
    
    test_profile_performance()