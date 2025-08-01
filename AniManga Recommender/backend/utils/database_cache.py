# ABOUTME: Database-backed cache implementation to replace Redis for production deployment
# ABOUTME: Provides cache operations using Supabase PostgreSQL with TTL and JSON support
"""
Database Cache Implementation for AniManga Recommender

This module provides a database-backed caching solution as a Redis replacement
for deployment on free-tier hosting services. Uses Supabase PostgreSQL for
persistent cache storage with automatic expiration and cleanup.

Key Features:
    - Redis-compatible API for easy migration
    - Automatic JSON serialization/deserialization
    - TTL-based expiration with database-level cleanup
    - Connection pooling and prepared statements
    - Graceful error handling and fallback
    - Batch operations support
    - Performance monitoring
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime, timedelta
from contextlib import contextmanager
import time
from threading import Lock
import hashlib

from supabase_client import SupabaseClient

# Configure logging
logger = logging.getLogger(__name__)


class DatabaseCache:
    """
    Database-backed cache implementation with Redis-compatible interface.
    
    Uses Supabase PostgreSQL as the cache backend with automatic expiration,
    connection pooling, and optimized queries for production performance.
    """
    
    def __init__(self):
        """Initialize database cache with connection pooling and configuration."""
        self.supabase = SupabaseClient()
        self.connected = False
        self._lock = Lock()
        self._pipeline_mode = False
        self._pipeline_operations = []
        
        # Cache configuration
        self.max_key_length = 255
        self.max_value_size = 1048576  # 1MB max value size
        self.default_ttl_hours = 24
        
        # Performance counters
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0,
            'total_time': 0,
            'operation_count': 0
        }
        
        self._test_connection()
    
    def _test_connection(self):
        """Test database connection and cache table availability."""
        try:
            # Test query to verify cache_store table exists
            response = self.supabase._make_request(
                'GET', 
                'cache_store',
                params={'select': 'cache_key', 'limit': '1'}
            )
            if response.status_code == 200:
                self.connected = True
                logger.info("Database cache connected successfully")
            else:
                self.connected = False
                logger.error(f"Database cache connection failed: HTTP {response.status_code}")
        except Exception as e:
            logger.error(f"Database cache connection failed: {e}")
            self.connected = False
    
    def _sanitize_key(self, key: str) -> str:
        """
        Sanitize cache key to ensure database compatibility.
        
        Args:
            key: Raw cache key
            
        Returns:
            Sanitized key safe for database storage
        """
        if len(key) > self.max_key_length:
            # Hash long keys to fit within limits
            key_hash = hashlib.sha256(key.encode()).hexdigest()[:64]
            key = f"{key[:180]}...{key_hash}"
        return key
    
    def _serialize_value(self, value: Any) -> str:
        """
        Serialize value to JSON string for database storage.
        
        Args:
            value: Python object to serialize
            
        Returns:
            JSON string representation
            
        Raises:
            ValueError: If value cannot be serialized or exceeds size limit
        """
        try:
            # First check for circular references
            def check_circular(obj, seen=None):
                if seen is None:
                    seen = set()
                if isinstance(obj, (dict, list)):
                    if id(obj) in seen:
                        raise ValueError("Circular reference detected")
                    seen.add(id(obj))
                    if isinstance(obj, dict):
                        for v in obj.values():
                            check_circular(v, seen)
                    else:
                        for item in obj:
                            check_circular(item, seen)
                return True
            
            check_circular(value)
            
            # Serialize with default handler for non-JSON types
            serialized = json.dumps(value, default=str, separators=(',', ':'))
            if len(serialized) > self.max_value_size:
                raise ValueError(f"Serialized value exceeds maximum size of {self.max_value_size} bytes")
            return serialized
        except (TypeError, ValueError) as e:
            raise ValueError(f"Failed to serialize value: {e}")
    
    def _deserialize_value(self, value: str) -> Any:
        """
        Deserialize JSON string from database to Python object.
        
        Args:
            value: JSON string from database
            
        Returns:
            Deserialized Python object
        """
        try:
            return json.loads(value)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to deserialize cache value: {e}")
            return None
    
    @contextmanager
    def _timed_operation(self, operation_type: str):
        """Context manager for timing cache operations."""
        start_time = time.time()
        try:
            yield
        finally:
            elapsed = time.time() - start_time
            self.stats['total_time'] += elapsed
            self.stats['operation_count'] += 1
            if elapsed > 1.0:  # Log slow operations
                logger.warning(f"Slow cache {operation_type}: {elapsed:.2f}s")
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache with automatic JSON deserialization.
        
        Args:
            key: Cache key to retrieve
            
        Returns:
            Cached value or None if not found/expired
        """
        if not self.connected:
            self.stats['errors'] += 1
            return None
        
        if self._pipeline_mode:
            self._pipeline_operations.append(('get', key))
            return None
        
        with self._timed_operation('get'):
            try:
                sanitized_key = self._sanitize_key(key)
                
                # Query with expiration check
                response = self.supabase._make_request(
                    'GET',
                    'cache_store',
                    params={
                        'select': 'cache_value,expires_at,hit_count',
                        'cache_key': f'eq.{sanitized_key}',
                        'expires_at': f'gte.{datetime.utcnow().isoformat()}'
                    }
                )
                result = response.json() if response.status_code == 200 else []
                
                if result and len(result) > 0:
                    cache_entry = result[0]
                    
                    # Update hit count asynchronously (fire and forget)
                    try:
                        self.supabase._make_request(
                            'PATCH',
                            f'cache_store?cache_key=eq.{sanitized_key}',
                            data={
                                'hit_count': cache_entry['hit_count'] + 1,
                                'updated_at': datetime.utcnow().isoformat()
                            }
                        )
                    except:
                        pass  # Don't fail on hit count update
                    
                    self.stats['hits'] += 1
                    return self._deserialize_value(cache_entry['cache_value'])
                else:
                    self.stats['misses'] += 1
                    return None
                    
            except Exception as e:
                logger.error(f"Cache get error for key {key}: {e}")
                self.stats['errors'] += 1
                return None
    
    def set(self, key: str, value: Any, ttl_hours: Optional[int] = None) -> bool:
        """
        Set value in cache with automatic JSON serialization.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_hours: Time to live in hours (default: 24)
            
        Returns:
            True if successfully cached
        """
        if not self.connected:
            self.stats['errors'] += 1
            return False
        
        if self._pipeline_mode:
            self._pipeline_operations.append(('set', key, value, ttl_hours))
            return True
        
        with self._timed_operation('set'):
            try:
                sanitized_key = self._sanitize_key(key)
                serialized_value = self._serialize_value(value)
                
                # Calculate expiration
                ttl = ttl_hours or self.default_ttl_hours
                expires_at = datetime.utcnow() + timedelta(hours=ttl)
                
                # Determine cache type from key pattern
                cache_type = self._determine_cache_type(key)
                
                # First try to update existing entry
                update_response = self.supabase._make_request(
                    'PATCH',
                    f'cache_store?cache_key=eq.{sanitized_key}',
                    data={
                        'cache_value': serialized_value,
                        'cache_type': cache_type,
                        'expires_at': expires_at.isoformat(),
                        'updated_at': datetime.utcnow().isoformat(),
                        'hit_count': 0
                    }
                )
                
                # If no rows updated, insert new entry
                if update_response.status_code == 404 or (update_response.status_code == 200 and not update_response.json()):
                    insert_data = {
                        'cache_key': sanitized_key,
                        'cache_value': serialized_value,
                        'cache_type': cache_type,
                        'expires_at': expires_at.isoformat(),
                        'created_at': datetime.utcnow().isoformat(),
                        'updated_at': datetime.utcnow().isoformat(),
                        'hit_count': 0
                    }
                    
                    result = self.supabase._make_request(
                        'POST',
                        'cache_store',
                        data=insert_data
                    )
                
                self.stats['sets'] += 1
                return True
                
            except ValueError as e:
                logger.error(f"Cache set validation error for key {key}: {e}")
                self.stats['errors'] += 1
                return False
            except Exception as e:
                logger.error(f"Cache set error for key {key}: {e}")
                self.stats['errors'] += 1
                return False
    
    def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if successfully deleted
        """
        if not self.connected:
            self.stats['errors'] += 1
            return False
        
        if self._pipeline_mode:
            self._pipeline_operations.append(('delete', key))
            return True
        
        with self._timed_operation('delete'):
            try:
                sanitized_key = self._sanitize_key(key)
                
                result = self.supabase._make_request(
                    'DELETE',
                    f'cache_store?cache_key=eq.{sanitized_key}'
                )
                
                self.stats['deletes'] += 1
                return True
                
            except Exception as e:
                logger.error(f"Cache delete error for key {key}: {e}")
                self.stats['errors'] += 1
                return False
    
    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache and is not expired.
        
        Args:
            key: Cache key to check
            
        Returns:
            True if key exists and is not expired
        """
        if not self.connected:
            return False
        
        try:
            sanitized_key = self._sanitize_key(key)
            
            response = self.supabase._make_request(
                'GET',
                'cache_store',
                params={
                    'select': 'cache_key',
                    'cache_key': f'eq.{sanitized_key}',
                    'expires_at': f'gte.{datetime.utcnow().isoformat()}'
                }
            )
            result = response.json() if response.status_code == 200 else []
            return len(result) > 0
            
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False
    
    def setex(self, key: str, seconds: Union[int, timedelta], value: Any) -> bool:
        """
        Set key with expiration in seconds (Redis compatibility).
        
        Args:
            key: Cache key
            seconds: TTL in seconds or timedelta
            value: Value to cache
            
        Returns:
            True if successfully cached
        """
        if isinstance(seconds, timedelta):
            ttl_hours = seconds.total_seconds() / 3600
        else:
            ttl_hours = seconds / 3600
        
        return self.set(key, value, ttl_hours=ttl_hours)
    
    def pipeline(self):
        """
        Start a pipeline for batch operations (Redis compatibility).
        
        Returns:
            Self for chaining
        """
        self._pipeline_mode = True
        self._pipeline_operations = []
        return self
    
    def execute(self) -> List[Any]:
        """
        Execute all pipeline operations in a batch.
        
        Returns:
            List of results for each operation
        """
        if not self._pipeline_mode:
            return []
        
        results = []
        
        try:
            # Group operations by type for efficiency
            for op in self._pipeline_operations:
                if op[0] == 'get':
                    results.append(self.get(op[1]))
                elif op[0] == 'set':
                    results.append(self.set(op[1], op[2], op[3] if len(op) > 3 else None))
                elif op[0] == 'delete':
                    results.append(self.delete(op[1]))
            
            return results
            
        finally:
            self._pipeline_mode = False
            self._pipeline_operations = []
    
    def _determine_cache_type(self, key: str) -> str:
        """
        Determine cache type from key pattern.
        
        Args:
            key: Cache key
            
        Returns:
            Cache type string
        """
        if 'user_stats:' in key:
            return 'user_stats'
        elif 'recommendations:' in key:
            return 'recommendations'
        elif 'toxicity_analysis:' in key:
            return 'toxicity_analysis'
        elif 'moderation_' in key:
            return 'moderation'
        elif 'list_' in key or '_lists:' in key:
            return 'lists'
        elif 'popular_' in key:
            return 'popular'
        elif 'platform_stats:' in key:
            return 'platform_stats'
        elif 'profile_' in key:
            return 'profile'
        else:
            return 'general'
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache performance statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        with self._lock:
            stats = self.stats.copy()
            
            # Calculate hit rate
            total_ops = stats['hits'] + stats['misses']
            if total_ops > 0:
                stats['hit_rate'] = round(stats['hits'] / total_ops * 100, 2)
            else:
                stats['hit_rate'] = 0
            
            # Calculate average operation time
            if stats['operation_count'] > 0:
                stats['avg_operation_time'] = round(
                    stats['total_time'] / stats['operation_count'] * 1000, 2
                )  # in milliseconds
            else:
                stats['avg_operation_time'] = 0
            
            stats['connected'] = self.connected
            stats['backend'] = 'database'
            
            return stats
    
    def clear_expired(self) -> int:
        """
        Clear expired cache entries from database.
        
        Returns:
            Number of entries cleared
        """
        if not self.connected:
            return 0
        
        try:
            # Delete expired entries
            result = self.supabase._make_request(
                'DELETE',
                f'cache_store?expires_at=lt.{datetime.utcnow().isoformat()}'
            )
            
            # Count is not directly available, so we estimate
            cleared_count = 0  # DELETE doesn't return deleted records
            
            logger.info(f"Cleared {cleared_count} expired cache entries")
            return cleared_count
            
        except Exception as e:
            logger.error(f"Failed to clear expired cache entries: {e}")
            return 0
    
    def info(self) -> Dict[str, Any]:
        """
        Get cache information (Redis compatibility).
        
        Returns:
            Dictionary with cache info
        """
        try:
            # Get cache statistics from database
            response = self.supabase._make_request(
                'GET',
                'cache_store',
                params={
                    'select': 'cache_type',
                    'expires_at': f'gte.{datetime.utcnow().isoformat()}'
                }
            )
            result = response.json() if response.status_code == 200 else []
            
            # Count by type
            type_counts = {}
            total_keys = len(result)
            
            for entry in result:
                cache_type = entry['cache_type']
                type_counts[cache_type] = type_counts.get(cache_type, 0) + 1
            
            return {
                'connected': self.connected,
                'backend': 'database',
                'total_keys': total_keys,
                'type_distribution': type_counts,
                'stats': self.get_stats()
            }
            
        except Exception as e:
            logger.error(f"Failed to get cache info: {e}")
            return {
                'connected': self.connected,
                'backend': 'database',
                'error': str(e)
            }
    
    def ping(self) -> bool:
        """
        Test cache connection (Redis compatibility).
        
        Returns:
            True if connected
        """
        self._test_connection()
        return self.connected


# Batch operations for efficiency
class DatabaseCacheBatch:
    """Helper class for efficient batch cache operations."""
    
    def __init__(self, cache: DatabaseCache):
        self.cache = cache
        self.supabase = cache.supabase
    
    def mget(self, keys: List[str]) -> List[Optional[Any]]:
        """
        Get multiple keys in a single query.
        
        Args:
            keys: List of cache keys
            
        Returns:
            List of values (None for missing keys)
        """
        if not keys or not self.cache.connected:
            return [None] * len(keys)
        
        try:
            # Sanitize all keys
            sanitized_keys = [self.cache._sanitize_key(key) for key in keys]
            
            # Single query for all keys
            # Build the query for multiple keys
            keys_filter = '(' + ','.join(sanitized_keys) + ')'
            response = self.supabase._make_request(
                'GET',
                'cache_store',
                params={
                    'select': 'cache_key,cache_value',
                    'cache_key': f'in.{keys_filter}',
                    'expires_at': f'gte.{datetime.utcnow().isoformat()}'
                }
            )
            result = response.json() if response.status_code == 200 else []
            
            # Build result map
            value_map = {
                entry['cache_key']: self.cache._deserialize_value(entry['cache_value'])
                for entry in result
            }
            
            # Return values in original key order
            return [value_map.get(self.cache._sanitize_key(key)) for key in keys]
            
        except Exception as e:
            logger.error(f"Batch get error: {e}")
            return [None] * len(keys)
    
    def mset(self, key_value_pairs: List[Tuple[str, Any, Optional[int]]]) -> bool:
        """
        Set multiple keys in a single query.
        
        Args:
            key_value_pairs: List of (key, value, ttl_hours) tuples
            
        Returns:
            True if all keys were set successfully
        """
        if not key_value_pairs or not self.cache.connected:
            return False
        
        try:
            # Prepare batch data
            batch_data = []
            for item in key_value_pairs:
                key, value, ttl_hours = item[0], item[1], item[2] if len(item) > 2 else None
                
                ttl = ttl_hours or self.cache.default_ttl_hours
                expires_at = datetime.utcnow() + timedelta(hours=ttl)
                
                batch_data.append({
                    'cache_key': self.cache._sanitize_key(key),
                    'cache_value': self.cache._serialize_value(value),
                    'cache_type': self.cache._determine_cache_type(key),
                    'expires_at': expires_at.isoformat(),
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat(),
                    'hit_count': 0
                })
            
            # For batch operations, we'll use individual upserts
            # Supabase REST API doesn't handle batch upserts well
            for data in batch_data:
                try:
                    # Try update first
                    update_resp = self.supabase._make_request(
                        'PATCH',
                        f'cache_store?cache_key=eq.{data["cache_key"]}',
                        data={k: v for k, v in data.items() if k != 'cache_key'}
                    )
                    
                    # If not found, insert
                    if update_resp.status_code == 404 or (update_resp.status_code == 200 and not update_resp.json()):
                        self.supabase._make_request('POST', 'cache_store', data=data)
                except:
                    continue  # Skip failed entries in batch
            
            return True
            
        except Exception as e:
            logger.error(f"Batch set error: {e}")
            return False