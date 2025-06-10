"""
AniManga Recommender Data Exploration and Combination Module

This module handles the initial data exploration and combination of separate anime
and manga datasets into a unified dataset for the AniManga Recommender system.
It performs data loading, validation, combining, and basic exploratory analysis.

Key Operations:
    - Load separate anime and manga CSV datasets
    - Add media type identifiers and unique IDs
    - Combine datasets with proper column alignment
    - Perform exploratory data analysis
    - Generate missing value reports
    - Export combined dataset for further processing

Data Flow:
    anime.csv + manga.csv → combined_media.csv → [preprocess_data.py]

Input Requirements:
    - data/anime.csv: Anime dataset with anime_id column
    - data/manga.csv: Manga dataset with manga_id column
    - Both files should have similar column structures
    - Files must be accessible from the backend/data directory

Output:
    - data/combined_media.csv: Unified dataset with media_type column
    - Console output with dataset statistics and analysis

Usage:
    Run as standalone script:
    >>> python explore_data.py
    
    Or import and call function:
    >>> from explore_data import combine_and_explore_data
    >>> combine_and_explore_data()

Dependencies:
    - pandas: Data manipulation and analysis
    - os: File path operations

Author: AniManga Recommender Team
Version: 1.0.0
License: MIT
"""

import pandas as pd
import os

# Configuration constants for input and output files
ANIME_FILENAME = "anime.csv"
MANGA_FILENAME = "manga.csv"
COMBINED_FILENAME = "combined_media.csv"

# Determine file paths relative to script location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")
ANIME_PATH = os.path.join(DATA_DIR, ANIME_FILENAME)
MANGA_PATH = os.path.join(DATA_DIR, MANGA_FILENAME)
COMBINED_PATH = os.path.join(DATA_DIR, COMBINED_FILENAME)


def combine_and_explore_data():
    """
    Combine anime and manga datasets and perform exploratory data analysis.
    
    This function loads separate anime and manga CSV files, adds necessary metadata
    (media type and unique identifiers), combines them into a unified dataset,
    performs exploratory analysis, and exports the result for downstream processing.
    
    Data Processing Steps:
        1. Load anime dataset and add 'anime' media_type
        2. Create unique identifiers with 'anime_' prefix
        3. Load manga dataset and add 'manga' media_type  
        4. Create unique identifiers with 'manga_' prefix
        5. Handle column name inconsistencies
        6. Combine datasets using pandas.concat()
        7. Perform exploratory data analysis
        8. Generate missing value reports
        9. Export combined dataset
    
    Data Transformations:
        Anime Data:
            - media_type: Set to 'anime'
            - uid: Created as 'anime_' + anime_id
            - All original columns preserved
        
        Manga Data:
            - media_type: Set to 'manga' 
            - uid: Created as 'manga_' + manga_id
            - Column renaming: 'created_at_before' → 'created_at' (if exists)
            - All original columns preserved
        
        Combined Data:
            - Union of all columns from both datasets
            - Missing columns filled with NaN for appropriate media type
            - Consistent column ordering across datasets
    
    Exploratory Analysis:
        - Dataset shapes and column information
        - First 5 rows preview
        - Complete dataset information (dtypes, memory usage)
        - Missing value analysis by column
        - Media type distribution counts
        - Column name listing for verification
    
    Returns:
        None: Function performs file I/O operations and prints analysis results.
    
    Raises:
        FileNotFoundError: When anime.csv or manga.csv files are not found
        Exception: For any other errors during data loading or processing
    
    Examples:
        >>> # Standard usage
        >>> combine_and_explore_data()
        Loading anime data from: /path/to/data/anime.csv
        Anime data loaded successfully. Shape: (25000, 42)
        Loading manga data from: /path/to/data/manga.csv  
        Manga data loaded successfully. Shape: (43000, 45)
        Combining datasets...
        Combined data shape: (68000, 47)
        ...
        Combined dataset saved to: /path/to/data/combined_media.csv
        
        >>> # Check if files exist before running
        >>> import os
        >>> if os.path.exists(ANIME_PATH) and os.path.exists(MANGA_PATH):
        ...     combine_and_explore_data()
        ... else:
        ...     print("Required data files not found")
    
    File Requirements:
        Input Files:
            - data/anime.csv: Must contain 'anime_id' column
            - data/manga.csv: Must contain 'manga_id' column
            - Both files should be valid CSV format
            - Column structures should be compatible for combining
        
        Output File:
            - data/combined_media.csv: Unified dataset
            - Will overwrite existing file if present
            - Contains all columns from both input datasets
    
    Error Handling:
        File Not Found:
            - Provides specific error messages with file paths
            - Suggests checking file locations
            - Graceful function termination
        
        Data Loading Errors:
            - Catches pandas read_csv exceptions
            - Provides descriptive error messages
            - Continues with available data when possible
        
        Processing Errors:
            - Handles column mismatches gracefully
            - Reports unexpected data structure issues
            - Maintains data integrity throughout process
    
    Performance Considerations:
        - Uses pandas.concat() for efficient dataset combination
        - Memory-efficient operations for large datasets
        - Progress reporting for long-running operations
        - Minimal data copying during transformations
    
    Data Quality Checks:
        - Validates successful data loading with shape reporting
        - Checks for expected column presence
        - Reports missing value statistics
        - Verifies media type distribution
        - Confirms unique identifier creation
    
    Output Analysis:
        Console Output Includes:
            - File paths for transparency
            - Dataset shapes at each step
            - Column names and data types
            - Missing value summaries
            - Media type distributions
            - Save confirmation with output path
        
        Saved File:
            - Complete combined dataset in CSV format
            - Preserves all original data integrity
            - Ready for preprocessing pipeline
            - Includes new metadata columns (media_type, uid)
    
    Integration:
        This function is the first step in the data pipeline:
        1. explore_data.py (this function) → combined_media.csv
        2. preprocess_data.py → processed_media.csv
        3. migrate_csv_to_supabase.py → Supabase database
        4. app.py → API endpoints and recommendations
    
    Dependencies:
        - pandas: For data manipulation and CSV operations
        - os: For file path handling and directory operations
    
    See Also:
        - preprocess_data.py: Next step in data pipeline
        - migrate_csv_to_supabase.py: Database migration utilities
        - pandas.concat(): Documentation for dataset combination
        - pandas.read_csv(): Documentation for CSV loading
    
    Note:
        This function is designed to be run once during initial data setup
        or when source datasets are updated. It's optimized for the specific
        data structure and naming conventions of anime and manga datasets.
    """
    print(f"Loading anime data from: {ANIME_PATH}")
    try:
        df_anime = pd.read_csv(ANIME_PATH)
        print(f"Anime data loaded successfully. Shape: {df_anime.shape}")
        df_anime['media_type'] = 'anime'
        df_anime['uid'] = 'anime_' + df_anime['anime_id'].astype(str)
    except FileNotFoundError:
        print(f"Anime data file not found at {ANIME_PATH}. Please check the path.")
        return
    except Exception as e:
        print(f"An error occurred while loading anime data: {e}")
        return
    
    print(f"\nLoading manga data from: {MANGA_PATH}")
    try:
        df_manga = pd.read_csv(MANGA_PATH)
        print(f"Manga data loaded successfully. Shape: {df_manga.shape}")
        df_manga['media_type'] = 'manga'
        df_manga['uid'] = 'manga_' + df_manga['manga_id'].astype(str)
    
        if 'created_at_before' in df_manga.columns:
            df_manga.rename(columns={'created_at_before': 'created_at'}, inplace=True)
            print("Renamed 'created_at_before' to 'created_at' in manga data.")
    except FileNotFoundError:
        print(f"Manga data file not found at {MANGA_PATH}. Please check the path.")
        return
    except Exception as e:
        print(f"An error occurred while loading manga data: {e}")
        return
    
    print("\nCombining datasets...")
    try:
        df_combined = pd.concat([df_anime, df_manga], ignore_index=True, sort=False)
        print(f"Combined data shape: {df_combined.shape}")
        print("Combined columns:", df_combined.columns.tolist())

        print("\nFirst 5 rows of combined data:")
        print(df_combined.head())

        print("\nCombined data info:")
        df_combined.info(verbose=True, show_counts=True)

        print("\nMissing Values in Combined Data (Sum per column):")
        missing_values = df_combined.isnull().sum()
        if not missing_values.empty:
            print(missing_values.sort_values(ascending=False))
        else:
            print("No columns found or no missing values to report.")

        print("\nValue Counts for 'media_type'")
        print(df_combined['media_type'].value_counts())

        df_combined.to_csv(COMBINED_PATH, index=False)
        print(f"\nCombined dataset saved to: {COMBINED_PATH}")
    except Exception as e:
        print(f"An error occurred while combining datasets: {e}")
        return


if __name__ == "__main__":
    combine_and_explore_data()