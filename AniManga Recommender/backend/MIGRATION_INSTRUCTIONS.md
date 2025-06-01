# 🚀 CSV to Supabase Migration Instructions

This guide will help you populate your Supabase database with data from your `processed_media.csv` file.

## 📋 Prerequisites

✅ **Database Setup Complete**: Your Supabase tables are created and accessible  
✅ **Environment Variables**: Your `.env` file has correct Supabase credentials  
✅ **CSV File**: `data/processed_media.csv` exists (98MB file)  
✅ **Dependencies**: All Python packages installed (`pandas`, `requests`, etc.)

## 🏃‍♂️ How to Run Migration

### Step 1: Navigate to Backend Directory

```bash
cd "AniManga Recommender/backend"
```

### Step 2: Run Migration Script

```bash
python migrate_csv_to_supabase.py
```

## 🧪 Testing Mode (Recommended First Run)

The script is currently set to **testing mode** and will migrate only **100 items** first. This is perfect for:

- ✅ Testing your database connection
- ✅ Verifying data mapping works correctly
- ✅ Checking for any errors before full migration

## 📊 What the Script Does

1. **📂 Load CSV**: Reads your `processed_media.csv` file
2. **🛡️ Filter Content**: Only migrates SFW (safe for work) content
3. **📝 Reference Tables**: Populates genres, themes, demographics, studios, authors
4. **📦 Main Items**: Migrates anime/manga items with all metadata
5. **🔗 Relations**: Creates proper many-to-many relationships
6. **📈 Progress**: Shows real-time progress and statistics

## 📈 Expected Output

```
🚀 Starting CSV to Supabase Migration
==================================================
📂 Loading CSV data...
   Filtered to 45,231 SFW items
   🧪 Testing mode: Limited to 100 items
✅ Loaded 100 items from CSV

📝 Populating reference tables...
   📺 Media Types...
      ✅ Added: anime
      ✅ Added: manga
   🎭 Genres...
      ✅ Processed 24 genres
   🎨 Themes...
      ✅ Processed 31 themes
   👥 Demographics...
      ✅ Processed 5 demographics
   🏢 Studios...
      ✅ Processed 43 studios
   ✍️  Authors...
      ✅ Processed 67 authors

📦 Migrating main items...
   📦 Processing batch 1/2
      ✅ Inserted 50 items
   📦 Processing batch 2/2
      ✅ Inserted 50 items

📊 Migration Results:
   ✅ Successful: 100
   ❌ Failed: 0
   📈 Success Rate: 100.0%

🎉 Migration completed successfully!

📈 Migration Summary:
   📺 Media Types: 2
   🎭 Genres: 24
   🎨 Themes: 31
   👥 Demographics: 5
   🏢 Studios: 43
   ✍️  Authors: 67
```

## 🔄 Full Migration (After Testing)

Once testing works successfully:

1. **Edit the script**: Open `migrate_csv_to_supabase.py`
2. **Find line 74**: `df = df.head(100)  # Start with 100 items for testing`
3. **Comment it out**: `# df = df.head(100)  # Start with 100 items for testing`
4. **Run again**: `python migrate_csv_to_supabase.py`

This will migrate your full dataset (~45,000+ items).

## ⚠️ Troubleshooting

### Database Connection Issues

```
❌ SUPABASE_URL and SUPABASE_KEY must be set in .env
```

**Solution**: Check your `.env` file has correct Supabase credentials

### CSV File Not Found

```
❌ Error loading CSV: [Errno 2] No such file or directory: 'data/processed_media.csv'
```

**Solution**: Make sure you're in the `backend` directory and the CSV file exists

### Rate Limiting

```
⚠️ Batch insert failed: 429
```

**Solution**: The script includes delays, but you can increase `batch_size` parameter if needed

### Permission Errors

```
❌ Error accessing table: 403
```

**Solution**: Check your Supabase service key has proper permissions

## 🎯 After Migration

Once migration completes successfully:

1. **Test Your App**: Start your Flask backend and React frontend
2. **Verify Data**: Check that items appear on your homepage
3. **Test Features**: Try filtering, searching, and recommendations
4. **Check Database**: Use Supabase dashboard to verify data

## 🔧 Customization Options

### Batch Size

Change `batch_size=50` to a smaller number if you hit rate limits:

```python
success = migrator.migrate_csv_to_supabase(
    csv_path="data/processed_media.csv",
    batch_size=25  # Smaller batches
)
```

### Custom CSV Path

If your CSV is in a different location:

```python
success = migrator.migrate_csv_to_supabase(
    csv_path="path/to/your/custom_file.csv",
    batch_size=50
)
```

## 🆘 Need Help?

If you encounter issues:

1. Check the console output for specific error messages
2. Verify your Supabase connection with the diagnostic script first
3. Make sure all dependencies are installed
4. Try the testing mode before full migration

Happy migrating! 🚀
