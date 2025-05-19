# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import pandas as pd
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import ast

load_dotenv()

app = Flask(__name__)
CORS(app)

PROCESSED_DATA_FILENAME = "processed_media.csv"


BASE_DATA_PATH = "data"
PROCESSED_DATA_PATH = os.path.join(BASE_DATA_PATH, PROCESSED_DATA_FILENAME)

df_processed = None
tfidf_vectorizer_global = None
tfidf_matrix_global = None
uid_to_idx = None

def parse_list_cols_on_load(df_to_parse):
    list_like_cols_in_processed = ['genres', 'themes', 'demographics', 'studios', 'producers', 'licensors', 'authors', 'serializations', 'title_synonyms']

    for col in list_like_cols_in_processed:
        if col in df_to_parse.columns:
            first_valid_val = df_to_parse[col].dropna().iloc[0] if not df_to_parse[col].dropna().empty else None
            if isinstance(first_valid_val, str) and first_valid_val.startswith('[') and first_valid_val.endswith(']'): 
                try:
                    df_to_parse[col] = df_to_parse[col].apply(lambda x: ast.literal_eval(x) if isinstance(x,str) and x.startswith('[') and x.endswith(']') else (x if isinstance(x, list) else []))
                except Exception as e:
                    print(f"Warning: Could not parse column {col} with ast.literal_eval. Error: {e}")
                    df_to_parse[col] = df_to_parse[col].apply(lambda x: [] if isinstance(x, str) else x)
            elif not isinstance(first_valid_val, list):
                df_to_parse[col] = df_to_parse[col].apply(lambda x: [] if not isinstance(x, list) else x)
    return df_to_parse


def load_data_and_tfidf():
    global df_processed, tfidf_vectorizer_global, tfidf_matrix_global, uid_to_idx

    if df_processed is not None and tfidf_matrix_global is not None:
        print("Data and TF-IDF matrix already loaded.")
        return
    try:
        print(f"Attempting to load processed data from: {PROCESSED_DATA_PATH}")

        temp_df = pd.read_csv(PROCESSED_DATA_PATH, low_memory=False)

        #NSFW filtering
        if 'sfw' in temp_df.columns:
            df_processed = temp_df[temp_df['sfw'] == True].copy()
            print(f"Shape after SFW filter: {df_processed.shape}")
            if len(df_processed) == 0 and len(temp_df) > 0:
                print("WARNING: SFW filter resulted in an empty Datafram. Check 'sfw' column values.")
        else:
            print("WARNING: 'sfw' column not found. NSFW content might ntob e filtered.")
            df_processed = temp_df.copy()

        #ensure 'uid' column exists after filtering
        if 'uid' not in df_processed.columns or len(df_processed) == 0:
            print("ERROR: 'uid' column missing or Dataframe empty after SFW filter.")
            if len(df_processed) > 0 and 'uid' in df_processed.columns:
                pass #uid exists, df not empty
            else:
                #create an empty uid_to_idx if df_processed is empty
                if len(df_processed) == 0:
                    print("Dataframe is empty after SFW filter, TF-IDF and UID maaping will be empty.")
                    uid_to_idx = pd.Series(dtype='int64')
                else:
                    raise KeyError("'uid' column is missing after SFW filter, but Dataframe is not empty.")
                


        df_processed['combined_text_features'] = df_processed['combined_text_features'].fillna('')

        df_processed = parse_list_cols_on_load(df_processed)
        print(f"Procssed data loaded successfully. Shape: {df_processed.shape}")

        if len(df_processed) > 0:
            print("Initializing and fitting TF-IDF vectorizer...")
            tfidf_vectorizer_global = TfidfVectorizer(stop_words='english', max_features=5000)
            tfidf_matrix_global = tfidf_vectorizer_global.fit_transform(df_processed['combined_text_features'])
            print(f"TF-IDF matrix computed. Shape: {tfidf_matrix_global.shape}")

            df_processed.reset_index(drop=True, inplace=True)
            uid_to_idx = pd.Series(df_processed.index, index=df_processed['uid'])
        else:
            print("Skipping TF-IDF and UID mapping due to empty DataFrame after SFW filter.")
            tfidf_vectorizer_global = None
            tfidf_matrix_global = None
        print("Data loading and TF-IDF computation complete. Cosine Similarity will be computed on-demand")
    except FileNotFoundError:
        print(f"ERROR: Processed data file not found at {PROCESSED_DATA_PATH}. Please run the preprocessing script.")
    except Exception as e:
        print(f"An error occurred while loading data or computing TF-IDF: {e}")
        import traceback
        traceback.print_exc()

load_data_and_tfidf()


@app.route('/')
def hello():
    if df_processed is None or tfidf_matrix_global is None:
        return "Backend is initializing or encountered an error. Please check logs."
    return "Hello from AniManga Recommender Backend! Data and TF-IDF ready."

@app.route('/api/items')
def get_items():
    if df_processed is None:
        return jsonify({"error": "Dataset not available."}), 503

    # Get query parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 30, type=int)

    # Search query
    search_query = request.args.get('q', None, type=str)

    # New Filter paramter
    media_type_filter = request.args.get('media_type',None, type=str)
    genre_filter = request.args.get('genre', None, type=str)
    status_filter = request.args.get('status', None, type=str)
    min_score_filter = request.args.get('min_score', None, type=float)
    year_filter = request.args.get('year', None, type=int)

    data_subset = df_processed.copy()

    #apply filters sequentially
    if search_query:
        #ensure title is string befgore .str.ontains, fillna for sfety
        data_subset = data_subset[data_subset['title'].fillna('').str.contains(search_query, case=False, na=False)]
    
    if media_type_filter and media_type_filter.lower() != 'all':
        data_subset = data_subset[data_subset['media_type'].fillna('').str.lower() == media_type_filter.lower()]
    
    if genre_filter and genre_filter.lower() != 'all':
        def check_genre(genres_list):
            if isinstance(genres_list, list):
                return any(g.lower() == genre_filter.lower() for g in genres_list)
            return False
        data_subset = data_subset[data_subset['genres'].apply(check_genre)]
    
    if status_filter and status_filter.lower() != 'all':
        data_subset = data_subset[data_subset['status'].fillna('').str.lower() == status_filter.lower()]
    
    if min_score_filter is not None:
        #ensure score is numeric
        data_subset = data_subset[data_subset['score'].fillna(-1) >= min_score_filter]
    
    if year_filter is not None:
        #assuming stat year num column exists and is numeric
        data_subset = data_subset[data_subset['start_year_num'].fillna(0) == year_filter]
    

    total_items = len(data_subset)
    start = (page - 1) * per_page
    end = start + per_page
    items_paginated_df = data_subset.iloc[start:end].copy()
    items_for_json = items_paginated_df.replace({np.nan: None})
    items_list_of_dicts = items_for_json.to_dict(orient='records')

    return jsonify({
        "items": items_list_of_dicts,
        "page": page,
        "per_page": per_page,
        "total_items": total_items,
        "total_pages": (total_items + per_page - 1) // per_page if per_page > 0 else 0
    })

@app.route('/api/distinct-values')
def get_distinct_values():
    if df_processed is None:
        return jsonify({"error": "Dataset not available"}), 503
    try:
        #for genre filter
        all_genres = set()
        
        for genre_list in df_processed['genres'].dropna():
            if isinstance(genre_list, list):
                for genre in genre_list:
                    if isinstance(genre, str) and genre.strip(): #making sure genre is not empty
                        all_genres.add(genre.strip())
            elif isinstance(genre_list, str) and genre_list.strip():#handling if it is a single string genre
                all_genres.add(genre_list.strip())

        # For statuses (assuming it's a column of strings)
        all_statuses = set(s.strip() for s in df_processed['status'].dropna().unique() if isinstance(s, str) and s.strip())
        
        # For media types (if you ever wanted this dynamic, though it's usually fixed)
        all_media_types = set(mt.strip() for mt in df_processed['media_type'].dropna().unique() if isinstance(mt, str) and mt.strip())

        return jsonify({
            "genres": sorted(list(all_genres)),
            "statuses": sorted(list(all_statuses)),
            "media_types": sorted(list(all_media_types)) # e.g., ['Anime', 'Manga']
        })
    except Exception as e:
        print(f"Error fetching distinct values: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Could not retrieve distinct filter values."}), 500


@app.route('/api/items/<item_uid>')
def get_item_details(item_uid):
    if df_processed is None or uid_to_idx is None:
         return jsonify({"error": "Data not loaded or item UID mapping not available."}), 503
    if item_uid not in uid_to_idx.index:
        return jsonify({"error": "Item not found."}), 404
    
    idx = uid_to_idx[item_uid]
    item_details_series = df_processed.loc[idx].copy()

    item_details_series_cleaned = item_details_series.replace({np.nan: None})

    return jsonify(item_details_series_cleaned.to_dict())

@app.route('/api/recommendations/<item_uid>')
def get_recommendations(item_uid):
    if df_processed is None or tfidf_matrix_global is None or uid_to_idx is None:
        return jsonify({"error": "Recommendation system not ready. Data or TF-IDF matrix missing."}), 503

    if item_uid not in uid_to_idx.index:
        return jsonify({"error": "Target item for recommendations not found."}), 404
    cleaned_source_title = None
    try:
        item_idx = uid_to_idx[item_uid]
        source_title_value = df_processed.loc[item_idx, 'title']
        if pd.isna(source_title_value):
            cleaned_source_title = None
        elif isinstance(source_title_value, str):
            cleaned_source_title = source_title_value 
        else:
            cleaned_source_title = str(source_title_value) if source_title_value is not None else None
        source_item_vector = tfidf_matrix_global[item_idx]
        sim_scores_for_item = cosine_similarity(source_item_vector, tfidf_matrix_global)
        sim_scores = list(enumerate(sim_scores_for_item[0]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        num_recommendations = request.args.get('n', 10, type=int)
        top_n_indices = [i[0] for i in sim_scores[1:num_recommendations+1]]

        recommended_items_df = df_processed.loc[top_n_indices].copy()
        recommended_items_for_json = recommended_items_df.replace({np.nan: None})
        recommended_list_of_dicts = recommended_items_for_json[['uid', 'title', 'media_type', 'score', 'main_picture', 'genres', 'synopsis']].to_dict(orient='records')

        source_title = df_processed.loc[item_idx, 'title']
        cleaned_source_title = None if pd.isna(source_title) else cleaned_source_title

        return jsonify({
            "source_item_uid": item_uid,
            "source_item_title": cleaned_source_title,
            "recommendations": recommended_list_of_dicts
        })
    except KeyError as ke:
        print(f"KeyError accessing title or other column for item_idx {item_idx}: {ke}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "source_item_uid": item_uid,
            "source_item_title": "Title not available", 
            "recommendations": [], 
            "error_detail": f"Could not retrieve title for source item. {str(ke)}"
        }), 500
    except Exception as e:
        print(f"Error generating recommendations for {item_uid}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Could not generate recommendations."}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)