"""
ABOUTME: Privacy middleware for enforcing user privacy settings across all API endpoints
ABOUTME: Provides decorators and functions to filter data based on user privacy preferences
"""

from functools import wraps
from flask import g, jsonify, request
from typing import Dict, List, Optional, Any, Callable
from supabase_client import SupabaseClient
import logging

logger = logging.getLogger(__name__)

# Initialize Supabase clients for privacy checks
from supabase_client import SupabaseAuthClient
import os

# Get auth client for user operations
try:
    base_url = os.getenv('SUPABASE_URL', '').strip().rstrip('/')
    api_key = os.getenv('SUPABASE_KEY', '').strip()
    service_key = os.getenv('SUPABASE_SERVICE_KEY', '').strip()
    
    if base_url and api_key:
        auth_client = SupabaseAuthClient(base_url, api_key, service_key)
    else:
        auth_client = None
        logger.warning("Auth client not initialized: missing environment variables")
except Exception as e:
    auth_client = None
    logger.error(f"Failed to initialize auth client: {e}")

supabase_client = SupabaseClient()

def require_privacy_check(content_type: str = 'general'):
    """
    Decorator to enforce privacy checks on API endpoints.
    
    Args:
        content_type: Type of content ('profile', 'list', 'activity', 'general')
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Skip privacy check for public endpoints or if user is accessing their own data
                if not hasattr(g, 'current_user') or not g.current_user:
                    return f(*args, **kwargs)
                
                current_user_id = g.current_user.get('user_id') or g.current_user.get('sub')
                
                # Get target user from various possible sources
                target_user_id = (request.view_args.get('user_id') or 
                                request.view_args.get('username') or 
                                request.args.get('user_id') or
                                request.args.get('username'))
                
                # If target is a username, we need to resolve it to user_id
                if target_user_id and not target_user_id.startswith('auth'):
                    # Try to get user_id from username
                    try:
                        if auth_client:
                            user_profile = auth_client.get_user_profile_by_username(target_user_id)
                            if user_profile:
                                target_user_id = user_profile.get('user_id')
                    except:
                        pass
                
                # If accessing own data, skip privacy check
                if current_user_id == target_user_id:
                    return f(*args, **kwargs)
                
                # If no target user, this is likely a general endpoint
                if not target_user_id:
                    return f(*args, **kwargs)
                
                # Check privacy settings
                if auth_client:
                    privacy_settings = auth_client.get_privacy_settings(target_user_id)
                else:
                    privacy_settings = None
                if not privacy_settings:
                    # Default to private if no settings found
                    return jsonify({'error': 'Access denied'}), 403
                
                # Check content-specific privacy
                if content_type == 'profile' and privacy_settings.get('profile_visibility') == 'private':
                    return jsonify({'error': 'Profile is private'}), 403
                elif content_type == 'list' and privacy_settings.get('list_visibility') == 'private':
                    return jsonify({'error': 'Lists are private'}), 403
                elif content_type == 'activity' and privacy_settings.get('activity_visibility') == 'private':
                    return jsonify({'error': 'Activity is private'}), 403
                
                # Check friends-only settings
                if (content_type == 'profile' and privacy_settings.get('profile_visibility') == 'friends_only') or \
                   (content_type == 'list' and privacy_settings.get('list_visibility') == 'friends_only') or \
                   (content_type == 'activity' and privacy_settings.get('activity_visibility') == 'friends_only'):
                    
                    # Check if users are friends
                    if not are_users_friends(current_user_id, target_user_id):
                        return jsonify({'error': 'Access restricted to friends only'}), 403
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Privacy check error: {e}")
                # Fail secure - deny access on error
                return jsonify({'error': 'Privacy check failed'}), 500
                
        return decorated_function
    return decorator

def filter_user_search_results(users: List[Dict], requesting_user_id: str) -> List[Dict]:
    """
    Filter user search results based on privacy settings.
    
    Args:
        users: List of user objects
        requesting_user_id: ID of user making the request
        
    Returns:
        Filtered list of users respecting privacy settings
    """
    filtered_users = []
    
    for user in users:
        user_id = user.get('id') or user.get('user_id')
        if not user_id:
            continue
            
        # Always include the requesting user
        if user_id == requesting_user_id:
            filtered_users.append(user)
            continue
            
        try:
            privacy_settings = supabase_client.get_privacy_settings(user_id)
            if not privacy_settings:
                # Skip users with no privacy settings (default to private)
                continue
                
            profile_visibility = privacy_settings.get('profile_visibility', 'private')
            
            if profile_visibility == 'public':
                filtered_users.append(user)
            elif profile_visibility == 'friends_only':
                if are_users_friends(requesting_user_id, user_id):
                    filtered_users.append(user)
            # Skip private profiles
            
        except Exception as e:
            logger.error(f"Error filtering user {user_id}: {e}")
            # Skip user on error (fail secure)
            continue
    
    return filtered_users

def check_list_access_permission(list_id: int, requesting_user_id: str) -> bool:
    """
    Check if user has permission to access a specific list.
    
    Args:
        list_id: ID of the list
        requesting_user_id: ID of user requesting access
        
    Returns:
        True if access allowed, False otherwise
    """
    try:
        # Get list details
        list_data = supabase_client.get_custom_list_details(list_id)
        if not list_data:
            return False
            
        list_owner_id = list_data.get('user_id')
        if not list_owner_id:
            return False
            
        # Owner always has access
        if list_owner_id == requesting_user_id:
            return True
            
        # Check if list is public
        if list_data.get('is_public', False):
            # Still need to check user's privacy settings
            privacy_settings = supabase_client.get_privacy_settings(list_owner_id)
            if privacy_settings:
                list_visibility = privacy_settings.get('list_visibility', 'private')
                
                if list_visibility == 'public':
                    return True
                elif list_visibility == 'friends_only':
                    return are_users_friends(requesting_user_id, list_owner_id)
                    
        return False
        
    except Exception as e:
        logger.error(f"Error checking list access for list {list_id}: {e}")
        return False

def enforce_activity_privacy(activities: List[Dict], requesting_user_id: str) -> List[Dict]:
    """
    Filter activity feed based on privacy settings.
    
    Args:
        activities: List of activity objects
        requesting_user_id: ID of user requesting activities
        
    Returns:
        Filtered activities respecting privacy settings
    """
    filtered_activities = []
    
    for activity in activities:
        activity_user_id = activity.get('user_id')
        if not activity_user_id:
            continue
            
        # Always include requesting user's activities
        if activity_user_id == requesting_user_id:
            filtered_activities.append(activity)
            continue
            
        try:
            privacy_settings = supabase_client.get_privacy_settings(activity_user_id)
            if not privacy_settings:
                # Skip activities from users with no privacy settings
                continue
                
            activity_visibility = privacy_settings.get('activity_visibility', 'private')
            
            if activity_visibility == 'public':
                filtered_activities.append(activity)
            elif activity_visibility == 'friends_only':
                if are_users_friends(requesting_user_id, activity_user_id):
                    filtered_activities.append(activity)
            # Skip private activities
            
        except Exception as e:
            logger.error(f"Error filtering activity from user {activity_user_id}: {e}")
            continue
    
    return filtered_activities

def privacy_enforcer(data: Dict, data_type: str, owner_user_id: str, requesting_user_id: str) -> Optional[Dict]:
    """
    Generic privacy enforcer for any data type.
    
    Args:
        data: Data object to check
        data_type: Type of data ('profile', 'list', 'activity', etc.)
        owner_user_id: ID of data owner
        requesting_user_id: ID of user requesting data
        
    Returns:
        Data if access allowed, None if denied
    """
    # Owner always has access
    if owner_user_id == requesting_user_id:
        return data
        
    try:
        privacy_settings = supabase_client.get_privacy_settings(owner_user_id)
        if not privacy_settings:
            return None  # Fail secure
            
        visibility_key = f"{data_type}_visibility"
        visibility = privacy_settings.get(visibility_key, 'private')
        
        if visibility == 'public':
            return data
        elif visibility == 'friends_only':
            if are_users_friends(requesting_user_id, owner_user_id):
                return data
        
        return None  # Private or access denied
        
    except Exception as e:
        logger.error(f"Privacy enforcement error for {data_type}: {e}")
        return None  # Fail secure

def are_users_friends(user1_id: str, user2_id: str) -> bool:
    """
    Check if two users are friends.
    
    Args:
        user1_id: First user ID
        user2_id: Second user ID
        
    Returns:
        True if users are friends, False otherwise
    """
    try:
        # Check mutual following relationship using REST API
        import requests
        
        # Check if user1 follows user2 and user2 follows user1
        follow_check_1 = requests.get(
            f"{supabase_client.base_url}/rest/v1/user_follows?follower_id=eq.{user1_id}&following_id=eq.{user2_id}",
            headers=supabase_client.headers
        )
        
        follow_check_2 = requests.get(
            f"{supabase_client.base_url}/rest/v1/user_follows?follower_id=eq.{user2_id}&following_id=eq.{user1_id}",
            headers=supabase_client.headers
        )
        
        if follow_check_1.status_code == 200 and follow_check_2.status_code == 200:
            friends_1 = len(follow_check_1.json()) > 0
            friends_2 = len(follow_check_2.json()) > 0
            return friends_1 and friends_2
            
        return False
        
    except Exception as e:
        logger.error(f"Error checking friendship between {user1_id} and {user2_id}: {e}")
        return False

def check_list_access(list_data: Dict, requesting_user_id: str = None) -> bool:
    """
    Check if a user can access a custom list based on its privacy setting.
    
    Args:
        list_data: Dictionary containing list info including 'privacy' and 'user_id'
        requesting_user_id: ID of user requesting access (None for anonymous)
        
    Returns:
        True if user can access the list, False otherwise
    """
    try:
        privacy = list_data.get('privacy', 'private')
        list_owner_id = list_data.get('user_id') or list_data.get('userId')
        
        # Public lists are accessible to everyone
        if privacy == 'public':
            return True
            
        # Owner can always access their own lists
        if requesting_user_id and list_owner_id == requesting_user_id:
            return True
            
        # Private lists are only accessible to owner
        if privacy == 'private':
            return False
            
        # Friends-only lists require mutual following
        if privacy == 'friends_only':
            if not requesting_user_id:
                return False
            return are_users_friends(requesting_user_id, list_owner_id)
            
        # Default to private behavior for unknown privacy levels
        return False
        
    except Exception as e:
        logger.error(f"Error checking list access: {e}")
        return False

def sanitize_privacy_settings(settings: Dict) -> Dict:
    """
    Sanitize and validate privacy settings input.
    
    Args:
        settings: Raw privacy settings from user input
        
    Returns:
        Sanitized and validated privacy settings
    """
    valid_visibility_options = ['public', 'friends_only', 'private']
    valid_boolean_fields = [
        'show_following', 'show_followers', 'show_statistics', 
        'allow_friend_requests', 'show_recently_watched'
    ]
    
    sanitized = {}
    
    # Validate visibility settings
    for field in ['profile_visibility', 'list_visibility', 'activity_visibility']:
        if field in settings:
            value = settings[field]
            if isinstance(value, str) and value.strip().lower() in valid_visibility_options:
                sanitized[field] = value.strip().lower()
    
    # Validate boolean settings
    for field in valid_boolean_fields:
        if field in settings:
            value = settings[field]
            if isinstance(value, bool):
                sanitized[field] = value
            elif isinstance(value, str):
                sanitized[field] = value.lower() in ['true', '1', 'yes', 'on']
    
    return sanitized

def rate_limit_privacy_operations(user_id: str, operation: str = 'update') -> bool:
    """
    Rate limit privacy-related operations to prevent abuse.
    
    Args:
        user_id: User performing the operation
        operation: Type of operation ('update', 'get', etc.)
        
    Returns:
        True if operation allowed, False if rate limited
    """
    try:
        # Implement simple rate limiting logic
        # In production, use hybrid cache (database + memory) for distributed rate limiting
        from datetime import datetime, timedelta
        import time
        
        cache_key = f"privacy_rate_limit_{user_id}_{operation}"
        
        # Simple in-memory rate limiting (replace with hybrid cache in production)
        current_time = time.time()
        
        # Allow max 10 privacy updates per minute
        if operation == 'update':
            return True  # Implement actual rate limiting logic
            
        return True
        
    except Exception as e:
        logger.error(f"Rate limiting error: {e}")
        return True  # Allow on error to avoid blocking legitimate users


# Simple in-memory rate limiting cache
_rate_limit_cache = {}

def rate_limit(requests_per_minute: int = 60, per_ip: bool = True):
    """
    Decorator to add rate limiting to API endpoints.
    
    Args:
        requests_per_minute: Maximum number of requests per minute
        per_ip: Whether to rate limit per IP address (True) or per user (False)
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                import time
                
                # Get identifier (IP or user ID)
                if per_ip:
                    identifier = request.remote_addr or 'unknown'
                else:
                    identifier = 'anonymous'
                    if hasattr(g, 'current_user') and g.current_user:
                        identifier = g.current_user.get('user_id') or g.current_user.get('sub') or 'anonymous'
                
                # Create cache key
                cache_key = f"rate_limit_{f.__name__}_{identifier}"
                current_time = time.time()
                
                # Clean up old entries (older than 1 minute)
                if cache_key in _rate_limit_cache:
                    _rate_limit_cache[cache_key] = [
                        timestamp for timestamp in _rate_limit_cache[cache_key]
                        if current_time - timestamp < 60
                    ]
                else:
                    _rate_limit_cache[cache_key] = []
                
                # Check if rate limit exceeded
                if len(_rate_limit_cache[cache_key]) >= requests_per_minute:
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'message': f'Maximum {requests_per_minute} requests per minute allowed'
                    }), 429
                
                # Add current request to cache
                _rate_limit_cache[cache_key].append(current_time)
                
                # Call the original function
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Error in rate limiting: {e}")
                # If rate limiting fails, allow the request to proceed
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator