# ABOUTME: Authentication middleware for Flask routes
# ABOUTME: Provides JWT token verification decorator for protected endpoints
"""
Authentication Middleware for AniManga Recommender

This module provides authentication decorators and utilities for protecting
API endpoints with JWT token verification.

Key Features:
    - JWT token verification decorator
    - Bearer token extraction from headers
    - User context injection via Flask g object
    - Graceful error handling
"""

import os
from functools import wraps
from typing import Optional, Dict, Any
from flask import request, jsonify, g
import jwt
from supabase_client import SupabaseClient


def extract_bearer_token(auth_header: str) -> Optional[str]:
    """
    Extract JWT token from Authorization header.
    
    Args:
        auth_header: Authorization header value
        
    Returns:
        Token string if valid Bearer format, None otherwise
    """
    if not auth_header:
        return None
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    
    return parts[1]


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode JWT token using Supabase Auth.
    
    Args:
        token: JWT token string to verify
        
    Returns:
        User information if valid, None if invalid
    """
    try:
        # Initialize Supabase auth client
        auth_client = SupabaseClient()
        
        if hasattr(auth_client.client.auth, 'get_user'):
            # Use Supabase auth to verify
            response = auth_client.client.auth.get_user(token)
            if response and response.user:
                return {
                    'user_id': response.user.id,
                    'sub': response.user.id,
                    'email': response.user.email,
                    'user_metadata': response.user.user_metadata
                }
        else:
            # Fallback to local JWT verification
            secret_key = os.getenv('JWT_SECRET_KEY', 'test-jwt-secret')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            # Map 'sub' to 'user_id' for consistency
            if 'sub' in payload and 'user_id' not in payload:
                payload['user_id'] = payload['sub']
            
            return payload
            
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None


def token_required(f):
    """
    Decorator to require valid JWT token for endpoint access.
    
    Extracts JWT token from Authorization header, verifies it,
    and injects user information into Flask g object.
    
    Usage:
        @app.route('/protected')
        @token_required
        def protected_route():
            user_id = g.current_user['user_id']
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get Authorization header
        auth_header = request.headers.get('Authorization')
        
        # Extract token
        token = extract_bearer_token(auth_header)
        if not token:
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        # Verify token
        user_info = verify_token(token)
        if not user_info:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Store user info in g object
        g.current_user = user_info
        
        return f(*args, **kwargs)
    
    return decorated_function


def optional_token(f):
    """
    Decorator to optionally verify JWT token if present.
    
    Similar to token_required but doesn't fail if token is missing.
    Sets g.current_user to None if no valid token.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Initialize g.current_user as None
        g.current_user = None
        
        # Get Authorization header
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            # Extract and verify token if present
            token = extract_bearer_token(auth_header)
            if token:
                user_info = verify_token(token)
                if user_info:
                    g.current_user = user_info
        
        return f(*args, **kwargs)
    
    return decorated_function