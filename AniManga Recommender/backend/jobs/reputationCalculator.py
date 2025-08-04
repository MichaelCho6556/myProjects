# ABOUTME: Background job for calculating user reputation scores based on community activity
# ABOUTME: Runs daily to update reputation metrics, titles, and community standing scores

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import schedule
import time
import logging

# Add the parent directory to the path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import SupabaseClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('reputation_calculator.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ReputationCalculator:
    """
    Service for calculating and updating user reputation scores.
    
    Reputation is calculated based on:
    - Reviews written and their helpfulness votes
    - Comments and their engagement
    - Community participation and activity
    - Moderation penalties (warnings, content removal, bans)
    - Consecutive activity and engagement consistency
    """
    
    def __init__(self):
        self.supabase = SupabaseClient()
        
        # Reputation scoring weights
        self.WEIGHTS = {
            'review_base': 5,           # Base points per review
            'comment_base': 2,          # Base points per comment
            'helpful_vote_received': 3, # Points per helpful vote received
            'helpful_vote_given': 1,    # Points per helpful vote given
            'daily_activity': 1,        # Points per day active
            'consecutive_streak': 2,    # Bonus points for consecutive days
            'warning_penalty': -10,     # Penalty per warning
            'content_removed_penalty': -15,  # Penalty per content removal
            'temp_ban_penalty': -50,    # Penalty per temporary ban
        }
        
        # Reputation title thresholds
        self.TITLES = [
            (0, 'Newcomer'),
            (50, 'Community Member'),
            (150, 'Active Contributor'),
            (300, 'Trusted Reviewer'),
            (600, 'Community Veteran'),
            (1000, 'Elite Contributor'),
            (2000, 'Community Champion'),
            (5000, 'Legendary Member')
        ]
    
    def calculate_user_reputation(self, user_id: str) -> Dict:
        """
        Calculate comprehensive reputation score for a single user.
        
        Args:
            user_id (str): UUID of the user
            
        Returns:
            Dict: Reputation data including score, title, and breakdown
        """
        try:
            # Get user activity data
            activity_data = self._get_user_activity_data(user_id)
            
            # Calculate reputation components
            review_reputation = self._calculate_review_reputation(activity_data)
            comment_reputation = self._calculate_comment_reputation(activity_data)
            community_reputation = self._calculate_community_reputation(activity_data)
            moderation_penalty = self._calculate_moderation_penalty(activity_data)
            
            # Calculate total reputation score
            total_score = max(0, review_reputation + comment_reputation + 
                            community_reputation - moderation_penalty)
            
            # Determine reputation title
            reputation_title = self._get_reputation_title(total_score)
            
            return {
                'user_id': user_id,
                'reputation_score': total_score,
                'reputation_title': reputation_title,
                'review_reputation': review_reputation,
                'comment_reputation': comment_reputation,
                'community_reputation': community_reputation,
                'moderation_penalty': moderation_penalty,
                'total_reviews': activity_data.get('total_reviews', 0),
                'total_comments': activity_data.get('total_comments', 0),
                'helpful_votes_received': activity_data.get('helpful_votes_received', 0),
                'helpful_votes_given': activity_data.get('helpful_votes_given', 0),
                'warnings_received': activity_data.get('warnings_received', 0),
                'content_removed': activity_data.get('content_removed', 0),
                'temp_bans': activity_data.get('temp_bans', 0),
                'days_active': activity_data.get('days_active', 0),
                'consecutive_days_active': activity_data.get('consecutive_days_active', 0),
                'last_activity_date': activity_data.get('last_activity_date'),
                'last_calculated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating reputation for user {user_id}: {e}")
            return None
    
    def _get_user_activity_data(self, user_id: str) -> Dict:
        """Collect all user activity data needed for reputation calculation."""
        try:
            data = {}
            
            # Count reviews
            reviews_result = self.supabase.table('user_reviews').select('id', 'created_at').eq('user_id', user_id).execute()
            data['total_reviews'] = len(reviews_result.data) if reviews_result.data else 0
            
            # Count comments (if comments table exists)
            try:
                comments_result = self.supabase.table('user_comments').select('id', 'created_at').eq('user_id', user_id).execute()
                data['total_comments'] = len(comments_result.data) if comments_result.data else 0
            except:
                data['total_comments'] = 0
            
            # Count helpful votes received (placeholder - would need to implement voting system)
            # For now, estimate based on review engagement
            data['helpful_votes_received'] = data['total_reviews'] * 2  # Placeholder logic
            
            # Count helpful votes given (placeholder)
            data['helpful_votes_given'] = max(0, data['total_reviews'] - 1)  # Placeholder logic
            
            # Get moderation penalties
            moderation_data = self._get_moderation_penalties(user_id)
            data.update(moderation_data)
            
            # Calculate activity metrics
            activity_metrics = self._calculate_activity_metrics(user_id, reviews_result.data)
            data.update(activity_metrics)
            
            return data
            
        except Exception as e:
            logger.error(f"Error getting activity data for user {user_id}: {e}")
            return {}
    
    def _get_moderation_penalties(self, user_id: str) -> Dict:
        """Get moderation penalty counts for the user."""
        try:
            penalties = {
                'warnings_received': 0,
                'content_removed': 0,
                'temp_bans': 0
            }
            
            # Count moderation actions against this user
            try:
                mod_actions = self.supabase.table('moderation_audit_log').select('action_type').eq('target_type', 'user').eq('target_id', user_id).execute()
                
                if mod_actions.data:
                    for action in mod_actions.data:
                        action_type = action.get('action_type', '')
                        if 'warn' in action_type.lower():
                            penalties['warnings_received'] += 1
                        elif 'remove' in action_type.lower():
                            penalties['content_removed'] += 1
                        elif 'ban' in action_type.lower() and 'temp' in action_type.lower():
                            penalties['temp_bans'] += 1
            except:
                pass  # Table might not exist yet
            
            return penalties
            
        except Exception as e:
            logger.error(f"Error getting moderation penalties for user {user_id}: {e}")
            return {'warnings_received': 0, 'content_removed': 0, 'temp_bans': 0}
    
    def _calculate_activity_metrics(self, user_id: str, reviews_data: List) -> Dict:
        """Calculate user activity metrics like days active and streaks."""
        try:
            if not reviews_data:
                return {
                    'days_active': 0,
                    'consecutive_days_active': 0,
                    'last_activity_date': None
                }
            
            # Get unique activity dates from reviews
            activity_dates = set()
            for review in reviews_data:
                if review.get('created_at'):
                    # Parse date from created_at
                    try:
                        date_str = review['created_at'].split('T')[0]  # Get date part
                        activity_dates.add(date_str)
                    except:
                        continue
            
            days_active = len(activity_dates)
            last_activity_date = max(activity_dates) if activity_dates else None
            
            # Calculate consecutive days (simplified - just return days active for now)
            consecutive_days_active = min(days_active, 30)  # Cap at 30 for reasonable streaks
            
            return {
                'days_active': days_active,
                'consecutive_days_active': consecutive_days_active,
                'last_activity_date': last_activity_date
            }
            
        except Exception as e:
            logger.error(f"Error calculating activity metrics for user {user_id}: {e}")
            return {'days_active': 0, 'consecutive_days_active': 0, 'last_activity_date': None}
    
    def _calculate_review_reputation(self, activity_data: Dict) -> int:
        """Calculate reputation points from review activity."""
        total_reviews = activity_data.get('total_reviews', 0)
        helpful_votes = activity_data.get('helpful_votes_received', 0)
        
        review_points = total_reviews * self.WEIGHTS['review_base']
        helpful_points = helpful_votes * self.WEIGHTS['helpful_vote_received']
        
        return review_points + helpful_points
    
    def _calculate_comment_reputation(self, activity_data: Dict) -> int:
        """Calculate reputation points from comment activity."""
        total_comments = activity_data.get('total_comments', 0)
        helpful_given = activity_data.get('helpful_votes_given', 0)
        
        comment_points = total_comments * self.WEIGHTS['comment_base']
        helpful_given_points = helpful_given * self.WEIGHTS['helpful_vote_given']
        
        return comment_points + helpful_given_points
    
    def _calculate_community_reputation(self, activity_data: Dict) -> int:
        """Calculate reputation points from community engagement."""
        days_active = activity_data.get('days_active', 0)
        consecutive_days = activity_data.get('consecutive_days_active', 0)
        
        activity_points = days_active * self.WEIGHTS['daily_activity']
        streak_bonus = consecutive_days * self.WEIGHTS['consecutive_streak']
        
        return activity_points + streak_bonus
    
    def _calculate_moderation_penalty(self, activity_data: Dict) -> int:
        """Calculate reputation penalty from moderation actions."""
        warnings = activity_data.get('warnings_received', 0)
        content_removed = activity_data.get('content_removed', 0)
        temp_bans = activity_data.get('temp_bans', 0)
        
        warning_penalty = warnings * abs(self.WEIGHTS['warning_penalty'])
        removal_penalty = content_removed * abs(self.WEIGHTS['content_removed_penalty'])
        ban_penalty = temp_bans * abs(self.WEIGHTS['temp_ban_penalty'])
        
        return warning_penalty + removal_penalty + ban_penalty
    
    def _get_reputation_title(self, score: int) -> str:
        """Determine reputation title based on score."""
        for threshold, title in reversed(self.TITLES):
            if score >= threshold:
                return title
        return 'Newcomer'
    
    def update_user_reputation(self, user_id: str) -> bool:
        """Update reputation record for a single user."""
        try:
            reputation_data = self.calculate_user_reputation(user_id)
            if not reputation_data:
                return False
            
            # Update or insert reputation record
            result = self.supabase.table('user_reputation').upsert(reputation_data).execute()
            
            if result.data:
                logger.info(f"Updated reputation for user {user_id}: {reputation_data['reputation_score']} ({reputation_data['reputation_title']})")
                return True
            else:
                logger.error(f"Failed to update reputation for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating reputation for user {user_id}: {e}")
            return False
    
    def calculate_all_users_reputation(self):
        """Calculate reputation for all users in the system."""
        try:
            logger.info("Starting reputation calculation for all users...")
            
            # Get all user IDs
            users_result = self.supabase.table('user_profiles').select('id').execute()
            
            if not users_result.data:
                logger.info("No users found for reputation calculation")
                return
            
            total_users = len(users_result.data)
            success_count = 0
            
            for i, user in enumerate(users_result.data):
                user_id = user['id']
                
                if self.update_user_reputation(user_id):
                    success_count += 1
                
                # Log progress every 10 users
                if (i + 1) % 10 == 0:
                    logger.info(f"Processed {i + 1}/{total_users} users...")
            
            logger.info(f"Reputation calculation completed. {success_count}/{total_users} users updated successfully.")
            
        except Exception as e:
            logger.error(f"Error in calculate_all_users_reputation: {e}")

def run_reputation_calculator():
    """Main function to run the reputation calculator."""
    calculator = ReputationCalculator()
    calculator.calculate_all_users_reputation()

if __name__ == "__main__":
    # Setup daily schedule
    schedule.every().day.at("02:00").do(run_reputation_calculator)
    
    logger.info("Reputation calculator started. Scheduled to run daily at 2:00 AM.")
    logger.info("Running initial calculation...")
    
    # Run initial calculation
    run_reputation_calculator()
    
    # Keep the script running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute