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
from functools import lru_cache
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
import logging
from hybrid_similarity import HybridSimilarityCalculator

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
        self.data_hash = None  # Hash of TF-IDF data for cache versioning
        
        # Hybrid similarity calculator
        self.hybrid_calculator = None
        
        # Item metadata cache for hybrid similarity
        self.items_df = None
        
        # Cache keys
        self.TFIDF_MATRIX_KEY = "tfidf:matrix:v2"
        self.TFIDF_VECTORIZER_KEY = "tfidf:vectorizer:v2"
        self.UID_MAPPING_KEY = "tfidf:uid_mapping:v2"
        self.RECOMMENDATION_CACHE_PREFIX = "recs:"  # Will be updated with version
        self.ITEM_BUNDLE_CACHE_PREFIX = "item:bundle:"  # For caching item metadata + relations
        
        # Settings
        self.CACHE_TTL_HOURS = 24
        self.DEFAULT_NUM_RECOMMENDATIONS = 20
        self.MIN_SIMILARITY_THRESHOLD = 0.10  # Lowered to 10% to ensure 10 recommendations
        self.USE_HYBRID_SIMILARITY = True  # Flag to enable hybrid similarity
        
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
        finally:
            # Initialize hybrid calculator if TF-IDF is loaded
            if self.tfidf_matrix is not None and self.USE_HYBRID_SIMILARITY:
                self.hybrid_calculator = HybridSimilarityCalculator(
                    self.tfidf_matrix, 
                    self.uid_to_idx
                )
                logger.info("Initialized hybrid similarity calculator")
                
                # Load item metadata for hybrid similarity
                self._load_item_metadata()
    
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
                    
                    # Extract data hash for cache versioning
                    self.data_hash = data.get('data_hash', 'default')
                    # Update cache prefix with version
                    self.RECOMMENDATION_CACHE_PREFIX = f"recs:v{self.data_hash[:8]}:"
                    logger.info(f"Using cache prefix: {self.RECOMMENDATION_CACHE_PREFIX}")
                    
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
            
            # Try to get data hash for versioning
            data_hash = redis.get("tfidf:data_hash:v2")
            if data_hash:
                self.data_hash = data_hash.decode('utf-8') if isinstance(data_hash, bytes) else data_hash
                self.RECOMMENDATION_CACHE_PREFIX = f"recs:v{self.data_hash[:8]}:"
                logger.info(f"Using cache prefix from Redis: {self.RECOMMENDATION_CACHE_PREFIX}")
            
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
            
            # Get data hash for versioning
            if 'data_hash' in artifact and artifact['data_hash']:
                self.data_hash = artifact['data_hash']
                self.RECOMMENDATION_CACHE_PREFIX = f"recs:v{self.data_hash[:8]}:"
                logger.info(f"Using cache prefix from database: {self.RECOMMENDATION_CACHE_PREFIX}")
            
            # TF-IDF artifacts loaded successfully
            return True
            
        except Exception as e:
            logger.error(f"Failed to load from database: {e}")
            return False
    
    def _load_item_metadata(self):
        """Load item metadata for hybrid similarity calculations."""
        try:
            logger.info("Item metadata loading configured for on-demand fetching")
            # Pre-loading disabled for better memory usage and faster startup
            # Relations will be fetched on-demand using Redis cache and LRU cache
                
        except Exception as e:
            logger.error(f"Failed to configure item metadata loading: {e}")
            self.items_df = None
    

    def _cache_item_bundle(self, item_uid: str, item_data: Dict):
        """
        Cache an item bundle (metadata + relations) in Redis.
        
        Args:
            item_uid: UID of the item
            item_data: Complete item data with relations
        """
        if not self.redis or not item_data:
            return
            
        try:
            cache_key = f"{self.ITEM_BUNDLE_CACHE_PREFIX}{item_uid}"
            # Cache for 7 days (popular items stay cached longer)
            self.redis.set(cache_key, item_data, ttl_hours=168)
            logger.debug(f"Cached item bundle for {item_uid}")
        except Exception as e:
            logger.debug(f"Failed to cache item bundle for {item_uid}: {e}")

    def _get_cached_item_bundles(self, item_uids: List[str]) -> Dict[str, Dict]:
        """
        Batch fetch item bundles from Redis cache.
        
        Args:
            item_uids: List of item UIDs to fetch
            
        Returns:
            Dictionary mapping UID to item data for cached items
        """
        if not self.redis or not item_uids:
            return {}
            
        try:
            # Create cache keys
            cache_keys = [f"{self.ITEM_BUNDLE_CACHE_PREFIX}{uid}" for uid in item_uids]
            
            # Batch fetch from Redis
            cached_data = self.redis.mget(cache_keys)
            
            # Map results back to UIDs
            result = {}
            for uid, key in zip(item_uids, cache_keys):
                data = cached_data.get(key)
                if data:
                    result[uid] = data
                    logger.debug(f"Cache hit for item bundle {uid}")
                else:
                    logger.debug(f"Cache miss for item bundle {uid}")
            
            logger.info(f"Redis cache: {len(result)}/{len(item_uids)} item bundles found")
            return result
            
        except Exception as e:
            logger.warning(f"Failed to fetch item bundles from Redis: {e}")
            return {}

    def _get_items_with_cache_optimization(self, item_uids: List[str]) -> List[Dict]:
        """
        Get items with Redis cache optimization.
        
        This method first checks Redis cache for item bundles, then fetches
        missing items from database and caches them for future requests.
        
        Args:
            item_uids: List of item UIDs to fetch
            
        Returns:
            List of items with complete metadata and relations
        """
        if not item_uids:
            return []
            
        # Step 1: Try to get cached items from Redis
        cached_items = self._get_cached_item_bundles(item_uids)
        
        # Step 2: Identify items that need to be fetched from database
        missing_uids = [uid for uid in item_uids if uid not in cached_items]
        
        # Step 3: Fetch missing items from database
        fetched_items = []
        if missing_uids:
            logger.info(f"Fetching {len(missing_uids)} missing items from database")
            fetched_items = self.client.get_items_with_relations_batch(missing_uids)
            
            # Cache newly fetched items
            for item in fetched_items:
                self._cache_item_bundle(item['uid'], item)
        
        # Step 4: Combine cached and fetched items
        all_items = list(cached_items.values()) + fetched_items
        
        logger.info(f"Retrieved {len(all_items)} items ({len(cached_items)} from cache, {len(fetched_items)} from DB)")
        return all_items
    
    @lru_cache(maxsize=1000)
    def _get_item_relations_cached(self, item_id: int) -> tuple:
        """
        Fetch relations for an item with LRU caching.
        Returns a tuple for hashability required by lru_cache.
        
        This method dramatically reduces API calls by caching relations
        for recently accessed items. The cache holds up to 1000 items
        (approximately 100KB of memory).
        """
        relations = self.client.get_item_relations(item_id)
        # Convert to tuple of tuples for immutability/hashability
        return (
            tuple(relations.get('genres', [])),
            tuple(relations.get('themes', [])),
            tuple(relations.get('demographics', [])),
            tuple(relations.get('studios', [])),
            tuple(relations.get('authors', []))
        )
    
    def _enrich_item_with_relations(self, item_dict: dict) -> dict:
        """
        Enrich an item dictionary with its relations fetched on-demand.
        
        This replaces the pre-loaded relations approach with on-demand
        fetching, significantly reducing memory usage while maintaining
        the same functionality.
        """
        # Get item ID for fetching relations
        item_id = item_dict.get('id')
        if not item_id:
            return item_dict
        
        try:
            # Fetch cached relations
            genres, themes, demographics, studios, authors = self._get_item_relations_cached(item_id)
            
            # Add relations to item dict as lists (matching expected format)
            item_dict['genres'] = list(genres)
            item_dict['themes'] = list(themes)
            item_dict['demographics'] = list(demographics)
            item_dict['studios'] = list(studios)
            item_dict['authors'] = list(authors)
            
        except Exception as e:
            logger.debug(f"Could not fetch relations for item {item_id}: {e}")
            # Add empty lists if fetching fails
            item_dict['genres'] = []
            item_dict['themes'] = []
            item_dict['demographics'] = []
            item_dict['studios'] = []
            item_dict['authors'] = []
        
        return item_dict
    
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
        
        # Compute recommendations on-demand with timeout
        try:
            start_time = time.time()
            MAX_COMPUTATION_TIME = 5.0  # 5 second timeout
            
            # Get item index
            item_idx = self.uid_to_idx[item_uid]
            
            # Choose similarity calculation method
            if self.USE_HYBRID_SIMILARITY and self.hybrid_calculator:
                # Use hybrid similarity
                logger.info(f"Using hybrid similarity for {item_uid}")
                
                # Get source item metadata on-demand
                source_item = self.client.get_item_by_uid(item_uid)
                if source_item is None:
                    logger.warning(f"Could not find metadata for {item_uid}, falling back to TF-IDF")
                    # Fall back to TF-IDF only
                    similarities = cosine_similarity(self.tfidf_matrix[item_idx:item_idx+1], self.tfidf_matrix).flatten()
                else:
                    # Enrich source item with relations (fetched on-demand with LRU cache)
                    source_item = self._enrich_item_with_relations(source_item)
                
                if source_item:
                    
                    # Calculate hybrid similarities for all items
                    similarities = np.zeros(len(self.uid_to_idx))
                    
                    # OPTIMIZATION: Two-stage filtering to reduce from 500 to 100 candidates
                    tfidf_similarities = cosine_similarity(self.tfidf_matrix[item_idx:item_idx+1], self.tfidf_matrix).flatten()
                    
                    # Stage 1: Get top 50 candidates from TF-IDF (fixed bug - was getting 165+ items)
                    # BUG FIX: Remove threshold_indices combination that was causing 165+ candidates
                    candidate_indices = tfidf_similarities.argsort()[-50:][::-1]  # Take exactly top 50
                    
                    # Remove source item from candidates
                    candidate_indices = candidate_indices[candidate_indices != item_idx]
                    
                    logger.info(f"Stage 1: Selected {len(candidate_indices)} candidates for hybrid similarity calculation")
                    
                    # Stage 2: Batch fetch all candidates with relations
                    candidate_uids = []
                    idx_to_uid_map = {}
                    
                    for idx in candidate_indices:
                        candidate_uid = self.uid_to_idx[self.uid_to_idx == idx].index[0]
                        candidate_uids.append(candidate_uid)
                        idx_to_uid_map[idx] = candidate_uid
                    
                    # Check timeout before expensive operations
                    if time.time() - start_time > MAX_COMPUTATION_TIME:
                        logger.warning(f"Recommendation computation timeout for {item_uid}, using fallback")
                        return None
                    
                    # Fetch candidate items with Redis cache optimization
                    logger.info(f"Fetching {len(candidate_uids)} candidates with cache optimization...")
                    candidate_items = self._get_items_with_cache_optimization(candidate_uids)
                    
                    # Create UID to item mapping for fast lookup
                    items_by_uid = {item['uid']: item for item in candidate_items}
                    
                    # Check timeout before similarity calculations
                    if time.time() - start_time > MAX_COMPUTATION_TIME:
                        logger.warning(f"Recommendation computation timeout for {item_uid}, using TF-IDF fallback")
                        similarities = cosine_similarity(self.tfidf_matrix[item_idx:item_idx+1], self.tfidf_matrix).flatten()
                    else:
                        # Calculate hybrid similarities for all batched items
                        for idx in candidate_indices:
                            candidate_uid = idx_to_uid_map[idx]
                            candidate_item = items_by_uid.get(candidate_uid)
                            
                            if candidate_item:
                                # Calculate hybrid similarity
                                similarities[idx] = self.hybrid_calculator.calculate_hybrid_similarity(
                                    source_item, candidate_item
                                )
                            else:
                                logger.debug(f"Candidate item {candidate_uid} not found in batch fetch results")
                    
                    logger.info(f"Completed hybrid similarity calculation for {len(candidate_indices)} candidates")
            else:
                # Use standard TF-IDF cosine similarity
                logger.info(f"Using TF-IDF similarity for {item_uid}")
                similarities = cosine_similarity(self.tfidf_matrix[item_idx:item_idx+1], self.tfidf_matrix).flatten()
            
            # Get top N+1 indices (including the item itself)
            top_indices = similarities.argsort()[-num_recommendations*2:][::-1]  # Get more candidates
            
            # Collect UIDs of recommended items (excluding source item and low similarity)
            recommended_uids = []
            for idx in top_indices:
                # Skip the item itself
                if idx == item_idx:
                    continue
                
                # Skip items below similarity threshold
                similarity_score = float(similarities[idx])
                if similarity_score < self.MIN_SIMILARITY_THRESHOLD:
                    logger.debug(f"Skipping item with similarity {similarity_score:.3f} (below threshold {self.MIN_SIMILARITY_THRESHOLD})")
                    continue
                
                # Get item UID from index
                rec_uid = self.uid_to_idx[self.uid_to_idx == idx].index[0]
                recommended_uids.append((rec_uid, similarity_score))
                
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