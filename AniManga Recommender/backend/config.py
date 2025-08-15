"""
AniManga Recommender Configuration Module

This module provides centralized configuration management for the AniManga Recommender
Flask application. It handles environment variable loading, database configuration,
and integration with external services like Supabase.

Key Features:
    - Environment variable management with secure defaults
    - Database connection configuration (SQLAlchemy compatibility)
    - Supabase service integration settings
    - Development and production environment support
    - Configuration validation and error handling

Environment Variables Required:
    - DATABASE_URL: PostgreSQL database connection string (optional for Supabase-only mode)
    - SUPABASE_URL: Base URL for Supabase project (required)
    - SUPABASE_KEY: Public API key for Supabase authentication (required)
    - SUPABASE_SERVICE_KEY: Service role key for enhanced permissions (optional)

Usage:
    The Config class is designed to be used with Flask's configuration system:
    
    >>> from config import Config
    >>> app.config.from_object(Config)
    >>> supabase_url = app.config['SUPABASE_URL']

Security Considerations:
    - Environment variables should be loaded from secure .env files
    - SUPABASE_SERVICE_KEY should be treated as highly sensitive
    - DATABASE_URL may contain credentials and should be secured
    - Never commit actual environment values to version control

Author: AniManga Recommender Team
Version: 1.0.0
License: MIT
"""

import os
from dotenv import load_dotenv

# Load environment variables based on environment
if os.getenv('LOCAL_DEVELOPMENT') == 'True':
    load_dotenv('.env.local')
    print("Loading LOCAL development environment variables")
else:
    load_dotenv()
    print("Loading PRODUCTION environment variables")

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

class Config:
    """
    Configuration class for AniManga Recommender Flask application.
    
    This class centralizes all configuration settings for the application,
    including database connections, external service integration, and
    Flask-specific settings. It automatically loads values from environment
    variables with appropriate fallbacks and validation.
    
    Configuration Categories:
        - Database: SQLAlchemy database configuration
        - Supabase: External database and authentication service
        - Flask: Framework-specific settings
        - Development: Development and debugging options
    
    Attributes:
        SQLALCHEMY_DATABASE_URI (str): PostgreSQL connection string for SQLAlchemy.
            Used for legacy database operations or direct SQL queries.
            Loaded from DATABASE_URL environment variable.
            
        SQLALCHEMY_TRACK_MODIFICATIONS (bool): SQLAlchemy modification tracking.
            Set to False to disable event notifications and improve performance.
            Recommended setting for production applications.
            
        SUPABASE_URL (str): Base URL for Supabase project instance.
            Required for all Supabase API operations including authentication,
            database queries, and real-time subscriptions.
            Format: https://your-project.supabase.co
            
        SUPABASE_KEY (str): Public API key for Supabase project.
            Used for client-side authentication and public API access.
            Safe to expose in frontend applications but should be secured.
    
    Environment Variable Mapping:
        - DATABASE_URL → SQLALCHEMY_DATABASE_URI
        - SUPABASE_URL → SUPABASE_URL  
        - SUPABASE_KEY → SUPABASE_KEY
    
    Example Configuration:
        .env file should contain:
        ```
        DATABASE_URL=postgresql://user:password@localhost/animanga_db
        SUPABASE_URL=https://your-project.supabase.co
        SUPABASE_KEY=your_public_key_here
        SUPABASE_SERVICE_KEY=your_service_key_here
        ```
    
    Usage Examples:
        >>> config = Config()
        >>> database_url = config.SQLALCHEMY_DATABASE_URI
        >>> supabase_url = config.SUPABASE_URL
        
        With Flask:
        >>> app = Flask(__name__)
        >>> app.config.from_object(Config)
        >>> db_uri = app.config['SQLALCHEMY_DATABASE_URI']
    
    Error Handling:
        The configuration class handles missing environment variables gracefully:
        - Missing DATABASE_URL results in None (Supabase-only mode)
        - Missing SUPABASE_URL/SUPABASE_KEY should be validated at runtime
        - Application should validate required settings before starting
    
    Security Notes:
        - All environment variables should be loaded from secure .env files
        - .env files should never be committed to version control
        - Use different .env files for development, staging, and production
        - Service keys should be restricted to backend-only operations
    
    See Also:
        - Flask Configuration Documentation: https://flask.palletsprojects.com/config/
        - Supabase Python Client: https://github.com/supabase/supabase-py
        - SQLAlchemy Configuration: https://docs.sqlalchemy.org/
    """
    
    # Database Configuration
    # PostgreSQL connection string for SQLAlchemy ORM operations
    # Used for complex queries, migrations, or legacy database features
    # Set to None if using Supabase exclusively for database operations
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    
    # Disable SQLAlchemy modification tracking for performance
    # This setting prevents SQLAlchemy from tracking object modifications
    # and sending signals, which improves performance in production
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Supabase Configuration
    # Base URL for Supabase project - required for all API operations
    # Should include full HTTPS URL with project subdomain
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    
    # Public API key for Supabase authentication and client operations
    # Safe for frontend use but should be secured in production
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    # MAL API Configuration
    MAL_CLIENT_ID = os.getenv('MAL_CLIENT_ID')
    MAL_CLIENT_SECRET = os.getenv('MAL_CLIENT_SECRET')
    
    # Development flags
    LOCAL_DEVELOPMENT = os.getenv('LOCAL_DEVELOPMENT', 'False').lower() == 'true'
    USE_LOCAL_SUPABASE = os.getenv('USE_LOCAL_SUPABASE', 'False').lower() == 'true'
    
    @classmethod
    def is_local_development(cls):
        return cls.LOCAL_DEVELOPMENT and cls.USE_LOCAL_SUPABASE
    
    @classmethod
    def get_environment_info(cls):
        """Get current environment information"""
        if cls.is_local_development():
            return {
                'environment': 'LOCAL',
                'supabase_url': cls.SUPABASE_URL,
                'database_type': 'Local PostgreSQL',
                'mal_configured': bool(cls.MAL_CLIENT_ID),
            }
        else:
            return {
                'environment': 'PRODUCTION',
                'supabase_url': cls.SUPABASE_URL,
                'database_type': 'Supabase Cloud',
                'mal_configured': bool(cls.MAL_CLIENT_ID),
            }