import os
import requests
import pandas as pd
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
import time

load_dotenv()

class SupabaseClient:
    """
    Supabase REST API client for database operations
    Replaces direct PostgreSQL connections with HTTP requests
    """
    
    def __init__(self):
        self.base_url = os.getenv('SUPABASE_URL')
        self.api_key = os.getenv('SUPABASE_KEY')
        self.service_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not self.base_url or not self.api_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        
        # Use service key for backend operations (more permissions)
        self.headers = {
            "apikey": self.service_key or self.api_key,
            "Authorization": f"Bearer {self.service_key or self.api_key}",
            "Content-Type": "application/json"
        }
        
        print(f"✅ Supabase client initialized: {self.base_url}")
    
    def _make_request(self, method: str, endpoint: str, params: Dict = None, data: Dict = None) -> requests.Response:
        """Make HTTP request to Supabase API with proper error handling and response parsing"""
        
        url = f"{self.base_url}/rest/v1/{endpoint}"
        
        headers = {
            'apikey': self.api_key,
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',  # Ensure we get response data back
            'Accept-Encoding': 'gzip, deflate',  # Accept compressed responses
            'Accept': 'application/json'  # Explicitly request JSON
        }
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data,
                timeout=30
            )
            
            # Check if request was successful
            if response.status_code not in [200, 201, 204]:
                print(f"❌ Request failed: {response.status_code}")
                print(f"   URL: {url}")
                print(f"   Response: {response.text}")
                response.raise_for_status()
            
            # Handle potential response parsing issues
            if response.status_code in [200, 201] and response.text:
                try:
                    # Test if we can parse the JSON
                    response.json()
                except ValueError as e:
                    print(f"⚠️  JSON parsing issue: {e}")
                    print(f"   Response length: {len(response.text)} bytes")
                    print(f"   Content-Type: {response.headers.get('Content-Type', 'unknown')}")
                    print(f"   Content-Encoding: {response.headers.get('Content-Encoding', 'none')}")
            
            return response
            
        except requests.exceptions.Timeout:
            print(f"❌ Request timeout for {endpoint}")
            raise
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed for {endpoint}: {e}")
            raise
    
    def get_all_items(self, limit: int = 1000, offset: int = 0) -> List[Dict]:
        """
        Get all items with pagination
        REST API equivalent of: SELECT * FROM items
        """
        
        print(f"📊 Fetching items (limit={limit}, offset={offset})")
        
        params = {
            'limit': limit,
            'offset': offset,
            'order': 'id'  # Consistent ordering for pagination
        }
        
        response = self._make_request('GET', 'items', params=params)
        items = response.json()
        
        print(f"✅ Retrieved {len(items)} items")
        return items
    
    def get_all_items_paginated(self, page_size: int = 1000) -> List[Dict]:
        """
        Get ALL items using pagination (handles large datasets)
        """
        
        print(f"📊 Fetching all items with pagination (page_size={page_size})")
        
        all_items = []
        offset = 0
        
        while True:
            batch = self.get_all_items(limit=page_size, offset=offset)
            
            if not batch:  # No more data
                break
                
            all_items.extend(batch)
            offset += page_size
            
            print(f"   📄 Page {offset//page_size}: {len(batch)} items (total: {len(all_items)})")
            
            # If we got less than page_size, we've reached the end
            if len(batch) < page_size:
                break
        
        print(f"✅ Total items retrieved: {len(all_items)}")
        return all_items
    
    def get_items_with_relations(self, limit: int = 1000) -> List[Dict]:
        """
        Get items with related data (genres, themes, etc.)
        Uses manual relation fetching since embedded queries might not work
        """
        
        print(f"📊 Fetching items with relations")
        
        # First, try the embedded approach
        try:
            params = {
                'select': '''
                    *,
                    media_types(name),
                    item_genres(genres(name)),
                    item_themes(themes(name)),
                    item_demographics(demographics(name)),
                    item_studios(studios(name)),
                    item_authors(authors(name))
                ''',
                'limit': limit
            }
            
            response = self._make_request('GET', 'items', params=params)
            items = response.json()
            
            # Check if we got the relations
            if items and len(items) > 0 and 'media_types' in items[0]:
                print(f"✅ Retrieved {len(items)} items with embedded relations")
                return items
            else:
                print("⚠️  Embedded relations failed, falling back to manual approach")
                
        except Exception as e:
            print(f"⚠️  Embedded query failed: {e}, using manual approach")
        
        # Fallback: Manual relation fetching
        return self._get_items_with_manual_relations(limit)
    
    def _get_items_with_manual_relations(self, limit: int) -> List[Dict]:
        """
        Manually fetch items and their relations
        """
        print("🔧 Fetching items and relations manually...")
        
        # Get basic items
        items = self.get_all_items(limit=limit)
        if not items:
            return []
        
        # Create lookup dictionaries for performance
        print("📖 Loading reference data...")
        media_types = self._get_lookup_dict('media_types')
        genres = self._get_lookup_dict('genres')  
        themes = self._get_lookup_dict('themes')
        demographics = self._get_lookup_dict('demographics')
        studios = self._get_lookup_dict('studios')
        authors = self._get_lookup_dict('authors')
        
        # Get all relation mappings
        print("🔗 Loading relation mappings...")
        item_genres = self._get_relations('item_genres')
        item_themes = self._get_relations('item_themes') 
        item_demographics = self._get_relations('item_demographics')
        item_studios = self._get_relations('item_studios')
        item_authors = self._get_relations('item_authors')
        
        # Enhance items with relations
        print("🔧 Building relations for items...")
        for item in items:
            item_id = item['id']
            
            # Add media type name
            media_type_id = item.get('media_type_id')
            if media_type_id and media_type_id in media_types:
                item['media_types'] = {'name': media_types[media_type_id]}
            
            # Add genres
            item_genre_ids = [rel['genre_id'] for rel in item_genres if rel['item_id'] == item_id]
            item['item_genres'] = [{'genres': {'name': genres[gid]}} for gid in item_genre_ids if gid in genres]
            
            # Add themes  
            item_theme_ids = [rel['theme_id'] for rel in item_themes if rel['item_id'] == item_id]
            item['item_themes'] = [{'themes': {'name': themes[tid]}} for tid in item_theme_ids if tid in themes]
            
            # Add demographics
            item_demo_ids = [rel['demographic_id'] for rel in item_demographics if rel['item_id'] == item_id]
            item['item_demographics'] = [{'demographics': {'name': demographics[did]}} for did in item_demo_ids if did in demographics]
            
            # Add studios
            item_studio_ids = [rel['studio_id'] for rel in item_studios if rel['item_id'] == item_id]
            item['item_studios'] = [{'studios': {'name': studios[sid]}} for sid in item_studio_ids if sid in studios]
            
            # Add authors
            item_author_ids = [rel['author_id'] for rel in item_authors if rel['item_id'] == item_id]
            item['item_authors'] = [{'authors': {'name': authors[aid]}} for aid in item_author_ids if aid in authors]
        
        print(f"✅ Retrieved {len(items)} items with manual relations")
        return items
    
    def _get_lookup_dict(self, table_name: str) -> Dict[int, str]:
        """Get a lookup dictionary for a reference table"""
        try:
            response = self._make_request('GET', table_name, params={'limit': 1000})
            data = response.json()
            return {item['id']: item['name'] for item in data}
        except Exception as e:
            print(f"⚠️  Error loading {table_name}: {e}")
            return {}
    
    def _get_relations(self, table_name: str) -> List[Dict]:
        """Get all relations from a junction table"""
        try:
            response = self._make_request('GET', table_name, params={'limit': 10000})
            return response.json()
        except Exception as e:
            print(f"⚠️  Error loading {table_name}: {e}")
            return []
    
    def get_filtered_items(self, filters: Dict[str, Any], limit: int = 1000) -> List[Dict]:
        """
        Get filtered items
        
        Example filters:
        {
            'media_type': 'anime',
            'score': {'gte': 8.0},
            'genres': ['Action', 'Drama']
        }
        """
        
        print(f"🔍 Fetching filtered items: {filters}")
        
        params = {'limit': limit}
        
        # Convert filters to Supabase query parameters
        for field, value in filters.items():
            if isinstance(value, dict):
                # Range queries like {'gte': 8.0}
                for op, val in value.items():
                    params[f'{field}'] = f'{op}.{val}'
            elif isinstance(value, list):
                # Array contains queries (for genres, themes, etc.)
                params[f'{field}'] = f'cs.{{{",".join(value)}}}'
            else:
                # Exact match
                params[f'{field}'] = f'eq.{value}'
        
        response = self._make_request('GET', 'items', params=params)
        items = response.json()
        
        print(f"✅ Retrieved {len(items)} filtered items")
        return items
    
    def items_to_dataframe(self, include_relations: bool = True) -> pd.DataFrame:
        """
        Convert items to pandas DataFrame (replaces CSV loading)
        This is the main function to replace your load_data_and_tfidf()
        """
        
        print(f"🔄 Converting Supabase data to pandas DataFrame")
        
        if include_relations:
            items = self.get_items_with_relations(limit=10000)  # Adjust limit as needed
        else:
            items = self.get_all_items_paginated()
        
        if not items:
            print("⚠️  No items found in database")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(items)
        
        # Process related data (flatten nested structures)
        if include_relations and len(df) > 0:
            df = self._process_relations(df)
        
        print(f"✅ DataFrame created: {df.shape}")
        return df
    
    def _process_relations(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process nested relation data into flat lists"""
        
        print(f"🔍 Processing relations for {len(df)} items")
        print(f"🔍 Available columns before processing: {list(df.columns)}")
        
        # Debug: Show sample of raw data
        if len(df) > 0:
            print(f"🔍 Sample raw item: {dict(df.iloc[0])}")
        
        # Extract media type name
        if 'media_types' in df.columns:
            print("✅ Processing media_types...")
            df['media_type'] = df['media_types'].apply(
                lambda x: x['name'] if x and isinstance(x, dict) else None
            )
        else:
            print("⚠️  No 'media_types' column found")
        
        # Extract genres
        if 'item_genres' in df.columns:
            print("✅ Processing genres...")
            df['genres'] = df['item_genres'].apply(
                lambda x: [item['genres']['name'] for item in x] if x and isinstance(x, list) else []
            )
        else:
            print("⚠️  No 'item_genres' column found")
        
        # Extract themes
        if 'item_themes' in df.columns:
            print("✅ Processing themes...")
            df['themes'] = df['item_themes'].apply(
                lambda x: [item['themes']['name'] for item in x] if x and isinstance(x, list) else []
            )
        else:
            print("⚠️  No 'item_themes' column found")
        
        # Extract demographics
        if 'item_demographics' in df.columns:
            print("✅ Processing demographics...")
            df['demographics'] = df['item_demographics'].apply(
                lambda x: [item['demographics']['name'] for item in x] if x and isinstance(x, list) else []
            )
        else:
            print("⚠️  No 'item_demographics' column found")
        
        # Extract studios
        if 'item_studios' in df.columns:
            print("✅ Processing studios...")
            df['studios'] = df['item_studios'].apply(
                lambda x: [item['studios']['name'] for item in x] if x and isinstance(x, list) else []
            )
        else:
            print("⚠️  No 'item_studios' column found")
        
        # Extract authors
        if 'item_authors' in df.columns:
            print("✅ Processing authors...")
            df['authors'] = df['item_authors'].apply(
                lambda x: [item['authors']['name'] for item in x] if x and isinstance(x, list) else []
            )
        else:
            print("⚠️  No 'item_authors' column found")
        
        # Drop the nested columns
        cols_to_drop = ['media_types', 'item_genres', 'item_themes', 'item_demographics', 'item_studios', 'item_authors']
        df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
        
        print(f"🔍 Final columns after processing: {list(df.columns)}")
        
        return df
    
    def bulk_insert_items(self, items: List[Dict], batch_size: int = 100) -> bool:
        """
        Insert multiple items in batches
        Used for data migration from CSV
        """
        
        print(f"📤 Bulk inserting {len(items)} items (batch_size={batch_size})")
        
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            
            try:
                response = self._make_request('POST', 'items', data=batch)
                print(f"   ✅ Inserted batch {i//batch_size + 1}: {len(batch)} items")
                
                # Small delay to avoid rate limiting
                time.sleep(0.1)
                
            except Exception as e:
                print(f"   ❌ Failed to insert batch {i//batch_size + 1}: {e}")
                return False
        
        print(f"✅ Bulk insert completed")
        return True
    
    def get_distinct_values(self, column: str, table: str = 'items') -> List[str]:
        """
        Get distinct values for a column
        REST API equivalent of: SELECT DISTINCT column FROM table
        """
        
        params = {
            'select': column,
            'limit': 1000
        }
        
        response = self._make_request('GET', table, params=params)
        data = response.json()
        
        # Extract unique values
        values = list(set([item[column] for item in data if item.get(column)]))
        return sorted(values)


# Usage example for your existing code:
def load_data_and_tfidf_rest_api():
    """
    Replacement for your current load_data_and_tfidf() function
    Uses REST API instead of CSV files
    """
    
    client = SupabaseClient()
    
    # Get data as DataFrame (replaces pd.read_csv)
    df = client.items_to_dataframe(include_relations=True)
    
    if len(df) == 0:
        print("No data available")
        return None, None, None, None
    
    # Your existing pandas processing code goes here
    # Filter NSFW content
    if 'sfw' in df.columns:
        df = df[df['sfw'] == True].copy()
    
    # Create combined_text_features column for TF-IDF
    # (Your existing text processing logic)
    
    return df, None, None, None  # Return what your existing function returns 