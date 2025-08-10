"""
Thread-safe singleton pattern for data loading in Flask application.
Ensures data is loaded only once across all worker processes/threads.
Now includes Redis caching for persistent storage across container restarts.
"""

import threading
import pickle
import os
import time
from typing import Optional, Tuple, Any
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
import hashlib
import json
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Platform-specific imports for file locking
try:
    import fcntl  # For file locking on Unix systems
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False
    # Windows will use a different locking mechanism

# Try to import Redis cache
try:
    from utils.redis_cache import RedisCache, get_redis_cache
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.info("Redis not available for data singleton caching")

class DataSingleton:
    """
    Thread-safe singleton class for managing shared data across Flask workers.
    
    This class ensures that expensive data loading operations (like loading 88k+ items
    from Supabase) happen only once, even when Flask spawns multiple worker processes.
    
    Uses file-based locking and caching to coordinate between processes.
    """
    
    _instance = None
    _lock = threading.Lock()
    _data_loaded = False
    
    # Cache directory for storing processed data
    CACHE_DIR = os.path.join(os.path.dirname(__file__), '.data_cache')
    CACHE_FILE = os.path.join(CACHE_DIR, 'processed_data.pkl')
    LOCK_FILE = os.path.join(CACHE_DIR, 'data.lock')
    METADATA_FILE = os.path.join(CACHE_DIR, 'metadata.json')
    
    # Data attributes
    df_processed: Optional[pd.DataFrame] = None
    tfidf_vectorizer: Optional[TfidfVectorizer] = None
    tfidf_matrix: Optional[Any] = None
    uid_to_idx: Optional[pd.Series] = None
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(DataSingleton, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the singleton instance."""
        if not hasattr(self, '_initialized'):
            self._initialized = True
            # Ensure cache directory exists
            os.makedirs(self.CACHE_DIR, exist_ok=True)
            
            # Initialize Redis cache if available
            self.redis_cache = None
            if REDIS_AVAILABLE:
                try:
                    self.redis_cache = get_redis_cache()
                    if self.redis_cache.connected:
                        logger.info("Redis cache initialized for data singleton")
                    else:
                        logger.warning("Redis configured but not connected for data singleton")
                        self.redis_cache = None
                except Exception as e:
                    logger.warning(f"Failed to initialize Redis for data singleton: {e}")
                    self.redis_cache = None
    
    def _acquire_file_lock(self, timeout: int = 30) -> Optional[Any]:
        """
        Acquire a file-based lock to prevent multiple processes from loading data simultaneously.
        
        Args:
            timeout: Maximum time to wait for lock in seconds
            
        Returns:
            File handle if lock acquired, None if timeout
        """
        lock_file = open(self.LOCK_FILE, 'w')
        start_time = time.time()
        
        while True:
            try:
                # Try to acquire exclusive lock (non-blocking)
                if os.name == 'posix' and HAS_FCNTL:  # Unix/Linux/Mac
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    return lock_file
                else:  # Windows or no fcntl
                    # Windows doesn't have fcntl, use a simple file-based approach
                    try:
                        # Try to create a marker file atomically
                        marker = self.LOCK_FILE + '.marker'
                        fd = os.open(marker, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                        os.close(fd)
                        return lock_file
                    except FileExistsError:
                        # Lock is held by another process
                        if time.time() - start_time > timeout:
                            lock_file.close()
                            return None
                        time.sleep(0.1)
                        continue
            except (IOError, OSError):
                # Lock is held by another process
                if time.time() - start_time > timeout:
                    lock_file.close()
                    return None
                time.sleep(0.1)
    
    def _release_file_lock(self, lock_file: Any):
        """Release the file-based lock."""
        if lock_file:
            try:
                if os.name == 'posix' and HAS_FCNTL:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
                else:
                    # Windows: remove marker file
                    marker = self.LOCK_FILE + '.marker'
                    if os.path.exists(marker):
                        os.remove(marker)
                lock_file.close()
            except:
                pass
    
    def _save_to_redis(self) -> bool:
        """
        Save processed data to Redis cache for persistence across container restarts.
        
        Returns:
            True if successfully saved to Redis, False otherwise
        """
        if not self.redis_cache or not self.redis_cache.connected:
            return False
        
        try:
            # Save each component separately for better memory management
            success = True
            
            # Save DataFrame (as pickle)
            if self.df_processed is not None:
                success &= self.redis_cache.set(
                    'tfidf_df_processed',
                    self.df_processed,
                    ttl_hours=168  # 7 days
                )
            
            # Save TF-IDF vectorizer
            if self.tfidf_vectorizer is not None:
                success &= self.redis_cache.set(
                    'tfidf_vectorizer',
                    self.tfidf_vectorizer,
                    ttl_hours=168
                )
            
            # Save TF-IDF matrix (sparse matrix)
            if self.tfidf_matrix is not None:
                success &= self.redis_cache.set(
                    'tfidf_matrix',
                    self.tfidf_matrix,
                    ttl_hours=168
                )
            
            # Save UID to index mapping
            if self.uid_to_idx is not None:
                success &= self.redis_cache.set(
                    'tfidf_uid_to_idx',
                    self.uid_to_idx,
                    ttl_hours=168
                )
            
            # Save metadata
            metadata = {
                'timestamp': time.time(),
                'row_count': len(self.df_processed) if self.df_processed is not None else 0,
                'has_vectorizer': self.tfidf_vectorizer is not None,
                'has_matrix': self.tfidf_matrix is not None
            }
            success &= self.redis_cache.set(
                'tfidf_metadata',
                metadata,
                ttl_hours=168
            )
            
            if success:
                logger.info("[SUCCESS] Saved TF-IDF data to Redis cache")
            else:
                logger.warning("[WARNING] Failed to save some components to Redis")
            
            return success
            
        except Exception as e:
            logger.error(f"[ERROR] Failed to save to Redis: {e}")
            return False
    
    def _load_from_redis(self) -> bool:
        """
        Load processed data from Redis cache.
        
        Returns:
            True if successfully loaded from Redis, False otherwise
        """
        if not self.redis_cache or not self.redis_cache.connected:
            return False
        
        try:
            # Check if metadata exists
            metadata = self.redis_cache.get('tfidf_metadata')
            if not metadata:
                return False
            
            # Load each component
            df = self.redis_cache.get('tfidf_df_processed')
            vectorizer = self.redis_cache.get('tfidf_vectorizer')
            matrix = self.redis_cache.get('tfidf_matrix')
            uid_idx = self.redis_cache.get('tfidf_uid_to_idx')
            
            # Validate all components loaded
            if df is None or vectorizer is None or matrix is None:
                logger.warning("[WARNING] Incomplete data in Redis cache")
                return False
            
            # Set the data
            self.df_processed = df
            self.tfidf_vectorizer = vectorizer
            self.tfidf_matrix = matrix
            self.uid_to_idx = uid_idx if uid_idx is not None else pd.Series(dtype='int64')
            
            logger.info(f"[SUCCESS] Loaded TF-IDF data from Redis: {len(df)} items, "
                       f"cached {time.time() - metadata['timestamp']:.1f} seconds ago")
            return True
            
        except Exception as e:
            logger.warning(f"[WARNING] Failed to load from Redis: {e}")
            return False
    
    def _is_cache_valid(self, max_age_hours: int = 24) -> bool:
        """
        Check if cached data is still valid based on age and metadata.
        
        Args:
            max_age_hours: Maximum age of cache in hours
            
        Returns:
            True if cache is valid, False otherwise
        """
        if not os.path.exists(self.CACHE_FILE) or not os.path.exists(self.METADATA_FILE):
            return False
        
        try:
            # Check cache age
            cache_age = time.time() - os.path.getmtime(self.CACHE_FILE)
            if cache_age > max_age_hours * 3600:
                print(f"[INFO] Cache is {cache_age/3600:.1f} hours old, invalidating")
                return False
            
            # Check metadata
            with open(self.METADATA_FILE, 'r') as f:
                metadata = json.load(f)
                # You can add more validation here (e.g., check data version)
                if metadata.get('version') != '1.0':
                    return False
            
            return True
        except:
            return False
    
    def _save_to_cache(self):
        """Save processed data to cache files."""
        try:
            print("[INFO] Saving data to cache...")
            
            # Save data
            cache_data = {
                'df_processed': self.df_processed,
                'tfidf_vectorizer': self.tfidf_vectorizer,
                'tfidf_matrix': self.tfidf_matrix,
                'uid_to_idx': self.uid_to_idx
            }
            
            with open(self.CACHE_FILE, 'wb') as f:
                pickle.dump(cache_data, f, protocol=pickle.HIGHEST_PROTOCOL)
            
            # Save metadata
            metadata = {
                'version': '1.0',
                'timestamp': time.time(),
                'item_count': len(self.df_processed) if self.df_processed is not None else 0
            }
            
            with open(self.METADATA_FILE, 'w') as f:
                json.dump(metadata, f)
            
            print(f"[SUCCESS] Data cached successfully ({len(self.df_processed)} items)")
        except Exception as e:
            print(f"[ERROR] Failed to save cache: {e}")
    
    def _load_from_cache(self) -> bool:
        """
        Load processed data from cache files.
        
        Returns:
            True if successfully loaded from cache, False otherwise
        """
        try:
            print("[INFO] Loading data from cache...")
            
            with open(self.CACHE_FILE, 'rb') as f:
                cache_data = pickle.load(f)
            
            self.df_processed = cache_data['df_processed']
            self.tfidf_vectorizer = cache_data['tfidf_vectorizer']
            self.tfidf_matrix = cache_data['tfidf_matrix']
            self.uid_to_idx = cache_data['uid_to_idx']
            
            print(f"[SUCCESS] Loaded {len(self.df_processed)} items from cache")
            return True
        except Exception as e:
            print(f"[WARNING] Failed to load from cache: {e}")
            return False
    
    def load_data(self, load_function=None) -> Tuple[Optional[pd.DataFrame], Optional[TfidfVectorizer], Optional[Any], Optional[pd.Series]]:
        """
        Load data using singleton pattern with caching and locking.
        
        This method ensures data is loaded only once across all workers.
        It first checks Redis cache, then file cache, then loads from source.
        
        Args:
            load_function: Function to call to load data from source (e.g., Supabase)
                          Should return tuple of (df, vectorizer, matrix, uid_to_idx)
        
        Returns:
            Tuple of (df_processed, tfidf_vectorizer, tfidf_matrix, uid_to_idx)
        """
        # If data is already loaded in this process, return it
        if self._data_loaded and self.df_processed is not None:
            return self.df_processed, self.tfidf_vectorizer, self.tfidf_matrix, self.uid_to_idx
        
        # Try Redis cache first (fastest for cloud deployments)
        if self._load_from_redis():
            logger.info("[SUCCESS] Loaded data from Redis cache")
            self._data_loaded = True
            return self.df_processed, self.tfidf_vectorizer, self.tfidf_matrix, self.uid_to_idx
        
        # Try to acquire file lock for file cache or source loading
        lock_file = self._acquire_file_lock(timeout=60)
        if lock_file is None:
            print("[WARNING] Could not acquire data loading lock after 60 seconds")
            # Try to load from file cache anyway
            if self._load_from_cache():
                self._data_loaded = True
                # Also save to Redis for next time
                self._save_to_redis()
                return self.df_processed, self.tfidf_vectorizer, self.tfidf_matrix, self.uid_to_idx
            return None, None, None, None
        
        try:
            # Double-check Redis (another process might have just saved it)
            if self._load_from_redis():
                logger.info("[SUCCESS] Loaded data from Redis cache (after lock)")
                self._data_loaded = True
                return self.df_processed, self.tfidf_vectorizer, self.tfidf_matrix, self.uid_to_idx
            
            # Check file cache
            if self._is_cache_valid() and self._load_from_cache():
                self._data_loaded = True
                # Save to Redis for cloud persistence
                self._save_to_redis()
                return self.df_processed, self.tfidf_vectorizer, self.tfidf_matrix, self.uid_to_idx
            
            # Load data from source
            if load_function:
                print("[INFO] Loading data from source (this process has the lock)...")
                df, vectorizer, matrix, uid_idx = load_function()
                
                if df is not None:
                    self.df_processed = df
                    self.tfidf_vectorizer = vectorizer
                    self.tfidf_matrix = matrix
                    self.uid_to_idx = uid_idx
                    self._data_loaded = True
                    
                    # Save to both caches
                    self._save_to_cache()  # File cache for local
                    self._save_to_redis()  # Redis for cloud persistence
                    
                    return self.df_processed, self.tfidf_vectorizer, self.tfidf_matrix, self.uid_to_idx
            
            return None, None, None, None
            
        finally:
            # Always release the lock
            self._release_file_lock(lock_file)
    
    def clear_cache(self):
        """Clear all cached data files."""
        try:
            if os.path.exists(self.CACHE_FILE):
                os.remove(self.CACHE_FILE)
            if os.path.exists(self.METADATA_FILE):
                os.remove(self.METADATA_FILE)
            print("[INFO] Cache cleared successfully")
        except Exception as e:
            print(f"[ERROR] Failed to clear cache: {e}")
    
    def get_data(self) -> Tuple[Optional[pd.DataFrame], Optional[TfidfVectorizer], Optional[Any], Optional[pd.Series]]:
        """Get the loaded data."""
        return self.df_processed, self.tfidf_vectorizer, self.tfidf_matrix, self.uid_to_idx


# Global singleton instance
_data_singleton = DataSingleton()

def get_data_singleton() -> DataSingleton:
    """Get the global DataSingleton instance."""
    return _data_singleton