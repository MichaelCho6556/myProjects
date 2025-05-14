# backend/app.py
from flask import Flask, jsonify, request
import os
import pandas as pd
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

load_dotenv()

app = Flask(__name__)

PROCESSED_DATA_FILENAME = "processed_media.csv"


BASE_DATA_PATH = "data"
PROCESSED_DATA_PATH = os.path.join(BASE_DATA_PATH, PROCESSED_DATA_FILENAME)

df_processed = None
tfidf_matrix = None
cosine_sim_matrix = None
uid_to_idx = None
idx_to_uid = None

def load_data_and_compute_similarity():
    global df_processed, tfidf_matrix, cosine_sim_matrix, uid_to_idx, idx_to_uid

    if df_processed is not None and cosine_sim_matrix is not None:
        print("Data and similarity matrix already loaded.")
        return

    try:
        print(f"Attempting to load procsesed data from: {PROCESSED_DATA_PATH}")
        df_processed = pd.read_csv(PROCESSED_DATA_PATH)

        if 'uid' not in df_processed.columns:
            print("ERROR: 'uid' column not found in processed data. Preprocessing might have an issue.")
            return

        df_processed['combined_text_features'].fillna('', inplace=True)
        print(f"Processed data loaded successfully. Shape: {df_processed.shape}")

        print("Computing TF-IDF matrix...")
        tfidf_vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
        tfidf_matrix = tfidf_vectorizer.fit_transform(df_processed['combined_text_features'])
        print(f"TF-IDF matrix computed. Shape: {tfidf_matrix.shape}")

        print("Computing cosine similarity matrix...")
        cosine_sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
        print(f"Cosine similarity matrix computed. Shape: {cosine_sim_matrix.shape}")

        df_processed.reset_index(drop=True, inplace=True)
        uid_to_idx = pd.Series(df_processed.index, index=df_processed['uid'])
        idx_to_uid = pd.Series(df_processed['uid'], index=df_processed.index)

        print("Data loading and similarity computation complete.")

    except FileNotFoundError:
        print(f"Error: Processed data file not found at {PROCESSED_DATA_PATH}. Please run the preprocessing script.")
    except Exception as e:
        print(f"An error occurred while loading data or computing similarity: {e}")
        import traceback
        traceback.print_exc()
load_data_and_compute_similarity()


@app.route('/')
def hello():
    if df_processed is None or cosine_sim_matrix is None:
        return "Backend is initializing or encountered an error. Please check logs."
    return "Hello from AniManga Recommender Backend! Data is Loaded."

@app.route('/api/items')
def get_items():
    if df_processed is None:
        return jsonify({"error": "Dataset not available."}), 503
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    start = (page - 1) * per_page
    end = start + per_page

    query = request.args.get('q', None, type=str)

    data_subset = df_processed
    if query:
        data_subset = df_processed[df_processed['title'].str.contains(query, case=False, na=False)]

    total_items = len(data_subset)
    items_paginated = data_subset.iloc[start:end]

    def parse_list_cols(df_to_parse):
        list_like_cols_in_processed = ['genres', 'themes', 'demographics', 'studios', 'producers', 'licensors', 'authors', 'serializations', 'title_synonyms']
        for col in list_like_cols_in_processed:
            if col in df_to_parse.columns:
                first_val = df_to_parse[col].dropna().iloc[0] if not df_to_parse[col].dropna().empty else None
                if isinstance(first_val, str) and first_val.startswith('[') and first_val.endswith(']'):
                    df_to_parse[col] = df_to_parse[col].apply(lambda x: ast.literal_eval(x) if isinstance(x, str) and x.startswith('[') else x)
        return df_to_parse

    items_paginated = parse_list_cols(items_paginated)

    return jsonify({
         "items": items_paginated.to_dict(orient='records'),
         "page": page,
         "per_page": per_page,
         "total_items": total_items,
         "total_pages": (total_items + per_page - 1) // per_page
    })

@app.route('/api/items/<item_uid>')
def get_item_details(item_uid):
    if df_processed is None or uid_to_idx is None:
        return jsonify({"error": "Data not loaded or item UID mapping not avilable."}), 503
    if item_uid not in uid_to_idx:
        return jsonify({"error": "Item not found."}), 404
    
    item_details = df_processed[df_processed['uid'] == item_uid].iloc[0]

    item_details_df = parse_list_cols(item_details.to_frame().T.copy())

    return jsonify(item_details_df.iloc[0].to_dict())

@app.route('/api/recommendations/<item_uid>')
def get_recommendations(item_uid):
    if df_processed is None or cosine_sim_matrix is None or uid_to_idx is None:
        return jsonify({"error": "Recommendation system not ready. Data or similarity matrix missing."}), 503
    if item_uid not in uid_to_idx:
        return jsonify({"error": "Target item for recommendation not found."}), 404
    try:
        item_idx = uid_to_idx[item_uid]
        sim_scores = list(enumerate(cosine_sim_matrix[item_idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        num_recommendations = request.args.get('n', 10, type=int)
        top_n_indices = [i[0] for i in sim_scores[1:num_recommendations+1]]

        recommended_uids = df_processed['uid'].iloc[top_n_indices]
        recommended_items = df_processed[df_processed['uid'].isin(recommended_uids)]

        recommended_items = recommended_items.set_index('uid').loc[recommended_uids].reset_index()
        recommended_items_parsed = parse_list_cols(recommended_items.copy())

        return jsonify({
            "source_item_uid": item_uid,
            "source_item_title": df_processed.loc[item_idx, 'title'],
            "recommendations": recommended_items_parsed[['uid', 'title', 'media_type', 'score', 'main_picture', 'genres']].to_dict(orient='records')
        })
    except Exception as e:
        print(f"Error while generating recommendations for {item_uid}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An error occurred while generating recommendations."}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)