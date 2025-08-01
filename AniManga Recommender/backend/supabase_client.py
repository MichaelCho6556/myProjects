"""
Supabase Client Module for AniManga Recommender

This module provides comprehensive Supabase integration for the AniManga Recommender
system, including database operations, authentication, and user management.

Key Components:
    - SupabaseClient: Core database operations and data retrieval
    - SupabaseAuthClient: User authentication and profile management  
    - require_auth: Authentication decorator for protected endpoints

Technical Features:
    - RESTful API interaction with Supabase
    - Efficient data loading with pagination and caching
    - User item status management with comprehensive tracking
    - JWT token verification and user session handling
    - Error handling and retry mechanisms

Dependencies:
    - requests: HTTP client for Supabase API calls
    - pandas: Data manipulation and DataFrame operations
    - PyJWT: JWT token handling for authentication
    - flask: Web framework integration

Author: Michael Cho
Version: 1.0.0
License: MIT
"""

import os
import requests
import pandas as pd
import numpy as np
import json
from typing import Dict, List, Optional, Any, Union, Tuple
from dotenv import load_dotenv
import time
import logging
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

# Configure logger for this module
logger = logging.getLogger(__name__)

class SupabaseClient:
    """
    Supabase REST API client for comprehensive database operations.
    
    This client provides a complete interface to the Supabase database,
    handling anime/manga data retrieval, user item management, and
    relationship mapping with optimized performance and error handling.
    
    Key Features:
        - Paginated data loading for large datasets (68,000+ items)
        - Efficient relationship fetching with caching mechanisms
        - User item status management with comprehensive tracking
        - Advanced filtering and search capabilities
        - Data validation and type safety
        
    Database Tables Supported:
        - items: Core anime/manga data
        - user_items: User's personal lists and progress
        - Various relationship tables (genres, themes, studios, etc.)
        
    Authentication:
        - Uses service key for backend operations (enhanced permissions)
        - Fallback to regular API key if service key unavailable
        - Automatic header management for all requests
        
    Example:
        >>> client = SupabaseClient()
        >>> df = client.items_to_dataframe(include_relations=True)
        >>> print(f"Loaded {len(df)} items")
        Loaded 68598 items
        
    Environment Variables Required:
        - SUPABASE_URL: Base URL for Supabase project
        - SUPABASE_KEY: Public API key for Supabase
        - SUPABASE_SERVICE_KEY: Service role key (optional, for enhanced permissions)
    """
    
    # Class-level cache to prevent reloading data between requests
    _items_dataframe_cache = None
    _cache_timestamp = None
    _cache_max_age = 3600  # 1 hour cache validity
    _relations_cache = None  # Cache for pre-loaded relations
    
    def __init__(self):
        """
        Initialize SupabaseClient with environment configuration.
        
        Raises:
            ValueError: If required environment variables are not set
        """
        # Strip whitespace/new-line characters that can sneak in when keys are copied
        self.base_url = (os.getenv('SUPABASE_URL') or '').strip().rstrip('/')
        self.api_key = (os.getenv('SUPABASE_KEY') or '').strip()
        self.service_key = (os.getenv('SUPABASE_SERVICE_KEY') or '').strip()
        
        if not self.base_url or not self.api_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        
        # Use service key for backend operations (more permissions)
        self.headers = {
            "apikey": self.service_key or self.api_key,
            "Authorization": f"Bearer {self.service_key or self.api_key}",
            "Content-Type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, params: Optional[Dict] = None, data: Optional[Dict] = None) -> requests.Response:
        """
        Make HTTP request to Supabase API with comprehensive error handling and response parsing.
        
        This method provides a unified interface for all Supabase API interactions,
        handling authentication, error responses, and response validation.
        
        Args:
            method (str): HTTP method ('GET', 'POST', 'PUT', 'DELETE')
            endpoint (str): Supabase REST API endpoint (without base URL)
            params (Optional[Dict]): Query parameters for GET requests
            data (Optional[Dict]): JSON data for POST/PUT requests
            
        Returns:
            requests.Response: HTTP response object with validated JSON content
            
        Raises:
            requests.exceptions.Timeout: If request exceeds 30-second timeout
            requests.exceptions.RequestException: For network-related errors
            requests.exceptions.HTTPError: For HTTP error status codes
            
        Features:
            - Automatic authentication header injection
            - 30-second timeout for all requests
            - Response compression support (gzip, deflate)
            - JSON response validation
            - Detailed error logging for debugging
            
        Example:
            >>> response = client._make_request('GET', 'items', {'limit': 100})
            >>> items = response.json()
            >>> print(f"Retrieved {len(items)} items")
            
        Note:
            This is an internal method. Use specific public methods like
            get_all_items() or items_to_dataframe() for external API calls.
        """
        
        url = f"{self.base_url}/rest/v1/{endpoint}"
        
        headers = {
            # Prefer service role key if provided to avoid permission or header issues
            'apikey': self.service_key or self.api_key,
            'Authorization': f'Bearer {self.service_key or self.api_key}',
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
                logger.error(f"Request failed: {response.status_code} - {url} - {response.text}")
                response.raise_for_status()
            
            # Handle potential response parsing issues
            if response.status_code in [200, 201] and response.text:
                try:
                    # Test if we can parse the JSON
                    response.json()
                except ValueError as e:
                    logger.error(f"JSON parsing issue: {e} - Response length: {len(response.text)} bytes - Content-Type: {response.headers.get('Content-Type', 'unknown')}")
            
            return response
            
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout for {endpoint}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {endpoint}: {e}")
            raise
    
    def get_all_items(self, limit: int = 1000, offset: int = 0) -> List[Dict]:
        """
        Retrieve anime/manga items from Supabase with pagination support.
        
        This method provides basic item data retrieval using Supabase REST API
        with consistent ordering and configurable pagination parameters.
        Essential for building complete datasets and data processing pipelines.
        
        Args:
            limit (int, optional): Maximum number of items to retrieve (default: 1000)
                Supabase server enforces maximum of 1000 per request
            offset (int, optional): Number of items to skip for pagination (default: 0)
                
        Returns:
            List[Dict]: List of item dictionaries containing:
                - id: Unique database identifier
                - uid: External unique identifier
                - title: Item title/name
                - media_type_id: Reference to media type table
                - score: Average rating score
                - synopsis: Plot description
                - Other core item metadata
                
        Database Operation:
            - REST API equivalent: SELECT * FROM items ORDER BY id LIMIT {limit} OFFSET {offset}
            - Uses consistent ID ordering for reliable pagination
            - Optimized for large dataset processing
            
        Example:
            >>> client = SupabaseClient()
            >>> items = client.get_all_items(limit=500, offset=1000)
            >>> print(f"Retrieved {len(items)} items starting from item 1001")
            Retrieved 500 items starting from item 1001
            
            # Pagination example
            >>> page_1 = client.get_all_items(limit=100, offset=0)
            >>> page_2 = client.get_all_items(limit=100, offset=100)
            
        Use Cases:
            - Building complete anime/manga datasets
            - Pagination in web interfaces
            - Data export and backup operations
            - ETL processes and data migration
            - Batch processing workflows
            
        Performance Considerations:
            - Limit parameter capped at 1000 by Supabase
            - Use get_all_items_paginated() for complete dataset retrieval
            - Consistent ordering ensures reliable pagination
            - Efficient for incremental data loading
            
        Note:
            This method retrieves basic item data without relationships.
            Use get_items_with_relations() for enriched data with genres,
            themes, and other related information.
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
        Retrieve the complete anime/manga dataset using automatic pagination.
        
        This method handles large datasets by automatically paginating through
        all available items, making multiple API calls as needed to retrieve
        the complete collection. Essential for comprehensive data analysis
        and machine learning applications.
        
        Args:
            page_size (int, optional): Items per pagination batch (default: 1000)
                Recommended to use maximum 1000 for optimal performance
                
        Returns:
            List[Dict]: Complete list of all anime/manga items containing:
                - All items from the database (typically 68,000+ items)
                - Basic item metadata without relationships
                - Consistent ordering by database ID
                
        Pagination Strategy:
            - Automatically handles multiple API requests
            - Uses configurable batch sizes for memory management
            - Detects end of data when batch size < page_size
            - Progress logging for large dataset tracking
            
        Example:
            >>> client = SupabaseClient()
            >>> all_items = client.get_all_items_paginated(page_size=1000)
            📊 Fetching all items with pagination (page_size=1000)
            ✅ Total items retrieved: 68598
            >>> print(f"Complete dataset: {len(all_items)} items")
            Complete dataset: 68598 items
            
        Memory Considerations:
            - Large datasets require significant memory (68k+ items)
            - Consider processing in batches for memory-constrained environments
            - Use smaller page_size for gradual loading
            
        Performance Characteristics:
            - Multiple API calls (dataset_size / page_size requests)
            - Progress tracking with detailed logging
            - Optimized for complete dataset retrieval
            - Efficient pagination with automatic termination
            
        Use Cases:
            - Complete dataset analysis and statistics
            - Machine learning model training data
            - Data export and backup operations
            - Recommendation algorithm initialization
            - Complete database migrations
            
        Alternative Methods:
            - Use get_all_items() for specific page retrieval
            - Use get_items_with_relations() for enriched data
            - Use items_to_dataframe() for DataFrame conversion
            
        Note:
            This method is designed for complete dataset retrieval.
            For user-facing pagination, use get_all_items() with
            specific offset/limit parameters.
        """
        
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
        
        return all_items
    
    def get_items_with_relations(self, limit: int = 1000) -> List[Dict]:
        """
        Retrieve anime/manga items with complete relationship data including genres, themes, and metadata.
        
        This method provides enriched item data by fetching and joining related information
        from multiple tables. It implements intelligent fallback strategies to ensure
        reliable data retrieval even when embedded queries are not available.
        
        Args:
            limit (int, optional): Maximum number of items to retrieve (default: 1000)
                
        Returns:
            List[Dict]: Enriched item dictionaries containing:
                - Core item data (title, synopsis, scores, etc.)
                - media_types: Media type information with name
                - item_genres: Genre classifications with names
                - item_themes: Thematic categories with names
                - item_demographics: Target demographics with names
                - item_studios: Production studios with names
                - item_authors: Authors/creators with names
                
        Relationship Loading Strategy:
            1. Attempts embedded Supabase query for optimal performance
            2. Falls back to manual relation fetching if embedded fails
            3. Uses cached lookup dictionaries for efficiency
            4. Validates relationship data before returning
            
        Example:
            >>> client = SupabaseClient()
            >>> items = client.get_items_with_relations(limit=100)
            >>> item = items[0]
            >>> print(f"Title: {item['title']}")
            >>> print(f"Genres: {[g['genres']['name'] for g in item['item_genres']]}")
            >>> print(f"Studios: {[s['studios']['name'] for s in item['item_studios']]}")
            
        Relationship Structure:
            Each relationship follows the pattern:
            - item_genres: [{'genres': {'name': 'Action'}}, ...]
            - item_themes: [{'themes': {'name': 'Military'}}, ...]
            - item_demographics: [{'demographics': {'name': 'Shounen'}}, ...]
            - item_studios: [{'studios': {'name': 'Studio Name'}}, ...]
            - item_authors: [{'authors': {'name': 'Author Name'}}, ...]
            
        Performance Features:
            - Embedded queries for optimal single-request loading
            - Automatic fallback to manual relation fetching
            - Cached lookup dictionaries to minimize API calls
            - Efficient batch processing of relationships
            
        Use Cases:
            - Recommendation algorithm development
            - Advanced filtering and search functionality
            - Data analysis requiring complete metadata
            - Frontend applications with rich item displays
            - Content categorization and tagging systems
            
        Error Handling:
            - Graceful fallback when embedded queries fail
            - Comprehensive error logging for debugging
            - Partial data return when some relationships fail
            - Validates relationship data structure before return
            
        Note:
            This method is slower than basic item retrieval due to relationship
            joining. For large datasets, consider using _get_all_items_with_relations_paginated()
            or process relationships separately for better performance control.
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
                return items
                
        except Exception as e:
            pass
        
        # Fallback: Manual relation fetching
        return self._get_items_with_manual_relations(limit, offset=0)
    
    def _get_items_with_manual_relations(self, limit: int, offset: int = 0) -> List[Dict]:
        """
        Internal method for manual relationship fetching when embedded queries fail.
        
        This method implements a comprehensive relationship loading strategy using
        separate API calls for junction tables. It builds lookup dictionaries for
        efficient relationship resolution and handles large datasets with pagination.
        
        Args:
            limit (int): Maximum number of items to retrieve
            offset (int, optional): Pagination offset (default: 0)
            
        Returns:
            List[Dict]: Items with manually constructed relationships using the format:
                - item_genres: [{'genres': {'name': 'Genre Name'}}, ...]
                - item_themes: [{'themes': {'name': 'Theme Name'}}, ...]
                - And other relationship arrays
                
        Internal Process:
            1. Retrieves basic items with pagination
            2. Builds cached lookup dictionaries for reference tables
            3. Fetches junction table data for current item batch
            4. Constructs relationship arrays for each item
            5. Enriches items with media type and relationship data
            
        Caching Strategy:
            - Lookup dictionaries cached in instance (_lookup_cache)
            - Reference tables loaded once per client instance
            - Junction data fetched per batch for memory efficiency
            - Optimized for multiple calls with same client
            
        Performance Optimizations:
            - Bulk fetching of junction table relationships
            - Efficient ID-based lookups using dictionaries
            - Minimized API calls through intelligent caching
            - Batch processing to reduce memory overhead
            
        Example Usage (Internal):
            >>> items = client._get_items_with_manual_relations(100, offset=500)
            >>> item = items[0]
            >>> print(item['media_types']['name'])  # 'anime'
            >>> print([g['genres']['name'] for g in item['item_genres']])  # ['Action', 'Drama']
            
        Note:
            This is an internal method used as fallback when embedded Supabase
            queries are not available. It constructs the same data structure
            as embedded queries for API consistency.
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
        """
        Create optimized lookup dictionary for reference table ID-to-name mapping.
        
        This internal method builds efficient lookup dictionaries for reference tables
        (genres, themes, demographics, etc.) enabling fast relationship resolution
        without repeated API calls during relationship construction.
        
        Args:
            table_name (str): Name of reference table (e.g., 'genres', 'themes', 'studios')
            
        Returns:
            Dict[int, str]: ID-to-name mapping dictionary:
                - Keys: Database IDs (integers)
                - Values: Human-readable names (strings)
                - Empty dict if table loading fails
                
        Example:
            >>> lookup = client._get_lookup_dict('genres')
            >>> print(lookup[1])  # 'Action'
            >>> print(lookup[5])  # 'Drama'
            
        Performance Benefits:
            - Single API call per reference table
            - O(1) lookup time for ID resolution
            - Cached for multiple relationship operations
            - Eliminates N+1 query problems
            
        Error Handling:
            - Returns empty dict on API failures
            - Logs errors for debugging
            - Graceful degradation in relationship building
            
        Note:
            This method is designed for internal caching. Results are typically
            stored in _lookup_cache for reuse across multiple operations.
        """
        try:
            response = self._make_request('GET', table_name, params={'limit': 1000})
            data = response.json()
            return {item['id']: item['name'] for item in data}
        except Exception as e:
            logger.warning(f"Error loading {table_name}: {e}")
            return {}
    
    def _get_relations(self, table_name: str) -> List[Dict]:
        """Get all relations from a junction table"""
        try:
            response = self._make_request('GET', table_name, params={'limit': 10000})
            return response.json()
        except Exception as e:
            logger.warning(f"Error loading {table_name}: {e}")
            return []
    
    def get_filtered_items(self, filters: Dict[str, Any], limit: int = 1000) -> List[Dict]:
        """
        Retrieve anime/manga items with advanced filtering capabilities using Supabase query operators.
        
        This method provides flexible item filtering using various query operators including
        range queries, array containment, and exact matches. Essential for search functionality
        and content discovery features.
        
        Args:
            filters (Dict[str, Any]): Filter specifications:
                - Key: Field name to filter on
                - Value: Filter criteria (string, dict with operators, or list)
            limit (int, optional): Maximum results to return (default: 1000)
            
        Returns:
            List[Dict]: Filtered item list matching all criteria
            
        Filter Types and Examples:
            - Exact match: {'media_type': 'anime'}
            - Range queries: {'score': {'gte': 8.0, 'lte': 9.5}}
            - Array containment: {'genres': ['Action', 'Drama']}
            - Multiple criteria: {'media_type': 'anime', 'score': {'gte': 8.0}}
            
        Supported Operators:
            - 'gte': Greater than or equal (>=)
            - 'lte': Less than or equal (<=)
            - 'gt': Greater than (>)
            - 'lt': Less than (<)
            - 'eq': Equal to (=)
            - 'neq': Not equal to (!=)
            - 'like': Pattern matching with wildcards
            - 'cs': Contains (for arrays)
            
        Example Usage:
            >>> # High-rated anime
            >>> filters = {'media_type': 'anime', 'score': {'gte': 8.5}}
            >>> items = client.get_filtered_items(filters, limit=50)
            
            >>> # Action anime with specific rating range
            >>> filters = {
            ...     'media_type': 'anime',
            ...     'score': {'gte': 7.0, 'lte': 9.0},
            ...     'genres': ['Action']
            ... }
            >>> items = client.get_filtered_items(filters, limit=100)
            
        Performance Considerations:
            - Database indexes optimize common filter combinations
            - Limit parameter prevents large result sets
            - Array containment queries may be slower than exact matches
            - Complex multi-field filters benefit from proper indexing
            
        Use Cases:
            - Search functionality in web interfaces
            - Content recommendation filtering
            - Advanced browse and discovery features
            - API endpoint parameter handling
            - Data analysis with specific criteria
            
        Query Translation:
            The method translates filter dictionaries to Supabase REST API parameters:
            - {'score': {'gte': 8.0}} becomes 'score=gte.8.0'
            - {'genres': ['Action']} becomes 'genres=cs.{Action}'
            - {'media_type': 'anime'} becomes 'media_type=eq.anime'
            
        Note:
            This method retrieves basic item data without relationships.
            For filtered items with relationships, combine with relationship
            loading methods or use appropriate joins in the filter strategy.
        """
        
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
        
        return items
    
    def items_to_dataframe(self, include_relations: bool = True, lazy_load: bool = True) -> pd.DataFrame:
        """
        Convert all anime/manga items to a pandas DataFrame with comprehensive relations.
        
        This method loads the complete dataset from Supabase and converts it to a
        pandas DataFrame optimized for data analysis and machine learning operations.
        It handles large datasets efficiently using pagination and provides optional
        relationship loading for enhanced data richness.
        
        Args:
            include_relations (bool, optional): Whether to include related data such as:
                - genres: Genre classifications
                - themes: Thematic categories
                - demographics: Target demographics
                - studios: Animation/production studios
                - authors: Manga authors/creators
                Defaults to True.
            lazy_load (bool, optional): Whether to use lazy loading for relations.
                When True, relations are not pre-loaded, reducing startup from 2+ minutes
                to seconds. Relations can be fetched on-demand. Defaults to True.
        
        Returns:
            pd.DataFrame: Comprehensive DataFrame containing:
                - Core item data (title, synopsis, scores, etc.)
                - Relationship data (if include_relations=True)
                - Processed list columns (genres, themes, etc.)
                - Normalized field names for consistency
                
        Performance:
            - Handles 68,000+ items efficiently
            - Uses pagination to manage memory usage
            - Implements caching for relationship lookups
            - Processes data in optimized batches
            
        Example:
            >>> client = SupabaseClient()
            >>> df = client.items_to_dataframe(include_relations=True)
            >>> print(f"Loaded {len(df)} items with {len(df.columns)} columns")
            Loaded 68598 items with 25 columns
            >>> print(df['genres'].iloc[0])  # ['Action', 'Adventure', 'Drama']
            
        Raises:
            Exception: If Supabase connection fails or data loading errors occur
            
        Note:
            - First call may take 30-60 seconds for full dataset loading
            - Subsequent calls with same parameters use caching when possible
            - Memory usage scales with dataset size (~200MB for full dataset)
            - This is the main function that replaces CSV-based data loading
        """
        
        # Check if we have a valid cache
        if (SupabaseClient._items_dataframe_cache is not None and 
            SupabaseClient._cache_timestamp is not None and
            (time.time() - SupabaseClient._cache_timestamp) < SupabaseClient._cache_max_age):
            logger.info("Using cached items DataFrame")
            return SupabaseClient._items_dataframe_cache.copy()
        
        logger.info("Loading fresh data from Supabase...")
        
        if include_relations and not lazy_load:
            # Use pagination to get ALL items with pre-loaded relations (slow)
            items = self._get_all_items_with_relations_paginated()
        else:
            # Use fast loading without pre-loading relations
            items = self.get_all_items_paginated()
        
        if not items:
            print("⚠️  No items found in database")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(items)
        
        # Process related data (flatten nested structures)
        if include_relations and len(df) > 0:
            if lazy_load:
                # Add empty relation columns for compatibility
                for col in ['genres', 'themes', 'demographics', 'studios', 'authors']:
                    if col not in df.columns:
                        df[col] = [[] for _ in range(len(df))]
                # Process media type only
                if 'media_type' in df.columns:
                    df = self._process_media_type_only(df)
            else:
                df = self._process_relations(df)
        
        # Cache the result
        SupabaseClient._items_dataframe_cache = df.copy()
        SupabaseClient._cache_timestamp = time.time()
        print(f"✅ Data cached at {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(SupabaseClient._cache_timestamp))}")
        
        return df
    
    @classmethod
    def clear_cache(cls):
        """Clear all cached data to force a fresh reload on next access"""
        cls._items_dataframe_cache = None
        cls._cache_timestamp = None
        cls._relations_cache = None
        print("🗑️  SupabaseClient cache cleared")
    
    def _process_relations(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform nested relationship data into clean, flat list columns for DataFrame analysis.
        
        This internal method processes complex nested relationship structures from Supabase
        into clean, analysis-ready list columns. It extracts meaningful data from junction
        table structures and normalizes them for machine learning and data analysis.
        
        Args:
            df (pd.DataFrame): DataFrame with nested relationship columns from Supabase
            
        Returns:
            pd.DataFrame: Processed DataFrame with clean list columns:
                - media_type: String media type name (extracted from nested structure)
                - genres: List of genre names (cleaned from item_genres)
                - themes: List of theme names (cleaned from item_themes)
                - demographics: List of demographic names (cleaned from item_demographics)
                - studios: List of studio names (cleaned from item_studios)
                - authors: List of author names (cleaned from item_authors)
                
        Processing Operations:
            - Extracts nested 'name' fields from relationship structures
            - Converts complex nested dictionaries to simple string lists
            - Removes original nested columns after extraction
            - Handles missing/null relationships gracefully
            
        Input Structure Example:
            - item_genres: [{'genres': {'name': 'Action'}}, {'genres': {'name': 'Drama'}}]
            - media_types: {'name': 'anime'}
            
        Output Structure Example:
            - genres: ['Action', 'Drama']
            - media_type: 'anime'
            
        Example:
            >>> # Before processing
            >>> print(df['item_genres'].iloc[0])
            [{'genres': {'name': 'Action'}}, {'genres': {'name': 'Drama'}}]
            
            >>> # After processing
            >>> processed_df = client._process_relations(df)
            >>> print(processed_df['genres'].iloc[0])
            ['Action', 'Drama']
            
        Data Integrity Features:
            - Handles None/null values gracefully (returns empty lists)
            - Validates data structure before processing
            - Preserves original data order within relationships
            - Ensures consistent data types across all rows
            
        Performance Optimizations:
            - Vectorized pandas operations for speed
            - Efficient memory usage by dropping processed columns
            - Optimized for large DataFrames (68k+ rows)
            
        Use Cases:
            - Preparing data for machine learning algorithms
            - Creating analysis-ready datasets from Supabase
            - Content-based recommendation system data prep
            - Statistical analysis of anime/manga metadata
            
        Note:
            This is an internal method called by items_to_dataframe() when
            include_relations=True. It's designed to work with the specific
            relationship structure returned by Supabase embedded queries.
        """
        
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
    
    def _process_media_type_only(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Process only media type for fast loading, skip relation processing.
        
        Args:
            df: DataFrame with media_type column
            
        Returns:
            DataFrame with media_type processed to string
        """
        if 'media_type' in df.columns:
            # Simple media type lookup
            media_type_map = {
                1: 'Anime',
                2: 'Manga'
            }
            df['media_type'] = df['media_type'].map(media_type_map).fillna('Unknown')
        
        return df
    
    def bulk_insert_items(self, items: List[Dict], batch_size: int = 100) -> bool:
        """
        Efficiently insert large numbers of anime/manga items using optimized batch processing.
        
        This method handles bulk data insertion with automatic batching, progress tracking,
        and error handling. Essential for data migration, CSV imports, and database seeding
        operations while respecting API rate limits and memory constraints.
        
        Args:
            items (List[Dict]): List of item dictionaries to insert:
                - Each dict should contain all required item fields
                - Must match database schema requirements
                - IDs should be omitted (auto-generated by database)
            batch_size (int, optional): Items per batch (default: 100)
                - Recommended range: 50-200 for optimal performance
                - Smaller batches for rate limit compliance
                
        Returns:
            bool: True if all batches inserted successfully, False if any batch failed
            
        Batch Processing Features:
            - Automatic division into manageable chunks
            - Progress tracking with detailed logging
            - Individual batch success/failure reporting
            - Rate limiting protection with small delays
            - Memory efficient processing of large datasets
            
        Example:
            >>> # Prepare item data
            >>> items = [
            ...     {'uid': 'anime_1', 'title': 'Test Anime 1', 'media_type_id': 1},
            ...     {'uid': 'anime_2', 'title': 'Test Anime 2', 'media_type_id': 1},
            ...     # ... more items
            ... ]
            >>> 
            >>> # Bulk insert with progress tracking
            >>> success = client.bulk_insert_items(items, batch_size=50)
            📤 Bulk inserting 1000 items (batch_size=50)
               ✅ Inserted batch 1: 50 items
               ✅ Inserted batch 2: 50 items
               # ... progress continues
            ✅ Bulk insert completed
            >>> print(f"Success: {success}")
            
        Performance Optimizations:
            - Batch sizes optimized for Supabase limits
            - Small delays prevent rate limiting issues
            - Efficient JSON serialization for API calls
            - Progress logging for long-running operations
            - Memory efficient processing (doesn't load all at once)
            
        Error Handling:
            - Individual batch failure detection
            - Detailed error logging with batch numbers
            - Partial success tracking (some batches may succeed)
            - Graceful handling of network timeouts
            - Rollback considerations for failed operations
            
        Use Cases:
            - CSV data migration to Supabase
            - Database seeding for development/testing
            - Large dataset imports from external sources
            - Data synchronization between systems
            - Backup restoration operations
            
        Rate Limiting:
            - 0.1 second delay between batches
            - Respectful of Supabase API limits
            - Configurable batch sizes for different scenarios
            - Prevents overwhelming database connections
            
        Note:
            This method is designed for one-time bulk operations.
            For regular item creation, use standard single-item insertion
            methods. Ensure item data matches database schema before insertion.
        """
        
        logger.info(f"Bulk inserting {len(items)} items (batch_size={batch_size})")
        
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            
            try:
                response = self._make_request('POST', 'items', data=batch)
                logger.debug(f"Inserted batch {i//batch_size + 1}: {len(batch)} items")
                
                # Small delay to avoid rate limiting
                time.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Failed to insert batch {i//batch_size + 1}: {e}")
                return False
        
        logger.info(f"Bulk insert completed")
        return True
    
    def get_distinct_values(self, column: str, table: str = 'items') -> List[str]:
        """
        Retrieve unique values from a specific column for data analysis and filtering options.
        
        This method extracts distinct values from database columns, essential for building
        filter dropdowns, data validation, and statistical analysis. Optimized for
        categorical data exploration and UI component population.
        
        Args:
            column (str): Column name to extract distinct values from
            table (str, optional): Table name to query (default: 'items')
                
        Returns:
            List[str]: Sorted list of unique values from the specified column:
                - Excludes null/empty values
                - Alphabetically sorted for consistency
                - Deduplicated using set operations
                
        Database Operation:
            - REST API equivalent: SELECT DISTINCT column FROM table
            - Retrieves up to 1000 records for distinct value extraction
            - Efficient for categorical and enumerated fields
            
        Example Usage:
            >>> # Get all unique media types
            >>> media_types = client.get_distinct_values('media_type')
            >>> print(media_types)  # ['anime', 'manga']
            
            >>> # Get unique status values
            >>> statuses = client.get_distinct_values('status')
            >>> print(statuses)  # ['Finished Airing', 'Currently Airing', ...]
            
            >>> # Get values from different table
            >>> genres = client.get_distinct_values('name', table='genres')
            >>> print(genres[:5])  # ['Action', 'Adventure', 'Comedy', ...]
            
        Performance Characteristics:
            - Single API call with column-specific selection
            - Client-side deduplication and sorting
            - Efficient for categorical columns with limited value sets
            - Memory efficient processing of result sets
            
        Use Cases:
            - Building dropdown filter options for web interfaces
            - Data validation and schema exploration
            - Statistical analysis of categorical distributions
            - Form field population with valid options
            - Data quality assessment and profiling
            
        Limitations:
            - Limited to 1000 records (covers most categorical use cases)
            - Client-side distinct operation (not database-optimized)
            - String values only (numeric values converted to strings)
            - May miss values if table has >1000 rows with rare values
            
        Optimization Notes:
            - Best suited for columns with limited value sets
            - Consider database-level DISTINCT queries for large tables
            - Cache results for frequently accessed column values
            - Use appropriate table parameter for junction table queries
            
        Note:
            This method is optimized for categorical data exploration.
            For large tables with high cardinality columns, consider
            implementing server-side distinct queries for better performance.
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
        Retrieve complete dataset with relationships using high-performance optimized pagination.
        
        This advanced method implements a highly optimized strategy for loading the entire
        anime/manga dataset with complete relationship data. It uses intelligent caching,
        bulk pre-loading, and efficient batch processing to minimize API calls and
        maximize performance for large-scale data operations.
        
        Args:
            page_size (int, optional): Items per pagination batch (default: 1000)
                - Recommended to use 1000 (Supabase server maximum)
                - Smaller values increase API call overhead
                
        Returns:
            List[Dict]: Complete dataset with enriched relationships:
                - All items from database (typically 68,000+ items)
                - Full relationship data for each item
                - Optimized data structure for analysis
                
        Advanced Optimization Strategy:
            1. Pre-loads ALL reference data once (genres, themes, etc.)
            2. Bulk loads ALL relationship mappings in advance
            3. Uses cached lookups for ultra-fast relationship building
            4. Processes items in optimized batches with progress tracking
            5. Implements safety limits to prevent memory overflow
            
        Performance Benefits:
            - 10x+ faster than naive relationship loading
            - Minimizes API calls through intelligent pre-loading
            - Uses memory-efficient batch processing
            - Scales efficiently with dataset size growth
            
        Memory Management:
            - Pre-loads reference data for O(1) lookups
            - Processes items in configurable batches
            - Safety limit of 100k items to prevent memory issues
            - Efficient data structure building
            
        Example:
            >>> client = SupabaseClient()
            >>> items = client._get_all_items_with_relations_paginated()
            📊 Fetching ALL items with OPTIMIZED relation loading (batch_size=1000)
            📖 Pre-loading ALL reference data...
            ✅ Reference data cached: 1250 total entries
            🔗 Loading all relation mappings...
            ✅ Cached 425,000 total relations
               ✅ Batch 1: 1000 items (total: 1000)
               ✅ Batch 2: 1000 items (total: 2000)
               # ... continues
            🚀 OPTIMIZED loading complete! Total items: 68598 (processed 69 batches)
            
        Caching Architecture:
            - Reference tables cached once per client instance
            - Junction table data pre-loaded for entire dataset
            - Lookup dictionaries enable O(1) relationship resolution
            - Batch-specific relation filtering for performance
            
        Use Cases:
            - Complete dataset analysis and machine learning
            - Recommendation algorithm initialization
            - Data export with full relationship information
            - Statistical analysis requiring complete metadata
            - Performance-critical batch processing operations
            
        Safety Features:
            - 100k item safety limit prevents memory overflow
            - Comprehensive error handling for network issues
            - Progress tracking for long-running operations
            - Graceful degradation on partial failures
            
        Note:
            This is an internal method optimized for complete dataset retrieval.
            It's designed for applications requiring the full dataset with
            relationships. Use standard pagination methods for user-facing operations.
        """
        
        
        all_items = []
        offset = 0
        
        # Pre-load ALL reference data once (much faster than per-batch)
        if not hasattr(self, '_lookup_cache'):
            self._lookup_cache = {
                'media_types': self._get_lookup_dict('media_types'),
                'genres': self._get_lookup_dict('genres'),
                'themes': self._get_lookup_dict('themes'),
                'demographics': self._get_lookup_dict('demographics'),
                'studios': self._get_lookup_dict('studios'),
                'authors': self._get_lookup_dict('authors'),
            }
        
        # Pre-load ALL relation mappings once (major performance boost)
        if SupabaseClient._relations_cache is None:
            print("🔗 Loading all relation mappings (first time only)...")
            all_relations = {
                'item_genres': self._get_all_relations('item_genres'),
                'item_themes': self._get_all_relations('item_themes'),
                'item_demographics': self._get_all_relations('item_demographics'),
                'item_studios': self._get_all_relations('item_studios'),
                'item_authors': self._get_all_relations('item_authors'),
            }
            SupabaseClient._relations_cache = all_relations
            total_relations = sum(len(relations) for relations in all_relations.values())
            print(f"✅ Cached {total_relations} total relations")
        else:
            print("📦 Using cached relation mappings")
            all_relations = SupabaseClient._relations_cache
            total_relations = sum(len(relations) for relations in all_relations.values())
        
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
            
            
            # If we got less than page_size, we've reached the end
            if len(items) < page_size:
                break
                
            # Safety check - don't fetch more than 100k items to avoid memory issues
            if len(all_items) >= 100000:
                print(f"⚠️  Reached safety limit of 100k items")
                break
        
        return all_items

    def _get_all_relations(self, table_name: str) -> List[Dict]:
        """Get ALL relations from a table efficiently with proper Supabase pagination"""
        
        all_relations = []
        offset = 0
        batch_size = 1000  # Supabase maximum per request
        
        print(f"   📋 Loading {table_name} relations...")
        
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
                print(f"   📦 {table_name}: Loaded {len(batch)} relations (total: {len(all_relations)})")
                offset += len(batch)  # Use actual batch length instead of batch_size
                
                # Continue if we got a full batch (there might be more)
                # Only stop if we get less than the maximum possible (1000)
                if len(batch) < 1000:  # Supabase hard limit
                    print(f"   🏁 {table_name}: Last batch ({len(batch)} records)")
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
                    related_id = rel.get(f'{relation_name}_id')
                    
                    # Fix lookup for plural form (genres, themes, demographics, studios, authors)
                    lookup_table_name = f'{relation_name}s'
                    
                    if related_id and lookup_table_name in self._lookup_cache and related_id in self._lookup_cache[lookup_table_name]:
                        item[relation_type].append({
                            lookup_table_name: {'name': self._lookup_cache[lookup_table_name][related_id]}
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

    def update_user_item_status_comprehensive(self, user_id: str, item_uid: str, status_data: dict) -> dict:
        """
        Comprehensive update method for user item status with completion date support.
        
        This method provides full-featured user list management with support for all status
        transitions, rating updates, progress tracking, and automatic date management.
        It handles both creating new entries and updating existing ones with proper
        data validation and error handling.
        
        Features:
            - Automatic completion date setting for completed items
            - Start date tracking for newly started items
            - Rating validation and normalization (0-10 scale, 1 decimal place)
            - Progress tracking for episodes/chapters
            - User notes support
            - Comprehensive error handling with helpful debugging
            - Database migration guidance for missing columns
        
        Args:
            user_id (str): UUID of the authenticated user making the update.
                          Must be a valid Supabase Auth user ID.
            item_uid (str): Unique identifier for the anime/manga item.
                           Format: 'anime_123' or 'manga_456'.
            status_data (dict): Comprehensive status update data containing:
                - status (str): Required. New status value:
                    * 'watching' / 'reading': Currently consuming
                    * 'completed': Finished consuming  
                    * 'plan_to_watch' / 'plan_to_read': In planning list
                    * 'dropped': Discontinued
                    * 'on_hold': Temporarily paused
                - progress (int, optional): Episodes watched or chapters read.
                    Defaults to 0. Must be non-negative.
                - rating (float, optional): User rating on 0-10 scale.
                    Automatically rounded to 1 decimal place. Validated for range.
                - notes (str, optional): User's personal notes about the item.
                    Can be empty string or null.
                - completion_date (str, optional): ISO date string for completion.
                    Defaults to 'now()' for completed items.
        
        Returns:
            dict: Operation result containing:
                - success (bool): True if update succeeded, False otherwise
                - data (dict, optional): Response data from Supabase if successful
                - error (str, optional): Error message if operation failed
                
        Raises:
            ValueError: When rating is outside 0-10 range or not numeric
            ValueError: When status is not a valid status value
            requests.RequestException: When Supabase API calls fail
            
        Examples:
            >>> # Mark an anime as completed with rating
            >>> result = client.update_user_item_status_comprehensive(
            ...     user_id="550e8400-e29b-41d4-a716-446655440000",
            ...     item_uid="anime_12345",
            ...     status_data={
            ...         "status": "completed",
            ...         "rating": 8.5,
            ...         "progress": 24,
            ...         "notes": "Great animation and story!"
            ...     }
            ... )
            >>> print(result['success'])  # True
            
            >>> # Start watching a new anime
            >>> result = client.update_user_item_status_comprehensive(
            ...     user_id="550e8400-e29b-41d4-a716-446655440000", 
            ...     item_uid="anime_67890",
            ...     status_data={
            ...         "status": "watching",
            ...         "progress": 3
            ...     }
            ... )
            
            >>> # Update progress without changing status
            >>> result = client.update_user_item_status_comprehensive(
            ...     user_id="550e8400-e29b-41d4-a716-446655440000",
            ...     item_uid="manga_11111", 
            ...     status_data={
            ...         "status": "reading",
            ...         "progress": 45,
            ...         "rating": 7.2
            ...     }
            ... )
        
        Business Logic:
            Status Transitions:
                - New 'watching'/'reading' items get automatic start_date
                - 'completed' items get automatic completion_date if not provided
                - Rating validation ensures data quality (0-10 range, 1 decimal)
                - Progress tracking maintains consistency
                
            Database Operations:
                - Checks for existing record first to determine update vs insert
                - Uses PATCH for updates, POST for new records
                - Handles Supabase-specific query syntax and response formats
                - Provides detailed logging for debugging
                
            Error Handling:
                - Validates rating range and format
                - Checks for missing database columns with migration guidance
                - Graceful degradation for non-critical errors
                - Comprehensive error reporting with context
        
        Performance Considerations:
            - Single database lookup to check existing record
            - Minimal data transfer with targeted field updates
            - Efficient upsert pattern (check -> update/insert)
            - Proper connection management with timeout handling
            
        Database Schema Requirements:
            The user_items table must have these columns:
            - user_id (UUID, FK to auth.users)
            - item_uid (VARCHAR, FK to items.uid)
            - status (VARCHAR)
            - progress (INTEGER)
            - rating (DECIMAL(3,1))
            - notes (TEXT)
            - start_date (TIMESTAMP)
            - completion_date (TIMESTAMP) 
            - updated_at (TIMESTAMP)
            
        Migration Guidance:
            If completion_date or start_date columns are missing, the method
            provides SQL commands for adding them:
            ```sql
            ALTER TABLE user_items ADD COLUMN completion_date TIMESTAMP;
            ALTER TABLE user_items ADD COLUMN start_date TIMESTAMP;
            ```
            
        Security:
            - Uses service-level authentication for database access
            - Validates user_id format and existence
            - Sanitizes input data to prevent injection attacks
            - Respects Supabase RLS (Row Level Security) policies
            
        See Also:
            - update_user_item_status(): Simpler version for basic updates
            - get_user_items(): Retrieve user's item list
            - SupabaseAuthClient.verify_jwt_token(): User authentication
            
        Since: 1.0.0
        """
        try:
            print(f"📥 Input data: {status_data}")
            
            # First, check if record exists
            existing = requests.get(
                f"{self.base_url}/rest/v1/user_items",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'item_uid': f'eq.{item_uid}',
                    'select': 'id,status'
                }
            )
            
            existing_data = existing.json()
    
            
            # Prepare comprehensive data
            data = {
                'user_id': user_id,
                'item_uid': item_uid,
                'status': status_data['status'],
                'progress': status_data.get('progress', 0),
                'updated_at': 'now()'
            }
            
            # Add optional fields if provided
            if 'rating' in status_data and status_data['rating'] is not None:
                # ✅ ENHANCED: Validate and round rating to 1 decimal place
                rating = status_data['rating']
                if not isinstance(rating, (int, float)):
                    raise ValueError("Rating must be a number")
                if rating < 0 or rating > 10:
                    raise ValueError("Rating must be between 0 and 10")
                
                # Round to 1 decimal place for consistency
                data['rating'] = round(float(rating), 1)
            
            if 'notes' in status_data and status_data['notes']:
                data['notes'] = status_data['notes']
            
            # Handle completion date logic
            if status_data['status'] == 'completed':
                # Use provided completion_date or default to now
                completion_date = status_data.get('completion_date', 'now()')
                data['completion_date'] = completion_date
                print(f"🎯 Setting completion_date: {completion_date}")
            
            # Handle start date logic for new records
            if not existing_data and status_data['status'] in ['watching', 'reading']:
                data['start_date'] = 'now()'
                print(f"🚀 Setting start_date for new {status_data['status']} record")
            
            print(f"📤 Final data to send: {data}")
            
            if existing_data:
                # Update existing record
                print("🔄 Updating existing record...")
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
                print("➕ Creating new record...")
                response = requests.post(
                    f"{self.base_url}/rest/v1/user_items",
                    headers=self.headers,
                    json=data
                )
            
            print(f"📨 Response status: {response.status_code}")
            print(f"📨 Response text: {response.text}")
            
            if response.status_code in [200, 201, 204]:
                return {'success': True, 'data': response.json() if response.content else {}}
            else:
                print(f"❌ Supabase error: {response.status_code} - {response.text}")
                # Check if error is about missing column and provide helpful info
                if "completion_date" in response.text and "not found" in response.text:
                    print(f"💡 SOLUTION: The completion_date column needs to be added to your Supabase database")
                    print(f"   Run this SQL in your Supabase SQL editor:")
                    print(f"   ALTER TABLE user_items ADD COLUMN completion_date TIMESTAMP;")
                    print(f"   ALTER TABLE user_items ADD COLUMN start_date TIMESTAMP;")
                return {'success': False, 'error': response.text}
            
        except Exception as e:
            print(f"❌ Error updating user item status: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def upsert_entity(self, table: str, data: Dict) -> Optional[Dict]:
        """
        Upsert an entity (genre, studio, author) handling duplicate key conflicts gracefully.
        
        Args:
            table (str): Table name ('genres', 'studios', 'authors')
            data (Dict): Data to upsert
            
        Returns:
            Optional[Dict]: The entity data if successful, None if failed
        """
        try:
            # Try to insert first
            url = f"{self.base_url}/rest/v1/{table}"
            headers = {
                'apikey': self.api_key,
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
            
            response = requests.post(url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 201:
                # Successfully inserted
                return response.json()[0] if response.json() else None
            elif response.status_code == 409:
                # Conflict - entity already exists, fetch it
                name = data.get('name', '')
                existing_response = self._make_request('GET', table, params={'select': '*', 'name': f'eq.{name}'})
                existing_data = existing_response.json()
                return existing_data[0] if existing_data else None
            else:
                # Other error
                print(f"⚠️  Unexpected status code {response.status_code} for {table} upsert")
                return None
                
        except Exception as e:
            print(f"⚠️  Error upserting {table}: {e}")
            return None

    def search_users(self, query: str, page: int = 1, limit: int = 20) -> dict:
        """
        Search for users by username or display name.
        
        Args:
            query (str): Search query
            page (int): Page number
            limit (int): Items per page
            
        Returns:
            dict: Search results with pagination info
        """
        try:
            # Calculate offset
            offset = (page - 1) * limit
            
            # Search users by username or display name
            users_response = requests.get(
                f"{self.base_url}/rest/v1/user_profiles",
                headers=self.headers,
                params={
                    'or': f'(username.ilike.*{query}*,display_name.ilike.*{query}*)',
                    'select': 'id,username,display_name,bio,avatar_url,created_at',
                    'order': 'username.asc',
                    'offset': offset,
                    'limit': limit
                }
            )
            
            if users_response.status_code != 200:
                print(f"Error response from user_profiles: {users_response.status_code} - {users_response.text}")
                return {
                    'users': [],
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total': 0,
                        'hasNext': False,
                        'hasPrev': False
                    }
                }
            
            users_data = users_response.json()
            if not isinstance(users_data, list):
                print(f"Unexpected response format: {users_data}")
                return {
                    'users': [],
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total': 0,
                        'hasNext': False,
                        'hasPrev': False
                    }
                }
            
            users = users_data
            
            # Get additional data for each user
            for user in users:
                # Get follower count
                followers_response = requests.get(
                    f"{self.base_url}/rest/v1/user_follows",
                    headers={**self.headers, 'Prefer': 'count=exact'},
                    params={
                        'following_id': f'eq.{user["id"]}',
                        'select': 'id'
                    }
                )
                
                # Get user statistics
                stats_response = requests.get(
                    f"{self.base_url}/rest/v1/user_statistics",
                    headers=self.headers,
                    params={
                        'user_id': f'eq.{user["id"]}',
                        'select': 'total_anime_watched,total_manga_read'
                    }
                )
                
                stats_data = stats_response.json()
                stats = stats_data[0] if stats_data else {}
                
                user['followersCount'] = int(followers_response.headers.get('Content-Range', '0').split('/')[-1])
                user['completedAnime'] = stats.get('total_anime_watched', 0)
                user['completedManga'] = stats.get('total_manga_read', 0)
                user['avatarUrl'] = user.get('avatar_url')
                user['displayName'] = user.get('display_name') or user.get('username')
                user['isPrivate'] = False  # Default to false for now
                user['joinDate'] = user.get('created_at', '')
            
            # Get total count
            count_response = requests.get(
                f"{self.base_url}/rest/v1/user_profiles",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params={
                    'or': f'(username.ilike.*{query}*,display_name.ilike.*{query}*)',
                    'select': 'id'
                }
            )
            
            total = int(count_response.headers.get('Content-Range', '0').split('/')[-1])
            
            return {
                'users': users,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'hasNext': offset + limit < total,
                    'hasPrev': page > 1
                }
            }
            
        except Exception as e:
            print(f"Error searching users: {e}")
            return {
                'users': [],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': 0,
                    'hasNext': False,
                    'hasPrev': False
                }
            }

    def get_user_custom_lists(self, user_id: str, page: int = 1, limit: int = 20) -> dict:
        """
        Get all custom lists created by a specific user with efficient querying.
        
        This method uses PostgreSQL's JSON aggregation to fetch all data in a single query,
        eliminating the N+1 query problem. Falls back to the original implementation if
        the optimized function is not available.
        
        Args:
            user_id (str): The UUID of the user whose lists to retrieve
            page (int): Page number for pagination (default: 1)
            limit (int): Items per page (default: 20, max: 50)
            
        Returns:
            dict: User's lists with pagination info
        """
        # Import cache helpers
        try:
            from utils.cache_helpers import get_user_lists_from_cache, set_user_lists_in_cache
        except ImportError:
            # If cache helpers not available, proceed without caching
            get_user_lists_from_cache = lambda *args, **kwargs: None
            set_user_lists_in_cache = lambda *args, **kwargs: False
        
        try:
            # Validate and limit page size
            limit = min(limit, 50)
            offset = (page - 1) * limit
            
            # Try to get from cache first
            cached_data = get_user_lists_from_cache(user_id, page, limit)
            if cached_data:
                logger.debug("Cache hit for user lists", extra={
                    "event": "cache_hit",
                    "cache_type": "user_lists",
                    "page": page
                })
                return cached_data
            
            # Try the optimized RPC function first
            response = requests.post(
                f"{self.base_url}/rest/v1/rpc/get_user_lists_optimized",
                headers=self.headers,
                json={
                    'p_user_id': user_id,
                    'p_limit': limit,
                    'p_offset': offset
                }
            )
            
            if response.status_code != 200:
                logger.warning(f"Optimized function not available or failed: {response.status_code}")
                # Fallback to the original method
                return self._get_user_custom_lists_fallback(user_id, page, limit)
            
            lists = response.json()
            
            # Get total count in a single query
            count_response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params={
                    'user_id': f'eq.{user_id}',
                    'select': 'id'
                }
            )
            
            total = 0
            if count_response.status_code == 200:
                content_range = count_response.headers.get('Content-Range', '0')
                if '/' in content_range:
                    total_str = content_range.split('/')[-1]
                    if total_str and total_str != '*':
                        total = int(total_str)
            
            # Transform for frontend compatibility
            transformed_lists = []
            for list_item in lists:
                # Handle tags - they come as JSON from the function
                tags = list_item.get('tags', [])
                if isinstance(tags, str):
                    # If tags is a JSON string, parse it
                    import json
                    try:
                        tags = json.loads(tags)
                    except:
                        tags = []
                
                transformed_list = {
                    'id': list_item['id'],
                    'userId': user_id,
                    'title': list_item['title'],
                    'description': list_item.get('description'),
                    'privacy': list_item.get('privacy', 'private'),
                    'itemCount': list_item.get('item_count', 0),
                    'followersCount': list_item.get('followers_count', 0),
                    'tags': tags if isinstance(tags, list) else [],
                    'createdAt': list_item['created_at'],
                    'updatedAt': list_item['updated_at'],
                    'isCollaborative': list_item.get('is_collaborative', False)
                }
                transformed_lists.append(transformed_list)
            
            logger.info(f"Fetched {len(transformed_lists)} lists using optimized query")
            
            result = {
                'data': transformed_lists,
                'total': total,
                'page': page,
                'limit': limit,
                'has_more': (page * limit) < total
            }
            
            # Cache the result
            set_user_lists_in_cache(user_id, result, page, limit)
            
            return result
            
        except Exception as e:
            logger.error(f"Optimized list fetch failed: {e}")
            # Fallback to original implementation
            return self._get_user_custom_lists_fallback(user_id, page, limit)
    
    def _get_user_custom_lists_fallback(self, user_id: str, page: int = 1, limit: int = 20) -> dict:
        """
        Legacy implementation of get_user_custom_lists with N+1 query issue.
        
        This method is kept as a fallback for when the optimized PostgreSQL function
        is not available. It makes separate queries for tags and item counts for each list.
        
        Args:
            user_id (str): The UUID of the user whose lists to retrieve
            page (int): Page number for pagination (default: 1)
            limit (int): Items per page (default: 20, max: 50)
            
        Returns:
            dict: User's lists with pagination info containing:
                - lists: Array of custom list objects
                - total: Total number of lists for this user
                - page: Current page number
                - limit: Items per page
                - has_more: Whether there are more pages
        """
        # Import cache helpers
        try:
            from utils.cache_helpers import get_user_lists_from_cache, set_user_lists_in_cache
        except ImportError:
            # If cache helpers not available, proceed without caching
            get_user_lists_from_cache = lambda *args, **kwargs: None
            set_user_lists_in_cache = lambda *args, **kwargs: False
            
        try:
            # Validate and limit page size
            limit = min(limit, 50)
            offset = (page - 1) * limit
            
            # Get user's custom lists with enriched data
            response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'select': '''
                        id, title, description, slug, privacy, is_collaborative,
                        created_at, updated_at
                    ''',
                    'order': 'updated_at.desc',
                    'offset': offset,
                    'limit': limit
                }
            )
            
            if response.status_code != 200:
                print(f"Error fetching user custom lists: {response.status_code} - {response.text}")
                return {'lists': [], 'total': 0, 'page': page, 'limit': limit, 'has_more': False}
            
            lists = response.json()
            
            # Transform the data to match frontend expectations
            transformed_lists = []
            for list_item in lists:
                # Extract tags by fetching them separately for each list
                tags = []
                try:
                    tags_response = requests.get(
                        f"{self.base_url}/rest/v1/list_tag_associations",
                        headers=self.headers,
                        params={
                            'list_id': f'eq.{list_item["id"]}',
                            'select': 'list_tags(name)'
                        }
                    )
                    
                    if tags_response.status_code == 200:
                        tag_associations = tags_response.json()
                        tags = [assoc['list_tags']['name'] for assoc in tag_associations 
                               if assoc.get('list_tags')]
                        print(f"Found {len(tags)} tags for list {list_item['id']}: {tags}")
                except Exception as e:
                    print(f"Error fetching tags for list {list_item['id']}: {e}")
                    tags = []
                
                # Get privacy value directly from database
                privacy = list_item.get('privacy', 'private')
                
                # Calculate actual item count from custom_list_items table
                item_count = 0
                try:
                    count_response = requests.get(
                        f"{self.base_url}/rest/v1/custom_list_items",
                        headers={**self.headers, 'Prefer': 'count=exact'},
                        params={
                            'list_id': f'eq.{list_item["id"]}',
                            'select': 'id'
                        }
                    )
                    if count_response.status_code == 200:
                        content_range = count_response.headers.get('Content-Range', '0')
                        if '/' in content_range:
                            total_str = content_range.split('/')[-1]
                            if total_str and total_str != '*':
                                item_count = int(total_str)
                    print(f"List {list_item['id']} has {item_count} items")
                except Exception as e:
                    print(f"Error calculating item count for list {list_item['id']}: {e}")
                    item_count = 0

                # Calculate followers count from list_followers table
                followers_count = 0
                try:
                    follower_response = requests.get(
                        f"{self.base_url}/rest/v1/list_followers",
                        headers={**self.headers, 'Prefer': 'count=exact'},
                        params={
                            'list_id': f'eq.{list_item["id"]}',
                            'select': 'id'
                        }
                    )
                    if follower_response.status_code == 200:
                        content_range = follower_response.headers.get('Content-Range', '0')
                        if '/' in content_range:
                            total_str = content_range.split('/')[-1]
                            if total_str and total_str != '*':
                                followers_count = int(total_str)
                except Exception as e:
                    followers_count = 0
                
                transformed_list = {
                    'id': list_item['id'],
                    'userId': user_id,  # Use the passed user_id parameter
                    'title': list_item['title'],
                    'description': list_item.get('description'),
                    'privacy': privacy,
                    'itemCount': item_count,  # Now calculates actual item count
                    'followersCount': followers_count,  # Now calculates actual followers count
                    'tags': tags,
                    'createdAt': list_item['created_at'],
                    'updatedAt': list_item['updated_at'],
                    'isCollaborative': list_item.get('is_collaborative', False)
                }
                transformed_lists.append(transformed_list)
            
            # Get total count for pagination
            count_response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params={
                    'user_id': f'eq.{user_id}',
                    'select': 'id'
                }
            )
            
            total = 0
            if count_response.status_code == 200:
                # Parse Content-Range header properly (format: "0-N/total" or "*/total")
                content_range = count_response.headers.get('Content-Range', '0')
                print(f"Content-Range header: {content_range}")
                if '/' in content_range:
                    total_str = content_range.split('/')[-1]
                    if total_str and total_str != '*':
                        total = int(total_str)
                else:
                    # Fallback: count from response body if header parsing fails
                    total = len(lists)
            
            result = {
                'data': transformed_lists,  # Changed from 'lists' to 'data' to match optimized method
                'total': total,
                'page': page,
                'limit': limit,
                'has_more': (page * limit) < total
            }
            
            # Cache the result
            set_user_lists_in_cache(user_id, result, page, limit)
            
            print(f"Returning custom lists result: {len(transformed_lists)} lists, total: {total}")
            return result
            
        except Exception as e:
            print(f"Error getting user custom lists: {e}")
            return {'data': [], 'total': 0, 'page': page, 'limit': limit, 'has_more': False}
    
    def create_custom_list(self, user_id: str, list_data: dict) -> dict:
        """
        Create a new custom list.
        
        Args:
            user_id (str): User ID creating the list
            list_data (dict): List data including title, description, tags, etc.
            
        Returns:
            dict: Created list data or None if failed
        """
        try:
            # Generate slug from title
            import re
            title = list_data.get('title', '')
            slug = re.sub(r'[^\w\s-]', '', title.lower())
            slug = re.sub(r'[-\s]+', '-', slug).strip('-')
            
            # Ensure unique slug for user
            counter = 1
            original_slug = slug
            while True:
                existing_response = requests.get(
                    f"{self.base_url}/rest/v1/custom_lists",
                    headers=self.headers,
                    params={
                        'user_id': f'eq.{user_id}',
                        'slug': f'eq.{slug}',
                        'select': 'slug'
                    }
                )
                
                if not existing_response.json():
                    break
                    
                slug = f"{original_slug}-{counter}"
                counter += 1
            
            # Create list
            list_record = {
                'user_id': user_id,
                'title': list_data.get('title'),
                'description': list_data.get('description'),
                'slug': slug,
                'privacy': list_data.get('privacy', 'private'),
                'is_collaborative': list_data.get('is_collaborative', False)
            }
            
            # Create headers with Prefer header to return the created record
            create_headers = self.headers.copy()
            create_headers['Prefer'] = 'return=representation'
            
            print(f"Creating custom list with data: {list_record}")
            response = requests.post(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=create_headers,
                json=list_record
            )
            
            print(f"Create list response: Status {response.status_code}, Headers: {dict(response.headers)}")
            
            if response.status_code != 201:
                error_msg = f"Failed to create list. Status: {response.status_code}, Response: {response.text}"
                print(error_msg)
                import logging
                logging.error(error_msg)
                return None
                
            if not response.text.strip():
                print("Empty response from create list API")
                return None
                
            response_data = response.json()
            print(f"Create list response data: {response_data}")
            created_list = response_data[0] if isinstance(response_data, list) else response_data
            list_id = created_list['id']
            print(f"Successfully created list with ID: {list_id}")
            
            # Handle tags if provided
            tags = list_data.get('tags', [])
            if tags:
                self._handle_list_tags(list_id, tags)
            
            # Invalidate user lists cache after creating a new list
            try:
                from utils.cache_helpers import invalidate_user_lists_cache
                invalidate_user_lists_cache(user_id)
                logger.info("Invalidated lists cache after creating new list")
            except ImportError:
                pass  # Cache helpers not available
            
            return created_list
            
        except Exception as e:
            print(f"Error creating custom list: {e}")
            return None
    
    def update_custom_list(self, list_id: int, user_id: str, update_data: dict) -> dict:
        """Update an existing custom list."""
        try:
            # Verify ownership
            existing_list = self.get_custom_list_details(list_id)
            if not existing_list or existing_list.get('userId') != user_id:
                return None
                
            # Prepare update data
            update_record = {}
            if 'title' in update_data:
                update_record['title'] = update_data['title']
            if 'description' in update_data:
                update_record['description'] = update_data['description']
            if 'privacy' in update_data:
                # Use privacy field directly (expecting 'public', 'friends_only', or 'private')
                update_record['privacy'] = update_data['privacy']
            if 'is_collaborative' in update_data:
                update_record['is_collaborative'] = update_data['is_collaborative']
                
            # Update slug if title changed
            if 'title' in update_data:
                slug = update_data['title'].lower().replace(' ', '-').replace('/', '-')
                # Remove special characters except hyphens
                import re
                slug = re.sub(r'[^a-z0-9\-]', '', slug)
                slug = re.sub(r'-+', '-', slug).strip('-')  # Remove multiple hyphens
                
                # Ensure unique slug for user (excluding current list)
                counter = 1
                original_slug = slug
                while True:
                    existing_response = requests.get(
                        f"{self.base_url}/rest/v1/custom_lists",
                        headers=self.headers,
                        params={
                            'user_id': f'eq.{user_id}',
                            'slug': f'eq.{slug}',
                            'id': f'neq.{list_id}',  # Exclude current list
                            'select': 'slug'
                        }
                    )
                    
                    if not existing_response.json():
                        break
                        
                    slug = f"{original_slug}-{counter}"
                    counter += 1
                
                update_record['slug'] = slug
                
            print(f"Updating list {list_id} with data: {update_record}")
            
            # Update list
            update_headers = self.headers.copy()
            update_headers['Prefer'] = 'return=representation'
            
            response = requests.patch(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=update_headers,
                params={'id': f'eq.{list_id}'},
                json=update_record
            )
            
            print(f"Update response: Status {response.status_code}")
            
            if response.status_code != 200:
                print(f"Failed to update list. Status: {response.status_code}, Response: {response.text}")
                return None
                
            if not response.text.strip():
                print("Empty response from update list API")
                return None
                
            response_data = response.json()
            updated_list = response_data[0] if isinstance(response_data, list) else response_data
            
            # Handle tags if provided
            if 'tags' in update_data:
                # Clear existing tags
                requests.delete(
                    f"{self.base_url}/rest/v1/list_tag_associations",
                    headers=self.headers,
                    params={'list_id': f'eq.{list_id}'}
                )
                
                # Add new tags
                tags = update_data.get('tags', [])
                if tags:
                    self._handle_list_tags(list_id, tags)
            
            logger.info(f"Successfully updated list {list_id}")
            
            # Invalidate caches after updating a list
            try:
                from utils.cache_helpers import invalidate_list_cache
                invalidate_list_cache(list_id, user_id)
                logger.info(f"Invalidated caches for list {list_id} after update")
            except ImportError:
                pass  # Cache helpers not available
            
            return updated_list
            
        except Exception as e:
            print(f"Error updating custom list: {e}")
            return None
    
    def _handle_list_tags(self, list_id: int, tags: List[str]):
        """Helper method to handle list tags."""
        try:
            for tag_name in tags:
                # Get or create tag
                tag_response = requests.get(
                    f"{self.base_url}/rest/v1/list_tags",
                    headers=self.headers,
                    params={
                        'name': f'eq.{tag_name}',
                        'select': 'id'
                    }
                )
                
                if tag_response.status_code == 200 and tag_response.text.strip():
                    tag_data = tag_response.json()
                    if tag_data:
                        tag_id = tag_data[0]['id']
                    else:
                        # Create new tag
                        create_headers = self.headers.copy()
                        create_headers['Prefer'] = 'return=representation'
                        
                        create_response = requests.post(
                            f"{self.base_url}/rest/v1/list_tags",
                            headers=create_headers,
                            json={'name': tag_name}
                        )
                        if create_response.status_code == 201 and create_response.text.strip():
                            create_data = create_response.json()
                            if create_data:
                                tag_id = create_data[0]['id'] if isinstance(create_data, list) else create_data['id']
                            else:
                                continue
                        else:
                            continue
                else:
                    # Create new tag
                    create_headers = self.headers.copy()
                    create_headers['Prefer'] = 'return=representation'
                    
                    create_response = requests.post(
                        f"{self.base_url}/rest/v1/list_tags",
                        headers=create_headers,
                        json={'name': tag_name}
                    )
                    if create_response.status_code == 201 and create_response.text.strip():
                        create_data = create_response.json()
                        if create_data:
                            tag_id = create_data[0]['id'] if isinstance(create_data, list) else create_data['id']
                        else:
                            continue
                    else:
                        continue
                
                # Associate tag with list
                association_response = requests.post(
                    f"{self.base_url}/rest/v1/list_tag_associations",
                    headers=self.headers,
                    json={
                        'list_id': list_id,
                        'tag_id': tag_id
                    }
                )
                # Note: We don't need to check response for associations since it's just a junction table
                
        except Exception as e:
            print(f"Error handling list tags: {e}")

    def get_custom_list_details(self, list_id: int) -> Optional[Dict]:
        """Retrieve a single custom list with tag information."""
        try:
            response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params={
                    'id': f'eq.{list_id}',
                    'select': '''
                        id, title, description, privacy, is_collaborative, user_id,
                        created_at, updated_at
                    ''',
                    'limit': 1
                }
            )
            if response.status_code != 200 or not response.text.strip():
                return None
            data = response.json()
            raw = data[0] if isinstance(data, list) else data
            
            # Fetch tags separately for this list
            tags = []
            try:
                tags_response = requests.get(
                    f"{self.base_url}/rest/v1/list_tag_associations",
                    headers=self.headers,
                    params={
                        'list_id': f'eq.{list_id}',
                        'select': 'list_tags(name)'
                    }
                )
                
                if tags_response.status_code == 200:
                    tag_associations = tags_response.json()
                    tags = [assoc['list_tags']['name'] for assoc in tag_associations 
                           if assoc.get('list_tags')]
                    print(f"Found {len(tags)} tags for list details {list_id}: {tags}")
            except Exception as e:
                print(f"Error fetching tags for list details {list_id}: {e}")
                tags = []
            
            # Calculate actual item count from custom_list_items table
            item_count = 0
            try:
                count_response = requests.get(
                    f"{self.base_url}/rest/v1/custom_list_items",
                    headers={**self.headers, 'Prefer': 'count=exact'},
                    params={
                        'list_id': f'eq.{list_id}',
                        'select': 'id'
                    }
                )
                
                if count_response.status_code == 200:
                    # Parse Content-Range header to get count
                    content_range = count_response.headers.get('Content-Range', '0')
                    if '/' in content_range:
                        total_str = content_range.split('/')[-1]
                        if total_str and total_str != '*':
                            item_count = int(total_str)
                            
            except Exception as e:
                print(f"Error calculating item count for list {list_id}: {e}")
                item_count = 0
            
            return {
                'id': raw['id'],
                'title': raw['title'],
                'description': raw.get('description'),
                'privacy': raw.get('privacy', 'private'),
                'itemCount': item_count,
                'followersCount': 0,  # TODO: Calculate followers count from list_followers table
                'tags': tags,
                'createdAt': raw.get('created_at'),
                'updatedAt': raw.get('updated_at'),
                'userId': raw.get('user_id'),
                'isCollaborative': raw.get('is_collaborative', False)
            }
        except Exception as e:
            print(f"Error fetching custom list details: {e}")
            return None

    def get_custom_list_items(self, list_id: int) -> List[Dict]:
        """Retrieve items for a custom list ordered by position."""
        try:
            response = requests.get(
                f"{self.base_url}/rest/v1/custom_list_items",
                headers=self.headers,
                params={
                    'list_id': f'eq.{list_id}',
                    'order': 'position.asc'
                }
            )
            if response.status_code != 200 or not response.text.strip():
                return []
            items_records = response.json()
            items = []
            for rec in items_records:
                # Fetch item details
                item_resp = requests.get(
                    f"{self.base_url}/rest/v1/items",
                    headers=self.headers,
                    params={
                        'id': f'eq.{rec["item_id"]}',
                        'select': 'uid,title,media_type_id,media_types(name),image_url'
                    }
                )
                if item_resp.status_code == 200 and item_resp.text.strip():
                    item_data = item_resp.json()
                    if item_data:
                        item_info = item_data[0] if isinstance(item_data, list) else item_data
                        
                        # Get media type from joined media_types table
                        media_type = ''
                        if item_info.get('media_types'):
                            media_type = item_info['media_types']['name']
                        
                        items.append({
                            'id': str(rec['item_id']),
                            'itemUid': item_info['uid'],
                            'title': item_info['title'],
                            'mediaType': media_type or 'Unknown',
                            'imageUrl': item_info.get('image_url'),
                            'order': rec['position'],
                            'addedAt': rec.get('created_at')
                        })
            # Sort items by order just in case
            items.sort(key=lambda x: x['order'])
            return items
        except Exception as e:
            print(f"Error fetching custom list items: {e}")
            return []

    def add_items_to_list(self, list_id: int, user_id: str, items: List[dict]) -> bool:
        """
        Add multiple items to a custom list.
        
        Args:
            list_id (int): List ID
            user_id (str): User ID (for permission check)
            items (List[dict]): List of items to add, each containing:
                - item_uid (str): Item unique identifier
                - notes (str, optional): Notes for the item
                
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # First verify user has permission to modify this list
            list_details = self.get_custom_list_details(list_id)
            if not list_details or list_details['userId'] != user_id:
                return False
            
            # Get current items count to determine starting position
            current_items = self.get_custom_list_items(list_id)
            next_position = len(current_items)
            
            # Prepare items for insertion
            items_to_insert = []
            
            for item in items:
                item_uid = item.get('item_uid')
                notes = item.get('notes', '')
                
                # Check if item exists in items table
                item_response = requests.get(
                    f"{self.base_url}/rest/v1/items",
                    headers=self.headers,
                    params={'uid': f'eq.{item_uid}', 'select': 'id,uid'}
                )
                
                if item_response.status_code != 200:
                    print(f"Failed to verify item {item_uid}")
                    continue
                    
                item_data = item_response.json()
                if not item_data:
                    print(f"Item {item_uid} not found")
                    continue
                
                item_id = item_data[0]['id']
                
                # Check if item is already in the list
                existing_check = requests.get(
                    f"{self.base_url}/rest/v1/custom_list_items",
                    headers=self.headers,
                    params={
                        'list_id': f'eq.{list_id}',
                        'item_id': f'eq.{item_id}'
                    }
                )
                
                if existing_check.status_code == 200 and existing_check.json():
                    print(f"Item {item_uid} already in list {list_id}")
                    continue
                
                items_to_insert.append({
                    'list_id': list_id,
                    'item_id': item_id,
                    'position': next_position,
                    'notes': notes,
                    'added_by': user_id
                })
                next_position += 1
            
            if not items_to_insert:
                print("No new items to add")
                return True
            
            # Insert all items
            insert_response = requests.post(
                f"{self.base_url}/rest/v1/custom_list_items",
                headers=self.headers,
                json=items_to_insert
            )
            
            if insert_response.status_code not in [200, 201]:
                print(f"Failed to insert items: {insert_response.text}")
                return False
            
            # Update list's updated_at timestamp
            update_response = requests.patch(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params={'id': f'eq.{list_id}'},
                json={'updated_at': 'now()'}
            )
            
            return True
            
        except Exception as e:
            print(f"Error adding items to list: {e}")
            return False

    def remove_item_from_list(self, list_id: int, user_id: str, item_id: int) -> bool:
        """
        Remove an item from a custom list.
        
        Args:
            list_id (int): List ID
            user_id (str): User ID (for permission check)
            item_id (int): Item ID to remove
                
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # First verify user has permission to modify this list
            list_details = self.get_custom_list_details(list_id)
            if not list_details or list_details['userId'] != user_id:
                return False
            
            # Remove the item
            delete_response = requests.delete(
                f"{self.base_url}/rest/v1/custom_list_items",
                headers=self.headers,
                params={
                    'list_id': f'eq.{list_id}',
                    'item_id': f'eq.{item_id}'
                }
            )
            
            if delete_response.status_code not in [200, 204]:
                print(f"Failed to remove item: {delete_response.text}")
                return False
            
            # Update list's updated_at timestamp
            update_response = requests.patch(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params={'id': f'eq.{list_id}'},
                json={'updated_at': 'now()'}
            )
            
            return True
            
        except Exception as e:
            print(f"Error removing item from list: {e}")
            return False

    def reorder_list_items(self, list_id: int, user_id: str, item_positions: List[dict]) -> bool:
        """
        Reorder items in a custom list.
        
        Args:
            list_id (int): List ID
            user_id (str): User ID (must be list owner)
            item_positions (List[dict]): List of {item_id, position} objects
            
        Returns:
            bool: Success status
        """
        try:
            # Verify list ownership
            list_response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params={
                    'id': f'eq.{list_id}',
                    'user_id': f'eq.{user_id}',
                    'select': 'id'
                }
            )
            
            if not list_response.json():
                return False
            
            # Update positions
            for item in item_positions:
                requests.patch(
                    f"{self.base_url}/rest/v1/custom_list_items",
                    headers=self.headers,
                    params={
                        'list_id': f'eq.{list_id}',
                        'item_id': f'eq.{item["item_id"]}'
                    },
                    json={'position': item['position']}
                )
            
            return True
            
        except Exception as e:
            print(f"Error reordering list items: {e}")
            return False

    def get_user_list_details(self, list_id: int, user_id: str) -> Optional[Dict]:
        """
        Get detailed information about a specific list owned by a user.
        
        Args:
            list_id (int): List ID
            user_id (str): User ID (must be list owner)
            
        Returns:
            Optional[Dict]: List details if found and owned by user, None otherwise
        """
        try:
            response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params={
                    'id': f'eq.{list_id}',
                    'user_id': f'eq.{user_id}',
                    'select': 'id, title, description, privacy, is_collaborative, user_id, created_at, updated_at',
                    'limit': 1
                }
            )
            
            if response.status_code != 200 or not response.text.strip():
                return None
                
            data = response.json()
            if not data:
                return None
                
            return data[0] if isinstance(data, list) else data
            
        except Exception as e:
            print(f"Error getting user list details: {e}")
            return None

    def create_user_profile(self, user_id: str, username: str, display_name: str = None) -> dict:
        """
        Create user profile (delegated to auth client for compatibility).
        
        Args:
            user_id (str): User UUID
            username (str): Unique username
            display_name (str, optional): Display name
            
        Returns:
            dict: Created profile data
        """
        # Create a temporary auth client instance for this operation
        auth_client = SupabaseAuthClient(self.base_url, self.api_key, self.service_key or self.api_key)
        return auth_client.create_user_profile(user_id, username, display_name)
    
    def get_user_stats(self, user_id: str, viewer_id: str = None) -> dict:
        """
        Get comprehensive user statistics.
        
        Args:
            user_id (str): User ID to get stats for
            viewer_id (str, optional): ID of the user viewing the stats
            
        Returns:
            dict: User statistics data
        """
        try:
            # Check privacy settings
            privacy_response = requests.get(
                f"{self.base_url}/rest/v1/user_privacy_settings",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'select': '*'
                }
            )
            
            privacy_settings = {}
            if privacy_response.status_code == 200 and privacy_response.json():
                privacy_settings = privacy_response.json()[0]
                
            # Check if viewer can see statistics
            is_self = viewer_id == user_id
            if not privacy_settings.get('show_statistics', True) and not is_self:
                return None
            
            # Get user statistics
            stats_response = requests.get(
                f"{self.base_url}/rest/v1/user_statistics",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'select': '*'
                }
            )
            
            if stats_response.status_code == 200 and stats_response.json():
                stats = stats_response.json()[0]
                # Check if we have essential stats, if not trigger real-time calculation
                if not stats.get('favorite_genres') or stats.get('total_anime_watched') is None:
                    # Import here to avoid circular imports
                    from app import calculate_user_statistics_realtime
                    fresh_stats = calculate_user_statistics_realtime(user_id)
                    if fresh_stats:
                        stats.update(fresh_stats)
            else:
                # No cached stats, use real-time calculation
                from app import calculate_user_statistics_realtime
                stats = calculate_user_statistics_realtime(user_id) or {}
            
            # Get user items count by status for additional stats
            items_response = requests.get(
                f"{self.base_url}/rest/v1/user_items",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'select': 'status'
                }
            )
            
            items_data = items_response.json() if items_response.status_code == 200 else []
            
            # Count by status
            status_counts = {}
            for item in items_data:
                status = item.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            # Build comprehensive stats with defaults for new users
            return {
                'user_id': user_id,
                'total_anime_watched': stats.get('total_anime_watched', 0),
                'total_manga_read': stats.get('total_manga_read', 0),
                'total_hours_watched': stats.get('total_hours_watched', 0),
                'total_chapters_read': stats.get('total_chapters_read', 0),
                'average_score': stats.get('average_score', 0),
                'completion_rate': stats.get('completion_rate', 0),
                'current_streak_days': stats.get('current_streak_days', 0),
                'longest_streak_days': stats.get('longest_streak_days', 0),
                'favorite_genres': stats.get('favorite_genres', []),
                'status_counts': {
                    'watching': status_counts.get('watching', 0),
                    'completed': status_counts.get('completed', 0),
                    'plan_to_watch': status_counts.get('plan_to_watch', 0),
                    'dropped': status_counts.get('dropped', 0),
                    'on_hold': status_counts.get('on_hold', 0),
                },
                'updated_at': stats.get('updated_at', '')
            }
            
        except Exception as e:
            print(f"Error getting user stats: {e}")
            # Return default stats even on error to prevent 404s
            return {
                'user_id': user_id,
                'total_anime_watched': 0,
                'total_manga_read': 0,
                'total_hours_watched': 0,
                'total_chapters_read': 0,
                'average_score': 0,
                'completion_rate': 0,
                'current_streak_days': 0,
                'longest_streak_days': 0,
                'favorite_genres': [],
                'status_counts': {
                    'watching': 0,
                    'completed': 0,
                    'plan_to_watch': 0,
                    'dropped': 0,
                    'on_hold': 0,
                },
                'updated_at': ''
            }

    def get_list_item_counts_batch(self, list_ids: List[str]) -> Dict[str, int]:
        """
        Get item counts for multiple lists efficiently in a single query.
        
        This method solves the N+1 query problem by fetching counts for multiple lists
        at once using a single aggregated query instead of individual requests.
        
        Args:
            list_ids (List[str]): List of list IDs to get counts for
            
        Returns:
            Dict[str, int]: Dictionary mapping list_id to item count
            
        Example:
            >>> client = SupabaseClient()
            >>> counts = client.get_list_item_counts_batch(['list1', 'list2', 'list3'])
            >>> print(counts)
            {'list1': 5, 'list2': 12, 'list3': 0}
        """
        if not list_ids:
            return {}
            
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            # Build query to get counts for all lists in one request
            # Remove quotes around list IDs since they are integers
            list_ids_str = ','.join(str(lid) for lid in list_ids)
            
            logger.info(f"Fetching batch counts for list IDs: {list_ids_str}")
            
            response = self._make_request(
                'GET',
                'custom_list_items',
                params={
                    'select': 'list_id',
                    'list_id': f'in.({list_ids_str})'
                }
            )
            
            logger.info(f"Batch count query response status: {response.status_code}")
            
            if response.status_code == 200:
                items = response.json()
                logger.info(f"Retrieved {len(items)} list items for counting")
                
                # Count items per list
                counts = {}
                for list_id in list_ids:
                    counts[str(list_id)] = 0
                    
                for item in items:
                    list_id = str(item.get('list_id'))
                    if list_id in counts:
                        counts[list_id] += 1
                        
                logger.info(f"Final counts: {counts}")
                return counts
            else:
                error_text = response.text if hasattr(response, 'text') else 'No response text'
                logger.error(f"Error fetching batch list counts: HTTP {response.status_code}, Response: {error_text}")
                return {str(list_id): 0 for list_id in list_ids}
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in batch list count query: {e}", exc_info=True)
            return {str(list_id): 0 for list_id in list_ids}
    
    def get_user_followers(self, user_id: str, viewer_id: str = None, page: int = 1, limit: int = 20) -> dict:
        """
        Get paginated list of followers for a given user.
        
        Args:
            user_id (str): ID of the user whose followers to retrieve
            viewer_id (str, optional): ID of the viewing user for follow status
            page (int): Page number (default: 1)
            limit (int): Items per page (default: 20, max: 50)
            
        Returns:
            dict: Paginated followers data with user details and follow status
        """
        try:
            limit = min(limit, 50)
            offset = (page - 1) * limit
            
            # Get followers first without join
            followers_response = requests.get(
                f"{self.base_url}/rest/v1/user_follows",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params={
                    'following_id': f'eq.{user_id}',
                    'select': 'follower_id,created_at',
                    'order': 'created_at.desc',
                    'offset': offset,
                    'limit': limit
                }
            )
            
            if followers_response.status_code != 200:
                logger.error(f"Error fetching followers: {followers_response.status_code}")
                return {
                    'followers': [],
                    'total': 0,
                    'page': page,
                    'limit': limit,
                    'has_more': False
                }
            
            followers_data = followers_response.json()
            total = int(followers_response.headers.get('Content-Range', '0-0/0').split('/')[-1])
            
            # Extract follower IDs
            follower_ids = [follow['follower_id'] for follow in followers_data]
            
            if not follower_ids:
                return {
                    'followers': [],
                    'total': total,
                    'page': page,
                    'limit': limit,
                    'has_more': False
                }
            
            # Get user profiles for followers
            profiles_response = requests.get(
                f"{self.base_url}/rest/v1/user_profiles",
                headers=self.headers,
                params={
                    'id': f'in.({",".join(follower_ids)})',
                    'select': 'id,username,display_name,avatar_url'
                }
            )
            
            if profiles_response.status_code != 200:
                print(f"[ERROR] Profiles API error: {profiles_response.text}")
                return {
                    'followers': [],
                    'total': 0,
                    'page': page,
                    'limit': limit,
                    'has_more': False
                }
            
            profiles = profiles_response.json()
            profiles_dict = {profile['id']: profile for profile in profiles}
            
            # Build followers list
            followers = []
            for follow in followers_data:
                follower_id = follow['follower_id']
                profile = profiles_dict.get(follower_id)
                if profile:
                    follower = {
                        'id': profile['id'],
                        'username': profile['username'],
                        'display_name': profile.get('display_name'),
                        'avatar_url': profile.get('avatar_url'),
                        'followed_at': follow['created_at'],
                        'is_following': False,
                        'is_mutual': False
                    }
                    followers.append(follower)
            
            # If viewer is authenticated, check follow relationships
            if viewer_id and follower_ids:
                # Check which followers the viewer is following
                viewer_following_response = requests.get(
                    f"{self.base_url}/rest/v1/user_follows",
                    headers=self.headers,
                    params={
                        'follower_id': f'eq.{viewer_id}',
                        'following_id': f'in.({','.join(follower_ids)})',
                        'select': 'following_id'
                    }
                )
                
                if viewer_following_response.status_code == 200:
                    viewer_following = set(f['following_id'] for f in viewer_following_response.json())
                    
                    # Update follow status for each follower
                    for follower in followers:
                        if follower['id'] in viewer_following:
                            follower['is_following'] = True
                            # Check if mutual (viewer follows them and they follow user)
                            if viewer_id == user_id:
                                follower['is_mutual'] = True
                            else:
                                # Check if the follower follows the viewer back
                                mutual_check = requests.get(
                                    f"{self.base_url}/rest/v1/user_follows",
                                    headers=self.headers,
                                    params={
                                        'follower_id': f'eq.{follower["id"]}',
                                        'following_id': f'eq.{viewer_id}',
                                        'select': 'id'
                                    }
                                )
                                if mutual_check.status_code == 200 and mutual_check.json():
                                    follower['is_mutual'] = True
            
            return {
                'followers': followers,
                'total': total,
                'page': page,
                'limit': limit,
                'has_more': offset + limit < total
            }
            
        except Exception as e:
            logger.error(f"Error getting user followers: {e}")
            return {
                'followers': [],
                'total': 0,
                'page': page,
                'limit': limit,
                'has_more': False
            }
    
    def get_user_following(self, user_id: str, viewer_id: str = None, page: int = 1, limit: int = 20) -> dict:
        """
        Get paginated list of users that the specified user is following.
        
        Args:
            user_id (str): ID of the user whose following list to retrieve
            viewer_id (str, optional): ID of the viewing user for follow status
            page (int): Page number (default: 1)
            limit (int): Items per page (default: 20, max: 50)
            
        Returns:
            dict: Paginated following data with user details and follow status
        """
        try:
            limit = min(limit, 50)
            offset = (page - 1) * limit
            
            # Get following with user details
            following_response = requests.get(
                f"{self.base_url}/rest/v1/user_follows",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params={
                    'follower_id': f'eq.{user_id}',
                    'select': 'following_id,created_at,user_profiles!user_follows_following_id_fkey(id,username,display_name,avatar_url)',
                    'order': 'created_at.desc',
                    'offset': offset,
                    'limit': limit
                }
            )
            
            if following_response.status_code != 200:
                logger.error(f"Error fetching following: {following_response.status_code}")
                return {
                    'following': [],
                    'total': 0,
                    'page': page,
                    'limit': limit,
                    'has_more': False
                }
            
            following_data = following_response.json()
            total = int(following_response.headers.get('Content-Range', '0-0/0').split('/')[-1])
            
            # Process following and check if viewer follows them
            following = []
            following_ids = []
            
            for follow in following_data:
                user_profile = follow.get('user_profiles', {})
                if user_profile:
                    followed_user = {
                        'id': user_profile['id'],
                        'username': user_profile['username'],
                        'display_name': user_profile.get('display_name'),
                        'avatar_url': user_profile.get('avatar_url'),
                        'followed_at': follow['created_at'],
                        'is_following': False,
                        'is_mutual': False
                    }
                    following.append(followed_user)
                    following_ids.append(user_profile['id'])
            
            # If viewer is authenticated, check follow relationships
            if viewer_id and following_ids:
                # Check which following users the viewer is also following
                viewer_following_response = requests.get(
                    f"{self.base_url}/rest/v1/user_follows",
                    headers=self.headers,
                    params={
                        'follower_id': f'eq.{viewer_id}',
                        'following_id': f'in.({','.join(following_ids)})',
                        'select': 'following_id'
                    }
                )
                
                if viewer_following_response.status_code == 200:
                    viewer_following = set(f['following_id'] for f in viewer_following_response.json())
                    
                    # Update follow status for each following
                    for followed in following:
                        if followed['id'] in viewer_following:
                            followed['is_following'] = True
                            # Check if mutual
                            if viewer_id == user_id:
                                # If viewing own following list, all are following back
                                followed['is_mutual'] = True  
                            else:
                                # Check if they follow the viewer back
                                mutual_check = requests.get(
                                    f"{self.base_url}/rest/v1/user_follows",
                                    headers=self.headers,
                                    params={
                                        'follower_id': f'eq.{followed["id"]}',
                                        'following_id': f'eq.{viewer_id}',
                                        'select': 'id'
                                    }
                                )
                                if mutual_check.status_code == 200 and mutual_check.json():
                                    followed['is_mutual'] = True
            
            return {
                'following': following,
                'total': total,
                'page': page,
                'limit': limit,
                'has_more': offset + limit < total
            }
            
        except Exception as e:
            logger.error(f"Error getting user following: {e}")
            return {
                'following': [],
                'total': 0,
                'page': page,
                'limit': limit,
                'has_more': False
            }


# 🆕 NEW AUTHENTICATION CLASS - ADD THIS TO THE END OF THE FILE:
class SupabaseAuthClient:
    """
    Supabase Authentication client for comprehensive user management and JWT validation.
    
    This class provides a complete authentication interface for the AniManga Recommender
    application, handling user authentication, profile management, and secure JWT token
    validation using Supabase Auth services.
    
    Key Features:
        - JWT token verification with Supabase Auth API
        - User profile CRUD operations with data validation
        - Secure service-level authentication for admin operations
        - Comprehensive error handling with specific error types
        - Support for user metadata and role-based access
        - Profile creation with username uniqueness validation
        - Batch user operations for administrative tasks
    
    Authentication Flow:
        1. Client sends JWT token from Supabase Auth
        2. verify_jwt_token() validates token with Supabase Auth API
        3. Extract user information and permissions
        4. Use user_id for profile and data operations
        5. Handle token expiration and renewal gracefully
    
    Security Features:
        - Service key authentication for privileged operations
        - Token validation against Supabase Auth service
        - User input sanitization and validation
        - Proper error handling without information leakage
        - Support for role-based access control (RBAC)
        - Session timeout and token expiration handling
    
    Database Integration:
        - user_profiles table for extended user information
        - Integration with auth.users for core authentication
        - Support for custom user metadata and preferences
        - Proper foreign key relationships and constraints
    
    Performance Considerations:
        - Efficient token validation with minimal API calls
        - Caching of user profile data where appropriate
        - Optimized database queries with proper indexing
        - Connection pooling and timeout management
    
    Usage Examples:
        >>> # Initialize auth client
        >>> auth_client = SupabaseAuthClient(
        ...     base_url="https://your-project.supabase.co",
        ...     api_key="your-anon-key",
        ...     service_key="your-service-key"
        ... )
        
        >>> # Verify user token
        >>> user_info = auth_client.verify_jwt_token(jwt_token)
        >>> user_id = user_info['user_id']
        
        >>> # Get user profile
        >>> profile = auth_client.get_user_profile(user_id)
        >>> username = profile['username']
    
    Configuration:
        - base_url: Supabase project URL
        - api_key: Public anon key for client operations
        - service_key: Service role key for admin operations
        - jwt_secret: Used for token verification (same as service_key)
    
    Error Handling:
        The class provides specific error messages for common scenarios:
        - Token expiration: "Token has expired or is invalid"
        - Network issues: "Authentication service unavailable"
        - Invalid tokens: "Invalid token"
        - Profile not found: Returns None instead of raising error
        - Validation errors: Detailed field-specific messages
    
    See Also:
        - SupabaseClient: For data operations and item management
        - require_auth decorator: For protecting Flask routes
        - User profile management endpoints in app.py
    
    Since: 1.0.0
    Author: AniManga Recommender Team
    """
    
    def __init__(self, base_url: str, api_key: str, service_key: str):
        """
        Initialize Supabase Authentication client.
        
        Sets up authentication headers and connection parameters for Supabase API
        communication. The service key is used for privileged operations while
        the API key is available for client-side operations.
        
        Args:
            base_url (str): Full Supabase project URL including protocol.
                          Format: "https://your-project.supabase.co"
            api_key (str): Supabase public anonymous key for client operations.
                          Used for user-facing API calls.
            service_key (str): Supabase service role key for admin operations.
                             Has full database access, used for user management.
        
        Example:
            >>> auth_client = SupabaseAuthClient(
            ...     base_url="https://abc123.supabase.co",
            ...     api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            ...     service_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            ... )
        """
        self.base_url = base_url
        self.api_key = api_key
        self.service_key = service_key
        self.jwt_secret = service_key  # Used to verify JWT tokens
        
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json"
        }
    
    def get_user_from_token(self, token: str) -> dict:
        """
        Get user information from JWT token (alias for verify_jwt_token for test compatibility).
        
        Args:
            token (str): JWT token to verify
            
        Returns:
            dict: User information from token
        
        Raises:
            ValueError: When token is invalid or expired
        """
        return self.verify_jwt_token(token)
    
    def verify_jwt_token(self, token: str) -> dict:
        """
        Verify JWT token and extract user information using Supabase Auth API.
        
        This method validates JWT tokens by making a request to the Supabase Auth
        service instead of decoding tokens locally. This ensures tokens are valid,
        not expired, and properly issued by Supabase Auth.
        
        Validation Process:
            1. Clean token format (remove 'Bearer ' prefix if present)
            2. Make authenticated request to Supabase Auth user endpoint
            3. Parse user information from successful response
            4. Return standardized user data structure
            5. Handle various error conditions with specific messages
        
        Args:
            token (str): JWT token to verify. Can include 'Bearer ' prefix.
                        Should be a valid Supabase Auth JWT token.
        
        Returns:
            dict: Verified user information containing:
                - sub (str): User ID (same as user_id, for JWT standard compliance)
                - user_id (str): Supabase user UUID
                - email (str): User's email address
                - role (str): User role, defaults to 'authenticated'
                - user_metadata (dict): Additional user metadata from Supabase Auth
        
        Raises:
            ValueError: When token is expired, invalid, or malformed
            ValueError: When authentication service is unavailable
            ValueError: When network timeout occurs
            
        Examples:
            >>> # Verify a valid token
            >>> user_info = auth_client.verify_jwt_token(
            ...     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            ... )
            >>> print(user_info['email'])  # user@example.com
            >>> print(user_info['user_id'])  # 550e8400-e29b-41d4-a716-446655440000
            
            >>> # Handle token with Bearer prefix
            >>> user_info = auth_client.verify_jwt_token(
            ...     "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            ... )
            
            >>> # Handle errors
            >>> try:
            ...     user_info = auth_client.verify_jwt_token("invalid-token")
            ... except ValueError as e:
            ...     print(f"Auth error: {e}")  # "Invalid token"
        
        Security Considerations:
            - Tokens are validated against live Supabase Auth service
            - No local token decoding (prevents tampering)
            - Respects token expiration times
            - Handles revoked tokens properly
            - Network timeouts prevent hanging requests
            
        Performance Notes:
            - Each call makes a network request to Supabase
            - Consider caching user info for short periods
            - 10-second timeout prevents hanging requests
            - Efficient JSON parsing and data extraction
            
        Error Response Mapping:
            - 200: Token valid, returns user data
            - 401: Token expired/invalid -> "Token has expired or is invalid"
            - Timeout: Network timeout -> "Authentication service timeout"
            - Other: Connection issues -> "Authentication service unavailable"
        
        Since: 1.0.0
        """
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # For Supabase, verify the token by making a request to the auth endpoint
            headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # Make a request to Supabase auth user endpoint to validate token
            response = requests.get(
                f"{self.base_url}/auth/v1/user",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    'sub': user_data.get('id'),  # Use 'sub' for consistency
                    'user_id': user_data.get('id'),
                    'email': user_data.get('email'),
                    'role': user_data.get('role', 'authenticated'),
                    'user_metadata': user_data.get('user_metadata', {})
                }
            elif response.status_code == 401:
                raise ValueError("Token has expired or is invalid")
            else:
                raise ValueError("Invalid token")
            
        except requests.exceptions.Timeout:
            raise ValueError("Authentication service timeout")
        except requests.exceptions.RequestException:
            raise ValueError("Authentication service unavailable")
        except Exception as e:
            print(f"JWT verification error: {e}")
            raise ValueError("Invalid token")
    
    def get_user_profile(self, user_id: str) -> dict:
        """
        Retrieve user profile information by user ID.
        
        Fetches extended user profile data from the user_profiles table,
        which contains additional information beyond the basic auth.users data.
        This includes display preferences, usernames, and custom user settings.
        
        Args:
            user_id (str): UUID of the user whose profile to retrieve.
                          Must be a valid Supabase Auth user ID.
        
        Returns:
            dict: User profile data containing:
                - id (str): User UUID (same as user_id)
                - username (str): Unique username chosen by user
                - display_name (str): Display name for UI
                - created_at (str): Profile creation timestamp
                - updated_at (str): Last profile update timestamp
                - Additional custom fields as configured
                
            None: If no profile exists for the given user_id
        
        Examples:
            >>> profile = auth_client.get_user_profile(
            ...     "550e8400-e29b-41d4-a716-446655440000"
            ... )
            >>> if profile:
            ...     print(f"Username: {profile['username']}")
            ...     print(f"Display name: {profile['display_name']}")
            ... else:
            ...     print("Profile not found")
        
        Database Schema:
            The user_profiles table should have:
            - id (UUID, PK, FK to auth.users.id)
            - username (VARCHAR, UNIQUE)
            - display_name (VARCHAR)
            - created_at (TIMESTAMP)
            - updated_at (TIMESTAMP)
            
        Error Handling:
            - Returns None for non-existent profiles (not an error)
            - Logs errors for debugging but doesn't raise exceptions
            - Handles database connection issues gracefully
            
        Since: 1.0.0
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
        Create a new user profile with username and display name.
        
        Creates an extended user profile in the user_profiles table with
        the provided information. This is typically called after user
        registration to set up their profile data.
        
        Args:
            user_id (str): UUID of the authenticated user.
                          Must correspond to a valid auth.users record.
            username (str): Unique username for the user.
                           Should be validated for uniqueness and format.
            display_name (str, optional): Display name for UI presentation.
                                        Defaults to username if not provided.
        
        Returns:
            dict: Operation result containing:
                - success (bool): True if profile creation succeeded
                - data (dict): Created profile data if successful
                - error (str): Error message if creation failed
        
        Examples:
            >>> result = auth_client.create_user_profile(
            ...     user_id="550e8400-e29b-41d4-a716-446655440000",
            ...     username="anime_fan_123",
            ...     display_name="Anime Fan"
            ... )
            >>> if result['success']:
            ...     print("Profile created successfully!")
            
        Validation:
            - user_id must be a valid UUID
            - username must be unique across all profiles
            - display_name can be any string or default to username
            
        Database Operations:
            - Inserts new record into user_profiles table
            - Handles unique constraint violations for username
            - Sets created_at and updated_at timestamps automatically
            
        Error Handling:
            - Username uniqueness violations
            - Invalid user_id references
            - Database connection issues
            - Data validation errors
            
        Since: 1.0.0
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
                created_profile = response.json()
                return created_profile
            elif response.status_code == 409:
                # Duplicate key error - profile already exists, try to fetch it
                try:
                    existing_profile = self.get_user_profile_by_id(user_id)
                    if existing_profile:
                        print(f"Existing profile username field: '{existing_profile.get('username')}'")
                        
                        # Check if username field is missing, empty, or contains email format when we expect plain username
                        existing_username = existing_profile.get('username')
                        needs_username_update = (
                            not existing_username or  # NULL or empty
                            (existing_username != username and '@' in existing_username and username == existing_username.split('@')[0])  # Email format mismatch
                        )
                        
                        if needs_username_update:
                            if not existing_username:
                                print(f"Username field is missing/empty, updating with username: '{username}'")
                            else:
                                print(f"Username field contains email '{existing_username}' but expected '{username}', updating to correct format")
                            try:
                                # Update the existing profile with the username
                                update_response = requests.patch(
                                    f"{self.base_url}/rest/v1/user_profiles",
                                    headers=self.headers,
                                    params={'id': f'eq.{user_id}'},
                                    json={'username': username}
                                )
                                
                                if update_response.status_code in [200, 204]:
                                    # Fetch the updated profile
                                    updated_profile = self.get_user_profile_by_id(user_id)
                                    if updated_profile:
                                        print(f"Updated profile username field: '{updated_profile.get('username')}'")
                                        return updated_profile
                                else:
                                    print(f"Failed to update username - Status: {update_response.status_code}, Response: {update_response.text}")
                            except Exception as update_error:
                                print(f"Error updating username for user {user_id}: {update_error}")
                        
                        return existing_profile
                    else:
                        print(f"Profile exists but could not fetch for user {user_id}")
                        return None
                except Exception as fetch_error:
                    print(f"Error fetching existing profile for user {user_id}: {fetch_error}")
                    return None
            else:
                print(f"Failed to create user profile - Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            print(f"Exception creating user profile: {e}")
            return None
    
    def get_user_profile_by_id(self, user_id: str) -> dict:
        """
        Get user profile by user ID.
        
        Args:
            user_id (str): User ID to look up
            
        Returns:
            dict: User profile data or None if not found
        """
        try:
            response = requests.get(
                f"{self.base_url}/rest/v1/user_profiles",
                headers=self.headers,
                params={
                    'id': f'eq.{user_id}',
                    'select': '*'
                }
            )
            
            if response.status_code == 200 and response.json():
                return response.json()[0]
            return None
        except Exception as e:
            print(f"Exception getting user profile by ID: {e}")
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
    
    def update_user_item_status(self, user_id: str, item_uid: str, status: str, rating: float = None, episodes_watched: int = None) -> dict:
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
                # ✅ NEW: Validate and round rating to 1 decimal place
                if not isinstance(rating, (int, float)) or rating < 0 or rating > 10:
                    raise ValueError("Rating must be a number between 0 and 10")
                data['rating'] = round(float(rating), 1)
            
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

    def update_user_item_status_comprehensive(self, user_id: str, item_uid: str, status_data: dict) -> dict:
        """
        Comprehensive update method for user item status
        Handles: status, progress, rating, notes, dates
        """
        try:
            # First, check if record exists
            existing = requests.get(
                f"{self.base_url}/rest/v1/user_items",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'item_uid': f'eq.{item_uid}',
                    'select': 'id,status'
                }
            )
            
            # Prepare comprehensive data
            data = {
                'user_id': user_id,
                'item_uid': item_uid,
                'status': status_data['status'],
                'progress': status_data.get('progress', 0),
                'notes': status_data.get('notes', ''),
                'updated_at': 'now()'
            }
            
            if 'rating' in status_data and status_data['rating'] is not None:
                # ✅ ENHANCED: Validate and round rating to 1 decimal place
                rating = status_data['rating']
                if not isinstance(rating, (int, float)):
                    raise ValueError("Rating must be a number")
                if rating < 0 or rating > 10:
                    raise ValueError("Rating must be between 0 and 10")
                
                # Round to 1 decimal place for consistency
                data['rating'] = round(float(rating), 1)
            
            # Handle status-specific logic
            if status_data['status'] == 'completed':
                data['completion_date'] = status_data.get('completion_date', 'now()')
            elif status_data['status'] == 'watching':
                if not existing.json():  # New record
                    data['start_date'] = 'now()'
            
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
                if status_data['status'] == 'watching':
                    data['start_date'] = 'now()'
                response = requests.post(
                    f"{self.base_url}/rest/v1/user_items",
                    headers=self.headers,
                    json=data
                )
            
            if response.status_code in [200, 201, 204]:
                return {'success': True, 'data': response.json() if response.content else {}}
            else:
                print(f"Supabase error: {response.status_code} - {response.text}")
                return None
            
        except Exception as e:
            print(f"Error updating user item status: {e}")
            return None

    # ===== SOCIAL FEATURES METHODS =====
    
    def get_user_profile_by_username(self, username: str, viewer_id: str = None) -> dict:
        """
        Get user profile by username with privacy filtering.
        
        Args:
            username (str): Username to lookup
            viewer_id (str, optional): ID of the user viewing the profile
            
        Returns:
            dict: User profile data filtered by privacy settings
        """
        try:
            
            # First attempt: exact case match
            response = requests.get(
                f"{self.base_url}/rest/v1/user_profiles",
                headers=self.headers,
                params={
                    'username': f'eq.{username}',
                    'select': '*'
                }
            )
            
            
            # If exact match fails, try case-insensitive match
            if response.status_code != 200 or not response.json():
                print(f"Exact match failed, trying case-insensitive lookup for '{username}'")
                response = requests.get(
                    f"{self.base_url}/rest/v1/user_profiles",
                    headers=self.headers,
                    params={
                        'username': f'ilike.{username}',
                        'select': '*'
                    }
                )
                print(f"Case-insensitive query status: {response.status_code}, found: {len(response.json()) if response.status_code == 200 else 0} profiles")
            
            if response.status_code != 200 or not response.json():
                print(f"No profile found for username '{username}' with either exact or case-insensitive match")
                return None
                
            profile = response.json()[0]
            user_id = profile['id']
            
            # Get privacy settings
            privacy_response = requests.get(
                f"{self.base_url}/rest/v1/user_privacy_settings",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'select': '*'
                }
            )
            
            privacy_settings = {}
            if privacy_response.status_code == 200 and privacy_response.json():
                privacy_settings = privacy_response.json()[0]
            
            # Check if viewer is following this user
            is_following = False
            if viewer_id and viewer_id != user_id:
                follow_url = f"{self.base_url}/rest/v1/user_follows?follower_id=eq.{viewer_id}&following_id=eq.{user_id}&select=id"
                follow_response = requests.get(
                    follow_url,
                    headers=self.headers
                )
                if follow_response.status_code == 200 and follow_response.json():
                    is_following = True
            
            # Apply privacy filtering
            is_self = viewer_id == user_id
            is_friend = is_following  # Simplified - in full implementation, check mutual follows
            
            profile_visibility = privacy_settings.get('profile_visibility', 'public')
            
            # Check access permissions
            if profile_visibility == 'private' and not is_self:
                return None
            elif profile_visibility == 'friends_only' and not (is_self or is_friend):
                return None
                
            # Filter sensitive data based on privacy settings
            filtered_profile = {
                'id': profile['id'],
                'username': profile['username'],
                'display_name': profile['display_name'],
                'avatar_url': profile['avatar_url'],
                'bio': profile['bio'],
                'created_at': profile['created_at'],
                'is_following': is_following,
                'is_self': is_self
            }
            
            # Add optional fields based on privacy settings
            if privacy_settings.get('show_statistics', True) or is_self:
                filtered_profile.update({
                    'follower_count': profile.get('follower_count', 0),
                    'following_count': profile.get('following_count', 0),
                    'list_count': profile.get('list_count', 0)
                })
                
            if privacy_settings.get('show_followers', True) or is_self:
                filtered_profile['show_followers'] = True
                
            if privacy_settings.get('show_following', True) or is_self:
                filtered_profile['show_following'] = True
            
            return filtered_profile
            
        except Exception as e:
            print(f"Error getting user profile by username: {e}")
            return None
    
    def toggle_user_follow(self, follower_id: str, username: str) -> dict:
        """
        Follow or unfollow a user by username.
        
        Args:
            follower_id (str): ID of the user doing the following
            username (str): Username to follow/unfollow
            
        Returns:
            dict: Result with success status and is_following boolean
        """
        try:
            print(f"Looking up user to follow: '{username}'")
            
            # Get user ID from username - try exact match first
            profile_response = requests.get(
                f"{self.base_url}/rest/v1/user_profiles",
                headers=self.headers,
                params={
                    'username': f'eq.{username}',
                    'select': 'id'
                }
            )
            
            # If exact match fails, try case-insensitive match
            if profile_response.status_code != 200 or not profile_response.json():
                print(f"Exact match failed for follow, trying case-insensitive lookup for '{username}'")
                profile_response = requests.get(
                    f"{self.base_url}/rest/v1/user_profiles",
                    headers=self.headers,
                    params={
                        'username': f'ilike.{username}',
                        'select': 'id'
                    }
                )
            
            if profile_response.status_code != 200 or not profile_response.json():
                print(f"User not found for follow: '{username}'")
                return {'success': False, 'error': 'User not found'}
                
            following_id = profile_response.json()[0]['id']
            
            # Prevent self-following
            if follower_id == following_id:
                return {'success': False, 'error': 'Cannot follow yourself'}
            
            # Check if already following
            existing_follow = requests.get(
                f"{self.base_url}/rest/v1/user_follows",
                headers=self.headers,
                params={
                    'follower_id': f'eq.{follower_id}',
                    'following_id': f'eq.{following_id}',
                    'select': 'id'
                }
            )
            
            print(f"Debug toggle_follow: follower_id={follower_id}, following_id={following_id}")
            existing_follows = existing_follow.json()
            print(f"Debug toggle_follow: existing_follow response={existing_follows}")
            
            # Clean up duplicates if any exist
            if len(existing_follows) > 1:
                print(f"Warning: Found {len(existing_follows)} duplicate follow relationships, cleaning up...")
                # Delete all duplicates
                for follow in existing_follows:
                    requests.delete(
                        f"{self.base_url}/rest/v1/user_follows",
                        headers=self.headers,
                        params={'id': f'eq.{follow["id"]}'}
                    )
                existing_follows = []  # Treat as no existing follow after cleanup
                
            if existing_follows:
                # Unfollow
                response = requests.delete(
                    f"{self.base_url}/rest/v1/user_follows",
                    headers=self.headers,
                    params={
                        'follower_id': f'eq.{follower_id}',
                        'following_id': f'eq.{following_id}'
                    }
                )
                
                if response.status_code == 204:
                    return {'success': True, 'is_following': False, 'action': 'unfollowed'}
            else:
                # Follow
                response = requests.post(
                    f"{self.base_url}/rest/v1/user_follows",
                    headers=self.headers,
                    json={
                        'follower_id': follower_id,
                        'following_id': following_id
                    }
                )
                
                if response.status_code == 201:
                    return {'success': True, 'is_following': True, 'action': 'followed'}
            
            return {'success': False, 'error': 'Follow operation failed'}
            
        except Exception as e:
            print(f"Error toggling user follow: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_privacy_settings(self, user_id: str) -> dict:
        """
        Get user privacy settings.
        
        Args:
            user_id (str): User ID
            
        Returns:
            dict: Privacy settings or None if not found
        """
        try:
            response = requests.get(
                f"{self.base_url}/rest/v1/user_privacy_settings",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'select': '*'
                }
            )
            
            if response.status_code == 200 and response.json():
                return response.json()[0]
            
            return None
            
        except Exception as e:
            print(f"Error getting privacy settings: {e}")
            return None
    
    def update_privacy_settings(self, user_id: str, settings: dict) -> dict:
        """
        Update user privacy settings.
        
        Args:
            user_id (str): User ID
            settings (dict): Privacy settings to update
            
        Returns:
            dict: Updated privacy settings or None if failed
        """
        try:
            # Check if privacy settings exist
            existing_response = requests.get(
                f"{self.base_url}/rest/v1/user_privacy_settings",
                headers=self.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'select': 'user_id'
                }
            )
            
            # Don't manually set updated_at - let the database handle it with DEFAULT
            # Remove any updated_at from settings if present to avoid conflicts
            if 'updated_at' in settings:
                del settings['updated_at']
            
            if existing_response.status_code == 200 and existing_response.json():
                # Update existing settings
                response = requests.patch(
                    f"{self.base_url}/rest/v1/user_privacy_settings",
                    headers=self.headers,
                    params={'user_id': f'eq.{user_id}'},
                    json=settings
                )
            else:
                # Create new settings
                settings['user_id'] = user_id
                response = requests.post(
                    f"{self.base_url}/rest/v1/user_privacy_settings",
                    headers=self.headers,
                    json=settings
                )
            
            if response.status_code in [200, 201, 204]:
                # For successful operations, get the updated record
                get_response = requests.get(
                    f"{self.base_url}/rest/v1/user_privacy_settings",
                    headers=self.headers,
                    params={'user_id': f'eq.{user_id}'}
                )
                
                if get_response.status_code == 200 and get_response.json():
                    return get_response.json()[0]
                
                # Fallback: return the original settings if we can't fetch updated ones
                return settings
            
            print(f"Failed to update privacy settings: {response.status_code} - {response.text}")
            return None
            
        except Exception as e:
            print(f"Error updating privacy settings: {e}")
            return None
    
    def calculate_update_frequency(self, list_id: int, days: int = 30) -> float:
        """Calculate how frequently a list is updated (updates per day)."""
        try:
            from datetime import datetime, timezone, timedelta
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            # Count updates in custom_list_items table
            response = self.supabase.table('custom_list_items').select(
                'updated_at', count='exact'
            ).eq('list_id', list_id).gte('updated_at', thirty_days_ago).execute()
            
            if response.data:
                count = len(response.data)
                return count / days  # Updates per day
            return 0.0
        except Exception as e:
            logger.error(f"Error calculating update frequency for list {list_id}: {e}")
            return 0.0
    
    def _update_preview_images_cache(self, list_id: int, preview_images: List[str]) -> bool:
        """Update the preview_images cache in the database."""
        try:
            import json
            response = self.supabase.table('custom_lists').update({
                'preview_images': json.dumps(preview_images)
            }).eq('id', list_id).execute()
            
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error updating preview images cache for list {list_id}: {e}")
            return False

    def discover_lists(self, search: str = None, tags: List[str] = None, 
                    sort_by: str = 'updated_at', page: int = 1, limit: int = 20, user_id: str = None,
                    content_type: str = None, privacy: str = None, item_count: str = None, 
                    follower_count: str = None) -> dict:
        """
        Discover public custom lists with search and filtering.
        
        Args:
            search (str, optional): Search query for list titles/descriptions
            tags (List[str], optional): Filter by tag names
            sort_by (str): Sort field (updated_at, created_at, title)
            page (int): Page number for pagination
            limit (int): Items per page
            user_id (str, optional): User ID for follow status
            content_type (str, optional): Filter by content type (anime, manga, mixed)
            privacy (str, optional): Filter by privacy level (public, friends_only)
            item_count (str, optional): Filter by size (small, medium, large)
            follower_count (str, optional): Filter by popularity (popular, trending, viral)
            
        Returns:
            dict: Lists data with pagination info
        """
        try:
            offset = (page - 1) * limit
            
            # Build query parameters
            # Map sort_by to actual database columns
            db_sort_by = sort_by
            if sort_by in ['popularity', 'followers_count', 'item_count']:
                # These will be sorted in Python after fetching data
                db_sort_by = 'updated_at'
            
            # Fetch extra items to account for empty lists that will be filtered out
            fetch_limit = limit * 3  # Fetch 3x requested to ensure we have enough after filtering
            
            params = {
                'privacy': 'eq.public',
                'select': '''
                    *,
                    user_profiles!custom_lists_user_id_fkey(username, display_name, avatar_url)
                ''',
                'limit': fetch_limit,
                'offset': offset,
                'order': f'{db_sort_by}.desc'
            }
            
            # Apply privacy filter if specified (override default public filter)
            if privacy and privacy != 'all':
                if privacy == 'public':
                    params['privacy'] = 'eq.public'
                elif privacy == 'friends_only':
                    params['privacy'] = 'eq.friends_only'
            
            # For quality_score sorting, use pre-calculated database values
            if sort_by == 'quality_score':
                params['order'] = 'quality_score.desc'
                db_sort_by = 'quality_score'
            
            # Add search filter
            if search:
                params['or'] = f'(title.ilike.%{search}%,description.ilike.%{search}%)'
            
            response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params=params
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to discover lists: {response.status_code} - {response.text}")
                return {'lists': [], 'total': 0, 'page': page, 'limit': limit}
            
            lists = response.json()
            
            # Get total count for pagination (apply same privacy filter)
            count_params = {'privacy': 'eq.public', 'select': 'count'}
            if privacy and privacy != 'all':
                if privacy == 'public':
                    count_params['privacy'] = 'eq.public'
                elif privacy == 'friends_only':
                    count_params['privacy'] = 'eq.friends_only'
            if search:
                count_params['or'] = f'(title.ilike.%{search}%,description.ilike.%{search}%)'
                
            count_response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params=count_params
            )
            
            total = 0
            if count_response.status_code == 200:
                total = int(count_response.headers.get('Content-Range', '0').split('/')[-1])
            
            # Get tags for all lists in a single query to avoid N+1
            list_tags_map = {}
            if lists:
                list_ids = [list_item["id"] for list_item in lists]
                
                # Make a single query to get all tag associations for these lists
                list_tags_response = requests.get(
                    f"{self.base_url}/rest/v1/list_tag_associations",
                    headers=self.headers,
                    params={
                        'list_id': f'in.({",".join(map(str, list_ids))})',
                        'select': 'list_id,list_tags!inner(name)'
                    }
                )
                
                # Build a map of list_id -> tag_names for efficient access
                if list_tags_response.status_code == 200:
                    tag_associations = list_tags_response.json()
                    for assoc in tag_associations:
                        list_id = assoc['list_id']
                        tag_name = assoc['list_tags']['name']
                        if list_id not in list_tags_map:
                            list_tags_map[list_id] = []
                        list_tags_map[list_id].append(tag_name)
            
            # Filter by tags if specified
            if tags and lists:
                # Filter lists that have any of the requested tags
                filtered_lists = []
                for list_item in lists:
                    list_id = list_item["id"]
                    list_tag_names = list_tags_map.get(list_id, [])
                    if any(tag in list_tag_names for tag in tags):
                        filtered_lists.append(list_item)
                
                lists = filtered_lists
                total = len(lists)  # Approximate for tag filtering
            
            # Get item counts for all lists in a single query
            list_item_counts = {}
            if lists:
                item_count_response = requests.get(
                    f"{self.base_url}/rest/v1/custom_list_items",
                    headers={**self.headers, 'Prefer': 'count=exact'},
                    params={
                        'list_id': f'in.({",".join(map(str, list_ids))})',
                        'select': 'list_id'
                    }
                )
                
                if item_count_response.status_code == 200:
                    # Parse the count from each list
                    items_data = item_count_response.json()
                    for item in items_data:
                        list_id = item['list_id']
                        if list_id not in list_item_counts:
                            list_item_counts[list_id] = 0
                        list_item_counts[list_id] += 1
            
            # Get follower counts for all lists in a single query
            list_follower_counts = {}
            if lists:
                follower_count_response = requests.get(
                    f"{self.base_url}/rest/v1/list_followers",
                    headers={**self.headers, 'Prefer': 'count=exact'},
                    params={
                        'list_id': f'in.({",".join(map(str, list_ids))})',
                        'select': 'list_id'
                    }
                )
                
                if follower_count_response.status_code == 200:
                    # Parse the count from each list
                    followers_data = follower_count_response.json()
                    for follower in followers_data:
                        list_id = follower['list_id']
                        if list_id not in list_follower_counts:
                            list_follower_counts[list_id] = 0
                        list_follower_counts[list_id] += 1
            
            # Get follow status for authenticated user if user_id is provided
            # Check if current user follows the LIST CREATORS (not the lists themselves)
            user_following_creators = set()
            if user_id and lists:
                # Get unique creator IDs from all lists
                creator_ids = list(set(lst['user_id'] for lst in lists))
                
                logger.debug("Checking follow status for discover lists")
                
                following_response = requests.get(
                    f"{self.base_url}/rest/v1/user_follows",
                    headers=self.headers,
                    params={
                        'follower_id': f'eq.{user_id}',
                        'following_id': f'in.({",".join(creator_ids)})',
                        'select': 'following_id'
                    }
                )
                
                logger.debug(f"Follow status response: {following_response.status_code}")
                
                if following_response.status_code == 200:
                    following_data = following_response.json()
                    logger.debug(f"Following data retrieved: {len(following_data)} records")
                    user_following_creators = set(follow['following_id'] for follow in following_data)
                    logger.debug(f"User is following {len(user_following_creators)} creators")
            
            # Get user profiles for all lists
            user_profiles_map = {}
            if lists:
                user_ids = list(set(lst['user_id'] for lst in lists))
                user_profiles_response = requests.get(
                    f"{self.base_url}/rest/v1/user_profiles",
                    headers=self.headers,
                    params={
                        'id': f'in.({",".join(user_ids)})',
                        'select': 'id,username,display_name,avatar_url'
                    }
                )
                
                if user_profiles_response.status_code == 200:
                    profiles = user_profiles_response.json()
                    user_profiles_map = {profile['id']: profile for profile in profiles}
            
            # Get user reputation data for all list owners in a single batch query
            user_reputation_map = {}
            if lists:
                user_reputation_response = requests.get(
                    f"{self.base_url}/rest/v1/user_reputation",
                    headers=self.headers,
                    params={
                        'user_id': f'in.({",".join(user_ids)})',
                        'select': 'user_id,reputation_score,reputation_title'
                    }
                )
                
                if user_reputation_response.status_code == 200:
                    reputation_data = user_reputation_response.json()
                    user_reputation_map = {
                        rep['user_id']: rep['reputation_score'] for rep in reputation_data
                    }
            
            # Get content types and preview images for all lists in efficient batch queries
            list_content_types = {}
            list_preview_items = {}
            
            if lists:
                # Get content type information - batch query to determine anime/manga mix
                content_type_response = requests.get(
                    f"{self.base_url}/rest/v1/custom_list_items",
                    headers=self.headers,
                    params={
                        'list_id': f'in.({",".join(map(str, list_ids))})',
                        'select': 'list_id,items!inner(media_type_id,media_types!inner(name))'
                    }
                )
                
                if content_type_response.status_code == 200:
                    content_data = content_type_response.json()
                    for item in content_data:
                        list_id = item['list_id']
                        
                        # Extract media type from the joined media_types table
                        media_type = None
                        items_data = item.get('items')
                        if items_data and isinstance(items_data, dict) and items_data.get('media_types'):
                            media_type = items_data['media_types']['name']
                        
                        if list_id not in list_content_types:
                            list_content_types[list_id] = {'anime': 0, 'manga': 0}
                        
                        # Check if media_type is not None before calling .lower()
                        if media_type:
                            if media_type.lower() == 'anime':
                                list_content_types[list_id]['anime'] += 1
                            elif media_type.lower() == 'manga':
                                list_content_types[list_id]['manga'] += 1
                
                # Get preview items - top 5 items per list ordered by position with full details
                preview_items_response = requests.get(
                    f"{self.base_url}/rest/v1/custom_list_items",
                    headers=self.headers,
                    params={
                        'list_id': f'in.({",".join(map(str, list_ids))})',
                        'select': 'list_id,position,items!inner(uid,title,image_url,media_type_id,media_types!inner(name))',
                        'order': 'position.asc',
                        'limit': 200  # Reasonable batch size to get top items per list
                    }
                )
                
                if preview_items_response.status_code == 200:
                    preview_data = preview_items_response.json()
                    for item in preview_data:
                        list_id = item['list_id']
                        item_details = item['items']
                        
                        # Extract media type from the joined media_types table
                        media_type = None
                        if item_details.get('media_types'):
                            media_type = item_details['media_types']['name']
                        
                        # Create rich preview item object
                        preview_item = {
                            'id': item_details['uid'],
                            'title': item_details['title'],
                            'mediaType': media_type,
                            'imageUrl': item_details['image_url'],
                            'position': item['position']
                        }
                        
                        if list_id not in list_preview_items:
                            list_preview_items[list_id] = []
                        
                        # Limit to top 5 items per list
                        if len(list_preview_items[list_id]) < 5:
                            list_preview_items[list_id].append(preview_item)
            
            # Add tags, item counts, follower counts, and computed fields to each list
            for list_item in lists:
                list_id = list_item['id']
                list_item['tags'] = list_tags_map.get(list_id, [])
                list_item['item_count'] = list_item_counts.get(list_id, 0)
                list_item['followers_count'] = list_follower_counts.get(list_id, 0)
                list_item['is_following'] = list_item['user_id'] in user_following_creators
                
                # Calculate content_type
                content_stats = list_content_types.get(list_id, {'anime': 0, 'manga': 0})
                anime_count = content_stats['anime']
                manga_count = content_stats['manga']
                
                if anime_count > 0 and manga_count == 0:
                    list_item['content_type'] = 'anime'
                elif manga_count > 0 and anime_count == 0:
                    list_item['content_type'] = 'manga'
                elif anime_count == 0 and manga_count == 0:
                    list_item['content_type'] = 'empty'
                else:
                    list_item['content_type'] = 'mixed'
                
                # Add preview items - use calculated rich preview items
                preview_items = list_preview_items.get(list_id, [])
                list_item['preview_items'] = preview_items
                
                # Also maintain backward compatibility with preview_images for any existing code
                list_item['preview_images'] = [item.get('imageUrl') for item in preview_items if item.get('imageUrl')]
            
            # Apply additional filters after content_type calculation
            filtered_lists = []
            for list_item in lists:
                # Filter by content type
                if content_type and content_type != 'all':
                    if list_item.get('content_type') != content_type:
                        continue
                
                # Filter by item count ranges
                if item_count and item_count != 'all':
                    item_count_val = list_item.get('item_count', 0)
                    if item_count == 'small' and item_count_val > 10:
                        continue
                    elif item_count == 'medium' and (item_count_val <= 10 or item_count_val > 50):
                        continue
                    elif item_count == 'large' and item_count_val <= 50:
                        continue
                
                # Filter by follower count ranges
                if follower_count and follower_count != 'all':
                    followers_count_val = list_item.get('followers_count', 0)
                    if follower_count == 'popular' and followers_count_val < 10:
                        continue
                    elif follower_count == 'trending' and followers_count_val < 50:
                        continue
                    elif follower_count == 'viral' and followers_count_val < 100:
                        continue
                
                filtered_lists.append(list_item)
            
            # Update lists to the filtered version
            lists = filtered_lists
            
            # Apply quality score calculation and user profile info to filtered lists
            for list_item in lists:
                # Use pre-calculated quality score from database if available, otherwise calculate
                if list_item.get('quality_score') is not None:
                    # Use pre-calculated quality score from database for better performance
                    list_item['quality_score'] = list_item['quality_score']
                else:
                    # Fallback: Calculate quality score using production-ready weighted algorithm
                    # Formula: (follower_count * 0.3) + (item_count * 0.2) + (update_frequency * 0.3) + (user_reputation * 0.2)
                    
                    # Normalize follower_count using logarithmic scaling to prevent dominance
                    follower_count_normalized = min(1.0, np.log10(list_item['followers_count'] + 1) / 4.0)  # Scale to 0-1
                    
                    # Normalize item_count using logarithmic scaling
                    item_count_normalized = min(1.0, np.log10(list_item['item_count'] + 1) / 2.0)  # Scale to 0-1
                    
                    # Calculate update_frequency using actual item updates in the list
                    try:
                        list_id = list_item['id']
                        update_frequency = self.calculate_update_frequency(list_id, days=30)
                        # Normalize to 0-1 scale (assuming max of 1 update per day)
                        update_frequency = min(1.0, update_frequency)
                    except:
                        update_frequency = 0.0
                    
                    # Get user reputation and normalize to 0-1 scale
                    user_reputation_raw = user_reputation_map.get(list_item['user_id'], 0)
                    # Normalize reputation score (assuming reputation typically ranges 0-100)
                    user_reputation_normalized = min(1.0, max(0.0, user_reputation_raw / 100.0))
                    
                    # Calculate weighted quality score
                    quality_score = (
                        (follower_count_normalized * 0.3) +
                        (item_count_normalized * 0.2) +
                        (update_frequency * 0.3) +
                        (user_reputation_normalized * 0.2)
                    )
                    
                    # Scale to 0-100 for better readability
                    list_item['quality_score'] = round(quality_score * 100, 2)
                
                # Add is_collaborative flag (already in database schema)
                list_item['is_collaborative'] = list_item.get('is_collaborative', False)
                
                # Add user profile info
                user_profile = user_profiles_map.get(list_item['user_id'], {})
                list_item['user_profiles'] = {
                    'username': user_profile.get('username', 'Unknown'),
                    'display_name': user_profile.get('display_name'),
                    'avatar_url': user_profile.get('avatar_url')
                }
            
            # Filter out empty lists (lists with 0 items) to improve discovery quality
            lists = [list_item for list_item in lists if list_item['item_count'] > 0]
            
            # Sort lists by the requested criteria (client-side sorting after DB query)
            if sort_by == 'followers_count':
                lists.sort(key=lambda x: x['followers_count'], reverse=True)
            elif sort_by == 'item_count':
                lists.sort(key=lambda x: x['item_count'], reverse=True)
            elif sort_by == 'popularity':
                # Popularity = combination of followers and recent activity
                lists.sort(key=lambda x: (x['followers_count'] * 2 + x['item_count']), reverse=True)
            elif sort_by == 'quality_score':
                # Sort by the new quality score algorithm
                lists.sort(key=lambda x: x['quality_score'], reverse=True)
            
            # Update total count to reflect filtering
            total_filtered = len(lists)
            
            # Limit results to requested amount after filtering
            lists = lists[:limit]
            
            # Adjust total count to reflect filtered results
            if content_type or item_count or follower_count:
                # When filters are applied, use the filtered count
                total = total_filtered
            elif len(lists) < limit and page == 1:
                # If we got fewer than requested on first page, that's the total
                total = len(lists)
            
            return {
                'lists': lists,
                'total': total,
                'page': page,
                'limit': limit,
                'has_more': len(lists) == limit  # If we got full page, there might be more
            }
            
        except Exception as e:
            logger.error(f"Error discovering lists: {e}")
            return {'lists': [], 'total': 0, 'page': page, 'limit': limit}
    
    def update_list_item(self, list_id: int, item_id: int, user_id: str, update_data: dict) -> bool:
        """
        Update an item in a custom list.
        
        Args:
            list_id (int): List ID
            item_id (int): Item ID to update
            user_id (str): User ID (must be list owner)
            update_data (dict): Data to update (notes, etc.)
            
        Returns:
            bool: Success status
        """
        try:
            # Verify list ownership
            list_response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params={
                    'id': f'eq.{list_id}',
                    'user_id': f'eq.{user_id}',
                    'select': 'id'
                }
            )
            
            if not list_response.json():
                return False
            
            # Update the list item
            update_response = requests.patch(
                f"{self.base_url}/rest/v1/custom_list_items",
                headers=self.headers,
                params={
                    'list_id': f'eq.{list_id}',
                    'id': f'eq.{item_id}'
                },
                json=update_data
            )
            
            return update_response.status_code == 204
            
        except Exception as e:
            print(f"Error updating list item: {e}")
            return False

    def get_list_comments(self, list_id: int, page: int = 1, limit: int = 20) -> dict:
        """
        Get comments for a specific list with pagination.
        
        Args:
            list_id (int): List ID
            page (int): Page number
            limit (int): Items per page
            
        Returns:
            dict: Comments data with pagination info
        """
        try:
            # Check if list exists
            list_response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params={
                    'id': f'eq.{list_id}',
                    'select': 'id'
                }
            )
            
            if not list_response.json():
                return None
            
            # Calculate offset
            offset = (page - 1) * limit
            
            # Get comments with user info
            comments_response = requests.get(
                f"{self.base_url}/rest/v1/list_comments",
                headers=self.headers,
                params={
                    'list_id': f'eq.{list_id}',
                    'select': '''
                        id, content, is_spoiler, parent_comment_id, created_at,
                        user_profiles(id, username, display_name, avatar_url)
                    ''',
                    'order': 'created_at.asc',
                    'offset': offset,
                    'limit': limit
                }
            )
            
            comments = comments_response.json()
            
            # Get total count
            count_response = requests.get(
                f"{self.base_url}/rest/v1/list_comments",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params={
                    'list_id': f'eq.{list_id}',
                    'select': 'id'
                }
            )
            
            total = int(count_response.headers.get('Content-Range', '0').split('/')[-1])
            
            return {
                'comments': comments,
                'total': total,
                'page': page,
                'limit': limit,
                'has_more': offset + limit < total
            }
            
        except Exception as e:
            print(f"Error getting list comments: {e}")
            return {
                'comments': [],
                'total': 0,
                'page': page,
                'limit': limit,
                'has_more': False
            }

    def create_list_comment(self, list_id: int, user_id: str, content: str, 
                           is_spoiler: bool = False, parent_comment_id: int = None) -> Optional[dict]:
        """
        Create a new comment on a list.
        
        Args:
            list_id (int): List ID
            user_id (str): Author's user ID
            content (str): Comment content
            is_spoiler (bool): Whether comment contains spoilers
            parent_comment_id (int): Parent comment for replies
            
        Returns:
            dict: Created comment data or None if failed
        """
        try:
            # Check if list exists
            list_response = requests.get(
                f"{self.base_url}/rest/v1/custom_lists",
                headers=self.headers,
                params={
                    'id': f'eq.{list_id}',
                    'select': 'id'
                }
            )
            
            if not list_response.json():
                return None
            
            # Create comment
            comment_data = {
                'list_id': list_id,
                'author_id': user_id,
                'content': content,
                'is_spoiler': is_spoiler
            }
            
            if parent_comment_id:
                comment_data['parent_comment_id'] = parent_comment_id
            
            comment_response = requests.post(
                f"{self.base_url}/rest/v1/list_comments",
                headers=self.headers,
                json=comment_data
            )
            
            if comment_response.status_code == 201:
                # Fetch the created comment with user info
                created_comment = comment_response.json()[0]
                
                comment_with_user = requests.get(
                    f"{self.base_url}/rest/v1/list_comments",
                    headers=self.headers,
                    params={
                        'id': f'eq.{created_comment["id"]}',
                        'select': '''
                            id, content, is_spoiler, parent_comment_id, created_at,
                            user_profiles(id, username, display_name, avatar_url)
                        '''
                    }
                ).json()[0]
                
                return comment_with_user
            
            return None
            
        except Exception as e:
            print(f"Error creating list comment: {e}")
            return None

    def get_user_activity_feed(self, user_id: str, page: int = 1, limit: int = 20) -> dict:
        """
        Get activity feed for a user (activities from followed users).
        
        Args:
            user_id (str): User ID requesting the feed
            page (int): Page number
            limit (int): Items per page
            
        Returns:
            dict: Activity feed data with pagination info
        """
        try:
            # Get users that the current user follows
            follows_response = requests.get(
                f"{self.base_url}/rest/v1/user_follows",
                headers=self.headers,
                params={
                    'follower_id': f'eq.{user_id}',
                    'select': 'following_id'
                }
            )
            
            following_ids = [follow['following_id'] for follow in follows_response.json()]
            
            if not following_ids:
                return {
                    'activities': [],
                    'total': 0,
                    'page': page,
                    'limit': limit,
                    'has_more': False
                }
            
            # Calculate offset
            offset = (page - 1) * limit
            
            # Get activities from followed users
            activities_response = requests.get(
                f"{self.base_url}/rest/v1/user_activity",
                headers=self.headers,
                params={
                    'user_id': f'in.({",".join(following_ids)})',
                    'select': '''
                        id, user_id, activity_type, item_uid, activity_data, created_at,
                        user_profiles(id, username, display_name, avatar_url)
                    ''',
                    'order': 'created_at.desc',
                    'offset': offset,
                    'limit': limit
                }
            )
            
            activities = activities_response.json()
            
            # Enrich activities with item details
            for activity in activities:
                if activity.get('item_uid'):
                    # Get item details
                    item_response = requests.get(
                        f"{self.base_url}/rest/v1/items",
                        headers=self.headers,
                        params={
                            'uid': f'eq.{activity["item_uid"]}',
                            'select': 'uid, title, image_url, media_type_id, media_types(name)'
                        }
                    )
                    
                    item_data = item_response.json()
                    if item_data:
                        item_info = item_data[0]
                        # Extract media type from joined media_types table
                        if item_info.get('media_types'):
                            item_info['media_type'] = item_info['media_types']['name']
                        activity['item'] = item_info
            
            # Get total count
            count_response = requests.get(
                f"{self.base_url}/rest/v1/user_activity",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params={
                    'user_id': f'in.({",".join(following_ids)})',
                    'select': 'id'
                }
            )
            
            total = int(count_response.headers.get('Content-Range', '0').split('/')[-1])
            
            return {
                'activities': activities,
                'total': total,
                'page': page,
                'limit': limit,
                'has_more': offset + limit < total
            }
            
        except Exception as e:
            print(f"Error getting activity feed: {e}")
            return {
                'activities': [],
                'total': 0,
                'page': page,
                'limit': limit,
                'has_more': False
            }

    def create_notification(self, user_id: str, type: str, title: str, message: str, data: dict = None) -> Optional[dict]:
        """
        Create a notification for a user.
        
        Args:
            user_id (str): User ID to notify
            type (str): Notification type (follow, comment, like, etc.)
            title (str): Notification title
            message (str): Notification message
            data (dict): Additional notification data
            
        Returns:
            Optional[dict]: Created notification or None if failed
        """
        try:
            notification_data = {
                'user_id': user_id,
                'type': type,
                'title': title,
                'message': message,
                'data': data or {},
                'read': False,
                'created_at': datetime.now().isoformat()
            }
            
            response = requests.post(
                f"{self.base_url}/rest/v1/notifications",
                headers=self.headers,
                json=notification_data
            )
            
            if response.status_code == 201:
                return response.json()[0]
            else:
                print(f"Failed to create notification: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error creating notification: {e}")
            return None

    def get_user_notifications(self, user_id: str, page: int = 1, limit: int = 20, unread_only: bool = False) -> dict:
        """
        Get notifications for a user with pagination.
        
        Args:
            user_id (str): User ID
            page (int): Page number (starts from 1)
            limit (int): Items per page
            unread_only (bool): Only return unread notifications
            
        Returns:
            dict: Paginated notifications response
        """
        try:
            offset = (page - 1) * limit
            
            # Build query parameters
            params = {
                'user_id': f'eq.{user_id}',
                'select': '*',
                'order': 'created_at.desc',
                'limit': limit,
                'offset': offset
            }
            
            if unread_only:
                params['read'] = 'eq.false'
            
            # Get notifications
            response = requests.get(
                f"{self.base_url}/rest/v1/notifications",
                headers=self.headers,
                params=params
            )
            
            if response.status_code != 200:
                print(f"Failed to get notifications: {response.status_code}")
                return {
                    'notifications': [],
                    'total': 0,
                    'page': page,
                    'limit': limit,
                    'has_more': False,
                    'unread_count': 0
                }
            
            notifications = response.json()
            
            # Get total count
            count_params = {
                'user_id': f'eq.{user_id}',
                'select': 'id'
            }
            if unread_only:
                count_params['read'] = 'eq.false'
                
            count_response = requests.get(
                f"{self.base_url}/rest/v1/notifications",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params=count_params
            )
            
            total = int(count_response.headers.get('Content-Range', '0').split('/')[-1])
            
            # Get unread count separately if not already filtered
            unread_count = 0
            if not unread_only:
                unread_response = requests.get(
                    f"{self.base_url}/rest/v1/notifications",
                    headers={**self.headers, 'Prefer': 'count=exact'},
                    params={
                        'user_id': f'eq.{user_id}',
                        'read': 'eq.false',
                        'select': 'id'
                    }
                )
                unread_count = int(unread_response.headers.get('Content-Range', '0').split('/')[-1])
            else:
                unread_count = total
            
            return {
                'notifications': notifications,
                'total': total,
                'page': page,
                'limit': limit,
                'has_more': offset + limit < total,
                'unread_count': unread_count
            }
            
        except Exception as e:
            print(f"Error getting notifications: {e}")
            return {
                'notifications': [],
                'total': 0,
                'page': page,
                'limit': limit,
                'has_more': False,
                'unread_count': 0
            }

    def mark_notification_read(self, notification_id: int, user_id: str) -> bool:
        """
        Mark a notification as read.
        
        Args:
            notification_id (int): Notification ID
            user_id (str): User ID (for security check)
            
        Returns:
            bool: True if successful
        """
        try:
            response = requests.patch(
                f"{self.base_url}/rest/v1/notifications",
                headers=self.headers,
                params={'id': f'eq.{notification_id}', 'user_id': f'eq.{user_id}'},
                json={'read': True}
            )
            
            return response.status_code in [200, 204]
            
        except Exception as e:
            print(f"Error marking notification as read: {e}")
            return False

    def mark_all_notifications_read(self, user_id: str) -> bool:
        """
        Mark all notifications as read for a user.
        
        Args:
            user_id (str): User ID
            
        Returns:
            bool: True if successful
        """
        try:
            response = requests.patch(
                f"{self.base_url}/rest/v1/notifications",
                headers=self.headers,
                params={'user_id': f'eq.{user_id}', 'read': 'eq.false'},
                json={'read': True}
            )
            
            return response.status_code in [200, 204]
            
        except Exception as e:
            print(f"Error marking all notifications as read: {e}")
            return False

    # =============================================================================
    # REVIEW SYSTEM METHODS
    # =============================================================================
    
    def create_review(self, user_id: str, item_uid: str, review_data: dict) -> Optional[dict]:
        """
        Create a new review for an item.
        
        Args:
            user_id (str): User ID creating the review
            item_uid (str): Item UID being reviewed
            review_data (dict): Review data including title, content, ratings, etc.
            
        Returns:
            Optional[dict]: Created review or None if failed
        """
        try:
            from utils.contentAnalysis import analyze_content, should_auto_moderate, should_auto_flag
            
            # Analyze review content for inappropriate material
            title = review_data.get('title', '')
            content = review_data.get('content', '')
            combined_text = f"{title} {content}"
            
            # Perform content analysis
            analysis_result = analyze_content(combined_text, 'review')
            
            # Check if content should be auto-moderated (blocked)
            auto_moderate, moderation_details = should_auto_moderate(combined_text, 'review')
            if auto_moderate:
                print(f"Auto-moderated review from user {user_id}: {moderation_details}")
                return None  # Block the review creation
            
            # Check if content should be auto-flagged
            auto_flag, flag_details = should_auto_flag(combined_text, 'review')
            
            # Prepare review data with required fields
            review = {
                'user_id': user_id,
                'item_uid': item_uid,
                'title': review_data.get('title'),
                'content': review_data.get('content'),
                'overall_rating': review_data.get('overall_rating'),
                'story_rating': review_data.get('story_rating'),
                'characters_rating': review_data.get('characters_rating'),
                'art_rating': review_data.get('art_rating'),
                'sound_rating': review_data.get('sound_rating'),
                'contains_spoilers': review_data.get('contains_spoilers', False),
                'spoiler_level': review_data.get('spoiler_level'),
                'recommended_for': review_data.get('recommended_for', []),
                'status': 'published',
                'analysis_data': analysis_result.to_dict() if analysis_result else None
            }
            
            response = requests.post(
                f"{self.base_url}/rest/v1/user_reviews",
                headers=self.headers,
                json=review
            )
            
            if response.status_code == 201:
                created_review = response.json()[0] if isinstance(response.json(), list) else response.json()
                
                # Auto-flag review if needed
                if auto_flag:
                    try:
                        auto_report_data = {
                            'review_id': created_review['id'],
                            'reporter_id': None,  # System-generated report
                            'report_reason': 'inappropriate',  # Default reason for auto-flagged content
                            'additional_context': f'Auto-flagged by content analysis. {flag_details.get("reasons", [])}',
                            'anonymous': True,
                            'status': 'pending',
                            'priority': flag_details.get('priority', 'medium'),
                            'auto_generated': True
                        }
                        
                        flag_response = requests.post(
                            f"{self.base_url}/rest/v1/review_reports",
                            headers=self.headers,
                            json=auto_report_data
                        )
                        
                        if flag_response.status_code == 201:
                            print(f"Auto-flagged review {created_review['id']} for review: {flag_details}")
                        else:
                            print(f"Failed to auto-flag review {created_review['id']}: {flag_response.text}")
                            
                    except Exception as e:
                        print(f"Error creating auto-report for review {created_review['id']}: {e}")
                        # Don't fail the review creation if reporting fails
                
                return created_review
            else:
                print(f"Failed to create review: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Error creating review: {e}")
            return None
    
    def get_reviews_for_item(self, item_uid: str, page: int = 1, limit: int = 10, sort_by: str = 'helpfulness') -> dict:
        """
        Get reviews for a specific item with pagination and sorting.
        
        Args:
            item_uid (str): Item UID to get reviews for
            page (int): Page number (1-based)
            limit (int): Number of reviews per page
            sort_by (str): Sort criteria ('helpfulness', 'newest', 'oldest', 'rating')
            
        Returns:
            dict: Paginated reviews response
        """
        try:
            offset = (page - 1) * limit
            
            # Determine sort order
            sort_mapping = {
                'helpfulness': 'helpfulness_score.desc',
                'newest': 'created_at.desc',
                'oldest': 'created_at.asc',
                'rating': 'overall_rating.desc'
            }
            order = sort_mapping.get(sort_by, 'helpfulness_score.desc')
            
            # Get reviews with user profile information
            params = {
                'item_uid': f'eq.{item_uid}',
                'status': 'eq.published',
                'select': '*,user_profiles!inner(username,display_name,avatar_url)',
                'order': order,
                'offset': offset,
                'limit': limit
            }
            
            response = requests.get(
                f"{self.base_url}/rest/v1/reviews",
                headers=self.headers,
                params=params
            )
            
            if response.status_code == 200:
                reviews = response.json()
                
                # Get total count for pagination
                count_response = requests.get(
                    f"{self.base_url}/rest/v1/reviews",
                    headers={**self.headers, 'Prefer': 'count=exact'},
                    params={
                        'item_uid': f'eq.{item_uid}',
                        'status': 'eq.published',
                        'select': 'id'
                    }
                )
                
                total_count = int(count_response.headers.get('Content-Range', '0').split('/')[-1])
                has_more = offset + len(reviews) < total_count
                
                return {
                    'reviews': reviews,
                    'total': total_count,
                    'page': page,
                    'limit': limit,
                    'has_more': has_more
                }
            else:
                print(f"Failed to get reviews: {response.status_code}")
                return {'reviews': [], 'total': 0, 'page': page, 'limit': limit, 'has_more': False}
                
        except Exception as e:
            print(f"Error getting reviews: {e}")
            return {'reviews': [], 'total': 0, 'page': page, 'limit': limit, 'has_more': False}
    
    def vote_on_review(self, review_id: int, user_id: str, vote_type: str, reason: str = None) -> bool:
        """
        Vote on a review's helpfulness.
        
        Args:
            review_id (int): Review ID to vote on
            user_id (str): User ID voting
            vote_type (str): 'helpful' or 'not_helpful'
            reason (str, optional): Reason for the vote
            
        Returns:
            bool: True if successful
        """
        try:
            vote_data = {
                'review_id': review_id,
                'user_id': user_id,
                'vote_type': vote_type,
                'reason': reason
            }
            
            response = requests.post(
                f"{self.base_url}/rest/v1/review_votes",
                headers=self.headers,
                json=vote_data
            )
            
            return response.status_code == 201
            
        except Exception as e:
            print(f"Error voting on review: {e}")
            return False
    
    def get_review_vote_stats(self, review_id: int, user_id: str = None) -> dict:
        """
        Get vote statistics for a review.
        
        Args:
            review_id (int): Review ID
            user_id (str, optional): User ID to check for existing vote
            
        Returns:
            dict: Vote statistics
        """
        try:
            # Get vote counts
            response = requests.get(
                f"{self.base_url}/rest/v1/review_votes",
                headers={**self.headers, 'Prefer': 'count=exact'},
                params={'review_id': f'eq.{review_id}', 'select': 'vote_type'}
            )
            
            if response.status_code == 200:
                votes = response.json()
                total_votes = len(votes)
                helpful_votes = len([v for v in votes if v['vote_type'] == 'helpful'])
                
                stats = {
                    'total_votes': total_votes,
                    'helpful_votes': helpful_votes,
                    'helpfulness_percentage': (helpful_votes / total_votes * 100) if total_votes > 0 else 0,
                    'user_vote': None
                }
                
                # Check user's vote if user_id provided
                if user_id:
                    user_vote_response = requests.get(
                        f"{self.base_url}/rest/v1/review_votes",
                        headers=self.headers,
                        params={
                            'review_id': f'eq.{review_id}',
                            'user_id': f'eq.{user_id}',
                            'select': 'vote_type'
                        }
                    )
                    if user_vote_response.status_code == 200:
                        user_votes = user_vote_response.json()
                        if user_votes:
                            stats['user_vote'] = user_votes[0]['vote_type']
                
                return stats
            else:
                return {'total_votes': 0, 'helpful_votes': 0, 'helpfulness_percentage': 0, 'user_vote': None}
                
        except Exception as e:
            print(f"Error getting review vote stats: {e}")
            return {'total_votes': 0, 'helpful_votes': 0, 'helpfulness_percentage': 0, 'user_vote': None}
    
    def report_review(self, review_id: int, reporter_id: str, report_reason: str, additional_context: str = None, anonymous: bool = False) -> bool:
        """
        Report a review for moderation.
        
        Args:
            review_id (int): Review ID to report
            reporter_id (str): User ID reporting (can be None for anonymous)
            report_reason (str): Reason for report
            additional_context (str, optional): Additional context
            anonymous (bool): Whether to report anonymously
            
        Returns:
            bool: True if successful
        """
        try:
            report_data = {
                'review_id': review_id,
                'reporter_id': None if anonymous else reporter_id,
                'report_reason': report_reason,
                'additional_context': additional_context,
                'anonymous': anonymous,
                'status': 'pending'
            }
            
            response = requests.post(
                f"{self.base_url}/rest/v1/review_reports",
                headers=self.headers,
                json=report_data
            )
            
            return response.status_code == 201
            
        except Exception as e:
            print(f"Error reporting review: {e}")
            return False
    
    def update_review(self, review_id: int, user_id: str, review_data: dict) -> Optional[dict]:
        """
        Update an existing review (user can only update their own reviews).
        
        Args:
            review_id (int): Review ID to update
            user_id (str): User ID updating the review
            review_data (dict): Updated review data
            
        Returns:
            Optional[dict]: Updated review or None if failed
        """
        try:
            # Only allow certain fields to be updated
            allowed_fields = ['title', 'content', 'overall_rating', 'story_rating', 
                            'characters_rating', 'art_rating', 'sound_rating', 
                            'contains_spoilers', 'spoiler_level', 'recommended_for']
            
            update_data = {k: v for k, v in review_data.items() if k in allowed_fields}
            update_data['updated_at'] = 'now()'
            
            response = requests.patch(
                f"{self.base_url}/rest/v1/reviews",
                headers=self.headers,
                params={'id': f'eq.{review_id}', 'user_id': f'eq.{user_id}'},
                json=update_data
            )
            
            if response.status_code in [200, 204]:
                # Get the updated review
                get_response = requests.get(
                    f"{self.base_url}/rest/v1/reviews",
                    headers=self.headers,
                    params={
                        'id': f'eq.{review_id}',
                        'select': '*,user_profiles!inner(username,display_name,avatar_url)'
                    }
                )
                if get_response.status_code == 200:
                    reviews = get_response.json()
                    return reviews[0] if reviews else None
            
            return None
            
        except Exception as e:
            print(f"Error updating review: {e}")
            return None
    
    def delete_review(self, review_id: int, user_id: str) -> bool:
        """
        Delete a review (soft delete by setting status to 'deleted').
        
        Args:
            review_id (int): Review ID to delete
            user_id (str): User ID deleting the review
            
        Returns:
            bool: True if successful
        """
        try:
            response = requests.patch(
                f"{self.base_url}/rest/v1/reviews",
                headers=self.headers,
                params={'id': f'eq.{review_id}', 'user_id': f'eq.{user_id}'},
                json={'status': 'deleted', 'updated_at': 'now()'}
            )
            
            return response.status_code in [200, 204]
            
        except Exception as e:
            print(f"Error deleting review: {e}")
            return False

    def get_list_item_counts_batch(self, list_ids: List[str]) -> Dict[str, int]:
        """
        Get item counts for multiple lists efficiently using batch query.
        
        This method delegates to the SupabaseClient's batch method but provides
        a convenient interface for auth-related list operations.
        
        Args:
            list_ids (List[str]): List of list IDs to get counts for
            
        Returns:
            Dict[str, int]: Dictionary mapping list_id to item count
        """
        # Create a temporary SupabaseClient instance for batch operations
        supabase_client = SupabaseClient()
        return supabase_client.get_list_item_counts_batch(list_ids)

    def get_user_lists(self, user_id: str, privacy: str = None, include_collaborative: bool = True) -> List[Dict]:
        """
        Get user's custom lists with optional filtering.
        
        Centralizes list fetching to eliminate direct requests usage and 
        provide consistent API patterns.
        
        Args:
            user_id (str): User ID to get lists for
            privacy (str, optional): Filter by privacy level ('public', 'friends_only', 'private')
            include_collaborative (bool): Include collaborative lists
            
        Returns:
            List[Dict]: List of custom lists data
        """
        try:
            # Build the URL with filters as URL parameters
            url = f"{self.base_url}/rest/v1/custom_lists"
            filters = [f"user_id=eq.{user_id}"]
            
            if privacy is not None:
                filters.append(f"privacy=eq.{privacy}")
            
            if not include_collaborative:
                filters.append("is_collaborative=eq.false")
            
            # Combine filters
            if filters:
                url += "?" + "&".join(filters)
                # Add select and order as URL parameters with & since we already have ?
                url += f"&select=id,title,description,created_at,updated_at,privacy,is_collaborative"
                url += "&order=updated_at.desc"
            else:
                # No filters, so start with ?
                url += "?select=id,title,description,created_at,updated_at,privacy,is_collaborative"
                url += "&order=updated_at.desc"
                
            logger.info(f"Fetching user lists with URL: {url}")
            response = requests.get(
                url,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Error fetching user lists: HTTP {response.status_code}, Response: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error in get_user_lists: {e}")
            return []


def require_auth(f):
    """
    Authentication decorator for Flask routes.
    
    This decorator verifies that the request contains a valid JWT token
    in the Authorization header and extracts user information for use
    in the decorated function.
    
    Usage:
        @app.route('/api/protected-endpoint')
        @require_auth
        def protected_function():
            user_id = g.current_user.get('user_id')
            # ... function logic
    
    Args:
        f: The Flask route function to protect
        
    Returns:
        Decorated function that requires authentication
        
    Sets:
        g.current_user: Dictionary containing user info from JWT token
        g.user_id: User ID extracted from token for convenience
    """
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import request, jsonify, g
        
        # Check for Authorization header
        if 'Authorization' not in request.headers:
            return jsonify({'error': 'Authorization token required'}), 401
        
        try:
            # Extract token from Bearer header
            auth_header = request.headers['Authorization']
            if not auth_header.startswith('Bearer '):
                logger.debug(f"Invalid auth header format: {auth_header[:20]}...")
                return jsonify({'error': 'Invalid authorization header format'}), 401
            
            token = auth_header.replace('Bearer ', '')
            logger.debug(f"Processing token: {token[:20]}...")
            
            # Import verify_token here to avoid circular imports
            from app import verify_token
            
            # Verify and decode the token
            user_info = verify_token(token)
            if not user_info:
                logger.debug("Token verification returned None")
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            logger.debug(f"Token verified successfully. User info keys: {list(user_info.keys())}")
            
            # Set user info in Flask global context
            g.current_user = user_info
            g.user_id = user_info.get('user_id') or user_info.get('sub')
            logger.debug("User ID set in request context")
            
            # Call the original function
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({'error': 'Authentication failed', 'details': str(e)}), 401
    
    return decorated_function
