#!/usr/bin/env python3
"""
Migration Script: Migrate Hardcoded Chapter Overrides to Database

This script migrates the hardcoded manga chapter overrides from Python code
to the database table, enabling dynamic management without code deployments.

Usage:
    python migrate_overrides_to_database.py [--dry-run] [--force]
    
Options:
    --dry-run    Show what would be migrated without making changes
    --force      Overwrite existing database entries with hardcoded values
"""

import sys
import os
import argparse
from datetime import datetime

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import SupabaseClient
from utils.manga_chapter_overrides import MangaChapterOverrides
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class OverrideMigrator:
    """Handles migration of hardcoded overrides to database"""
    
    def __init__(self, dry_run: bool = False, force: bool = False):
        self.dry_run = dry_run
        self.force = force
        self.supabase_client = SupabaseClient()
        
        # Statistics tracking
        self.stats = {
            'existing_in_db': 0,
            'migrated': 0,
            'skipped': 0,
            'errors': 0,
            'total_hardcoded': 0
        }
    
    def get_existing_overrides_from_database(self) -> dict:
        """Get current overrides from database"""
        try:
            response = self.supabase_client.table('manga_chapter_overrides').select('*').execute()
            
            existing = {}
            if response.data:
                for row in response.data:
                    uid = row.get('uid')
                    if uid:
                        existing[uid] = row
                        
            logger.info(f"Found {len(existing)} existing overrides in database")
            self.stats['existing_in_db'] = len(existing)
            return existing
            
        except Exception as e:
            logger.error(f"Failed to query existing overrides: {e}")
            return {}
    
    def get_hardcoded_overrides(self) -> dict:
        """Get hardcoded overrides from the MangaChapterOverrides class"""
        try:
            # Create instance without database loading to get only hardcoded data
            temp_manager = MangaChapterOverrides.__new__(MangaChapterOverrides)
            temp_manager.overrides = {}
            temp_manager.supabase_client = None
            
            # Access the hardcoded data directly
            temp_manager._hardcoded_overrides = {
                'mal_manga_13': {
                    'actual_chapters': 1128,
                    'source': 'manual',
                    'verified': True,
                    'notes': 'One Piece - Updated Aug 2025, ongoing weekly publication',
                    'last_updated': '2025-08-14T18:00:00'
                },
                'mal_manga_11061': {
                    'actual_chapters': 295,
                    'source': 'manual', 
                    'verified': True,
                    'notes': 'My Hero Academia - Updated Aug 2025',
                    'last_updated': '2025-08-14T18:00:00'
                },
                'mal_manga_85143': {
                    'actual_chapters': 267,
                    'source': 'manual',
                    'verified': True,
                    'notes': 'Jujutsu Kaisen - Updated Aug 2025', 
                    'last_updated': '2025-08-14T18:00:00'
                },
                'mal_manga_100448': {
                    'actual_chapters': 172,
                    'source': 'manual',
                    'verified': True,
                    'notes': 'Chainsaw Man - Updated Aug 2025',
                    'last_updated': '2025-08-14T18:00:00'
                },
                'mal_manga_44347': {
                    'actual_chapters': 152,
                    'source': 'manual',
                    'verified': True,
                    'notes': 'Demon Slayer - Completed series',
                    'last_updated': '2025-08-14T18:00:00'
                },
                'mal_manga_2': {
                    'actual_chapters': 720,
                    'source': 'manual',
                    'verified': True,
                    'notes': 'Dragon Ball - Completed classic',
                    'last_updated': '2025-08-14T18:00:00'
                },
                'mal_manga_1517': {
                    'actual_chapters': 681,
                    'source': 'manual',
                    'verified': True,
                    'notes': 'Bleach - Completed series',
                    'last_updated': '2025-08-14T18:00:00'
                }
            }
            
            hardcoded = temp_manager._hardcoded_overrides
            logger.info(f"Found {len(hardcoded)} hardcoded overrides to migrate")
            self.stats['total_hardcoded'] = len(hardcoded)
            return hardcoded
            
        except Exception as e:
            logger.error(f"Failed to get hardcoded overrides: {e}")
            return {}
    
    def migrate_override(self, uid: str, override_data: dict, existing_overrides: dict) -> bool:
        """Migrate a single override to database"""
        try:
            # Check if it already exists
            if uid in existing_overrides and not self.force:
                logger.info(f"Skipping {uid} - already exists in database (use --force to overwrite)")
                self.stats['skipped'] += 1
                return True
            
            # Prepare data for database
            upsert_data = {
                'uid': uid,
                'actual_chapters': override_data['actual_chapters'],
                'source': override_data.get('source', 'manual'),
                'verified': override_data.get('verified', False),
                'notes': override_data.get('notes', f'Migrated from hardcoded on {datetime.now().strftime("%Y-%m-%d")}'),
                'last_updated': datetime.now().isoformat()
            }
            
            if self.dry_run:
                logger.info(f"DRY-RUN: Would migrate {uid}: {upsert_data['actual_chapters']} chapters")
                self.stats['migrated'] += 1
                return True
            
            # Perform the migration
            response = self.supabase_client.table('manga_chapter_overrides').upsert(
                upsert_data
            ).execute()
            
            if response.data:
                action = "Updated" if uid in existing_overrides else "Inserted"
                logger.info(f"✅ {action} {uid}: {upsert_data['actual_chapters']} chapters")
                self.stats['migrated'] += 1
                return True
            else:
                logger.error(f"❌ Failed to migrate {uid}")
                self.stats['errors'] += 1
                return False
                
        except Exception as e:
            logger.error(f"Error migrating {uid}: {e}")
            self.stats['errors'] += 1
            return False
    
    def run_migration(self):
        """Run the complete migration process"""
        logger.info("=" * 60)
        logger.info("MANGA CHAPTER OVERRIDES MIGRATION")
        logger.info("=" * 60)
        
        if self.dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
        
        # Get existing database overrides
        existing_overrides = self.get_existing_overrides_from_database()
        
        # Get hardcoded overrides to migrate
        hardcoded_overrides = self.get_hardcoded_overrides()
        
        if not hardcoded_overrides:
            logger.error("No hardcoded overrides found to migrate")
            return False
        
        # Migrate each override
        logger.info(f"Starting migration of {len(hardcoded_overrides)} overrides...")
        
        for uid, override_data in hardcoded_overrides.items():
            self.migrate_override(uid, override_data, existing_overrides)
        
        # Print final statistics
        self.print_migration_summary()
        
        return self.stats['errors'] == 0
    
    def print_migration_summary(self):
        """Print migration summary statistics"""
        logger.info("\n" + "=" * 60)
        logger.info("MIGRATION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Hardcoded overrides found: {self.stats['total_hardcoded']}")
        logger.info(f"Existing in database: {self.stats['existing_in_db']}")
        logger.info(f"Successfully migrated: {self.stats['migrated']}")
        logger.info(f"Skipped (already exist): {self.stats['skipped']}")
        logger.info(f"Errors encountered: {self.stats['errors']}")
        
        if self.stats['errors'] == 0:
            if self.dry_run:
                logger.info("🎉 DRY RUN COMPLETE - Ready for actual migration!")
            else:
                logger.info("🎉 MIGRATION COMPLETE - All overrides successfully migrated!")
                logger.info("\nNext steps:")
                logger.info("1. Verify data in database")
                logger.info("2. Test application with database-driven overrides")
                logger.info("3. Remove hardcoded data from code after validation")
        else:
            logger.warning("⚠️ Migration completed with errors - review logs above")

def main():
    """Main function with argument parsing"""
    parser = argparse.ArgumentParser(description='Migrate hardcoded chapter overrides to database')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be migrated without making changes')
    parser.add_argument('--force', action='store_true',
                       help='Overwrite existing database entries with hardcoded values')
    
    args = parser.parse_args()
    
    migrator = OverrideMigrator(dry_run=args.dry_run, force=args.force)
    
    try:
        success = migrator.run_migration()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()