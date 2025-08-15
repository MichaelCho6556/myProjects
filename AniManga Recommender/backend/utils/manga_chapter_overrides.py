"""
Manga Chapter Overrides Management

This module manages manual overrides for manga chapter counts,
particularly for ongoing series where API data is inaccurate.
"""

from typing import Dict, Optional, List
from datetime import datetime
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

logger = logging.getLogger(__name__)

class MangaChapterOverrides:
    """Manager for manga chapter count overrides with database integration"""
    
    def __init__(self, supabase_client=None):
        """
        Initialize override manager with database integration.
        
        Args:
            supabase_client: Optional Supabase client for database operations.
                           If None, will attempt to import and create one.
        """
        self.supabase_client = supabase_client
        self.overrides = {}
        
        # Load overrides from database first, fallback to hardcoded
        self._load_overrides_from_database()
        
        # Hardcoded fallback data (will be deprecated after migration)
        self._hardcoded_overrides = {
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
        
        # If database load failed, use hardcoded as fallback
        if not self.overrides:
            logger.warning("Database override load failed, using hardcoded fallback data")
            self.overrides = self._hardcoded_overrides.copy()
    
    def _load_overrides_from_database(self):
        """Load override data from the database."""
        try:
            if self.supabase_client is None:
                # Try to import and create Supabase client
                from supabase_client import SupabaseClient
                self.supabase_client = SupabaseClient()
            
            # Query the manga_chapter_overrides table
            response = self.supabase_client.table('manga_chapter_overrides').select('*').execute()
            
            if response.data:
                # Convert database rows to override format
                for row in response.data:
                    uid = row.get('uid')
                    if uid:
                        self.overrides[uid] = {
                            'actual_chapters': row.get('actual_chapters', 0),
                            'source': row.get('source', 'database'),
                            'verified': row.get('verified', False),
                            'notes': row.get('notes', ''),
                            'last_updated': row.get('last_updated', datetime.now().isoformat())
                        }
                
                logger.info(f"Loaded {len(self.overrides)} overrides from database")
            else:
                logger.info("No overrides found in database, will use hardcoded fallback")
                
        except ImportError:
            logger.warning("Supabase client not available, using hardcoded overrides")
        except Exception as e:
            logger.error(f"Failed to load overrides from database: {e}")
            logger.info("Using hardcoded fallback data")
    
    def _get_supabase_client(self):
        """Get or create Supabase client."""
        if self.supabase_client is None:
            try:
                from supabase_client import SupabaseClient
                self.supabase_client = SupabaseClient()
            except ImportError:
                logger.error("Cannot import SupabaseClient")
                raise
        return self.supabase_client
    
    def sync_to_database(self) -> bool:
        """
        Sync current overrides to database.
        
        Returns:
            bool: True if sync was successful, False otherwise
        """
        try:
            client = self._get_supabase_client()
            
            # Upsert each override to database
            for uid, data in self.overrides.items():
                upsert_data = {
                    'uid': uid,
                    'actual_chapters': data['actual_chapters'],
                    'source': data['source'],
                    'verified': data['verified'],
                    'notes': data['notes'],
                    'last_updated': datetime.now().isoformat()
                }
                
                # Use upsert to handle both insert and update
                response = client.table('manga_chapter_overrides').upsert(
                    upsert_data
                ).execute()
                
                if not response.data:
                    logger.warning(f"Failed to sync override for {uid}")
            
            logger.info(f"Successfully synced {len(self.overrides)} overrides to database")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync overrides to database: {e}")
            return False
    
    def add_override_to_database(self, uid: str, chapters: int, source: str = 'manual', 
                                verified: bool = False, notes: str = None) -> bool:
        """
        Add or update an override both in memory and database.
        
        Args:
            uid (str): Item UID
            chapters (int): Chapter count
            source (str): Data source
            verified (bool): Whether verified
            notes (str): Additional notes
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Update memory first
            self.add_override(uid, chapters, source, verified, notes)
            
            # Update database
            client = self._get_supabase_client()
            
            upsert_data = {
                'uid': uid,
                'actual_chapters': chapters,
                'source': source,
                'verified': verified,
                'notes': notes or f'Override added on {datetime.now().strftime("%Y-%m-%d")}',
                'last_updated': datetime.now().isoformat()
            }
            
            # First try to update existing record
            try:
                update_response = client.table('manga_chapter_overrides').update(
                    upsert_data
                ).eq('uid', uid).execute()
                
                if update_response.data:
                    logger.info(f"Successfully updated override for {uid} in database")
                    return True
                else:
                    # Record doesn't exist, try to insert
                    insert_response = client.table('manga_chapter_overrides').insert(
                        upsert_data
                    ).execute()
                    
                    if insert_response.data:
                        logger.info(f"Successfully added new override for {uid} in database")
                        return True
                    else:
                        logger.error(f"Failed to add override for {uid} to database")
                        return False
                        
            except Exception as e:
                # If update failed, try insert (record might not exist)
                if "does not exist" in str(e) or "not found" in str(e):
                    try:
                        insert_response = client.table('manga_chapter_overrides').insert(
                            upsert_data
                        ).execute()
                        
                        if insert_response.data:
                            logger.info(f"Successfully added new override for {uid} in database")
                            return True
                        else:
                            logger.error(f"Failed to add override for {uid} to database")
                            return False
                    except Exception as insert_e:
                        logger.error(f"Failed to insert override for {uid}: {insert_e}")
                        return False
                else:
                    logger.error(f"Failed to update override for {uid}: {e}")
                    return False
                
        except Exception as e:
            logger.error(f"Failed to add override to database: {e}")
            return False
    
    def remove_override_from_database(self, uid: str) -> bool:
        """
        Remove an override from both memory and database.
        
        Args:
            uid (str): Item UID to remove
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Remove from memory
            success = self.remove_override(uid)
            
            if not success:
                return False
            
            # Remove from database
            client = self._get_supabase_client()
            
            response = client.table('manga_chapter_overrides').delete().eq('uid', uid).execute()
            
            if response.data is not None:  # Supabase returns [] for successful delete
                logger.info(f"Successfully removed override for {uid} from database")
                return True
            else:
                logger.error(f"Failed to remove override for {uid} from database")
                return False
                
        except Exception as e:
            logger.error(f"Failed to remove override from database: {e}")
            return False
    
    def reload_from_database(self) -> bool:
        """
        Reload all overrides from database, discarding memory cache.
        
        Returns:
            bool: True if reload was successful, False otherwise
        """
        try:
            old_count = len(self.overrides)
            self.overrides.clear()
            self._load_overrides_from_database()
            
            new_count = len(self.overrides)
            logger.info(f"Reloaded overrides from database: {old_count} -> {new_count}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reload overrides from database: {e}")
            return False
    
    def get_override(self, uid: str) -> Optional[Dict]:
        """Get override data for a manga by UID"""
        return self.overrides.get(uid)
    
    def get_chapter_count(self, uid: str) -> Optional[int]:
        """Get the overridden chapter count for a manga"""
        override = self.get_override(uid)
        if override:
            return override['actual_chapters']
        return None
    
    def has_override(self, uid: str) -> bool:
        """Check if a manga has an override"""
        return uid in self.overrides
    
    def add_override(self, uid: str, chapters: int, source: str = 'manual', 
                    verified: bool = False, notes: str = None):
        """Add or update an override"""
        self.overrides[uid] = {
            'actual_chapters': chapters,
            'source': source,
            'verified': verified,
            'notes': notes or f'Override added on {datetime.now().strftime("%Y-%m-%d")}',
            'last_updated': datetime.now().isoformat()
        }
        logger.info(f"Added override for {uid}: {chapters} chapters")
    
    def update_override(self, uid: str, chapters: int, notes: str = None):
        """Update an existing override"""
        if uid in self.overrides:
            self.overrides[uid]['actual_chapters'] = chapters
            self.overrides[uid]['last_updated'] = datetime.now().isoformat()
            if notes:
                self.overrides[uid]['notes'] = notes
            logger.info(f"Updated override for {uid}: {chapters} chapters")
        else:
            logger.warning(f"Attempted to update non-existent override for {uid}")
    
    def get_all_overrides(self) -> Dict[str, Dict]:
        """Get all overrides"""
        return self.overrides.copy()
    
    def get_ongoing_manga_overrides(self) -> Dict[str, Dict]:
        """Get overrides for manga that are likely ongoing"""
        ongoing = {}
        ongoing_indicators = ['ongoing', 'weekly', 'publishing', 'current']
        
        for uid, data in self.overrides.items():
            notes = data.get('notes', '').lower()
            if any(indicator in notes for indicator in ongoing_indicators):
                ongoing[uid] = data
        
        return ongoing
    
    def remove_override(self, uid: str) -> bool:
        """Remove an override"""
        if uid in self.overrides:
            del self.overrides[uid]
            logger.info(f"Removed override for {uid}")
            return True
        return False
    
    def get_stats(self) -> Dict:
        """Get statistics about the overrides"""
        total = len(self.overrides)
        verified = sum(1 for data in self.overrides.values() if data.get('verified', False))
        ongoing = len(self.get_ongoing_manga_overrides())
        
        return {
            'total_overrides': total,
            'verified_overrides': verified,
            'ongoing_manga': ongoing,
            'completion_rate': (verified / total * 100) if total > 0 else 0
        }
    
    def export_to_sql(self) -> str:
        """Export overrides as SQL INSERT statements"""
        sql_statements = []
        sql_statements.append("-- Manga Chapter Overrides Data")
        sql_statements.append("-- Generated on " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        sql_statements.append("")
        
        for uid, data in self.overrides.items():
            chapters = data['actual_chapters']
            source = data['source']
            verified = 'true' if data['verified'] else 'false'
            notes = data['notes'].replace("'", "''")  # Escape single quotes
            
            sql = f"""INSERT INTO manga_chapter_overrides (uid, actual_chapters, source, verified, notes) 
VALUES ('{uid}', {chapters}, '{source}', {verified}, '{notes}')
ON CONFLICT (uid) DO UPDATE SET
    actual_chapters = EXCLUDED.actual_chapters,
    last_updated = NOW(),
    notes = EXCLUDED.notes;"""
            
            sql_statements.append(sql)
        
        return "\n\n".join(sql_statements)


class EnhancedChapterResolver:
    """Resolves manga chapter counts using multiple sources with priority"""
    
    def __init__(self, supabase_client=None, mal_client=None, jikan_client=None):
        self.supabase_client = supabase_client
        self.mal_client = mal_client 
        self.jikan_client = jikan_client
        self.overrides = MangaChapterOverrides()
    
    async def get_chapter_count(self, uid: str, mal_id: int = None, title: str = None) -> Dict:
        """
        Get the most accurate chapter count using priority order:
        1. Manual override (highest priority)
        2. Jikan API (for ongoing series) 
        3. MAL API (fallback)
        
        Returns dict with: {chapters, source, confidence, notes}
        """
        result = {
            'chapters': None,
            'source': None,
            'confidence': 'unknown',
            'notes': None,
            'uid': uid,
            'mal_id': mal_id,
            'title': title or 'Unknown'
        }
        
        # 1. Check manual overrides first (highest accuracy)
        override = self.overrides.get_override(uid)
        if override:
            result.update({
                'chapters': override['actual_chapters'],
                'source': 'override',
                'confidence': 'high' if override['verified'] else 'medium',
                'notes': f"Manual override: {override['notes']}"
            })
            logger.info(f"Using override for {title}: {override['actual_chapters']} chapters")
            return result
        
        # 2. Try Jikan API (better for ongoing series)
        if self.jikan_client and mal_id:
            try:
                jikan_chapters = await self.jikan_client.get_manga_chapters(mal_id)
                if jikan_chapters and jikan_chapters > 0:
                    result.update({
                        'chapters': jikan_chapters,
                        'source': 'jikan',
                        'confidence': 'medium',
                        'notes': 'Retrieved from Jikan API (MAL website scraper)'
                    })
                    logger.info(f"Using Jikan data for {title}: {jikan_chapters} chapters")
                    return result
            except Exception as e:
                logger.warning(f"Jikan API failed for {title} (MAL ID: {mal_id}): {e}")
        
        # 3. Fall back to MAL API
        if self.mal_client and mal_id:
            try:
                mal_data = await self.mal_client.get_manga_details(mal_id)
                if mal_data:
                    mal_chapters = mal_data.get('num_chapters', 0)
                    if mal_chapters and mal_chapters > 0:
                        result.update({
                            'chapters': mal_chapters,
                            'source': 'mal_api',
                            'confidence': 'low' if mal_data.get('status') == 'currently_publishing' else 'medium',
                            'notes': f"MAL API data (status: {mal_data.get('status', 'unknown')})"
                        })
                        logger.info(f"Using MAL API data for {title}: {mal_chapters} chapters")
                        return result
            except Exception as e:
                logger.warning(f"MAL API failed for {title} (MAL ID: {mal_id}): {e}")
        
        # No reliable data found
        result.update({
            'chapters': 0,
            'source': 'none',
            'confidence': 'none',
            'notes': 'No reliable chapter count available from any source'
        })
        logger.warning(f"No chapter data available for {title}")
        return result
    
    def add_manual_override(self, uid: str, chapters: int, notes: str = None):
        """Add a manual override for immediate use"""
        self.overrides.add_override(uid, chapters, 'manual', True, notes)
    
    def get_override_stats(self) -> Dict:
        """Get statistics about available overrides"""
        return self.overrides.get_stats()


def get_chapter_count_enhanced_sync(uid: str, mal_id: Optional[int] = None, title: Optional[str] = None) -> Dict[str, any]:
    """
    Synchronous wrapper for enhanced chapter count resolution.
    
    This function provides a thread-safe, synchronous interface to the
    advanced chapter resolution logic for use in Flask routes and other
    synchronous contexts.
    
    Priority Order:
        1. Manual overrides (highest accuracy)
        2. Jikan API (MAL website scraper, good for ongoing series)
        3. MAL API (fallback for completed series)
        4. Database fallback (existing chapter data)
    
    Args:
        uid (str): Item UID (e.g., 'mal_manga_13')
        mal_id (Optional[int]): MAL ID for API lookups
        title (Optional[str]): Manga title for logging
    
    Returns:
        Dict containing:
            - chapters (int): Chapter count (0 if not found)
            - source (str): Data source ('override', 'jikan', 'mal_api', 'database', 'fallback')
            - confidence (str): Confidence level ('high', 'medium', 'low', 'none')
            - notes (str): Additional information about the resolution
            - success (bool): Whether resolution was successful
    
    Example:
        >>> result = get_chapter_count_enhanced_sync('mal_manga_13', 13, 'One Piece')
        >>> print(f"Chapters: {result['chapters']}, Source: {result['source']}")
        Chapters: 1128, Source: override
    """
    # First, try the simple override check for immediate response
    override_chapters = get_chapter_count(uid)
    if override_chapters:
        return {
            'chapters': override_chapters,
            'source': 'override',
            'confidence': 'high',
            'notes': 'Retrieved from manual override',
            'success': True
        }
    
    # If no override found and we have additional info, try advanced resolution
    if mal_id and title:
        try:
            # Import here to avoid circular imports
            from jikan_api_client import JikanAPIClient
            from mal_api_client import MALAPIClient
            from supabase_client import SupabaseClient
            
            # Create a new event loop if needed (thread-safe)
            def run_async_resolution():
                try:
                    # Create fresh client instances for this thread
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    async def resolve_chapters():
                        mal_client = MALAPIClient()
                        jikan_client = JikanAPIClient()
                        supabase_client = SupabaseClient()
                        
                        resolver = EnhancedChapterResolver(
                            supabase_client=supabase_client,
                            mal_client=mal_client,
                            jikan_client=jikan_client
                        )
                        
                        try:
                            result = await resolver.get_chapter_count(uid, mal_id, title)
                            return result
                        finally:
                            # Clean up clients
                            if hasattr(mal_client, 'session') and mal_client.session:
                                await mal_client.session.close()
                            if hasattr(jikan_client, 'session') and jikan_client.session:
                                await jikan_client.session.close()
                    
                    result = loop.run_until_complete(resolve_chapters())
                    loop.close()
                    return result
                    
                except Exception as e:
                    logger.warning(f"Async chapter resolution failed for {title} (UID: {uid}): {e}")
                    return None
            
            # Use a thread pool to avoid blocking the main thread
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(run_async_resolution)
                # Timeout after 3 seconds to prevent hanging (production optimization)
                try:
                    result = future.result(timeout=3)
                    if result and result.get('chapters', 0) > 0:
                        # Add success flag and return enhanced result
                        result['success'] = True
                        logger.info(f"Enhanced chapter resolution successful for {title}: {result['chapters']} chapters from {result['source']}")
                        return result
                except Exception as e:
                    logger.warning(f"Enhanced chapter resolution timed out or failed for {title}: {e}")
        
        except ImportError as e:
            logger.warning(f"Required clients not available for enhanced resolution: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in enhanced chapter resolution for {title}: {e}")
    
    # Fallback to basic database/override check
    logger.info(f"Using fallback chapter resolution for {title or uid}")
    return {
        'chapters': 0,
        'source': 'fallback',
        'confidence': 'none',
        'notes': 'No reliable chapter data available - fallback used',
        'success': False
    }


# Singleton instance for global use
_chapter_overrides = MangaChapterOverrides()

def get_chapter_overrides() -> MangaChapterOverrides:
    """Get the global chapter overrides instance"""
    return _chapter_overrides

# Export functions for easy importing
def get_override(uid: str) -> Optional[Dict]:
    """Get override data for a manga"""
    return _chapter_overrides.get_override(uid)

def get_chapter_count(uid: str) -> Optional[int]:
    """Get overridden chapter count for a manga"""
    return _chapter_overrides.get_chapter_count(uid)

def has_override(uid: str) -> bool:
    """Check if manga has override"""
    return _chapter_overrides.has_override(uid)

def get_enhanced_chapter_count(uid: str, mal_id: Optional[int] = None, title: Optional[str] = None) -> Dict[str, any]:
    """Export wrapper for enhanced chapter count resolution"""
    return get_chapter_count_enhanced_sync(uid, mal_id, title)