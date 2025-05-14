import pandas as pd
import numpy as np
import os
import ast
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")

INPUT_FILENAME = "combined_media.csv"
OUTPUT_FILENAME = "processed_media.csv"

INPUT_PATH = os.path.join(DATA_DIR, INPUT_FILENAME)
OUTPUT_PATH = os.path.join(DATA_DIR, OUTPUT_FILENAME)

def safe_literal_eval(val):
    if isinstance(val, str):
        try:
            return ast.literal_eval(val)
        except (ValueError, SyntaxError):
            return val
    return val

def preprocess_text(text):
    if isinstance(text, str):
        return text.lower().strip()
    return ""

def main():
    print(f"Loading combined data from: {INPUT_PATH}")
    try:
        df = pd.read_csv(INPUT_PATH)
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
    
    list_like_cols = ['genres', 'themes', 'demographics', 'studios', 'producers', 'licensors', 'authors', 'serializations', 'title_synonyms']
    for col in list_like_cols:
        if col in df.columns:
            print(f"Processing list-like column: {col}")
            df[col] = df[col].apply(safe_literal_eval)
            df[col] = df[col].apply(lambda x: x if isinstance(x, list) else [])

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
