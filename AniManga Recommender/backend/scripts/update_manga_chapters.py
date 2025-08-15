"""
Update Manga Chapter Counts Script

This script fetches accurate chapter counts from the MyAnimeList API
and updates the database to fix missing or incorrect chapter data.
"""

import asyncio
import sys
import os
from typing import List, Dict, Optional

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mal_api_client import MALAPIClient
from supabase_client import SupabaseClient
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MangaChapterUpdater:
    """Updates manga chapter counts in the database using MAL API data"""
    
    def __init__(self):
        self.mal_client = MALAPIClient()
        self.supabase_client = SupabaseClient()
        self.updated_count = 0
        self.failed_count = 0
        self.skipped_count = 0
        
    async def get_manga_entries_needing_update(self) -> List[Dict]:
        """Get manga entries that have missing or invalid chapter counts"""
        try:
            # Get entries with suspicious chapter counts using multiple queries to avoid limits
            filtered_entries = []
            
            # Query 1: Entries with 0 chapters
            zero_chapters = self.supabase_client.table('items').select(
                'id, uid, title, mal_id, chapters, media_type'
            ).ilike('uid', 'mal_manga_%').eq('chapters', 0).execute()
            
            # Query 2: Entries with 1 chapter  
            one_chapter = self.supabase_client.table('items').select(
                'id, uid, title, mal_id, chapters, media_type'
            ).ilike('uid', 'mal_manga_%').eq('chapters', 1).execute()
            
            # Query 3: Entries with null chapters
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
                
            # Remove duplicates based on uid
            seen_uids = set()
            for entry in all_results:
                uid = entry.get('uid')
                if uid not in seen_uids:
                    filtered_entries.append(entry)
                    seen_uids.add(uid)
            
            if filtered_entries:
                logger.info(f"Found {len(filtered_entries)} manga entries needing chapter count updates")
                # Check if One Piece is in the results
                one_piece_found = any('One Piece' in entry.get('title', '') for entry in filtered_entries)
                logger.info(f"One Piece found in results: {one_piece_found}")
                
                # Sort to put popular titles like One Piece first
                filtered_entries.sort(key=lambda x: (
                    0 if 'One Piece' in x.get('title', '') else 1,  # One Piece first
                    x.get('title', '')  # Then alphabetical
                ))
                return filtered_entries
            else:
                logger.warning("No manga entries found needing updates")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching manga entries: {e}")
            return []
    
    async def update_manga_chapter_count(self, manga_entry: Dict) -> bool:
        """Update a single manga's chapter count using MAL API"""
        try:
            mal_id = manga_entry.get('mal_id')
            uid = manga_entry.get('uid')
            title = manga_entry.get('title', 'Unknown')
            
            if not mal_id:
                logger.warning(f"Skipping {title} - no MAL ID available")
                self.skipped_count += 1
                return False
            
            # Fetch manga details from MAL API
            logger.info(f"Fetching chapter count for: {title} (MAL ID: {mal_id})")
            manga_details = await self.mal_client.get_manga_details(mal_id)
            
            if not manga_details:
                logger.warning(f"Failed to fetch details for {title} (MAL ID: {mal_id})")
                self.failed_count += 1
                return False
            
            num_chapters = manga_details.get('num_chapters')
            if not num_chapters or num_chapters == 0:
                logger.warning(f"No valid chapter count found for {title} - MAL returned {num_chapters}")
                self.skipped_count += 1
                return False
            
            # Update the database
            update_response = self.supabase_client.table('items').update({
                'chapters': num_chapters
            }).eq('uid', uid).execute()
            
            if update_response.data:
                logger.info(f"✅ Updated {title}: {num_chapters} chapters")
                self.updated_count += 1
                return True
            else:
                logger.error(f"Failed to update database for {title}")
                self.failed_count += 1
                return False
                
        except Exception as e:
            logger.error(f"Error updating {manga_entry.get('title', 'Unknown')}: {e}")
            self.failed_count += 1
            return False
    
    async def run_update(self, batch_size: int = 10, max_updates: Optional[int] = None):
        """Run the manga chapter update process"""
        logger.info("Starting manga chapter count update process...")
        
        # Get manga entries needing updates
        manga_entries = await self.get_manga_entries_needing_update()
        
        if not manga_entries:
            logger.info("No manga entries need updating. Exiting.")
            return
        
        # Limit the number of updates if specified
        if max_updates:
            manga_entries = manga_entries[:max_updates]
            logger.info(f"Limited to {max_updates} updates for this run")
        
        # Process in batches to respect rate limits
        total_entries = len(manga_entries)
        logger.info(f"Processing {total_entries} manga entries in batches of {batch_size}")
        
        for i in range(0, total_entries, batch_size):
            batch = manga_entries[i:i + batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}/{(total_entries + batch_size - 1)//batch_size}")
            
            # Process batch
            batch_tasks = [self.update_manga_chapter_count(manga) for manga in batch]
            await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Add delay between batches to respect rate limits
            if i + batch_size < total_entries:
                logger.info("Waiting 5 seconds before next batch...")
                await asyncio.sleep(5)
        
        # Print final statistics
        logger.info("="*50)
        logger.info("MANGA CHAPTER UPDATE SUMMARY")
        logger.info("="*50)
        logger.info(f"Total processed: {total_entries}")
        logger.info(f"Successfully updated: {self.updated_count}")
        logger.info(f"Failed: {self.failed_count}")
        logger.info(f"Skipped (no data): {self.skipped_count}")
        logger.info(f"Success rate: {(self.updated_count/total_entries)*100:.1f}%")
        
        # Close the MAL client session
        if self.mal_client.session:
            await self.mal_client.session.close()

async def main():
    """Main function to run the update script"""
    updater = MangaChapterUpdater()
    
    # Run with default settings: 10 entries per batch, limit to 50 for testing
    await updater.run_update(batch_size=10, max_updates=50)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Update process interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)