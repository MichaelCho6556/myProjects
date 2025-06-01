#!/usr/bin/env python3
"""
Debug script to test relations migration for a few items
"""

import pandas as pd
from migrate_csv_to_supabase import CSVToSupabaseMigrator

def test_relations_migration():
    """Test relations migration with detailed debugging"""
    
    print("🔍 Debug Relations Migration")
    print("=" * 50)
    
    # Initialize migrator
    migrator = CSVToSupabaseMigrator()
    
    # Load just a few items from CSV
    print("📂 Loading CSV data...")
    df = pd.read_csv("data/processed_media.csv", low_memory=False)
    
    # Filter SFW content
    if 'sfw' in df.columns:
        df = df[df['sfw'] == True].copy()
    
    # Parse list columns
    list_columns = ['genres', 'themes', 'demographics', 'studios', 'authors']
    for col in list_columns:
        if col in df.columns:
            df[col] = df[col].apply(migrator.safe_parse_list)
    
    # Take just first 2 items for testing
    test_df = df.head(2)
    
    print(f"✅ Loaded {len(test_df)} test items")
    
    # Show sample data
    for idx, row in test_df.iterrows():
        print(f"\n📊 Sample Item: {row['title']}")
        print(f"   🎭 Genres: {row.get('genres', [])}")
        print(f"   🎨 Themes: {row.get('themes', [])}")
        print(f"   👥 Demographics: {row.get('demographics', [])}")
        print(f"   🏢 Studios: {row.get('studios', [])}")
        print(f"   ✍️  Authors: {row.get('authors', [])}")
    
    # Load existing reference data
    print("\n🔄 Loading existing reference data...")
    migrator.load_existing_reference_data()
    
    print(f"📊 Reference data loaded:")
    print(f"   📺 Media Types: {len(migrator.media_type_cache)}")
    print(f"   🎭 Genres: {len(migrator.genre_cache)}")
    print(f"   🎨 Themes: {len(migrator.theme_cache)}")
    print(f"   👥 Demographics: {len(migrator.demographic_cache)}")
    print(f"   🏢 Studios: {len(migrator.studio_cache)}")
    print(f"   ✍️  Authors: {len(migrator.author_cache)}")
    
    # Check if first item already exists
    existing_items = migrator.get_existing_item_uids()
    first_item_uid = test_df.iloc[0]['uid']
    
    if first_item_uid in existing_items:
        print(f"\n✅ Item {first_item_uid} already exists - testing relations creation")
        
        # Get the item ID from database
        response = migrator.client._make_request('GET', 'items', params={'uid': f'eq.{first_item_uid}'})
        if response.status_code == 200:
            items = response.json()
            if items:
                item_id = items[0]['id']
                first_row = test_df.iloc[0]
                
                print(f"\n🔗 Testing relations creation for item ID {item_id}")
                migrator.create_item_relations(item_id, first_row)
        
    else:
        print(f"\n⚠️  Item {first_item_uid} doesn't exist - would need to insert first")

if __name__ == "__main__":
    test_relations_migration() 