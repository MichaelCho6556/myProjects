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
            # Ensure column is treated as list, even if loaded as string representations
            try:
                # Attempt to evaluate string representations of lists
                df_to_parse[col] = df_to_parse[col].apply(
                    lambda x: ast.literal_eval(x) if isinstance(x, str) and x.startswith('[') and x.endswith(']')
                    else (x if isinstance(x, list) else [])
                )
            except (ValueError, SyntaxError) as e:
                print(f"Warning: Could not parse column {col} with ast.literal_eval. Error: {e}. Treating as empty list or existing list.")
                df_to_parse[col] = df_to_parse[col].apply(lambda x: [] if not isinstance(x, list) else x)
            # Ensure all non-list values become empty lists after potential eval
            df_to_parse[col] = df_to_parse[col].apply(lambda x: x if isinstance(x, list) else [])
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


def map_field_names_for_frontend(data_dict):
    """
    Map backend field names to frontend expected field names
    Specifically maps 'main_picture' to 'image_url' for image display
    """
    if isinstance(data_dict, dict):
        # Create a copy to avoid modifying the original
        mapped_dict = data_dict.copy()
        
        # Map main_picture to image_url for frontend compatibility
        if 'main_picture' in mapped_dict:
            print(f"DEBUG: Mapping main_picture to image_url: {mapped_dict['main_picture']}")
            mapped_dict['image_url'] = mapped_dict.pop('main_picture')
        
        return mapped_dict
    return data_dict


def map_records_for_frontend(records_list):
    """
    Map field names for a list of records
    """
    return [map_field_names_for_frontend(record) for record in records_list]


load_data_and_tfidf()


@app.route('/')
def hello():
    if df_processed is None or (len(df_processed) > 0 and tfidf_matrix_global is None):
        return "Backend is initializing or encountered an error. Please check logs."
    return "Hello from AniManga Recommender Backend! Data and TF-IDF ready."

@app.route('/api/items')
def get_items():
    if df_processed is None:
        return jsonify({"error": "Dataset not available."}), 503
    
    if len(df_processed) == 0:
        return jsonify ({
            "items": [], "page": 1, "per_page": 30,
            "total_items": 0, "total_pages": 0, "sort_by": "score_desc"
        })

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 30, type=int)
    search_query = request.args.get('q', None, type=str)
    media_type_filter = request.args.get('media_type',None, type=str)
    

    genre_filter_str = request.args.get('genre', None, type=str)
    theme_filter_str = request.args.get('theme', None, type=str)
    demographic_filter_str = request.args.get('demographic', None, type=str)
    studio_filter_str = request.args.get('studio', None, type=str)
    author_filter_str = request.args.get('author', None, type=str)

    
    status_filter = request.args.get('status', None, type=str)
    min_score_filter = request.args.get('min_score', None, type=float)
    year_filter = request.args.get('year', None, type=int)
    sort_by = request.args.get('sort_by', 'score_desc', type=str)

    data_subset = df_processed.copy()

    #apply filters sequentially
    if search_query:
        #ensure title is string befgore .str.ontains, fillna for sfety
        data_subset = data_subset[data_subset['title'].fillna('').str.contains(search_query, case=False, na=False)]
    
    if media_type_filter and media_type_filter.lower() != 'all':
        data_subset = data_subset[data_subset['media_type'].fillna('').str.lower() == media_type_filter.lower()]
    
    def apply_multi_filter(df, column_name, filter_str_values):
        if filter_str_values and filter_str_values.lower() != 'all':
            # Split comma-separated string into a list of lowercase filter values
            selected_filters = [f.strip().lower() for f in filter_str_values.split(',') if f.strip()]
            if not selected_filters: # If after stripping, list is empty (e.g. filter_str was just ',')
                return df
            
            def check_item_has_all_selected(item_column_list):
                if not isinstance(item_column_list, list): 
                    return False
                # Convert item's list elements to lowercase strings for comparison
                item_elements_lower = [str(elem).lower() for elem in item_column_list]
                # Check if ALL selected filters are present in the item's list
                return all(sel_filter in item_elements_lower for sel_filter in selected_filters)
            
            return df[df[column_name].apply(check_item_has_all_selected)]
        return df

    data_subset = apply_multi_filter(data_subset, 'genres', genre_filter_str)
    data_subset = apply_multi_filter(data_subset, 'themes', theme_filter_str)
    data_subset = apply_multi_filter(data_subset, 'demographics', demographic_filter_str)
    data_subset = apply_multi_filter(data_subset, 'studios', studio_filter_str)
    data_subset = apply_multi_filter(data_subset, 'authors', author_filter_str) 
    
    if status_filter and status_filter.lower() != 'all':
        data_subset = data_subset[data_subset['status'].fillna('').str.lower() == status_filter.lower()]
    
    if min_score_filter is not None:
        data_subset = data_subset[pd.to_numeric(data_subset['score'], errors='coerce').fillna(-1) >= min_score_filter] # Added pd.to_numeric
    
    if year_filter is not None:
        data_subset = data_subset[pd.to_numeric(data_subset['start_year_num'], errors='coerce').fillna(0) == year_filter] # Added pd.to_numeric
    

    
    #Apply sorting before pagination
    if sort_by == 'score_desc':
        data_subset = data_subset.sort_values(by=['score', 'members'], ascending=[False, False], na_position='last')
    elif sort_by == 'score_asc':
        data_subset = data_subset.sort_values(by=['score', 'members'], ascending=[True, False], na_position='first') # Changed na_position
    elif sort_by == 'popularity_desc':
        data_subset = data_subset.sort_values(by='members', ascending=False, na_position='last')
    elif sort_by == 'title_asc':
        data_subset = data_subset.sort_values(by='title', ascending=True, key=lambda col: col.astype(str).str.lower(), na_position='last')
    elif sort_by == 'title_desc':
        data_subset = data_subset.sort_values(by='title', ascending=False, key=lambda col: col.astype(str).str.lower(), na_position='last')
    elif sort_by == 'start_date_desc':
        data_subset = data_subset.sort_values(by='start_date', ascending=False, na_position='last')
    elif sort_by == 'start_date_asc': # Added for completeness
        data_subset = data_subset.sort_values(by='start_date', ascending=True, na_position='first') 
    
    total_items = len(data_subset)
    start = (page - 1) * per_page
    end = start + per_page
    items_paginated_df = data_subset.iloc[start:end].copy()
    items_for_json = items_paginated_df.replace({np.nan: None})
    items_list_of_dicts = items_for_json.to_dict(orient='records')
    
    # Map field names for frontend compatibility
    items_mapped = map_records_for_frontend(items_list_of_dicts)

    return jsonify({
        "items": items_mapped,
        "page": page,
        "per_page": per_page,
        "total_items": total_items,
        "total_pages": (total_items + per_page - 1) // per_page if per_page > 0 else 0,
        "sort_by": sort_by
    })

@app.route('/api/distinct-values')
def get_distinct_values():
    if df_processed is None or len(df_processed) == 0: # Check for empty df_processed
        return jsonify({
            "genres": [], "statuses": [], "media_types": [], "themes": [],
            "demographics": [], "studios": [], "authors": []
        }), 503 if df_processed is None else 200 # 503 if not loaded, 200 if loaded but empty
    try:
        def get_unique_from_lists(column_name):
            all_values = set()
            # Ensure the column exists and is not empty before processing
            if column_name in df_processed.columns and not df_processed[column_name].dropna().empty:
                for item_list_val in df_processed[column_name].dropna():
                    if isinstance(item_list_val, list):
                        all_values.update(val.strip() for val in item_list_val if isinstance(val, str) and val.strip())
                    elif isinstance(item_list_val, str) and item_list_val.strip(): # Should not happen if parse_list_cols_on_load works
                        all_values.add(item_list_val.strip())
            return sorted(list(all_values))

        all_genres = get_unique_from_lists('genres')
        all_themes = get_unique_from_lists('themes')
        all_demographics = get_unique_from_lists('demographics')
        all_studios = get_unique_from_lists('studios')
        all_authors = get_unique_from_lists('authors')
        
        all_statuses = sorted(list(set(s.strip() for s in df_processed['status'].dropna().unique() if isinstance(s, str) and s.strip())))
        all_media_types = sorted(list(set(mt.strip() for mt in df_processed['media_type'].dropna().unique() if isinstance(mt, str) and mt.strip())))

        return jsonify({
            "genres": all_genres, "statuses": all_statuses, "media_types": all_media_types,
            "themes": all_themes, "demographics": all_demographics,
            "studios": all_studios, "authors": all_authors
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
    item_details_dict = item_details_series_cleaned.to_dict()
    
    # Map field names for frontend compatibility  
    item_details_mapped = map_field_names_for_frontend(item_details_dict)

    return jsonify(item_details_mapped)

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
        
        # Map field names for frontend compatibility
        recommended_mapped = map_records_for_frontend(recommended_list_of_dicts)

        source_title = df_processed.loc[item_idx, 'title']
        cleaned_source_title = None if pd.isna(source_title) else cleaned_source_title

        return jsonify({
            "source_item_uid": item_uid,
            "source_item_title": cleaned_source_title,
            "recommendations": recommended_mapped
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