from supabase_client import SupabaseClient
import pandas as pd

def test_supabase_client():
    """Test the Supabase REST API client functionality"""
    
    print("🧪 Testing Supabase REST API Client\n")
    
    try:
        # Initialize client
        client = SupabaseClient()
        
        # Test 1: Basic connection
        print("1️⃣ Testing basic item retrieval...")
        items = client.get_all_items(limit=5)
        print(f"   Retrieved {len(items)} items")
        
        if items:
            print(f"   Sample item keys: {list(items[0].keys())}")
        
        # Test 2: DataFrame conversion
        print("\n2️⃣ Testing DataFrame conversion...")
        df = client.items_to_dataframe(include_relations=False)
        print(f"   DataFrame shape: {df.shape}")
        
        if len(df) > 0:
            print(f"   Columns: {list(df.columns)}")
        
        # Test 3: Relations (if data exists)
        print("\n3️⃣ Testing relations...")
        try:
            items_with_relations = client.get_items_with_relations(limit=5)
            print(f"   Retrieved {len(items_with_relations)} items with relations")
            
            if items_with_relations:
                sample = items_with_relations[0]
                print(f"   Sample relations: {[k for k in sample.keys() if k.startswith('item_') or k.endswith('_types')]}")
        except Exception as e:
            print(f"   Relations test failed: {e}")
        
        # Test 4: Filtering
        print("\n4️⃣ Testing filtering...")
        try:
            filters = {'media_type_id': 1}  # Assuming 1 = anime
            filtered = client.get_filtered_items(filters, limit=5)
            print(f"   Retrieved {len(filtered)} filtered items")
        except Exception as e:
            print(f"   Filtering test failed: {e}")
        
        # Test 5: Distinct values
        print("\n5️⃣ Testing distinct values...")
        try:
            distinct_media_types = client.get_distinct_values('media_type_id')
            print(f"   Distinct media types: {distinct_media_types}")
        except Exception as e:
            print(f"   Distinct values test failed: {e}")
        
        print("\n✅ All tests completed!")
        return True
        
    except Exception as e:
        print(f"❌ Client test failed: {e}")
        return False

def demo_rest_api_usage():
    """Demonstrate how to use REST API for common operations"""
    
    print("\n📚 REST API Usage Examples\n")
    
    client = SupabaseClient()
    
    # Example 1: Get all data as DataFrame (replaces CSV loading)
    print("Example 1: Load all data as DataFrame")
    print("```python")
    print("client = SupabaseClient()")
    print("df = client.items_to_dataframe(include_relations=True)")
    print("print(f'Loaded {len(df)} items')")
    print("```")
    
    # Example 2: Filtering
    print("\nExample 2: Filter items")
    print("```python")
    print("# Get high-rated anime")
    print("filters = {")
    print("    'media_type': 'anime',")
    print("    'score': {'gte': 8.0}")
    print("}")
    print("items = client.get_filtered_items(filters)")
    print("```")
    
    # Example 3: Supabase Query Syntax
    print("\nExample 3: Supabase Query Operators")
    print("```")
    print("eq     = equals          ?name=eq.Naruto")
    print("gte    = greater/equal   ?score=gte.8.0") 
    print("lt     = less than       ?episodes=lt.50")
    print("like   = pattern match   ?title=like.*Attack*")
    print("cs     = contains        ?genres=cs.{Action,Drama}")
    print("in     = in list         ?id=in.(1,2,3)")
    print("```")
    
    # Example 4: Complex Relations
    print("\nExample 4: Get Items with All Relations")
    print("```python")
    print("params = {")
    print("    'select': '''")
    print("        *,")
    print("        media_types(name),")
    print("        item_genres(genres(name)),")
    print("        item_themes(themes(name))")
    print("    ''',")
    print("    'limit': 1000")
    print("}")
    print("```")

if __name__ == "__main__":
    # Run tests
    success = test_supabase_client()
    
    if success:
        demo_rest_api_usage()
    else:
        print("\n💡 Make sure your Supabase database has some data before testing!") 