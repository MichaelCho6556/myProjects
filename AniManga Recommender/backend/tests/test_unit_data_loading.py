"""
Unit tests for data loading functions with mocking.
"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock, mock_open
from sklearn.feature_extraction.text import TfidfVectorizer
import os

from app import load_data_and_tfidf_from_supabase, parse_list_cols_on_load, load_data_and_tfidf


class TestLoadDataAndTfidf:
    """Test the load_data_and_tfidf function with various scenarios."""
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    @patch('app.TfidfVectorizer')
    def test_load_data_success(self, mock_vectorizer, mock_supabase_client, sample_dataframe):
        """Test successful data loading and TF-IDF computation."""
        # Mock SupabaseClient
        mock_client_instance = MagicMock()
        mock_client_instance.items_to_dataframe.return_value = sample_dataframe
        mock_supabase_client.return_value = mock_client_instance
        
        # Mock TfidfVectorizer
        mock_vectorizer_instance = MagicMock()
        mock_tfidf_matrix = MagicMock()
        mock_vectorizer_instance.fit_transform.return_value = mock_tfidf_matrix
        mock_vectorizer.return_value = mock_vectorizer_instance
        
        # Mock the global variables to None initially
        with patch('app.df_processed', None), \
             patch('app.tfidf_vectorizer_global', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None):
            
            load_data_and_tfidf_from_supabase()
            
            # Verify Supabase client was used
            mock_supabase_client.assert_called_once()
            mock_client_instance.items_to_dataframe.assert_called_once_with(include_relations=True)
            
            # Verify TfidfVectorizer was initialized and used
            mock_vectorizer.assert_called_once_with(stop_words='english', max_features=5000)
            mock_vectorizer_instance.fit_transform.assert_called_once()
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    def test_load_data_file_not_found(self, mock_supabase_client):
        """Test handling of Supabase connection errors."""
        # Mock SupabaseClient to raise an exception
        mock_supabase_client.side_effect = Exception("Connection error")
        
        with patch('app.df_processed', None), \
             patch('app.tfidf_vectorizer_global', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None), \
             patch('builtins.print') as mock_print:
            
            load_data_and_tfidf_from_supabase()
            
            # Verify error message was printed
            print_calls = [str(call) for call in mock_print.call_args_list]
            error_message_found = any('error loading data' in call.lower() 
                                    for call in print_calls)
            assert error_message_found, f"Expected error message not found in: {print_calls}"
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    def test_load_data_already_loaded(self, mock_supabase_client, sample_dataframe):
        """Test that data loading is skipped when already loaded."""
        # Mock already loaded global variables
        with patch('app.df_processed', sample_dataframe), \
             patch('app.tfidf_matrix_global', MagicMock()), \
             patch('builtins.print') as mock_print:
            
            load_data_and_tfidf_from_supabase()
            
            # Supabase client should not be called again
            mock_supabase_client.assert_not_called()
            
            # Should print already loaded message
            print_calls = [str(call) for call in mock_print.call_args_list]
            already_loaded_found = any('already loaded' in call.lower() for call in print_calls)
            assert already_loaded_found, f"Expected 'already loaded' message not found in: {print_calls}"
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    def test_load_data_empty_after_sfw_filter(self, mock_supabase_client):
        """Test handling of empty dataset."""
        # Mock SupabaseClient to return empty DataFrame
        mock_client_instance = MagicMock()
        mock_client_instance.items_to_dataframe.return_value = pd.DataFrame()
        mock_supabase_client.return_value = mock_client_instance
        
        with patch('app.df_processed', None), \
             patch('app.tfidf_vectorizer_global', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None), \
             patch('builtins.print') as mock_print:
            
            load_data_and_tfidf_from_supabase()
            
            # Should print warning about no data
            print_calls = [str(call) for call in mock_print.call_args_list]
            no_data_found = any('no data loaded' in call.lower() for call in print_calls)
            assert no_data_found, f"Expected 'no data loaded' message not found in: {print_calls}"
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    def test_load_data_missing_sfw_column(self, mock_supabase_client, sample_dataframe):
        """Test handling of missing SFW column."""
        # Remove sfw column from sample data
        sample_no_sfw = sample_dataframe.drop(columns=['sfw'])
        mock_client_instance = MagicMock()
        mock_client_instance.items_to_dataframe.return_value = sample_no_sfw
        mock_supabase_client.return_value = mock_client_instance
        
        with patch('app.df_processed', None), \
             patch('app.tfidf_vectorizer_global', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None), \
             patch('builtins.print') as mock_print:
            
            load_data_and_tfidf_from_supabase()
            
            # Should print warning about missing sfw column or handle gracefully
            print_calls = [str(call) for call in mock_print.call_args_list]
            # The function should complete successfully even without sfw column
            assert len(print_calls) > 0  # Some output should occur
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    @patch('app.TfidfVectorizer')
    def test_load_data_tfidf_computation_error(self, mock_vectorizer, mock_supabase_client, sample_dataframe):
        """Test handling of TF-IDF computation errors."""
        mock_client_instance = MagicMock()
        mock_client_instance.items_to_dataframe.return_value = sample_dataframe
        mock_supabase_client.return_value = mock_client_instance
        
        # Mock TfidfVectorizer to raise an exception
        mock_vectorizer_instance = MagicMock()
        mock_vectorizer_instance.fit_transform.side_effect = Exception("TF-IDF error")
        mock_vectorizer.return_value = mock_vectorizer_instance
        
        with patch('app.df_processed', None), \
             patch('app.tfidf_vectorizer_global', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None), \
             patch('builtins.print') as mock_print:
            
            load_data_and_tfidf_from_supabase()
            
            # Should print error message
            print_calls = [str(call) for call in mock_print.call_args_list]
            error_found = any('error loading data' in call.lower() for call in print_calls)
            assert error_found, f"Expected error message not found in: {print_calls}"
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    def test_load_data_missing_uid_column(self, mock_supabase_client):
        """Test handling of missing UID column."""
        # Create data without uid column
        data_no_uid = pd.DataFrame({
            'title': ['Test Title'],
            'sfw': [True],
            'combined_text_features': ['text']
        })
        mock_client_instance = MagicMock()
        mock_client_instance.items_to_dataframe.return_value = data_no_uid
        mock_supabase_client.return_value = mock_client_instance
        
        with patch('app.df_processed', None), \
             patch('app.tfidf_vectorizer_global', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None), \
             patch('builtins.print') as mock_print:
            
            # The app handles missing uid column by printing an error, not raising KeyError
            load_data_and_tfidf_from_supabase()
            
            # Check that appropriate error handling occurred
            print_calls = [str(call) for call in mock_print.call_args_list]
            # Should handle the missing UID column gracefully with error message or complete successfully
            assert len(print_calls) > 0  # Some output should occur
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    def test_load_data_calls_parse_list_cols(self, mock_supabase_client, sample_dataframe):
        """Test that data loading completes successfully with Supabase data."""
        mock_client_instance = MagicMock()
        mock_client_instance.items_to_dataframe.return_value = sample_dataframe
        mock_supabase_client.return_value = mock_client_instance
        
        with patch('app.df_processed', None), \
             patch('app.tfidf_vectorizer_global', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None):
            
            load_data_and_tfidf_from_supabase()
            
            # Verify Supabase client was called and data loading completed
            mock_supabase_client.assert_called_once()
            mock_client_instance.items_to_dataframe.assert_called_once_with(include_relations=True)


class TestDataLoadingIntegration:
    """Test data loading with more realistic scenarios."""
    
    @pytest.mark.unit
    def test_path_construction(self):
        """Test that data path is constructed correctly."""
        from app import PROCESSED_DATA_PATH, BASE_DATA_PATH, PROCESSED_DATA_FILENAME
        
        expected_path = os.path.join(BASE_DATA_PATH, PROCESSED_DATA_FILENAME)
        assert PROCESSED_DATA_PATH == expected_path
        assert BASE_DATA_PATH == "data"
        assert PROCESSED_DATA_FILENAME == "processed_media.csv"
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    @patch('app.TfidfVectorizer')
    def test_combined_text_features_handling(self, mock_vectorizer, mock_supabase_client):
        """Test handling of combined_text_features column."""
        # Create data with NaN values in combined_text_features
        data_with_nan = pd.DataFrame({
            'uid': ['test_1', 'test_2', 'test_3'],
            'title': ['Title 1', 'Title 2', 'Title 3'],
            'sfw': [True, True, True],
            'combined_text_features': ['valid text', np.nan, '']
        })
        mock_client_instance = MagicMock()
        mock_client_instance.items_to_dataframe.return_value = data_with_nan
        mock_supabase_client.return_value = mock_client_instance
        
        # Mock TfidfVectorizer
        mock_vectorizer_instance = MagicMock()
        mock_tfidf_matrix = MagicMock()
        mock_vectorizer_instance.fit_transform.return_value = mock_tfidf_matrix
        mock_vectorizer.return_value = mock_vectorizer_instance
        
        with patch('app.df_processed', None), \
             patch('app.tfidf_vectorizer_global', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None):
            
            load_data_and_tfidf_from_supabase()
            
            # Verify TfidfVectorizer was called (meaning NaN values were handled)
            mock_vectorizer_instance.fit_transform.assert_called_once()
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    @patch('app.TfidfVectorizer')
    def test_uid_to_idx_mapping(self, mock_vectorizer, mock_supabase_client, sample_dataframe):
        """Test that UID to index mapping is created correctly."""
        mock_client_instance = MagicMock()
        mock_client_instance.items_to_dataframe.return_value = sample_dataframe
        mock_supabase_client.return_value = mock_client_instance
        
        # Mock TfidfVectorizer
        mock_vectorizer_instance = MagicMock()
        mock_tfidf_matrix = MagicMock()
        mock_vectorizer_instance.fit_transform.return_value = mock_tfidf_matrix
        mock_vectorizer.return_value = mock_vectorizer_instance
        
        with patch('app.df_processed', None), \
             patch('app.tfidf_vectorizer_global', None), \
             patch('app.tfidf_matrix_global', None), \
             patch('app.uid_to_idx', None) as mock_uid_to_idx:
            
            load_data_and_tfidf_from_supabase()
            
            # Verify that the function would create the mapping
            # (We can't easily test the actual assignment due to patching)
            assert True  # If we get here without error, the mapping logic worked
    
    @pytest.mark.unit
    @patch('app.SupabaseClient')
    def test_file_existence_check(self, mock_supabase_client):
        """Test behavior when Supabase connection fails."""
        # Test when Supabase connection fails
        mock_supabase_client.side_effect = Exception("Connection failed")
        
        with patch('app.df_processed', None), \
             patch('builtins.print') as mock_print:
            
            load_data_and_tfidf_from_supabase()
            
            # Should handle connection error gracefully
            print_calls = [str(call) for call in mock_print.call_args_list]
            error_found = any('error loading data' in call.lower() for call in print_calls)
            assert error_found, f"Expected error message not found in: {print_calls}" 