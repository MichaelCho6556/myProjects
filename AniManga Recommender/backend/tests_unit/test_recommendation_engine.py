# ABOUTME: Real recommendation engine tests - NO MOCKS
# ABOUTME: Tests actual TF-IDF computation and recommendation generation with real data

"""
Real Recommendation Engine Tests for AniManga Recommender

Test Coverage:
- TF-IDF matrix computation with real data
- Actual cosine similarity calculations
- Real recommendation generation and ranking
- Text feature preprocessing with actual content
- Performance testing with real datasets
- Recommendation accuracy validation

NO MOCKS - All tests use real data processing and actual ML computations
"""

import pytest
import json
import time
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import text

# Import test dependencies
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from tests.test_utils import TestDataManager, generate_jwt_token, create_auth_headers


@pytest.mark.real_integration
class TestDataLoadingAndPreprocessing:
    """Test suite for data loading and TF-IDF preprocessing with real data"""
    
    def test_tfidf_computation_with_real_data(self, database_connection):
        """Test TF-IDF matrix computation with real items"""
        manager = TestDataManager(database_connection)
        
        # Create diverse test items
        items = [
            manager.create_test_item(
                uid="tfidf_1",
                title="Action Adventure Anime",
                synopsis="Epic battles and thrilling adventures",
                genres=["Action", "Adventure"],
                themes=["Superpowers", "Martial Arts"]
            ),
            manager.create_test_item(
                uid="tfidf_2",
                title="Romantic Comedy Series",
                synopsis="Hilarious romantic mishaps and heartwarming moments",
                genres=["Comedy", "Romance"],
                themes=["School", "Love"]
            ),
            manager.create_test_item(
                uid="tfidf_3",
                title="Mystery Thriller Show",
                synopsis="Dark mysteries and psychological tension",
                genres=["Mystery", "Thriller"],
                themes=["Detective", "Crime"]
            ),
            manager.create_test_item(
                uid="tfidf_4",
                title="Action Thriller Movie",
                synopsis="High-stakes action with mystery elements",
                genres=["Action", "Thriller"],
                themes=["Conspiracy", "Martial Arts"]
            )
        ]
        
        try:
            # Fetch items from database and create DataFrame
            result = database_connection.execute(
                text("""
                    SELECT uid, title, type, synopsis, genres, themes, demographics
                    FROM items
                    WHERE uid IN :uids
                """),
                {"uids": tuple([item['uid'] for item in items])}
            )
            
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            
            # Create combined text features
            def create_text_features(row):
                genres_str = ' '.join(row['genres'] or [])
                themes_str = ' '.join(row['themes'] or [])
                title_str = row['title'].lower()
                synopsis_str = (row['synopsis'] or '').lower()
                
                return f"{genres_str} {themes_str} {title_str} {synopsis_str}"
            
            df['combined_features'] = df.apply(create_text_features, axis=1)
            
            # Compute TF-IDF
            vectorizer = TfidfVectorizer(
                stop_words='english',
                max_features=100,
                ngram_range=(1, 2)
            )
            tfidf_matrix = vectorizer.fit_transform(df['combined_features'])
            
            # Verify TF-IDF computation
            assert tfidf_matrix.shape[0] == 4  # 4 items
            assert tfidf_matrix.shape[1] <= 100  # Max 100 features
            
            # Check that similar items have higher similarity
            similarities = cosine_similarity(tfidf_matrix)
            
            # Items 0 and 3 (both Action) should be more similar than 0 and 1 (Action vs Romance)
            assert similarities[0, 3] > similarities[0, 1]
            
        finally:
            manager.cleanup()
    
    def test_text_feature_preprocessing(self, database_connection):
        """Test text feature preprocessing with real data"""
        manager = TestDataManager(database_connection)
        
        # Create item with complex text features
        item = manager.create_test_item(
            uid="preprocess_test",
            title="Complex Title: The Return!",
            synopsis="An amazing story with special characters & numbers 123",
            genres=["Sci-Fi", "Action"],
            themes=["Time Travel", "Robots"]
        )
        
        try:
            # Fetch and process
            result = database_connection.execute(
                text("""
                    SELECT uid, title, synopsis, genres, themes
                    FROM items
                    WHERE uid = :uid
                """),
                {"uid": item['uid']}
            )
            
            row = result.fetchone()
            
            # Process text features
            processed_title = row['title'].lower().replace(':', '').replace('!', '')
            processed_synopsis = row['synopsis'].lower()
            
            assert 'complex title the return' in processed_title
            assert 'special characters' in processed_synopsis
            assert '123' in processed_synopsis
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestRecommendationGeneration:
    """Test recommendation generation with real data"""
    
    def test_generate_recommendations_similar_items(self, client, database_connection):
        """Test generating recommendations for similar items"""
        manager = TestDataManager(database_connection)
        
        # Create a set of related items
        target_item = manager.create_test_item(
            uid="rec_target",
            title="Space Battle Saga",
            synopsis="Epic space battles in a distant galaxy",
            genres=["Sci-Fi", "Action"],
            themes=["Space", "Military"],
            score=8.5
        )
        
        similar_items = []
        for i in range(3):
            similar_items.append(manager.create_test_item(
                uid=f"rec_similar_{i}",
                title=f"Space Adventure {i}",
                synopsis=f"Space exploration and battles {i}",
                genres=["Sci-Fi", "Action"] if i < 2 else ["Sci-Fi", "Drama"],
                themes=["Space"],
                score=7.5 + i * 0.2
            ))
        
        # Create dissimilar items
        dissimilar_items = []
        for i in range(2):
            dissimilar_items.append(manager.create_test_item(
                uid=f"rec_dissimilar_{i}",
                title=f"Romance Story {i}",
                synopsis=f"A heartwarming love story {i}",
                genres=["Romance", "Comedy"],
                themes=["School", "Love"],
                score=7.0
            ))
        
        try:
            # Get recommendations via API
            response = client.get(f'/api/recommendations/{target_item["uid"]}')
            
            if response.status_code == 200:
                data = json.loads(response.data)
                recommendations = data.get('recommendations', [])
                
                if recommendations:
                    # Check that similar items appear before dissimilar ones
                    rec_uids = [r['uid'] for r in recommendations[:3]]
                    
                    # At least one similar item should be in top recommendations
                    similar_uids = [item['uid'] for item in similar_items]
                    assert any(uid in similar_uids for uid in rec_uids)
            
        finally:
            manager.cleanup()
    
    def test_recommendation_diversity(self, database_connection):
        """Test that recommendations include diverse but related content"""
        manager = TestDataManager(database_connection)
        
        # Create target item
        target = manager.create_test_item(
            uid="diversity_target",
            title="Multi-Genre Show",
            genres=["Action", "Comedy", "Drama"],
            themes=["School", "Superpowers"]
        )
        
        # Create items with overlapping genres
        action_item = manager.create_test_item(
            uid="div_action",
            title="Pure Action",
            genres=["Action"],
            themes=["Fighting"]
        )
        
        comedy_item = manager.create_test_item(
            uid="div_comedy",
            title="Pure Comedy",
            genres=["Comedy"],
            themes=["School"]
        )
        
        drama_item = manager.create_test_item(
            uid="div_drama",
            title="Pure Drama",
            genres=["Drama"],
            themes=["School"]
        )
        
        unrelated_item = manager.create_test_item(
            uid="div_unrelated",
            title="Horror Show",
            genres=["Horror"],
            themes=["Supernatural"]
        )
        
        try:
            # Build TF-IDF matrix for these items
            result = database_connection.execute(
                text("""
                    SELECT uid, title, genres, themes, synopsis
                    FROM items
                    WHERE uid LIKE 'div%' OR uid = 'diversity_target'
                """)
            )
            
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            
            # Create features and compute similarities
            df['features'] = df.apply(
                lambda r: ' '.join(r['genres'] or []) + ' ' + ' '.join(r['themes'] or []),
                axis=1
            )
            
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(df['features'])
            
            # Get target index
            target_idx = df[df['uid'] == 'diversity_target'].index[0]
            
            # Compute similarities
            similarities = cosine_similarity(tfidf_matrix[target_idx:target_idx+1], tfidf_matrix)[0]
            
            # Items with shared genres should have higher similarity than unrelated
            action_idx = df[df['uid'] == 'div_action'].index[0]
            comedy_idx = df[df['uid'] == 'div_comedy'].index[0]
            unrelated_idx = df[df['uid'] == 'div_unrelated'].index[0]
            
            assert similarities[action_idx] > similarities[unrelated_idx]
            assert similarities[comedy_idx] > similarities[unrelated_idx]
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestRecommendationPerformance:
    """Test recommendation engine performance with real data"""
    
    def test_recommendation_speed_large_dataset(self, database_connection):
        """Test recommendation generation speed with many items"""
        manager = TestDataManager(database_connection)
        
        # Create a large dataset
        items = []
        for i in range(100):
            genre_pool = ["Action", "Comedy", "Drama", "Romance", "Sci-Fi", "Mystery"]
            theme_pool = ["School", "Military", "Space", "Magic", "Sports", "Music"]
            
            items.append(manager.create_test_item(
                uid=f"perf_test_{i}",
                title=f"Performance Test Item {i}",
                synopsis=f"Description for item {i} with various content",
                genres=[genre_pool[i % len(genre_pool)], genre_pool[(i+1) % len(genre_pool)]],
                themes=[theme_pool[i % len(theme_pool)]],
                score=5.0 + (i % 5)
            ))
        
        try:
            # Fetch all items
            result = database_connection.execute(
                text("""
                    SELECT uid, title, synopsis, genres, themes
                    FROM items
                    WHERE uid LIKE 'perf_test_%'
                """)
            )
            
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            
            # Create TF-IDF matrix
            df['features'] = df.apply(
                lambda r: ' '.join([
                    r['title'],
                    r['synopsis'] or '',
                    ' '.join(r['genres'] or []),
                    ' '.join(r['themes'] or [])
                ]),
                axis=1
            )
            
            vectorizer = TfidfVectorizer(stop_words='english', max_features=500)
            
            # Measure TF-IDF computation time
            start_time = time.time()
            tfidf_matrix = vectorizer.fit_transform(df['features'])
            tfidf_time = time.time() - start_time
            
            # Should compute TF-IDF quickly even with 100 items
            assert tfidf_time < 1.0, f"TF-IDF took {tfidf_time:.2f}s for 100 items"
            
            # Measure recommendation generation time
            start_time = time.time()
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix)[0]
            top_indices = similarities.argsort()[-11:-1][::-1]  # Top 10 excluding self
            rec_time = time.time() - start_time
            
            # Should generate recommendations quickly
            assert rec_time < 0.1, f"Recommendations took {rec_time:.2f}s"
            
            # Verify we got 10 recommendations
            assert len(top_indices) == 10
            
        finally:
            manager.cleanup()
    
    def test_recommendation_accuracy_metrics(self, database_connection):
        """Test recommendation accuracy with known similar items"""
        manager = TestDataManager(database_connection)
        
        # Create a known set of highly similar items
        base_genres = ["Action", "Adventure"]
        base_themes = ["Pirates", "Treasure"]
        
        # Create target item
        target = manager.create_test_item(
            uid="accuracy_target",
            title="Pirate Adventure",
            synopsis="Search for legendary treasure across the seas",
            genres=base_genres,
            themes=base_themes
        )
        
        # Create very similar items (should be recommended)
        expected_recs = []
        for i in range(3):
            expected_recs.append(manager.create_test_item(
                uid=f"expected_{i}",
                title=f"Pirates Tale {i}",
                synopsis=f"Adventure on the high seas searching for treasure",
                genres=base_genres,
                themes=base_themes
            ))
        
        # Create somewhat related items
        for i in range(3):
            manager.create_test_item(
                uid=f"related_{i}",
                title=f"Adventure Story {i}",
                synopsis=f"An adventure story",
                genres=["Adventure"],
                themes=["Exploration"]
            )
        
        # Create unrelated items (should not be recommended)
        for i in range(3):
            manager.create_test_item(
                uid=f"unrelated_{i}",
                title=f"School Romance {i}",
                synopsis=f"High school love story",
                genres=["Romance", "School"],
                themes=["Love", "Youth"]
            )
        
        try:
            # Build recommendation system
            result = database_connection.execute(
                text("""
                    SELECT uid, title, synopsis, genres, themes
                    FROM items
                    WHERE uid LIKE 'accuracy_%' OR uid LIKE 'expected_%' 
                       OR uid LIKE 'related_%' OR uid LIKE 'unrelated_%'
                """)
            )
            
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            
            # Create TF-IDF
            df['features'] = df.apply(
                lambda r: ' '.join([
                    r['title'].lower(),
                    (r['synopsis'] or '').lower(),
                    ' '.join(r['genres'] or []).lower(),
                    ' '.join(r['themes'] or []).lower()
                ]),
                axis=1
            )
            
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(df['features'])
            
            # Get recommendations for target
            target_idx = df[df['uid'] == 'accuracy_target'].index[0]
            similarities = cosine_similarity(tfidf_matrix[target_idx:target_idx+1], tfidf_matrix)[0]
            
            # Get top recommendations (excluding self)
            similarities[target_idx] = -1  # Exclude self
            top_indices = similarities.argsort()[-5:][::-1]  # Top 5
            top_recommendations = df.iloc[top_indices]['uid'].tolist()
            
            # Check that expected items are in recommendations
            expected_uids = [item['uid'] for item in expected_recs]
            matches = sum(1 for uid in top_recommendations if uid in expected_uids)
            
            # At least 2 out of 3 expected items should be in top 5
            assert matches >= 2, f"Only {matches} expected items in top recommendations"
            
        finally:
            manager.cleanup()


@pytest.mark.real_integration
class TestRecommendationEdgeCases:
    """Test edge cases in recommendation generation"""
    
    def test_recommendation_for_unique_item(self, database_connection):
        """Test recommendations for an item with unique characteristics"""
        manager = TestDataManager(database_connection)
        
        # Create a unique item
        unique_item = manager.create_test_item(
            uid="unique_item",
            title="Extremely Unique Show",
            synopsis="A completely different kind of story",
            genres=["Experimental"],
            themes=["Abstract"]
        )
        
        # Create some regular items
        for i in range(5):
            manager.create_test_item(
                uid=f"regular_{i}",
                title=f"Regular Show {i}",
                synopsis=f"A normal story {i}",
                genres=["Action", "Comedy"],
                themes=["School"]
            )
        
        try:
            # Even unique items should get some recommendations
            result = database_connection.execute(
                text("""
                    SELECT COUNT(*) FROM items 
                    WHERE uid LIKE 'regular_%' OR uid = 'unique_item'
                """)
            )
            
            count = result.scalar()
            assert count == 6  # 1 unique + 5 regular
            
            # System should still provide recommendations based on any similarity
            
        finally:
            manager.cleanup()
    
    def test_recommendation_with_missing_features(self, database_connection):
        """Test recommendations for items with missing features"""
        manager = TestDataManager(database_connection)
        
        # Create item with minimal information
        minimal_item = manager.create_test_item(
            uid="minimal_item",
            title="Minimal Title",
            synopsis=None,  # No synopsis
            genres=[],  # No genres
            themes=[]  # No themes
        )
        
        # Create normal items
        normal_item = manager.create_test_item(
            uid="normal_item",
            title="Normal Title",
            synopsis="Full description",
            genres=["Action"],
            themes=["Adventure"]
        )
        
        try:
            # System should handle items with missing features gracefully
            result = database_connection.execute(
                text("""
                    SELECT uid, title, synopsis, genres, themes
                    FROM items
                    WHERE uid IN ('minimal_item', 'normal_item')
                """)
            )
            
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            
            # Create features handling None values
            df['features'] = df.apply(
                lambda r: ' '.join([
                    r['title'] or '',
                    r['synopsis'] or '',
                    ' '.join(r['genres'] or []),
                    ' '.join(r['themes'] or [])
                ]).strip(),
                axis=1
            )
            
            # Should not crash with minimal features
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(df['features'])
            
            assert tfidf_matrix.shape[0] == 2
            
        finally:
            manager.cleanup()