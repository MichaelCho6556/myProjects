# ABOUTME: Content analysis utility for automated moderation and toxicity detection
# ABOUTME: Integrates with external APIs and implements keyword-based filtering for community safety

import os
import re
import json
import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime

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