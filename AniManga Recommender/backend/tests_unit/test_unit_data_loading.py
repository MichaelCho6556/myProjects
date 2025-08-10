"""
Real integration tests for data loading functions.
NO MOCKS - tests actual database operations and TF-IDF computation.
"""
import pytest
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import os
import sys
from sqlalchemy import text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import (
    load_data_and_tfidf_from_supabase, 
    parse_list_cols_on_load, 
    load_data_and_tfidf,
    create_combined_text_features,
    PROCESSED_DATA_PATH, 
    BASE_DATA_PATH, 
    PROCESSED_DATA_FILENAME
)
from tests.test_utils import TestDataManager


class TestLoadDataAndTfidf:
    """Test the load_data_and_tfidf function with real database operations."""
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_load_data_success(self, database_connection, test_data_manager):
        """Test successful data loading and TF-IDF computation with real data."""
        # Create test items in database
        items = []
        for i in range(5):
            items.append(test_data_manager.create_test_item(
                uid=f"test_load_{i}",
                title=f"Test Item {i}",
                item_type="anime" if i % 2 == 0 else "manga",
                synopsis=f"This is a test synopsis for item {i} with unique content",
                score=7.0 + (i * 0.2),
                episodes=12 if i % 2 == 0 else None,
                genres=["Action", "Adventure"] if i % 2 == 0 else ["Drama", "Romance"],
                themes=["School"] if i < 3 else ["Fantasy"]
            ))
        
        # Reset global variables to force reload
        import app
        app.df_processed = None
        app.tfidf_vectorizer_global = None
        app.tfidf_matrix_global = None
        app.uid_to_idx = None
        
        # Load data from database
        load_data_and_tfidf_from_supabase()
        
        # Verify data was loaded
        assert app.df_processed is not None
        assert len(app.df_processed) >= len(items)
        
        # Verify TF-IDF was computed
        assert app.tfidf_vectorizer_global is not None
        assert app.tfidf_matrix_global is not None
        
        # Verify UID mapping was created
        assert app.uid_to_idx is not None
        
        # Verify our test items are in the loaded data
        for item in items:
            assert item['uid'] in app.df_processed['uid'].values
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_load_data_already_loaded(self, database_connection, test_data_manager, capsys):
        """Test that data loading is skipped when already loaded."""
        # Create a test item
        test_data_manager.create_test_item(
            uid="test_already_loaded",
            title="Test Already Loaded"
        )
        
        # First load
        import app
        app.df_processed = None
        app.tfidf_matrix_global = None
        load_data_and_tfidf_from_supabase()
        
        # Store references to loaded data
        original_df = app.df_processed
        original_matrix = app.tfidf_matrix_global
        
        # Try to load again
        load_data_and_tfidf_from_supabase()
        
        # Verify same objects (not reloaded)
        assert app.df_processed is original_df
        assert app.tfidf_matrix_global is original_matrix
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_load_data_empty_database(self, database_connection):
        """Test handling of empty database (no items)."""
        # Clear all items from database
        database_connection.execute(text("DELETE FROM items"))
        database_connection.commit()
        
        # Reset globals
        import app
        app.df_processed = None
        app.tfidf_vectorizer_global = None
        app.tfidf_matrix_global = None
        app.uid_to_idx = None
        
        # Load data - should handle empty gracefully
        load_data_and_tfidf_from_supabase()
        
        # Should still set globals, but with empty/minimal data
        assert app.df_processed is not None
        assert len(app.df_processed) == 0 or app.df_processed.empty
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_load_data_with_special_characters(self, database_connection, test_data_manager):
        """Test loading data with special characters and edge cases."""
        # Create items with special characters
        special_items = [
            test_data_manager.create_test_item(
                uid="test_special_1",
                title="Test with 日本語 characters",
                synopsis="Synopsis with emojis 🎌 and special chars: @#$%"
            ),
            test_data_manager.create_test_item(
                uid="test_special_2",
                title="Test with <HTML> tags & entities",
                synopsis="Contains &amp; &lt; &gt; entities"
            ),
            test_data_manager.create_test_item(
                uid="test_special_3",
                title="Test with null values",
                synopsis=None,  # Null synopsis
                genres=None,    # Null genres
                themes=None     # Null themes
            )
        ]
        
        # Reset and load
        import app
        app.df_processed = None
        app.tfidf_vectorizer_global = None
        app.tfidf_matrix_global = None
        app.uid_to_idx = None
        
        load_data_and_tfidf_from_supabase()
        
        # Verify all special items were loaded
        assert app.df_processed is not None
        for item in special_items:
            assert item['uid'] in app.df_processed['uid'].values
        
        # Verify TF-IDF handles special characters
        assert app.tfidf_matrix_global is not None
        assert app.tfidf_matrix_global.shape[0] >= len(special_items)
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_load_data_compatibility_wrapper(self, database_connection, test_data_manager):
        """Test that load_data_and_tfidf wrapper works correctly."""
        # Create test data
        test_data_manager.create_test_item(
            uid="test_wrapper",
            title="Test Wrapper Item"
        )
        
        # Reset globals
        import app
        app.df_processed = None
        app.tfidf_matrix_global = None
        
        # Use the wrapper function
        load_data_and_tfidf()
        
        # Verify data was loaded
        assert app.df_processed is not None
        assert "test_wrapper" in app.df_processed['uid'].values
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_combined_text_features_creation(self, database_connection, test_data_manager):
        """Test that combined text features are created correctly."""
        # Create items with various text fields
        items = [
            test_data_manager.create_test_item(
                uid="test_features_1",
                title="Feature Test One",
                synopsis="Test synopsis one",
                genres=["Action", "Comedy"],
                themes=["School", "Sports"]
            ),
            test_data_manager.create_test_item(
                uid="test_features_2",
                title="Feature Test Two",
                synopsis="Test synopsis two",
                genres=["Drama"],
                themes=None  # Missing themes
            )
        ]
        
        # Load data
        import app
        app.df_processed = None
        app.tfidf_matrix_global = None
        
        load_data_and_tfidf_from_supabase()
        
        # Check that combined_text_features column exists
        assert 'combined_text_features' in app.df_processed.columns
        
        # Verify features contain expected content
        feature_item = app.df_processed[app.df_processed['uid'] == 'test_features_1']
        if not feature_item.empty:
            combined_text = feature_item['combined_text_features'].iloc[0]
            # Should contain genres and themes
            assert 'Action' in combined_text or 'Comedy' in combined_text
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_uid_to_idx_mapping(self, database_connection, test_data_manager):
        """Test that UID to index mapping is created correctly."""
        # Create test items
        items = []
        for i in range(3):
            items.append(test_data_manager.create_test_item(
                uid=f"test_mapping_{i}",
                title=f"Mapping Test {i}"
            ))
        
        # Load data
        import app
        app.df_processed = None
        app.uid_to_idx = None
        
        load_data_and_tfidf_from_supabase()
        
        # Verify mapping exists
        assert app.uid_to_idx is not None
        
        # Verify our items are in the mapping
        for item in items:
            assert item['uid'] in app.uid_to_idx.index
            # The value should be a valid index
            idx = app.uid_to_idx[item['uid']]
            assert 0 <= idx < len(app.df_processed)
            # The index should point to the correct item
            assert app.df_processed.iloc[idx]['uid'] == item['uid']


class TestDataLoadingIntegration:
    """Test data loading with more complex real scenarios."""
    
    @pytest.mark.real_integration
    def test_path_construction(self):
        """Test that data path constants are constructed correctly."""
        assert BASE_DATA_PATH == "data"
        assert PROCESSED_DATA_FILENAME == "processed_media.csv"
        expected_path = os.path.join(BASE_DATA_PATH, PROCESSED_DATA_FILENAME)
        assert PROCESSED_DATA_PATH == expected_path
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_combined_text_features_with_nan(self, database_connection, test_data_manager):
        """Test handling of NaN values in text features."""
        # Create items with various missing fields
        items = [
            test_data_manager.create_test_item(
                uid="test_nan_1",
                title="NaN Test 1",
                synopsis=None,  # None synopsis
                genres=["Action"],
                themes=["School"]
            ),
            test_data_manager.create_test_item(
                uid="test_nan_2",
                title="NaN Test 2",
                synopsis="",  # Empty synopsis
                genres=None,  # None genres
                themes=None   # None themes
            ),
            test_data_manager.create_test_item(
                uid="test_nan_3",
                title="NaN Test 3",
                synopsis="Valid synopsis",
                genres=[],  # Empty list
                themes=[]   # Empty list
            )
        ]
        
        # Load data
        import app
        app.df_processed = None
        app.tfidf_matrix_global = None
        
        load_data_and_tfidf_from_supabase()
        
        # Verify all items were loaded
        assert app.df_processed is not None
        for item in items:
            assert item['uid'] in app.df_processed['uid'].values
        
        # Verify TF-IDF handles NaN/empty values
        assert app.tfidf_matrix_global is not None
        # Should not have any NaN in the matrix
        assert not np.isnan(app.tfidf_matrix_global.data).any()
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_concurrent_data_loading(self, database_connection, test_data_manager):
        """Test that concurrent calls to load data are handled safely."""
        import threading
        import time
        
        # Create test data
        test_data_manager.create_test_item(
            uid="test_concurrent",
            title="Concurrent Test"
        )
        
        # Reset globals
        import app
        app.df_processed = None
        app.tfidf_matrix_global = None
        
        results = []
        errors = []
        
        def load_data_thread():
            try:
                load_data_and_tfidf_from_supabase()
                results.append(True)
            except Exception as e:
                errors.append(str(e))
        
        # Start multiple threads
        threads = []
        for _ in range(3):
            t = threading.Thread(target=load_data_thread)
            threads.append(t)
            t.start()
        
        # Wait for all threads
        for t in threads:
            t.join(timeout=10)
        
        # Should complete without errors
        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert len(results) == 3
        
        # Data should be loaded
        assert app.df_processed is not None
        assert "test_concurrent" in app.df_processed['uid'].values
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_large_dataset_performance(self, database_connection, test_data_manager):
        """Test loading performance with a larger dataset."""
        import time
        
        # Create a moderate number of items (not too many for test performance)
        num_items = 100
        for i in range(num_items):
            test_data_manager.create_test_item(
                uid=f"test_perf_{i}",
                title=f"Performance Test Item {i}",
                synopsis=f"This is a unique synopsis for item {i} with various keywords",
                genres=["Action", "Drama"] if i % 2 == 0 else ["Comedy", "Romance"],
                themes=["School"] if i % 3 == 0 else ["Fantasy", "Adventure"]
            )
        
        # Reset globals
        import app
        app.df_processed = None
        app.tfidf_matrix_global = None
        
        # Measure loading time
        start_time = time.time()
        load_data_and_tfidf_from_supabase()
        load_time = time.time() - start_time
        
        # Verify data loaded
        assert app.df_processed is not None
        assert len(app.df_processed) >= num_items
        
        # Loading should complete in reasonable time (adjust as needed)
        assert load_time < 30, f"Loading took too long: {load_time} seconds"
        
        # TF-IDF should be computed
        assert app.tfidf_matrix_global is not None
        assert app.tfidf_matrix_global.shape[0] >= num_items
    
    @pytest.mark.real_integration
    @pytest.mark.requires_db
    def test_data_consistency_after_reload(self, database_connection, test_data_manager):
        """Test that data remains consistent across reloads."""
        # Create initial items
        initial_items = []
        for i in range(3):
            initial_items.append(test_data_manager.create_test_item(
                uid=f"test_consistent_{i}",
                title=f"Consistency Test {i}"
            ))
        
        # First load
        import app
        app.df_processed = None
        app.uid_to_idx = None
        
        load_data_and_tfidf_from_supabase()
        
        # Store initial state
        initial_count = len(app.df_processed)
        initial_uids = set(app.df_processed['uid'].values)
        
        # Add more items
        test_data_manager.create_test_item(
            uid="test_consistent_new",
            title="New Consistency Test"
        )
        
        # Force reload
        app.df_processed = None
        app.tfidf_matrix_global = None
        app.uid_to_idx = None
        
        load_data_and_tfidf_from_supabase()
        
        # Verify all initial items still present
        for uid in initial_uids:
            assert uid in app.df_processed['uid'].values
        
        # Verify new item is also present
        assert "test_consistent_new" in app.df_processed['uid'].values
        
        # Count should have increased
        assert len(app.df_processed) > initial_count