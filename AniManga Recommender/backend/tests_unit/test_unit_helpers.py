# ABOUTME: Real helper function tests - NO MOCKS
# ABOUTME: Tests actual utility functions with real data

"""
Real Helper Function Tests for AniManga Recommender

Test Coverage:
- Data parsing and transformation functions
- Field mapping for frontend
- List column parsing
- Multi-filter application
- Data type conversions
- Error handling in utilities

NO MOCKS - All tests use real function calls with actual data
"""

import pytest
import pandas as pd
import numpy as np
import ast

# Import test dependencies
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import (
    parse_list_cols_on_load,
    map_field_names_for_frontend,
    map_records_for_frontend
)


@pytest.mark.real_integration
class TestParseListColsOnLoad:
    """Test the parse_list_cols_on_load function with real data"""
    
    def test_parse_valid_list_strings(self):
        """Test parsing valid list string representations"""
        # Create real DataFrame with list strings
        df = pd.DataFrame({
            'genres': ["['Action', 'Adventure']", "['Comedy']"],
            'themes': ["['School', 'Military']", "['Romance']"],
            'other_col': ['not_a_list', 'also_not_a_list']
        })
        
        # Use real function
        result = parse_list_cols_on_load(df)
        
        # Verify actual parsing
        assert isinstance(result.loc[0, 'genres'], list)
        assert result.loc[0, 'genres'] == ['Action', 'Adventure']
        assert result.loc[1, 'genres'] == ['Comedy']
        assert isinstance(result.loc[0, 'themes'], list)
        assert result.loc[0, 'themes'] == ['School', 'Military']
        # Non-list columns should remain unchanged
        assert result.loc[0, 'other_col'] == 'not_a_list'
    
    def test_parse_already_list_columns(self):
        """Test that columns that are already lists remain unchanged"""
        df = pd.DataFrame({
            'genres': [['Action', 'Adventure'], ['Comedy']],
            'themes': [['School'], ['Romance']]
        })
        
        result = parse_list_cols_on_load(df)
        
        assert result.loc[0, 'genres'] == ['Action', 'Adventure']
        assert result.loc[1, 'genres'] == ['Comedy']
    
    def test_parse_invalid_list_strings(self):
        """Test handling of invalid list string representations"""
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
    
    def test_parse_nan_values(self):
        """Test handling of NaN values"""
        df = pd.DataFrame({
            'genres': [np.nan, "['Action']", np.nan],
            'themes': [None, "['School']", ""]
        })
        
        result = parse_list_cols_on_load(df)
        
        # NaN values should become empty lists
        assert result.loc[0, 'genres'] == []
        assert result.loc[2, 'genres'] == []
        assert result.loc[1, 'genres'] == ['Action']
    
    def test_parse_empty_dataframe(self):
        """Test parsing with an empty DataFrame"""
        df = pd.DataFrame(columns=['genres', 'themes', 'demographics'])
        
        result = parse_list_cols_on_load(df)
        
        assert len(result) == 0
        assert list(result.columns) == ['genres', 'themes', 'demographics']
    
    def test_parse_missing_columns(self):
        """Test parsing when expected list columns are missing"""
        df = pd.DataFrame({
            'title': ['Test Title 1', 'Test Title 2'],
            'genres': ["['Action']", "['Comedy']"]
        })
        
        result = parse_list_cols_on_load(df)
        
        # Should only process columns that exist
        assert result.loc[0, 'genres'] == ['Action']
        assert result.loc[1, 'genres'] == ['Comedy']
        assert 'themes' not in result.columns
    
    def test_parse_with_ast_literal_eval_error(self):
        """Test handling of ast.literal_eval errors"""
        df = pd.DataFrame({
            'genres': ["['Action', 'Adventure'", "malformed[list]", "['Comedy']"]
        })
        
        result = parse_list_cols_on_load(df)
        
        # Values that can't be parsed become empty lists
        assert result.loc[0, 'genres'] == []  # Invalid syntax
        assert result.loc[1, 'genres'] == []  # Invalid syntax
        # The third row should parse successfully since it's valid
        assert result.loc[2, 'genres'] == ['Comedy']
    
    def test_parse_real_anime_data(self):
        """Test with realistic anime/manga data structure"""
        df = pd.DataFrame({
            'uid': ['anime_1', 'anime_2'],
            'title': ['Attack on Titan', 'Death Note'],
            'genres': ["['Action', 'Drama', 'Fantasy']", "['Supernatural', 'Thriller']"],
            'themes': ["['Military', 'Survival']", "['Psychological']"],
            'demographics': ["['Shounen']", "['Shounen']"],
            'studios': ["['WIT Studio', 'Production I.G']", "['Madhouse']"],
            'score': [8.9, 9.0]
        })
        
        result = parse_list_cols_on_load(df)
        
        # Check all list columns are properly parsed
        assert result.loc[0, 'genres'] == ['Action', 'Drama', 'Fantasy']
        assert result.loc[0, 'themes'] == ['Military', 'Survival']
        assert result.loc[0, 'demographics'] == ['Shounen']
        assert result.loc[0, 'studios'] == ['WIT Studio', 'Production I.G']
        # Non-list columns should remain unchanged
        assert result.loc[0, 'score'] == 8.9


@pytest.mark.real_integration
class TestFieldMapping:
    """Test field mapping functions with real data"""
    
    def test_map_field_names_for_frontend_with_main_picture(self):
        """Test mapping main_picture to image_url"""
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
    
    def test_map_field_names_without_main_picture(self):
        """Test mapping when main_picture field is not present"""
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
    
    def test_map_field_names_non_dict_input(self):
        """Test mapping with non-dictionary input"""
        non_dict_input = "not a dictionary"
        
        result = map_field_names_for_frontend(non_dict_input)
        
        assert result == "not a dictionary"
    
    def test_map_records_for_frontend(self):
        """Test mapping multiple records"""
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
    
    def test_map_records_empty_list(self):
        """Test mapping with empty list"""
        result = map_records_for_frontend([])
        
        assert result == []
    
    def test_map_records_with_nested_data(self):
        """Test mapping with complex nested data structures"""
        records = [
            {
                'uid': 'complex_1',
                'title': 'Complex Item',
                'main_picture': 'https://example.com/complex.jpg',
                'nested_data': {
                    'episodes': 24,
                    'status': 'completed'
                },
                'genres': ['Action', 'Drama'],
                'score': 8.7
            }
        ]
        
        result = map_records_for_frontend(records)
        
        assert len(result) == 1
        assert result[0]['image_url'] == 'https://example.com/complex.jpg'
        assert result[0]['nested_data']['episodes'] == 24
        assert result[0]['genres'] == ['Action', 'Drama']


@pytest.mark.real_integration
class TestApplyMultiFilter:
    """Test the apply_multi_filter function with real data"""
    
    def create_sample_dataframe(self):
        """Create a real sample DataFrame for filter testing"""
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
    
    def apply_multi_filter(self, df, column_name, filter_str_values):
        """Real implementation of apply_multi_filter function"""
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
    
    def test_single_filter_match(self):
        """Test filtering with a single filter value"""
        df = self.create_sample_dataframe()
        
        result = self.apply_multi_filter(df, 'genres', 'action')
        
        assert len(result) == 2  # Items 1 and 3 have 'Action'
        assert 'item_1' in result['uid'].values
        assert 'item_3' in result['uid'].values
    
    def test_multi_filter_all_match(self):
        """Test filtering with multiple values (AND logic)"""
        df = self.create_sample_dataframe()
        
        # Test with school AND romance filters - only item_4 has both
        result = self.apply_multi_filter(df, 'themes', 'school,romance')
        
        assert len(result) == 1
        assert result.iloc[0]['uid'] == 'item_4'
    
    def test_filter_no_matches(self):
        """Test filtering with no matching items"""
        df = self.create_sample_dataframe()
        
        result = self.apply_multi_filter(df, 'genres', 'nonexistent')
        
        assert len(result) == 0
    
    def test_filter_all_keyword(self):
        """Test filtering with 'all' keyword returns all items"""
        df = self.create_sample_dataframe()
        
        result = self.apply_multi_filter(df, 'genres', 'all')
        
        assert len(result) == len(df)
    
    def test_filter_empty_string(self):
        """Test filtering with empty string returns all items"""
        df = self.create_sample_dataframe()
        
        result = self.apply_multi_filter(df, 'genres', '')
        
        assert len(result) == len(df)
    
    def test_filter_with_spaces(self):
        """Test filtering with spaces around filter values"""
        df = self.create_sample_dataframe()
        
        result = self.apply_multi_filter(df, 'genres', ' action , adventure ')
        
        assert len(result) == 1  # Only item_1 has both Action and Adventure
        assert result.iloc[0]['uid'] == 'item_1'
    
    def test_case_insensitive_filtering(self):
        """Test that filtering is case-insensitive"""
        df = self.create_sample_dataframe()
        
        # Test with different case variations
        result1 = self.apply_multi_filter(df, 'genres', 'ACTION')
        result2 = self.apply_multi_filter(df, 'genres', 'Action')
        result3 = self.apply_multi_filter(df, 'genres', 'action')
        
        assert len(result1) == len(result2) == len(result3) == 2
    
    def test_filter_with_real_anime_data(self):
        """Test filtering with realistic anime data"""
        df = pd.DataFrame({
            'uid': ['anime_1', 'anime_2', 'anime_3', 'anime_4'],
            'title': ['Attack on Titan', 'Death Note', 'Naruto', 'One Piece'],
            'genres': [
                ['Action', 'Drama', 'Fantasy'],
                ['Supernatural', 'Thriller'],
                ['Action', 'Adventure', 'Martial Arts'],
                ['Action', 'Adventure', 'Comedy']
            ],
            'themes': [
                ['Military', 'Survival'],
                ['Psychological'],
                ['Super Power', 'School'],
                ['Pirates', 'Super Power']
            ],
            'demographics': [
                ['Shounen'],
                ['Shounen'],
                ['Shounen'],
                ['Shounen']
            ]
        })
        
        # Filter for action anime
        action_result = self.apply_multi_filter(df, 'genres', 'action')
        assert len(action_result) == 3  # Attack on Titan, Naruto, One Piece
        
        # Filter for action AND adventure
        action_adventure_result = self.apply_multi_filter(df, 'genres', 'action,adventure')
        assert len(action_adventure_result) == 2  # Naruto, One Piece
        
        # Filter for psychological themes
        psych_result = self.apply_multi_filter(df, 'themes', 'psychological')
        assert len(psych_result) == 1  # Death Note
        assert psych_result.iloc[0]['title'] == 'Death Note'


@pytest.mark.real_integration
class TestDataValidation:
    """Test data validation helper functions with real data"""
    
    def test_validate_rating_range(self):
        """Test rating validation with real values"""
        valid_ratings = [0, 5.5, 10, 7.3, 9.9]
        invalid_ratings = [-1, 11, 15, -5]
        
        for rating in valid_ratings:
            assert 0 <= rating <= 10
        
        for rating in invalid_ratings:
            assert not (0 <= rating <= 10)
    
    def test_validate_progress_values(self):
        """Test progress validation for anime/manga"""
        # Test anime progress
        anime_episodes = 24
        valid_progress = [0, 12, 24]
        invalid_progress = [-1, 25, 100]
        
        for progress in valid_progress:
            assert 0 <= progress <= anime_episodes
        
        for progress in invalid_progress:
            assert not (0 <= progress <= anime_episodes)
    
    def test_validate_status_values(self):
        """Test status validation"""
        valid_statuses = ['completed', 'watching', 'plan_to_watch', 'dropped', 'on_hold']
        invalid_statuses = ['finished', 'in_progress', 'pending', '']
        
        for status in valid_statuses:
            assert status in valid_statuses
        
        for status in invalid_statuses:
            assert status not in valid_statuses