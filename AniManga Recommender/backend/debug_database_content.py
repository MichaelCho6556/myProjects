from supabase_client import SupabaseClient
import requests

def check_database_tables():
    """Check what tables exist and their content in Supabase"""
    
    print("🔍 Debugging Supabase Database Content\n")
    
    client = SupabaseClient()
    
    # List of tables to check
    tables_to_check = [
        'items',
        'media_types', 
        'genres',
        'themes',
        'demographics',
        'studios', 
        'authors',
        'item_genres',
        'item_themes',
        'item_demographics',
        'item_studios',
        'item_authors'
    ]
    
    for table in tables_to_check:
        print(f"📊 Checking table: {table}")
        
        try:
            # Try to get a few records from each table
            response = client._make_request('GET', table, params={'limit': 5})
            data = response.json()
            
            print(f"   ✅ Table exists: {len(data)} records found")
            
            if data:
                print(f"   📋 Sample columns: {list(data[0].keys())}")
                
                # Show sample data for key tables
                if table in ['items', 'media_types', 'genres']:
                    print(f"   📄 Sample data:")
                    for i, record in enumerate(data[:2]):
                        print(f"      {i+1}. {record}")
            else:
                print(f"   ⚠️  Table is EMPTY")
                
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                print(f"   ❌ Table does NOT exist")
            else:
                print(f"   ❌ Error accessing table: {e}")
        except Exception as e:
            print(f"   ❌ Unexpected error: {e}")
        
        print()

def check_database_schema():
    """Check the database schema via REST API"""
    
    print("🏗️  Checking Database Schema\n")
    
    client = SupabaseClient()
    
    try:
        # Try to get schema information (if available)
        # Note: This might not work depending on Supabase settings
        response = client._make_request('GET', '', params={'select': 'version'})
        print("✅ REST API accessible")
    except Exception as e:
        print(f"❌ Schema check failed: {e}")

def test_direct_media_types():
    """Test the media_types table specifically (we know this has data)"""
    
    print("🎬 Testing media_types table (should have anime/manga)\n")
    
    client = SupabaseClient()
    
    try:
        response = client._make_request('GET', 'media_types', params={'limit': 10})
        media_types = response.json()
        
        print(f"📊 Found {len(media_types)} media types:")
        for mt in media_types:
            print(f"   - {mt}")
        
        return media_types
        
    except Exception as e:
        print(f"❌ Failed to get media types: {e}")
        return []

def suggest_next_steps(media_types):
    """Suggest what to do based on findings"""
    
    print("🎯 Next Steps Recommendations\n")
    
    if media_types:
        print("✅ Database structure exists and has reference data")
        print("💡 The 'items' table is just empty - you need to populate it")
        print()
        print("Options:")
        print("1. 📥 Migrate data from your CSV files")
        print("2. 🔗 Add sample data manually via Supabase dashboard")  
        print("3. 🧪 Create test data programmatically")
        print()
        print("Would you like me to:")
        print("a) Create a CSV migration script")
        print("b) Generate sample test data")
        print("c) Show you how to add data via Supabase dashboard")
    else:
        print("❌ Database structure is missing or different")
        print("💡 You may need to:")
        print("1. 🔄 Re-run your table creation SQL")
        print("2. 🔍 Check you're connected to the right Supabase project")
        print("3. 🛠️  Verify table permissions")

if __name__ == "__main__":
    print("🔍 Supabase Database Diagnostics")
    print("=" * 40)
    
    # Check all tables
    check_database_tables()
    
    # Check schema
    check_database_schema()
    
    # Test specific table
    media_types = test_direct_media_types()
    
    # Suggest next steps
    suggest_next_steps(media_types) 