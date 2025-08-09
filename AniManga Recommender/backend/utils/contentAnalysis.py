# ABOUTME: Content analysis utility for automated moderation and toxicity detection
# ABOUTME: Integrates with external APIs and implements keyword-based filtering for community safety

import os
import re
import json
import requests
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class ContentAnalysisResult:
    """Result object containing analysis outcomes and recommendations."""
    
    def __init__(self, content: str):
        self.content = content
        self.toxicity_score = 0.0
        self.is_toxic = False
        self.blocked_keywords = []
        self.auto_flag = False
        self.auto_moderate = False
        self.priority = 'low'
        self.reasons = []
        self.analysis_timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict:
        """Convert result to dictionary for storage/logging."""
        return {
            'toxicity_score': self.toxicity_score,
            'is_toxic': self.is_toxic,
            'blocked_keywords': self.blocked_keywords,
            'auto_flag': self.auto_flag,
            'auto_moderate': self.auto_moderate,
            'priority': self.priority,
            'reasons': self.reasons,
            'analysis_timestamp': self.analysis_timestamp
        }

class ContentAnalyzer:
    """Main content analysis service for automated moderation."""
    
    def __init__(self):
        self.perspective_api_key = os.getenv('GOOGLE_PERSPECTIVE_API_KEY')
        self.blocked_keywords = self._load_blocked_keywords()
        self.toxic_threshold_high = 0.9  # Auto-moderate
        self.toxic_threshold_medium = 0.7  # Auto-flag
        self.toxic_threshold_low = 0.5  # Monitor
        
    def _load_blocked_keywords(self) -> List[str]:
        """Load blocked keywords from configuration or file."""
        try:
            # Try to load from environment variable first
            keywords_env = os.getenv('BLOCKED_KEYWORDS')
            if keywords_env:
                return json.loads(keywords_env)
            
            # Default blocked keywords list
            return [
                # Spam indicators
                'buy now', 'click here', 'free money', 'get rich quick',
                'limited time', 'act now', 'guaranteed', 'risk free',
                
                # Harassment terms (mild examples for demonstration)
                'kill yourself', 'kys', 'go die', 'end yourself',
                
                # Inappropriate content indicators
                'explicit content', 'adult content', 'nsfw link',
                
                # Platform abuse
                'vote manipulation', 'fake review', 'bot account',
                'mass report', 'raid this', 'brigade',
                
                # Hate speech indicators (very mild examples)
                'hate group', 'supremacist', 'terrorist',
                
                # Scam indicators
                'phishing', 'steal account', 'password hack',
                'credit card', 'social security', 'bank details'
            ]
        except Exception as e:
            print(f"Error loading blocked keywords: {e}")
            return []
    
    def analyze_content(self, content: str, content_type: str = 'comment') -> ContentAnalysisResult:
        """
        Perform comprehensive content analysis.
        
        Args:
            content (str): The text content to analyze
            content_type (str): Type of content ('comment', 'review', 'bio', etc.)
            
        Returns:
            ContentAnalysisResult: Analysis results with recommendations
        """
        result = ContentAnalysisResult(content)
        
        try:
            # Step 1: Keyword analysis (fastest, most reliable)
            self._analyze_keywords(content, result)
            
            # Step 2: Pattern-based analysis
            self._analyze_patterns(content, result)
            
            # Step 3: External API analysis (if available and needed)
            if not result.auto_moderate and self.perspective_api_key:
                self._analyze_toxicity_api(content, result)
            
            # Step 4: Determine final actions
            self._determine_actions(result, content_type)
            
        except Exception as e:
            print(f"Error in content analysis: {e}")
            # Safe fallback - don't auto-moderate on errors
            result.reasons.append(f"Analysis error: {str(e)}")
        
        return result
    
    def analyze_toxicity(self, content: str) -> Dict[str, Any]:
        """
        Analyze toxicity of content (alias for analyze_content for backward compatibility).
        
        Args:
            content: The text content to analyze
            
        Returns:
            Dictionary with toxicity analysis results
        """
        result = self.analyze_content(content)
        result_dict = result.to_dict()
        
        # Add expected fields for test compatibility
        result_dict['categories'] = []
        if result.is_toxic:
            if result.toxicity_score >= 0.9:
                result_dict['categories'].append('severe_toxicity')
            elif result.toxicity_score >= 0.7:
                result_dict['categories'].append('toxicity')
            else:
                result_dict['categories'].append('mild_toxicity')
                
        # Add confidence score based on how certain we are
        if result.blocked_keywords:
            result_dict['confidence'] = 0.95  # High confidence when keywords are found
        elif result.toxicity_score > 0:
            result_dict['confidence'] = min(result.toxicity_score + 0.2, 1.0)
        else:
            result_dict['confidence'] = 0.5  # Medium confidence for clean content
            
        return result_dict
    
    def _analyze_keywords(self, content: str, result: ContentAnalysisResult) -> None:
        """Check content against blocked keywords list."""
        content_lower = content.lower()
        
        for keyword in self.blocked_keywords:
            if keyword.lower() in content_lower:
                result.blocked_keywords.append(keyword)
                result.reasons.append(f"Blocked keyword detected: {keyword}")
        
        # Determine severity based on keyword matches
        if result.blocked_keywords:
            # Categorize keywords by severity
            high_severity = [
                'kill yourself', 'kys', 'go die', 'end yourself',
                'hate group', 'supremacist', 'terrorist',
                'phishing', 'steal account', 'password hack'
            ]
            
            medium_severity = [
                'explicit content', 'adult content', 'nsfw link',
                'vote manipulation', 'fake review', 'bot account'
            ]
            
            has_high_severity = any(k.lower() in [b.lower() for b in result.blocked_keywords] 
                                  for k in high_severity)
            has_medium_severity = any(k.lower() in [b.lower() for b in result.blocked_keywords] 
                                    for k in medium_severity)
            
            if has_high_severity:
                result.auto_moderate = True
                result.priority = 'high'
                result.toxicity_score = 0.95
            elif has_medium_severity:
                result.auto_flag = True
                result.priority = 'medium'
                result.toxicity_score = 0.75
            else:
                result.auto_flag = True
                result.priority = 'low'
                result.toxicity_score = 0.55
    
    def _analyze_patterns(self, content: str, result: ContentAnalysisResult) -> None:
        """Analyze content for suspicious patterns."""
        
        # Pattern 1: Excessive capitalization
        caps_ratio = sum(1 for c in content if c.isupper()) / max(len(content), 1)
        if caps_ratio > 0.7 and len(content) > 20:
            result.reasons.append("Excessive capitalization detected")
            result.toxicity_score = max(result.toxicity_score, 0.4)
        
        # Pattern 2: Excessive repetition
        words = content.split()
        if len(words) > 5:
            word_freq = {}
            for word in words:
                word_lower = word.lower()
                word_freq[word_lower] = word_freq.get(word_lower, 0) + 1
            
            max_freq = max(word_freq.values())
            if max_freq > len(words) * 0.5:
                result.reasons.append("Excessive word repetition detected")
                result.toxicity_score = max(result.toxicity_score, 0.4)
        
        # Pattern 3: Suspicious character patterns
        # Multiple exclamation marks
        if content.count('!!!') > 0 or content.count('!!!!') > 0:
            result.reasons.append("Excessive punctuation detected")
            result.toxicity_score = max(result.toxicity_score, 0.3)
        
        # Pattern 4: URL/link analysis
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        urls = re.findall(url_pattern, content)
        if len(urls) > 2:
            result.reasons.append("Multiple URLs detected")
            result.toxicity_score = max(result.toxicity_score, 0.4)
        
        # Pattern 5: Length-based analysis
        if len(content) < 10 and not content.strip():
            result.reasons.append("Empty or very short content")
            result.toxicity_score = max(result.toxicity_score, 0.3)
        elif len(content) > 5000:
            result.reasons.append("Extremely long content")
            result.toxicity_score = max(result.toxicity_score, 0.2)
    
    def _analyze_toxicity_api(self, content: str, result: ContentAnalysisResult) -> None:
        """Analyze content using Google Perspective API for toxicity detection."""
        if not self.perspective_api_key:
            return
        
        try:
            url = f'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key={self.perspective_api_key}'
            
            data = {
                'comment': {'text': content},
                'requestedAttributes': {
                    'TOXICITY': {},
                    'SEVERE_TOXICITY': {},
                    'IDENTITY_ATTACK': {},
                    'INSULT': {},
                    'PROFANITY': {},
                    'THREAT': {},
                    'HARASSMENT': {}
                }
            }
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code == 200:
                api_result = response.json()
                attributes = api_result.get('attributeScores', {})
                
                # Get toxicity score
                toxicity = attributes.get('TOXICITY', {}).get('summaryScore', {}).get('value', 0)
                result.toxicity_score = max(result.toxicity_score, toxicity)
                
                # Check other attributes
                severe_toxicity = attributes.get('SEVERE_TOXICITY', {}).get('summaryScore', {}).get('value', 0)
                harassment = attributes.get('HARASSMENT', {}).get('summaryScore', {}).get('value', 0)
                threat = attributes.get('THREAT', {}).get('summaryScore', {}).get('value', 0)
                
                if severe_toxicity > 0.8:
                    result.reasons.append(f"High severe toxicity detected: {severe_toxicity:.2f}")
                if harassment > 0.8:
                    result.reasons.append(f"High harassment detected: {harassment:.2f}")
                if threat > 0.8:
                    result.reasons.append(f"Threat detected: {threat:.2f}")
                
                result.reasons.append(f"API toxicity score: {toxicity:.2f}")
                
            else:
                print(f"Perspective API error: {response.status_code}")
                
        except requests.RequestException as e:
            print(f"Error calling Perspective API: {e}")
        except Exception as e:
            print(f"Error processing Perspective API response: {e}")
    
    def _determine_actions(self, result: ContentAnalysisResult, content_type: str) -> None:
        """Determine final moderation actions based on analysis."""
        
        # Auto-moderate for high toxicity
        if result.toxicity_score >= self.toxic_threshold_high:
            result.auto_moderate = True
            result.auto_flag = True
            result.priority = 'high'
            result.is_toxic = True
        
        # Auto-flag for medium toxicity
        elif result.toxicity_score >= self.toxic_threshold_medium:
            result.auto_flag = True
            result.priority = 'medium' if result.priority == 'low' else result.priority
            result.is_toxic = True
        
        # Monitor for low-medium toxicity
        elif result.toxicity_score >= self.toxic_threshold_low:
            result.is_toxic = True
            result.priority = 'low' if result.priority == 'low' else result.priority
        
        # Special handling for different content types
        if content_type == 'review':
            # Reviews might be more critical, slightly lower thresholds
            if result.toxicity_score >= 0.6 and not result.auto_flag:
                result.auto_flag = True
                result.priority = 'low'
        elif content_type == 'bio':
            # Profiles should have stricter moderation
            if result.toxicity_score >= 0.4 and not result.auto_flag:
                result.auto_flag = True
                result.priority = 'medium'
    
    def should_auto_moderate(self, content: str, content_type: str = 'comment') -> Tuple[bool, Dict]:
        """
        Quick check if content should be auto-moderated.
        
        Returns:
            Tuple[bool, Dict]: (should_moderate, analysis_summary)
        """
        result = self.analyze_content(content, content_type)
        return result.auto_moderate, result.to_dict()
    
    def should_auto_flag(self, content: str, content_type: str = 'comment') -> Tuple[bool, Dict]:
        """
        Quick check if content should be auto-flagged for review.
        
        Returns:
            Tuple[bool, Dict]: (should_flag, analysis_summary)
        """
        result = self.analyze_content(content, content_type)
        return result.auto_flag, result.to_dict()

# Global analyzer instance
content_analyzer = ContentAnalyzer()

# Convenience functions for easy import
def analyze_content(content: str, content_type: str = 'comment') -> ContentAnalysisResult:
    """Analyze content and return full results."""
    return content_analyzer.analyze_content(content, content_type)

def should_auto_moderate(content: str, content_type: str = 'comment') -> Tuple[bool, Dict]:
    """Check if content should be auto-moderated."""
    return content_analyzer.should_auto_moderate(content, content_type)

def should_auto_flag(content: str, content_type: str = 'comment') -> Tuple[bool, Dict]:
    """Check if content should be auto-flagged."""
    return content_analyzer.should_auto_flag(content, content_type)

# Alias for compatibility with tests
ToxicityAnalyzer = ContentAnalyzer

class ContentModerationPipeline:
    """
    Orchestrates the full content moderation workflow.
    Integrates content analysis with database operations and moderation decisions.
    """
    
    def __init__(self, db_connection=None):
        """
        Initialize the content moderation pipeline.
        
        Args:
            db_connection: Database connection for persisting moderation results
        """
        self.db = db_connection
        self.analyzer = ContentAnalyzer()
        
    def moderate_content(self, content: str, user_id: str = None, content_type: str = 'comment', 
                        content_id: str = None) -> Dict[str, Any]:
        """
        Run the full moderation pipeline on content.
        
        Args:
            content: The text content to moderate
            user_id: ID of the user who created the content
            content_type: Type of content ('comment', 'review', 'bio', etc.)
            content_id: ID of the content item being moderated
            
        Returns:
            Dictionary with moderation decision and details
        """
        # Analyze the content
        analysis_result = self.analyzer.analyze_content(content, content_type)
        
        # Build moderation response with nested structure for tests
        moderation_response = {
            'content_id': content_id,
            'user_id': user_id,
            'content_type': content_type,
            'toxicity': {
                'toxicity_score': analysis_result.toxicity_score,
                'is_toxic': analysis_result.is_toxic,
                'blocked_keywords': analysis_result.blocked_keywords
            },
            'spam': {
                'is_spam': False,  # Placeholder - SpamDetector not implemented
                'spam_score': 0.0
            },
            'sentiment': {
                'sentiment': 'neutral',  # Placeholder - SentimentAnalyzer not implemented
                'polarity': 0.0,
                'subjectivity': 0.0
            },
            'language': {
                'language': 'en',  # Placeholder - LanguageDetector not implemented
                'confidence': 0.95
            },
            'profanity': {
                'has_profanity': len(analysis_result.blocked_keywords) > 0,
                'profanity_level': 'none' if not analysis_result.blocked_keywords else 'moderate'
            },
            'overall_score': analysis_result.toxicity_score,
            'requires_moderation': analysis_result.auto_moderate or analysis_result.auto_flag,
            'moderation_reasons': analysis_result.reasons,
            'auto_moderated': analysis_result.auto_moderate,
            'auto_flagged': analysis_result.auto_flag,
            'priority': analysis_result.priority,
            'action_taken': None,
            'moderation_timestamp': datetime.now().isoformat()
        }
        
        # Determine action
        if analysis_result.auto_moderate:
            moderation_response['action_taken'] = 'hidden'
            moderation_response['moderation_status'] = 'rejected'
        elif analysis_result.auto_flag:
            moderation_response['action_taken'] = 'flagged_for_review'
            moderation_response['moderation_status'] = 'pending_review'
        else:
            moderation_response['action_taken'] = 'approved'
            moderation_response['moderation_status'] = 'approved'
        
        # Log to database if connection available
        if self.db and content_id:
            self._log_moderation_result(moderation_response)
        
        return moderation_response
    
    def _log_moderation_result(self, moderation_result: Dict[str, Any]):
        """
        Log moderation result to database.
        
        Args:
            moderation_result: The moderation result to log
        """
        try:
            from sqlalchemy import text
            
            # Log the moderation action
            self.db.execute(
                text("""
                    INSERT INTO moderation_logs 
                    (content_id, content_type, user_id, toxicity_score, action_taken, 
                     auto_moderated, auto_flagged, reasons, created_at)
                    VALUES (:content_id, :content_type, :user_id, :toxicity_score, :action_taken,
                            :auto_moderated, :auto_flagged, :reasons, NOW())
                    ON CONFLICT (content_id, content_type) DO UPDATE SET
                        toxicity_score = EXCLUDED.toxicity_score,
                        action_taken = EXCLUDED.action_taken,
                        auto_moderated = EXCLUDED.auto_moderated,
                        auto_flagged = EXCLUDED.auto_flagged,
                        reasons = EXCLUDED.reasons,
                        updated_at = NOW()
                """),
                {
                    'content_id': moderation_result['content_id'],
                    'content_type': moderation_result['content_type'],
                    'user_id': moderation_result['user_id'],
                    'toxicity_score': moderation_result['toxicity_score'],
                    'action_taken': moderation_result['action_taken'],
                    'auto_moderated': moderation_result['auto_moderated'],
                    'auto_flagged': moderation_result['auto_flagged'],
                    'reasons': json.dumps(moderation_result['reasons'])
                }
            )
        except Exception as e:
            # Log error but don't fail the moderation
            logger.warning(f"Failed to log moderation result: {e}")
    
    def review_flagged_content(self, content_id: str, moderator_id: str, 
                              action: str, notes: str = None) -> Dict[str, Any]:
        """
        Review and take action on flagged content.
        
        Args:
            content_id: ID of the content to review
            moderator_id: ID of the moderator taking action
            action: Action to take ('approve', 'reject', 'warn_user', 'ban_user')
            notes: Optional moderator notes
            
        Returns:
            Dictionary with review result
        """
        valid_actions = ['approve', 'reject', 'warn_user', 'ban_user']
        if action not in valid_actions:
            raise ValueError(f"Invalid action: {action}")
        
        review_result = {
            'content_id': content_id,
            'moderator_id': moderator_id,
            'action': action,
            'notes': notes,
            'reviewed_at': datetime.now().isoformat()
        }
        
        # Log the review action if database available
        if self.db:
            try:
                from sqlalchemy import text
                
                self.db.execute(
                    text("""
                        INSERT INTO moderation_actions 
                        (content_id, moderator_id, action, notes, created_at)
                        VALUES (:content_id, :moderator_id, :action, :notes, NOW())
                    """),
                    review_result
                )
            except Exception as e:
                logger.warning(f"Failed to log moderation action: {e}")
        
        return review_result
    
    def get_moderation_stats(self, days: int = 7) -> Dict[str, Any]:
        """
        Get moderation statistics for the specified time period.
        
        Args:
            days: Number of days to look back
            
        Returns:
            Dictionary with moderation statistics
        """
        stats = {
            'period_days': days,
            'total_content_analyzed': 0,
            'auto_moderated_count': 0,
            'auto_flagged_count': 0,
            'manually_reviewed_count': 0,
            'average_toxicity_score': 0.0,
            'top_blocked_keywords': []
        }
        
        if self.db:
            try:
                from sqlalchemy import text
                from datetime import datetime, timedelta
                
                since_date = datetime.now() - timedelta(days=days)
                
                result = self.db.execute(
                    text("""
                        SELECT 
                            COUNT(*) as total,
                            COUNT(CASE WHEN auto_moderated THEN 1 END) as auto_moderated,
                            COUNT(CASE WHEN auto_flagged THEN 1 END) as auto_flagged,
                            AVG(toxicity_score) as avg_toxicity
                        FROM moderation_logs
                        WHERE created_at >= :since_date
                    """),
                    {'since_date': since_date}
                )
                
                row = result.fetchone()
                if row:
                    stats['total_content_analyzed'] = row.total or 0
                    stats['auto_moderated_count'] = row.auto_moderated or 0
                    stats['auto_flagged_count'] = row.auto_flagged or 0
                    stats['average_toxicity_score'] = round(row.avg_toxicity or 0, 2)
                    
            except Exception as e:
                logger.warning(f"Failed to fetch moderation stats: {e}")
        
        return stats