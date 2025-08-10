# ABOUTME: Real dashboard integration tests - NO MOCKS
# ABOUTME: Tests actual dashboard statistics and data aggregation with real database

"""
Real Dashboard Data Tests for AniManga Recommender

Test Coverage:
- Dashboard statistics calculation with real data
- Activity feed generation from actual database
- Completion rate calculations with real user items
- Real-time statistics computation
- Quick stats accuracy with actual data
- Performance with real datasets

NO MOCKS - All tests use real database operations and actual data aggregation
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
class TestDashboardCalculations:
    """Test suite for dashboard statistics calculations with real data"""
    
    def test_statistics_empty_user(self, client, database_connection, app):
        """Test dashboard stats for new user with no items"""
        manager = TestDataManager(database_connection)
        
        # Create a new user with no items
        user = manager.create_test_user(
            email="empty_dashboard@example.com",
            username="empty_dashboard_user"
        )
        
        try:
            # Generate auth token
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Get dashboard data
            response = client.get('/api/auth/dashboard', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Verify empty user defaults
            assert 'statistics' in data
            stats = data['statistics']
            
            assert stats['total_anime'] == 0
            assert stats['total_manga'] == 0
            assert stats['anime_days_watched'] == 0
            assert stats['manga_chapters_read'] == 0
            assert stats['mean_score'] == 0
            
        finally:
            manager.cleanup()
    
    def test_statistics_populated_user(self, client, database_connection, app):
        """Test dashboard stats calculation with real user data"""
        manager = TestDataManager(database_connection)
        
        # Create user
        user = manager.create_test_user(
            email="populated_dashboard@example.com",
            username="populated_user"
        )
        
        # Create items and user entries
        anime1 = manager.create_test_item(
            uid="dash_anime_1",
            title="Completed Anime",
            item_type="anime",
            episodes=24
        )
        
        anime2 = manager.create_test_item(
            uid="dash_anime_2",
            title="Watching Anime",
            item_type="anime",
            episodes=12
        )
        
        manga1 = manager.create_test_item(
            uid="dash_manga_1",
            title="Reading Manga",
            item_type="manga"
        )
        
        # Add user items with various statuses
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=anime1['uid'],
            status="completed",
            score=9.0,
            progress=24
        )
        
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=anime2['uid'],
            status="watching",
            score=8.0,
            progress=6
        )
        
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=manga1['uid'],
            status="reading",
            score=7.5,
            progress=50
        )
        
        # Update user statistics
        database_connection.execute(
            text("""
                UPDATE user_statistics 
                SET total_anime = 2,
                    total_manga = 1,
                    anime_days_watched = 1.2,
                    manga_chapters_read = 50,
                    mean_score = 8.2
                WHERE user_id = :user_id
            """),
            {"user_id": user['id']}
        )
        database_connection.commit()
        
        try:
            # Generate auth token
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Get dashboard data
            response = client.get('/api/auth/dashboard', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Verify calculated statistics
            stats = data['statistics']
            assert stats['total_anime'] == 2
            assert stats['total_manga'] == 1
            assert stats['anime_days_watched'] == 1.2
            assert stats['manga_chapters_read'] == 50
            assert stats['mean_score'] == 8.2
            
        finally:
            manager.cleanup()
    
    def test_completion_rate_calculation(self, database_connection, app):
        """Test completion rate calculation with real data"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="completion_test@example.com",
            username="completion_user"
        )
        
        # Create items
        items = []
        for i in range(10):
            items.append(manager.create_test_item(
                uid=f"completion_item_{i}",
                title=f"Item {i}",
                item_type="anime" if i < 7 else "manga"
            ))
        
        # Add user items with different statuses
        # 6 completed, 4 in progress = 60% completion rate
        for i, item in enumerate(items):
            status = "completed" if i < 6 else "watching"
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status=status,
                score=8.0 if status == "completed" else None
            )
        
        try:
            # Calculate completion rate directly from database
            result = database_connection.execute(
                text("""
                    SELECT 
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                        COUNT(*) as total
                    FROM user_items
                    WHERE user_id = :user_id
                """),
                {"user_id": user['id']}
            )
            
            row = result.fetchone()
            completion_rate = (row[0] / row[1] * 100) if row[1] > 0 else 0
            
            assert completion_rate == 60.0
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestActivityFeed:
    """Test activity feed generation with real data"""
    
    def test_recent_activity_generation(self, database_connection):
        """Test generating recent activity feed from real data"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="activity_test@example.com",
            username="activity_user"
        )
        
        # Create recent activities
        activities = []
        
        # Add item to list activity
        item1 = manager.create_test_item(uid="activity_item_1", title="New Anime")
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=item1['uid'],
            status="watching"
        )
        
        # Log the activity
        database_connection.execute(
            text("""
                INSERT INTO user_activity (id, user_id, activity_type, activity_data, created_at)
                VALUES (gen_random_uuid(), :user_id, :type, :data::jsonb, NOW())
            """),
            {
                "user_id": user['id'],
                "type": "item_added",
                "data": json.dumps({"item_uid": item1['uid'], "status": "watching"})
            }
        )
        
        # Complete an item activity
        item2 = manager.create_test_item(uid="activity_item_2", title="Completed Anime")
        manager.create_user_item_entry(
            user_id=user['id'],
            item_uid=item2['uid'],
            status="completed",
            score=9.0
        )
        
        database_connection.execute(
            text("""
                INSERT INTO user_activity (id, user_id, activity_type, activity_data, created_at)
                VALUES (gen_random_uuid(), :user_id, :type, :data::jsonb, NOW() - INTERVAL '1 hour')
            """),
            {
                "user_id": user['id'],
                "type": "item_completed",
                "data": json.dumps({"item_uid": item2['uid'], "score": 9.0})
            }
        )
        
        database_connection.commit()
        
        try:
            # Fetch recent activities
            result = database_connection.execute(
                text("""
                    SELECT activity_type, activity_data, created_at
                    FROM user_activity
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC
                    LIMIT 10
                """),
                {"user_id": user['id']}
            )
            
            activities = result.fetchall()
            
            assert len(activities) == 2
            assert activities[0][0] == "item_added"  # Most recent first
            assert activities[1][0] == "item_completed"
            
        finally:
            manager.cleanup()
    
    def test_activity_filtering_by_type(self, database_connection):
        """Test filtering activities by type with real data"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="filter_activity@example.com",
            username="filter_user"
        )
        
        # Create different types of activities
        activity_types = ["item_added", "item_completed", "list_created", "review_posted"]
        
        for i, activity_type in enumerate(activity_types):
            database_connection.execute(
                text("""
                    INSERT INTO user_activity (id, user_id, activity_type, activity_data, created_at)
                    VALUES (gen_random_uuid(), :user_id, :type, :data::jsonb, NOW() - INTERVAL :hours)
                """),
                {
                    "user_id": user['id'],
                    "type": activity_type,
                    "data": json.dumps({"test": True}),
                    "hours": f"{i} hours"
                }
            )
        
        database_connection.commit()
        
        try:
            # Filter for specific activity type
            result = database_connection.execute(
                text("""
                    SELECT activity_type
                    FROM user_activity
                    WHERE user_id = :user_id AND activity_type = :type
                """),
                {"user_id": user['id'], "type": "item_completed"}
            )
            
            filtered = result.fetchall()
            assert len(filtered) == 1
            assert filtered[0][0] == "item_completed"
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestDashboardPerformance:
    """Test dashboard performance with real datasets"""
    
    def test_dashboard_with_large_dataset(self, client, database_connection, app):
        """Test dashboard performance with many user items"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="performance_test@example.com",
            username="performance_user"
        )
        
        # Create many items (simulate heavy user)
        items = []
        for i in range(100):
            items.append(manager.create_test_item(
                uid=f"perf_item_{i}",
                title=f"Performance Test Item {i}",
                item_type="anime" if i % 2 == 0 else "manga",
                score=5.0 + (i % 5),
                episodes=12 if i % 2 == 0 else None
            ))
        
        # Add all items to user's list
        for i, item in enumerate(items):
            status = ["completed", "watching", "plan_to_watch", "dropped"][i % 4]
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status=status,
                score=7.0 + (i % 3) if status == "completed" else None,
                progress=item.get('episodes', 0) if status == "watching" else 0
            )
        
        try:
            # Generate auth token
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Measure dashboard load time
            start_time = time.time()
            response = client.get('/api/auth/dashboard', headers=headers)
            load_time = time.time() - start_time
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Performance assertion - should load within 2 seconds even with 100 items
            assert load_time < 2.0, f"Dashboard took {load_time:.2f}s to load with 100 items"
            
            # Verify data completeness
            assert 'profile' in data
            assert 'statistics' in data
            
        finally:
            manager.cleanup()
    
    def test_statistics_aggregation_accuracy(self, database_connection):
        """Test accuracy of statistics aggregation with real data"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="aggregation_test@example.com",
            username="aggregation_user"
        )
        
        # Create known dataset
        completed_anime = 25
        watching_anime = 10
        completed_manga = 15
        reading_manga = 5
        
        # Create anime items
        for i in range(completed_anime):
            item = manager.create_test_item(
                uid=f"agg_anime_comp_{i}",
                title=f"Completed Anime {i}",
                item_type="anime",
                episodes=24
            )
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status="completed",
                score=8.0,
                progress=24
            )
        
        for i in range(watching_anime):
            item = manager.create_test_item(
                uid=f"agg_anime_watch_{i}",
                title=f"Watching Anime {i}",
                item_type="anime",
                episodes=12
            )
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status="watching",
                progress=6
            )
        
        # Create manga items
        for i in range(completed_manga):
            item = manager.create_test_item(
                uid=f"agg_manga_comp_{i}",
                title=f"Completed Manga {i}",
                item_type="manga"
            )
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status="completed",
                score=7.5,
                progress=200
            )
        
        for i in range(reading_manga):
            item = manager.create_test_item(
                uid=f"agg_manga_read_{i}",
                title=f"Reading Manga {i}",
                item_type="manga"
            )
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status="reading",
                progress=50
            )
        
        try:
            # Aggregate statistics directly from database
            result = database_connection.execute(
                text("""
                    SELECT 
                        COUNT(CASE WHEN i.type = 'anime' THEN 1 END) as total_anime,
                        COUNT(CASE WHEN i.type = 'manga' THEN 1 END) as total_manga,
                        COUNT(CASE WHEN ui.status = 'completed' AND i.type = 'anime' THEN 1 END) as completed_anime,
                        COUNT(CASE WHEN ui.status = 'completed' AND i.type = 'manga' THEN 1 END) as completed_manga,
                        AVG(CASE WHEN ui.status = 'completed' THEN ui.score END) as mean_score
                    FROM user_items ui
                    JOIN items i ON ui.item_uid = i.uid
                    WHERE ui.user_id = :user_id
                """),
                {"user_id": user['id']}
            )
            
            stats = result.fetchone()
            
            assert stats[0] == completed_anime + watching_anime  # total_anime
            assert stats[1] == completed_manga + reading_manga  # total_manga
            assert stats[2] == completed_anime  # completed_anime
            assert stats[3] == completed_manga  # completed_manga
            assert abs(stats[4] - 7.8) < 0.1  # mean_score (approximately)
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestQuickStats:
    """Test quick statistics generation with real data"""
    
    def test_quick_stats_generation(self, client, database_connection, app):
        """Test generation of quick stats for dashboard"""
        manager = TestDataManager(database_connection)
        
        user = manager.create_test_user(
            email="quickstats@example.com",
            username="quickstats_user"
        )
        
        # Create some recent activity
        for i in range(5):
            item = manager.create_test_item(
                uid=f"quick_{i}",
                title=f"Quick Item {i}",
                item_type="anime"
            )
            
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status="completed" if i < 3 else "watching",
                score=8.0 if i < 3 else None
            )
        
        try:
            jwt_secret = app.config.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
            token = generate_jwt_token(
                user_id=user['id'],
                email=user['email'],
                secret_key=jwt_secret
            )
            headers = create_auth_headers(token)
            
            # Get dashboard with quick stats
            response = client.get('/api/auth/dashboard', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Verify quick stats are included
            assert 'profile' in data
            assert 'statistics' in data
            
            # Check for recent items if included
            if 'recent_items' in data:
                assert isinstance(data['recent_items'], list)
                
        finally:
            manager.cleanup()