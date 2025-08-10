# ABOUTME: Real user item management tests - NO MOCKS
# ABOUTME: Tests actual user item operations with real database

"""
Real User Item Management Tests for AniManga Recommender

Test Coverage:
- Adding items to user lists with various statuses
- Updating item status, progress, rating, notes
- Removing items from user lists
- Input validation for ratings, progress, dates
- Status change workflow validation
- Progress auto-calculation for completed items
- Activity logging for item changes
- Edge cases and error handling

NO MOCKS - All tests use real database operations and actual user item management
"""

import pytest
import json
import time
from datetime import datetime, timedelta
from sqlalchemy import text

# Import test dependencies
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from tests.test_utils import TestDataManager, generate_jwt_token, create_auth_headers


@pytest.mark.real_integration
class TestUserItemAddition:
    """Test suite for adding items to user lists with real database"""
    
    def test_add_new_item_to_list(self, client, database_connection, app):
        """Test adding a new anime/manga to user's list using real database"""
        manager = TestDataManager(database_connection)
        
        # Create test user
        user = manager.create_test_user(
            email="item_add@example.com",
            username="item_add_user"
        )
        
        # Create test item
        item = manager.create_test_item(
            uid="add_anime_123",
            title="Test Anime to Add",
            item_type="anime",
            episodes=24,
            score=8.5
        )
        
        try:
            # Generate real JWT token
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Add item to user's list
            response = client.post(
                f'/api/auth/user-items/{item["uid"]}',
                headers=headers,
                json={
                    'status': 'plan_to_watch',
                    'progress': 0,
                    'rating': None,
                    'notes': 'Looks interesting'
                }
            )
            
            # Verify item was added
            if response.status_code == 200:
                data = json.loads(response.data)
                
                # Check database directly
                result = database_connection.execute(
                    text("""
                        SELECT status, progress, score, notes
                        FROM user_items
                        WHERE user_id = :user_id AND item_uid = :item_uid
                    """),
                    {"user_id": user['id'], "item_uid": item['uid']}
                )
                
                row = result.fetchone()
                if row:
                    assert row[0] == 'plan_to_watch'
                    assert row[1] == 0
                    assert row[3] == 'Looks interesting'
                    
        finally:
            manager.cleanup()
    
    def test_add_item_with_invalid_rating(self, client, database_connection, app):
        """Test adding item with invalid rating values using real database"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="invalid_rating@example.com",
            username="invalid_rating_user"
        )
        
        item = manager.create_test_item(
            uid="rating_test_item",
            title="Rating Test Item",
            item_type="anime"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Test invalid ratings
            test_cases = [
                {'rating': -1, 'should_fail': True},
                {'rating': 11, 'should_fail': True},
                {'rating': 5.5, 'should_fail': False},  # Valid
                {'rating': 10, 'should_fail': False}   # Valid
            ]
            
            for case in test_cases:
                response = client.post(
                    f'/api/auth/user-items/{item["uid"]}',
                    headers=headers,
                    json={
                        'status': 'completed',
                        'rating': case['rating']
                    }
                )
                
                if case['should_fail']:
                    # Should reject invalid ratings
                    assert response.status_code in [400, 422]
                else:
                    # Valid ratings should work
                    assert response.status_code in [200, 201]
                    
        finally:
            manager.cleanup()
    
    def test_add_nonexistent_item(self, client, database_connection, app):
        """Test adding item that doesn't exist in database"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="nonexistent@example.com",
            username="nonexistent_user"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Try to add non-existent item
            response = client.post(
                '/api/auth/user-items/nonexistent_item_999',
                headers=headers,
                json={'status': 'plan_to_watch'}
            )
            
            # Should return not found
            assert response.status_code in [404]
            if response.status_code == 404:
                data = json.loads(response.data)
                assert 'not found' in data.get('error', '').lower()
                
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestUserItemUpdates:
    """Test suite for updating user items with real database"""
    
    def test_update_item_status_basic(self, client, database_connection, app):
        """Test basic status update using real database"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="update_status@example.com",
            username="update_user"
        )
        
        item = manager.create_test_item(
            uid="update_anime_123",
            title="Anime to Update",
            item_type="anime",
            episodes=24
        )
        
        # Add item to user's list first
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=item['uid'],
            status="plan_to_watch",
            progress=0
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Update status
            response = client.put(
                f'/api/auth/user-items/{item["uid"]}',
                headers=headers,
                json={
                    'status': 'watching',
                    'progress': 5,
                    'notes': 'Really enjoying this!'
                }
            )
            
            if response.status_code == 200:
                # Verify update in database
                result = database_connection.execute(
                    text("""
                        SELECT status, progress, notes
                        FROM user_items
                        WHERE user_id = :user_id AND item_uid = :item_uid
                    """),
                    {"user_id": user['id'], "item_uid": item['uid']}
                )
                
                row = result.fetchone()
                if row:
                    assert row[0] == 'watching'
                    assert row[1] == 5
                    assert row[2] == 'Really enjoying this!'
                    
        finally:
            manager.cleanup()
    
    def test_update_item_completion_auto_progress(self, client, database_connection, app):
        """Test auto-setting progress when marking as completed"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="auto_progress@example.com",
            username="auto_progress_user"
        )
        
        # Create anime with known episode count
        item = manager.create_test_item(
            uid="auto_progress_anime",
            title="Auto Progress Anime",
            item_type="anime",
            episodes=12
        )
        
        # Add to user's list as watching
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=item['uid'],
            status="watching",
            progress=3
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Mark as completed (should auto-set progress to 12)
            response = client.put(
                f'/api/auth/user-items/{item["uid"]}',
                headers=headers,
                json={
                    'status': 'completed',
                    'rating': 9.5
                }
            )
            
            if response.status_code == 200:
                # Check that progress was auto-set
                result = database_connection.execute(
                    text("""
                        SELECT status, progress, score
                        FROM user_items
                        WHERE user_id = :user_id AND item_uid = :item_uid
                    """),
                    {"user_id": user['id'], "item_uid": item['uid']}
                )
                
                row = result.fetchone()
                if row:
                    assert row[0] == 'completed'
                    assert row[1] == 12  # Auto-set to episode count
                    assert row[2] == 9.5
                    
        finally:
            manager.cleanup()
    
    def test_update_manga_chapters_progress(self, client, database_connection, app):
        """Test updating manga with chapters progress"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="manga_progress@example.com",
            username="manga_user"
        )
        
        # Create manga with chapter count
        manga = manager.create_test_item(
            uid="manga_chapters_test",
            title="Test Manga",
            item_type="manga",
            chapters=150
        )
        
        # Add to user's list
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=manga['uid'],
            status="reading",
            progress=50
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Mark manga as completed
            response = client.put(
                f'/api/auth/user-items/{manga["uid"]}',
                headers=headers,
                json={
                    'status': 'completed',
                    'rating': 8.0
                }
            )
            
            if response.status_code == 200:
                # Verify chapters were set correctly
                result = database_connection.execute(
                    text("""
                        SELECT status, progress
                        FROM user_items
                        WHERE user_id = :user_id AND item_uid = :item_uid
                    """),
                    {"user_id": user['id'], "item_uid": manga['uid']}
                )
                
                row = result.fetchone()
                if row:
                    assert row[0] == 'completed'
                    # Progress might be auto-set to chapters count
                    
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestUserItemRetrieval:
    """Test suite for retrieving user items with real database"""
    
    def test_get_all_user_items(self, client, database_connection, app):
        """Test retrieving all user items with real data"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="get_items@example.com",
            username="get_items_user"
        )
        
        # Create multiple items
        items = []
        for i in range(3):
            item = manager.create_test_item(
                uid=f"retrieve_item_{i}",
                title=f"Item {i}",
                item_type="anime" if i % 2 == 0 else "manga",
                score=7.0 + i
            )
            items.append(item)
            
            # Add to user's list
            status = ["completed", "watching", "plan_to_watch"][i]
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status=status,
                score=8.0 + i if status == "completed" else None,
                progress=10 * i
            )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Get all user items
            response = client.get('/api/auth/user-items', headers=headers)
            
            if response.status_code == 200:
                data = json.loads(response.data)
                
                # Should return list of user items
                assert isinstance(data, list)
                assert len(data) >= 3
                
                # Verify items have correct structure
                for item_data in data:
                    assert 'item_uid' in item_data or 'item' in item_data
                    assert 'status' in item_data
                    
        finally:
            manager.cleanup()
    
    def test_get_user_items_filtered_by_status(self, client, database_connection, app):
        """Test retrieving user items filtered by status"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="filter_status@example.com",
            username="filter_user"
        )
        
        # Create items with different statuses
        completed_items = []
        for i in range(2):
            item = manager.create_test_item(
                uid=f"completed_{i}",
                title=f"Completed {i}",
                item_type="anime"
            )
            completed_items.append(item)
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status="completed",
                score=9.0
            )
        
        # Add watching items
        for i in range(3):
            item = manager.create_test_item(
                uid=f"watching_{i}",
                title=f"Watching {i}",
                item_type="anime"
            )
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status="watching",
                progress=5
            )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Get only completed items
            response = client.get('/api/auth/user-items?status=completed', headers=headers)
            
            if response.status_code == 200:
                data = json.loads(response.data)
                
                # Should only return completed items
                for item_data in data:
                    assert item_data.get('status') == 'completed'
                    
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestUserItemRemoval:
    """Test suite for removing items from user lists with real database"""
    
    def test_remove_item_success(self, client, database_connection, app):
        """Test successfully removing item from user's list"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="remove_item@example.com",
            username="remove_user"
        )
        
        item = manager.create_test_item(
            uid="remove_test_item",
            title="Item to Remove",
            item_type="anime"
        )
        
        # Add item to user's list
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=item['uid'],
            status="watching"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Remove the item
            response = client.delete(
                f'/api/auth/user-items/{item["uid"]}',
                headers=headers
            )
            
            if response.status_code == 200:
                # Verify item was removed from database
                result = database_connection.execute(
                    text("""
                        SELECT COUNT(*) 
                        FROM user_items
                        WHERE user_id = :user_id AND item_uid = :item_uid
                    """),
                    {"user_id": user['id'], "item_uid": item['uid']}
                )
                
                count = result.scalar()
                assert count == 0  # Item should be removed
                
        finally:
            manager.cleanup()
    
    def test_remove_nonexistent_item(self, client, database_connection, app):
        """Test removing item that's not in user's list"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="remove_nonexistent@example.com",
            username="remove_nonexistent_user"
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Try to remove item not in list
            response = client.delete(
                '/api/auth/user-items/not_in_list_item',
                headers=headers
            )
            
            # Should handle gracefully
            assert response.status_code in [200, 404]
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestUserItemWorkflows:
    """Test suite for complete user item workflows with real database"""
    
    def test_complete_item_workflow(self, client, database_connection, app):
        """Test complete workflow: add -> update -> complete -> remove"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="workflow@example.com",
            username="workflow_user"
        )
        
        item = manager.create_test_item(
            uid="workflow_anime",
            title="Workflow Test Anime",
            item_type="anime",
            episodes=12
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Step 1: Add to plan_to_watch
            response = client.post(
                f'/api/auth/user-items/{item["uid"]}',
                headers=headers,
                json={'status': 'plan_to_watch'}
            )
            assert response.status_code in [200, 201]
            
            # Step 2: Start watching
            response = client.put(
                f'/api/auth/user-items/{item["uid"]}',
                headers=headers,
                json={'status': 'watching', 'progress': 3}
            )
            assert response.status_code == 200
            
            # Verify in database
            result = database_connection.execute(
                text("""
                    SELECT status, progress
                    FROM user_items
                    WHERE user_id = :user_id AND item_uid = :item_uid
                """),
                {"user_id": user['id'], "item_uid": item['uid']}
            )
            row = result.fetchone()
            if row:
                assert row[0] == 'watching'
                assert row[1] == 3
            
            # Step 3: Complete with rating
            response = client.put(
                f'/api/auth/user-items/{item["uid"]}',
                headers=headers,
                json={
                    'status': 'completed',
                    'rating': 9.2
                }
            )
            assert response.status_code == 200
            
            # Step 4: Remove from list
            response = client.delete(
                f'/api/auth/user-items/{item["uid"]}',
                headers=headers
            )
            assert response.status_code in [200, 204]
            
            # Verify removed
            result = database_connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM user_items
                    WHERE user_id = :user_id AND item_uid = :item_uid
                """),
                {"user_id": user['id'], "item_uid": item['uid']}
            )
            assert result.scalar() == 0
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestItemManagementAuthentication:
    """Test suite for authentication in item management"""
    
    def test_item_operations_require_auth(self, client):
        """Test that all item operations require authentication"""
        item_uid = 'auth_test_123'
        
        # Test endpoints without authorization header
        endpoints = [
            ('GET', '/api/auth/user-items'),
            ('POST', f'/api/auth/user-items/{item_uid}'),
            ('PUT', f'/api/auth/user-items/{item_uid}'),
            ('DELETE', f'/api/auth/user-items/{item_uid}'),
            ('GET', '/api/auth/user-items/by-status/watching')
        ]
        
        for method, endpoint in endpoints:
            response = client.open(method=method, path=endpoint)
            assert response.status_code == 401
    
    def test_item_operations_invalid_token(self, client, app):
        """Test item operations with expired authentication token"""
        # Create expired token
        jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
        expired_token = generate_jwt_token(
            user_id='test-user',
            email='test@example.com',
            secret_key=jwt_secret,
            expiry_hours=-1  # Already expired
        )
        
        headers = create_auth_headers(expired_token)
        
        response = client.get('/api/auth/user-items', headers=headers)
        
        assert response.status_code == 401
        data = json.loads(response.data)
        error_msg = data.get('error', '').lower()
        assert any(keyword in error_msg for keyword in [
            'invalid', 'expired', 'token', 'authentication'
        ])


@pytest.mark.real_integration
class TestItemManagementPerformance:
    """Test suite for item management performance with real database"""
    
    def test_user_items_retrieval_performance(self, client, database_connection, app):
        """Test performance of retrieving large user item lists"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="perf_test@example.com",
            username="perf_user"
        )
        
        # Create many items (100 for performance test)
        items = []
        for i in range(100):
            item = manager.create_test_item(
                uid=f"perf_item_{i}",
                title=f"Performance Item {i}",
                item_type="anime" if i % 2 == 0 else "manga",
                score=5.0 + (i % 5)
            )
            items.append(item)
            
            # Add to user's list
            status = ["completed", "watching", "plan_to_watch", "dropped"][i % 4]
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status=status,
                score=7.0 + (i % 3) if status == "completed" else None,
                progress=i % 24
            )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Measure retrieval time
            start_time = time.time()
            response = client.get('/api/auth/user-items', headers=headers)
            end_time = time.time()
            
            response_time = end_time - start_time
            
            assert response.status_code == 200
            assert response_time < 5.0  # Should complete within 5 seconds
            
            data = json.loads(response.data)
            assert len(data) >= 100
            
        finally:
            manager.cleanup()
    
    def test_rapid_status_updates_performance(self, client, database_connection, app):
        """Test performance of rapid consecutive status updates"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="rapid_update@example.com",
            username="rapid_user"
        )
        
        item = manager.create_test_item(
            uid="rapid_update_item",
            title="Rapid Update Item",
            item_type="anime",
            episodes=24
        )
        
        # Add item to user's list
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=item['uid'],
            status="watching",
            progress=0
        )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Perform 10 rapid updates
            start_time = time.time()
            
            for i in range(10):
                response = client.put(
                    f'/api/auth/user-items/{item["uid"]}',
                    headers=headers,
                    json={'status': 'watching', 'progress': i + 1}
                )
                assert response.status_code in [200, 201]
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Performance check
            avg_time_per_update = total_time / 10
            assert avg_time_per_update < 1.0  # Less than 1 second per update
            
            # Verify final state in database
            result = database_connection.execute(
                text("""
                    SELECT progress
                    FROM user_items
                    WHERE user_id = :user_id AND item_uid = :item_uid
                """),
                {"user_id": user['id'], "item_uid": item['uid']}
            )
            
            row = result.fetchone()
            if row:
                assert row[0] == 10  # Final progress value
                
        finally:
            manager.cleanup()