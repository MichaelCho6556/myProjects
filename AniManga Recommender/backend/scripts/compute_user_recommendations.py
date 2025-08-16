"""
Pre-compute personalized recommendations for all active users.

This script runs via GitHub Actions to avoid memory issues in the main app.
It generates recommendations using the TF-IDF engine and stores them in the cache table.

Features:
- Memory-efficient processing (loads engine once)
- Processes only active users (logged in within 30 days)
- Stores results in user_recommendation_cache table
- Includes error handling and logging
- Tracks processing statistics
"""

import sys
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import SupabaseClient
from recommendation_engine import OnDemandRecommendationEngine

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class UserRecommendationProcessor:
    """Handles batch processing of user recommendations."""
    
    def __init__(self):
        self.client = None
        self.engine = None
        self.processed_count = 0
        self.error_count = 0
        self.start_time = datetime.now()
        
    def initialize(self) -> bool:
        """Initialize database client and recommendation engine."""
        try:
            # Initialize Supabase client
            self.client = SupabaseClient()
            if not self.client:
                logger.error("Failed to initialize Supabase client")
                return False
            
            # Initialize recommendation engine
            self.engine = OnDemandRecommendationEngine(self.client)
            if not self.engine.initialize():
                logger.error("Failed to initialize recommendation engine")
                return False
                
            logger.info("Successfully initialized processor")
            return True
            
        except Exception as e:
            logger.error(f"Error during initialization: {e}")
            return False
    
    def get_active_users(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get users who have been active within the specified number of days."""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            # Get active users from user_profiles table
            response = self.client.table('user_profiles')\
                .select('user_id, username')\
                .gte('updated_at', cutoff_date)\
                .execute()
            
            users = response.data if response.data else []
            logger.info(f"Found {len(users)} active users (last {days} days)")
            return users
            
        except Exception as e:
            logger.error(f"Error fetching active users: {e}")
            return []
    
    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences for recommendation generation."""
        try:
            # Get user's completed items to analyze preferences
            response = self.client.table('user_items')\
                .select('item_uid, rating, status')\
                .eq('user_id', user_id)\
                .eq('status', 'completed')\
                .limit(50)\
                .execute()
            
            completed_items = response.data if response.data else []
            
            # Analyze preferences (simplified)
            genre_preferences = {}
            total_rating = 0
            rating_count = 0
            
            for item in completed_items:
                if item.get('rating'):
                    total_rating += item['rating']
                    rating_count += 1
            
            average_rating = total_rating / rating_count if rating_count > 0 else 7.0
            
            return {
                'genre_preferences': genre_preferences,
                'average_rating': average_rating,
                'completed_count': len(completed_items)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing user preferences for {user_id}: {e}")
            return {'genre_preferences': {}, 'average_rating': 7.0, 'completed_count': 0}
    
    def generate_recommendations_for_user(self, user_id: str) -> Optional[Dict[str, List[Dict[str, Any]]]]:
        """Generate recommendations for a specific user."""
        try:
            # Get user preferences
            preferences = self.get_user_preferences(user_id)
            
            # Skip users with no completed items
            if preferences['completed_count'] == 0:
                logger.info(f"Skipping user {user_id} - no completed items")
                return None
            
            # Get user's completed items
            completed_items = self.client.table('user_items')\
                .select('item_uid, rating')\
                .eq('user_id', user_id)\
                .eq('status', 'completed')\
                .order('rating', ascending=False)\
                .limit(10)\
                .execute()
            
            if not completed_items.data:
                return None
            
            # Generate recommendations based on top-rated completed items
            all_recommendations = []
            seen_uids = set()
            
            # Get user's existing items to exclude
            user_items = self.client.table('user_items')\
                .select('item_uid')\
                .eq('user_id', user_id)\
                .execute()
            
            if user_items.data:
                seen_uids.update(item['item_uid'] for item in user_items.data)
            
            # For each completed item, get recommendations
            for item in completed_items.data[:5]:  # Top 5 completed items
                item_uid = item['item_uid']
                item_rating = item.get('rating', 7.0)
                
                # Get recommendations using engine
                recs = self.engine.get_recommendations(item_uid, 20)
                
                # Weight by user's rating of source item
                weight = (item_rating / 10.0) if item_rating else 0.7
                
                for rec in recs:
                    if rec['uid'] not in seen_uids:
                        rec['weighted_score'] = rec.get('similarity', 0) * weight
                        all_recommendations.append(rec)
                        seen_uids.add(rec['uid'])
            
            # Sort by weighted score
            all_recommendations.sort(key=lambda x: x.get('weighted_score', 0), reverse=True)
            
            # Categorize recommendations
            limit = 20
            result = {
                'completed_based': all_recommendations[:limit//2],
                'trending_genres': [],  # Can be enhanced in future versions
                'hidden_gems': all_recommendations[limit//2:limit]
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating recommendations for user {user_id}: {e}")
            return None
    
    def save_recommendations_to_cache(self, user_id: str, recommendations: Dict[str, List[Dict[str, Any]]]) -> bool:
        """Save recommendations to the cache table."""
        try:
            cache_data = {
                'user_id': user_id,
                'recommendations': json.dumps(recommendations),
                'computed_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(hours=24)).isoformat(),
                'cache_version': 'v1',
                'metadata': json.dumps({
                    'total_recommendations': sum(len(items) for items in recommendations.values()),
                    'processing_timestamp': datetime.now().isoformat()
                })
            }
            
            # Upsert to cache table
            response = self.client.table('user_recommendation_cache')\
                .upsert(cache_data, on_conflict='user_id,cache_version')\
                .execute()
            
            if response.data:
                logger.debug(f"Saved recommendations for user {user_id}")
                return True
            else:
                logger.error(f"Failed to save recommendations for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error saving recommendations for user {user_id}: {e}")
            return False
    
    def process_all_users(self) -> bool:
        """Process recommendations for all active users."""
        try:
            users = self.get_active_users()
            
            if not users:
                logger.info("No active users found")
                return True
            
            logger.info(f"Processing recommendations for {len(users)} users")
            
            for user in users:
                user_id = user['user_id']
                username = user.get('username', 'unknown')
                
                try:
                    # Generate recommendations
                    recommendations = self.generate_recommendations_for_user(user_id)
                    
                    if recommendations:
                        # Save to cache
                        if self.save_recommendations_to_cache(user_id, recommendations):
                            self.processed_count += 1
                            logger.info(f"Processed user {username} ({user_id})")
                        else:
                            self.error_count += 1
                            logger.error(f"Failed to save for user {username} ({user_id})")
                    else:
                        logger.info(f"No recommendations generated for user {username} ({user_id})")
                        
                except Exception as e:
                    self.error_count += 1
                    logger.error(f"Error processing user {username} ({user_id}): {e}")
                    continue
            
            # Log final statistics
            duration = datetime.now() - self.start_time
            logger.info(f"Processing complete - Duration: {duration}")
            logger.info(f"Successfully processed: {self.processed_count} users")
            logger.info(f"Errors: {self.error_count} users")
            
            return True
            
        except Exception as e:
            logger.error(f"Error in batch processing: {e}")
            return False

def main():
    """Main execution function."""
    logger.info("Starting user recommendation computation")
    
    processor = UserRecommendationProcessor()
    
    # Initialize
    if not processor.initialize():
        logger.error("Failed to initialize processor")
        return False
    
    # Process all users
    success = processor.process_all_users()
    
    if success:
        logger.info("User recommendation computation completed successfully")
    else:
        logger.error("User recommendation computation failed")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)