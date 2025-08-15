"""
Update Ongoing Manga Chapter Counts

This script is designed to run periodically (weekly) to update chapter counts
for ongoing manga series. It focuses on popular ongoing series that users
actively track and ensures their chapter counts stay current.

Usage:
    python update_ongoing_manga.py [--dry-run] [--manga-ids id1,id2,id3]
"""

import asyncio
import sys
import os
import argparse
from typing import List, Dict, Optional
from datetime import datetime, timedelta

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mal_api_client import MALAPIClient
from jikan_api_client import JikanAPIClient
from supabase_client import SupabaseClient
from utils.manga_chapter_overrides import get_chapter_overrides, MangaChapterOverrides
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ongoing_manga_updates.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class OngoingMangaUpdater:
    """Updates chapter counts for popular ongoing manga series"""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.mal_client = MALAPIClient()
        self.jikan_client = JikanAPIClient()
        self.supabase_client = SupabaseClient()
        self.override_manager = MangaChapterOverrides()
        
        # Popular ongoing manga that need regular updates
        # These are manually curated based on user activity and popularity
        self.ongoing_manga_targets = [
            {
                'uid': 'mal_manga_13',
                'mal_id': 13,
                'title': 'One Piece',
                'expected_chapters': 1128,  # As of Aug 2025
                'update_frequency': 'weekly',
                'priority': 'high'
            },
            {
                'uid': 'mal_manga_11061',
                'mal_id': 11061,
                'title': 'My Hero Academia',
                'expected_chapters': 295,
                'update_frequency': 'weekly',
                'priority': 'high'
            },
            {
                'uid': 'mal_manga_85143',
                'mal_id': 85143,
                'title': 'Jujutsu Kaisen',
                'expected_chapters': 267,
                'update_frequency': 'weekly',
                'priority': 'high'
            },
            {
                'uid': 'mal_manga_100448',
                'mal_id': 100448,
                'title': 'Chainsaw Man',
                'expected_chapters': 172,
                'update_frequency': 'monthly',
                'priority': 'medium'
            }
        ]
        
        self.stats = {
            'checked': 0,
            'updated': 0,
            'no_change': 0,
            'errors': 0,
            'new_overrides': 0
        }
    
    async def get_current_chapter_count_from_sources(self, manga_info: Dict) -> Optional[Dict]:
        """Get the most current chapter count from available sources"""
        mal_id = manga_info['mal_id']
        title = manga_info['title']
        
        logger.info(f"Checking current chapter count for: {title}")
        
        # Try multiple sources for the most accurate count
        sources_tried = []
        
        # 1. Try Jikan API (MAL website scraper)
        try:
            jikan_data = await self.jikan_client.get_manga_details(mal_id)
            if jikan_data:
                chapters = jikan_data.get('chapters')
                if chapters and chapters > 0:
                    sources_tried.append(f"Jikan: {chapters}")
                    return {
                        'chapters': chapters,
                        'source': 'jikan',
                        'confidence': 'medium',
                        'last_updated': datetime.now().isoformat()
                    }
        except Exception as e:
            logger.warning(f"Jikan API failed for {title}: {e}")
            sources_tried.append("Jikan: failed")
        
        # 2. Try MAL API (less reliable for ongoing)
        try:
            mal_data = await self.mal_client.get_manga_details(mal_id)
            if mal_data:
                chapters = mal_data.get('num_chapters', 0)
                if chapters and chapters > 0:
                    sources_tried.append(f"MAL: {chapters}")
                    return {
                        'chapters': chapters,
                        'source': 'mal_api',
                        'confidence': 'low' if mal_data.get('status') == 'currently_publishing' else 'medium',
                        'last_updated': datetime.now().isoformat()
                    }
        except Exception as e:
            logger.warning(f"MAL API failed for {title}: {e}")
            sources_tried.append("MAL: failed")
        
        logger.warning(f"No reliable chapter count found for {title}. Sources tried: {', '.join(sources_tried)}")
        return None
    
    async def update_manga_chapter_count(self, manga_info: Dict, target_manga_ids: List[int] = None) -> bool:
        """Update chapter count for a specific manga"""
        uid = manga_info['uid']
        mal_id = manga_info['mal_id']
        title = manga_info['title']
        expected_chapters = manga_info['expected_chapters']
        
        # Skip if not in target list
        if target_manga_ids and mal_id not in target_manga_ids:
            return False
        
        self.stats['checked'] += 1
        
        try:
            # Get current data from database
            db_result = self.supabase_client.table('items').select(
                'uid, title, chapters'
            ).eq('uid', uid).execute()
            
            if not db_result.data:
                logger.error(f"Manga {title} not found in database")
                self.stats['errors'] += 1
                return False
            
            current_db_chapters = db_result.data[0].get('chapters', 0)
            logger.info(f"Current database chapters for {title}: {current_db_chapters}")
            
            # Get current chapter count from external sources
            source_data = await self.get_current_chapter_count_from_sources(manga_info)
            
            if not source_data:
                logger.warning(f"Could not get updated chapter count for {title}")
                self.stats['errors'] += 1
                return False
            
            new_chapters = source_data['chapters']
            source = source_data['source']
            
            logger.info(f"Found {new_chapters} chapters for {title} from {source}")
            
            # Determine if update is needed
            should_update_db = False
            should_update_override = False
            
            # Check if database needs updating
            if new_chapters != current_db_chapters:
                should_update_db = True
                logger.info(f"Database update needed: {current_db_chapters} → {new_chapters}")
            
            # Check if override needs updating/creating
            current_override = self.override_manager.get_override(uid)
            if current_override:
                if new_chapters != current_override['actual_chapters']:
                    should_update_override = True
                    logger.info(f"Override update needed: {current_override['actual_chapters']} → {new_chapters}")
            else:
                # Create new override if chapters differ significantly from expected
                if abs(new_chapters - expected_chapters) > 5:  # Allow some variance
                    should_update_override = True
                    self.stats['new_overrides'] += 1
                    logger.info(f"Creating new override: expected {expected_chapters}, found {new_chapters}")
            
            # Perform updates if not in dry-run mode
            if not self.dry_run:
                if should_update_db:
                    update_result = self.supabase_client.table('items').update({
                        'chapters': new_chapters
                    }).eq('uid', uid).execute()
                    
                    if update_result.data:
                        logger.info(f"✓ Updated database for {title}: {new_chapters} chapters")
                    else:
                        logger.error(f"Failed to update database for {title}")
                        self.stats['errors'] += 1
                        return False
                
                if should_update_override:
                    self.override_manager.add_override(
                        uid, 
                        new_chapters, 
                        source=source,
                        verified=True,
                        notes=f"Auto-updated on {datetime.now().strftime('%Y-%m-%d')} from {source}"
                    )
                    logger.info(f"✓ Updated override for {title}: {new_chapters} chapters")
            else:
                logger.info(f"DRY-RUN: Would update {title} to {new_chapters} chapters")
            
            if should_update_db or should_update_override:
                self.stats['updated'] += 1
            else:
                self.stats['no_change'] += 1
                logger.info(f"✓ {title} is up to date: {new_chapters} chapters")
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating {title}: {e}")
            self.stats['errors'] += 1
            return False
    
    async def run_update(self, target_manga_ids: List[int] = None):
        """Run the periodic ongoing manga update"""
        logger.info("=" * 60)
        logger.info("ONGOING MANGA CHAPTER UPDATE STARTING")
        logger.info("=" * 60)
        
        if self.dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
        
        if target_manga_ids:
            logger.info(f"🎯 Targeting specific manga IDs: {target_manga_ids}")
        
        # Process each manga
        for manga_info in self.ongoing_manga_targets:
            try:
                await self.update_manga_chapter_count(manga_info, target_manga_ids)
                # Add delay between manga to respect rate limits
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Failed to process {manga_info['title']}: {e}")
                self.stats['errors'] += 1
        
        # Print final statistics
        await self.print_statistics()
        
        # Cleanup
        await self.cleanup()
    
    async def print_statistics(self):
        """Print update statistics"""
        logger.info("\n" + "=" * 60)
        logger.info("ONGOING MANGA UPDATE SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Manga checked: {self.stats['checked']}")
        logger.info(f"Updates made: {self.stats['updated']}")
        logger.info(f"No changes needed: {self.stats['no_change']}")
        logger.info(f"New overrides created: {self.stats['new_overrides']}")
        logger.info(f"Errors encountered: {self.stats['errors']}")
        
        if self.stats['checked'] > 0:
            success_rate = ((self.stats['updated'] + self.stats['no_change']) / self.stats['checked']) * 100
            logger.info(f"Success rate: {success_rate:.1f}%")
        
        if not self.dry_run and self.stats['updated'] > 0:
            logger.info("\n📈 Updated manga will now have accurate chapter counts for users!")
        
        # Export updated overrides
        if self.stats['updated'] > 0 or self.stats['new_overrides'] > 0:
            logger.info("\n💾 Exporting updated override data...")
            sql_export = self.override_manager.export_to_sql()
            with open('updated_overrides.sql', 'w', encoding='utf-8') as f:
                f.write(sql_export)
            logger.info("Override data exported to: updated_overrides.sql")
    
    async def cleanup(self):
        """Clean up API client sessions"""
        try:
            if self.mal_client.session:
                await self.mal_client.session.close()
            if self.jikan_client.session:
                await self.jikan_client.session.close()
        except Exception as e:
            logger.warning(f"Error during cleanup: {e}")

def parse_manga_ids(manga_ids_str: str) -> List[int]:
    """Parse comma-separated manga IDs"""
    if not manga_ids_str:
        return []
    try:
        return [int(id.strip()) for id in manga_ids_str.split(',')]
    except ValueError:
        raise argparse.ArgumentTypeError("Manga IDs must be comma-separated integers")

async def main():
    """Main function with argument parsing"""
    parser = argparse.ArgumentParser(description='Update ongoing manga chapter counts')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Run in dry-run mode (no actual updates)')
    parser.add_argument('--manga-ids', type=str,
                       help='Comma-separated list of MAL manga IDs to update (e.g., "13,11061,85143")')
    
    args = parser.parse_args()
    
    target_ids = None
    if args.manga_ids:
        target_ids = parse_manga_ids(args.manga_ids)
        logger.info(f"Targeting specific manga IDs: {target_ids}")
    
    updater = OngoingMangaUpdater(dry_run=args.dry_run)
    
    try:
        await updater.run_update(target_manga_ids=target_ids)
    except KeyboardInterrupt:
        logger.info("Update process interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await updater.cleanup()

if __name__ == "__main__":
    asyncio.run(main())