#!/usr/bin/env python
"""
Test script to verify the fixes for item count and related data fetching.
"""

import os
import sys
import json
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

def test_count_functionality():
    """Test that the count query works properly."""
    from supabase_client import SupabaseClient
    
    print("Testing count functionality...")
    client = SupabaseClient()
    
    # Test counting items with the new count method
    try:
        # Get count of all items
        response = client.table('items').select('uid').count('exact').range(0, 0).execute()
        
        if hasattr(response, 'count') and response.count is not None:
            print(f"[OK] Count query successful! Total items: {response.count}")
            return response.count
        else:
            print("[FAIL] Count not returned in response")
            return None
    except Exception as e:
        print(f"[FAIL] Error testing count: {e}")
        return None

def test_related_data_fetching():
    """Test that genres, themes, demographics, studios, and authors are fetched."""
    from supabase_client import SupabaseClient
    
    print("\nTesting related data fetching...")
    client = SupabaseClient()
    
    try:
        # Get a sample item
        item_response = client.table('items').select('*').range(0, 0).execute()
        
        if item_response.data and len(item_response.data) > 0:
            item = item_response.data[0]
            item_id = item.get('id')
            print(f"Testing with item ID: {item_id}, Title: {item.get('title')}")
            
            # Test fetching genres
            genre_response = client._make_request(
                'GET',
                'item_genres',
                params={'select': 'genres(name)', 'item_id': f'eq.{item_id}'}
            )
            
            if genre_response.status_code == 200:
                genres = genre_response.json()
                if genres:
                    genre_names = [g['genres']['name'] for g in genres if g.get('genres')]
                    print(f"[OK] Genres fetched: {genre_names}")
                else:
                    print("  No genres for this item")
            else:
                print(f"[FAIL] Failed to fetch genres: {genre_response.status_code}")
            
            # Test fetching themes
            theme_response = client._make_request(
                'GET',
                'item_themes',
                params={'select': 'themes(name)', 'item_id': f'eq.{item_id}'}
            )
            
            if theme_response.status_code == 200:
                themes = theme_response.json()
                if themes:
                    theme_names = [t['themes']['name'] for t in themes if t.get('themes')]
                    print(f"[OK] Themes fetched: {theme_names}")
                else:
                    print("  No themes for this item")
            else:
                print(f"[FAIL] Failed to fetch themes: {theme_response.status_code}")
            
            return True
        else:
            print("[FAIL] No items found in database")
            return False
            
    except Exception as e:
        print(f"[FAIL] Error testing related data: {e}")
        return False

def test_api_endpoints():
    """Test the actual API endpoints to verify the fixes work end-to-end."""
    print("\nTesting API endpoints...")
    print("Note: This requires the Flask server to be running on port 5000")
    
    try:
        import requests
        
        # Test /api/items endpoint
        response = requests.get('http://localhost:5000/api/items?per_page=10')
        
        if response.status_code == 200:
            data = response.json()
            print(f"[OK] /api/items endpoint working")
            print(f"  Total items reported: {data.get('total_items', 'Unknown')}")
            
            if data.get('items'):
                first_item = data['items'][0]
                print(f"  First item has genres: {len(first_item.get('genres', []))}")
                print(f"  First item has themes: {len(first_item.get('themes', []))}")
                
                # Test /api/items/<uid> endpoint
                item_uid = first_item.get('uid')
                if item_uid:
                    detail_response = requests.get(f'http://localhost:5000/api/items/{item_uid}')
                    if detail_response.status_code == 200:
                        detail_data = detail_response.json()
                        print(f"[OK] /api/items/{item_uid} endpoint working")
                        print(f"  Genres: {detail_data.get('genres', [])}")
                        print(f"  Themes: {detail_data.get('themes', [])}")
                        print(f"  Demographics: {detail_data.get('demographics', [])}")
                        print(f"  Studios: {detail_data.get('studios', [])}")
                        print(f"  Authors: {detail_data.get('authors', [])}")
        else:
            print(f"[FAIL] API request failed: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("[FAIL] Could not connect to Flask server. Make sure it's running on port 5000")
    except Exception as e:
        print(f"[FAIL] Error testing API: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("Testing AniManga Recommender Fixes")
    print("=" * 60)
    
    # Test count functionality
    count = test_count_functionality()
    
    # Test related data fetching
    test_related_data_fetching()
    
    # Test API endpoints
    test_api_endpoints()
    
    print("\n" + "=" * 60)
    if count and count > 1000:
        print("[OK] SUCCESS: Count query is working and shows more than 1000 items!")
    else:
        print("[WARNING] Count query may need further investigation")
    print("=" * 60)