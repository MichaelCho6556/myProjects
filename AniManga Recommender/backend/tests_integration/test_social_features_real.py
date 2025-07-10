# ABOUTME: Real integration tests for social features (comments, reviews, following, moderation)  
# ABOUTME: Tests actual database operations and social interactions without any mocks

"""
Social Features Integration Tests

Tests social functionality endpoints:
- Comments system (creating, retrieving, nested comments)
- Reviews system (creating, rating, voting)
- User following and social connections
- Moderation system (reports, actions, appeals)
- User profiles and public visibility
- All using real database connections and authentication
"""

import pytest
import json
from sqlalchemy import text


@pytest.mark.real_integration
class TestCommentsSystemReal:
    """Test comments system with real database operations."""
    
    def test_create_item_comment(self, client, auth_headers, load_test_items, sample_items_data):
        """Test creating a comment on an item."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        comment_data = {
            'content': 'This is a great anime! I really enjoyed the storyline.',
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/comments/item/{item_uid}',
            headers=auth_headers,
            data=json.dumps(comment_data),
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify comment creation
        assert data['content'] == comment_data['content']
        assert data['is_spoiler'] == comment_data['is_spoiler']
        assert data['parent_type'] == 'item'
        assert data['parent_id'] == item_uid
        assert 'id' in data
        assert 'created_at' in data
        assert 'user' in data
        
        return data['id']  # Return comment ID for further tests
    
    def test_get_item_comments(self, client, auth_headers, load_test_items, sample_items_data):
        """Test retrieving comments for an item."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # First create a comment
        comment_data = {
            'content': 'Test comment for retrieval',
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/comments/item/{item_uid}',
            headers=auth_headers,
            data=json.dumps(comment_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        
        # Get comments for the item
        response = client.get(f'/api/social/comments/item/{item_uid}')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'comments' in data
        assert 'total' in data
        assert 'page' in data
        
        # Verify comment appears
        assert len(data['comments']) >= 1
        found_comment = next((c for c in data['comments'] if c['content'] == comment_data['content']), None)
        assert found_comment is not None
        assert found_comment['parent_type'] == 'item'
        assert found_comment['parent_id'] == item_uid
    
    def test_nested_comments(self, client, auth_headers, load_test_items, sample_items_data):
        """Test creating nested comments (replies)."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # Create parent comment
        parent_comment_data = {
            'content': 'This is the parent comment',
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/comments/item/{item_uid}',
            headers=auth_headers,
            data=json.dumps(parent_comment_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        parent_comment_id = json.loads(response.data)['id']
        
        # Create reply comment
        reply_comment_data = {
            'content': 'This is a reply to the parent comment',
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/comments/comment/{parent_comment_id}',
            headers=auth_headers,
            data=json.dumps(reply_comment_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify reply comment
        assert data['content'] == reply_comment_data['content']
        assert data['parent_type'] == 'comment'
        assert data['parent_id'] == parent_comment_id
        
        # Get comments and verify nested structure
        response = client.get(f'/api/social/comments/item/{item_uid}')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Find parent comment and verify it has replies
        parent_comment = next((c for c in data['comments'] if c['id'] == parent_comment_id), None)
        assert parent_comment is not None
        assert 'replies' in parent_comment
        assert len(parent_comment['replies']) >= 1
    
    def test_spoiler_comments(self, client, auth_headers, load_test_items, sample_items_data):
        """Test spoiler comment handling."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # Create spoiler comment
        spoiler_comment_data = {
            'content': 'SPOILER: The main character dies at the end!',
            'is_spoiler': True
        }
        
        response = client.post(
            f'/api/social/comments/item/{item_uid}',
            headers=auth_headers,
            data=json.dumps(spoiler_comment_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify spoiler flag
        assert data['is_spoiler'] is True
        
        # Get comments and verify spoiler handling
        response = client.get(f'/api/social/comments/item/{item_uid}')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Find spoiler comment
        spoiler_comment = next((c for c in data['comments'] if c['is_spoiler']), None)
        assert spoiler_comment is not None
        assert spoiler_comment['is_spoiler'] is True
    
    def test_comment_reactions(self, client, auth_headers, sample_comments):
        """Test comment reactions (likes, dislikes)."""
        comment_id = sample_comments[0]['id']
        
        # Add like reaction
        reaction_data = {
            'reaction_type': 'like'
        }
        
        response = client.post(
            f'/api/social/comments/{comment_id}/reactions',
            headers=auth_headers,
            data=json.dumps(reaction_data),
            content_type='application/json'
        )
        assert response.status_code in [200, 201]
        
        # Get comment with reactions
        response = client.get(f'/api/social/comments/{comment_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify reaction was added
        assert 'reactions' in data
        assert data['reactions']['like'] >= 1
        
        # Toggle reaction (remove like)
        response = client.post(
            f'/api/social/comments/{comment_id}/reactions',
            headers=auth_headers,
            data=json.dumps(reaction_data),
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Verify reaction was removed
        response = client.get(f'/api/social/comments/{comment_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should be back to original count
        assert data['reactions']['like'] == 0


@pytest.mark.real_integration
class TestReviewsSystemReal:
    """Test reviews system with real database operations."""
    
    def test_create_review(self, client, auth_headers, load_test_items, sample_items_data):
        """Test creating a review for an item."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        review_data = {
            'overall_rating': 9,
            'story_rating': 8,
            'art_rating': 10,
            'character_rating': 9,
            'enjoyment_rating': 9,
            'content': 'This is an amazing anime with great character development and stunning visuals. Highly recommend!',
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/reviews/{item_uid}',
            headers=auth_headers,
            data=json.dumps(review_data),
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify review creation
        assert data['overall_rating'] == review_data['overall_rating']
        assert data['story_rating'] == review_data['story_rating']
        assert data['art_rating'] == review_data['art_rating']
        assert data['character_rating'] == review_data['character_rating']
        assert data['enjoyment_rating'] == review_data['enjoyment_rating']
        assert data['content'] == review_data['content']
        assert data['is_spoiler'] == review_data['is_spoiler']
        assert data['item_uid'] == item_uid
        assert 'id' in data
        assert 'created_at' in data
        assert 'user' in data
        
        return data['id']  # Return review ID for further tests
    
    def test_get_item_reviews(self, client, auth_headers, load_test_items, sample_items_data):
        """Test retrieving reviews for an item."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # First create a review
        review_data = {
            'overall_rating': 8,
            'content': 'Test review for retrieval',
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/reviews/{item_uid}',
            headers=auth_headers,
            data=json.dumps(review_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        
        # Get reviews for the item
        response = client.get(f'/api/social/reviews/{item_uid}')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'reviews' in data
        assert 'total' in data
        assert 'average_rating' in data
        assert 'rating_distribution' in data
        
        # Verify review appears
        assert len(data['reviews']) >= 1
        found_review = next((r for r in data['reviews'] if r['content'] == review_data['content']), None)
        assert found_review is not None
        assert found_review['item_uid'] == item_uid
    
    def test_review_voting(self, client, auth_headers, sample_reviews):
        """Test voting on reviews (helpful/not helpful)."""
        review_id = sample_reviews[0]['id']
        
        # Vote helpful
        vote_data = {
            'vote_type': 'helpful'
        }
        
        response = client.post(
            f'/api/social/reviews/{review_id}/votes',
            headers=auth_headers,
            data=json.dumps(vote_data),
            content_type='application/json'
        )
        assert response.status_code in [200, 201]
        
        # Get review with votes
        response = client.get(f'/api/social/reviews/{review_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify vote was counted
        assert data['helpful_count'] >= 1
        assert data['total_votes'] >= 1
    
    def test_review_update(self, client, auth_headers, load_test_items, sample_items_data):
        """Test updating a review."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # First create a review
        original_review = {
            'overall_rating': 7,
            'content': 'Original review content',
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/reviews/{item_uid}',
            headers=auth_headers,
            data=json.dumps(original_review),
            content_type='application/json'
        )
        assert response.status_code == 201
        review_id = json.loads(response.data)['id']
        
        # Update the review
        updated_review = {
            'overall_rating': 9,
            'content': 'Updated review content - much better after rewatching!',
            'is_spoiler': False
        }
        
        response = client.put(
            f'/api/social/reviews/{review_id}',
            headers=auth_headers,
            data=json.dumps(updated_review),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify update
        assert data['overall_rating'] == updated_review['overall_rating']
        assert data['content'] == updated_review['content']
        assert 'updated_at' in data
    
    def test_review_deletion(self, client, auth_headers, load_test_items, sample_items_data):
        """Test deleting a review."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # First create a review
        review_data = {
            'overall_rating': 8,
            'content': 'Review to be deleted',
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/reviews/{item_uid}',
            headers=auth_headers,
            data=json.dumps(review_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        review_id = json.loads(response.data)['id']
        
        # Delete the review
        response = client.delete(
            f'/api/social/reviews/{review_id}',
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify review is deleted
        response = client.get(f'/api/social/reviews/{review_id}')
        assert response.status_code == 404


@pytest.mark.real_integration
class TestUserFollowingReal:
    """Test user following system with real database operations."""
    
    def test_follow_user(self, client, auth_headers, multiple_test_users, auth_client):
        """Test following another user."""
        # Create auth headers for the user to follow
        user_to_follow = multiple_test_users[1]
        
        # Follow user
        response = client.post(
            f'/api/social/follow/{user_to_follow["id"]}',
            headers=auth_headers
        )
        assert response.status_code in [200, 201]
        data = json.loads(response.data)
        
        # Verify follow relationship
        assert data['following'] is True
        assert data['user_id'] == user_to_follow['id']
    
    def test_unfollow_user(self, client, auth_headers, multiple_test_users):
        """Test unfollowing a user."""
        user_to_unfollow = multiple_test_users[1]
        
        # First follow the user
        response = client.post(
            f'/api/social/follow/{user_to_unfollow["id"]}',
            headers=auth_headers
        )
        assert response.status_code in [200, 201]
        
        # Then unfollow
        response = client.delete(
            f'/api/social/follow/{user_to_unfollow["id"]}',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify unfollow
        assert data['following'] is False
    
    def test_get_user_followers(self, client, auth_headers, multiple_test_users, auth_client):
        """Test getting a user's followers."""
        user_id = multiple_test_users[0]['id']
        
        # Get followers
        response = client.get(f'/api/social/users/{user_id}/followers')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'followers' in data
        assert 'total' in data
        assert 'page' in data
    
    def test_get_user_following(self, client, auth_headers, multiple_test_users):
        """Test getting users that a user is following."""
        user_id = multiple_test_users[0]['id']
        
        # Get following
        response = client.get(f'/api/social/users/{user_id}/following')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'following' in data
        assert 'total' in data
        assert 'page' in data
    
    def test_user_activity_feed(self, client, auth_headers, multiple_test_users, sample_user_follows):
        """Test getting activity feed from followed users."""
        response = client.get('/api/social/activity/feed', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'activities' in data
        assert 'total' in data
        assert 'page' in data
        
        # Verify activity structure
        if data['activities']:
            activity = data['activities'][0]
            assert 'type' in activity
            assert 'user' in activity
            assert 'timestamp' in activity
            assert 'content' in activity


@pytest.mark.real_integration
class TestUserProfilesReal:
    """Test user profile system with real database operations."""
    
    def test_get_public_user_profile(self, client, multiple_test_users):
        """Test getting a public user profile."""
        user_id = multiple_test_users[0]['id']
        
        response = client.get(f'/api/social/users/{user_id}/profile')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify profile structure
        assert 'id' in data
        assert 'username' in data
        assert 'bio' in data
        assert 'member_since' in data
        assert 'statistics' in data
        assert 'lists' in data
        
        # Verify statistics structure
        stats = data['statistics']
        assert 'total_anime' in stats
        assert 'total_manga' in stats
        assert 'completion_rate' in stats
    
    def test_get_user_public_lists(self, client, multiple_test_users, sample_custom_lists):
        """Test getting a user's public lists."""
        user_id = multiple_test_users[0]['id']
        
        response = client.get(f'/api/social/users/{user_id}/lists')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'lists' in data
        assert 'total' in data
        
        # Verify all returned lists are public
        for list_item in data['lists']:
            assert list_item['is_public'] is True
    
    def test_user_search(self, client, multiple_test_users):
        """Test searching for users."""
        search_term = multiple_test_users[0]['username'][:4]  # Search by partial username
        
        response = client.get(f'/api/social/users/search?q={search_term}')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'users' in data
        assert 'total' in data
        assert 'page' in data
        
        # Verify search results
        if data['users']:
            user = data['users'][0]
            assert 'id' in user
            assert 'username' in user
            assert 'avatar_url' in user
            
            # Verify search term appears in results
            assert search_term.lower() in user['username'].lower()


@pytest.mark.real_integration
class TestModerationSystemReal:
    """Test moderation system with real database operations."""
    
    def test_report_comment(self, client, auth_headers, sample_comments):
        """Test reporting a comment."""
        comment_id = sample_comments[0]['id']
        
        report_data = {
            'reason': 'spam',
            'description': 'This comment is spam and should be removed'
        }
        
        response = client.post(
            f'/api/social/comments/{comment_id}/report',
            headers=auth_headers,
            data=json.dumps(report_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify report creation
        assert data['reason'] == report_data['reason']
        assert data['description'] == report_data['description']
        assert data['status'] == 'pending'
        assert 'id' in data
        assert 'created_at' in data
    
    def test_report_review(self, client, auth_headers, sample_reviews):
        """Test reporting a review."""
        review_id = sample_reviews[0]['id']
        
        report_data = {
            'reason': 'inappropriate_content',
            'description': 'This review contains inappropriate language'
        }
        
        response = client.post(
            f'/api/social/reviews/{review_id}/report',
            headers=auth_headers,
            data=json.dumps(report_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify report creation
        assert data['reason'] == report_data['reason']
        assert data['description'] == report_data['description']
        assert data['status'] == 'pending'
    
    def test_get_user_reports(self, client, auth_headers):
        """Test getting reports submitted by a user."""
        response = client.get('/api/social/reports/my-reports', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'reports' in data
        assert 'total' in data
        assert 'page' in data
    
    def test_moderation_queue(self, client, auth_headers):
        """Test accessing moderation queue (requires moderator permissions)."""
        response = client.get('/api/moderation/reports', headers=auth_headers)
        
        # Most users should not have access
        assert response.status_code in [403, 404]
        
        # If user has moderator permissions, should return queue
        if response.status_code == 200:
            data = json.loads(response.data)
            assert 'reports' in data
            assert 'total' in data
            assert 'page' in data


@pytest.mark.real_integration
@pytest.mark.performance
class TestSocialFeaturesPerformance:
    """Performance tests for social features."""
    
    def test_comments_loading_performance(self, client, load_test_items, sample_items_data, benchmark_timer):
        """Test performance of loading comments."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        with benchmark_timer('comments_loading'):
            response = client.get(f'/api/social/comments/item/{item_uid}')
            assert response.status_code == 200
    
    def test_reviews_loading_performance(self, client, load_test_items, sample_items_data, benchmark_timer):
        """Test performance of loading reviews."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        with benchmark_timer('reviews_loading'):
            response = client.get(f'/api/social/reviews/{item_uid}')
            assert response.status_code == 200
    
    def test_user_profile_loading_performance(self, client, multiple_test_users, benchmark_timer):
        """Test performance of loading user profiles."""
        user_id = multiple_test_users[0]['id']
        
        with benchmark_timer('user_profile_loading'):
            response = client.get(f'/api/social/users/{user_id}/profile')
            assert response.status_code == 200
    
    def test_activity_feed_performance(self, client, auth_headers, benchmark_timer):
        """Test performance of activity feed."""
        with benchmark_timer('activity_feed'):
            response = client.get('/api/social/activity/feed', headers=auth_headers)
            assert response.status_code == 200


@pytest.mark.real_integration
@pytest.mark.security
class TestSocialFeaturesSecurity:
    """Security tests for social features."""
    
    def test_comment_content_validation(self, client, auth_headers, load_test_items, sample_items_data):
        """Test comment content validation and sanitization."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # Test XSS prevention
        malicious_comment = {
            'content': '<script>alert("xss")</script>This is a malicious comment',
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/comments/item/{item_uid}',
            headers=auth_headers,
            data=json.dumps(malicious_comment),
            content_type='application/json'
        )
        
        # Should either reject or sanitize
        if response.status_code == 201:
            data = json.loads(response.data)
            # Verify script tags are removed/escaped
            assert '<script>' not in data['content']
        else:
            # Should reject with 400 Bad Request
            assert response.status_code == 400
    
    def test_review_content_validation(self, client, auth_headers, load_test_items, sample_items_data):
        """Test review content validation and sanitization."""
        item_uid = sample_items_data.iloc[0]['uid']
        
        # Test extremely long review
        long_content = 'x' * 10000
        review_data = {
            'overall_rating': 8,
            'content': long_content,
            'is_spoiler': False
        }
        
        response = client.post(
            f'/api/social/reviews/{item_uid}',
            headers=auth_headers,
            data=json.dumps(review_data),
            content_type='application/json'
        )
        
        # Should either reject or truncate
        if response.status_code == 201:
            data = json.loads(response.data)
            # Should be truncated to reasonable length
            assert len(data['content']) < 10000
        else:
            # Should reject with 400 Bad Request
            assert response.status_code == 400
    
    def test_user_privacy_enforcement(self, client, auth_headers, multiple_test_users, sample_privacy_settings):
        """Test that privacy settings are properly enforced."""
        user_id = multiple_test_users[0]['id']
        
        # If user has private profile, should not be accessible
        if sample_privacy_settings['profile_visibility'] == 'private':
            response = client.get(f'/api/social/users/{user_id}/profile')
            assert response.status_code in [403, 404]
        
        # If user has private lists, should not be accessible
        if sample_privacy_settings['list_visibility'] == 'private':
            response = client.get(f'/api/social/users/{user_id}/lists')
            assert response.status_code in [403, 404]
    
    def test_moderation_authorization(self, client, auth_headers):
        """Test that moderation endpoints require proper authorization."""
        # Regular users should not have access to moderation endpoints
        moderation_endpoints = [
            '/api/moderation/reports',
            '/api/moderation/actions',
            '/api/moderation/users/ban',
            '/api/moderation/statistics'
        ]
        
        for endpoint in moderation_endpoints:
            response = client.get(endpoint, headers=auth_headers)
            # Should return 403 (forbidden) for non-moderator users
            assert response.status_code in [403, 404]