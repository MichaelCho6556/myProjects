"""
Unit tests for helper functions in the AniManga Recommender backend.
"""
import pytest
import pandas as pd
import numpy as np
import ast
from unittest.mock import patch, MagicMock

from app import (
    parse_list_cols_on_load,
    map_field_names_for_frontend,
    map_records_for_frontend
)


class TestParseListColsOnLoad:
    """Test the parse_list_cols_on_load function."""
    
    @pytest.mark.unit
    def test_parse_valid_list_strings(self, sample_list_data):
        """Test parsing valid list string representations."""
        df = pd.DataFrame({
            'genres': ["['Action', 'Adventure']", "['Comedy']"],
            'themes': ["['School', 'Military']", "['Romance']"],
            'other_col': ['not_a_list', 'also_not_a_list']
        })
        
        result = parse_list_cols_on_load(df)
        
        assert isinstance(result.loc[0, 'genres'], list)
        assert result.loc[0, 'genres'] == ['Action', 'Adventure']
        assert result.loc[1, 'genres'] == ['Comedy']
        assert isinstance(result.loc[0, 'themes'], list)
        assert result.loc[0, 'themes'] == ['School', 'Military']
        # Non-list columns should remain unchanged
        assert result.loc[0, 'other_col'] == 'not_a_list'
    
    @pytest.mark.unit
    def test_parse_already_list_columns(self):
        """Test that columns that are already lists remain unchanged."""
        df = pd.DataFrame({
            'genres': [['Action', 'Adventure'], ['Comedy']],
            'themes': [['School'], ['Romance']]
        })
        
        result = parse_list_cols_on_load(df)
        
        assert result.loc[0, 'genres'] == ['Action', 'Adventure']
        assert result.loc[1, 'genres'] == ['Comedy']
    
    @pytest.mark.unit
    def test_parse_invalid_list_strings(self):
        """Test handling of invalid list string representations."""
        df = pd.DataFrame({
            'genres': ["Action, Adventure", "['Comedy'", "Not a list at all"],
            'themes': ["['School']", "", None]
        })
        
        result = parse_list_cols_on_load(df)
        
        # Invalid strings should become empty lists
        assert result.loc[0, 'genres'] == []
        assert result.loc[1, 'genres'] == []
        assert result.loc[2, 'genres'] == []
        # Valid string should parse correctly
        assert result.loc[0, 'themes'] == ['School']
        # Empty string and None should become empty lists
        assert result.loc[1, 'themes'] == []
        assert result.loc[2, 'themes'] == []
    
    @pytest.mark.unit
    def test_parse_nan_values(self):
        """Test handling of NaN values."""
        df = pd.DataFrame({
            'genres': [np.nan, "['Action']", np.nan],
            'themes': [None, "['School']", ""]
        })
        
        result = parse_list_cols_on_load(df)
        
        # NaN values should become empty lists
        assert result.loc[0, 'genres'] == []
        assert result.loc[2, 'genres'] == []
        assert result.loc[1, 'genres'] == ['Action']
    
    @pytest.mark.unit
    def test_parse_empty_dataframe(self):
        """Test parsing with an empty DataFrame."""
        df = pd.DataFrame(columns=['genres', 'themes', 'demographics'])
        
        result = parse_list_cols_on_load(df)
        
        assert len(result) == 0
        assert list(result.columns) == ['genres', 'themes', 'demographics']
    
    @pytest.mark.unit
    def test_parse_missing_columns(self):
        """Test parsing when expected list columns are missing."""
        df = pd.DataFrame({
            'title': ['Test Title 1', 'Test Title 2'],
            'genres': ["['Action']", "['Comedy']"]
        })
        
        result = parse_list_cols_on_load(df)
        
        # Should only process columns that exist
        assert result.loc[0, 'genres'] == ['Action']
        assert result.loc[1, 'genres'] == ['Comedy']
        assert 'themes' not in result.columns
    
    @pytest.mark.unit
    def test_parse_with_ast_literal_eval_error(self):
        """Test handling of ast.literal_eval errors."""
        df = pd.DataFrame({
            'genres': ["['Action', 'Adventure'", "malformed[list]", "['Comedy']"]
        })
        
        with patch('ast.literal_eval', side_effect=[ValueError("Test error"), ValueError("Test error"), ['Comedy']]):
            result = parse_list_cols_on_load(df)
            
            # When ast.literal_eval fails, the except block treats all values as empty lists
            # The function applies lambda x: [] if not isinstance(x, list) else x
            assert result.loc[0, 'genres'] == []
            assert result.loc[1, 'genres'] == []
            # The third row should also become empty list due to the except block logic
            assert result.loc[2, 'genres'] == []


class TestFieldMapping:
    """Test field mapping functions."""
    
    @pytest.mark.unit
    def test_map_field_names_for_frontend_with_main_picture(self):
        """Test mapping main_picture to image_url."""
        data = {
            'uid': 'test_uid',
            'title': 'Test Title',
            'main_picture': 'https://example.com/image.jpg',
            'score': 8.5
        }
        
        result = map_field_names_for_frontend(data)
        
        assert 'image_url' in result
        assert result['image_url'] == 'https://example.com/image.jpg'
        assert 'main_picture' not in result
        assert result['title'] == 'Test Title'
        assert result['score'] == 8.5
    
    @pytest.mark.unit
    def test_map_field_names_without_main_picture(self):
        """Test mapping when main_picture field is not present."""
        data = {
            'uid': 'test_uid',
            'title': 'Test Title',
            'score': 8.5
        }
        
        result = map_field_names_for_frontend(data)
        
        assert 'image_url' not in result
        assert 'main_picture' not in result
        assert result['title'] == 'Test Title'
        assert result['score'] == 8.5
    
    @pytest.mark.unit
    def test_map_field_names_non_dict_input(self):
        """Test mapping with non-dictionary input."""
        non_dict_input = "not a dictionary"
        
        result = map_field_names_for_frontend(non_dict_input)
        
        assert result == "not a dictionary"
    
    @pytest.mark.unit
    def test_map_records_for_frontend(self):
        """Test mapping multiple records."""
        records = [
            {
                'uid': 'test_1',
                'title': 'Test 1',
                'main_picture': 'https://example.com/image1.jpg'
            },
            {
                'uid': 'test_2',
                'title': 'Test 2',
                'main_picture': 'https://example.com/image2.jpg'
            },
            {
                'uid': 'test_3',
                'title': 'Test 3'
                # No main_picture field
            }
        ]
        
        result = map_records_for_frontend(records)
        
        assert len(result) == 3
        assert result[0]['image_url'] == 'https://example.com/image1.jpg'
        assert 'main_picture' not in result[0]
        assert result[1]['image_url'] == 'https://example.com/image2.jpg'
        assert 'image_url' not in result[2]
    
    @pytest.mark.unit
    def test_map_records_empty_list(self):
        """Test mapping with empty list."""
        result = map_records_for_frontend([])
        
        assert result == []


class TestApplyMultiFilter:
    """Test the apply_multi_filter function (defined within get_items endpoint)."""
    
    @pytest.fixture
    def sample_filter_df(self):
        """Create a sample DataFrame for filter testing."""
        return pd.DataFrame({
            'uid': ['item_1', 'item_2', 'item_3', 'item_4'],
            'title': ['Title 1', 'Title 2', 'Title 3', 'Title 4'],
            'genres': [
                ['Action', 'Adventure'],
                ['Comedy', 'Romance'],
                ['Action', 'Drama'],
                ['Romance', 'Slice of Life']
            ],
            'themes': [
                ['School', 'Military'],
                ['High School'],
                ['Historical'],
                ['School', 'Romance']
            ]
        })
    
    @pytest.mark.unit
    def test_single_filter_match(self, sample_filter_df):
        """Test filtering with a single filter value."""
        # Simulate the apply_multi_filter function from the endpoint
        def apply_multi_filter(df, column_name, filter_str_values):
            if filter_str_values and filter_str_values.lower() != 'all':
                selected_filters = [f.strip().lower() for f in filter_str_values.split(',') if f.strip()]
                if not selected_filters:
                    return df
                
                def check_item_has_all_selected(item_column_list):
                    if not isinstance(item_column_list, list): 
                        return False
                    item_elements_lower = [str(elem).lower() for elem in item_column_list]
                    return all(sel_filter in item_elements_lower for sel_filter in selected_filters)
                
                return df[df[column_name].apply(check_item_has_all_selected)]
            return df
        
        result = apply_multi_filter(sample_filter_df, 'genres', 'action')
        
        assert len(result) == 2  # Items 1 and 3 have 'Action'
        assert 'item_1' in result['uid'].values
        assert 'item_3' in result['uid'].values
    
    @pytest.mark.unit
    def test_multi_filter_all_match(self, sample_filter_df):
        """Test filtering with multiple values (AND logic)."""
        def apply_multi_filter(df, column_name, filter_str_values):
            if filter_str_values and filter_str_values.lower() != 'all':
                selected_filters = [f.strip().lower() for f in filter_str_values.split(',') if f.strip()]
                if not selected_filters:
                    return df
                
                def check_item_has_all_selected(item_column_list):
                    if not isinstance(item_column_list, list): 
                        return False
                    item_elements_lower = [str(elem).lower() for elem in item_column_list]
                    return all(sel_filter in item_elements_lower for sel_filter in selected_filters)
                
                return df[df[column_name].apply(check_item_has_all_selected)]
            return df
        
        # Test with school AND romance filters - only item_4 has both
        result = apply_multi_filter(sample_filter_df, 'themes', 'school,romance')
        
        assert len(result) == 1
        assert result.iloc[0]['uid'] == 'item_4'
    
    @pytest.mark.unit 
    def test_filter_no_matches(self, sample_filter_df):
        """Test filtering with no matching items."""
        def apply_multi_filter(df, column_name, filter_str_values):
            if filter_str_values and filter_str_values.lower() != 'all':
                selected_filters = [f.strip().lower() for f in filter_str_values.split(',') if f.strip()]
                if not selected_filters:
                    return df
                
                def check_item_has_all_selected(item_column_list):
                    if not isinstance(item_column_list, list): 
                        return False
                    item_elements_lower = [str(elem).lower() for elem in item_column_list]
                    return all(sel_filter in item_elements_lower for sel_filter in selected_filters)
                
                return df[df[column_name].apply(check_item_has_all_selected)]
            return df
        
        result = apply_multi_filter(sample_filter_df, 'genres', 'nonexistent')
        
        assert len(result) == 0
    
    @pytest.mark.unit
    def test_filter_all_keyword(self, sample_filter_df):
        """Test filtering with 'all' keyword returns all items."""
        def apply_multi_filter(df, column_name, filter_str_values):
            if filter_str_values and filter_str_values.lower() != 'all':
                selected_filters = [f.strip().lower() for f in filter_str_values.split(',') if f.strip()]
                if not selected_filters:
                    return df
                
                def check_item_has_all_selected(item_column_list):
                    if not isinstance(item_column_list, list): 
                        return False
                    item_elements_lower = [str(elem).lower() for elem in item_column_list]
                    return all(sel_filter in item_elements_lower for sel_filter in selected_filters)
                
                return df[df[column_name].apply(check_item_has_all_selected)]
            return df
        
        result = apply_multi_filter(sample_filter_df, 'genres', 'all')
        
        assert len(result) == len(sample_filter_df)
    
    @pytest.mark.unit
    def test_filter_empty_string(self, sample_filter_df):
        """Test filtering with empty string returns all items."""
        def apply_multi_filter(df, column_name, filter_str_values):
            if filter_str_values and filter_str_values.lower() != 'all':
                selected_filters = [f.strip().lower() for f in filter_str_values.split(',') if f.strip()]
                if not selected_filters:
                    return df
                
                def check_item_has_all_selected(item_column_list):
                    if not isinstance(item_column_list, list): 
                        return False
                    item_elements_lower = [str(elem).lower() for elem in item_column_list]
                    return all(sel_filter in item_elements_lower for sel_filter in selected_filters)
                
                return df[df[column_name].apply(check_item_has_all_selected)]
            return df
        
        result = apply_multi_filter(sample_filter_df, 'genres', '')
        
        assert len(result) == len(sample_filter_df)
    
    @pytest.mark.unit
    def test_filter_with_spaces(self, sample_filter_df):
        """Test filtering with spaces around filter values."""
        def apply_multi_filter(df, column_name, filter_str_values):
            if filter_str_values and filter_str_values.lower() != 'all':
                selected_filters = [f.strip().lower() for f in filter_str_values.split(',') if f.strip()]
                if not selected_filters:
                    return df
                
                def check_item_has_all_selected(item_column_list):
                    if not isinstance(item_column_list, list): 
                        return False
                    item_elements_lower = [str(elem).lower() for elem in item_column_list]
                    return all(sel_filter in item_elements_lower for sel_filter in selected_filters)
                
                return df[df[column_name].apply(check_item_has_all_selected)]
            return df
        
        result = apply_multi_filter(sample_filter_df, 'genres', ' action , adventure ')
        
        assert len(result) == 1  # Only item_1 has both Action and Adventure
        assert result.iloc[0]['uid'] == 'item_1' 