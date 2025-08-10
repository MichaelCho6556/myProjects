#!/usr/bin/env python3
"""
Pre-compute recommendations for all items and store in cache.
This script runs offline (locally or via GitHub Actions) to generate
recommendations without memory constraints.
"""

import os
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import SupabaseClient

# Load environment variables (optional - for local development)
# In GitHub Actions, environment variables are set directly
if os.path.exists('.env'):
    load_dotenv()

class RecommendationComputer:
    """Compute and cache recommendations for all items."""
    
    def __init__(self):
        self.client = SupabaseClient()
        self.df = None
        self.tfidf_matrix = None
        self.vectorizer = None
        self.uid_to_idx = None
        
    def load_data(self) -> bool:
        """Load all items from database."""
        print(f"[{datetime.now()}] Loading data from Supabase...")
        
        # Load with relations for better recommendations
        self.df = self.client.items_to_dataframe(include_relations=True, lazy_load=False)
        
        if self.df is None or len(self.df) == 0:
            print("ERROR: No data loaded from Supabase")
            return False
            
        print(f"Loaded {len(self.df)} items")
        return True
        
    def prepare_features(self):
        """Prepare text features for TF-IDF."""
        print(f"[{datetime.now()}] Preparing features...")
        
        # Create combined text features
        text_features = []
        for _, row in self.df.iterrows():
            features = []
            
            # Add synopsis
            synopsis = row.get('synopsis')
            if synopsis is not None and pd.notna(synopsis):
                features.append(str(synopsis))
                
            # Add genres  
            genres = row.get('genres')
            if genres is not None:
                # Convert numpy array to list if needed
                if hasattr(genres, 'tolist'):
                    genres = genres.tolist()
                if isinstance(genres, (list, np.ndarray)):
                    # Filter out None/NaN values
                    genres_list = [g for g in genres if g is not None and pd.notna(g)]
                    features.extend([f"genre_{g}" for g in genres_list])
                
            # Add themes
            themes = row.get('themes')
            if themes is not None:
                # Convert numpy array to list if needed
                if hasattr(themes, 'tolist'):
                    themes = themes.tolist()
                if isinstance(themes, (list, np.ndarray)):
                    # Filter out None/NaN values
                    themes_list = [t for t in themes if t is not None and pd.notna(t)]
                    features.extend([f"theme_{t}" for t in themes_list])
                
            # Add demographics
            demographics = row.get('demographics')
            if demographics is not None:
                # Convert numpy array to list if needed
                if hasattr(demographics, 'tolist'):
                    demographics = demographics.tolist()
                if isinstance(demographics, (list, np.ndarray)):
                    # Filter out None/NaN values
                    demographics_list = [d for d in demographics if d is not None and pd.notna(d)]
                    features.extend([f"demographic_{d}" for d in demographics_list])
                
            # Add media type
            media_type = row.get('media_type')
            if media_type is not None and pd.notna(media_type):
                features.append(f"type_{media_type}")
                
            text_features.append(' '.join(features))
            
        self.df['combined_features'] = text_features
        
    def compute_tfidf(self):
        """Compute TF-IDF matrix."""
        print(f"[{datetime.now()}] Computing TF-IDF matrix...")
        
        # Use limited features to reduce memory
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=3000,  # Limit features
            min_df=2,           # Ignore very rare terms
            max_df=0.95         # Ignore very common terms
        )
        
        self.tfidf_matrix = self.vectorizer.fit_transform(self.df['combined_features'])
        
        # Create UID to index mapping
        self.df.reset_index(drop=True, inplace=True)
        self.uid_to_idx = pd.Series(self.df.index, index=self.df['uid'])
        
        print(f"TF-IDF matrix shape: {self.tfidf_matrix.shape}")
        
    def get_recommendations(self, item_uid: str, top_n: int = 20) -> List[Dict]:
        """Get recommendations for a single item."""
        if item_uid not in self.uid_to_idx:
            return []
            
        idx = self.uid_to_idx[item_uid]
        
        # Compute similarities
        item_vector = self.tfidf_matrix[idx]
        similarities = cosine_similarity(item_vector, self.tfidf_matrix).flatten()
        
        # Get top similar items (excluding itself)
        similar_indices = similarities.argsort()[-top_n-1:-1][::-1]
        
        recommendations = []
        for sim_idx in similar_indices:
            if sim_idx != idx:  # Skip the item itself
                item = self.df.iloc[sim_idx]
                recommendations.append({
                    'uid': item['uid'],
                    'title': item['title'],
                    'media_type': item.get('media_type', 'unknown'),
                    'score': float(item.get('score', 0)),
                    'similarity': float(similarities[sim_idx]),
                    'genres': item.get('genres', []),
                    'image_url': item.get('image_url', '')
                })
                
        return recommendations[:top_n]
        
    def compute_all_recommendations(self, batch_size: int = 100):
        """Compute recommendations for all items and save to cache."""
        print(f"[{datetime.now()}] Computing recommendations for {len(self.df)} items...")
        
        total_items = len(self.df)
        processed = 0
        
        for batch_start in range(0, total_items, batch_size):
            batch_end = min(batch_start + batch_size, total_items)
            batch_items = self.df.iloc[batch_start:batch_end]
            
            batch_data = []
            for _, item in batch_items.iterrows():
                recommendations = self.get_recommendations(item['uid'])
                
                if recommendations:
                    batch_data.append({
                        'item_uid': item['uid'],
                        'recommendations': json.dumps(recommendations),
                        'similarity_scores': json.dumps({
                            'count': len(recommendations),
                            'avg_similarity': sum(r['similarity'] for r in recommendations) / len(recommendations)
                        }),
                        'computed_at': datetime.utcnow().isoformat()
                    })
                    
            # Store batch in database
            if batch_data:
                self.store_recommendations_batch(batch_data)
                
            processed += len(batch_items)
            print(f"Processed {processed}/{total_items} items ({processed*100//total_items}%)")
            
    def store_recommendations_batch(self, batch_data: List[Dict]):
        """Store a batch of recommendations in the cache table."""
        try:
            # Use upsert to update existing records
            response = self.client.table('recommendations_cache').upsert(
                batch_data
            ).execute()
            
            if response.data:
                print(f"Stored {len(batch_data)} recommendations")
        except Exception as e:
            print(f"ERROR storing batch: {e}")
            
    def compute_distinct_values(self):
        """Compute and cache distinct values for filters."""
        print(f"[{datetime.now()}] Computing distinct values...")
        
        def get_unique_from_lists(column_name):
            all_values = set()
            if column_name in self.df.columns:
                for item_list in self.df[column_name].dropna():
                    # Convert numpy array to list if needed
                    if hasattr(item_list, 'tolist'):
                        item_list = item_list.tolist()
                    if isinstance(item_list, (list, np.ndarray)):
                        all_values.update(str(v).strip() for v in item_list if v and pd.notna(v))
                    elif item_list and pd.notna(item_list):
                        all_values.add(str(item_list).strip())
            return sorted(list(all_values))
            
        distinct_values = {
            'id': 1,  # Single row table
            'genres': json.dumps(get_unique_from_lists('genres')),
            'themes': json.dumps(get_unique_from_lists('themes')),
            'demographics': json.dumps(get_unique_from_lists('demographics')),
            'studios': json.dumps(get_unique_from_lists('studios')),
            'authors': json.dumps(get_unique_from_lists('authors')),
            'statuses': json.dumps(sorted(self.df['status'].dropna().unique().tolist())),
            'media_types': json.dumps(sorted(self.df['media_type'].dropna().unique().tolist())),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        try:
            # Upsert the single row
            response = self.client.table('distinct_values_cache').upsert(
                distinct_values
            ).execute()
            
            if response.data:
                print("Distinct values cached successfully")
        except Exception as e:
            print(f"ERROR caching distinct values: {e}")
            
    def run(self):
        """Main execution flow."""
        start_time = time.time()
        
        print("=" * 60)
        print("RECOMMENDATION PRE-COMPUTATION SCRIPT")
        print("=" * 60)
        
        # Load data
        if not self.load_data():
            print("Failed to load data. Exiting.")
            return 1
            
        # Prepare features
        self.prepare_features()
        
        # Compute TF-IDF
        self.compute_tfidf()
        
        # Compute and store recommendations
        self.compute_all_recommendations()
        
        # Compute and store distinct values
        self.compute_distinct_values()
        
        elapsed_time = time.time() - start_time
        print("=" * 60)
        print(f"COMPLETED in {elapsed_time:.2f} seconds")
        print("=" * 60)
        
        return 0

if __name__ == "__main__":
    computer = RecommendationComputer()
    sys.exit(computer.run())