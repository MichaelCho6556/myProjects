# ABOUTME: Real integration test utilities - NO MOCKS
# ABOUTME: Helper functions for creating test data and managing real database operations

"""
Test Utilities for Real Integration Testing

This module provides helper functions for setting up and managing test data
using real database connections. NO MOCKS - all operations are performed
against actual services.
"""

import uuid
import jwt
import time
import hashlib
import secrets
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy import text, create_engine
from sqlalchemy.engine import Connection

# Global test connection for sharing between test clients
_test_connection = None

def set_test_connection(connection):
    """Set the global test connection for all test clients to use."""
    global _test_connection
    _test_connection = connection

def get_test_connection():
    """Get the global test connection."""
    return _test_connection


class TestSupabaseAuthClient:
    """Test authentication client that mimics SupabaseAuthClient interface."""
    
    def __init__(self, base_url=None, api_key=None, service_key=None, connection=None):
        """Initialize test auth client."""
        self.base_url = base_url or "http://test-auth"
        self.headers = {
            "Authorization": "Bearer test-token",
            "Content-Type": "application/json"
        }
        self.jwt_secret = 'test-jwt-secret-key'
        # Use provided connection or create new one
        if connection:
            self._connection = connection
            self._owns_connection = False
        else:
            # Get test database connection
            test_db_url = "postgresql://test_user:test_password@localhost:5433/animanga_test"
            self.engine = create_engine(test_db_url)
            self._connection = None
            self._owns_connection = True
    
    def _get_connection(self):
        """Get database connection."""
        if self._connection:
            return self._connection
        else:
            return self.engine.connect()
        
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token locally using test secret."""
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decode token with test secret
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=['HS256']
            )
            
            # Return user info
            return {
                'id': payload.get('user_id'),
                'user_id': payload.get('user_id'),
                'email': payload.get('email'),
                'sub': payload.get('user_id')  # For compatibility
            }
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError:
            raise Exception("Invalid token")
    
    def get_user_items(self, user_id: str, status: str = None) -> list:
        """Get user's anime/manga items from test database."""
        try:
            # Use existing connection or create new one
            if self._connection:
                # Use existing connection (from test fixture)
                conn = self._connection
                should_close = False
            else:
                # Create new connection
                conn = self.engine.connect()
                should_close = True
                
            try:
                if status:
                    query = """
                        SELECT ui.*, i.* 
                        FROM user_items ui
                        JOIN items i ON ui.item_uid = i.uid
                        WHERE ui.user_id = :user_id AND ui.status = :status
                        ORDER BY ui.updated_at DESC
                    """
                    params = {"user_id": user_id, "status": status}
                else:
                    query = """
                        SELECT ui.*, i.*
                        FROM user_items ui
                        JOIN items i ON ui.item_uid = i.uid
                        WHERE ui.user_id = :user_id
                        ORDER BY ui.updated_at DESC
                    """
                    params = {"user_id": user_id}
                
                result = conn.execute(text(query), params)
                items = result.fetchall()
                
                # Convert to list of dicts
                return [dict(row._mapping) for row in items] if items else []
            finally:
                if should_close:
                    conn.close()
        except Exception as e:
            print(f"Error getting user items: {e}")
            return []
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from test database."""
        try:
            if self._connection:
                conn = self._connection
                should_close = False
            else:
                conn = self.engine.connect()
                should_close = True
                
            try:
                result = conn.execute(
                    text("SELECT * FROM user_profiles WHERE id = :user_id"),
                    {"user_id": user_id}
                )
                profile = result.fetchone()
                
                return dict(profile._mapping) if profile else None
            finally:
                if should_close:
                    conn.close()
        except Exception as e:
            print(f"Error getting user profile: {e}")
            return None
    
    def update_user_profile(self, user_id: str, updates: dict) -> Optional[Dict[str, Any]]:
        """Update user profile in test database."""
        try:
            # Build UPDATE query dynamically
            set_clauses = []
            params = {"user_id": user_id}
            
            for key, value in updates.items():
                if key not in ['id', 'created_at']:  # Skip immutable fields
                    set_clauses.append(f"{key} = :{key}")
                    params[key] = value
            
            if not set_clauses:
                return None
                
            query = f"""
                UPDATE user_profiles 
                SET {', '.join(set_clauses)}, updated_at = NOW()
                WHERE id = :user_id
                RETURNING *
            """
            
            if self._connection:
                conn = self._connection
                should_close = False
            else:
                conn = self.engine.connect()
                should_close = True
                
            try:
                result = conn.execute(text(query), params)
                if not self._connection:
                    conn.commit()
                updated = result.fetchone()
                
                return dict(updated._mapping) if updated else None
            finally:
                if should_close:
                    conn.close()
        except Exception as e:
            print(f"Error updating user profile: {e}")
            return None
    
    def update_user_item_status_comprehensive(self, user_id: str, item_uid: str, status_data: dict) -> bool:
        """Update user item status comprehensively."""
        try:
            if self._connection:
                conn = self._connection
                should_close = False
            else:
                conn = self.engine.connect()
                should_close = True
                
            try:
                # Check if item exists for user
                check_result = conn.execute(
                    text("SELECT * FROM user_items WHERE user_id = :user_id AND item_uid = :item_uid"),
                    {"user_id": user_id, "item_uid": item_uid}
                )
                existing = check_result.fetchone()
                
                if existing:
                    # Update existing
                    update_query = """
                        UPDATE user_items 
                        SET status = :status, score = :score, progress = :progress, 
                            notes = :notes, updated_at = NOW()
                        WHERE user_id = :user_id AND item_uid = :item_uid
                        RETURNING *
                    """
                else:
                    # Insert new
                    update_query = """
                        INSERT INTO user_items (user_id, item_uid, status, score, progress, notes, created_at, updated_at)
                        VALUES (:user_id, :item_uid, :status, :score, :progress, :notes, NOW(), NOW())
                        RETURNING *
                    """
                
                result = conn.execute(
                    text(update_query),
                    {
                        "user_id": user_id,
                        "item_uid": item_uid,
                        "status": status_data.get('status'),
                        "score": status_data.get('rating') or status_data.get('score'),
                        "progress": status_data.get('progress', 0),
                        "notes": status_data.get('notes')
                    }
                )
                if not self._connection:
                    conn.commit()
                
                return True
            finally:
                if should_close:
                    conn.close()
        except Exception as e:
            print(f"Error updating user item: {e}")
            return False


class TestSupabaseClient:
    """Test database client that mimics SupabaseClient interface for tests."""
    
    def __init__(self, connection=None):
        """Initialize test database client."""
        self.is_test_mode = True
        # Use provided connection or create new one
        if connection:
            self._connection = connection
            self._owns_connection = False
        else:
            # Get test database connection
            test_db_url = "postgresql://test_user:test_password@localhost:5433/animanga_test"
            self.engine = create_engine(test_db_url)
            self._connection = None
            self._owns_connection = True
        self._reset_query()
        
    def _reset_query(self):
        """Reset query builder state."""
        self._table_name = None
        self._select_columns = '*'
        self._filters = []
        self._order_by = []
        self._limit = None
        self._offset = 0
        self._count_mode = None
        self._range_start = None
        self._range_end = None
        
    def table(self, table_name: str):
        """Set the table to query."""
        self._reset_query()
        self._table_name = table_name
        return self
        
    def select(self, columns: str = '*'):
        """Set columns to select."""
        self._select_columns = columns
        return self
        
    def eq(self, column: str, value: Any):
        """Add equality filter."""
        self._filters.append((column, '=', value))
        return self
        
    def ilike(self, column: str, pattern: str):
        """Add case-insensitive LIKE filter."""
        self._filters.append((column, 'ILIKE', pattern))
        return self
        
    def order(self, column: str):
        """Add ORDER BY clause. Supports 'column.desc' syntax."""
        if column.endswith('.desc'):
            actual_column = column[:-5]  # Remove '.desc'
            self._order_by.append(f"{actual_column} DESC")
        else:
            self._order_by.append(f"{column} ASC")
        return self
        
    def limit(self, count: int):
        """Set result limit."""
        self._limit = count
        return self
        
    def range(self, start: int, end: int):
        """Set range for pagination (0-based, inclusive)."""
        self._range_start = start
        self._range_end = end
        return self
        
    def count(self, mode: str = 'exact'):
        """Enable count mode for getting total records."""
        self._count_mode = mode
        return self
        
    def execute(self):
        """Execute the query and return results."""
        if not self._table_name:
            raise ValueError("Table name not set")
            
        # Handle count mode
        if self._count_mode:
            count_query = f"SELECT COUNT(*) as count FROM {self._table_name}"
            params = {}
            
            # Add filters for count
            if self._filters:
                conditions = []
                for i, (col, op, val) in enumerate(self._filters):
                    param_name = f"param_{i}"
                    if op == 'ILIKE':
                        conditions.append(f"{col} ILIKE :{param_name}")
                    else:
                        conditions.append(f"{col} {op} :{param_name}")
                    params[param_name] = val
                count_query += " WHERE " + " AND ".join(conditions)
            
            if self._connection:
                conn = self._connection
                should_close = False
            else:
                conn = self.engine.connect()
                should_close = True
                
            try:
                result = conn.execute(text(count_query), params)
                count = result.scalar()
            finally:
                if should_close:
                    conn.close()
                
            class CountResponse:
                def __init__(self, count):
                    self.count = count
                    
            return CountResponse(count)
            
        # Build regular query
        columns = self._select_columns or '*'
        query = f"SELECT {columns} FROM {self._table_name}"
        
        # Add filters
        params = {}
        if self._filters:
            conditions = []
            for i, (col, op, val) in enumerate(self._filters):
                param_name = f"param_{i}"
                if op == 'ILIKE':
                    conditions.append(f"{col} ILIKE :{param_name}")
                else:
                    conditions.append(f"{col} {op} :{param_name}")
                params[param_name] = val
            query += " WHERE " + " AND ".join(conditions)
            
        # Add ORDER BY
        if self._order_by:
            query += " ORDER BY " + ", ".join(self._order_by)
            
        # Add LIMIT and OFFSET for range or limit
        if self._range_start is not None and self._range_end is not None:
            limit = self._range_end - self._range_start + 1
            query += f" LIMIT {limit} OFFSET {self._range_start}"
        elif self._limit:
            query += f" LIMIT {self._limit}"
            if self._offset:
                query += f" OFFSET {self._offset}"
            
        # Execute query
        if self._connection:
            conn = self._connection
            should_close = False
        else:
            conn = self.engine.connect()
            should_close = True
            
        try:
            result = conn.execute(text(query), params)
            rows = result.fetchall()
        finally:
            if should_close:
                conn.close()
            
        # Return in format similar to Supabase response
        class Response:
            def __init__(self, data):
                self.data = data
                
        # Convert rows to dictionaries
        if rows:
            data = [dict(row._mapping) for row in rows]
        else:
            data = []
            
        return Response(data)
    
    def create_custom_list(self, user_id: str, list_data: dict) -> dict:
        """Create a new custom list."""
        try:
            import uuid
            list_id = str(uuid.uuid4())
            
            if self._connection:
                conn = self._connection
                should_close = False
            else:
                conn = self.engine.connect()
                should_close = True
                
            try:
                result = conn.execute(
                    text("""
                        INSERT INTO custom_lists (id, user_id, title, description, is_public, is_collaborative, created_at, updated_at)
                        VALUES (:id, :user_id, :title, :description, :is_public, :is_collaborative, NOW(), NOW())
                        RETURNING *
                    """),
                    {
                        "id": list_id,
                        "user_id": user_id,
                        "title": list_data.get('title'),
                        "description": list_data.get('description'),
                        "is_public": list_data.get('is_public', True),
                        "is_collaborative": list_data.get('is_collaborative', False)
                    }
                )
                if not self._connection:
                    conn.commit()
                created_list = dict(result.fetchone()._mapping)
                return created_list
            finally:
                if should_close:
                    conn.close()
        except Exception as e:
            print(f"Error creating custom list: {e}")
            return None
    
    def items_to_dataframe(self, include_relations=False, lazy_load=False):
        """Convert items to pandas DataFrame."""
        import pandas as pd
        
        if self._connection:
            conn = self._connection
            should_close = False
        else:
            conn = self.engine.connect()
            should_close = True
            
        try:
            query = "SELECT * FROM items"
            result = conn.execute(text(query))
            items = result.fetchall()
        finally:
            if should_close:
                conn.close()
            
        if items:
            df = pd.DataFrame([dict(row._mapping) for row in items])
            return df
        else:
            return pd.DataFrame()


class TestDataManager:
    """Manages test data creation and cleanup for real integration tests."""
    
    def __init__(self, connection: Connection):
        """Initialize with a real database connection."""
        self.connection = connection
        self.created_users = []
        self.created_items = []
        self.created_lists = []
        self.created_comments = []
        self.created_reviews = []
        
    def cleanup(self):
        """Clean up all test data created during testing."""
        # Delete in reverse order of dependencies
        if self.created_reviews:
            self.connection.execute(
                text("DELETE FROM reviews WHERE id = ANY(:ids)"),
                {"ids": self.created_reviews}
            )
            
        if self.created_comments:
            self.connection.execute(
                text("DELETE FROM comments WHERE id = ANY(:ids)"),
                {"ids": self.created_comments}
            )
            
        if self.created_lists:
            # First delete list items
            self.connection.execute(
                text("DELETE FROM custom_list_items WHERE list_id = ANY(:ids)"),
                {"ids": self.created_lists}
            )
            # Then delete lists
            self.connection.execute(
                text("DELETE FROM custom_lists WHERE id = ANY(:ids)"),
                {"ids": self.created_lists}
            )
            
        if self.created_users:
            # Delete all user-related data
            tables = [
                'user_follows', 'notifications', 'user_statistics',
                'user_reputation', 'user_privacy_settings', 'user_items',
                'user_activity', 'user_profiles'
            ]
            for table in tables:
                self.connection.execute(
                    text(f"DELETE FROM {table} WHERE user_id = ANY(:ids) OR id = ANY(:ids)"),
                    {"ids": self.created_users}
                )
                
        if self.created_items:
            self.connection.execute(
                text("DELETE FROM items WHERE uid = ANY(:ids)"),
                {"ids": self.created_items}
            )
            
        self.connection.commit()
        
    def create_test_user(
        self,
        email: Optional[str] = None,
        username: Optional[str] = None,
        bio: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a real test user in the database."""
        user_id = str(uuid.uuid4())
        email = email or f"test_{user_id[:8]}@example.com"
        username = username or f"testuser_{user_id[:8]}"
        
        # Create user profile
        result = self.connection.execute(
            text("""
                INSERT INTO user_profiles (id, email, username, bio, avatar_url, created_at, updated_at)
                VALUES (:id, :email, :username, :bio, :avatar_url, NOW(), NOW())
                RETURNING id, email, username, bio, avatar_url
            """),
            {
                "id": user_id,
                "email": email,
                "username": username,
                "bio": bio or f"Test user bio for {username}",
                "avatar_url": avatar_url
            }
        )
        user = dict(result.fetchone()._mapping)
        
        # Create default privacy settings
        self.connection.execute(
            text("""
                INSERT INTO user_privacy_settings (
                    user_id, profile_visibility, list_visibility, 
                    activity_visibility, stats_visibility, 
                    following_visibility, allow_friend_requests
                )
                VALUES (:user_id, 'public', 'public', 'public', 'public', 'public', true)
            """),
            {"user_id": user_id}
        )
        
        # Create default statistics
        self.connection.execute(
            text("""
                INSERT INTO user_statistics (
                    user_id, total_anime, total_manga, anime_days_watched,
                    manga_chapters_read, mean_score, updated_at
                )
                VALUES (:user_id, 0, 0, 0, 0, 0, NOW())
            """),
            {"user_id": user_id}
        )
        
        # Create default reputation
        self.connection.execute(
            text("""
                INSERT INTO user_reputation (
                    user_id, reputation_score, helpful_reviews, quality_lists
                )
                VALUES (:user_id, 0, 0, 0)
            """),
            {"user_id": user_id}
        )
        
        self.connection.commit()
        self.created_users.append(user_id)
        
        return user
        
    def create_test_item(
        self,
        uid: Optional[str] = None,
        title: Optional[str] = None,
        item_type: Optional[str] = None,
        media_type: Optional[str] = None,
        synopsis: Optional[str] = None,
        score: float = 7.5,
        episodes: Optional[int] = 12,
        genres: Optional[List[str]] = None,
        themes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Create a real test item in the database."""
        # Support both item_type and media_type for backward compatibility
        type_value = item_type or media_type or "anime"
        
        uid = uid or f"test_{uuid.uuid4().hex[:8]}"
        title = title or f"Test {type_value.title()} {uid}"
        
        result = self.connection.execute(
            text("""
                INSERT INTO items (
                    uid, title, media_type, synopsis, score, scored_by, rank, popularity,
                    members, favorites, episodes, genres, themes, demographics,
                    studios, aired, source, rating, created_at, updated_at
                )
                VALUES (
                    :uid, :title, :media_type, :synopsis, :score, :scored_by, :rank, :popularity,
                    :members, :favorites, :episodes, :genres, :themes, :demographics,
                    :studios, :aired, :source, :rating, NOW(), NOW()
                )
                RETURNING uid, title, media_type, synopsis, score, episodes
            """),
            {
                "uid": uid,
                "title": title,
                "media_type": type_value,
                "synopsis": synopsis or f"Test synopsis for {title}",
                "score": score,
                "scored_by": 1000,
                "rank": 100,
                "popularity": 500,
                "members": 10000,
                "favorites": 100,
                "episodes": episodes,
                "genres": genres or ["Action", "Adventure"],
                "themes": themes or ["School"],
                "demographics": ["Shounen"],
                "studios": ["Test Studio"],
                "aired": "2024",
                "source": "Original",
                "rating": "PG-13"
            }
        )
        item = dict(result.fetchone()._mapping)
        
        self.connection.commit()
        self.created_items.append(uid)
        
        return item
        
    def create_test_list(
        self,
        user_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        is_public: bool = True,
        is_collaborative: bool = False
    ) -> Dict[str, Any]:
        """Create a real test list in the database."""
        list_id = str(uuid.uuid4())
        title = title or f"Test List {list_id[:8]}"
        
        result = self.connection.execute(
            text("""
                INSERT INTO custom_lists (
                    id, user_id, title, description, is_public, is_collaborative,
                    created_at, updated_at
                )
                VALUES (
                    :id, :user_id, :title, :description, :is_public, :is_collaborative,
                    NOW(), NOW()
                )
                RETURNING id, user_id, title, description, is_public, is_collaborative
            """),
            {
                "id": list_id,
                "user_id": user_id,
                "title": title,
                "description": description or f"Description for {title}",
                "is_public": is_public,
                "is_collaborative": is_collaborative
            }
        )
        custom_list = dict(result.fetchone()._mapping)
        
        self.connection.commit()
        self.created_lists.append(list_id)
        
        return custom_list
        
    def add_item_to_list(
        self,
        list_id: str,
        item_uid: str,
        user_id: str,
        position: int = 1,
        personal_rating: Optional[float] = None,
        status: str = "completed",
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Add a real item to a test list."""
        result = self.connection.execute(
            text("""
                INSERT INTO custom_list_items (
                    list_id, item_uid, added_by, position, personal_rating,
                    status, tags, added_at
                )
                VALUES (
                    :list_id, :item_uid, :added_by, :position, :personal_rating,
                    :status, :tags, NOW()
                )
                RETURNING list_id, item_uid, position, personal_rating, status
            """),
            {
                "list_id": list_id,
                "item_uid": item_uid,
                "added_by": user_id,
                "position": position,
                "personal_rating": personal_rating,
                "status": status,
                "tags": tags or []
            }
        )
        list_item = dict(result.fetchone()._mapping)
        
        self.connection.commit()
        
        return list_item
        
    def create_test_comment(
        self,
        user_id: str,
        parent_type: str,
        parent_id: str,
        content: str,
        is_spoiler: bool = False
    ) -> Dict[str, Any]:
        """Create a real test comment in the database."""
        comment_id = str(uuid.uuid4())
        
        result = self.connection.execute(
            text("""
                INSERT INTO comments (
                    id, user_id, parent_type, parent_id, content, is_spoiler,
                    likes, created_at, updated_at
                )
                VALUES (
                    :id, :user_id, :parent_type, :parent_id, :content, :is_spoiler,
                    0, NOW(), NOW()
                )
                RETURNING id, user_id, parent_type, parent_id, content, is_spoiler
            """),
            {
                "id": comment_id,
                "user_id": user_id,
                "parent_type": parent_type,
                "parent_id": parent_id,
                "content": content,
                "is_spoiler": is_spoiler
            }
        )
        comment = dict(result.fetchone()._mapping)
        
        self.connection.commit()
        self.created_comments.append(comment_id)
        
        return comment
        
    def create_test_review(
        self,
        user_id: str,
        item_uid: str,
        overall_rating: int,
        story_rating: Optional[int] = None,
        animation_rating: Optional[int] = None,
        character_rating: Optional[int] = None,
        enjoyment_rating: Optional[int] = None,
        review_text: Optional[str] = None,
        contains_spoilers: bool = False
    ) -> Dict[str, Any]:
        """Create a real test review in the database."""
        review_id = str(uuid.uuid4())
        
        result = self.connection.execute(
            text("""
                INSERT INTO reviews (
                    id, user_id, item_uid, overall_rating, story_rating,
                    animation_rating, character_rating, enjoyment_rating,
                    review_text, contains_spoilers, helpful_count, created_at, updated_at
                )
                VALUES (
                    :id, :user_id, :item_uid, :overall_rating, :story_rating,
                    :animation_rating, :character_rating, :enjoyment_rating,
                    :review_text, :contains_spoilers, 0, NOW(), NOW()
                )
                RETURNING id, user_id, item_uid, overall_rating, review_text
            """),
            {
                "id": review_id,
                "user_id": user_id,
                "item_uid": item_uid,
                "overall_rating": overall_rating,
                "story_rating": story_rating,
                "animation_rating": animation_rating,
                "character_rating": character_rating,
                "enjoyment_rating": enjoyment_rating,
                "review_text": review_text or f"Test review for item {item_uid}",
                "contains_spoilers": contains_spoilers
            }
        )
        review = dict(result.fetchone()._mapping)
        
        self.connection.commit()
        self.created_reviews.append(review_id)
        
        return review
        
    def create_user_item_entry(
        self,
        user_id: str,
        item_uid: str,
        status: str = "completed",
        score: Optional[float] = None,
        progress: int = 0,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a real user item entry in the database."""
        result = self.connection.execute(
            text("""
                INSERT INTO user_items (
                    user_id, item_uid, status, score, progress, notes,
                    created_at, updated_at
                )
                VALUES (
                    :user_id, :item_uid, :status, :score, :progress, :notes,
                    NOW(), NOW()
                )
                ON CONFLICT (user_id, item_uid) 
                DO UPDATE SET
                    status = EXCLUDED.status,
                    score = EXCLUDED.score,
                    progress = EXCLUDED.progress,
                    notes = EXCLUDED.notes,
                    updated_at = NOW()
                RETURNING user_id, item_uid, status, score, progress
            """),
            {
                "user_id": user_id,
                "item_uid": item_uid,
                "status": status,
                "score": score,
                "progress": progress,
                "notes": notes
            }
        )
        user_item = dict(result.fetchone()._mapping)
        
        self.connection.commit()
        
        return user_item
    
    def add_user_item(
        self,
        user_id: str,
        item_uid: str,
        status: str = "completed",
        rating: Optional[float] = None
    ) -> Dict[str, Any]:
        """Wrapper method for create_user_item_entry to match test expectations."""
        return self.create_user_item_entry(
            user_id=user_id,
            item_uid=item_uid,
            status=status,
            score=rating,
            progress=0,
            notes=None
        )
    
    def get_user_items(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all user items for a specific user."""
        result = self.connection.execute(
            text("""
                SELECT ui.*, i.title, i.media_type, i.score as item_score
                FROM user_items ui
                JOIN items i ON ui.item_uid = i.uid
                WHERE ui.user_id = :user_id
            """),
            {"user_id": user_id}
        )
        items = []
        for row in result.fetchall():
            items.append(dict(row._mapping))
        return items
    
    def update_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """Update user statistics based on their items."""
        # Calculate statistics from user items
        stats_result = self.connection.execute(
            text("""
                SELECT 
                    COUNT(CASE WHEN i.media_type = 'anime' THEN 1 END) as total_anime,
                    COUNT(CASE WHEN i.media_type = 'manga' THEN 1 END) as total_manga,
                    AVG(ui.score) as mean_score,
                    COUNT(*) as total_items
                FROM user_items ui
                JOIN items i ON ui.item_uid = i.uid
                WHERE ui.user_id = :user_id
            """),
            {"user_id": user_id}
        )
        stats = stats_result.fetchone()
        
        # Update user statistics
        result = self.connection.execute(
            text("""
                UPDATE user_statistics
                SET total_anime = :total_anime,
                    total_manga = :total_manga,
                    mean_score = COALESCE(:mean_score, 0),
                    updated_at = NOW()
                WHERE user_id = :user_id
                RETURNING total_anime, total_manga, mean_score
            """),
            {
                "user_id": user_id,
                "total_anime": stats[0] or 0,
                "total_manga": stats[1] or 0,
                "mean_score": float(stats[2]) if stats[2] else 0
            }
        )
        
        self.connection.commit()
        updated = result.fetchone()
        
        if updated:
            return {
                "total_anime": updated[0],
                "total_manga": updated[1],
                "mean_score": updated[2]
            }
        return {}
    
    def get_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics."""
        result = self.connection.execute(
            text("""
                SELECT total_anime, total_manga, anime_days_watched, 
                       manga_chapters_read, mean_score
                FROM user_statistics
                WHERE user_id = :user_id
            """),
            {"user_id": user_id}
        )
        stats = result.fetchone()
        
        if stats:
            return {
                "total_anime": stats[0],
                "total_manga": stats[1],
                "anime_days_watched": stats[2],
                "manga_chapters_read": stats[3],
                "mean_score": stats[4]
            }
        return None


def generate_jwt_token(
    user_id: str,
    email: str,
    secret_key: str,
    expires_in: int = 3600
) -> str:
    """Generate a real JWT token for testing."""
    current_time = int(time.time())
    
    payload = {
        'user_id': str(user_id),
        'sub': str(user_id),
        'email': email,
        'exp': current_time + expires_in,
        'iat': current_time
    }
    
    return jwt.encode(payload, secret_key, algorithm='HS256')


def create_auth_headers(token: str) -> Dict[str, str]:
    """Create authorization headers with JWT token."""
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }


def generate_test_password_hash(password: str) -> str:
    """Generate a password hash for testing (mimics Supabase auth)."""
    # Simple hash for testing - in production Supabase handles this
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${password_hash.hex()}"


def verify_test_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    try:
        salt, hash_hex = password_hash.split('$')
        test_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return test_hash.hex() == hash_hex
    except:
        return False


def create_test_data_fixtures(connection: Connection) -> Dict[str, Any]:
    """Create a comprehensive set of test data fixtures."""
    manager = TestDataManager(connection)
    
    # Create test users
    users = {
        'alice': manager.create_test_user(
            email="alice@example.com",
            username="alice",
            bio="Alice's test account"
        ),
        'bob': manager.create_test_user(
            email="bob@example.com",
            username="bob",
            bio="Bob's test account"
        ),
        'charlie': manager.create_test_user(
            email="charlie@example.com",
            username="charlie",
            bio="Charlie's test account"
        )
    }
    
    # Create test items
    items = {
        'anime1': manager.create_test_item(
            uid="test_anime_1",
            title="Test Anime One",
            item_type="anime",
            score=8.5,
            episodes=24,
            genres=["Action", "Adventure", "Fantasy"],
            themes=["School", "Superpowers"]
        ),
        'anime2': manager.create_test_item(
            uid="test_anime_2",
            title="Test Anime Two",
            item_type="anime",
            score=7.8,
            episodes=12,
            genres=["Comedy", "Romance"],
            themes=["School", "Love"]
        ),
        'manga1': manager.create_test_item(
            uid="test_manga_1",
            title="Test Manga One",
            item_type="manga",
            score=8.2,
            episodes=None,
            genres=["Action", "Drama"],
            themes=["Military", "Historical"]
        )
    }
    
    # Create test lists
    lists = {
        'alice_public': manager.create_test_list(
            user_id=users['alice']['id'],
            title="Alice's Public List",
            description="A public list by Alice",
            is_public=True
        ),
        'bob_private': manager.create_test_list(
            user_id=users['bob']['id'],
            title="Bob's Private List",
            description="A private list by Bob",
            is_public=False
        ),
        'charlie_collab': manager.create_test_list(
            user_id=users['charlie']['id'],
            title="Charlie's Collaborative List",
            description="A collaborative list by Charlie",
            is_public=True,
            is_collaborative=True
        )
    }
    
    # Add items to lists
    manager.add_item_to_list(
        list_id=lists['alice_public']['id'],
        item_uid=items['anime1']['uid'],
        user_id=users['alice']['id'],
        position=1,
        personal_rating=9.0
    )
    
    manager.add_item_to_list(
        list_id=lists['alice_public']['id'],
        item_uid=items['anime2']['uid'],
        user_id=users['alice']['id'],
        position=2,
        personal_rating=8.0
    )
    
    # Create user item entries
    for user_key, user in users.items():
        for item_key, item in items.items():
            if user_key == 'alice' or (user_key == 'bob' and 'anime' in item_key):
                manager.create_user_item_entry(
                    user_id=user['id'],
                    item_uid=item['uid'],
                    status="completed" if user_key == 'alice' else "watching",
                    score=8.0 if user_key == 'alice' else None,
                    progress=item.get('episodes', 0) if user_key == 'alice' else 5
                )
    
    return {
        'users': users,
        'items': items,
        'lists': lists,
        'manager': manager
    }


def assert_response_success(response, expected_status: int = 200):
    """Assert that a response is successful with optional status check."""
    assert response.status_code == expected_status, \
        f"Expected status {expected_status}, got {response.status_code}. " \
        f"Response: {response.data.decode('utf-8') if response.data else 'No data'}"
    
    
def assert_json_response(response):
    """Assert that a response contains valid JSON and return the parsed data."""
    assert response.content_type == 'application/json', \
        f"Expected JSON response, got {response.content_type}"
    
    import json
    try:
        return json.loads(response.data)
    except json.JSONDecodeError as e:
        raise AssertionError(f"Invalid JSON response: {e}. Data: {response.data}")