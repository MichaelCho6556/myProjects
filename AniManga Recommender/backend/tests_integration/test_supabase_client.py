# ABOUTME: Test-specific Supabase client that uses local database instead of HTTP
# ABOUTME: Allows integration testing without external service dependencies

"""
Test Supabase Client for Integration Tests

This module provides a test implementation of SupabaseClient and SupabaseAuthClient
that uses the local test database instead of making HTTP requests to Supabase.
This allows for true integration testing without external dependencies.
"""

import json
import uuid
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy import text
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class TestSupabaseAuthClient:
    """Test implementation of SupabaseAuthClient using local database."""
    
    def __init__(self, database_connection, base_url=None, api_key=None, service_key=None):
        """Initialize with database connection instead of HTTP credentials."""
        self.db = database_connection
        self.base_url = base_url
        self.api_key = api_key
        self.service_key = service_key
        self.jwt_secret = 'test-jwt-secret-key'
        self.headers = {'apikey': api_key or 'test-key'}
    
    def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user profile in local database."""
        try:
            # Build UPDATE query dynamically based on updates
            set_clauses = []
            params = {'user_id': user_id}
            
            for key, value in updates.items():
                if key in ['username', 'bio', 'avatar_url', 'favorite_genres']:
                    set_clauses.append(f"{key} = :{key}")
                    params[key] = value if not isinstance(value, list) else json.dumps(value)
            
            if not set_clauses:
                return None
            
            query = f"""
                UPDATE user_profiles 
                SET {', '.join(set_clauses)}, updated_at = NOW()
                WHERE id = :user_id
                RETURNING id, email, username, bio, avatar_url, favorite_genres, created_at, updated_at
            """
            
            result = self.db.execute(text(query), params)
            row = result.fetchone()
            
            if row:
                return {
                    'id': row[0],
                    'email': row[1],
                    'username': row[2],
                    'bio': row[3],
                    'avatar_url': row[4],
                    'favorite_genres': json.loads(row[5]) if row[5] and isinstance(row[5], str) else row[5],
                    'created_at': row[6].isoformat() if row[6] else None,
                    'updated_at': row[7].isoformat() if row[7] else None
                }
            return None
            
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            return None
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from local database."""
        try:
            result = self.db.execute(
                text("""
                    SELECT id, email, username, bio, avatar_url, favorite_genres, created_at, updated_at
                    FROM user_profiles
                    WHERE id = :user_id
                """),
                {'user_id': user_id}
            )
            row = result.fetchone()
            
            if row:
                return {
                    'id': row[0],
                    'email': row[1],
                    'username': row[2],
                    'bio': row[3],
                    'avatar_url': row[4],
                    'favorite_genres': json.loads(row[5]) if row[5] and isinstance(row[5], str) else row[5],
                    'created_at': row[6].isoformat() if row[6] else None,
                    'updated_at': row[7].isoformat() if row[7] else None
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return None
    
    def update_user_item_status_comprehensive(self, user_id: str, item_uid: str, status_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user item status in local database."""
        try:
            # Check if item exists
            item_check = self.db.execute(
                text("SELECT uid FROM items WHERE uid = :uid"),
                {'uid': item_uid}
            )
            if not item_check.fetchone():
                return {'success': False, 'error': f'Item {item_uid} not found'}
            
            # Check if user item exists
            existing = self.db.execute(
                text("""
                    SELECT status FROM user_items 
                    WHERE user_id = :user_id AND item_uid = :item_uid
                """),
                {'user_id': user_id, 'item_uid': item_uid}
            )
            existing_data = existing.fetchone()
            
            # Prepare data
            data = {
                'user_id': user_id,
                'item_uid': item_uid,
                'status': status_data['status'],
                'progress': status_data.get('progress', 0),
                'updated_at': 'NOW()'
            }
            
            # Handle rating
            if 'rating' in status_data and status_data['rating'] is not None:
                rating = status_data['rating']
                if not isinstance(rating, (int, float)):
                    raise ValueError("Rating must be a number")
                if rating < 0 or rating > 10:
                    raise ValueError("Rating must be between 0 and 10")
                data['rating'] = round(float(rating), 1)
            
            # Handle notes
            if 'notes' in status_data:
                data['notes'] = status_data['notes']
            
            # Handle completion date
            if status_data['status'] == 'completed':
                data['completion_date'] = status_data.get('completion_date', 'NOW()')
            
            # Handle start date for new records
            if not existing_data and status_data['status'] in ['watching', 'reading']:
                data['start_date'] = 'NOW()'
            
            if existing_data:
                # Update existing record
                set_clauses = []
                params = {'user_id': user_id, 'item_uid': item_uid}
                for key, value in data.items():
                    if key not in ['user_id', 'item_uid']:
                        set_clauses.append(f"{key} = :{key}")
                        params[key] = value if value != 'NOW()' else None
                
                if params.get('updated_at') is None:
                    set_clauses[set_clauses.index('updated_at = :updated_at')] = 'updated_at = NOW()'
                if params.get('completion_date') is None and 'completion_date' in params:
                    set_clauses[set_clauses.index('completion_date = :completion_date')] = 'completion_date = NOW()'
                if params.get('start_date') is None and 'start_date' in params:
                    set_clauses[set_clauses.index('start_date = :start_date')] = 'start_date = NOW()'
                
                query = f"""
                    UPDATE user_items 
                    SET {', '.join(set_clauses)}
                    WHERE user_id = :user_id AND item_uid = :item_uid
                """
                self.db.execute(text(query), {k: v for k, v in params.items() if v is not None or k in ['user_id', 'item_uid']})
            else:
                # Insert new record
                columns = []
                values = []
                params = {}
                for key, value in data.items():
                    columns.append(key)
                    if value == 'NOW()':
                        values.append('NOW()')
                    else:
                        values.append(f':{key}')
                        params[key] = value
                
                query = f"""
                    INSERT INTO user_items ({', '.join(columns)})
                    VALUES ({', '.join(values)})
                """
                self.db.execute(text(query), params)
            
            return {'success': True, 'data': {}}
            
        except Exception as e:
            logger.error(f"Error updating user item status: {e}")
            return {'success': False, 'error': str(e)}
    
    def generate_jwt_token(self, user_id: str) -> str:
        """Generate a test JWT token for authentication testing."""
        import jwt
        import time
        
        payload = {
            'user_id': user_id,
            'sub': user_id,
            'email': 'test@example.com',
            'exp': int(time.time()) + 3600,  # 1 hour expiration
            'iat': int(time.time())
        }
        
        # Use the test JWT secret key
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')
    
    def verify_jwt_token(self, auth_header: str) -> Dict[str, Any]:
        """Verify a JWT token and return user info."""
        import jwt
        
        try:
            # Extract token from Bearer header
            token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else auth_header
            
            # Decode token
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError as e:
            raise Exception(f"Invalid token: {str(e)}")
    
    def get_user_items(self, user_id: str, status: str = None) -> List[Dict[str, Any]]:
        """Get user items from local database with optional status filter."""
        try:
            # Build query with optional status filter
            query = """
                SELECT ui.*, i.title, i.media_type, i.genres, i.score, i.synopsis,
                       i.status as item_status, i.main_picture, i.sfw
                FROM user_items ui
                JOIN items i ON ui.item_uid = i.uid
                WHERE ui.user_id = :user_id
            """
            params = {'user_id': user_id}
            
            if status:
                query += " AND ui.status = :status"
                params['status'] = status
                
            query += " ORDER BY ui.updated_at DESC"
            
            result = self.db.execute(text(query), params)
            
            items = []
            for row in result:
                items.append({
                    'uid': row.item_uid,
                    'title': row.title,
                    'media_type': row.media_type,
                    'genres': json.loads(row.genres) if row.genres and isinstance(row.genres, str) else row.genres,
                    'score': float(row.score) if row.score else None,
                    'synopsis': row.synopsis,
                    'status': row.status,
                    'rating': float(row.rating) if row.rating else None,
                    'progress': row.progress,
                    'notes': row.notes,
                    'main_picture': row.main_picture,
                    'sfw': row.sfw,
                    'updated_at': row.updated_at.isoformat() if row.updated_at else None
                })
            
            return items
            
        except Exception as e:
            logger.error(f"Error getting user items: {e}")
            return []


class TestSupabaseClient:
    """Test implementation of SupabaseClient using local database."""
    
    def __init__(self, database_connection):
        """Initialize with database connection instead of HTTP credentials."""
        self.db = database_connection
        self.base_url = 'http://test-supabase'
        self.api_key = 'test-key'
        self.service_key = 'test-service-key'
    
    def get_user_items(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user items from local database."""
        try:
            result = self.db.execute(
                text("""
                    SELECT ui.*, i.title, i.media_type, i.genres, i.score, i.synopsis,
                           i.status as item_status, i.main_picture, i.sfw
                    FROM user_items ui
                    JOIN items i ON ui.item_uid = i.uid
                    WHERE ui.user_id = :user_id
                    ORDER BY ui.updated_at DESC
                """),
                {'user_id': user_id}
            )
            
            items = []
            for row in result:
                items.append({
                    'uid': row.item_uid,
                    'title': row.title,
                    'media_type': row.media_type,
                    'genres': json.loads(row.genres) if row.genres and isinstance(row.genres, str) else row.genres,
                    'score': float(row.score) if row.score else None,
                    'synopsis': row.synopsis,
                    'status': row.status,
                    'rating': float(row.rating) if row.rating else None,
                    'progress': row.progress,
                    'notes': row.notes,
                    'main_picture': row.main_picture,
                    'sfw': row.sfw,
                    'updated_at': row.updated_at.isoformat() if row.updated_at else None
                })
            
            return items
            
        except Exception as e:
            logger.error(f"Error getting user items: {e}")
            return []
    
    def add_user_item(self, user_id: str, item_uid: str, data: Dict[str, Any]) -> bool:
        """Add or update user item in local database."""
        try:
            # First check if item exists
            item_check = self.db.execute(
                text("SELECT uid FROM items WHERE uid = :uid"),
                {'uid': item_uid}
            )
            if not item_check.fetchone():
                logger.error(f"Item {item_uid} not found")
                return False
            
            # Insert or update user_item
            self.db.execute(
                text("""
                    INSERT INTO user_items (user_id, item_uid, status, rating, progress, notes, updated_at)
                    VALUES (:user_id, :item_uid, :status, :rating, :progress, :notes, NOW())
                    ON CONFLICT (user_id, item_uid) DO UPDATE SET
                        status = EXCLUDED.status,
                        rating = EXCLUDED.rating,
                        progress = EXCLUDED.progress,
                        notes = EXCLUDED.notes,
                        updated_at = NOW()
                """),
                {
                    'user_id': user_id,
                    'item_uid': item_uid,
                    'status': data.get('status', 'plan_to_watch'),
                    'rating': data.get('rating'),
                    'progress': data.get('progress', 0),
                    'notes': data.get('notes')
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error adding user item: {e}")
            return False
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics from local database."""
        try:
            # Get counts by status
            result = self.db.execute(
                text("""
                    SELECT status, COUNT(*) as count
                    FROM user_items
                    WHERE user_id = :user_id
                    GROUP BY status
                """),
                {'user_id': user_id}
            )
            
            stats = {
                'watching': 0,
                'completed': 0,
                'on_hold': 0,
                'dropped': 0,
                'plan_to_watch': 0,
                'total': 0
            }
            
            for row in result:
                if row.status in stats:
                    stats[row.status] = row.count
                    stats['total'] += row.count
            
            # Get average rating
            rating_result = self.db.execute(
                text("""
                    SELECT AVG(rating) as avg_rating
                    FROM user_items
                    WHERE user_id = :user_id AND rating IS NOT NULL
                """),
                {'user_id': user_id}
            )
            rating_row = rating_result.fetchone()
            stats['average_rating'] = float(rating_row.avg_rating) if rating_row and rating_row.avg_rating else 0
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return {
                'watching': 0,
                'completed': 0,
                'on_hold': 0,
                'dropped': 0,
                'plan_to_watch': 0,
                'total': 0,
                'average_rating': 0
            }
    
    def table(self, table_name: str):
        """Mock table method for compatibility."""
        return self
    
    def select(self, *args, **kwargs):
        """Mock select method for compatibility."""
        return self
    
    def eq(self, *args, **kwargs):
        """Mock eq method for compatibility."""
        return self
    
    def execute(self):
        """Mock execute method for compatibility."""
        return type('Response', (), {'data': [], 'error': None})
    
    def create_custom_list(self, user_id: str, list_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a custom list in local database."""
        try:
            import uuid
            list_id = str(uuid.uuid4())
            
            # Insert custom list
            self.db.execute(
                text("""
                    INSERT INTO custom_lists (id, user_id, title, description, is_public, is_collaborative, created_at, updated_at)
                    VALUES (:id, :user_id, :title, :description, :is_public, :is_collaborative, NOW(), NOW())
                """),
                {
                    'id': list_id,
                    'user_id': user_id,
                    'title': list_data.get('title', 'Untitled List'),
                    'description': list_data.get('description', ''),
                    'is_public': list_data.get('is_public', False),
                    'is_collaborative': list_data.get('is_collaborative', False)
                }
            )
            
            return {
                'id': list_id,
                'user_id': user_id,
                'title': list_data.get('title', 'Untitled List'),
                'description': list_data.get('description', ''),
                'is_public': list_data.get('is_public', False),
                'is_collaborative': list_data.get('is_collaborative', False),
                'created_at': 'NOW()',
                'updated_at': 'NOW()'
            }
            
        except Exception as e:
            logger.error(f"Error creating custom list: {e}")
            return None