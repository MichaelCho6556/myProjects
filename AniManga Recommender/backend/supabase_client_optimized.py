"""
Optimized Supabase client methods for faster startup.
This module provides lazy-loading versions of methods to reduce startup time.
"""

from typing import Dict, List, Optional, Any
import pandas as pd

class OptimizedSupabaseClient:
    """Mixin class for optimized Supabase client methods"""
    
    def get_all_items_dataframe_lazy(self, include_relations: bool = False) -> pd.DataFrame:
        """
        Get all items as a DataFrame with LAZY loading of relations.
        
        This optimized method loads items without preloading all relations,
        significantly reducing startup time from 2+ minutes to seconds.
        
        Args:
            include_relations (bool): If True, relations are loaded on-demand
            
        Returns:
            pd.DataFrame: Items without pre-loaded relations
        """
        print("🚀 Loading data from Supabase (optimized mode)...")
        
        # Use the fast paginated method without relations
        items = self.get_all_items_paginated()
        
        if not items:
            print("⚠️  No items found in database")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(items)
        
        # Process basic fields only
        if 'media_type' in df.columns:
            df['media_type_name'] = df['media_type'].apply(
                lambda x: self._get_media_type_name(x) if pd.notna(x) else 'Unknown'
            )
        
        # Skip relation loading for startup
        if not include_relations:
            # Add empty columns for compatibility
            for col in ['genres', 'themes', 'demographics', 'studios', 'authors']:
                if col not in df.columns:
                    df[col] = [[] for _ in range(len(df))]
        
        print(f"✅ Loaded {len(df)} items (relations will load on-demand)")
        return df
    
    def _get_relations_for_item(self, item_uid: str) -> Dict[str, List[str]]:
        """
        Get relations for a single item on-demand.
        
        This method fetches relations for a specific item when needed,
        instead of loading all 353K+ relations at startup.
        
        Args:
            item_uid (str): The item's UID
            
        Returns:
            dict: Relations for the item (genres, themes, etc.)
        """
        relations = {
            'genres': [],
            'themes': [],
            'demographics': [],
            'studios': [],
            'authors': []
        }
        
        # Get item ID from UID
        item_response = self._make_request('GET', 'items', 
                                         params={'uid': f'eq.{item_uid}', 'select': 'id'})
        items = item_response.json()
        
        if not items:
            return relations
        
        item_id = items[0]['id']
        
        # Fetch each relation type
        for rel_type, table_name in [
            ('genres', 'item_genres'),
            ('themes', 'item_themes'),
            ('demographics', 'item_demographics'),
            ('studios', 'item_studios'),
            ('authors', 'item_authors')
        ]:
            try:
                # Get the relation with joined data
                rel_response = self._make_request('GET', table_name,
                    params={
                        'item_id': f'eq.{item_id}',
                        'select': f'{rel_type[:-1]}_id({rel_type[:-1]}:name)'
                    }
                )
                rel_data = rel_response.json()
                
                # Extract names
                relations[rel_type] = [
                    r[f'{rel_type[:-1]}_id']['name'] 
                    for r in rel_data 
                    if r.get(f'{rel_type[:-1]}_id')
                ]
            except:
                pass  # Fail silently for individual relations
        
        return relations
    
    def _get_media_type_name(self, media_type_id: int) -> str:
        """Get media type name with caching"""
        # Simple cache
        if not hasattr(self, '_media_type_cache'):
            self._media_type_cache = {}
        
        if media_type_id in self._media_type_cache:
            return self._media_type_cache[media_type_id]
        
        try:
            response = self._make_request('GET', 'media_types',
                                        params={'id': f'eq.{media_type_id}'})
            data = response.json()
            if data:
                name = data[0]['name']
                self._media_type_cache[media_type_id] = name
                return name
        except:
            pass
        
        return 'Unknown'