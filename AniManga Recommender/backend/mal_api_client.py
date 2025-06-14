"""
MyAnimeList API Client for AniManga Recommender

This module provides a client for interacting with the MyAnimeList API
to fetch anime and manga data for integration into our database.
"""

import os
import asyncio
import aiohttp
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import time
import json
from config import Config

class MALAPIClient:
    """MyAnimeList API Client for data integration"""
    
    def __init__(self):
        self.base_url = "https://api.myanimelist.net/v2"
        self.client_id = os.getenv('MAL_CLIENT_ID')
        
        if not self.client_id:
            raise ValueError("MAL_CLIENT_ID environment variable is required")
        
        # Don't create session in __init__ - create it lazily when needed
        self.session = None
        
        # MAL's dynamic rate limiting (based on empirical data)
        self.rate_limit_delay = 1.0  # Back to 1 second as recommended
        self.last_request_time = 0
        
        # Dynamic rate limiting tracking
        self.requests_since_cooldown = 0
        self.max_requests_before_cooldown = 300  # Average from empirical data
        self.cooldown_variance = 150  # Requests can vary ±150 from average
        self.is_in_cooldown = False
        self.cooldown_start_time = 0
        self.consecutive_timeouts = 0
        
    async def _get_session(self):
        """Get or create the aiohttp session"""
        if self.session is None:
            # Conservative timeout settings to prevent hanging but avoid timeouts
            timeout = aiohttp.ClientTimeout(
                total=45,      # 45 seconds total (reduced from 300)
                connect=10,    # 10 seconds to connect (reduced from 60)
                sock_read=30   # 30 seconds to read (reduced from 120)
            )
            
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                headers={'X-MAL-CLIENT-ID': self.client_id}
            )
        return self.session
    
    async def _rate_limited_request(self, url: str, params: dict = None) -> Optional[Dict]:
        """Make rate-limited request with MAL's dynamic cooldown detection"""
        
        # Check if we're in cooldown period (3-5 minutes)
        if self.is_in_cooldown:
            cooldown_duration = time.time() - self.cooldown_start_time
            if cooldown_duration < 180:  # Wait at least 3 minutes
                print(f"         🕐 Still in cooldown, waiting... ({cooldown_duration:.0f}s elapsed)")
                await asyncio.sleep(30)  # Check every 30 seconds
                return None
            else:
                # Try to exit cooldown
                print(f"         🔄 Attempting to exit cooldown after {cooldown_duration:.0f}s...")
        
        # Adaptive rate limiting based on request count
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        # Use standard 1-second delay as recommended
        if time_since_last < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - time_since_last)

        self.last_request_time = time.time()
        
        # Get session
        session = await self._get_session()
        
        # Single retry approach since cooldowns are the main issue
        max_retries = 1
        
        for attempt in range(max_retries + 1):
            try:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        self.consecutive_timeouts = 0
                        self.requests_since_cooldown += 1
                        
                        # Reset cooldown state on successful request
                        if self.is_in_cooldown:
                            print(f"         ✅ Successfully exited cooldown after {self.requests_since_cooldown} total requests")
                            self.is_in_cooldown = False
                        
                        # Check if we're approaching the dynamic limit
                        if self.requests_since_cooldown > (self.max_requests_before_cooldown - 50):
                            print(f"         ⚠️  Approaching request limit ({self.requests_since_cooldown}/{self.max_requests_before_cooldown})")
                        
                        return await response.json()
                        
                    elif response.status == 429:  # Rate limited
                        print(f"         🚫 Rate limited (429) - entering cooldown mode")
                        self._enter_cooldown()
                        return None
                        
                    elif response.status == 404:
                        self.requests_since_cooldown += 1
                        return None  # Item not found
                        
                    else:
                        # Other HTTP errors might indicate cooldown
                        if response.status in [502, 503, 504]:
                            print(f"         🚫 Server error ({response.status}) - possible cooldown")
                            self._enter_cooldown()
                            return None
                        
                        if attempt < max_retries:
                            await asyncio.sleep(2)
                            continue
                        return None
                        
            except asyncio.TimeoutError:
                self.consecutive_timeouts += 1
                print(f"         ⚠️  Timeout #{self.consecutive_timeouts}")
                
                # Multiple timeouts likely indicate we hit the cooldown
                if self.consecutive_timeouts >= 3:
                    print(f"         🚫 Multiple timeouts detected - likely hit rate limit cooldown")
                    self._enter_cooldown()
                    return None
                
                if attempt < max_retries:
                    await asyncio.sleep(2)
                    continue
                return None
                
            except Exception as e:
                if attempt < max_retries:
                    await asyncio.sleep(2)
                    continue
                return None

        return None
    
    def _enter_cooldown(self):
        """Enter cooldown mode when rate limiting is detected"""
        self.is_in_cooldown = True
        self.cooldown_start_time = time.time()
        # Reset request counter with some randomness for next cycle
        import random
        self.max_requests_before_cooldown = 300 + random.randint(-self.cooldown_variance, self.cooldown_variance)
        self.requests_since_cooldown = 0
        self.consecutive_timeouts = 0
        print(f"         🛑 COOLDOWN MODE: Will wait 3-5 minutes. Next cycle limit: {self.max_requests_before_cooldown} requests")
    
    async def get_anime_list(self, limit: int = 100, offset: int = 0) -> Optional[Dict]:
        """Iterate over the COMPLETE anime catalogue via the ranking endpoint.

        MAL does **not** expose a public endpoint that returns an unrestricted
        listing of every anime. The closest alternative (and the one officially
        documented) is the `/anime/ranking` endpoint which yields a stable,
        deterministic ordering when `ranking_type=all`.

        By paginating through that endpoint with `limit`/`offset` we can walk
        the entire catalogue **without** providing the mandatory `q` search
        parameter that `/anime` expects.  This avoids the 400 "invalid q"
        errors the importer was hitting earlier.
        """

        url = f"{self.base_url}/anime/ranking"
        params = {
            'ranking_type': 'all',
            'limit': min(limit, 500),
            'offset': offset,
            'fields': (
                'id,title,main_picture,alternative_titles,start_date,end_date,'
                'synopsis,mean,rank,popularity,num_episodes,start_season,'
                'broadcast,source,status,genres,my_list_status,'
                'num_scoring_users,statistics'
            ),
        }

        return await self._rate_limited_request(url, params)
    
    async def get_manga_list(self, limit: int = 100, offset: int = 0) -> Optional[Dict]:
        """Iterate over the COMPLETE manga catalogue via the ranking endpoint.

        Similar to anime, MAL's `/manga` search endpoint requires a `q`
        parameter.  Instead we rely on `/manga/ranking?ranking_type=all` and
        simply paginate through it.
        """

        url = f"{self.base_url}/manga/ranking"
        params = {
            'ranking_type': 'all',
            'limit': min(limit, 500),
            'offset': offset,
            'fields': (
                'id,title,main_picture,alternative_titles,start_date,end_date,'
                'synopsis,mean,rank,popularity,num_chapters,num_volumes,status,'
                'genres,my_list_status,num_scoring_users,authors,serialization'
            ),
        }

        return await self._rate_limited_request(url, params)
    
    async def search_anime(self, query: str, limit: int = 10) -> Optional[Dict]:
        """Search for anime by query"""
        url = f"{self.base_url}/anime"
        params = {
            'q': query,
            'limit': limit,
            'fields': 'id,title,main_picture,start_date,synopsis,mean,genres'
        }
        
        return await self._rate_limited_request(url, params)
    
    async def search_manga(self, query: str, limit: int = 10) -> Optional[Dict]:
        """Search for manga by query"""
        url = f"{self.base_url}/manga"
        params = {
            'q': query,
            'limit': limit,
            'fields': 'id,title,main_picture,start_date,synopsis,mean,genres'
        }
        
        return await self._rate_limited_request(url, params)
    
    async def get_anime_details(self, anime_id: int) -> Optional[Dict]:
        """Get COMPLETE detailed information for a specific anime with ALL available fields"""
        url = f"{self.base_url}/anime/{anime_id}"
        params = {
            'fields': (
                'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,'
                'num_list_users,num_scoring_users,created_at,updated_at,media_type,status,genres,'
                'num_episodes,start_season,broadcast,source,average_episode_duration,rating,pictures,'
                'background,related_anime,related_manga,recommendations,studios,statistics,'
                'opening_themes,ending_themes'
            )
        }
        
        return await self._rate_limited_request(url, params)
    
    async def get_manga_details(self, manga_id: int) -> Optional[Dict]:
        """Get COMPLETE detailed information for a specific manga with ALL available fields"""
        url = f"{self.base_url}/manga/{manga_id}"
        params = {
            'fields': (
                'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,'
                'num_list_users,num_scoring_users,created_at,updated_at,media_type,status,genres,'
                'num_chapters,num_volumes,authors{first_name,last_name},pictures,background,'
                'related_anime,related_manga,recommendations,serialization{name},statistics'
            )
        }
        
        return await self._rate_limited_request(url, params)
    
    def is_configured(self) -> bool:
        """Check if MAL API is properly configured"""
        return bool(self.client_id)
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def test_connection(self) -> Tuple[bool, str]:
        """Test MAL API connection"""
        if not self.client_id:
            return False, "MAL_CLIENT_ID not configured"
        
        try:
            # Try a simple search
            result = await self.search_anime("test", limit=1)
            if result is not None:
                return True, "Connection successful"
            else:
                return False, "API request failed"
        except Exception as e:
            return False, f"Connection error: {e}"


class MALDataTransformer:
    """Transform MAL API data to match our database schema"""
    
    @staticmethod
    def transform_anime(mal_anime: Dict) -> Dict:
        """Transform MAL anime data to our schema"""
        try:
            transformed = {
                'mal_id': mal_anime['id'],
                'uid': f"mal_anime_{mal_anime['id']}",
                'title': mal_anime.get('title', ''),
                'title_english': mal_anime.get('alternative_titles', {}).get('en', ''),
                'title_japanese': mal_anime.get('alternative_titles', {}).get('ja', ''),
                'synopsis': mal_anime.get('synopsis', ''),
                'media_type': 'anime',
                'episodes': mal_anime.get('num_episodes', 0),
                'score': mal_anime.get('mean', 0.0),
                'scored_by': mal_anime.get('num_scoring_users', 0),
                'popularity': mal_anime.get('popularity', 0),
                'rank': mal_anime.get('rank', 0),
                'status': MALDataTransformer._map_mal_status(mal_anime.get('status')),
                'start_date': MALDataTransformer._parse_date(mal_anime.get('start_date')),
                'end_date': MALDataTransformer._parse_date(mal_anime.get('end_date')),
                'image_url': mal_anime.get('main_picture', {}).get('large', ''),
                'genres': [genre['name'] for genre in mal_anime.get('genres', [])],
                'studios': [studio['name'] for studio in mal_anime.get('studios', [])],
                'source_api': 'mal'
            }
            
            # Add season information (always include with defaults)
            season_info = mal_anime.get('start_season', {})
            transformed['season'] = season_info.get('season', '') if season_info else None
            transformed['year'] = season_info.get('year', 0) if season_info else None
            
            return transformed
            
        except Exception as e:
            print(f"❌ Error transforming anime data: {e}")
            return None
    
    @staticmethod
    def transform_manga(mal_manga: Dict) -> Dict:
        """Transform MAL manga data to our schema"""
        try:
            transformed = {
                'mal_id': mal_manga['id'],
                'uid': f"mal_manga_{mal_manga['id']}",
                'title': mal_manga.get('title', ''),
                'title_english': mal_manga.get('alternative_titles', {}).get('en', ''),
                'title_japanese': mal_manga.get('alternative_titles', {}).get('ja', ''),
                'synopsis': mal_manga.get('synopsis', ''),
                'media_type': 'manga',
                'chapters': mal_manga.get('num_chapters', 0),
                'volumes': mal_manga.get('num_volumes', 0),
                'score': mal_manga.get('mean', 0.0),
                'scored_by': mal_manga.get('num_scoring_users', 0),
                'popularity': mal_manga.get('popularity', 0),
                'rank': mal_manga.get('rank', 0),
                'status': MALDataTransformer._map_mal_status(mal_manga.get('status')),
                'start_date': MALDataTransformer._parse_date(mal_manga.get('start_date')),
                'end_date': MALDataTransformer._parse_date(mal_manga.get('end_date')),
                'image_url': mal_manga.get('main_picture', {}).get('large', ''),
                'genres': [genre['name'] for genre in mal_manga.get('genres', [])],
                'authors': [f"{author['node'].get('first_name', '')} {author['node'].get('last_name', '')}".strip() 
                           for author in mal_manga.get('authors', []) if 'node' in author],
                'source_api': 'mal'
            }
            
            return transformed
            
        except Exception as e:
            print(f"❌ Error transforming manga data: {e}")
            return None
    
    @staticmethod
    def _map_mal_status(mal_status: str) -> str:
        """Map MAL status to our status format"""
        status_mapping = {
            'finished_airing': 'finished',
            'currently_airing': 'airing',
            'not_yet_aired': 'not_yet_aired',
            'finished': 'finished',
            'currently_publishing': 'publishing',
            'not_yet_published': 'not_yet_published'
        }
        return status_mapping.get(mal_status, mal_status)
    
    @staticmethod
    def _parse_date(date_str: str) -> Optional[str]:
        """Parse MAL date format to our format"""
        if not date_str:
            return None
        try:
            # MAL sometimes returns just year (e.g., "2011") or full dates (e.g., "2011-03-15")
            if len(date_str) == 4 and date_str.isdigit():
                # Just year - convert to January 1st of that year
                return f"{date_str}-01-01"
            elif len(date_str) == 10 and date_str.count('-') == 2:
                # Full date format YYYY-MM-DD
                return date_str
            else:
                # Try to extract year from any other format
                import re
                year_match = re.search(r'\b(19|20)\d{2}\b', date_str)
                if year_match:
                    return f"{year_match.group()}-01-01"
                return None
        except:
            return None


# Example usage and testing
async def test_mal_api():
    """Test function for MAL API client"""
    client = MALAPIClient()
    
    if not client.is_configured():
        print("❌ MAL API not configured. Please set MAL_CLIENT_ID environment variable.")
        return
    
    print("🧪 Testing MAL API Connection...")
    
    # Test connection
    success, message = await client.test_connection()
    print(f"Connection test: {'✅' if success else '❌'} {message}")
    
    if success:
        # Test anime search
        print("\n1. Testing anime search...")
        search_result = await client.search_anime("attack on titan", limit=3)
        if search_result:
            print(f"✅ Found {len(search_result.get('data', []))} anime results")
            for anime in search_result.get('data', [])[:2]:
                print(f"   - {anime['node']['title']} (ID: {anime['node']['id']})")
        
        # Test manga search
        print("\n2. Testing manga search...")
        manga_result = await client.search_manga("one piece", limit=3)
        if manga_result:
            print(f"✅ Found {len(manga_result.get('data', []))} manga results")
            for manga in manga_result.get('data', [])[:2]:
                print(f"   - {manga['node']['title']} (ID: {manga['node']['id']})")
    
    print("\n🎯 MAL API testing complete!")

if __name__ == "__main__":
    asyncio.run(test_mal_api()) 