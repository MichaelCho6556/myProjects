"""
Enhanced Manga Chapter Update Script

This script updates manga chapter counts using multiple data sources with priority:
1. Manual overrides (highest accuracy for ongoing series)
2. Jikan API (MAL website scraper, better than API)
3. MAL API (fallback for completed series)

Designed to solve the ongoing manga chapter count problem where APIs return 0
for popular series like One Piece which actually has 1100+ chapters.
"""

import asyncio
import sys
import os
from typing import List, Dict, Optional

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mal_api_client import MALAPIClient
from jikan_api_client import JikanAPIClient
from supabase_client import SupabaseClient
from utils.manga_chapter_overrides import EnhancedChapterResolver, get_chapter_overrides
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('manga_chapter_updates.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EnhancedMangaChapterUpdater:
    """Enhanced manga chapter updater with multi-source data resolution"""
    
    def __init__(self):
        self.mal_client = MALAPIClient()
        self.jikan_client = JikanAPIClient()
        self.supabase_client = SupabaseClient()
        self.chapter_resolver = EnhancedChapterResolver(
            self.supabase_client, 
            self.mal_client, 
            self.jikan_client
        )
        
        # Statistics tracking
        self.stats = {
            'total_processed': 0,
            'updated_from_override': 0,
            'updated_from_jikan': 0,
            'updated_from_mal': 0,
            'failed_updates': 0,
            'skipped_no_data': 0,
            'already_accurate': 0
        }
    
    async def get_manga_entries_needing_update(self, include_overrides: bool = True) -> List[Dict]:
        """Get manga entries that need chapter count updates"""
        try:
            # Get entries with suspicious chapter counts using multiple queries
            filtered_entries = []
            
            # Query for entries with 0 chapters
            zero_chapters = self.supabase_client.table('items').select(
                'id, uid, title, mal_id, chapters, media_type'
            ).ilike('uid', 'mal_manga_%').eq('chapters', 0).execute()
            
            # Query for entries with 1 chapter (often incorrect for series)
            one_chapter = self.supabase_client.table('items').select(
                'id, uid, title, mal_id, chapters, media_type'
            ).ilike('uid', 'mal_manga_%').eq('chapters', 1).execute()
            
            # Query for entries with null chapters
            null_chapters = self.supabase_client.table('items').select(
                'id, uid, title, mal_id, chapters, media_type'
            ).ilike('uid', 'mal_manga_%').is_('chapters', 'null').execute()
            
            # Combine all results
            all_results = []
            if zero_chapters.data:
                all_results.extend(zero_chapters.data)
            if one_chapter.data:
                all_results.extend(one_chapter.data)
            if null_chapters.data:
                all_results.extend(null_chapters.data)
            
            # Remove duplicates
            seen_uids = set()
            for entry in all_results:
                uid = entry.get('uid')
                if uid not in seen_uids:
                    filtered_entries.append(entry)
                    seen_uids.add(uid)
            
            # If including overrides, prioritize entries that have overrides
            if include_overrides:
                override_manager = get_chapter_overrides()
                
                # Sort so that entries with overrides come first
                filtered_entries.sort(key=lambda x: (
                    0 if override_manager.has_override(x.get('uid', '')) else 1,
                    1 if 'One Piece' in x.get('title', '') else 2,  # One Piece gets priority
                    x.get('title', '')
                ))
            
            if filtered_entries:
                logger.info(f"Found {len(filtered_entries)} manga entries needing updates")
                
                # Show override statistics
                override_stats = self.chapter_resolver.get_override_stats()
                logger.info(f"Override stats: {override_stats}")
                
                return filtered_entries
            else:
                logger.warning("No manga entries found needing updates")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching manga entries: {e}")
            return []
    
    async def update_manga_chapter_count(self, manga_entry: Dict) -> bool:
        """Update a single manga's chapter count using enhanced resolution"""
        try:
            uid = manga_entry.get('uid')
            mal_id = manga_entry.get('mal_id')
            title = manga_entry.get('title', 'Unknown')
            current_chapters = manga_entry.get('chapters', 0)
            
            if not mal_id:
                logger.warning(f"Skipping {title} - no MAL ID available")
                self.stats['skipped_no_data'] += 1
                return False
            
            # Use enhanced chapter resolver
            logger.info(f"Resolving chapter count for: {title} (Current: {current_chapters})")
            result = await self.chapter_resolver.get_chapter_count(uid, mal_id, title)
            
            new_chapters = result['chapters']
            source = result['source']
            confidence = result['confidence']
            
            if not new_chapters or new_chapters <= 0:
                logger.warning(f"No valid chapter count found for {title}")
                self.stats['skipped_no_data'] += 1
                return False
            
            # Check if update is needed
            if current_chapters == new_chapters:
                logger.info(f"✓ {title} already has correct chapter count: {new_chapters}")
                self.stats['already_accurate'] += 1
                return True
            
            # Update the database
            update_response = self.supabase_client.table('items').update({
                'chapters': new_chapters
            }).eq('uid', uid).execute()
            
            if update_response.data:
                logger.info(f"SUCCESS Updated {title}: {current_chapters} → {new_chapters} chapters (source: {source}, confidence: {confidence})")
                
                # Update statistics based on source
                if source == 'override':
                    self.stats['updated_from_override'] += 1
                elif source == 'jikan':
                    self.stats['updated_from_jikan'] += 1
                elif source == 'mal_api':
                    self.stats['updated_from_mal'] += 1
                
                return True
            else:
                logger.error(f"Failed to update database for {title}")
                self.stats['failed_updates'] += 1
                return False
                
        except Exception as e:
            logger.error(f"Error updating {manga_entry.get('title', 'Unknown')}: {e}")
            self.stats['failed_updates'] += 1
            return False
    
    async def run_update(self, batch_size: int = 10, max_updates: Optional[int] = None, 
                        prioritize_overrides: bool = True):
        """Run the enhanced manga chapter update process"""
        logger.info("=" * 60)
        logger.info("ENHANCED MANGA CHAPTER UPDATE STARTING")
        logger.info("=" * 60)
        
        # Get manga entries needing updates
        manga_entries = await self.get_manga_entries_needing_update(prioritize_overrides)
        
        if not manga_entries:
            logger.info("No manga entries need updating. Exiting.")
            return
        
        # Limit the number of updates if specified
        if max_updates:
            original_count = len(manga_entries)
            manga_entries = manga_entries[:max_updates]
            logger.info(f"Limited to {max_updates} updates (from {original_count} total candidates)")
        
        # Process in batches
        total_entries = len(manga_entries)
        self.stats['total_processed'] = total_entries
        
        logger.info(f"Processing {total_entries} manga entries in batches of {batch_size}")
        
        for i in range(0, total_entries, batch_size):
            batch = manga_entries[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total_entries + batch_size - 1) // batch_size
            
            logger.info(f"\n--- Processing batch {batch_num}/{total_batches} ---")
            
            # Process batch
            batch_tasks = [self.update_manga_chapter_count(manga) for manga in batch]
            await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Add delay between batches for rate limiting
            if i + batch_size < total_entries:
                logger.info("Waiting 3 seconds before next batch...")
                await asyncio.sleep(3)
        
        # Print final statistics
        await self.print_final_statistics()
        
        # Close API clients
        await self.cleanup()
    
    async def print_final_statistics(self):
        """Print comprehensive update statistics"""
        total = self.stats['total_processed']
        successful = (self.stats['updated_from_override'] + 
                     self.stats['updated_from_jikan'] + 
                     self.stats['updated_from_mal'] +
                     self.stats['already_accurate'])
        
        logger.info("\n" + "=" * 60)
        logger.info("ENHANCED MANGA CHAPTER UPDATE SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total processed: {total}")
        logger.info(f"Successfully resolved: {successful}")
        logger.info(f"  ├─ From overrides: {self.stats['updated_from_override']}")
        logger.info(f"  ├─ From Jikan API: {self.stats['updated_from_jikan']}")
        logger.info(f"  ├─ From MAL API: {self.stats['updated_from_mal']}")
        logger.info(f"  └─ Already accurate: {self.stats['already_accurate']}")
        logger.info(f"Failed updates: {self.stats['failed_updates']}")
        logger.info(f"Skipped (no data): {self.stats['skipped_no_data']}")
        
        if total > 0:
            success_rate = (successful / total) * 100
            logger.info(f"Success rate: {success_rate:.1f}%")
        
        # Source effectiveness
        logger.info("\nSOURCE EFFECTIVENESS:")
        if self.stats['updated_from_override'] > 0:
            logger.info(f"✓ Manual overrides: {self.stats['updated_from_override']} updates (highest accuracy)")
        if self.stats['updated_from_jikan'] > 0:
            logger.info(f"✓ Jikan API: {self.stats['updated_from_jikan']} updates (MAL website scraper)")
        if self.stats['updated_from_mal'] > 0:
            logger.info(f"✓ MAL API: {self.stats['updated_from_mal']} updates (official API)")
        
        logger.info("\nNext steps:")
        logger.info("- Check One Piece chapter count in dashboard")
        logger.info("- Popular ongoing manga should now have accurate counts")
        logger.info("- Consider running weekly to keep data fresh")
    
    async def cleanup(self):
        """Clean up API client sessions"""
        try:
            if self.mal_client.session:
                await self.mal_client.session.close()
            if self.jikan_client.session:
                await self.jikan_client.session.close()
        except Exception as e:
            logger.warning(f"Error during cleanup: {e}")

async def main():
    """Main function to run the enhanced update script"""
    updater = EnhancedMangaChapterUpdater()
    
    try:
        # Run with enhanced settings
        await updater.run_update(
            batch_size=8,          # Smaller batches for better rate limiting
            max_updates=50,        # Process 50 entries per run
            prioritize_overrides=True  # Prioritize entries with manual overrides
        )
    except KeyboardInterrupt:
        logger.info("Update process interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await updater.cleanup()

if __name__ == "__main__":
    asyncio.run(main())