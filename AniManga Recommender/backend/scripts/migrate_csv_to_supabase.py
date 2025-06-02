import pandas as pd
import numpy as np
from supabase_client import SupabaseClient
import ast
import time
from typing import List, Dict, Any, Optional
import traceback
import json
from requests.exceptions import RequestException

class CSVToSupabaseMigrator:
    """
    Migrate data from processed_media.csv to Supabase database
    Handles the complex relational structure and maintains data integrity
    """
    
    def __init__(self):
        self.client = SupabaseClient()
        self.media_type_cache = {}
        self.genre_cache = {}
        self.theme_cache = {}
        self.demographic_cache = {}
        self.studio_cache = {}
        self.author_cache = {}
        
    def migrate_csv_to_supabase(self, csv_path: str = "data/processed_media.csv", batch_size: int = 50, skip_authors: bool = True):
        """
        Main migration function - migrates CSV data to Supabase
        """
        
        print("🚀 Starting CSV to Supabase Migration")
        print("=" * 50)
        
        if skip_authors:
            print("⚠️  SKIPPING AUTHOR POPULATION - Will only migrate items with existing relations")
        
        # Step 1: Load and prepare CSV data
        print("📂 Loading CSV data...")
        df = self.load_and_prepare_csv(csv_path)
        
        if df is None or len(df) == 0:
            print("❌ No data to migrate")
            return False
        
        print(f"✅ Loaded {len(df)} items from CSV")
        
        # Step 2: Load existing reference data first
        print("\n🔄 Loading existing reference data...")
        self.load_existing_reference_data()
        
        # Step 3: Check for existing items
        print("\n🔍 Checking for existing items...")
        existing_uids = self.get_existing_item_uids()
        new_items_df = df[~df['uid'].isin(existing_uids)].copy()
        
        print(f"   📊 Found {len(existing_uids)} existing items")
        print(f"   📦 {len(new_items_df)} new items to migrate")
        
        if len(new_items_df) == 0:
            print("   ✅ All items already exist - no migration needed!")
            return True
        
        # Step 4: Populate reference tables (media types, genres, etc.)
        print("\n📝 Populating reference tables...")
        self.populate_reference_tables(new_items_df, skip_authors=skip_authors)
        
        # Step 5: Migrate main items
        print("\n📦 Migrating main items...")
        success = self.migrate_items(new_items_df, batch_size)
        
        if success:
            print("\n🎉 Migration completed successfully!")
            self.print_migration_summary()
        else:
            print("\n❌ Migration failed!")
        
        return success
    
    def load_and_prepare_csv(self, csv_path: str) -> pd.DataFrame:
        """Load and prepare CSV data for migration"""
        
        try:
            # Load CSV with proper handling of list columns
            df = pd.read_csv(csv_path, low_memory=False)
            
            # Filter SFW content only
            if 'sfw' in df.columns:
                df = df[df['sfw'] == True].copy()
                print(f"   Filtered to {len(df)} SFW items")
            
            # Parse list columns from string representations
            list_columns = ['genres', 'themes', 'demographics', 'studios', 'authors', 
                          'producers', 'licensors', 'serializations', 'title_synonyms']
            
            for col in list_columns:
                if col in df.columns:
                    df[col] = df[col].apply(self.safe_parse_list)
            
            # Handle missing values
            df = df.replace({np.nan: None})
            
            # Remove testing limit - migrate entire CSV
            # df = df.head(100)  # REMOVED - now processing full dataset
            print(f"   📊 Processing full dataset: {len(df)} items")
            
            return df
            
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            return None
    
    def safe_parse_list(self, value):
        """Safely parse string representations of lists"""
        if pd.isna(value) or value is None:
            return []
        
        if isinstance(value, list):
            return value
        
        if isinstance(value, str):
            if value.startswith('[') and value.endswith(']'):
                try:
                    return ast.literal_eval(value)
                except:
                    return []
            else:
                return [value] if value.strip() else []
        
        return []
    
    def load_existing_reference_data(self):
        """Load existing reference data to avoid duplicates"""
        
        print("   🔍 Loading existing media types...")
        self.load_existing_table_data('media_types', self.media_type_cache)
        
        print("   🔍 Loading existing genres...")
        self.load_existing_table_data('genres', self.genre_cache)
        
        print("   🔍 Loading existing themes...")
        self.load_existing_table_data('themes', self.theme_cache)
        
        print("   🔍 Loading existing demographics...")
        self.load_existing_table_data('demographics', self.demographic_cache)
        
        print("   🔍 Loading existing studios...")
        self.load_existing_table_data('studios', self.studio_cache)
        
        print("   🔍 Loading existing authors...")
        self.load_existing_table_data('authors', self.author_cache)
    
    def load_existing_table_data(self, table_name: str, cache_dict: dict):
        """Load existing data from a table into cache"""
        try:
            # Load ALL existing records with proper pagination
            all_records = []
            offset = 0
            batch_size = 1000
            
            print(f"      🔄 Loading all existing {table_name}...")
            
            while True:
                response = self.client._make_request('GET', table_name, params={
                    'select': 'id,name',
                    'limit': batch_size, 
                    'offset': offset
                })
                
                if response.status_code == 200:
                    data = response.json()
                    if not data:  # No more records
                        break
                    all_records.extend(data)
                    offset += batch_size
                    print(f"         📦 Loaded {len(data)} records (total: {len(all_records)})")
                else:
                    print(f"      ⚠️  Could not load existing {table_name}: {response.status_code}")
                    break
                    
                # Small delay to avoid rate limiting during cache loading
                time.sleep(0.1)
            
            # Populate cache
            for item in all_records:
                cache_dict[item['name']] = item['id']
            print(f"      ✅ Loaded {len(all_records)} existing {table_name}")
            
        except Exception as e:
            print(f"      ⚠️  Error loading {table_name}: {e}")
    
    def populate_reference_tables(self, df: pd.DataFrame, skip_authors: bool = False):
        """Populate all reference tables (media_types, genres, etc.)"""
        
        # 1. Media Types
        self.populate_media_types(df)
        
        # 2. Genres
        self.populate_genres(df)
        
        # 3. Themes  
        self.populate_themes(df)
        
        # 4. Demographics
        self.populate_demographics(df)
        
        # 5. Studios
        self.populate_studios(df)
        
        # 6. Authors (skip if requested)
        if skip_authors:
            print("   ✍️  Authors... SKIPPED (using existing authors only)")
        else:
            self.populate_authors(df)
    
    def populate_media_types(self, df: pd.DataFrame):
        """Populate media_types table"""
        
        print("   📺 Media Types...")
        
        unique_types = df['media_type'].dropna().unique()
        
        for media_type in unique_types:
            if media_type not in self.media_type_cache:
                try:
                    data = {'name': media_type}
                    response = self.client._make_request('POST', 'media_types', data=data)
                    
                    if response.status_code in [200, 201]:
                        result = response.json()
                        self.media_type_cache[media_type] = result[0]['id'] if isinstance(result, list) else result['id']
                        print(f"      ✅ Added: {media_type}")
                    else:
                        print(f"      ⚠️  Failed to add {media_type}: {response.status_code}")
                        
                except Exception as e:
                    print(f"      ⚠️  Error with {media_type}: {e}")
            else:
                print(f"      ✅ Using existing: {media_type}")
    
    def populate_genres(self, df: pd.DataFrame):
        """Populate genres table"""
        
        print("   🎭 Genres...")
        
        all_genres = set()
        for genres_list in df['genres'].dropna():
            if isinstance(genres_list, list):
                all_genres.update(genres_list)
        
        added_count = 0
        for genre in all_genres:
            if genre not in self.genre_cache:
                success = self.add_reference_item('genres', genre, self.genre_cache)
                if success:
                    added_count += 1
        
        print(f"      ✅ Processed {len(all_genres)} genres ({added_count} new, {len(all_genres) - added_count} existing)")
    
    def populate_themes(self, df: pd.DataFrame):
        """Populate themes table"""
        
        print("   🎨 Themes...")
        
        all_themes = set()
        for themes_list in df['themes'].dropna():
            if isinstance(themes_list, list):
                all_themes.update(themes_list)
        
        added_count = 0
        for theme in all_themes:
            if theme not in self.theme_cache:
                success = self.add_reference_item('themes', theme, self.theme_cache)
                if success:
                    added_count += 1
        
        print(f"      ✅ Processed {len(all_themes)} themes ({added_count} new, {len(all_themes) - added_count} existing)")
    
    def populate_demographics(self, df: pd.DataFrame):
        """Populate demographics table"""
        
        print("   👥 Demographics...")
        
        all_demographics = set()
        for demo_list in df['demographics'].dropna():
            if isinstance(demo_list, list):
                all_demographics.update(demo_list)
        
        added_count = 0
        for demographic in all_demographics:
            if demographic not in self.demographic_cache:
                success = self.add_reference_item('demographics', demographic, self.demographic_cache)
                if success:
                    added_count += 1
        
        print(f"      ✅ Processed {len(all_demographics)} demographics ({added_count} new, {len(all_demographics) - added_count} existing)")
    
    def populate_studios(self, df: pd.DataFrame):
        """Populate studios table"""
        
        print("   🏢 Studios...")
        
        all_studios = set()
        for studio_list in df['studios'].dropna():
            if isinstance(studio_list, list):
                all_studios.update(studio_list)
        
        added_count = 0
        for studio in all_studios:
            if studio not in self.studio_cache:
                success = self.add_reference_item('studios', studio, self.studio_cache)
                if success:
                    added_count += 1
        
        print(f"      ✅ Processed {len(all_studios)} studios ({added_count} new, {len(all_studios) - added_count} existing)")
    
    def populate_authors_efficiently(self, df: pd.DataFrame):
        """Populate authors table with efficient duplicate checking"""
        
        print("   ✍️  Authors...")
        
        # Get all unique authors from CSV
        all_csv_authors = set()
        for author_list in df['authors'].dropna():
            if isinstance(author_list, list):
                all_csv_authors.update(author_list)
        
        print(f"      📊 Total unique authors in CSV: {len(all_csv_authors)}")
        
        # Get ALL existing authors from database (just names, faster)
        existing_authors = self.get_all_existing_authors_efficiently()
        
        # Find authors that actually need to be added
        authors_to_add = all_csv_authors - existing_authors
        
        print(f"      ✅ Authors already exist: {len(existing_authors & all_csv_authors)}")
        print(f"      📦 Authors to add: {len(authors_to_add)}")
        
        if len(authors_to_add) == 0:
            print("      🎉 All authors already exist!")
            return
        
        # Process new authors in batches
        batch_size = 25
        successful = 0
        failed = 0
        
        authors_list = list(authors_to_add)
        total_batches = (len(authors_list) + batch_size - 1) // batch_size
        
        for i in range(0, len(authors_list), batch_size):
            batch = authors_list[i:i + batch_size]
            batch_num = i // batch_size + 1
            
            print(f"      📦 Processing author batch {batch_num}/{total_batches} ({len(batch)} authors)")
            
            for author in batch:
                if self.add_reference_item_with_retry('authors', author, self.author_cache):
                    successful += 1
                else:
                    failed += 1
            
            # Pause between batches
            if batch_num < total_batches:
                time.sleep(1)
        
        print(f"      ✅ Authors processed: {successful} successful, {failed} failed")

    def populate_authors(self, df: pd.DataFrame):
        """Use the efficient author population method"""
        return self.populate_authors_efficiently(df)
    
    def add_reference_item_with_retry(self, table_name: str, item_name: str, cache_dict: dict, max_retries: int = 3) -> bool:
        """Add a single reference item with retry logic and rate limiting"""
        
        # First check if it exists (in case cache was incomplete)
        if item_name in cache_dict:
            return True
            
        for attempt in range(max_retries):
            try:
                # Add small delay to prevent rate limiting
                time.sleep(0.2)  
                
                data = {'name': item_name}
                response = self.client._make_request('POST', table_name, data=data)
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    cache_dict[item_name] = result[0]['id'] if isinstance(result, list) else result['id']
                    return True
                elif response.status_code == 409:
                    # Duplicate - try to fetch the existing ID
                    print(f"      📝 {item_name} already exists, fetching ID...")
                    try:
                        fetch_response = self.client._make_request('GET', table_name, params={
                            'name': f'eq.{item_name}',
                            'select': 'id,name'
                        })
                        if fetch_response.status_code == 200:
                            fetch_data = fetch_response.json()
                            if fetch_data:
                                cache_dict[item_name] = fetch_data[0]['id']
                                return True
                    except Exception as fetch_error:
                        print(f"      ⚠️  Could not fetch existing {item_name}: {fetch_error}")
                    return True  # Assume it exists even if we can't fetch the ID
                else:
                    print(f"      ⚠️  Failed to add {item_name} to {table_name}: {response.status_code}")
                    
            except Exception as e:
                error_msg = str(e)
                if "Expecting value" in error_msg or "JSON" in error_msg:
                    print(f"      ⚠️  API timeout for {item_name} (attempt {attempt + 1})")
                    time.sleep(2)  # Wait longer on JSON errors
                elif "409" in error_msg or "duplicate" in error_msg.lower():
                    print(f"      📝 {item_name} already exists (detected in exception)")
                    return True
                else:
                    print(f"      ⚠️  Error adding {item_name}: {error_msg}")
                    
                if attempt == max_retries - 1:
                    print(f"      ❌ Failed to add {item_name} after {max_retries} attempts")
                    return False
                    
        return False
    
    def add_reference_item(self, table_name: str, item_name: str, cache_dict: dict) -> bool:
        """Add a single reference item and update cache - using the new retry version"""
        return self.add_reference_item_with_retry(table_name, item_name, cache_dict)
    
    def migrate_items(self, df: pd.DataFrame, batch_size: int = 50) -> bool:
        """Migrate main items to the items table"""
        
        total_items = len(df)
        successful = 0
        failed = 0
        
        for i in range(0, total_items, batch_size):
            batch_df = df.iloc[i:i + batch_size]
            
            print(f"   📦 Processing batch {i//batch_size + 1}/{(total_items + batch_size - 1)//batch_size}")
            
            batch_items = []
            
            for idx, row in batch_df.iterrows():
                try:
                    # Create item data
                    item_data = self.prepare_item_data(row)
                    
                    if item_data:
                        batch_items.append(item_data)
                    
                except Exception as e:
                    print(f"      ⚠️  Error preparing item {row.get('uid', 'unknown')}: {e}")
                    failed += 1
            
            # Debug: Show first item structure
            if batch_items and i == 0:
                print(f"      🔍 Sample item structure:")
                sample_item = batch_items[0]
                for key, value in sample_item.items():
                    print(f"         {key}: {type(value).__name__} = {value}")
            
            # Normalize batch items to have same keys
            if batch_items:
                batch_items = self.normalize_batch_items(batch_items)
            
            # Insert batch
            if batch_items:
                try:
                    print(f"      📤 Sending {len(batch_items)} items to Supabase...")
                    response = self.client._make_request('POST', 'items', data=batch_items)
                    
                    print(f"      📡 Response status: {response.status_code}")
                    
                    if response.status_code in [200, 201]:
                        # Try to parse JSON response
                        try:
                            # Check if response has content
                            if response.text and len(response.text) > 0:
                                result = response.json()
                                inserted_items = result if isinstance(result, list) else [result]
                                print(f"      ✅ Successfully parsed {len(inserted_items)} items from response")
                                
                                # Create relations for each inserted item
                                print(f"      🔗 Creating relations for {len(inserted_items)} items...")
                                relations_created = 0
                                for j, inserted_item in enumerate(inserted_items):
                                    if j < len(batch_df):
                                        original_row = batch_df.iloc[j]
                                        item_relations = self.create_item_relations(inserted_item['id'], original_row)
                                        relations_created += item_relations
                                
                                print(f"      ✅ Created {relations_created} total relations")
                                successful += len(inserted_items)
                                
                            else:
                                print(f"      ⚠️  Empty response body, but 201 status indicates success")
                                print(f"      📄 Response length: {len(response.text)} bytes")
                                # Items inserted but we can't create relations without IDs
                                successful += len(batch_items)
                                print(f"      ⚠️  Skipping relation creation (no item IDs available)")
                                
                        except Exception as json_error:
                            print(f"      ❌ JSON parsing error: {json_error}")
                            print(f"      📄 Response preview: '{response.text[:200]}...'")
                            # Still count as successful since 201 status
                            successful += len(batch_items)
                            print(f"      ⚠️  Items inserted but relations skipped due to parsing error")
                        
                    else:
                        print(f"      ❌ Batch insert failed: {response.status_code}")
                        print(f"      📄 Response text: {response.text}")
                        if response.status_code == 400:
                            try:
                                error_details = response.json()
                                print(f"         Error details: {error_details}")
                            except:
                                print(f"         Could not parse error JSON: {response.text}")
                        failed += len(batch_items)
                        
                except Exception as e:
                    print(f"      ❌ Batch insert error: {e}")
                    print(f"      🔍 Exception type: {type(e).__name__}")
                    if hasattr(e, 'response'):
                        print(f"      📄 Exception response: {e.response.text}")
                    failed += len(batch_items)
            
            # Small delay to avoid rate limiting
            time.sleep(0.2)
        
        print(f"\n📊 Migration Results:")
        print(f"   ✅ Successful: {successful}")
        print(f"   ❌ Failed: {failed}")
        if successful + failed > 0:
            print(f"   📈 Success Rate: {(successful/(successful+failed)*100):.1f}%")
        
        return successful > 0
    
    def normalize_batch_items(self, batch_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ensure all items in batch have the same keys"""
        
        if not batch_items:
            return batch_items
        
        # Get all possible keys from all items
        all_keys = set()
        for item in batch_items:
            all_keys.update(item.keys())
        
        # Normalize each item to have all keys
        normalized_items = []
        for item in batch_items:
            normalized_item = {}
            for key in all_keys:
                normalized_item[key] = item.get(key, None)
            normalized_items.append(normalized_item)
        
        return normalized_items
    
    def prepare_item_data(self, row: pd.Series) -> Dict[str, Any]:
        """Prepare item data for insertion"""
        
        # Get media type ID
        media_type_id = self.media_type_cache.get(row.get('media_type'))
        if not media_type_id:
            print(f"      ⚠️  No media type ID found for: {row.get('media_type')}")
            return None
        
        # Helper function to safely convert to int
        def safe_int(value):
            if pd.isna(value) or value is None:
                return None
            try:
                return int(float(value))  # Convert via float first to handle strings like "123.0"
            except (ValueError, TypeError):
                return None
        
        # Helper function to safely convert to float
        def safe_float(value):
            if pd.isna(value) or value is None:
                return None
            try:
                return float(value)
            except (ValueError, TypeError):
                return None
        
        # Helper function to safely convert to string
        def safe_str(value):
            if pd.isna(value) or value is None:
                return None
            return str(value)
        
        # Helper function to safely handle lists (for PostgreSQL arrays) - COMPLETELY REWRITTEN
        def safe_list(value):
            """Convert any value to a list of strings, avoiding all pandas array operations"""
            
            # Handle None/NaN cases first
            if value is None:
                return []
            
            # Handle pandas NaN using string conversion (safer than pd.isna)
            if str(value).lower() in ['nan', 'none', '']:
                return []
            
            # Convert pandas Series to regular Python list immediately
            if hasattr(value, 'tolist'):
                try:
                    value = value.tolist()
                except:
                    return []
            
            # Convert numpy arrays to regular Python list
            if str(type(value)).startswith('<class \'numpy'):
                try:
                    value = list(value) if hasattr(value, '__iter__') else [value]
                except:
                    return []
            
            # Handle already converted regular lists
            if isinstance(value, list):
                result = []
                for item in value:
                    if item is not None:
                        item_str = str(item)
                        if item_str.lower() not in ['nan', 'none', '']:
                            result.append(item_str)
                return result
            
            # Handle strings
            if isinstance(value, str):
                if value.lower() not in ['nan', 'none', '']:
                    return [value]
                return []
            
            # Handle other iterables by converting to list first
            try:
                if hasattr(value, '__iter__'):
                    # Force conversion to regular list
                    converted = []
                    for item in value:
                        converted.append(item)
                    
                    # Now process the regular list
                    result = []
                    for item in converted:
                        if item is not None:
                            item_str = str(item)
                            if item_str.lower() not in ['nan', 'none', '']:
                                result.append(item_str)
                    return result
            except:
                pass
            
            # Handle single non-list values
            try:
                value_str = str(value)
                if value_str.lower() not in ['nan', 'none', '']:
                    return [value_str]
            except:
                pass
            
            return []
        
        try:
            # Map CSV columns to database columns with safe conversions
            item_data = {
                'uid': safe_str(row.get('uid')),
                'title': safe_str(row.get('title')),
                'media_type_id': media_type_id,
                'synopsis': safe_str(row.get('synopsis')),
                'score': safe_float(row.get('score')),
                'scored_by': safe_int(row.get('scored_by')),
                'popularity': safe_int(row.get('popularity')),
                'members': safe_int(row.get('members')),
                'favorites': safe_int(row.get('favorites')),
                'episodes': safe_int(row.get('episodes')),
                'chapters': safe_int(row.get('chapters')),
                'volumes': safe_int(row.get('volumes')),
                'status': safe_str(row.get('status')),
                'rating': safe_str(row.get('rating')),
                'start_date': safe_str(row.get('start_date')),
                'end_date': safe_str(row.get('end_date')),
                'image_url': safe_str(row.get('main_picture')),
                'trailer_url': safe_str(row.get('trailer_url')),
                'title_synonyms': safe_list(row.get('title_synonyms')),
                'licensors': safe_list(row.get('licensors'))
            }
            
            # Keep all keys, even None values (for batch consistency)
            return item_data
            
        except Exception as e:
            print(f"      ❌ Error preparing data for {row.get('uid', 'unknown')}: {e}")
            print(f"         Row data sample: {dict(row.head())}")
            return None
    
    def create_item_relations(self, item_id: int, row: pd.Series) -> int:
        """Create relations between items and reference tables"""
        
        relations_created = 0
        
        try:
            # Genres
            if row.get('genres') and isinstance(row['genres'], list):
                for genre in row['genres']:
                    if genre in self.genre_cache:
                        success = self.create_relation('item_genres', item_id, self.genre_cache[genre], 'genre_id')
                        if success:
                            relations_created += 1
            
            # Themes
            if row.get('themes') and isinstance(row['themes'], list):
                for theme in row['themes']:
                    if theme in self.theme_cache:
                        success = self.create_relation('item_themes', item_id, self.theme_cache[theme], 'theme_id')
                        if success:
                            relations_created += 1
            
            # Demographics
            if row.get('demographics') and isinstance(row['demographics'], list):
                for demo in row['demographics']:
                    if demo in self.demographic_cache:
                        success = self.create_relation('item_demographics', item_id, self.demographic_cache[demo], 'demographic_id')
                        if success:
                            relations_created += 1
            
            # Studios
            if row.get('studios') and isinstance(row['studios'], list):
                for studio in row['studios']:
                    if studio in self.studio_cache:
                        success = self.create_relation('item_studios', item_id, self.studio_cache[studio], 'studio_id')
                        if success:
                            relations_created += 1
            
            # Authors
            if row.get('authors') and isinstance(row['authors'], list):
                for author in row['authors']:
                    if author in self.author_cache:
                        success = self.create_relation('item_authors', item_id, self.author_cache[author], 'author_id')
                        if success:
                            relations_created += 1
                        
        except Exception as e:
            print(f"      ⚠️  Error creating relations for item {item_id}: {e}")
        
        return relations_created
    
    def create_relation(self, table: str, item_id: int, related_id: int, related_column: str) -> bool:
        """Create a relation in a junction table"""
        
        try:
            data = {
                'item_id': item_id,
                related_column: related_id
            }
            
            response = self.client._make_request('POST', table, data=data)
            
            if response.status_code not in [200, 201]:
                print(f"            ❌ Relation {table} failed: {response.status_code} - {response.text}")
                return False
            else:
                return True
                
        except Exception as e:
            print(f"            ❌ Relation {table} error: {e}")
            return False
    
    def print_migration_summary(self):
        """Print migration summary"""
        
        print("\n📈 Migration Summary:")
        print(f"   📺 Media Types: {len(self.media_type_cache)}")
        print(f"   🎭 Genres: {len(self.genre_cache)}")
        print(f"   🎨 Themes: {len(self.theme_cache)}")
        print(f"   👥 Demographics: {len(self.demographic_cache)}")
        print(f"   🏢 Studios: {len(self.studio_cache)}")
        print(f"   ✍️  Authors: {len(self.author_cache)}")
    
    def get_existing_item_uids(self) -> set:
        """Get UIDs of items that already exist in the database"""
        try:
            print("   📊 Loading all existing item UIDs...")
            
            all_uids = set()
            offset = 0
            batch_size = 1000
            
            while True:
                response = self.client._make_request('GET', 'items', params={
                    'select': 'uid',
                    'limit': batch_size,
                    'offset': offset
                })
                
                if response.status_code == 200:
                    data = response.json()
                    if not data:  # No more records
                        break
                    
                    batch_uids = {item['uid'] for item in data}
                    all_uids.update(batch_uids)
                    offset += batch_size
                    print(f"      📦 Loaded {len(data)} UIDs (total: {len(all_uids)})")
                else:
                    print(f"      ⚠️  Could not fetch existing items: {response.status_code}")
                    break
                    
                # Small delay to avoid rate limiting
                time.sleep(0.1)
            
            return all_uids
            
        except Exception as e:
            print(f"      ⚠️  Error fetching existing items: {e}")
            return set()

    def get_all_existing_authors_efficiently(self) -> set:
        """Get ALL existing author names efficiently"""
        try:
            print("   🔍 Getting complete list of existing authors...")
            
            all_authors = set()
            offset = 0
            batch_size = 1000
            
            while True:
                response = self.client._make_request('GET', 'authors', params={
                    'select': 'name',
                    'limit': batch_size,
                    'offset': offset
                })
                
                if response.status_code == 200:
                    data = response.json()
                    if not data:
                        break
                    author_names = {item['name'] for item in data}
                    all_authors.update(author_names)
                    offset += batch_size
                    print(f"      📦 Loaded {len(data)} author names (total: {len(all_authors)})")
                else:
                    break
                    
                time.sleep(0.1)
            
            print(f"   ✅ Found {len(all_authors)} existing authors in database")
            return all_authors
            
        except Exception as e:
            print(f"   ⚠️  Error getting existing authors: {e}")
            return set()


def main():
    """Run the migration"""
    
    migrator = CSVToSupabaseMigrator()
    
    # Run migration with smaller batches and all relations enabled
    success = migrator.migrate_csv_to_supabase(
        csv_path="data/processed_media.csv",
        batch_size=10,  # Smaller batches for better response reliability
        skip_authors=False  # Enable full author population and relations
    )
    
    if success:
        print("\n🎉 Migration completed! Your Supabase database is now populated.")
        print("🚀 You can now test your AniManga Recommender app!")
    else:
        print("\n❌ Migration failed. Check the logs above for details.")


if __name__ == "__main__":
    main() 