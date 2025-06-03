import os
import requests
import pandas as pd
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
import time
try:
    import jwt
except ImportError:
    try:
        import PyJWT as jwt
    except ImportError:
        raise ImportError("Neither 'jwt' nor 'PyJWT' could be imported. Please install PyJWT: pip install PyJWT")
from functools import wraps
from flask import request, jsonify, g

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
        
        params = {
            'limit': limit,
            'offset': offset,
            'order': 'id'  # Consistent ordering for pagination
        }
        
        response = self._make_request('GET', 'items', params=params)
        items = response.json()
        
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
                
        except Exception as e:
            pass
        
        # Fallback: Manual relation fetching
        return self._get_items_with_manual_relations(limit, offset=0)
    
    def _get_items_with_manual_relations(self, limit: int, offset: int = 0) -> List[Dict]:
        """
        Manually fetch items and their relations with pagination support
        """
        
        # Get basic items with pagination
        items = self.get_all_items(limit=limit, offset=offset)
        if not items:
            return []
        
        # Create lookup dictionaries for performance (only load once)
        if not hasattr(self, '_lookup_cache'):
            self._lookup_cache = {
                'media_types': self._get_lookup_dict('media_types'),
                'genres': self._get_lookup_dict('genres'),
                'themes': self._get_lookup_dict('themes'),
                'demographics': self._get_lookup_dict('demographics'),
                'studios': self._get_lookup_dict('studios'),
                'authors': self._get_lookup_dict('authors'),
            }
        
        # Get relation mappings for this batch of items
        item_ids = [item['id'] for item in items]
        
        item_relations = {
            'item_genres': self._get_relations_for_items('item_genres', item_ids),
            'item_themes': self._get_relations_for_items('item_themes', item_ids),
            'item_demographics': self._get_relations_for_items('item_demographics', item_ids),
            'item_studios': self._get_relations_for_items('item_studios', item_ids),
            'item_authors': self._get_relations_for_items('item_authors', item_ids),
        }
        
        # Enhance items with relations
        for item in items:
            item_id = item['id']
            
            # Add media type name
            item['media_types'] = {'name': self._lookup_cache['media_types'].get(item['media_type_id'], 'Unknown')}
            
            # Add related data
            for relation_type, relations in item_relations.items():
                item[relation_type] = []
                for rel in relations:
                    if rel['item_id'] == item_id:
                        relation_name = relation_type.replace('item_', '').rstrip('s')  # item_genres -> genre
                        related_id = rel.get(f'{relation_name}_id') or rel.get(f'{relation_name}s_id')
                        if related_id and related_id in self._lookup_cache[f'{relation_name}s']:
                            item[relation_type].append({
                                f'{relation_name}s': {'name': self._lookup_cache[f'{relation_name}s'][related_id]}
                            })
        
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
        
        if include_relations:
            # Use pagination to get ALL items, not just 1000
            items = self._get_all_items_with_relations_paginated()
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
        
        print(f"✅ DataFrame ready: {len(df):,} items with {df.shape[1]} columns")
        return df
    
    def _process_relations(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process nested relation data into flat lists"""
        
        # Extract media type name
        if 'media_types' in df.columns:
            df['media_type'] = df['media_types'].apply(
                lambda x: x['name'] if x and isinstance(x, dict) else None
            )
        
        # Extract genres
        if 'item_genres' in df.columns:
            df['genres'] = df['item_genres'].apply(
                lambda x: [item['genres']['name'] for item in x] if x and isinstance(x, list) else []
            )
        
        # Extract themes
        if 'item_themes' in df.columns:
            df['themes'] = df['item_themes'].apply(
                lambda x: [item['themes']['name'] for item in x] if x and isinstance(x, list) else []
            )
        
        # Extract demographics
        if 'item_demographics' in df.columns:
            df['demographics'] = df['item_demographics'].apply(
                lambda x: [item['demographics']['name'] for item in x] if x and isinstance(x, list) else []
            )
        
        # Extract studios
        if 'item_studios' in df.columns:
            df['studios'] = df['item_studios'].apply(
                lambda x: [item['studios']['name'] for item in x] if x and isinstance(x, list) else []
            )
        
        # Extract authors
        if 'item_authors' in df.columns:
            df['authors'] = df['item_authors'].apply(
                lambda x: [item['authors']['name'] for item in x] if x and isinstance(x, list) else []
            )
        
        # Drop the nested columns
        cols_to_drop = ['media_types', 'item_genres', 'item_themes', 'item_demographics', 'item_studios', 'item_authors']
        df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
        
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

    def _get_all_items_with_relations_paginated(self, page_size: int = 1000) -> List[Dict]:
        """
        Get ALL items with relations using optimized pagination (FASTER VERSION)
        Uses 1000-item batches (Supabase server limit) but with optimized relation loading
        """
        
        print(f"📊 Fetching ALL items with OPTIMIZED relation loading (batch_size={page_size})")
        
        all_items = []
        offset = 0
        
        # Pre-load ALL reference data once (much faster than per-batch)
        if not hasattr(self, '_lookup_cache'):
            print("📖 Pre-loading ALL reference data...")
            self._lookup_cache = {
                'media_types': self._get_lookup_dict('media_types'),
                'genres': self._get_lookup_dict('genres'),
                'themes': self._get_lookup_dict('themes'),
                'demographics': self._get_lookup_dict('demographics'),
                'studios': self._get_lookup_dict('studios'),
                'authors': self._get_lookup_dict('authors'),
            }
            print(f"✅ Reference data cached: {sum(len(cache) for cache in self._lookup_cache.values())} total entries")
        
        # Pre-load ALL relation mappings once (major performance boost)
        print("🔗 Loading all relation mappings...")
        all_relations = {
            'item_genres': self._get_all_relations('item_genres'),
            'item_themes': self._get_all_relations('item_themes'),
            'item_demographics': self._get_all_relations('item_demographics'),
            'item_studios': self._get_all_relations('item_studios'),
            'item_authors': self._get_all_relations('item_authors'),
        }
        total_relations = sum(len(relations) for relations in all_relations.values())
        print(f"✅ Cached {total_relations:,} total relations")
        
        batch_number = 0
        while True:
            batch_number += 1
            
            # Get basic items (Supabase limits us to 1000 max per request)
            items = self.get_all_items(limit=page_size, offset=offset)
            
            if not items:  # No more data
                break
            
            # Build relations using pre-loaded data (much faster)
            self._build_relations_from_cache(items, all_relations)
                
            all_items.extend(items)
            offset += page_size
            
            print(f"   ✅ Batch {batch_number}: {len(items)} items (total: {len(all_items)})")
            
            # If we got less than page_size, we've reached the end
            if len(items) < page_size:
                print(f"   🏁 Reached end of data (last batch had {len(items)} items)")
                break
                
            # Safety check - don't fetch more than 100k items to avoid memory issues
            if len(all_items) >= 100000:
                print(f"⚠️  Reached safety limit of 100k items")
                break
        
        print(f"🚀 OPTIMIZED loading complete! Total items: {len(all_items)} (processed {batch_number} batches)")
        return all_items

    def _get_all_relations(self, table_name: str) -> List[Dict]:
        """Get ALL relations from a table efficiently with larger batches"""
        
        all_relations = []
        offset = 0
        batch_size = 10000  # Larger batches for relations
        
        while True:
            try:
                params = {
                    'limit': batch_size,
                    'offset': offset,
                    'order': 'item_id'  # Ordered for faster lookups
                }
                response = self._make_request('GET', table_name, params=params)
                batch = response.json()
                
                if not batch:
                    break
                    
                all_relations.extend(batch)
                offset += batch_size
                
                if len(batch) < batch_size:  # Last batch
                    break
                    
            except Exception as e:
                print(f"⚠️  Error loading {table_name} at offset {offset}: {e}")
                break
        
        return all_relations

    def _build_relations_from_cache(self, items: List[Dict], all_relations: Dict[str, List[Dict]]) -> None:
        """Build relations for items using pre-loaded cached data (FAST)"""
        
        # Create item ID set for fast lookups
        item_ids = {item['id'] for item in items}
        
        # Pre-filter relations for this batch (much faster than checking each item)
        batch_relations = {}
        for relation_type, relations in all_relations.items():
            batch_relations[relation_type] = [
                rel for rel in relations if rel['item_id'] in item_ids
            ]
        
        # Build relations for each item
        for item in items:
            item_id = item['id']
            
            # Add media type name
            item['media_types'] = {'name': self._lookup_cache['media_types'].get(item['media_type_id'], 'Unknown')}
            
            # Add related data efficiently
            for relation_type, relations in batch_relations.items():
                item[relation_type] = []
                
                # Get relations for this specific item
                item_relations = [rel for rel in relations if rel['item_id'] == item_id]
                
                for rel in item_relations:
                    relation_name = relation_type.replace('item_', '').rstrip('s')  # item_genres -> genre
                    related_id = rel.get(f'{relation_name}_id') or rel.get(f'{relation_name}s_id')
                    
                    if related_id and related_id in self._lookup_cache[f'{relation_name}s']:
                        item[relation_type].append({
                            f'{relation_name}s': {'name': self._lookup_cache[f'{relation_name}s'][related_id]}
                        })

    def _get_relations_for_items(self, table_name: str, item_ids: List[int]) -> List[Dict]:
        """Get relations for specific item IDs to avoid loading all relations"""
        
        # Convert item IDs to comma-separated string for query
        ids_str = ','.join(map(str, item_ids))
        
        params = {
            'item_id': f'in.({ids_str})',
            'limit': len(item_ids) * 10  # Assume max 10 relations per item
        }
        
        response = self._make_request('GET', table_name, params=params)
        return response.json()


# 🆕 NEW AUTHENTICATION CLASS - ADD THIS TO THE END OF THE FILE:
class SupabaseAuthClient:
    """
    Supabase Authentication client for user management
    """
    
    def __init__(self, base_url: str, api_key: str, service_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.service_key = service_key
        self.jwt_secret = service_key  # Used to verify JWT tokens
        
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json"
        }
    
    def verify_jwt_token(self, token: str) -> dict:
        """
        Verify JWT token and extract user information
        """
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decode the JWT token
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=['HS256'],
                audience='authenticated'
            )
            
            return {
                'user_id': payload.get('sub'),
                'email': payload.get('email'),
                'role': payload.get('role', 'authenticated')
            }
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")
    
    def get_user_profile(self, user_id: str) -> dict:
        """
        Get user profile by user ID
        """
        try:
            response = requests.get(
                f"{self.base_url}/rest/v1/user_profiles",
                headers=self.headers,
                params={'id': f'eq.{user_id}', 'select': '*'}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data[0] if data else None
            return None
        except Exception as e:
            print(f"Error getting user profile: {e}")
            return None
    
    def create_user_profile(self, user_id: str, username: str, display_name: str = None) -> dict:
        """
        Create a new user profile
        """
        try:
            data = {
                'id': user_id,
                'username': username,
                'display_name': display_name or username
            }
            
            response = requests.post(
                f"{self.base_url}/rest/v1/user_profiles",
                headers=self.headers,
                json=data
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            return None
        except Exception as e:
            print(f"Error creating user profile: {e}")
            return None
    
    def update_user_profile(self, user_id: str, updates: dict) -> dict:
        """
        Update user profile
        """
        try:
            response = requests.patch(
                f"{self.base_url}/rest/v1/user_profiles",
                headers=self.headers,
                params={'id': f'eq.{user_id}'},
                json=updates
            )
            
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error updating user profile: {e}")
            return None
    
    def get_user_items(self, user_id: str, status: str = None) -> list:
        """
        Get user's anime/manga list
        """
        try:
            params = {'user_id': f'eq.{user_id}', 'select': '*'}
            if status:
                params['status'] = f'eq.{status}'
            
            response = requests.get(
                f"{self.base_url}/rest/v1/user_items",
                headers=self.headers,
                params=params
            )
            
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"Error getting user items: {e}")
            return []
    
    def update_user_item_status(self, user_id: str, item_uid: str, status: str, rating: int = None, episodes_watched: int = None) -> dict:
        """
        Update user's status for an anime/manga item
        """
        try:
            # First, check if record exists
            existing = requests.get(
                f"{self.base_url}/rest/v1/user_items",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'item_uid': f'eq.{item_uid}',
                    'select': 'id'
                }
            )
            
            data = {
                'user_id': user_id,
                'item_uid': item_uid,
                'status': status,
                'updated_at': 'now()'
            }
            
            if rating is not None:
                data['rating'] = rating
            if episodes_watched is not None:
                data['episodes_watched'] = episodes_watched
            if status == 'completed':
                data['completed_at'] = 'now()'
            elif status == 'watching' and existing.json() == []:
                data['started_at'] = 'now()'
            
            if existing.json():
                # Update existing record
                response = requests.patch(
                    f"{self.base_url}/rest/v1/user_items",
                    headers=self.headers,
                    params={
                        'user_id': f'eq.{user_id}',
                        'item_uid': f'eq.{item_uid}'
                    },
                    json=data
                )
            else:
                # Create new record
                if status == 'watching':
                    data['started_at'] = 'now()'
                response = requests.post(
                    f"{self.base_url}/rest/v1/user_items",
                    headers=self.headers,
                    json=data
                )
            
            if response.status_code in [200, 201]:
                return response.json()
            return None
        except Exception as e:
            print(f"Error updating user item status: {e}")
            return None

# 🆕 AUTHENTICATION DECORATOR - ADD THIS TOO:
def require_auth(f):
    """
    Decorator to require authentication for API routes
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        try:
            # Initialize auth client (you'll need to pass the config)
            auth_client = SupabaseAuthClient(
                os.getenv('SUPABASE_URL'),
                os.getenv('SUPABASE_KEY'),
                os.getenv('SUPABASE_SERVICE_KEY')
            )
            
            user_info = auth_client.verify_jwt_token(auth_header)
            g.current_user = user_info
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


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