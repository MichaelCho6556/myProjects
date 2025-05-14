import pandas as pd
import os

ANIME_FILENAME = "anime.csv"
MANGA_FILENAME = "manga.csv"
COMBINED_FILENAME = "combined_media.csv"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")
ANIME_PATH = os.path.join(DATA_DIR, ANIME_FILENAME)
MANGA_PATH = os.path.join(DATA_DIR, MANGA_FILENAME)
COMBINED_PATH = os.path.join(DATA_DIR, COMBINED_FILENAME)

def combine_and_explore_data():
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