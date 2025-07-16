"""
Quality Score Calculator Background Job

This module provides background processing for pre-calculating quality scores
and preview images for custom lists to improve discover_lists performance.

Key Features:
    - Pre-calculates quality scores using weighted formula
    - Generates and stores preview images in database
    - Batch processing for efficiency
    - Supports incremental updates

Technical Implementation:
    - Uses the same algorithm as discover_lists endpoint
    - Stores results in custom_lists table for fast retrieval
    - Designed for periodic execution (e.g., hourly via cron)

Author: AniManga Recommender Team
Version: 1.0.0
License: MIT
"""

import os
import sys
import logging
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
import json

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import SupabaseClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class QualityScoreCalculator:
    """Background job for calculating and storing quality scores."""
    
    def __init__(self):
        """Initialize the quality score calculator."""
        self.supabase_client = SupabaseClient()
        logger.info("Quality Score Calculator initialized")
    
    def calculate_update_frequency(self, list_id: int, days: int = 30) -> float:
        """Calculate how frequently a list is updated (updates per day)."""
        try:
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            # Count updates in custom_list_items table
            response = self.supabase_client.supabase.table('custom_list_items').select(
                'updated_at', count='exact'
            ).eq('list_id', list_id).gte('updated_at', thirty_days_ago).execute()
            
            if response.data:
                count = len(response.data)
                return count / days  # Updates per day
            return 0.0
        except Exception as e:
            logger.error(f"Error calculating update frequency for list {list_id}: {e}")
            return 0.0
    
    def calculate_quality_score(self, list_data: Dict, user_reputation_map: Dict) -> float:
        """
        Calculate quality score using production-ready weighted algorithm.
        
        Args:
            list_data (Dict): List data with item_count, followers_count, updated_at
            user_reputation_map (Dict): Mapping of user_id to reputation_score
            
        Returns:
            float: Quality score between 0-100
        """
        try:
            # Normalize follower_count using logarithmic scaling
            follower_count_normalized = min(1.0, np.log10(list_data.get('followers_count', 0) + 1) / 4.0)
            
            # Normalize item_count using logarithmic scaling
            item_count_normalized = min(1.0, np.log10(list_data.get('item_count', 0) + 1) / 2.0)
            
            # Calculate update_frequency using actual item updates in the list
            try:
                list_id = list_data['id']
                update_frequency = self.calculate_update_frequency(list_id, days=30)
                # Normalize to 0-1 scale (assuming max of 1 update per day)
                update_frequency = min(1.0, update_frequency)
            except:
                update_frequency = 0.0
            
            # Get user reputation and normalize
            user_reputation_raw = user_reputation_map.get(list_data['user_id'], 0)
            user_reputation_normalized = min(1.0, max(0.0, user_reputation_raw / 100.0))
            
            # Calculate weighted quality score
            quality_score = (
                (follower_count_normalized * 0.3) +
                (item_count_normalized * 0.2) +
                (update_frequency * 0.3) +
                (user_reputation_normalized * 0.2)
            )
            
            # Scale to 0-100 for better readability
            return round(quality_score * 100, 2)
            
        except Exception as e:
            logger.error(f"Error calculating quality score for list {list_data.get('id', 'unknown')}: {e}")
            return 0.0
    
    def get_preview_images(self, list_id: int) -> List[str]:
        """
        Get top 5 preview images for a list.
        
        Args:
            list_id (int): List ID
            
        Returns:
            List[str]: List of image URLs
        """
        try:
            # Get top 5 items with images ordered by position
            items_response = self.supabase_client.supabase.table('custom_list_items').select(
                'items!inner(image_url)'
            ).eq('list_id', list_id).order('position', desc=False).limit(5).execute()
            
            preview_images = []
            for item in items_response.data:
                if item.get('items', {}).get('image_url'):
                    preview_images.append(item['items']['image_url'])
            
            return preview_images
            
        except Exception as e:
            logger.error(f"Error getting preview images for list {list_id}: {e}")
            return []
    
    def get_lists_to_update(self, hours_back: int = 24) -> List[Dict]:
        """
        Get lists that need quality score updates.
        
        Args:
            hours_back (int): Look for lists updated in the last N hours
            
        Returns:
            List[Dict]: List of lists that need updates
        """
        try:
            # Get lists updated in the last N hours or with missing quality scores
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours_back)
            
            # Get all public lists with basic data
            lists_response = self.supabase_client.supabase.table('custom_lists').select(
                'id, user_id, updated_at, quality_score'
            ).eq('privacy', 'public').gte('updated_at', cutoff_time.isoformat()).execute()
            
            # Also get lists with null quality scores
            null_scores_response = self.supabase_client.supabase.table('custom_lists').select(
                'id, user_id, updated_at, quality_score'
            ).eq('privacy', 'public').is_('quality_score', 'null').execute()
            
            # Combine results and remove duplicates
            all_lists = lists_response.data + null_scores_response.data
            unique_lists = {lst['id']: lst for lst in all_lists}.values()
            
            logger.info(f"Found {len(unique_lists)} lists to update")
            return list(unique_lists)
            
        except Exception as e:
            logger.error(f"Error getting lists to update: {e}")
            return []
    
    def get_list_metrics(self, list_ids: List[int]) -> Dict[int, Dict]:
        """
        Get item counts and follower counts for multiple lists.
        
        Args:
            list_ids (List[int]): List of list IDs
            
        Returns:
            Dict[int, Dict]: Mapping of list_id to metrics
        """
        try:
            metrics = {}
            
            # Get item counts
            item_counts = self.supabase_client.supabase.table('custom_list_items').select(
                'list_id', count='exact'
            ).in_('list_id', list_ids).execute()
            
            # Get follower counts
            follower_counts = self.supabase_client.supabase.table('list_followers').select(
                'list_id', count='exact'
            ).in_('list_id', list_ids).execute()
            
            # Initialize metrics for all lists
            for list_id in list_ids:
                metrics[list_id] = {'item_count': 0, 'followers_count': 0}
            
            # Update with actual counts
            for item in item_counts.data:
                metrics[item['list_id']]['item_count'] = item.get('count', 0)
                
            for follower in follower_counts.data:
                metrics[follower['list_id']]['followers_count'] = follower.get('count', 0)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting list metrics: {e}")
            return {}
    
    def get_user_reputation_map(self, user_ids: List[str]) -> Dict[str, float]:
        """
        Get user reputation scores for multiple users.
        
        Args:
            user_ids (List[str]): List of user IDs
            
        Returns:
            Dict[str, float]: Mapping of user_id to reputation_score
        """
        try:
            reputation_response = self.supabase_client.supabase.table('user_reputation').select(
                'user_id, reputation_score'
            ).in_('user_id', user_ids).execute()
            
            return {
                rep['user_id']: rep['reputation_score'] 
                for rep in reputation_response.data
            }
            
        except Exception as e:
            logger.error(f"Error getting user reputation: {e}")
            return {}
    
    def update_list_quality_data(self, list_id: int, quality_score: float, preview_images: List[str]) -> bool:
        """
        Update quality score and preview images for a list.
        
        Args:
            list_id (int): List ID
            quality_score (float): Calculated quality score
            preview_images (List[str]): Preview image URLs
            
        Returns:
            bool: Success status
        """
        try:
            update_data = {
                'quality_score': quality_score,
                'preview_images': json.dumps(preview_images)
            }
            
            result = self.supabase_client.supabase.table('custom_lists').update(
                update_data
            ).eq('id', list_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Error updating list {list_id}: {e}")
            return False
    
    def process_lists(self, hours_back: int = 24) -> Dict[str, int]:
        """
        Process lists and update their quality scores.
        
        Args:
            hours_back (int): Look for lists updated in the last N hours
            
        Returns:
            Dict[str, int]: Processing statistics
        """
        logger.info(f"Starting quality score calculation for lists updated in last {hours_back} hours")
        
        # Get lists to update
        lists_to_update = self.get_lists_to_update(hours_back)
        
        if not lists_to_update:
            logger.info("No lists to update")
            return {'processed': 0, 'updated': 0, 'errors': 0}
        
        # Get metrics for all lists
        list_ids = [lst['id'] for lst in lists_to_update]
        user_ids = [lst['user_id'] for lst in lists_to_update]
        
        list_metrics = self.get_list_metrics(list_ids)
        user_reputation_map = self.get_user_reputation_map(user_ids)
        
        # Process each list
        processed = 0
        updated = 0
        errors = 0
        
        for list_data in lists_to_update:
            try:
                list_id = list_data['id']
                
                # Merge list data with metrics
                full_list_data = {
                    **list_data,
                    **list_metrics.get(list_id, {})
                }
                
                # Calculate quality score
                quality_score = self.calculate_quality_score(full_list_data, user_reputation_map)
                
                # Get preview images
                preview_images = self.get_preview_images(list_id)
                
                # Update database
                if self.update_list_quality_data(list_id, quality_score, preview_images):
                    updated += 1
                    logger.debug(f"Updated list {list_id}: quality_score={quality_score}, preview_images={len(preview_images)}")
                else:
                    errors += 1
                    logger.warning(f"Failed to update list {list_id}")
                
                processed += 1
                
            except Exception as e:
                logger.error(f"Error processing list {list_data.get('id', 'unknown')}: {e}")
                errors += 1
                processed += 1
        
        result = {
            'processed': processed,
            'updated': updated,
            'errors': errors
        }
        
        logger.info(f"Quality score calculation completed: {result}")
        return result

def main():
    """Main function for running the quality score calculator."""
    try:
        calculator = QualityScoreCalculator()
        
        # Process lists updated in the last 24 hours
        result = calculator.process_lists(hours_back=24)
        
        print(f"Quality Score Calculator Results:")
        print(f"  Processed: {result['processed']}")
        print(f"  Updated: {result['updated']}")
        print(f"  Errors: {result['errors']}")
        
        # Exit with error code if there were errors
        if result['errors'] > 0:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"Fatal error in quality score calculator: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()