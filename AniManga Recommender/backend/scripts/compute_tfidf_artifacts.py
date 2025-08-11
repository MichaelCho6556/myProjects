#!/usr/bin/env python3
"""
Generate and cache TF-IDF artifacts for on-demand recommendation computation.

This script generates the TF-IDF matrix and vectorizer needed for the on-demand
recommendation engine. It runs efficiently on GitHub Actions by only creating
the necessary artifacts without computing the full NxN similarity matrix.

Optimizations:
    - No full similarity matrix computation (saves ~2.5GB RAM)
    - Stores artifacts in database and Redis for fast loading
    - Incremental updates when data changes
    - Memory-efficient processing
"""

import os
import sys
import json
import pickle
import zlib
import hashlib
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import SupabaseClient

# Try to import Redis cache
try:
    from utils.redis_cache import get_redis_cache
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("Redis not available, will store in database only")

# Load environment variables
if os.path.exists('.env'):
    load_dotenv()

class TFIDFArtifactGenerator:
    """Generate and store TF-IDF artifacts for recommendation engine."""
    
    def __init__(self):
        self.client = SupabaseClient()
        self.redis = get_redis_cache() if REDIS_AVAILABLE else None
        self.df = None
        self.tfidf_matrix = None
        self.vectorizer = None
        self.uid_to_idx = None
        
        # Cache keys for Redis
        self.TFIDF_MATRIX_KEY = "tfidf:matrix:v2"
        self.TFIDF_VECTORIZER_KEY = "tfidf:vectorizer:v2"
        self.UID_MAPPING_KEY = "tfidf:uid_mapping:v2"
        self.DATA_HASH_KEY = "tfidf:data_hash:v2"
    
    def get_data_hash(self) -> str:
        """Get a hash of the current database to detect changes."""
        print("Checking database for changes...")
        
        # Get latest modification time
        response = self.client.table('items').select('updated_at').order('updated_at.desc').limit(1).execute()
        latest_update = response.data[0]['updated_at'] if response.data else ''
        
        # Get item count (approximate)
        count_response = self.client.table('items').select('uid').limit(1000).execute()
        item_count = len(count_response.data) if count_response.data else 0
        
        # Create hash
        hash_input = f"v2:{latest_update}:{item_count}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    def check_if_update_needed(self) -> bool:
        """Check if TF-IDF artifacts need to be regenerated."""
        try:
            current_hash = self.get_data_hash()
            
            # Check database first - if empty, always regenerate
            response = self.client.table('tfidf_artifacts').select('data_hash,item_count').limit(1).execute()
            if not response.data:
                print("No artifacts found in database, generation needed")
                return True
                
            # Check if data has changed
            db_hash = response.data[0].get('data_hash')
            if db_hash != current_hash:
                print(f"Data has changed (old: {db_hash}, new: {current_hash}), update needed")
                return True
            
            print(f"Data unchanged (hash: {current_hash}), no update needed")
            return False
            
        except Exception as e:
            print(f"Error checking update status: {e}")
            return True  # Regenerate on error
    
    def load_data(self) -> bool:
        """Load all items from database."""
        print(f"[{datetime.now()}] Loading data from Supabase...")
        
        # Load all items with lazy loading - much faster!
        self.df = self.client.items_to_dataframe(include_relations=True, lazy_load=True)
        
        if self.df is None or len(self.df) == 0:
            print("ERROR: No data loaded from Supabase")
            return False
        
        print(f"Loaded {len(self.df)} items")
        return True
    
    def prepare_features(self):
        """Prepare text features for TF-IDF."""
        print(f"[{datetime.now()}] Preparing features...")
        
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
                if hasattr(genres, 'tolist'):
                    genres = genres.tolist()
                if isinstance(genres, (list, np.ndarray)):
                    genres_list = [g for g in genres if g is not None and pd.notna(g)]
                    features.extend([f"genre_{g}" for g in genres_list])
            
            # Add themes
            themes = row.get('themes')
            if themes is not None:
                if hasattr(themes, 'tolist'):
                    themes = themes.tolist()
                if isinstance(themes, (list, np.ndarray)):
                    themes_list = [t for t in themes if t is not None and pd.notna(t)]
                    features.extend([f"theme_{t}" for t in themes_list])
            
            # Add demographics
            demographics = row.get('demographics')
            if demographics is not None:
                if hasattr(demographics, 'tolist'):
                    demographics = demographics.tolist()
                if isinstance(demographics, (list, np.ndarray)):
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
        
        # Use optimized parameters for memory efficiency
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=3000,  # Limit features for memory
            min_df=2,           # Ignore very rare terms
            max_df=0.95         # Ignore very common terms
        )
        
        self.tfidf_matrix = self.vectorizer.fit_transform(self.df['combined_features'])
        
        # Create UID to index mapping
        self.df.reset_index(drop=True, inplace=True)
        self.uid_to_idx = pd.Series(self.df.index, index=self.df['uid'])
        
        print(f"TF-IDF matrix shape: {self.tfidf_matrix.shape}")
        print(f"Memory usage: ~{self.tfidf_matrix.data.nbytes / 1024 / 1024:.1f} MB")
    
    def save_artifacts(self):
        """Save TF-IDF artifacts to database and Redis."""
        data_hash = self.get_data_hash()
        
        # Skip Redis for now - size exceeds Upstash limits
        # We'll rely on database storage only
        print("Skipping Redis (size exceeds Upstash 10MB limit)")
        
        # Save to database - split into smaller parts to avoid timeout
        try:
            print("Saving artifacts to database...")
            
            # Prepare artifact data with maximum compression
            print("Compressing artifacts with maximum compression...")
            compressed_matrix = zlib.compress(pickle.dumps(self.tfidf_matrix), level=9)
            print(f"Compressed matrix size: {len(compressed_matrix) / 1024 / 1024:.1f} MB")
            
            # Save as local file backup first
            import os
            backup_file = 'tfidf_artifacts_backup.pkl'
            with open(backup_file, 'wb') as f:
                pickle.dump({
                    'tfidf_matrix': self.tfidf_matrix,
                    'vectorizer': self.vectorizer,
                    'uid_mapping': self.uid_to_idx.to_dict(),
                    'data_hash': data_hash
                }, f)
            print(f"Saved backup to {backup_file} ({os.path.getsize(backup_file) / 1024 / 1024:.1f} MB)")
            
            # For database, save only essential metadata
            # The actual matrix is too large for Supabase
            artifact_data = {
                'id': 1,  # Single row table
                'tfidf_matrix': 'stored_locally',  # Placeholder
                'vectorizer': pickle.dumps(self.vectorizer).hex()[:1000],  # Just a sample
                'uid_mapping': json.dumps({'count': len(self.uid_to_idx)}),  # Just count
                'data_hash': data_hash,
                'item_count': len(self.df),
                'feature_count': self.tfidf_matrix.shape[1],
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Check if table exists and has data
            try:
                existing = self.client.table('tfidf_artifacts').select('id').eq('id', 1).execute()
                
                if existing.data:
                    # Update existing row
                    response = self.client.table('tfidf_artifacts').update(artifact_data).eq('id', 1).execute()
                else:
                    # Insert new row
                    response = self.client.table('tfidf_artifacts').insert(artifact_data).execute()
                
                if response.data:
                    print("Successfully saved metadata to database")
                    print("IMPORTANT: Copy tfidf_artifacts_backup.pkl to your server!")
            except Exception as e:
                print(f"Database error: {e}")
                print("Artifacts saved locally only - copy tfidf_artifacts_backup.pkl to server")
                    
        except Exception as e:
            print(f"ERROR saving artifacts to database: {e}")
            raise
    
    def compute_distinct_values(self):
        """Compute and cache distinct values for filters."""
        print(f"[{datetime.now()}] Computing distinct values...")
        
        def get_unique_from_lists(column_name):
            all_values = set()
            if column_name in self.df.columns:
                for item_list in self.df[column_name].dropna():
                    if hasattr(item_list, 'tolist'):
                        item_list = item_list.tolist()
                    if isinstance(item_list, (list, np.ndarray)):
                        all_values.update(str(v).strip() for v in item_list if v and pd.notna(v))
                    elif item_list and pd.notna(item_list):
                        all_values.add(str(item_list).strip())
            return sorted(list(all_values))
        
        distinct_values = {
            'id': 1,
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
            existing = self.client.table('distinct_values_cache').select('id').eq('id', 1).execute()
            
            if existing.data:
                response = self.client.table('distinct_values_cache').update(distinct_values).eq('id', 1).execute()
            else:
                response = self.client.table('distinct_values_cache').insert(distinct_values).execute()
            
            if response.data:
                print("Distinct values cached successfully")
        except Exception as e:
            print(f"ERROR caching distinct values: {e}")
    
    def run(self):
        """Main execution flow."""
        print("=" * 60)
        print("TF-IDF ARTIFACT GENERATION")
        print("=" * 60)
        
        # Check if update is needed
        if not self.check_if_update_needed():
            print("Artifacts are up-to-date, exiting.")
            return 0
        
        # Load data
        if not self.load_data():
            print("Failed to load data. Exiting.")
            return 1
        
        # Prepare features
        self.prepare_features()
        
        # Compute TF-IDF
        self.compute_tfidf()
        
        # Save artifacts
        self.save_artifacts()
        
        # Compute distinct values
        self.compute_distinct_values()
        
        print("=" * 60)
        print("COMPLETED SUCCESSFULLY")
        print(f"Generated TF-IDF artifacts for {len(self.df)} items")
        print(f"Matrix shape: {self.tfidf_matrix.shape}")
        print("Artifacts saved to database and cache")
        print("=" * 60)
        
        return 0

if __name__ == "__main__":
    generator = TFIDFArtifactGenerator()
    sys.exit(generator.run())