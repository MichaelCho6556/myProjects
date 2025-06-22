#!/usr/bin/env python3
"""
ABOUTME: Simplified debug script to test tag fetching in custom lists.
ABOUTME: Uses direct HTTP requests without external dependencies.
"""

import requests
import json

def debug_tags():
    """Debug tag functionality by testing database queries."""
    
    # Supabase configuration (replace with actual values)
    supabase_url = "https://monndsdpkpezjkuvwzgd.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vbm5kc2Rwa3BlemprdXZ3emdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjMwOTUsImV4cCI6MjA2NDAzOTA5NX0.SahbOh0coVDGuF2xJErynv6_iisVfwZEj-RteHkoF-U"
    
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json'
    }
    
    print("=== Debugging Tag Functionality ===\n")
    
    # Test 1: Check if list_tags table has any data
    print("1. Checking list_tags table...")
    try:
        response = requests.get(
            f"{supabase_url}/rest/v1/list_tags",
            headers=headers,
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
            headers=headers,
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
    
    # Test 3: Check custom_lists table
    print("3. Checking custom_lists table...")
    try:
        response = requests.get(
            f"{supabase_url}/rest/v1/custom_lists",
            headers=headers,
            params={'select': 'id,title,user_id', 'limit': 5}
        )
        
        if response.status_code == 200:
            lists = response.json()
            print(f"Found {len(lists)} custom lists:")
            for list_item in lists:
                print(f"  - List ID: {list_item['id']}, Title: {list_item['title']}, User ID: {list_item['user_id']}")
        else:
            print(f"Error fetching custom lists: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error checking custom_lists: {e}")
    
    print()
    
    # Test 4: Test the exact query used by the API
    print("4. Testing custom list query with tag join (exact API query)...")
    try:
        response = requests.get(
            f"{supabase_url}/rest/v1/custom_lists",
            headers=headers,
            params={
                'select': '''
                    id, title, description, slug, is_public, is_collaborative,
                    created_at, updated_at,
                    list_tag_associations(list_tags(name))
                ''',
                'limit': 3
            }
        )
        
        if response.status_code == 200:
            lists = response.json()
            print(f"Found {len(lists)} custom lists with tag associations:")
            for list_item in lists:
                print(f"\n  List ID: {list_item['id']}, Title: '{list_item['title']}'")
                print(f"  Raw tag associations: {json.dumps(list_item.get('list_tag_associations', []), indent=4)}")
                
                # Extract tags using the same logic as the API
                tags = []
                if list_item.get('list_tag_associations'):
                    for assoc in list_item['list_tag_associations']:
                        if assoc.get('list_tags'):
                            tags.append(assoc['list_tags']['name'])
                print(f"  Extracted tags: {tags}")
        else:
            print(f"Error fetching custom lists with joins: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error testing custom list query: {e}")
    
    print()
    
    # Test 5: Check if we can manually create a tag and association for testing
    print("5. Testing tag creation and association...")
    try:
        # Get the first custom list if any exist
        lists_response = requests.get(
            f"{supabase_url}/rest/v1/custom_lists",
            headers=headers,
            params={'select': 'id', 'limit': 1}
        )
        
        if lists_response.status_code == 200 and lists_response.json():
            list_id = lists_response.json()[0]['id']
            print(f"Using list ID {list_id} for testing...")
            
            # Try to create a test tag
            create_headers = headers.copy()
            create_headers['Prefer'] = 'return=representation'
            
            tag_response = requests.post(
                f"{supabase_url}/rest/v1/list_tags",
                headers=create_headers,
                json={'name': 'test-debug-tag'}
            )
            
            if tag_response.status_code == 201:
                tag_data = tag_response.json()
                if isinstance(tag_data, list):
                    tag_id = tag_data[0]['id']
                else:
                    tag_id = tag_data['id']
                print(f"Created test tag with ID: {tag_id}")
                
                # Create association
                assoc_response = requests.post(
                    f"{supabase_url}/rest/v1/list_tag_associations",
                    headers=headers,
                    json={'list_id': list_id, 'tag_id': tag_id}
                )
                
                if assoc_response.status_code == 201:
                    print("Successfully created tag association")
                else:
                    print(f"Failed to create association: {assoc_response.status_code} - {assoc_response.text}")
            else:
                print(f"Failed to create tag: {tag_response.status_code} - {tag_response.text}")
        else:
            print("No custom lists found to test with")
    except Exception as e:
        print(f"Error testing tag creation: {e}")

if __name__ == "__main__":
    debug_tags()