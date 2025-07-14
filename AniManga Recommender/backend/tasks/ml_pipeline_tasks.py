# ABOUTME: This file contains ML pipeline tasks for recommendation model updates
# ABOUTME: Implements data preprocessing, model training, and cache refreshing

import os
import sys
import time
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from celery_app import celery_app
from supabase_client import SupabaseClient
# from models import preprocess_data_for_recommendation  # TODO: Implement this function


@celery_app.task(bind=True, max_retries=2)
def preprocess_recommendation_data(self, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Preprocess anime/manga data for recommendation engine.
    
    This task:
    1. Fetches latest item data from database
    2. Processes features (TF-IDF, one-hot encoding, normalization)
    3. Saves preprocessed data to cache
    4. Updates global recommendation matrices
    
    Args:
        force_refresh: Force data refresh even if cache is recent
        
    Returns:
        Dict with preprocessing results and metrics
    """
    try:
        print("🔄 Starting recommendation data preprocessing...")
        start_time = datetime.utcnow()
        
        # Check if preprocessing is needed
        cache_file = 'data/processed_anime_data_cache.pkl'
        if not force_refresh and os.path.exists(cache_file):
            cache_age = datetime.utcnow() - datetime.fromtimestamp(os.path.getmtime(cache_file))
            if cache_age.days < 1:  # Cache is less than 1 day old
                print("✅ Using cached preprocessed data")
                return {
                    'status': 'skipped',
                    'message': 'Cache is recent',
                    'cache_age_hours': cache_age.total_seconds() / 3600
                }
        
        # Initialize Supabase client
        supabase = SupabaseClient()
        
        # Fetch all items data
        print("📥 Fetching items data from database...")
        items_query = """
            SELECT 
                i.*,
                array_agg(DISTINCT g.name) as genres,
                array_agg(DISTINCT t.name) as themes,
                array_agg(DISTINCT d.name) as demographics,
                array_agg(DISTINCT s.name) as studios,
                array_agg(DISTINCT a.name) as authors
            FROM items i
            LEFT JOIN item_genres ig ON i.id = ig.item_id
            LEFT JOIN genres g ON ig.genre_id = g.id
            LEFT JOIN item_themes it ON i.id = it.item_id
            LEFT JOIN themes t ON it.theme_id = t.id
            LEFT JOIN item_demographics id ON i.id = id.item_id
            LEFT JOIN demographics d ON id.demographic_id = d.id
            LEFT JOIN item_studios ist ON i.id = ist.item_id
            LEFT JOIN studios s ON ist.studio_id = s.id
            LEFT JOIN item_authors ia ON i.id = ia.item_id
            LEFT JOIN authors a ON ia.author_id = a.id
            GROUP BY i.id
        """
        
        items_data = supabase.execute_query(items_query)
        
        if not items_data or not items_data[0]:
            raise Exception("No items data found in database")
        
        # Convert to DataFrame
        df = pd.DataFrame(items_data[0])
        initial_count = len(df)
        
        print(f"📊 Processing {initial_count} items...")
        
        # Clean and prepare data
        df['genres'] = df['genres'].apply(lambda x: [g for g in x if g] if x else [])
        df['themes'] = df['themes'].apply(lambda x: [t for t in x if t] if x else [])
        df['demographics'] = df['demographics'].apply(lambda x: [d for d in x if d] if x else [])
        df['studios'] = df['studios'].apply(lambda x: [s for s in x if s] if x else [])
        df['authors'] = df['authors'].apply(lambda x: [a for a in x if a] if x else [])
        
        # Fill missing values
        df['synopsis'] = df['synopsis'].fillna('')
        df['score'] = df['score'].fillna(df['score'].mean())
        df['members'] = df['members'].fillna(0)
        df['favorites'] = df['favorites'].fillna(0)
        
        # Feature Engineering
        print("🔧 Engineering features...")
        
        # Text features - TF-IDF on synopsis
        tfidf_vectorizer = TfidfVectorizer(
            max_features=500,
            stop_words='english',
            ngram_range=(1, 2)
        )
        tfidf_matrix = tfidf_vectorizer.fit_transform(df['synopsis'])
        
        # Categorical features - One-hot encoding
        all_genres = set()
        all_themes = set()
        all_demographics = set()
        
        for genres in df['genres']:
            all_genres.update(genres)
        for themes in df['themes']:
            all_themes.update(themes)
        for demographics in df['demographics']:
            all_demographics.update(demographics)
        
        # Create binary matrices for categorical features
        genre_matrix = np.zeros((len(df), len(all_genres)))
        theme_matrix = np.zeros((len(df), len(all_themes)))
        demographic_matrix = np.zeros((len(df), len(all_demographics)))
        
        genre_to_idx = {genre: idx for idx, genre in enumerate(sorted(all_genres))}
        theme_to_idx = {theme: idx for idx, theme in enumerate(sorted(all_themes))}
        demographic_to_idx = {demo: idx for idx, demo in enumerate(sorted(all_demographics))}
        
        for i, row in df.iterrows():
            for genre in row['genres']:
                if genre in genre_to_idx:
                    genre_matrix[i, genre_to_idx[genre]] = 1
            for theme in row['themes']:
                if theme in theme_to_idx:
                    theme_matrix[i, theme_to_idx[theme]] = 1
            for demo in row['demographics']:
                if demo in demographic_to_idx:
                    demographic_matrix[i, demographic_to_idx[demo]] = 1
        
        # Numerical features - Normalization
        scaler = StandardScaler()
        numerical_features = ['score', 'members', 'favorites', 'episodes', 'chapters']
        df_numerical = df[numerical_features].fillna(0)
        numerical_matrix = scaler.fit_transform(df_numerical)
        
        # Combine all features
        combined_features = np.hstack([
            tfidf_matrix.toarray(),
            genre_matrix,
            theme_matrix,
            demographic_matrix,
            numerical_matrix
        ])
        
        # Create mapping dictionaries
        uid_to_idx = {row['uid']: idx for idx, row in df.iterrows()}
        idx_to_uid = {idx: row['uid'] for idx, row in df.iterrows()}
        
        # Save preprocessed data
        print("💾 Saving preprocessed data...")
        
        # Create data directory if it doesn't exist
        os.makedirs('data', exist_ok=True)
        
        # Save to pickle for fast loading
        preprocessed_data = {
            'df': df[['uid', 'title', 'media_type', 'score', 'members']],
            'tfidf_matrix': tfidf_matrix,
            'tfidf_vectorizer': tfidf_vectorizer,
            'combined_features': combined_features,
            'uid_to_idx': uid_to_idx,
            'idx_to_uid': idx_to_uid,
            'genre_to_idx': genre_to_idx,
            'theme_to_idx': theme_to_idx,
            'demographic_to_idx': demographic_to_idx,
            'scaler': scaler,
            'preprocessing_date': datetime.utcnow().isoformat(),
            'item_count': len(df),
            'feature_count': combined_features.shape[1]
        }
        
        with open(cache_file, 'wb') as f:
            pickle.dump(preprocessed_data, f)
        
        # Update global recommendation data
        try:
            # This would update the global variables in app.py
            # In production, you might want to use Redis or another shared store
            print("🔄 Updating global recommendation matrices...")
            
            # Store in Redis for sharing across workers
            import redis
            redis_client = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
            
            # Store feature dimensions for validation
            redis_client.set('ml:feature_dims', combined_features.shape[1])
            redis_client.set('ml:item_count', len(df))
            redis_client.set('ml:last_update', datetime.utcnow().isoformat())
            
        except Exception as e:
            print(f"⚠️ Failed to update global data: {e}")
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        result = {
            'status': 'completed',
            'items_processed': len(df),
            'feature_dimensions': combined_features.shape[1],
            'execution_time': execution_time,
            'cache_file': cache_file,
            'preprocessing_date': datetime.utcnow().isoformat(),
            'metrics': {
                'tfidf_features': tfidf_matrix.shape[1],
                'genre_count': len(all_genres),
                'theme_count': len(all_themes),
                'demographic_count': len(all_demographics),
                'numerical_features': len(numerical_features)
            }
        }
        
        print(f"✅ Preprocessing completed in {execution_time:.2f} seconds")
        return result
        
    except Exception as exc:
        print(f"❌ Preprocessing failed: {exc}")
        
        if self.request.retries < self.max_retries:
            retry_in = 300  # 5 minutes
            raise self.retry(exc=exc, countdown=retry_in)
        
        return {
            'status': 'failed',
            'error': str(exc),
            'preprocessing_date': datetime.utcnow().isoformat()
        }


@celery_app.task(bind=True)
def warm_recommendation_cache_all_users(self, batch_size: int = 20) -> Dict[str, Any]:
    """
    Warm recommendation caches for all active users.
    
    This scheduled task pre-computes recommendations for users
    to ensure fast response times.
    """
    try:
        print("🔥 Starting recommendation cache warming for all users")
        
        from tasks.recommendation_tasks import warm_user_cache
        
        supabase = SupabaseClient()
        start_time = datetime.utcnow()
        
        # Get active users (with recent activity)
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        
        active_users_query = f"""
            SELECT DISTINCT user_id, MAX(updated_at) as last_activity
            FROM user_items
            WHERE updated_at > '{seven_days_ago}'
            GROUP BY user_id
            ORDER BY last_activity DESC
        """
        
        active_users = supabase.execute_query(active_users_query)
        
        if not active_users or not active_users[0]:
            return {
                'status': 'completed',
                'message': 'No active users found',
                'users_processed': 0
            }
        
        user_ids = [user['user_id'] for user in active_users[0]]
        total_users = len(user_ids)
        
        print(f"🔥 Warming cache for {total_users} active users")
        
        results = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'already_cached': 0
        }
        
        # Process in batches
        for i in range(0, total_users, batch_size):
            batch = user_ids[i:i + batch_size]
            print(f"Processing batch {i//batch_size + 1} ({len(batch)} users)")
            
            for user_id in batch:
                try:
                    result = warm_user_cache.apply(args=[user_id]).get()
                    
                    results['processed'] += 1
                    if result.get('status') == 'success':
                        results['successful'] += 1
                    elif result.get('cache_hit'):
                        results['already_cached'] += 1
                    else:
                        results['failed'] += 1
                        
                except Exception as e:
                    print(f"❌ Failed to warm cache for user {user_id}: {e}")
                    results['processed'] += 1
                    results['failed'] += 1
            
            # Small delay between batches
            time.sleep(0.5)
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        return {
            'status': 'completed',
            'results': results,
            'total_users': total_users,
            'execution_time': execution_time,
            'users_per_minute': (total_users / execution_time * 60) if execution_time > 0 else 0,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as exc:
        print(f"❌ Cache warming failed: {exc}")
        return {
            'status': 'failed',
            'error': str(exc),
            'completed_at': datetime.utcnow().isoformat()
        }


@celery_app.task
def cleanup_old_ml_caches(days: int = 7) -> Dict[str, Any]:
    """
    Clean up old ML model caches and preprocessed data.
    
    Maintains only recent versions to save disk space.
    """
    try:
        print(f"🧹 Cleaning up ML caches older than {days} days")
        
        import glob
        
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        cleaned_files = []
        total_size_freed = 0
        
        # Patterns to clean
        cache_patterns = [
            'data/*_cache.pkl',
            'data/*_backup_*.pkl',
            'models/*_model_*.pkl'
        ]
        
        for pattern in cache_patterns:
            for filepath in glob.glob(pattern):
                try:
                    file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
                    if file_time < cutoff_time:
                        file_size = os.path.getsize(filepath)
                        os.remove(filepath)
                        cleaned_files.append(filepath)
                        total_size_freed += file_size
                        print(f"🗑️ Removed old cache: {filepath}")
                except Exception as e:
                    print(f"⚠️ Failed to remove {filepath}: {e}")
        
        return {
            'status': 'completed',
            'files_cleaned': len(cleaned_files),
            'space_freed_mb': total_size_freed / (1024 * 1024),
            'cleaned_files': cleaned_files,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as exc:
        print(f"❌ Cleanup failed: {exc}")
        return {
            'status': 'failed',
            'error': str(exc),
            'completed_at': datetime.utcnow().isoformat()
        }