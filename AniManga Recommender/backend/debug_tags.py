#!/usr/bin/env python3
"""
ABOUTME: Debug script to test tag fetching in custom lists.
ABOUTME: Helps identify why tags are not showing up in the frontend.
"""

import os
import sys
from supabase_client import SupabaseClient

def debug_tags():
    """Debug tag functionality by testing database queries."""
    
    # Initialize Supabase client
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_KEY environment variables are required")
        return
    
    client = SupabaseClient(supabase_url, supabase_key)
    
    print("=== Debugging Tag Functionality ===\n")
    
    # Test 1: Check if list_tags table has any data
    print("1. Checking list_tags table...")
    try:
        import requests
        response = requests.get(
            f"{supabase_url}/rest/v1/list_tags",
            headers={
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': 'application/json'
            },
            params={'select': 'id,name', 'limit': 10}
        )
        
        if response.status_code == 200:
            tags = response.json()
            print(f"Found {len(tags)} tags in list_tags table:")
            for tag in tags:
                print(f"  - ID: {tag['id']}, Name: {tag['name']}")
        else:
            print(f"Error fetching tags: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error checking list_tags: {e}")
    
    print()
    
    # Test 2: Check list_tag_associations
    print("2. Checking list_tag_associations table...")
    try:
        response = requests.get(
            f"{supabase_url}/rest/v1/list_tag_associations",
            headers={
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': 'application/json'
            },
            params={'select': 'list_id,tag_id', 'limit': 10}
        )
        
        if response.status_code == 200:
            associations = response.json()
            print(f"Found {len(associations)} tag associations:")
            for assoc in associations:
                print(f"  - List ID: {assoc['list_id']}, Tag ID: {assoc['tag_id']}")
        else:
            print(f"Error fetching tag associations: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error checking list_tag_associations: {e}")
    
    print()
    
    # Test 3: Check a specific custom list with tags using the same query as the API
    print("3. Testing custom list query with tag join...")
    try:
        response = requests.get(
            f"{supabase_url}/rest/v1/custom_lists",
            headers={
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': 'application/json'
            },
            params={
                'select': '''
                    id, title, description, slug, is_public, is_collaborative,
                    created_at, updated_at,
                    list_tag_associations(list_tags(name))
                ''',
                'limit': 5
            }
        )
        
        if response.status_code == 200:
            lists = response.json()
            print(f"Found {len(lists)} custom lists:")
            for list_item in lists:
                print(f"  - List ID: {list_item['id']}, Title: {list_item['title']}")
                print(f"    Tag associations: {list_item.get('list_tag_associations', [])}")
                
                # Extract tags using the same logic as the API
                tags = []
                if list_item.get('list_tag_associations'):
                    tags = [assoc['list_tags']['name'] for assoc in list_item['list_tag_associations'] 
                           if assoc.get('list_tags')]
                print(f"    Extracted tags: {tags}")
                print()
        else:
            print(f"Error fetching custom lists: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error testing custom list query: {e}")

if __name__ == "__main__":
    debug_tags()