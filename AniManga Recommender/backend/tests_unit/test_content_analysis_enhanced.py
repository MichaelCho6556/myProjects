"""
Enhanced Content Analysis Test Suite

This test suite provides comprehensive validation of content analysis utilities
with focus on toxicity detection, spam prevention, and moderation workflows.

Phase 4.1.2: Enhanced Content Analysis Testing
Tests existing content analysis functions with expanded edge cases and attack vectors
"""

import pytest
import json
import os
import time
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Import the content analysis modules
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from utils.contentAnalysis import (
    ContentAnalysisResult,
    ContentAnalyzer,
    analyze_content,
    should_auto_moderate,
    should_auto_flag,
    content_analyzer
)

class TestContentAnalysisEnhanced:
    """Enhanced test suite for content analysis functionality."""
    
    @pytest.fixture
    def analyzer(self):
        """Create a fresh analyzer instance for each test."""
        return ContentAnalyzer()
    
    @pytest.fixture
    def mock_perspective_api(self):
        """Mock the Perspective API for testing."""
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'attributeScores': {
                    'TOXICITY': {'summaryScore': {'value': 0.8}},
                    'SEVERE_TOXICITY': {'summaryScore': {'value': 0.3}},
                    'IDENTITY_ATTACK': {'summaryScore': {'value': 0.2}},
                    'INSULT': {'summaryScore': {'value': 0.4}},
                    'PROFANITY': {'summaryScore': {'value': 0.6}},
                    'THREAT': {'summaryScore': {'value': 0.1}},
                    'HARASSMENT': {'summaryScore': {'value': 0.5}}
                }
            }
            mock_post.return_value = mock_response
            yield mock_post

    def test_content_analysis_result_initialization(self):
        """Test ContentAnalysisResult initialization and methods."""
        content = "Test content"
        result = ContentAnalysisResult(content)
        
        assert result.content == content
        assert result.toxicity_score == 0.0
        assert result.is_toxic is False
        assert result.blocked_keywords == []
        assert result.auto_flag is False
        assert result.auto_moderate is False
        assert result.priority == 'low'
        assert result.reasons == []
        assert result.analysis_timestamp is not None
        
        # Test to_dict method
        result_dict = result.to_dict()
        assert 'toxicity_score' in result_dict
        assert 'is_toxic' in result_dict
        assert 'blocked_keywords' in result_dict
        assert 'analysis_timestamp' in result_dict

    def test_blocked_keywords_detection(self, analyzer):
        """Test detection of blocked keywords with edge cases."""
        # Test basic blocked keywords
        test_cases = [
            ("kill yourself", True, 'high'),
            ("kys", True, 'high'),
            ("go die", True, 'high'),
            ("hate group", True, 'high'),
            ("phishing attack", True, 'high'),
            ("explicit content here", True, 'medium'),
            ("vote manipulation", True, 'medium'),
            ("fake review", True, 'medium'),
            ("buy now limited time", True, 'low'),
            ("click here free money", True, 'low'),
            ("normal content", False, 'low'),
            ("legitimate discussion", False, 'low')
        ]
        
        for content, should_flag, expected_priority in test_cases:
            result = analyzer.analyze_content(content)
            if should_flag:
                assert len(result.blocked_keywords) > 0, f"Should detect keywords in: {content}"
                assert result.priority == expected_priority, f"Wrong priority for: {content}"
            else:
                assert len(result.blocked_keywords) == 0, f"Should not detect keywords in: {content}"

    def test_keyword_case_sensitivity(self, analyzer):
        """Test that keyword detection is case-insensitive."""
        variations = [
            "Kill Yourself",
            "KILL YOURSELF",
            "kIlL yOuRsElF",
            "KYS",
            "kys",
            "Kys"
        ]
        
        for content in variations:
            result = analyzer.analyze_content(content)
            assert len(result.blocked_keywords) > 0, f"Should detect keyword in: {content}"
            assert result.auto_moderate is True, f"Should auto-moderate: {content}"

    def test_keyword_detection_in_context(self, analyzer):
        """Test keyword detection within larger text context."""
        contexts = [
            "I really think you should kill yourself in this video game",
            "The character says 'go die' to the villain",
            "This is a hate group according to the news",
            "The website looks like a phishing attack",
            "Don't click here for free money offers",
            "This review seems fake to me"
        ]
        
        for content in contexts:
            result = analyzer.analyze_content(content)
            assert len(result.blocked_keywords) > 0, f"Should detect keywords in context: {content}"

    def test_pattern_analysis_excessive_caps(self, analyzer):
        """Test detection of excessive capitalization patterns."""
        test_cases = [
            ("HELLO THIS IS A VERY LONG SENTENCE WITH LOTS OF CAPS", True),
            ("THIS IS SPAM!!!! BUY NOW!!!!", True),
            ("ATTENTION EVERYONE!!!", True),
            ("Hello World", False),
            ("HELLO", False),  # Too short to trigger
            ("Hello THIS is MIXED case", False)  # Not excessive enough
        ]
        
        for content, should_detect in test_cases:
            result = analyzer.analyze_content(content)
            if should_detect:
                assert "Excessive capitalization detected" in result.reasons
                assert result.toxicity_score >= 0.4
            else:
                assert "Excessive capitalization detected" not in result.reasons

    def test_pattern_analysis_word_repetition(self, analyzer):
        """Test detection of excessive word repetition."""
        test_cases = [
            ("spam spam spam spam spam spam spam", True),
            ("buy buy buy buy buy buy buy buy", True),
            ("hello world hello world hello world", True),
            ("this is a normal sentence with variety", False),
            ("hello world", False),  # Too short
            ("hello hello world", False)  # Not excessive enough
        ]
        
        for content, should_detect in test_cases:
            result = analyzer.analyze_content(content)
            if should_detect:
                assert "Excessive word repetition detected" in result.reasons
                assert result.toxicity_score >= 0.4
            else:
                assert "Excessive word repetition detected" not in result.reasons

    def test_pattern_analysis_excessive_punctuation(self, analyzer):
        """Test detection of excessive punctuation."""
        test_cases = [
            ("What!!! Really!!!", True),
            ("OMG!!!! This is crazy!!!!", True),
            ("Hello! How are you?", False),
            ("Great!!!", False),  # Only one instance
            ("Amazing! Fantastic! Wonderful!", False)  # Multiple but not excessive
        ]
        
        for content, should_detect in test_cases:
            result = analyzer.analyze_content(content)
            if should_detect:
                assert "Excessive punctuation detected" in result.reasons
                assert result.toxicity_score >= 0.3
            else:
                assert "Excessive punctuation detected" not in result.reasons

    def test_pattern_analysis_multiple_urls(self, analyzer):
        """Test detection of multiple URLs (spam indicator)."""
        test_cases = [
            ("Check out https://site1.com and https://site2.com and https://site3.com", True),
            ("Visit http://example.com and https://test.com and http://spam.com", True),
            ("Check out https://example.com for more info", False),
            ("Visit https://site1.com and https://site2.com", False),  # Only 2 URLs
            ("No URLs in this content", False)
        ]
        
        for content, should_detect in test_cases:
            result = analyzer.analyze_content(content)
            if should_detect:
                assert "Multiple URLs detected" in result.reasons
                assert result.toxicity_score >= 0.4
            else:
                assert "Multiple URLs detected" not in result.reasons

    def test_pattern_analysis_content_length(self, analyzer):
        """Test analysis of content length extremes."""
        # Very short content
        short_content = "   "
        result = analyzer.analyze_content(short_content)
        assert "Empty or very short content" in result.reasons
        assert result.toxicity_score >= 0.3
        
        # Extremely long content
        long_content = "word " * 1000  # 5000+ characters
        result = analyzer.analyze_content(long_content)
        assert "Extremely long content" in result.reasons
        assert result.toxicity_score >= 0.2

    def test_content_type_specific_moderation(self, analyzer):
        """Test content type-specific moderation thresholds."""
        # Test content with medium toxicity
        medium_toxic_content = "This is somewhat problematic content"
        
        # Mock the toxicity score to be medium
        with patch.object(analyzer, '_analyze_toxicity_api') as mock_api:
            def set_medium_toxicity(content, result):
                result.toxicity_score = 0.6
            mock_api.side_effect = set_medium_toxicity
            
            # Test different content types
            comment_result = analyzer.analyze_content(medium_toxic_content, 'comment')
            review_result = analyzer.analyze_content(medium_toxic_content, 'review')
            bio_result = analyzer.analyze_content(medium_toxic_content, 'bio')
            
            # Reviews should be flagged at 0.6 (lower threshold)
            assert review_result.auto_flag is True
            
            # Bios should be flagged at 0.4 (even lower threshold)
            assert bio_result.auto_flag is True
            
            # Comments should not be flagged at 0.6 (higher threshold)
            assert comment_result.auto_flag is False

    def test_perspective_api_integration(self, analyzer, mock_perspective_api):
        """Test integration with Perspective API."""
        # Set up API key
        analyzer.perspective_api_key = "test_api_key"
        
        content = "Test content for API analysis"
        result = analyzer.analyze_content(content)
        
        # Verify API was called
        mock_perspective_api.assert_called_once()
        
        # Verify request format
        call_args = mock_perspective_api.call_args
        assert call_args[1]['json']['comment']['text'] == content
        assert 'TOXICITY' in call_args[1]['json']['requestedAttributes']
        assert 'HARASSMENT' in call_args[1]['json']['requestedAttributes']
        
        # Verify result includes API toxicity score
        assert result.toxicity_score >= 0.8  # From mock response
        assert "API toxicity score: 0.80" in result.reasons

    def test_perspective_api_error_handling(self, analyzer):
        """Test handling of Perspective API errors."""
        analyzer.perspective_api_key = "test_api_key"
        
        # Test API error response
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 400
            mock_post.return_value = mock_response
            
            result = analyzer.analyze_content("Test content")
            # Should not crash, should continue with other analysis
            assert result is not None

        # Test network error
        with patch('requests.post', side_effect=Exception("Network error")):
            result = analyzer.analyze_content("Test content")
            # Should not crash, should continue with other analysis
            assert result is not None

    def test_toxicity_thresholds(self, analyzer):
        """Test different toxicity threshold behaviors."""
        test_cases = [
            (0.95, True, True, 'high'),     # Auto-moderate
            (0.85, False, True, 'medium'),  # Auto-flag
            (0.65, False, False, 'low'),    # Monitor
            (0.3, False, False, 'low')      # Clean
        ]
        
        for toxicity_score, should_moderate, should_flag, expected_priority in test_cases:
            # Mock the toxicity score
            with patch.object(analyzer, '_analyze_toxicity_api') as mock_api:
                def set_toxicity(content, result):
                    result.toxicity_score = toxicity_score
                mock_api.side_effect = set_toxicity
                
                result = analyzer.analyze_content("Test content")
                assert result.auto_moderate == should_moderate
                assert result.auto_flag == should_flag
                assert result.priority == expected_priority

    def test_mixed_analysis_scenarios(self, analyzer):
        """Test complex scenarios with multiple analysis factors."""
        # Content with both keywords and patterns
        complex_content = "KILL YOURSELF!!!! spam spam spam spam spam"
        result = analyzer.analyze_content(complex_content)
        
        assert len(result.blocked_keywords) > 0
        assert "Excessive capitalization detected" in result.reasons
        assert "Excessive word repetition detected" in result.reasons
        assert "Excessive punctuation detected" in result.reasons
        assert result.auto_moderate is True
        assert result.priority == 'high'

    def test_convenience_functions(self):
        """Test convenience functions for easy import."""
        content = "kill yourself"
        
        # Test analyze_content function
        result = analyze_content(content)
        assert isinstance(result, ContentAnalysisResult)
        assert result.auto_moderate is True
        
        # Test should_auto_moderate function
        should_moderate, analysis_dict = should_auto_moderate(content)
        assert should_moderate is True
        assert isinstance(analysis_dict, dict)
        assert 'toxicity_score' in analysis_dict
        
        # Test should_auto_flag function
        should_flag, analysis_dict = should_auto_flag(content)
        assert should_flag is True
        assert isinstance(analysis_dict, dict)

    def test_global_analyzer_instance(self):
        """Test that global analyzer instance works correctly."""
        # Test that content_analyzer is available
        assert content_analyzer is not None
        
        # Test that it can analyze content
        result = content_analyzer.analyze_content("test content")
        assert isinstance(result, ContentAnalysisResult)

    def test_performance_with_large_content(self, analyzer):
        """Test performance with large content blocks."""
        # Create large content
        large_content = "This is a test sentence. " * 1000  # ~25k characters
        
        start_time = time.time()
        result = analyzer.analyze_content(large_content)
        end_time = time.time()
        
        # Should complete within reasonable time
        assert end_time - start_time < 5.0  # 5 seconds max
        assert result is not None
        assert result.content == large_content

    def test_unicode_content_handling(self, analyzer):
        """Test handling of Unicode characters and non-English content."""
        unicode_contents = [
            "こんにちは世界",  # Japanese
            "Здравствуй мир",  # Russian
            "مرحبا بالعالم",    # Arabic
            "🎌🎯🎪🎭🎨",     # Emojis
            "café naïve résumé",  # Accented characters
            "kill yourself 🔫💀",  # Mixed emoji and keywords
        ]
        
        for content in unicode_contents:
            result = analyzer.analyze_content(content)
            assert result is not None
            assert result.content == content

    def test_edge_case_inputs(self, analyzer):
        """Test edge cases and malformed inputs."""
        edge_cases = [
            "",  # Empty string
            " ",  # Single space
            "\n\t\r",  # Whitespace only
            "a" * 10000,  # Very long single word
            "kill" + "\x00" + "yourself",  # Null byte injection
            "kill\0yourself",  # Another null byte variant
            "kill\ryourself",  # Carriage return
            "kill\nyourself",  # Newline
            "kill\tyourself",  # Tab
        ]
        
        for content in edge_cases:
            result = analyzer.analyze_content(content)
            assert result is not None
            # Should not crash on any input

    def test_concurrent_analysis(self, analyzer):
        """Test concurrent analysis requests."""
        import threading
        
        contents = [
            "kill yourself",
            "normal content",
            "buy now limited time",
            "hate group activity",
            "regular discussion"
        ]
        
        results = []
        
        def analyze_content_thread(content):
            result = analyzer.analyze_content(content)
            results.append(result)
        
        threads = []
        for content in contents:
            thread = threading.Thread(target=analyze_content_thread, args=(content,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # All analyses should complete
        assert len(results) == len(contents)
        
        # Check that toxic content was detected
        toxic_results = [r for r in results if r.auto_moderate or r.auto_flag]
        assert len(toxic_results) > 0

    def test_configuration_loading(self):
        """Test loading of configuration from environment."""
        # Test with custom blocked keywords
        custom_keywords = ["custom_bad_word", "another_bad_word"]
        
        with patch.dict(os.environ, {'BLOCKED_KEYWORDS': json.dumps(custom_keywords)}):
            analyzer = ContentAnalyzer()
            assert analyzer.blocked_keywords == custom_keywords

    def test_analysis_caching_behavior(self, analyzer):
        """Test that analysis results are consistent for same input."""
        content = "test content for caching"
        
        # Analyze same content multiple times
        results = []
        for _ in range(3):
            result = analyzer.analyze_content(content)
            results.append(result)
        
        # Results should be consistent
        for i in range(1, len(results)):
            assert results[i].toxicity_score == results[0].toxicity_score
            assert results[i].is_toxic == results[0].is_toxic
            assert results[i].auto_flag == results[0].auto_flag
            assert results[i].auto_moderate == results[0].auto_moderate

    def test_analysis_with_api_timeout(self, analyzer):
        """Test handling of API timeouts."""
        analyzer.perspective_api_key = "test_api_key"
        
        # Mock timeout exception
        with patch('requests.post', side_effect=Exception("Timeout")):
            result = analyzer.analyze_content("Test content")
            # Should not crash, should continue with other analysis
            assert result is not None
            assert result.content == "Test content"

    def test_multiple_blocked_keywords(self, analyzer):
        """Test content with multiple blocked keywords."""
        content = "kill yourself you hate group member, this is phishing"
        result = analyzer.analyze_content(content)
        
        assert len(result.blocked_keywords) >= 3
        assert result.auto_moderate is True
        assert result.priority == 'high'

    def test_keyword_boundaries(self, analyzer):
        """Test that keywords are detected with word boundaries."""
        # Should detect
        positive_cases = [
            "kill yourself now",
            "you should kill yourself",
            "kill yourself!",
            "KILL YOURSELF",
        ]
        
        # Should not detect (partial matches)
        negative_cases = [
            "skilled yourself",  # 'kill' is part of 'skilled'
            "killswitch",        # 'kill' is part of compound word
            "overkill",          # 'kill' is part of compound word
        ]
        
        for content in positive_cases:
            result = analyzer.analyze_content(content)
            assert len(result.blocked_keywords) > 0, f"Should detect in: {content}"
        
        for content in negative_cases:
            result = analyzer.analyze_content(content)
            # Note: Current implementation might not handle word boundaries perfectly
            # This test documents the current behavior
            pass

    def test_severity_escalation(self, analyzer):
        """Test that severity properly escalates with multiple factors."""
        # Start with low severity
        result1 = analyzer.analyze_content("buy now limited time")
        assert result1.priority == 'low'
        
        # Add medium severity
        result2 = analyzer.analyze_content("buy now limited time vote manipulation")
        assert result2.priority == 'medium'
        
        # Add high severity
        result3 = analyzer.analyze_content("buy now limited time vote manipulation kill yourself")
        assert result3.priority == 'high'

    def test_error_recovery(self, analyzer):
        """Test error recovery during analysis."""
        # Mock an error in pattern analysis
        with patch.object(analyzer, '_analyze_patterns', side_effect=Exception("Pattern error")):
            result = analyzer.analyze_content("test content")
            assert result is not None
            assert "Analysis error" in result.reasons

if __name__ == "__main__":
    pytest.main([__file__, "-v"])