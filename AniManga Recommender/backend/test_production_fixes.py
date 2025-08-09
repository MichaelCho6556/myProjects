#!/usr/bin/env python
"""
Test script to verify production fixes for AniManga Recommender
Tests the following issues:
1. Genre/theme/demographic filtering with junction tables
2. 206 status handling for pagination
3. Relationship data fetching
4. Count query functionality
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

# Import backend components
from supabase_client import SupabaseClient
from app import app

def test_genre_filtering():
    """Test that genre filtering works with junction tables"""
    print("\n=== Testing Genre Filtering ===")
    
    try:
        supabase_client = SupabaseClient()
        
        # First, get a valid genre from the database
        genre_response = supabase_client._make_request(
            'GET',
            'genres',
            params={'select': 'id,name', 'limit': '1'}
        )
        
        if genre_response.status_code == 200 and genre_response.json():
            genre = genre_response.json()[0]
            print(f"Testing with genre: {genre['name']} (ID: {genre['id']})")
            
            # Try to get items with this genre
            items_response = supabase_client._make_request(
                'GET',
                'item_genres',
                params={'select': 'item_id', 'genre_id': f'eq.{genre["id"]}', 'limit': '5'}
            )
            
            if items_response.status_code == 200:
                items = items_response.json()
                print(f"[PASS] Found {len(items)} items with genre '{genre['name']}'")
                return True
            else:
                print(f"[FAIL] Failed to fetch items for genre: {items_response.status_code}")
                return False
        else:
            print("[FAIL] No genres found in database")
            return False
            
    except Exception as e:
        print(f"[FAIL] Error testing genre filtering: {e}")
        return False

def test_206_status_handling():
    """Test that 206 status code is handled correctly for pagination"""
    print("\n=== Testing 206 Status Handling ===")
    
    try:
        supabase_client = SupabaseClient()
        
        # Make a request with range header to trigger 206 response
        response = supabase_client._make_request(
            'GET',
            'items',
            params={'select': '*', 'limit': '10'},
            headers={'Range': '0-9'}
        )
        
        # Check if 206 is handled without errors
        if response.status_code in [200, 206]:
            print(f"[PASS] Status {response.status_code} handled correctly")
            if 'content-range' in response.headers:
                print(f"  Content-Range: {response.headers['content-range']}")
            return True
        else:
            print(f"[FAIL] Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"[FAIL] Error testing 206 status: {e}")
        return False

def test_relationship_fetching():
    """Test that relationships (genres, themes, etc.) are fetched correctly"""
    print("\n=== Testing Relationship Data Fetching ===")
    
    try:
        supabase_client = SupabaseClient()
        
        # Get a few items
        items_response = supabase_client._make_request(
            'GET',
            'items',
            params={'select': 'id,uid,title', 'limit': '5'}
        )
        
        if items_response.status_code == 200 and items_response.json():
            items = items_response.json()
            item_ids = [item['id'] for item in items]
            
            # Test fetching genres for these items
            genre_response = supabase_client._make_request(
                'GET',
                'item_genres',
                params={'select': 'item_id,genres(name)', 'item_id': f'in.({",".join(map(str, item_ids))})'}
            )
            
            if genre_response.status_code == 200:
                genres_data = {}
                for entry in genre_response.json():
                    item_id = entry.get('item_id')
                    if item_id not in genres_data:
                        genres_data[item_id] = []
                    if entry.get('genres') and entry['genres'].get('name'):
                        genres_data[item_id].append(entry['genres']['name'])
                
                print(f"[PASS] Successfully fetched genres for {len(genres_data)} items")
                for item_id, genres in list(genres_data.items())[:2]:
                    print(f"  Item {item_id}: {', '.join(genres)}")
                return True
            else:
                print(f"[FAIL] Failed to fetch genres: {genre_response.status_code}")
                return False
        else:
            print("[FAIL] No items found in database")
            return False
            
    except Exception as e:
        print(f"[FAIL] Error testing relationship fetching: {e}")
        return False

def test_count_query():
    """Test that count queries work correctly"""
    print("\n=== Testing Count Query ===")
    
    try:
        with app.test_client() as client:
            # Make a request to the items endpoint
            response = client.get('/api/items?page=1&per_page=10')
            
            if response.status_code == 200:
                data = response.json
                if 'total_items' in data and 'items' in data:
                    print(f"[PASS] Count query successful:")
                    print(f"  Total items: {data['total_items']}")
                    print(f"  Items returned: {len(data['items'])}")
                    print(f"  Total pages: {data.get('total_pages', 'N/A')}")
                    return True
                else:
                    print("[FAIL] Response missing expected fields")
                    return False
            else:
                print(f"[FAIL] API request failed: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"[FAIL] Error testing count query: {e}")
        return False

def test_api_genre_filter():
    """Test the complete API endpoint with genre filtering"""
    print("\n=== Testing API Genre Filter ===")
    
    try:
        with app.test_client() as client:
            # First get available genres
            distinct_response = client.get('/api/distinct-values')
            if distinct_response.status_code == 200:
                distinct_data = distinct_response.json
                if 'genres' in distinct_data and distinct_data['genres']:
                    test_genre = distinct_data['genres'][0]
                    print(f"Testing with genre: {test_genre}")
                    
                    # Test genre filter
                    filter_response = client.get(f'/api/items?genre={test_genre}&page=1&per_page=5')
                    if filter_response.status_code == 200:
                        filter_data = filter_response.json
                        if 'items' in filter_data:
                            print(f"[PASS] Genre filter successful:")
                            print(f"  Items with '{test_genre}': {len(filter_data['items'])}")
                            if filter_data['items']:
                                first_item = filter_data['items'][0]
                                print(f"  First item: {first_item.get('title', 'N/A')}")
                                print(f"  Genres: {first_item.get('genres', [])}")
                            return True
                        else:
                            print("[FAIL] No items in response")
                            return False
                    else:
                        print(f"[FAIL] Filter request failed: {filter_response.status_code}")
                        return False
                else:
                    print("[FAIL] No genres available for testing")
                    return False
            else:
                print(f"[FAIL] Failed to get distinct values: {distinct_response.status_code}")
                return False
                
    except Exception as e:
        print(f"[FAIL] Error testing API genre filter: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Production Fixes Test Suite")
    print("=" * 60)
    
    results = {
        "Genre Filtering": test_genre_filtering(),
        "206 Status Handling": test_206_status_handling(),
        "Relationship Fetching": test_relationship_fetching(),
        "Count Query": test_count_query(),
        "API Genre Filter": test_api_genre_filter()
    }
    
    print("\n" + "=" * 60)
    print("Test Results Summary:")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "[PASS] PASSED" if passed else "[FAIL] FAILED"
        print(f"{test_name}: {status}")
    
    total_tests = len(results)
    passed_tests = sum(1 for passed in results.values() if passed)
    
    print("\n" + "=" * 60)
    print(f"Overall: {passed_tests}/{total_tests} tests passed")
    print("=" * 60)
    
    return all(results.values())

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)