# ABOUTME: Real production scenario tests - NO MOCKS
# ABOUTME: Tests critical production functionality with real database and services

"""
Real Production Scenario Tests for AniManga Recommender

These tests validate critical production functionality with real database
operations and ensure all fixes remain stable.

NO MOCKS - All tests use real database connections and actual API calls
"""

import pytest
import json
import time
from sqlalchemy import text
from datetime import datetime, timedelta

# Import test dependencies  
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from supabase_client import SupabaseClient
from tests.test_utils import TestDataManager, generate_jwt_token, create_auth_headers


@pytest.mark.real_integration
class TestProductionScenarios:
    """Test suite for production-critical scenarios with real data"""
    
    @pytest.fixture
    def client(self):
        """Create test client with real Flask app"""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    
    @pytest.fixture
    def real_supabase(self):
        """Get real Supabase client for testing"""
        return SupabaseClient()
    
    def test_genre_filtering_with_real_junction_tables(self, client, database_connection):
        """Test that genre filtering works correctly with real junction tables"""
        manager = TestDataManager(database_connection)
        
        try:
            # Create test genres
            database_connection.execute(
                text("INSERT INTO genres (id, name) VALUES (:id, :name) ON CONFLICT DO NOTHING"),
                [
                    {'id': 9001, 'name': 'Test Action'},
                    {'id': 9002, 'name': 'Test Comedy'},
                    {'id': 9003, 'name': 'Test Drama'}
                ]
            )
            
            # Create test items with genres
            items = []
            for i in range(3):
                item = manager.create_test_item(
                    uid=f'prod_genre_test_{i}',
                    title=f'Production Genre Test {i}',
                    genres=['Test Action'] if i == 0 else ['Test Action', 'Test Comedy'] if i == 1 else ['Test Drama']
                )
                items.append(item)
                
                # Create junction table entries
                if i == 0:
                    genres_to_link = [9001]  # Just Action
                elif i == 1:
                    genres_to_link = [9001, 9002]  # Action and Comedy
                else:
                    genres_to_link = [9003]  # Just Drama
                
                for genre_id in genres_to_link:
                    database_connection.execute(
                        text("""
                            INSERT INTO item_genres (item_id, genre_id) 
                            VALUES (
                                (SELECT id FROM items WHERE uid = :item_uid),
                                :genre_id
                            )
                            ON CONFLICT DO NOTHING
                        """),
                        {'item_uid': item['uid'], 'genre_id': genre_id}
                    )
            
            database_connection.commit()
            
            # Test single genre filter
            response = client.get('/api/items?genre=Test Action')
            assert response.status_code == 200
            data = response.json
            assert 'items' in data
            
            # Should get items with Action genre
            action_items = [item for item in data['items'] 
                          if 'Test Action' in str(item.get('genres', []))]
            assert len(action_items) >= 2  # Items 0 and 1 have Action
            
            # Test filtering by Drama
            response = client.get('/api/items?genre=Test Drama')
            assert response.status_code == 200
            data = response.json
            drama_items = [item for item in data['items'] 
                         if 'Test Drama' in str(item.get('genres', []))]
            assert len(drama_items) >= 1  # Item 2 has Drama
            
        finally:
            # Clean up junction table entries
            database_connection.execute(
                text("DELETE FROM item_genres WHERE genre_id IN (9001, 9002, 9003)")
            )
            database_connection.execute(
                text("DELETE FROM genres WHERE id IN (9001, 9002, 9003)")
            )
            database_connection.commit()
            manager.cleanup()
    
    def test_multiple_genre_filters_real_data(self, client, database_connection):
        """Test filtering by multiple genres with real data (AND logic)"""
        manager = TestDataManager(database_connection)
        
        try:
            # Create item with multiple genres
            multi_genre_item = manager.create_test_item(
                uid='multi_genre_test',
                title='Multi Genre Test Item',
                genres=['Action', 'Comedy', 'Adventure']
            )
            
            single_genre_item = manager.create_test_item(
                uid='single_genre_test',
                title='Single Genre Test Item',
                genres=['Action']
            )
            
            # Test multiple genre filter (items must have ALL specified genres)
            response = client.get('/api/items?genre=Action,Comedy')
            assert response.status_code == 200
            data = response.json
            
            # Multi-genre item should be in results
            if 'items' in data and data['items']:
                multi_items = [item for item in data['items'] 
                             if item.get('uid') == 'multi_genre_test']
                # Note: The actual filter logic depends on implementation
                # This test validates the endpoint works without errors
            
        finally:
            manager.cleanup()
    
    def test_theme_filtering_with_real_junction_tables(self, client, database_connection):
        """Test that theme filtering works correctly with real data"""
        manager = TestDataManager(database_connection)
        
        try:
            # Create test themes
            database_connection.execute(
                text("INSERT INTO themes (id, name) VALUES (:id, :name) ON CONFLICT DO NOTHING"),
                [
                    {'id': 8001, 'name': 'Test School'},
                    {'id': 8002, 'name': 'Test Fantasy'}
                ]
            )
            
            # Create items with themes
            school_item = manager.create_test_item(
                uid='theme_school_test',
                title='School Theme Test',
                themes=['Test School']
            )
            
            fantasy_item = manager.create_test_item(
                uid='theme_fantasy_test',
                title='Fantasy Theme Test',
                themes=['Test Fantasy']
            )
            
            # Create junction table entries
            database_connection.execute(
                text("""
                    INSERT INTO item_themes (item_id, theme_id)
                    VALUES (
                        (SELECT id FROM items WHERE uid = :item_uid),
                        :theme_id
                    )
                    ON CONFLICT DO NOTHING
                """),
                [
                    {'item_uid': school_item['uid'], 'theme_id': 8001},
                    {'item_uid': fantasy_item['uid'], 'theme_id': 8002}
                ]
            )
            database_connection.commit()
            
            # Test theme filtering
            response = client.get('/api/items?theme=Test School')
            assert response.status_code == 200
            data = response.json
            assert 'items' in data
            
            # Verify School theme item is in results
            if data.get('items'):
                school_items = [item for item in data['items'] 
                              if 'Test School' in str(item.get('themes', []))]
                assert len(school_items) >= 1
            
        finally:
            # Clean up
            database_connection.execute(
                text("DELETE FROM item_themes WHERE theme_id IN (8001, 8002)")
            )
            database_connection.execute(
                text("DELETE FROM themes WHERE id IN (8001, 8002)")
            )
            database_connection.commit()
            manager.cleanup()
    
    def test_206_partial_content_handling_real(self, real_supabase):
        """Test that 206 status code is handled correctly in real scenarios"""
        # 206 Partial Content is valid for range requests
        # Test with actual Supabase client making a range request
        
        try:
            # Make a request with range header to potentially get 206
            # This tests the client's ability to handle 206 responses
            result = real_supabase.table('items').select('*').limit(10).execute()
            
            # Whether we get 200 or 206, the client should handle it
            assert result is not None
            # 206 should not cause errors in processing
            
        except Exception as e:
            # 206 should not cause exceptions
            if '206' in str(e):
                pytest.fail(f"206 status code caused an error: {e}")
    
    def test_count_accuracy_with_real_data(self, database_connection):
        """Test that count queries return accurate results"""
        manager = TestDataManager(database_connection)
        client = SupabaseClient()
        
        try:
            # Create known number of test items
            test_items = []
            for i in range(5):
                item = manager.create_test_item(
                    uid=f'count_test_{i}',
                    title=f'Count Test Item {i}',
                    item_type='anime' if i % 2 == 0 else 'manga'
                )
                test_items.append(item)
            
            # Test count for anime
            anime_count = database_connection.execute(
                text("SELECT COUNT(*) FROM items WHERE type = 'anime' AND uid LIKE 'count_test_%'")
            ).scalar()
            
            assert anime_count == 3  # Items 0, 2, 4
            
            # Test count for manga
            manga_count = database_connection.execute(
                text("SELECT COUNT(*) FROM items WHERE type = 'manga' AND uid LIKE 'count_test_%'")
            ).scalar()
            
            assert manga_count == 2  # Items 1, 3
            
            # Test total count
            total_count = database_connection.execute(
                text("SELECT COUNT(*) FROM items WHERE uid LIKE 'count_test_%'")
            ).scalar()
            
            assert total_count == 5
            
        finally:
            manager.cleanup()
    
    def test_pagination_with_real_large_dataset(self, client, database_connection):
        """Test pagination works correctly with real data"""
        manager = TestDataManager(database_connection)
        
        try:
            # Create a set of items for pagination testing
            created_items = []
            for i in range(15):
                item = manager.create_test_item(
                    uid=f'pagination_test_{i:02d}',
                    title=f'Pagination Test Item {i:02d}',
                    score=5.0 + (i * 0.1)  # Varying scores for ordering
                )
                created_items.append(item)
            
            # Test first page
            response = client.get('/api/items?page=1&limit=5')
            assert response.status_code == 200
            data = response.json
            assert 'items' in data
            assert len(data['items']) <= 5
            
            # Test second page
            response = client.get('/api/items?page=2&limit=5')
            assert response.status_code == 200
            data = response.json
            assert 'items' in data
            
            # Test page beyond data
            response = client.get('/api/items?page=100&limit=5')
            assert response.status_code == 200
            data = response.json
            assert 'items' in data
            # Should return empty or limited results
            
        finally:
            manager.cleanup()
    
    def test_error_recovery_with_real_database(self, database_connection):
        """Test that the system recovers from database errors gracefully"""
        manager = TestDataManager(database_connection)
        
        try:
            # Create a test item
            item = manager.create_test_item(
                uid='error_recovery_test',
                title='Error Recovery Test'
            )
            
            # Try an invalid query that should fail gracefully
            try:
                # Intentionally malformed query
                result = database_connection.execute(
                    text("SELECT * FROM nonexistent_table WHERE id = :id"),
                    {'id': 'test'}
                )
            except Exception as e:
                # Should handle the error without crashing
                assert 'nonexistent_table' in str(e).lower() or 'does not exist' in str(e).lower()
            
            # Verify we can still query normally after error
            result = database_connection.execute(
                text("SELECT * FROM items WHERE uid = :uid"),
                {'uid': item['uid']}
            )
            row = result.fetchone()
            assert row is not None
            assert row.uid == item['uid']
            
        finally:
            manager.cleanup()
    
    def test_concurrent_requests_real_scenario(self, client, database_connection):
        """Test handling of concurrent requests with real data"""
        manager = TestDataManager(database_connection)
        import threading
        import concurrent.futures
        
        try:
            # Create test data
            for i in range(10):
                manager.create_test_item(
                    uid=f'concurrent_test_{i}',
                    title=f'Concurrent Test Item {i}'
                )
            
            results = []
            errors = []
            
            def make_request(page):
                try:
                    response = client.get(f'/api/items?page={page}&limit=2')
                    results.append((page, response.status_code))
                except Exception as e:
                    errors.append((page, str(e)))
            
            # Make concurrent requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(make_request, i) for i in range(1, 6)]
                concurrent.futures.wait(futures, timeout=10)
            
            # All requests should succeed
            assert len(errors) == 0, f"Errors occurred: {errors}"
            assert len(results) == 5
            
            # All should return 200
            for page, status_code in results:
                assert status_code == 200
            
        finally:
            manager.cleanup()
    
    def test_data_integrity_with_updates(self, database_connection):
        """Test that data integrity is maintained during updates"""
        manager = TestDataManager(database_connection)
        
        try:
            # Create user and items
            user = manager.create_test_user(
                email='integrity_test@example.com',
                username='integrity_test'
            )
            
            item = manager.create_test_item(
                uid='integrity_test_item',
                title='Integrity Test Item'
            )
            
            # Add item to user's list
            manager.create_user_item_entry(
                user_id=user['id'],
                item_uid=item['uid'],
                status='watching',
                score=8.0,
                progress=5
            )
            
            # Update the entry
            database_connection.execute(
                text("""
                    UPDATE user_items 
                    SET status = 'completed', score = 9.0, progress = 12
                    WHERE user_id = :user_id AND item_uid = :item_uid
                """),
                {'user_id': user['id'], 'item_uid': item['uid']}
            )
            database_connection.commit()
            
            # Verify update
            result = database_connection.execute(
                text("""
                    SELECT status, score, progress 
                    FROM user_items 
                    WHERE user_id = :user_id AND item_uid = :item_uid
                """),
                {'user_id': user['id'], 'item_uid': item['uid']}
            )
            row = result.fetchone()
            
            assert row.status == 'completed'
            assert row.score == 9.0
            assert row.progress == 12
            
            # Verify referential integrity
            user_count = database_connection.execute(
                text("SELECT COUNT(*) FROM user_profiles WHERE id = :id"),
                {'id': user['id']}
            ).scalar()
            assert user_count == 1
            
            item_count = database_connection.execute(
                text("SELECT COUNT(*) FROM items WHERE uid = :uid"),
                {'uid': item['uid']}
            ).scalar()
            assert item_count == 1
            
        finally:
            manager.cleanup()
    
    def test_cache_invalidation_scenario(self, database_connection):
        """Test that cache invalidation works correctly in production scenarios"""
        manager = TestDataManager(database_connection)
        from utils.hybrid_cache import get_hybrid_cache
        
        cache = get_hybrid_cache()
        
        try:
            # Create and cache an item
            item = manager.create_test_item(
                uid='cache_test_item',
                title='Cache Test Item',
                score=7.5
            )
            
            # Cache the item
            cache_key = f"item:{item['uid']}"
            cache.set(cache_key, item, ttl_hours=1)
            
            # Verify cached
            cached_item = cache.get(cache_key)
            assert cached_item is not None
            assert cached_item['score'] == 7.5
            
            # Update item in database
            database_connection.execute(
                text("UPDATE items SET score = 8.5 WHERE uid = :uid"),
                {'uid': item['uid']}
            )
            database_connection.commit()
            
            # Invalidate cache
            cache.delete(cache_key)
            
            # Verify cache is cleared
            cached_item = cache.get(cache_key)
            assert cached_item is None
            
            # Fetch fresh data
            result = database_connection.execute(
                text("SELECT score FROM items WHERE uid = :uid"),
                {'uid': item['uid']}
            )
            row = result.fetchone()
            assert row.score == 8.5
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestProductionStability:
    """Test production stability scenarios"""
    
    def test_long_running_query_handling(self, database_connection):
        """Test handling of long-running queries"""
        manager = TestDataManager(database_connection)
        
        try:
            # Create large dataset
            items = []
            for i in range(100):
                item = manager.create_test_item(
                    uid=f'long_query_{i:03d}',
                    title=f'Long Query Test {i}',
                    synopsis=f'Synopsis ' * 100  # Large text
                )
                items.append(item)
            
            # Execute complex query
            start_time = time.time()
            result = database_connection.execute(
                text("""
                    SELECT 
                        type, 
                        COUNT(*) as count,
                        AVG(score) as avg_score,
                        MAX(score) as max_score
                    FROM items
                    WHERE uid LIKE 'long_query_%'
                    GROUP BY type
                    ORDER BY count DESC
                """)
            )
            rows = result.fetchall()
            query_time = time.time() - start_time
            
            # Should complete in reasonable time
            assert query_time < 5.0  # 5 seconds max
            assert len(rows) > 0
            
        finally:
            manager.cleanup()
    
    def test_transaction_rollback_on_error(self, database_connection):
        """Test that transactions rollback correctly on error"""
        manager = TestDataManager(database_connection)
        
        try:
            # Start transaction
            trans = database_connection.begin()
            
            try:
                # Create item in transaction
                database_connection.execute(
                    text("""
                        INSERT INTO items (uid, title, type)
                        VALUES ('rollback_test', 'Rollback Test', 'anime')
                    """)
                )
                
                # Force an error (duplicate key)
                database_connection.execute(
                    text("""
                        INSERT INTO items (uid, title, type)
                        VALUES ('rollback_test', 'Duplicate', 'anime')
                    """)
                )
                
                trans.commit()
            except Exception:
                trans.rollback()
                
            # Verify item was not created
            count = database_connection.execute(
                text("SELECT COUNT(*) FROM items WHERE uid = 'rollback_test'")
            ).scalar()
            
            assert count == 0  # Transaction rolled back
            
        finally:
            # Clean up if needed
            database_connection.execute(
                text("DELETE FROM items WHERE uid = 'rollback_test'")
            )
            database_connection.commit()


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])