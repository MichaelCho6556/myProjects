"""
Hybrid Similarity Scoring System for AniManga Recommender

This module implements a multi-component similarity calculation that combines:
1. Title/Franchise similarity (60% weight)
2. Structured data similarity (25% weight) 
3. Semantic content similarity (15% weight)
4. Cross-media adaptation bonus (+10%)

This approach provides much better similarity scores than pure TF-IDF.
"""

import re
import difflib
from typing import Dict, List, Tuple, Optional
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)

class HybridSimilarityCalculator:
    """Calculate hybrid similarity scores between anime/manga items."""
    
    def __init__(self, tfidf_matrix=None, uid_to_idx=None):
        """
        Initialize the hybrid similarity calculator.
        
        Args:
            tfidf_matrix: Pre-computed TF-IDF matrix for semantic similarity
            uid_to_idx: Mapping from item UID to matrix index
        """
        self.tfidf_matrix = tfidf_matrix
        self.uid_to_idx = uid_to_idx
        
        # Default weights (sum to 1.0 for main components)
        self.weights = {
            'title': 0.60,      # Title/franchise similarity
            'structured': 0.25,  # Genres, themes, demographics
            'semantic': 0.15,    # Synopsis TF-IDF similarity
            'adaptation_bonus': 0.10  # Bonus for cross-media adaptations
        }
    
    def normalize_title(self, title: str) -> str:
        """
        Normalize title for comparison.
        
        Args:
            title: Original title string
            
        Returns:
            Normalized title for matching
        """
        if not title or title is None:
            return ""
        
        # Convert to lowercase
        title = str(title).lower()
        
        # Remove season indicators
        title = re.sub(r'\s+(season|s)\s*\d+', '', title)
        title = re.sub(r'\s+\d+(st|nd|rd|th)\s+season', '', title)
        
        # Remove episode/movie indicators
        title = re.sub(r':\s*episode\s+of\s+\w+', '', title)
        title = re.sub(r'\s*\(tv\)', '', title)
        title = re.sub(r'\s*\(ova\)', '', title)
        title = re.sub(r'\s*\(ona\)', '', title)
        title = re.sub(r'\s*\(movie\)', '', title)
        title = re.sub(r'\s+movie\s*\d*$', '', title)
        title = re.sub(r'\s+film\s*\d*$', '', title)
        
        # Remove year indicators
        title = re.sub(r'\s*\(\d{4}\)', '', title)
        title = re.sub(r'\s+\d{4}$', '', title)
        
        # Remove special characters but keep spaces
        title = re.sub(r'[^a-z0-9\s]', ' ', title)
        
        # Normalize whitespace
        title = ' '.join(title.split())
        
        return title.strip()
    
    def extract_franchise_name(self, title: str) -> str:
        """
        Extract the base franchise name from a title.
        
        Args:
            title: Full title string
            
        Returns:
            Base franchise name
        """
        # Patterns that often indicate a sub-title or sequel
        franchise_patterns = [
            r'^([^:]+):',  # Everything before a colon
            r'^(.+?)\s+film',  # Everything before "Film"
            r'^(.+?)\s+movie',  # Everything before "Movie"
            r'^(.+?)\s+ova',  # Everything before "OVA"
            r'^(.+?)\s+special',  # Everything before "Special"
            r'^(.+?)\s+\d+(st|nd|rd|th)',  # Everything before ordinals
            r'^(.+?)\s+season',  # Everything before "Season"
            r'^(.+?)\s+arc',  # Everything before "Arc"
        ]
        
        title_lower = title.lower()
        
        for pattern in franchise_patterns:
            match = re.search(pattern, title_lower)
            if match:
                franchise = match.group(1).strip()
                # Further normalize the franchise name
                return self.normalize_title(franchise)
        
        # If no pattern matches, return normalized full title
        return self.normalize_title(title)
    
    def calculate_title_similarity(self, title1: str, title2: str) -> float:
        """
        Calculate similarity between two titles.
        
        Args:
            title1: First title
            title2: Second title
            
        Returns:
            Similarity score between 0 and 1
        """
        # Normalize both titles
        norm1 = self.normalize_title(title1)
        norm2 = self.normalize_title(title2)
        
        # Exact match after normalization
        if norm1 and norm1 == norm2:
            return 1.0
        
        # Check franchise match
        franchise1 = self.extract_franchise_name(title1)
        franchise2 = self.extract_franchise_name(title2)
        
        if franchise1 and franchise1 == franchise2:
            # Same franchise but different entries
            return 0.85
        
        # Check if one title contains the other (for sequels/spinoffs)
        if norm1 and norm2:
            if norm1 in norm2 or norm2 in norm1:
                # Calculate partial match score based on overlap
                longer = max(len(norm1), len(norm2))
                shorter = min(len(norm1), len(norm2))
                return 0.5 + (shorter / longer) * 0.35
        
        # Use sequence matcher for fuzzy matching
        if norm1 and norm2:
            ratio = difflib.SequenceMatcher(None, norm1, norm2).ratio()
            # Scale the ratio to be more discriminative
            # Scores below 0.6 are likely unrelated
            if ratio < 0.6:
                return ratio * 0.3  # Scale down low scores
            else:
                return 0.3 + (ratio - 0.6) * 0.7 / 0.4  # Scale 0.6-1.0 to 0.3-1.0
        
        return 0.0
    
    def calculate_structured_similarity(self, item1: Dict, item2: Dict) -> float:
        """
        Calculate Jaccard similarity on structured data (genres, themes, demographics).
        
        Args:
            item1: First item with genres, themes, demographics
            item2: Second item with same fields
            
        Returns:
            Jaccard similarity score between 0 and 1
        """
        # Extract sets of features
        set1 = set()
        set2 = set()
        
        # Add genres
        if 'genres' in item1 and item1['genres']:
            if isinstance(item1['genres'], (list, np.ndarray)):
                set1.update(str(g) for g in item1['genres'] if g)
        
        if 'genres' in item2 and item2['genres']:
            if isinstance(item2['genres'], (list, np.ndarray)):
                set2.update(str(g) for g in item2['genres'] if g)
        
        # Add themes
        if 'themes' in item1 and item1['themes']:
            if isinstance(item1['themes'], (list, np.ndarray)):
                set1.update(f"theme_{t}" for t in item1['themes'] if t)
        
        if 'themes' in item2 and item2['themes']:
            if isinstance(item2['themes'], (list, np.ndarray)):
                set2.update(f"theme_{t}" for t in item2['themes'] if t)
        
        # Add demographics
        if 'demographics' in item1 and item1['demographics']:
            if isinstance(item1['demographics'], (list, np.ndarray)):
                set1.update(f"demo_{d}" for d in item1['demographics'] if d)
        
        if 'demographics' in item2 and item2['demographics']:
            if isinstance(item2['demographics'], (list, np.ndarray)):
                set2.update(f"demo_{d}" for d in item2['demographics'] if d)
        
        # Calculate Jaccard similarity
        if not set1 and not set2:
            # Both have no features - consider them similar
            return 1.0
        elif not set1 or not set2:
            # One has features, other doesn't
            return 0.0
        else:
            intersection = len(set1 & set2)
            union = len(set1 | set2)
            return intersection / union if union > 0 else 0.0
    
    def calculate_semantic_similarity(self, uid1: str, uid2: str) -> float:
        """
        Calculate semantic similarity using TF-IDF vectors.
        
        Args:
            uid1: First item UID
            uid2: Second item UID
            
        Returns:
            Cosine similarity score between 0 and 1
        """
        if self.tfidf_matrix is None or self.uid_to_idx is None:
            # No TF-IDF data available
            return 0.0
        
        # Get indices
        if uid1 not in self.uid_to_idx or uid2 not in self.uid_to_idx:
            return 0.0
        
        idx1 = self.uid_to_idx[uid1]
        idx2 = self.uid_to_idx[uid2]
        
        # Calculate cosine similarity
        similarity = cosine_similarity(
            self.tfidf_matrix[idx1:idx1+1],
            self.tfidf_matrix[idx2:idx2+1]
        )[0][0]
        
        return float(similarity)
    
    def calculate_hybrid_similarity(self, item1: Dict, item2: Dict) -> float:
        """
        Calculate the final hybrid similarity score.
        
        Args:
            item1: First item with all metadata
            item2: Second item with all metadata
            
        Returns:
            Hybrid similarity score between 0 and 1
        """
        # Component 1: Title similarity
        title1 = item1.get('title', '')
        title2 = item2.get('title', '')
        score_title = self.calculate_title_similarity(title1, title2)
        
        # Component 2: Structured data similarity
        score_structured = self.calculate_structured_similarity(item1, item2)
        
        # Component 3: Semantic similarity (if available)
        score_semantic = 0.0
        if 'uid' in item1 and 'uid' in item2:
            score_semantic = self.calculate_semantic_similarity(
                item1['uid'], item2['uid']
            )
        
        # Calculate weighted base score
        base_score = (
            self.weights['title'] * score_title +
            self.weights['structured'] * score_structured +
            self.weights['semantic'] * score_semantic
        )
        
        # Add adaptation bonus if applicable
        bonus = 0.0
        is_same_franchise = score_title > 0.85  # High title similarity
        media_type1 = str(item1.get('media_type', '') or '').lower()
        media_type2 = str(item2.get('media_type', '') or '').lower()
        
        # Check if it's a cross-media adaptation
        is_adaptation = (
            is_same_franchise and 
            media_type1 != media_type2 and
            {media_type1, media_type2} & {'anime', 'manga'}  # At least one is anime/manga
        )
        
        if is_adaptation:
            bonus = self.weights['adaptation_bonus']
            logger.debug(f"Adaptation bonus applied: {title1} <-> {title2}")
        
        # Final score (capped at 1.0)
        final_score = min(base_score + bonus, 1.0)
        
        logger.debug(
            f"Hybrid similarity for '{title1}' <-> '{title2}': "
            f"title={score_title:.2f}, structured={score_structured:.2f}, "
            f"semantic={score_semantic:.2f}, bonus={bonus:.2f}, "
            f"final={final_score:.2f}"
        )
        
        return final_score
    
    def set_weights(self, weights: Dict[str, float]):
        """
        Update the component weights.
        
        Args:
            weights: Dictionary with keys 'title', 'structured', 'semantic', 'adaptation_bonus'
        """
        # Validate that main weights sum to 1.0
        main_weights = weights.get('title', 0) + weights.get('structured', 0) + weights.get('semantic', 0)
        if abs(main_weights - 1.0) > 0.01:
            logger.warning(f"Main weights sum to {main_weights}, should be 1.0")
        
        self.weights.update(weights)
        logger.info(f"Updated weights: {self.weights}")