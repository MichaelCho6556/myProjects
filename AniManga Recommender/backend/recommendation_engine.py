"""
On-Demand Recommendation Engine for AniManga Recommender

This module provides efficient on-demand recommendation computation using
TF-IDF vectors. Instead of pre-computing all recommendations, it computes
them when requested, significantly reducing memory usage.

Key Features:
    - Loads TF-IDF artifacts once at startup
    - Computes single-item recommendations on-demand
    - Uses Redis caching for performance
    - Memory-efficient (no full NxN matrix)
"""

import json
import pickle
import zlib
import time
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class OnDemandRecommendationEngine:
    """
    Handles on-demand recommendation computation using pre-computed TF-IDF artifacts.
    """
    
    def __init__(self, supabase_client, redis_cache=None):
        """
        Initialize the recommendation engine.
        
        Args:
            supabase_client: SupabaseClient instance for database operations
            redis_cache: Optional Redis cache instance
        """
        self.client = supabase_client
        self.redis = redis_cache
        
        # TF-IDF artifacts
        self.tfidf_matrix = None
        self.vectorizer = None
        self.uid_to_idx = None
        
        # Cache keys
        self.TFIDF_MATRIX_KEY = "tfidf:matrix:v2"
        self.TFIDF_VECTORIZER_KEY = "tfidf:vectorizer:v2"
        self.UID_MAPPING_KEY = "tfidf:uid_mapping:v2"
        self.RECOMMENDATION_CACHE_PREFIX = "recs:"
        
        # Settings
        self.CACHE_TTL_HOURS = 24
        self.DEFAULT_NUM_RECOMMENDATIONS = 20
        
    def initialize(self) -> bool:
        """
        Load TF-IDF artifacts from cache or database.
        This should be called once at application startup.
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        try:
            # Try to load from local file first (fastest)
            if self._load_from_file():
                logger.info("Loaded TF-IDF artifacts from local file")
                return True
            
            # Try to load from Redis cache
            if self.redis and self._load_from_redis():
                logger.info("Loaded TF-IDF artifacts from Redis cache")
                return True
            
            # Try to load from database cache
            if self._load_from_database():
                logger.info("Loaded TF-IDF artifacts from database")
                return True
            
            # If no cache exists, we need to generate artifacts
            # This should be done by the batch script, not here
            logger.warning("No TF-IDF artifacts found. Run compute_tfidf_artifacts.py to generate them.")
            return False
            
        except Exception as e:
            logger.error(f"Failed to initialize recommendation engine: {e}")
            return False
    
    def _load_from_file(self) -> bool:
        """Load TF-IDF artifacts from local file."""
        import os
        
        # Check multiple possible locations for production deployment
        possible_paths = [
            'tfidf_artifacts_backup.pkl',  # Current directory
            os.path.join(os.path.dirname(__file__), 'tfidf_artifacts_backup.pkl'),  # Script directory
            '/opt/render/project/src/backend/tfidf_artifacts_backup.pkl',  # Render deployment
            '/app/backend/tfidf_artifacts_backup.pkl',  # Docker deployment
            os.environ.get('TFIDF_ARTIFACTS_PATH', '')  # Custom path from environment
        ]
        
        for filepath in possible_paths:
            if filepath and os.path.exists(filepath):
                try:
                    logger.info(f"Loading TF-IDF artifacts from: {filepath}")
                    with open(filepath, 'rb') as f:
                        data = pickle.load(f)
                    
                    self.tfidf_matrix = data['tfidf_matrix']
                    self.vectorizer = data['vectorizer']
                    self.uid_to_idx = pd.Series(data['uid_mapping'])
                    
                    # TF-IDF artifacts loaded successfully
                    return True
                    
                except Exception as e:
                    logger.error(f"Failed to load from {filepath}: {e}")
                    continue
        
        logger.error(f"TF-IDF artifacts not found in any location: {possible_paths}")
        return False
    
    def _load_from_redis(self) -> bool:
        """Load TF-IDF artifacts from Redis cache."""
        if not self.redis or not self.redis.connected:
            return False
            
        try:
            # Load TF-IDF matrix
            tfidf_data = self.redis.get(self.TFIDF_MATRIX_KEY)
            if not tfidf_data:
                return False
                
            self.tfidf_matrix = pickle.loads(zlib.decompress(tfidf_data))
            
            # Load vectorizer
            vectorizer_data = self.redis.get(self.TFIDF_VECTORIZER_KEY)
            if not vectorizer_data:
                return False
                
            self.vectorizer = pickle.loads(vectorizer_data)
            
            # Load UID mapping
            uid_mapping_data = self.redis.get(self.UID_MAPPING_KEY)
            if not uid_mapping_data:
                return False
                
            uid_mapping = json.loads(uid_mapping_data)
            self.uid_to_idx = pd.Series(uid_mapping)
            
            # TF-IDF artifacts loaded successfully
            return True
            
        except Exception as e:
            logger.error(f"Failed to load from Redis: {e}")
            return False
    
    def _load_from_database(self) -> bool:
        """Load TF-IDF artifacts from database cache."""
        try:
            # Check if tfidf_artifacts table exists with our data
            response = self.client.table('tfidf_artifacts').select('*').limit(1).execute()
            
            if not response.data:
                return False
            
            artifact = response.data[0]
            
            # Decompress and load TF-IDF matrix
            if 'tfidf_matrix' in artifact and artifact['tfidf_matrix']:
                matrix_data = bytes.fromhex(artifact['tfidf_matrix'])
                self.tfidf_matrix = pickle.loads(zlib.decompress(matrix_data))
            else:
                return False
            
            # Load vectorizer
            if 'vectorizer' in artifact and artifact['vectorizer']:
                vectorizer_data = bytes.fromhex(artifact['vectorizer'])
                self.vectorizer = pickle.loads(vectorizer_data)
            else:
                return False
            
            # Load UID mapping
            if 'uid_mapping' in artifact and artifact['uid_mapping']:
                self.uid_to_idx = pd.Series(json.loads(artifact['uid_mapping']))
            else:
                return False
            
            # TF-IDF artifacts loaded successfully
            return True
            
        except Exception as e:
            logger.error(f"Failed to load from database: {e}")
            return False
    
    def get_recommendations(self, item_uid: str, num_recommendations: int = None) -> Optional[List[Dict]]:
        """
        Get recommendations for a specific item.
        
        Args:
            item_uid: UID of the item to get recommendations for
            num_recommendations: Number of recommendations to return
            
        Returns:
            List of recommendation dictionaries or None if error
        """
        if num_recommendations is None:
            num_recommendations = self.DEFAULT_NUM_RECOMMENDATIONS
        
        # Check if engine is initialized
        if self.tfidf_matrix is None or self.uid_to_idx is None:
            logger.error("Recommendation engine not initialized")
            return None
        
        # Check if item exists
        if item_uid not in self.uid_to_idx:
            logger.warning(f"Item {item_uid} not found in index")
            return None
        
        # Check Redis cache first
        if self.redis:
            cache_key = f"{self.RECOMMENDATION_CACHE_PREFIX}{item_uid}"
            cached_data = self.redis.get(cache_key)
            
            if cached_data:
                try:
                    recommendations = json.loads(cached_data)
                    logger.info(f"Retrieved recommendations for {item_uid} from cache")
                    return recommendations[:num_recommendations]
                except Exception as e:
                    logger.error(f"Failed to parse cached recommendations: {e}")
        
        # Compute recommendations on-demand
        try:
            start_time = time.time()
            
            # Get item index
            item_idx = self.uid_to_idx[item_uid]
            
            # Get item vector (1 x features)
            item_vector = self.tfidf_matrix[item_idx:item_idx+1]
            
            # Compute similarities against all items (1 x N operation)
            similarities = cosine_similarity(item_vector, self.tfidf_matrix).flatten()
            
            # Get top N+1 indices (including the item itself)
            top_indices = similarities.argsort()[-num_recommendations-1:][::-1]
            
            # Collect UIDs of recommended items (excluding source item)
            recommended_uids = []
            for idx in top_indices:
                # Skip the item itself
                if idx == item_idx:
                    continue
                
                # Get item UID from index
                rec_uid = self.uid_to_idx[self.uid_to_idx == idx].index[0]
                recommended_uids.append((rec_uid, float(similarities[idx])))
                
                if len(recommended_uids) >= num_recommendations:
                    break
            
            # Fetch item metadata from database for only the recommended items
            if recommended_uids:
                uids_to_fetch = [uid for uid, _ in recommended_uids]
                
                # Query database for these specific items
                # Note: database has media_type_id, not media_type
                response = self.client.table('items').select(
                    'uid,title,media_type_id,score,synopsis,image_url,id'
                ).in_('uid', uids_to_fetch).execute()
                
                # Create a lookup dictionary
                items_dict = {item['uid']: item for item in response.data}
                
                # Build recommendations list with similarity scores
                recommendations = []
                media_type_map = {1: 'anime', 2: 'manga'}
                
                for uid, similarity in recommended_uids:
                    if uid in items_dict:
                        item_data = items_dict[uid]
                        
                        # Map media_type_id to media_type string
                        media_type_id = item_data.get('media_type_id')
                        media_type = media_type_map.get(media_type_id, 'unknown')
                        
                        rec_dict = {
                            'uid': uid,
                            'title': item_data.get('title', 'Unknown'),
                            'media_type': media_type,
                            'score': float(item_data.get('score', 0) if item_data.get('score') is not None else 0),
                            'similarity': similarity,
                            'synopsis': item_data.get('synopsis', ''),
                            'image_url': item_data.get('image_url', '')
                        }
                        logger.debug(f"Added recommendation: {uid} with similarity: {similarity}, type: {media_type}")
                        recommendations.append(rec_dict)
            else:
                recommendations = []
            
            computation_time = time.time() - start_time
            logger.info(f"Computed {len(recommendations)} recommendations for {item_uid} in {computation_time:.3f}s")
            
            # Log the first recommendation to verify similarity is included
            if recommendations:
                logger.info(f"First recommendation: {recommendations[0].get('title')} with similarity: {recommendations[0].get('similarity')}")
            
            # Cache the results
            if self.redis and recommendations:
                try:
                    cache_key = f"{self.RECOMMENDATION_CACHE_PREFIX}{item_uid}"
                    self.redis.set(cache_key, json.dumps(recommendations), ttl_hours=self.CACHE_TTL_HOURS)
                    logger.info(f"Cached recommendations for {item_uid}")
                except Exception as e:
                    logger.error(f"Failed to cache recommendations: {e}")
            
            # Also store in database for persistence
            self._store_in_database(item_uid, recommendations)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to compute recommendations for {item_uid}: {e}")
            return None
    
    def _store_in_database(self, item_uid: str, recommendations: List[Dict]):
        """Store recommendations in database cache table."""
        try:
            data = {
                'item_uid': item_uid,
                'recommendations': json.dumps(recommendations),
                'similarity_scores': json.dumps({
                    'count': len(recommendations),
                    'avg_similarity': sum(r['similarity'] for r in recommendations) / len(recommendations) if recommendations else 0
                }),
                'computed_at': datetime.utcnow().isoformat()
            }
            
            # Upsert to database
            self.client.table('recommendations_cache').upsert(data).execute()
            logger.info(f"Stored recommendations for {item_uid} in database")
            
        except Exception as e:
            logger.error(f"Failed to store recommendations in database: {e}")
    
    def warm_cache_for_popular_items(self, top_n: int = 1000):
        """
        Pre-compute recommendations for the most popular items.
        This can be called periodically to warm the cache.
        
        Args:
            top_n: Number of top items to pre-compute
        """
        try:
            # Get most popular items by score
            response = self.client.table('items').select('uid,score').order('score', desc=True).limit(top_n).execute()
            
            if not response.data:
                return
            
            popular_items = [item['uid'] for item in response.data]
            
            logger.info(f"Warming cache for {len(popular_items)} popular items...")
            
            for i, uid in enumerate(popular_items):
                if i % 100 == 0:
                    logger.info(f"Progress: {i}/{len(popular_items)}")
                
                # This will compute and cache if not already cached
                self.get_recommendations(uid)
            
            logger.info("Cache warming complete")
            
        except Exception as e:
            logger.error(f"Failed to warm cache: {e}")