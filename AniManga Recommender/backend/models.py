"""
Models for the AniManga Recommender application.
This module provides data models used by the application and tests.
Uses dataclasses to match the Supabase client approach.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class User:
    """User model for the application."""
    id: str
    email: str
    username: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    profile_data: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary."""
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'profile_data': self.profile_data or {}
        }


@dataclass 
class AnimeItem:
    """Model for anime/manga items."""
    uid: str
    title: str
    media_type: str
    score: Optional[float] = None
    genres: Optional[List[str]] = None
    synopsis: Optional[str] = None
    main_picture: Optional[str] = None
    status: Optional[str] = None
    episodes: Optional[int] = None
    chapters: Optional[int] = None
    volumes: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    sfw: bool = True
    themes: Optional[List[str]] = None
    demographics: Optional[List[str]] = None
    studios: Optional[List[str]] = None
    authors: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert item to dictionary."""
        return {
            'uid': self.uid,
            'title': self.title,
            'media_type': self.media_type,
            'score': self.score,
            'genres': self.genres or [],
            'synopsis': self.synopsis,
            'main_picture': self.main_picture,
            'status': self.status,
            'episodes': self.episodes,
            'chapters': self.chapters,
            'volumes': self.volumes,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'sfw': self.sfw,
            'themes': self.themes or [],
            'demographics': self.demographics or [],
            'studios': self.studios or [],
            'authors': self.authors or []
        }


@dataclass
class UserItem:
    """Model for user's anime/manga list items."""
    id: Optional[str] = None
    user_id: str = ""
    item_uid: str = ""
    status: str = "plan_to_watch"
    progress: int = 0
    rating: Optional[float] = None
    notes: Optional[str] = None
    start_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user item to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'item_uid': self.item_uid,
            'status': self.status,
            'progress': self.progress,
            'rating': self.rating,
            'notes': self.notes,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# Additional helper functions for model creation and testing
def create_sample_user(user_id: str = "test_user", email: str = "test@example.com") -> User:
    """Create a sample user for testing."""
    return User(
        id=user_id,
        email=email,
        username=f"user_{user_id}",
        created_at=datetime.now(),
        profile_data={}
    )


def create_sample_anime_item(uid: str = "anime_1", title: str = "Test Anime") -> AnimeItem:
    """Create a sample anime item for testing."""
    return AnimeItem(
        uid=uid,
        title=title,
        media_type="anime",
        score=8.5,
        genres=["Action", "Adventure"],
        synopsis="A test anime for testing purposes",
        main_picture="https://example.com/image.jpg",
        status="Finished Airing",
        episodes=24,
        sfw=True,
        themes=["Military"],
        demographics=["Shounen"],
        studios=["Test Studio"],
        authors=["Test Author"]
    )


def create_sample_user_item(user_id: str = "test_user", item_uid: str = "anime_1") -> UserItem:
    """Create a sample user item for testing."""
    return UserItem(
        id=f"{user_id}_{item_uid}",
        user_id=user_id,
        item_uid=item_uid,
        status="watching",
        progress=12,
        rating=8.0,
        created_at=datetime.now()
    )


# Test configuration class for compatibility
class TestConfig:
    """Test configuration class for Flask apps."""
    TESTING = True
    WTF_CSRF_ENABLED = False
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-secret'
