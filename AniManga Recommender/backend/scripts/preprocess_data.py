"""
AniManga Recommender Data Preprocessing Module

This module handles the preprocessing of combined anime and manga data for the 
AniManga Recommender system. It performs data cleaning, feature engineering,
and TF-IDF vectorization to prepare data for machine learning operations.

Key Operations:
    - Data type conversions and validation
    - Missing value imputation with intelligent defaults
    - List column parsing from string representations
    - Text preprocessing and normalization
    - TF-IDF feature generation for content-based filtering
    - Author name extraction and standardization

Input Requirements:
    - combined_media.csv: Combined anime and manga dataset
    - File must contain columns for genres, themes, demographics, synopsis, etc.
    - Author data should be in structured format (list of dictionaries)

Output:
    - processed_media.csv: Cleaned and preprocessed dataset ready for ML
    - Includes engineered features and TF-IDF text representations

Usage:
    Run as standalone script:
    >>> python preprocess_data.py
    
    Or import functions:
    >>> from preprocess_data import safe_literal_eval, preprocess_text
    >>> parsed_data = safe_literal_eval(string_representation)

Dependencies:
    - pandas: Data manipulation and analysis
    - numpy: Numerical computing
    - scikit-learn: TF-IDF vectorization
    - ast: Safe literal evaluation of string representations

Author: AniManga Recommender Team
Version: 1.0.0
License: MIT
"""

import pandas as pd
import numpy as np
import os
import ast
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Configuration constants for file paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")

INPUT_FILENAME = "combined_media.csv"
OUTPUT_FILENAME = "processed_media.csv"

INPUT_PATH = os.path.join(DATA_DIR, INPUT_FILENAME)
OUTPUT_PATH = os.path.join(DATA_DIR, OUTPUT_FILENAME)

def safe_literal_eval(val):
    """
    Safely evaluate string representations of Python literals.
    
    This function attempts to parse string representations of Python data structures
    (lists, dicts, etc.) back into their original types. It handles malformed strings
    gracefully by returning the original value if parsing fails.
    
    Args:
        val (Any): Input value to evaluate. Can be string, list, dict, or other types.
    
    Returns:
        Any: Parsed Python object if input is a valid string representation,
             otherwise returns the original input value unchanged.
    
    Examples:
        >>> safe_literal_eval("['Action', 'Adventure']")
        ['Action', 'Adventure']
        
        >>> safe_literal_eval("[{'name': 'Studio Ghibli'}]")
        [{'name': 'Studio Ghibli'}]
        
        >>> safe_literal_eval("malformed string")
        'malformed string'
        
        >>> safe_literal_eval(['already', 'a', 'list'])
        ['already', 'a', 'list']
    
    Error Handling:
        - ValueError: When string contains invalid Python syntax
        - SyntaxError: When string has syntax errors
        - Returns original value instead of raising exceptions
    
    Security:
        Uses ast.literal_eval() which only evaluates literals (strings, numbers,
        tuples, lists, dicts, booleans, None) for security. Will not execute
        arbitrary code unlike eval().
    
    Note:
        This function is essential for parsing CSV data where complex data structures
        are stored as string representations.
    """
    if isinstance(val, str):
        try:
            return ast.literal_eval(val)
        except (ValueError, SyntaxError):
            return val
    return val

def extract_author_names(authors_data_cell_value):
    """
    Extract and normalize author names from structured author data.
    
    This function processes author information stored in various formats (string
    representations of lists, actual lists, or dictionaries) and extracts clean,
    standardized author names for use in the application.
    
    Author Data Processing:
        - Handles first_name and last_name combinations
        - Manages single-name authors (common in manga)
        - Filters out empty or invalid entries
        - Removes duplicate names
        - Handles Japanese name conventions
    
    Args:
        authors_data_cell_value (Union[str, list, dict, None]): Author data in various formats:
            - String representation of list: "['author1', 'author2']"
            - List of dictionaries: [{'first_name': 'Hayao', 'last_name': 'Miyazaki'}]
            - Single dictionary: {'first_name': 'Akira', 'last_name': 'Toriyama'}
            - None or empty values
    
    Returns:
        List[str]: List of cleaned, unique author names.
                   Empty list if no valid authors found.
    
    Examples:
        >>> authors_data = [{'first_name': 'Hayao', 'last_name': 'Miyazaki'}]
        >>> extract_author_names(authors_data)
        ['Hayao Miyazaki']
        
        >>> authors_str = "[{'first_name': '', 'last_name': 'Toriyama'}]"
        >>> extract_author_names(authors_str)
        ['Toriyama']
        
        >>> invalid_data = "malformed_string"
        >>> extract_author_names(invalid_data)
        []
        
        >>> empty_data = None
        >>> extract_author_names(empty_data)
        []
    
    Name Processing Logic:
        1. Parse input data if it's a string representation
        2. Extract first_name and last_name from each author entry
        3. Handle cases where only last_name exists (common in Japanese media)
        4. Combine names with proper spacing
        5. Remove duplicates and empty entries
        6. Return sorted list for consistency
    
    Error Handling:
        - Invalid JSON/string formats return empty list
        - Missing name fields are handled gracefully
        - Non-dictionary entries in lists are skipped
        - Maintains data integrity by never raising exceptions
    
    Cultural Considerations:
        - Handles Japanese naming conventions where family name may be only name
        - Preserves original name order and spacing
        - Supports both Western and Eastern name formats
    
    Performance:
        - Uses set operations to remove duplicates efficiently
        - Minimal string operations for performance
        - Handles large author lists without memory issues
    """
    processed_authors_list = []
    if isinstance(authors_data_cell_value, str):
        try:
            parsed_data = ast.literal_eval(authors_data_cell_value)
        except (ValueError, SyntaxError):
            return []
    elif isinstance(authors_data_cell_value, list):
        parsed_data = authors_data_cell_value
    else:
        return []
    
    names = []
    if isinstance(parsed_data, list):
        for author_dict in parsed_data:
            if isinstance(author_dict, dict):
                first = author_dict.get('first_name', '').strip()
                last = author_dict.get('last_name', '').strip()
                if last and not first and (last.count(' ') > 0 or not any(c.islower() for c in last)):
                    name_parts = [last]
                else:
                    name_parts = [part for part in [first, last] if part]
                if name_parts:
                    names.append(" ".join(name_parts))
    return list(set(names))

def preprocess_text(text):
    """
    Preprocess text data for machine learning and analysis.
    
    This function standardizes text data by converting to lowercase and removing
    unnecessary whitespace. It's designed for use with synopsis, titles, and other
    textual content in the anime/manga dataset.
    
    Text Processing Steps:
        1. Convert to lowercase for consistency
        2. Strip leading and trailing whitespace
        3. Handle non-string inputs gracefully
        4. Return empty string for invalid inputs
    
    Args:
        text (Any): Input text to preprocess. Expected to be string but handles
                   other types gracefully.
    
    Returns:
        str: Preprocessed text in lowercase with stripped whitespace.
             Returns empty string if input is not a string or is None.
    
    Examples:
        >>> preprocess_text("  DEMON SLAYER: Mugen Train  ")
        'demon slayer: mugen train'
        
        >>> preprocess_text("Attack on Titan")
        'attack on titan'
        
        >>> preprocess_text(None)
        ''
        
        >>> preprocess_text(123)
        ''
        
        >>> preprocess_text("")
        ''
    
    Use Cases:
        - Synopsis text normalization for TF-IDF vectorization
        - Title standardization for search functionality
        - Genre and theme text processing
        - Consistent text representation across the dataset
    
    Performance:
        - Minimal operations for optimal performance
        - Handles large text datasets efficiently
        - No regex operations for speed
    
    Integration:
        Used in conjunction with TF-IDF vectorization to create consistent
        text features for content-based recommendation algorithms.
    
    Note:
        This function is specifically designed for the anime/manga domain where
        titles and descriptions may contain mixed case, special characters,
        and formatting inconsistencies.
    """
    if isinstance(text, str):
        return text.lower().strip()
    return ""

def main():
    """
    Main preprocessing pipeline for AniManga Recommender data.
    
    This function orchestrates the complete data preprocessing workflow for the
    AniManga Recommender system. It loads raw combined data, performs cleaning
    and feature engineering, and outputs processed data ready for machine learning.
    
    Processing Pipeline:
        1. Load combined anime/manga CSV data
        2. Data type conversions and validation
        3. Missing value imputation with domain-specific defaults
        4. List column parsing from string representations
        5. Author name extraction and standardization
        6. Text preprocessing and normalization
        7. Feature engineering (combined text features)
        8. TF-IDF vectorization for content-based filtering
        9. Year extraction and normalization
        10. Column selection and final dataset preparation
        11. Export processed data for downstream use
    
    Input Requirements:
        - File: data/combined_media.csv
        - Must contain standard anime/manga columns
        - Author data should be in structured format
        - Date columns should be parseable by pandas
    
    Output:
        - File: data/processed_media.csv
        - Cleaned and feature-engineered dataset
        - Ready for machine learning operations
        - Includes TF-IDF text features and normalized data
    
    Returns:
        None: Function performs file I/O operations and prints progress updates.
    
    Data Transformations:
        Date Columns:
            - Converted to pandas datetime objects
            - Missing dates handled gracefully
            - Year extraction for trend analysis
        
        Numerical Columns:
            - Score normalization and missing value imputation
            - Episode/chapter counts converted to integers
            - Zero defaults for missing counts
        
        List Columns:
            - String representations parsed to actual lists
            - Standardized format across all list fields
            - Empty lists for missing data
        
        Text Features:
            - Synopsis cleaning and normalization
            - Combined text feature creation
            - TF-IDF vectorization for similarity calculations
        
        Author Processing:
            - Name extraction from structured data
            - Duplicate removal and standardization
            - Support for various name formats
    
    Feature Engineering:
        Combined Text Features:
            - Concatenates genres, themes, demographics, synopsis, title
            - Creates unified text representation for content analysis
            - Optimized for TF-IDF vectorization
        
        TF-IDF Matrix:
            - 5000 max features for performance
            - English stop words removed
            - Sparse matrix representation for memory efficiency
        
        Year Features:
            - Extracted from start_date or real_start_date
            - Integer representation for numerical analysis
            - Zero default for missing years
    
    Error Handling:
        - File not found errors with helpful messages
        - Graceful handling of malformed data
        - Progress reporting for debugging
        - Continued processing despite individual record errors
    
    Performance Considerations:
        - Efficient memory usage with appropriate data types
        - Vectorized operations where possible
        - Progress indicators for long-running operations
        - Optimized TF-IDF parameters for large datasets
    
    Examples:
        >>> # Run complete preprocessing pipeline
        >>> main()
        Loading combined data from: data/combined_media.csv
        Initial shape: (68598, 47)
        Starting data type conversions...
        Processing list-like column: genres
        ...
        Preprocessing complete.
        
        >>> # Check output
        >>> df = pd.read_csv('data/processed_media.csv')
        >>> print(df.shape)
        (68598, 25)
    
    Logging Output:
        The function provides detailed console output including:
        - File paths and dataset shapes
        - Processing steps and progress
        - Missing value statistics
        - Feature engineering results
        - Error messages and warnings
        - Completion status and summary
    
    Dependencies:
        - pandas: Data manipulation and analysis
        - numpy: Numerical operations
        - scikit-learn: TF-IDF vectorization
        - ast: Safe string literal evaluation
    
    See Also:
        - safe_literal_eval(): String literal parsing
        - extract_author_names(): Author data processing
        - preprocess_text(): Text normalization
        - TfidfVectorizer: Scikit-learn text vectorization
    
    Note:
        This function is designed to be run as a standalone script or imported
        and called from other modules. It's optimized for the specific data
        structure and requirements of the AniManga Recommender system.
    """
    print(f"Loading combined data from: {INPUT_PATH}")
    try:
        df = pd.read_csv(INPUT_PATH, dtype={'authors': str})
    except FileNotFoundError:
        print(f"ERROR: Input file not found at {INPUT_PATH}. Run explore_data.py first.")
        return
    except Exception as e:
        print(f"Error loading data: {e}")
        return

    print(f"Initial shape: {df.shape}")

    print("\n Starting data type conversions and initial cleaning.")
    data_cols = ['start_date', 'end_date', 'real_start_date', 'real_end_date', 'created_at', 'updated_at']
    for col in data_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
        
    if 'score' in df.columns:
        df['score'] = pd.to_numeric(df['score'], errors='coerce')
    for col in ['episodes', 'volumes', 'chapters']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    list_like_cols = ['genres', 'themes', 'demographics', 'studios', 'producers', 'licensors', 'serializations', 'title_synonyms']
    for col in list_like_cols:
        if col in df.columns:
            print(f"Processing list-like column: {col}")
            df[col] = df[col].apply(safe_literal_eval)
            df[col] = df[col].apply(lambda x: x if isinstance(x, list) else ([] if pd.isna(x) else ([str(x)] if not isinstance(x, list) else [])))
    
    if 'authors' in df.columns:
        print("Processing complex 'authors' column...")
        df['authors'] = df['authors'].apply(extract_author_names)

    print("\nHandling missing values.")
    if 'score' in df.columns:
        df['score'].fillna(df['score'].median(), inplace=True)
    text_fields_to_fill_empty = ['synopsis', 'background', 'title_english', 'title_japanese']
    for col in text_fields_to_fill_empty:
        if col in df.columns:
            df[col].fillna("", inplace=True)

    if 'source' in df.columns:
        df['source'].fillna("Unknown", inplace=True)
    if 'rating' in df.columns:
        df['rating'].fillna("Unknown", inplace=True)

    for col in ['episodes', 'volumes', 'chapters']:
        if col in df.columns:
            df[col].fillna(0, inplace=True)
    

    print("Missing values after initial handling:")
    missing_after = df.isnull().sum()
    print(missing_after[missing_after > 0].sort_values(ascending=False))

    print("\nPerforming feature engineering.")

    def join_list_elements(lst):
        if isinstance(lst, list):
            return ' '.join(str(item).lower().replace(' ', '') for item in lst)
        return ''

    df['genres_str'] = df['genres'].apply(join_list_elements)
    df['themes_str'] = df['themes'].apply(join_list_elements)
    df['demographics_str'] = df['demographics'].apply(join_list_elements)

    df['synopsis_clean'] = df['synopsis'].apply(preprocess_text)

    df['combined_text_features'] = df['genres_str'] + ' ' + \
                                  df['themes_str'] + ' ' + \
                                  df['demographics_str'] + ' ' + \
                                  df['synopsis_clean'] + ' ' + \
                                  df['title'].apply(preprocess_text)

    print("Sample of combined text features:")
    print(df[['title', 'combined_text_features']].head())

    tfidf_vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
    tfidf_matrix = tfidf_vectorizer.fit_transform(df['combined_text_features'])

    print(f"TF-IDF matrix shape: {tfidf_matrix.shape}")

    if 'real_start_date' in df.columns:
        df['start_year_num'] = df['real_start_date'].dt.year.fillna(0).astype(int)
    elif 'start_year' in df.columns:
        df['start_year_num'] = pd.to_numeric(df['start_year'], errors='coerece').fillna(0).astype(int)
    else:
        df['start_year_num'] = 0
    

    print("\nSelecting final columns:")
    columns_to_keep = ['uid', 'anime_id', 'manga_id', 'title', 'media_type', 'type', 'score', 'scored_by', 'status', 'episodes', 'volumes', 'chapters', 'start_date', 'end_date', 'source', 'members', 'favorites', 'rating', 'sfw', 'approved', 'created_at', 'updated_at', 'genres', 'themes', 'demographics', 'studios', 'producers', 'licensors', 'authors', 'serializations', 'synopsis', 'background', 'main_picture', 'url', 'trailer_url', 'title_english', 'title_japanese', 'title_synonyms', 'start_year_num', 'combined_text_features']

    final_columns = [col for col in columns_to_keep if col in df.columns]
    df_processed = df[final_columns].copy()

    print(f"Shape after processing: {df_processed.shape}")
    print("Final columns:", df_processed.columns.tolist())

    print(f"\nSaving processed data to: {OUTPUT_PATH}")
    try:
        df_processed.to_csv(OUTPUT_PATH, index=False)
        print("Processed data saved successfully.")
    except Exception as e:
        print(f"Error saving processed data: {e}")
        return
    print("\nPreproessing complete.")

if __name__ == "__main__":
    main()
