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
        """
        Convert User instance to a JSON-serializable dictionary representation.
        
        This method transforms the User dataclass into a dictionary format suitable
        for JSON serialization, API responses, and database operations. It handles
        datetime serialization and ensures all data types are properly formatted.
        
        Returns:
            Dict[str, Any]: Dictionary representation containing:
                - id (str): Unique user identifier
                - email (str): User's email address
                - username (str|None): Display username or None
                - created_at (str|None): ISO format timestamp or None
                - updated_at (str|None): ISO format timestamp or None
                - profile_data (dict): User profile information, defaults to empty dict
                
        Serialization Features:
            - Datetime objects converted to ISO format strings
            - None values preserved for optional fields
            - Empty dict provided for missing profile_data
            - All values guaranteed JSON-serializable
            
        Example:
            >>> user = User(id="123", email="user@example.com", username="testuser")
            >>> user_dict = user.to_dict()
            >>> print(user_dict)
            {
                'id': '123',
                'email': 'user@example.com', 
                'username': 'testuser',
                'created_at': None,
                'updated_at': None,
                'profile_data': {}
            }
            
        Use Cases:
            - API response serialization for user profiles
            - Database insert/update operations
            - Session data storage and retrieval
            - Frontend state management integration
            - User data export and backup operations
            
        Note:
            Timestamps are converted to ISO format for standardized date handling
            across different systems and timezones. Profile data defaults to empty
            dict to prevent null reference errors in frontend applications.
        """
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
        """
        Convert AnimeItem instance to a comprehensive dictionary representation.
        
        This method transforms the AnimeItem dataclass into a complete dictionary
        format suitable for API responses, search results, and frontend consumption.
        It ensures all list fields default to empty lists and handles optional values.
        
        Returns:
            Dict[str, Any]: Complete item representation containing:
                - uid (str): Unique item identifier
                - title (str): Item title/name
                - media_type (str): Type of media ('anime' or 'manga')
                - score (float|None): Average rating score (0.0-10.0)
                - genres (list): List of genre strings, defaults to empty list
                - synopsis (str|None): Plot description or None
                - main_picture (str|None): Cover image URL or None
                - status (str|None): Production status or None
                - episodes (int|None): Number of episodes (anime only)
                - chapters (int|None): Number of chapters (manga only)
                - volumes (int|None): Number of volumes (manga only)
                - start_date (str|None): Broadcast/publication start date
                - end_date (str|None): Broadcast/publication end date
                - sfw (bool): Safe-for-work flag, defaults to True
                - themes (list): Thematic elements, defaults to empty list
                - demographics (list): Target demographics, defaults to empty list
                - studios (list): Production studios, defaults to empty list
                - authors (list): Authors/creators, defaults to empty list
                
        Data Safety Features:
            - All list fields guaranteed to be lists (never None)
            - Optional fields preserved as None when not set
            - Boolean fields have reliable default values
            - Numeric fields can be None for missing data
            
        Example:
            >>> item = AnimeItem(uid="anime_1", title="Test Anime", media_type="anime")
            >>> item_dict = item.to_dict()
            >>> print(f"Genres: {item_dict['genres']}")  # []
            >>> print(f"Episodes: {item_dict['episodes']}")  # None
            
        Frontend Compatibility:
            - Lists never null, preventing JavaScript errors
            - Consistent data structure for different media types
            - All fields present for reliable object property access
            - JSON-serializable values throughout
            
        Use Cases:
            - API endpoint responses for item details
            - Search result serialization
            - Recommendation engine data preparation
            - Frontend state management
            - Database operations and caching
            - Export/import functionality
            
        Note:
            This method ensures frontend applications can safely access all
            properties without null checking for list fields. The sfw flag
            defaults to True for content filtering purposes.
        """
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
        """
        Convert UserItem instance to a dictionary representation with timestamp serialization.
        
        This method transforms the UserItem dataclass into a dictionary format suitable
        for database operations, API responses, and user list management. It handles
        datetime serialization and preserves all user-specific item data.
        
        Returns:
            Dict[str, Any]: User item representation containing:
                - id (str|None): Unique user item record identifier
                - user_id (str): UUID of the user who owns this item
                - item_uid (str): Reference to the anime/manga item
                - status (str): Current consumption status
                - progress (int): Current progress (episodes watched/chapters read)
                - rating (float|None): User's personal rating (0.0-10.0)
                - notes (str|None): User's personal notes or None
                - start_date (str|None): ISO timestamp when user started item
                - completion_date (str|None): ISO timestamp when user completed item
                - created_at (str|None): Record creation timestamp
                - updated_at (str|None): Last modification timestamp
                
        Status Values:
            - 'watching' / 'reading': Currently consuming
            - 'completed': Finished watching/reading
            - 'plan_to_watch' / 'plan_to_read': Added to future list
            - 'on_hold': Temporarily paused
            - 'dropped': Discontinued consumption
            
        Timestamp Handling:
            - All datetime objects converted to ISO format strings
            - Timezone information preserved in serialization
            - None values maintained for unset timestamps
            - Compatible with frontend date parsing libraries
            
        Example:
            >>> user_item = UserItem(user_id="123", item_uid="anime_1", status="watching")
            >>> item_dict = user_item.to_dict()
            >>> print(f"Status: {item_dict['status']}")  # watching
            >>> print(f"Progress: {item_dict['progress']}")  # 0
            
        Use Cases:
            - User list API responses
            - Database CRUD operations
            - Progress tracking and synchronization
            - Statistics calculation data source
            - Activity logging and analytics
            - User data export and backup
            
        Data Integrity:
            - Progress defaults to 0 for new items
            - Status defaults to 'plan_to_watch' for consistency
            - Timestamps preserve timezone information
            - Rating field allows None for unrated items
            
        Note:
            This method is essential for user list management operations.
            The serialized format matches database schema requirements and
            frontend expectations for user item data handling.
        """
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
    """
    Create a fully-configured User instance with realistic test data for development and testing.
    
    This factory function generates a complete User object with all required fields
    populated with sensible defaults. It's designed for unit testing, integration
    testing, and development environment seeding.
    
    Args:
        user_id (str, optional): Unique identifier for the user. Defaults to "test_user"
        email (str, optional): User's email address. Defaults to "test@example.com"
        
    Returns:
        User: Fully populated User instance with:
            - id: Provided user_id parameter
            - email: Provided email parameter
            - username: Auto-generated as "user_{user_id}"
            - created_at: Current timestamp
            - updated_at: None (new user hasn't been updated)
            - profile_data: Empty dictionary ready for customization
            
    Auto-Generated Fields:
        - username: Constructed as "user_" + user_id for consistency
        - created_at: Set to datetime.now() representing account creation
        - profile_data: Initialized as empty dict for future profile information
        
    Example:
        >>> user = create_sample_user("123", "alice@example.com")
        >>> print(user.username)  # "user_123"
        >>> print(user.created_at)  # Current timestamp
        >>> user_dict = user.to_dict()  # Ready for API usage
        
        # Custom test scenarios
        >>> admin_user = create_sample_user("admin_1", "admin@company.com")
        >>> regular_user = create_sample_user("user_456", "user456@test.com")
        
    Use Cases:
        - Unit test data generation for user-related functions
        - Integration test setup for authentication flows
        - Development environment database seeding
        - API endpoint testing with realistic user data
        - User profile feature development and testing
        - Mock data for frontend development
        
    Testing Patterns:
        - Consistent username format for test identification
        - Realistic email formats for validation testing
        - Current timestamp for created_at field testing
        - Empty profile_data ready for profile feature testing
        
    Note:
        This function creates new User instances each time it's called.
        For persistent test data, consider caching the results or using
        test fixtures. The generated users have realistic field formats
        suitable for production-like testing scenarios.
    """
    return User(
        id=user_id,
        email=email,
        username=f"user_{user_id}",
        created_at=datetime.now(),
        profile_data={}
    )


def create_sample_anime_item(uid: str = "anime_1", title: str = "Test Anime") -> AnimeItem:
    """
    Create a comprehensive AnimeItem instance with realistic anime metadata for testing and development.
    
    This factory function generates a complete AnimeItem object populated with typical
    anime characteristics including genres, production details, and metadata. Designed
    for testing recommendation algorithms, API endpoints, and frontend components.
    
    Args:
        uid (str, optional): Unique identifier for the anime item. Defaults to "anime_1"
        title (str, optional): Display title of the anime. Defaults to "Test Anime"
        
    Returns:
        AnimeItem: Fully populated anime instance with:
            - uid: Provided unique identifier
            - title: Provided anime title
            - media_type: Set to "anime"
            - score: Realistic rating of 8.5 (above-average quality)
            - genres: Common anime genres ["Action", "Adventure"]
            - synopsis: Descriptive test synopsis
            - main_picture: Sample image URL for testing
            - status: "Finished Airing" (completed series)
            - episodes: 24 episodes (standard anime season length)
            - sfw: True (safe for work content)
            - themes: ["Military"] (thematic classification)
            - demographics: ["Shounen"] (target audience)
            - studios: ["Test Studio"] (production studio)
            - authors: ["Test Author"] (creator information)
            
    Realistic Data Features:
        - Score in typical high-quality range (8.5/10)
        - Standard episode count for seasonal anime (24)
        - Popular genre combination (Action + Adventure)
        - Shounen demographic (largest anime audience)
        - Complete series status for testing completion features
        - SFW content for safe testing environments
        
    Example:
        >>> anime = create_sample_anime_item("naruto_1", "Naruto")
        >>> print(f"{anime.title}: {anime.score}/10")  # "Naruto: 8.5/10"
        >>> print(f"Episodes: {anime.episodes}")  # "Episodes: 24"
        >>> anime_dict = anime.to_dict()  # Ready for API responses
        
        # Testing different scenarios
        >>> action_anime = create_sample_anime_item("action_test", "Action Test Series")
        >>> short_anime = create_sample_anime_item("short_1", "Short Series")
        
    Use Cases:
        - Recommendation algorithm testing with realistic data
        - API endpoint testing for item details and search
        - Frontend component development with sample data
        - Database seeding for development environments
        - Unit testing for anime-specific functionality
        - Integration testing with complete item metadata
        - Performance testing with standardized data sets
        
    Testing Advantages:
        - Consistent metadata structure across test cases
        - Realistic genre and demographic combinations
        - Standard episode count for progress testing
        - Complete production information for filtering tests
        - Image URL for frontend display testing
        
    Note:
        This function creates anime-specific items. For manga testing,
        consider implementing create_sample_manga_item() with appropriate
        manga-specific fields like chapters and volumes. The generated
        anime has production-realistic metadata suitable for all testing scenarios.
    """
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
    """
    Create a realistic UserItem instance representing a user's anime/manga list entry.
    
    This factory function generates a complete UserItem object with typical user
    interaction data including progress tracking, ratings, and status management.
    Essential for testing user list functionality and progress tracking features.
    
    Args:
        user_id (str, optional): UUID of the user who owns this item. Defaults to "test_user"
        item_uid (str, optional): Reference to anime/manga item. Defaults to "anime_1"
        
    Returns:
        UserItem: Fully configured user item instance with:
            - id: Auto-generated as "{user_id}_{item_uid}" for uniqueness
            - user_id: Provided user identifier
            - item_uid: Provided item reference
            - status: "watching" (actively consuming content)
            - progress: 12 (halfway through typical 24-episode anime)
            - rating: 8.0 (positive user rating out of 10)
            - notes: None (no personal notes initially)
            - start_date: None (start date not tracked in sample)
            - completion_date: None (not completed yet)
            - created_at: Current timestamp (when added to list)
            - updated_at: None (not modified since creation)
            
    Realistic Progress Data:
        - Status "watching" indicates active consumption
        - Progress at 12 suggests user is engaged and continuing
        - Rating of 8.0 shows positive user experience
        - Created timestamp reflects when item was added to list
        
    Example:
        >>> user_item = create_sample_user_item("user123", "anime_5")
        >>> print(f"Progress: {user_item.progress} episodes")  # "Progress: 12 episodes"
        >>> print(f"Rating: {user_item.rating}/10")  # "Rating: 8.0/10"
        >>> item_dict = user_item.to_dict()  # Ready for database operations
        
        # Testing different user scenarios
        >>> completed_item = create_sample_user_item("user456", "completed_anime")
        >>> new_item = create_sample_user_item("newuser", "plan_to_watch_item")
        
    Use Cases:
        - User list management testing (add, update, remove operations)
        - Progress tracking feature development and testing
        - Statistics calculation testing with realistic user data
        - API endpoint testing for user item CRUD operations
        - Dashboard component testing with user progress data
        - Recommendation testing with user interaction history
        - Database relationship testing between users and items
        
    Status Simulation Patterns:
        - "watching" status for active engagement testing
        - Partial progress for tracking feature validation
        - Positive rating for recommendation algorithm testing
        - Current timestamp for recent activity simulation
        
    Testing Advantages:
        - Realistic progress values for calculation testing
        - Positive rating for recommendation quality testing
        - Active status for engagement metric testing
        - Auto-generated ID for relationship testing
        - Current timestamp for activity tracking testing
        
    Note:
        This function creates user items in "watching" status with partial
        progress. For testing different scenarios, modify the returned object
        or create multiple instances with varying status and progress values.
        The composite ID format ensures uniqueness in test databases.
    """
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
