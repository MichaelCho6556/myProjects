"""
Jikan API Client for AniManga Recommender

Jikan is an unofficial MyAnimeList REST API that scrapes the website
to provide more complete data than the official MAL API, particularly
for ongoing manga chapter counts.

Jikan API Documentation: https://docs.api.jikan.moe/
"""

import asyncio
import aiohttp
from typing import Dict, Optional, List
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class JikanAPIClient:
    """Jikan API Client for enhanced MyAnimeList data"""
    
    def __init__(self):
        self.base_url = "https://api.jikan.moe/v4"
        self.session = None
        
        # Jikan has stricter rate limits than MAL
        self.rate_limit_delay = 1.2  # 1.2 seconds for safety margin to prevent 429 errors
        self.last_request_time = 0
        
        # Rate limiting tracking
        self.request_count = 0
        self.rate_limit_window_start = 0
        self.max_requests_per_minute = 60  # Conservative limit
        
    async def _get_session(self):
        """Get or create the aiohttp session"""
        if self.session is None:
            timeout = aiohttp.ClientTimeout(
                total=30,      # 30 seconds total
                connect=10,    # 10 seconds to connect
                sock_read=20   # 20 seconds to read
            )
            
            headers = {
                'User-Agent': 'AniManga-Recommender/1.0',
                'Accept': 'application/json'
            }
            
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                headers=headers
            )
        return self.session
    
    async def _rate_limited_request(self, endpoint: str, params: dict = None) -> Optional[Dict]:
        """Make rate-limited request to Jikan API"""
        current_time = time.time()
        
        # Reset request count every minute
        if current_time - self.rate_limit_window_start > 60:
            self.request_count = 0
            self.rate_limit_window_start = current_time
        
        # Check if we've hit the rate limit
        if self.request_count >= self.max_requests_per_minute:
            wait_time = 60 - (current_time - self.rate_limit_window_start)
            if wait_time > 0:
                logger.info(f"Rate limit reached, waiting {wait_time:.1f} seconds...")
                await asyncio.sleep(wait_time)
                self.request_count = 0
                self.rate_limit_window_start = time.time()
        
        # Enforce minimum delay between requests
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - time_since_last)
        
        self.last_request_time = time.time()
        self.request_count += 1
        
        session = await self._get_session()
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 404:
                    logger.warning(f"Jikan API: Not found - {url}")
                    return None
                elif response.status == 429:
                    logger.warning("Jikan API: Rate limited, will retry after delay")
                    await asyncio.sleep(5)
                    return None
                else:
                    logger.error(f"Jikan API: HTTP {response.status} - {url}")
                    return None
                    
        except asyncio.TimeoutError:
            logger.error(f"Jikan API: Timeout - {url}")
            return None
        except Exception as e:
            logger.error(f"Jikan API: Request failed - {e}")
            return None
    
    async def get_manga_details(self, manga_id: int) -> Optional[Dict]:
        """Get detailed manga information from Jikan API"""
        endpoint = f"manga/{manga_id}"
        
        try:
            response = await self._rate_limited_request(endpoint)
            if response and 'data' in response:
                return response['data']
            return None
        except Exception as e:
            logger.error(f"Error fetching manga {manga_id} from Jikan: {e}")
            return None
    
    async def get_manga_chapters(self, manga_id: int) -> Optional[int]:
        """Get chapter count specifically from Jikan API"""
        manga_data = await self.get_manga_details(manga_id)
        if not manga_data:
            return None
        
        # Jikan provides chapters in the manga data
        chapters = manga_data.get('chapters')
        if chapters and chapters > 0:
            return chapters
        
        # For ongoing series, Jikan might have null chapters
        # but the status and publishing info can help us determine if it's ongoing
        status = manga_data.get('status', '').lower()
        if 'publishing' in status:
            logger.info(f"Manga {manga_id} is ongoing, chapters count may not be available in Jikan")
        
        return None
    
    async def search_manga(self, query: str, limit: int = 10) -> Optional[List[Dict]]:
        """Search for manga by query"""
        endpoint = "manga"
        params = {
            'q': query,
            'limit': limit,
            'order_by': 'popularity',
            'sort': 'asc'
        }
        
        try:
            response = await self._rate_limited_request(endpoint, params)
            if response and 'data' in response:
                return response['data']
            return []
        except Exception as e:
            logger.error(f"Error searching manga '{query}' in Jikan: {e}")
            return []
    
    async def get_top_manga(self, limit: int = 50, filter_type: str = 'publishing') -> Optional[List[Dict]]:
        """Get top manga list, optionally filtered by status"""
        endpoint = "top/manga"
        params = {
            'limit': limit,
            'filter': filter_type  # 'publishing' for ongoing series
        }
        
        try:
            response = await self._rate_limited_request(endpoint, params)
            if response and 'data' in response:
                return response['data']
            return []
        except Exception as e:
            logger.error(f"Error fetching top manga from Jikan: {e}")
            return []
    
    async def get_manga_statistics(self, manga_id: int) -> Optional[Dict]:
        """Get manga statistics including reading status distribution"""
        endpoint = f"manga/{manga_id}/statistics"
        
        try:
            response = await self._rate_limited_request(endpoint)
            if response and 'data' in response:
                return response['data']
            return None
        except Exception as e:
            logger.error(f"Error fetching statistics for manga {manga_id}: {e}")
            return None
    
    def extract_chapter_info(self, manga_data: Dict) -> Dict:
        """Extract and format chapter information from Jikan manga data"""
        if not manga_data:
            return {}
        
        return {
            'mal_id': manga_data.get('mal_id'),
            'title': manga_data.get('title'),
            'chapters': manga_data.get('chapters'),
            'volumes': manga_data.get('volumes'),
            'status': manga_data.get('status'),
            'publishing': manga_data.get('publishing', False),
            'published_from': manga_data.get('published', {}).get('from'),
            'published_to': manga_data.get('published', {}).get('to'),
            'score': manga_data.get('score'),
            'members': manga_data.get('members'),
            'last_updated': datetime.now().isoformat()
        }
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def test_connection(self) -> tuple[bool, str]:
        """Test Jikan API connection"""
        try:
            # Test with a simple request - get One Piece manga
            result = await self.get_manga_details(13)  # One Piece MAL ID
            if result:
                return True, f"Connection successful - found manga: {result.get('title', 'Unknown')}"
            else:
                return False, "API request failed or returned no data"
        except Exception as e:
            return False, f"Connection error: {e}"


class JikanDataEnhancer:
    """Enhance MAL data with Jikan API information"""
    
    def __init__(self):
        self.jikan_client = JikanAPIClient()
    
    async def enhance_manga_data(self, mal_data: Dict) -> Dict:
        """Enhance MAL manga data with Jikan information"""
        enhanced_data = mal_data.copy()
        mal_id = mal_data.get('mal_id')
        
        if not mal_id:
            return enhanced_data
        
        try:
            jikan_data = await self.jikan_client.get_manga_details(mal_id)
            if jikan_data:
                # Prefer Jikan chapter count if it's more accurate
                jikan_chapters = jikan_data.get('chapters')
                mal_chapters = mal_data.get('chapters', 0)
                
                if jikan_chapters and jikan_chapters > mal_chapters:
                    enhanced_data['chapters'] = jikan_chapters
                    enhanced_data['chapter_source'] = 'jikan'
                    logger.info(f"Enhanced {mal_data.get('title', 'Unknown')} chapters: {mal_chapters} → {jikan_chapters}")
                
                # Add additional metadata
                enhanced_data['jikan_score'] = jikan_data.get('score')
                enhanced_data['jikan_members'] = jikan_data.get('members')
                enhanced_data['jikan_status'] = jikan_data.get('status')
                
        except Exception as e:
            logger.error(f"Error enhancing manga data for MAL ID {mal_id}: {e}")
        
        return enhanced_data
    
    async def close(self):
        """Close the Jikan client"""
        await self.jikan_client.close()


# Test function
async def test_jikan_api():
    """Test function for Jikan API client"""
    client = JikanAPIClient()
    
    try:
        print("Testing Jikan API Connection...")
        
        # Test connection
        success, message = await client.test_connection()
        print(f"Connection test: {'SUCCESS' if success else 'FAILED'} {message}")
        
        if success:
            # Test One Piece chapter count
            print("\nTesting One Piece chapter count...")
            one_piece_data = await client.get_manga_details(13)
            if one_piece_data:
                chapters = one_piece_data.get('chapters')
                status = one_piece_data.get('status')
                print(f"SUCCESS One Piece - Chapters: {chapters}, Status: {status}")
            
            # Test search functionality
            print("\nTesting manga search...")
            search_results = await client.search_manga("one piece", limit=3)
            if search_results:
                print(f"SUCCESS Found {len(search_results)} search results")
                for manga in search_results[:2]:
                    print(f"   - {manga['title']} (ID: {manga['mal_id']}, Chapters: {manga.get('chapters', 'Unknown')})")
    
    except Exception as e:
        print(f"FAILED Test failed: {e}")
    
    finally:
        await client.close()
    
    print("\nJikan API testing complete!")

if __name__ == "__main__":
    asyncio.run(test_jikan_api())