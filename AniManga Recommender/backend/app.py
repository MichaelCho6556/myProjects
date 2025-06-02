# backend/app.py
from flask import Flask, jsonify, request, g
from flask_cors import CORS
import os
import pandas as pd
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from supabase_client import SupabaseClient, SupabaseAuthClient, require_auth
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

# Global variables for data and ML models
df_processed = None
tfidf_vectorizer_global = None
tfidf_matrix_global = None
uid_to_idx = None
supabase_client = None
auth_client = None

def load_data_and_tfidf_from_supabase():
    """Load data from Supabase database instead of CSV files"""
    global df_processed, tfidf_vectorizer_global, tfidf_matrix_global, uid_to_idx, supabase_client

    if df_processed is not None and tfidf_matrix_global is not None:
        print(f"🔄 Data already loaded: {len(df_processed)} items")
        return

    try:
        print("🚀 Starting data load from Supabase...")
        
        # Initialize Supabase client
        supabase_client = SupabaseClient()
        
        # Get data as DataFrame from Supabase
        print("📊 Loading items from Supabase...")
        df_processed = supabase_client.items_to_dataframe(include_relations=True)
        
        print(f"✅ Loaded DataFrame with {len(df_processed)} items")
        
        if df_processed is None or len(df_processed) == 0:
            print("❌ No data loaded!")
            df_processed = pd.DataFrame()
            tfidf_vectorizer_global = None
            tfidf_matrix_global = None
            uid_to_idx = pd.Series(dtype='int64')
            return
        
        # Create combined text features for TF-IDF (if not exists)
        if 'combined_text_features' not in df_processed.columns:
            print("🔧 Creating combined text features...")
            df_processed = create_combined_text_features(df_processed)
            print(f"✅ Text features created. DataFrame now: {df_processed.shape}")
        
        # Fill NaN values in combined_text_features
        df_processed['combined_text_features'] = df_processed['combined_text_features'].fillna('')
        
        # Initialize TF-IDF vectorizer
        if len(df_processed) > 0:
            print("🤖 Creating TF-IDF matrix...")
            tfidf_vectorizer_global = TfidfVectorizer(stop_words='english', max_features=5000)
            tfidf_matrix_global = tfidf_vectorizer_global.fit_transform(df_processed['combined_text_features'])

            # Create UID to index mapping
            df_processed.reset_index(drop=True, inplace=True)
            uid_to_idx = pd.Series(df_processed.index, index=df_processed['uid'])
            print(f"✅ TF-IDF matrix created. Final data: {len(df_processed)} items")
        else:
            tfidf_vectorizer_global = None
            tfidf_matrix_global = None
            uid_to_idx = pd.Series(dtype='int64')
            
    except Exception as e:
        print(f"❌ Error loading data: {str(e)}")
        import traceback
        traceback.print_exc()
        df_processed = pd.DataFrame()
        tfidf_vectorizer_global = None
        tfidf_matrix_global = None
        uid_to_idx = pd.Series(dtype='int64')

def create_combined_text_features(df):
    """Create combined text features for TF-IDF if they don't exist"""
    
    def join_list_elements(lst):
        if isinstance(lst, list):
            return ' '.join(str(item).lower().replace(' ', '') for item in lst)
        return ''
    
    def preprocess_text(text):
        if pd.isna(text) or text is None:
            return ''
        return str(text).lower()
    
    # Create string versions of list columns (with safe column access)
    for col, default_str in [('genres', ''), ('themes', ''), ('demographics', '')]:
        if col in df.columns:
            df[f'{col}_str'] = df[col].apply(join_list_elements)
        else:
            df[f'{col}_str'] = default_str
    
    # Create start_year_num column if it doesn't exist
    if 'start_year_num' not in df.columns and 'start_date' in df.columns:
        # Extract year from start_date string (format: YYYY-MM-DD)
        df['start_year_num'] = df['start_date'].apply(
            lambda x: int(str(x)[:4]) if pd.notna(x) and str(x).strip() and len(str(x)) >= 4 and str(x)[:4].isdigit() else 0
        )
    elif 'start_year_num' not in df.columns:
        # Create empty column if neither exists
        df['start_year_num'] = 0
    
    # Create combined text features
    synopsis_str = df['synopsis'].apply(preprocess_text) if 'synopsis' in df.columns else ''
    title_str = df['title'].apply(preprocess_text) if 'title' in df.columns else ''
    
    df['combined_text_features'] = (
        df['genres_str'] + ' ' + 
        df['themes_str'] + ' ' + 
        df['demographics_str'] + ' ' + 
        synopsis_str + ' ' + 
        title_str
    )
    
    return df

def map_field_names_for_frontend(data_dict):
    """Map backend field names to frontend expected field names"""
    if isinstance(data_dict, dict):
        mapped_dict = data_dict.copy()
        
        # Map image_url to main_picture for consistency
        if 'image_url' in mapped_dict and 'main_picture' not in mapped_dict:
            mapped_dict['main_picture'] = mapped_dict['image_url']
        
        return mapped_dict
    return data_dict

def map_records_for_frontend(records_list):
    """Map field names for a list of records"""
    return [map_field_names_for_frontend(record) for record in records_list]

def initialize_auth_client():
    """Initialize the authentication client"""
    global auth_client
    if auth_client is None:
        auth_client = SupabaseAuthClient(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_KEY'),
            os.getenv('SUPABASE_SERVICE_KEY')
        )
    return auth_client

# Load data on startup
load_data_and_tfidf_from_supabase()

# Initialize auth client on startup
initialize_auth_client()

@app.route('/')
def hello():
    if df_processed is None or len(df_processed) == 0:
        return "Backend is initializing or no data available. Please check Supabase connection."
    return f"Hello from AniManga Recommender Backend! Loaded {len(df_processed)} items from Supabase."

@app.route('/api/items')
def get_items():
    if df_processed is None:
        return jsonify({"error": "Dataset not available."}), 503
    
    if len(df_processed) == 0:
        return jsonify({
            "items": [], "page": 1, "per_page": 30,
            "total_items": 0, "total_pages": 0, "sort_by": "score_desc"
        })

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 30, type=int)
    search_query = request.args.get('q', None, type=str)
    media_type_filter = request.args.get('media_type', None, type=str)
    
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

    # Apply filters sequentially
    if search_query:
        data_subset = data_subset[data_subset['title'].fillna('').str.contains(search_query, case=False, na=False)]
    
    if media_type_filter and media_type_filter.lower() != 'all':
        data_subset = data_subset[data_subset['media_type'].fillna('').str.lower() == media_type_filter.lower()]
    
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

    data_subset = apply_multi_filter(data_subset, 'genres', genre_filter_str)
    data_subset = apply_multi_filter(data_subset, 'themes', theme_filter_str)
    data_subset = apply_multi_filter(data_subset, 'demographics', demographic_filter_str)
    data_subset = apply_multi_filter(data_subset, 'studios', studio_filter_str)
    data_subset = apply_multi_filter(data_subset, 'authors', author_filter_str)
    
    if status_filter and status_filter.lower() != 'all':
        data_subset = data_subset[data_subset['status'].fillna('').str.lower() == status_filter.lower()]
    
    if min_score_filter is not None:
        data_subset = data_subset[pd.to_numeric(data_subset['score'], errors='coerce').fillna(-1) >= min_score_filter]
    
    if year_filter is not None:
        # Handle year filtering safely
        if 'start_year_num' in data_subset.columns:
            data_subset = data_subset[data_subset['start_year_num'] == year_filter]
        else:
            # If no start_year_num column, try to filter by start_date
            if 'start_date' in data_subset.columns:
                data_subset = data_subset[
                    data_subset['start_date'].str.startswith(str(year_filter), na=False)
                ]

    # Sorting
    if sort_by == 'score_desc':
        data_subset = data_subset.sort_values('score', ascending=False, na_position='last')
    elif sort_by == 'score_asc':
        data_subset = data_subset.sort_values('score', ascending=True, na_position='last')
    elif sort_by == 'title_asc':
        data_subset = data_subset.sort_values('title', ascending=True, na_position='last')
    elif sort_by == 'title_desc':
        data_subset = data_subset.sort_values('title', ascending=False, na_position='last')

    total_items = len(data_subset)
    total_pages = (total_items + per_page - 1) // per_page

    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_data = data_subset.iloc[start_idx:end_idx]

    # Convert to list of dicts for JSON response
    items_list = paginated_data.replace({np.nan: None}).to_dict(orient='records')
    
    # Map field names for frontend compatibility
    items_mapped = map_records_for_frontend(items_list)

    return jsonify({
        "items": items_mapped,
        "page": page,
        "per_page": per_page,
        "total_items": total_items,
        "total_pages": total_pages,
        "sort_by": sort_by
    })

@app.route('/api/distinct-values')
def get_distinct_values():
    if df_processed is None or len(df_processed) == 0:
        return jsonify({
            "genres": [], "statuses": [], "media_types": [], "themes": [],
            "demographics": [], "studios": [], "authors": []
        }), 503 if df_processed is None else 200
    
    try:
        def get_unique_from_lists(column_name):
            all_values = set()
            if column_name in df_processed.columns and not df_processed[column_name].dropna().empty:
                for item_list_val in df_processed[column_name].dropna():
                    if isinstance(item_list_val, list):
                        all_values.update(val.strip() for val in item_list_val if isinstance(val, str) and val.strip())
                    elif isinstance(item_list_val, str) and item_list_val.strip():
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
            "genres": all_genres,
            "themes": all_themes,
            "demographics": all_demographics,
            "studios": all_studios,
            "authors": all_authors,
            "statuses": all_statuses,
            "media_types": all_media_types
        })
    except Exception as e:
        return jsonify({"error": "Could not retrieve distinct values."}), 500

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
    
    try:
        item_idx = uid_to_idx[item_uid]
        source_title_value = df_processed.loc[item_idx, 'title']
        cleaned_source_title = None if pd.isna(source_title_value) else str(source_title_value)
        
        source_item_vector = tfidf_matrix_global[item_idx]
        sim_scores_for_item = cosine_similarity(source_item_vector, tfidf_matrix_global)
        sim_scores = list(enumerate(sim_scores_for_item[0]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        
        num_recommendations = request.args.get('n', 10, type=int)
        top_n_indices = [i[0] for i in sim_scores[1:num_recommendations+1]]

        recommended_items_df = df_processed.loc[top_n_indices].copy()
        recommended_items_for_json = recommended_items_df.replace({np.nan: None})
        recommended_list_of_dicts = recommended_items_for_json[['uid', 'title', 'media_type', 'score', 'image_url', 'genres', 'synopsis']].to_dict(orient='records')
        
        # Map field names for frontend compatibility
        recommended_mapped = map_records_for_frontend(recommended_list_of_dicts)

        return jsonify({
            "source_title": cleaned_source_title,
            "recommendations": recommended_mapped
        })
    except Exception as e:
        return jsonify({"error": "Could not generate recommendations."}), 500

@app.route('/api/auth/profile', methods=['GET'])
@require_auth
def get_user_profile():
    """Get current user's profile"""
    try:
        user_id = g.current_user['user_id']
        profile = auth_client.get_user_profile(user_id)
        
        if profile:
            return jsonify(profile)
        else:
            return jsonify({'error': 'Profile not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['PUT'])
@require_auth
def update_user_profile():
    """Update current user's profile"""
    try:
        user_id = g.current_user['user_id']
        updates = request.json
        
        # Remove fields that shouldn't be updated directly
        updates.pop('id', None)
        updates.pop('created_at', None)
        
        profile = auth_client.update_user_profile(user_id, updates)
        
        if profile:
            return jsonify(profile)
        else:
            return jsonify({'error': 'Failed to update profile'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/user-items', methods=['GET'])
@require_auth
def get_user_items():
    """Get user's anime/manga list"""
    try:
        user_id = g.current_user['user_id']
        status = request.args.get('status')  # Optional filter by status
        
        items = auth_client.get_user_items(user_id, status)
        return jsonify(items)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/user-items/<item_uid>', methods=['POST', 'PUT'])
@require_auth
def update_user_item_status(item_uid):
    """Update user's status for an anime/manga item"""
    try:
        user_id = g.current_user['user_id']
        data = request.json
        
        status = data.get('status')
        rating = data.get('rating')
        episodes_watched = data.get('episodes_watched')
        
        if not status:
            return jsonify({'error': 'Status is required'}), 400
        
        result = auth_client.update_user_item_status(
            user_id, item_uid, status, rating, episodes_watched
        )
        
        if result:
            return jsonify(result)
        else:
            return jsonify({'error': 'Failed to update item status'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/user-items/<item_uid>', methods=['DELETE'])
@require_auth
def remove_user_item(item_uid):
    """Remove item from user's list"""
    try:
        user_id = g.current_user['user_id']
        
        response = requests.delete(
            f"{os.getenv('SUPABASE_URL')}/rest/v1/user_items",
            headers=auth_client.headers,
            params={
                'user_id': f'eq.{user_id}',
                'item_uid': f'eq.{item_uid}'
            }
        )
        
        if response.status_code == 204:
            return jsonify({'message': 'Item removed successfully'})
        else:
            return jsonify({'error': 'Failed to remove item'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/verify-token', methods=['GET'])
@require_auth
def verify_token():
    """Verify if the current token is valid"""
    return jsonify({
        'valid': True,
        'user': g.current_user
    })

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)