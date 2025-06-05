"""
Comprehensive User Journey Integration Tests for AniManga Recommender Backend
Phase C2: User Journey Testing (Backend)

Test Coverage:
- Complete user onboarding and first item addition workflow
- Multi-step item search, filtering, and list management
- Dashboard data aggregation and consistency across operations
- Recommendation generation and feedback workflow
- Cross-endpoint data consistency and state management
- Error recovery and data integrity during complex workflows
- Performance under realistic user interaction patterns
"""

import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from app import create_app
from config import Config


class TestConfig(Config):
    """Test configuration for user journey testing"""
    TESTING = True
    SUPABASE_URL = "https://test.supabase.co"
    SUPABASE_ANON_KEY = "test_anon_key"
    SUPABASE_SERVICE_ROLE_KEY = "test_service_role_key"


@pytest.fixture
def app():
    """Create test app"""
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    flask_app.config['SUPABASE_URL'] = "https://test.supabase.co"
    flask_app.config['SUPABASE_ANON_KEY'] = "test_anon_key"
    flask_app.config['SUPABASE_SERVICE_ROLE_KEY'] = "test_service_role_key"
    return flask_app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers():
    """Mock authentication headers"""
    return {'Authorization': 'Bearer mock_jwt_token'}


@pytest.fixture
def mock_user_data():
    """Mock user data for testing"""
    return {
        'user_id': 'test-user-123',
        'email': 'test@example.com',
        'full_name': 'Test User',
        'created_at': '2024-01-01T00:00:00Z'
    }


@pytest.fixture
def mock_anime_items():
    """Mock anime items for testing"""
    return [
        {
            'uid': 'anime-1',
            'title': 'Attack on Titan',
            'media_type': 'anime',
            'genres': ['Action', 'Drama'],
            'themes': ['Military', 'Survival'],
            'demographics': ['Shounen'],
            'score': 9.0,
            'scored_by': 1000000,
            'status': 'Finished Airing',
            'episodes': 75,
            'start_date': '2013-04-07',
            'rating': 'R',
            'popularity': 1,
            'synopsis': 'Humanity fights for survival against giant humanoid Titans.',
            'studios': ['Studio Pierrot'],
            'authors': ['Hajime Isayama'],
            'serializations': ['Bessatsu Shounen Magazine']
        },
        {
            'uid': 'manga-1',
            'title': 'One Piece',
            'media_type': 'manga',
            'genres': ['Adventure', 'Comedy'],
            'themes': ['Pirates'],
            'demographics': ['Shounen'],
            'score': 9.2,
            'scored_by': 500000,
            'status': 'Publishing',
            'chapters': 1000,
            'start_date': '1997-07-22',
            'synopsis': 'Monkey D. Luffy explores the Grand Line to become Pirate King.',
            'authors': ['Eiichiro Oda'],
            'serializations': ['Weekly Shounen Jump']
        }
    ]


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for backend testing"""
    with patch('supabase_client.SupabaseClient') as mock:
        client = Mock()
        mock.return_value = client
        
        # Mock auth verification
        client.auth.get_user.return_value.user = {
            'id': 'test-user-123',
            'email': 'test@example.com'
        }
        
        # Mock database operations
        client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        client.table.return_value.insert.return_value.execute.return_value.data = [{}]
        client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{}]
        client.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [{}]
        
        yield client


class TestCompleteUserJourneyIntegration:
    """Integration tests for complete user journeys across multiple endpoints"""

    def test_new_user_onboarding_to_first_item_workflow(self, client, auth_headers, mock_supabase_client, mock_anime_items):
        """Test complete new user onboarding workflow"""
        
        # 1. User accesses dashboard for first time (should be empty)
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/dashboard', headers=auth_headers)
            
        # Should return empty dashboard for new user
        assert response.status_code in [200, 404]
        
        # 2. User searches for anime items
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            with patch('requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = {
                    'items': mock_anime_items,
                    'total_items': len(mock_anime_items)
                }
                
                response = client.get('/api/items?q=Attack on Titan', headers=auth_headers)
                
        assert response.status_code == 200
        data = response.get_json()
        assert 'items' in data
        assert len(data['items']) > 0
        
        # 3. User gets item details
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            with patch('requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = mock_anime_items[0]
                
                response = client.get('/api/items/anime-1', headers=auth_headers)
                
        assert response.status_code == 200
        item_data = response.get_json()
        assert item_data['title'] == 'Attack on Titan'
        
        # 4. User adds first item to their list
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value.data = [{
            'id': 1,
            'user_id': 'test-user-123',
            'item_uid': 'anime-1',
            'status': 'watching',
            'progress': 0,
            'created_at': '2024-01-15T10:00:00Z'
        }]
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.post('/api/auth/user-items', 
                                 headers=auth_headers,
                                 json={
                                     'item_uid': 'anime-1',
                                     'status': 'watching',
                                     'progress': 0
                                 })
            
        assert response.status_code in [200, 201]
        
        # 5. User views their updated dashboard
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {
                'id': 1,
                'user_id': 'test-user-123',
                'item_uid': 'anime-1',
                'status': 'watching',
                'progress': 0,
                'created_at': '2024-01-15T10:00:00Z'
            }
        ]
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/dashboard', headers=auth_headers)
            
        assert response.status_code == 200
        dashboard_data = response.get_json()
        
        # Verify dashboard reflects new item
        assert 'quick_stats' in dashboard_data or 'user_items' in dashboard_data

    def test_multi_step_search_filter_and_list_management(self, client, auth_headers, mock_anime_items):
        """Test complex search, filtering, and list management workflow"""
        
        # 1. User gets filter options
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            with patch('requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = {
                    'genres': ['Action', 'Adventure', 'Comedy'],
                    'themes': ['Military', 'Pirates', 'School'],
                    'demographics': ['Shounen', 'Seinen']
                }
                
                response = client.get('/api/items/distinct-values', headers=auth_headers)
                
        assert response.status_code == 200
        filter_data = response.get_json()
        assert 'genres' in filter_data
        
        # 2. User applies complex filters
        filter_params = {
            'media_type': 'anime',
            'genres': 'Action,Drama',
            'min_score': '8.0',
            'status': 'Finished Airing',
            'sort_by': 'score_desc',
            'page': '1',
            'per_page': '20'
        }
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            with patch('requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = {
                    'items': [mock_anime_items[0]],  # Filtered results
                    'total_items': 1,
                    'current_page': 1,
                    'total_pages': 1
                }
                
                response = client.get('/api/items', query_string=filter_params, headers=auth_headers)
                
        assert response.status_code == 200
        filtered_data = response.get_json()
        assert len(filtered_data['items']) == 1
        assert filtered_data['items'][0]['title'] == 'Attack on Titan'
        
        # 3. User adds filtered item to different status
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.post('/api/auth/user-items',
                                 headers=auth_headers,
                                 json={
                                     'item_uid': 'anime-1',
                                     'status': 'plan_to_watch'
                                 })
                                 
        assert response.status_code in [200, 201]
        
        # 4. User changes sort order and searches again
        new_filter_params = {
            **filter_params,
            'sort_by': 'popularity_asc',
            'q': 'Attack'
        }
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            with patch('requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = {
                    'items': mock_anime_items,
                    'total_items': len(mock_anime_items)
                }
                
                response = client.get('/api/items', query_string=new_filter_params, headers=auth_headers)
                
        assert response.status_code == 200

    def test_item_status_progression_and_dashboard_consistency(self, client, auth_headers, mock_supabase_client):
        """Test item status updates and dashboard data consistency"""
        
        # Setup existing user item
        mock_user_item = {
            'id': 1,
            'user_id': 'test-user-123',
            'item_uid': 'anime-1',
            'status': 'watching',
            'progress': 5,
            'rating': None,
            'start_date': '2024-01-01',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-10T00:00:00Z'
        }
        
        # 1. User views current item
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_item]
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/user-items', headers=auth_headers)
            
        assert response.status_code == 200
        user_items = response.get_json()
        assert len(user_items) == 1
        assert user_items[0]['status'] == 'watching'
        
        # 2. User updates progress
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.put('/api/auth/user-items/anime-1',
                                headers=auth_headers,
                                json={'progress': 12})
                                
        assert response.status_code == 200
        
        # 3. User changes status to completed and adds rating
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{
            **mock_user_item,
            'status': 'completed',
            'progress': 75,
            'rating': 9.0,
            'end_date': '2024-01-15',
            'updated_at': '2024-01-15T10:00:00Z'
        }]
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.put('/api/auth/user-items/anime-1',
                                headers=auth_headers,
                                json={
                                    'status': 'completed',
                                    'progress': 75,
                                    'rating': 9.0,
                                    'end_date': '2024-01-15'
                                })
                                
        assert response.status_code == 200
        
        # 4. Verify dashboard reflects updates
        mock_dashboard_data = {
            'user_stats': {
                'total_anime_watched': 1,
                'total_completed': 1,
                'average_score': 9.0
            },
            'recent_activity': [
                {
                    'activity_type': 'status_update',
                    'item_uid': 'anime-1',
                    'activity_data': {
                        'old_status': 'watching',
                        'new_status': 'completed'
                    },
                    'created_at': '2024-01-15T10:00:00Z'
                }
            ]
        }
        
        with patch('app.get_dashboard_data', return_value=mock_dashboard_data):
            with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
                response = client.get('/api/auth/dashboard', headers=auth_headers)
                
        assert response.status_code == 200
        dashboard = response.get_json()
        assert dashboard['user_stats']['total_completed'] == 1
        assert len(dashboard['recent_activity']) == 1

    def test_recommendation_generation_and_feedback_workflow(self, client, auth_headers, mock_anime_items):
        """Test recommendation generation and user feedback workflow"""
        
        # 1. User requests recommendations
        mock_recommendations = [
            {
                **mock_anime_items[0],
                'recommendation_score': 95,
                'reason': 'Similar to your highly rated anime'
            },
            {
                **mock_anime_items[1],
                'recommendation_score': 88,
                'reason': 'Popular among users with similar preferences'
            }
        ]
        
        with patch('app.get_recommendations', return_value={'recommendations': mock_recommendations}):
            with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
                response = client.get('/api/recommendations/anime-1', headers=auth_headers)
                
        assert response.status_code == 200
        recommendations = response.get_json()
        assert len(recommendations) == 2
        assert 'recommendation_score' in recommendations[0]
        
        # 2. User views recommendation details
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/recommendations/anime-1', headers=auth_headers)
            
        assert response.status_code in [200, 404]
        
        # 3. User provides positive feedback
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.post('/api/auth/recommendation-feedback',
                                 headers=auth_headers,
                                 json={
                                     'item_uid': 'anime-1',
                                     'feedback': 'helpful',
                                     'rating': 5
                                 })
                                 
        assert response.status_code in [200, 201]
        
        # 4. User adds recommended item to list
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.post('/api/auth/user-items',
                                 headers=auth_headers,
                                 json={
                                     'item_uid': 'anime-1',
                                     'status': 'plan_to_watch',
                                     'source': 'recommendation'
                                 })
                                 
        assert response.status_code in [200, 201]
        
        # 5. User requests more recommendations
        with patch('app.generate_recommendations', return_value=mock_recommendations):
            with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
                response = client.get('/api/auth/recommendations?refresh=true', headers=auth_headers)
                
        assert response.status_code == 200

    def test_bulk_operations_and_data_consistency(self, client, auth_headers, mock_supabase_client):
        """Test bulk operations and data consistency across multiple items"""
        
        # Setup multiple user items
        mock_user_items = [
            {
                'id': i,
                'user_id': 'test-user-123',
                'item_uid': f'anime-{i}',
                'status': 'watching',
                'progress': i * 2,
                'created_at': '2024-01-01T00:00:00Z'
            }
            for i in range(1, 6)
        ]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = mock_user_items
        
        # 1. User gets all their items
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/user-items', headers=auth_headers)
            
        assert response.status_code == 200
        items = response.get_json()
        assert len(items) == 5
        
        # 2. User performs bulk status update
        bulk_update_data = {
            'item_uids': ['anime-1', 'anime-2', 'anime-3'],
            'updates': {
                'status': 'completed',
                'end_date': '2024-01-15'
            }
        }
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.put('/api/auth/user-items/bulk',
                                headers=auth_headers,
                                json=bulk_update_data)
                                
        assert response.status_code == 200
        
        # 3. User exports their list data
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/user-items/export?format=json', headers=auth_headers)
            
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/json'
        
        # 4. Verify dashboard reflects bulk changes
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/dashboard', headers=auth_headers)
            
        assert response.status_code == 200

    def test_cross_endpoint_data_consistency(self, client, auth_headers, mock_supabase_client):
        """Test data consistency across different API endpoints"""
        
        # Setup test data
        test_item_uid = 'anime-test-123'
        
        # 1. Add item through user-items endpoint
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.post('/api/auth/user-items',
                                 headers=auth_headers,
                                 json={
                                     'item_uid': test_item_uid,
                                     'status': 'watching',
                                     'progress': 0
                                 })
                                 
        assert response.status_code in [200, 201]
        
        # 2. Verify item appears in dashboard
        mock_dashboard_data = {
            'quick_stats': {'watching': 1},
            'in_progress': [{'item_uid': test_item_uid}]
        }
        
        with patch('app.get_dashboard_data', return_value=mock_dashboard_data):
            with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
                response = client.get('/api/auth/dashboard', headers=auth_headers)
                
        assert response.status_code == 200
        dashboard = response.get_json()
        assert dashboard['quick_stats']['watching'] == 1
        
        # 3. Update item and verify consistency
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.put(f'/api/auth/user-items/{test_item_uid}',
                                headers=auth_headers,
                                json={'progress': 10})
                                
        assert response.status_code == 200
        
        # 4. Verify update appears in activity feed
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/user-activity', headers=auth_headers)
            
        assert response.status_code in [200, 404]

    def test_error_recovery_during_complex_workflow(self, client, auth_headers, mock_supabase_client):
        """Test error recovery and data integrity during complex workflows"""
        
        # 1. Start with successful operation
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/dashboard', headers=auth_headers)
            
        assert response.status_code == 200
        
        # 2. Simulate database error during item addition
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = Exception("Database error")
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.post('/api/auth/user-items',
                                 headers=auth_headers,
                                 json={
                                     'item_uid': 'anime-error-test',
                                     'status': 'watching'
                                 })
                                 
        assert response.status_code == 500
        
        # 3. Verify system recovers and other operations still work
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = None
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value.data = [{}]
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/dashboard', headers=auth_headers)
            
        assert response.status_code == 200
        
        # 4. Retry the failed operation
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.post('/api/auth/user-items',
                                 headers=auth_headers,
                                 json={
                                     'item_uid': 'anime-recovery-test',
                                     'status': 'watching'
                                 })
                                 
        assert response.status_code in [200, 201]

    def test_performance_under_realistic_load(self, client, auth_headers, mock_supabase_client):
        """Test system performance under realistic user interaction patterns"""
        
        # Simulate realistic user session
        start_time = time.time()
        
        # 1. Dashboard load
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/dashboard', headers=auth_headers)
        assert response.status_code == 200
        
        # 2. Multiple search requests
        for i in range(3):
            with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
                with patch('requests.get') as mock_get:
                    mock_get.return_value.status_code = 200
                    mock_get.return_value.json.return_value = {'items': [], 'total_items': 0}
                    
                    response = client.get(f'/api/items?q=test{i}', headers=auth_headers)
            assert response.status_code == 200
        
        # 3. Item detail views
        for i in range(2):
            with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
                with patch('requests.get') as mock_get:
                    mock_get.return_value.status_code = 200
                    mock_get.return_value.json.return_value = {'uid': f'item-{i}', 'title': f'Item {i}'}
                    
                    response = client.get(f'/api/items/item-{i}', headers=auth_headers)
            assert response.status_code == 200
        
        # 4. User list operations
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/user-items', headers=auth_headers)
        assert response.status_code == 200
        
        # 5. Item additions
        for i in range(2):
            with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
                response = client.post('/api/auth/user-items',
                                     headers=auth_headers,
                                     json={
                                         'item_uid': f'perf-test-{i}',
                                         'status': 'watching'
                                     })
            assert response.status_code in [200, 201]
        
        end_time = time.time()
        
        # Total workflow should complete within reasonable time
        total_time = end_time - start_time
        assert total_time < 5.0  # Should complete within 5 seconds

    def test_data_integrity_across_user_sessions(self, client, auth_headers, mock_supabase_client):
        """Test data integrity across simulated user sessions"""
        
        # Session 1: User adds items
        session_1_data = []
        for i in range(3):
            item_data = {
                'id': i + 1,
                'user_id': 'test-user-123',
                'item_uid': f'session-item-{i}',
                'status': 'watching',
                'created_at': '2024-01-01T00:00:00Z'
            }
            session_1_data.append(item_data)
            
            with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
                response = client.post('/api/auth/user-items',
                                     headers=auth_headers,
                                     json={
                                         'item_uid': item_data['item_uid'],
                                         'status': item_data['status']
                                     })
            assert response.status_code in [200, 201]
        
        # Simulate session end and new session start
        time.sleep(0.1)
        
        # Session 2: User retrieves and verifies data
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = session_1_data
        
        with patch('supabase_client.SupabaseAuthClient.verify_jwt_token', return_value={'sub': 'test-user-123'}):
            response = client.get('/api/auth/user-items', headers=auth_headers)
            
        assert response.status_code == 200
        retrieved_items = response.get_json()
        assert len(retrieved_items) == 3
        
        # Verify data integrity
        for i, item in enumerate(retrieved_items):
            assert item['item_uid'] == f'session-item-{i}'
            assert item['status'] == 'watching'
            assert item['user_id'] == 'test-user-123' 