// ABOUTME: Component for voting on review helpfulness with optimistic updates
// ABOUTME: Handles helpful/not helpful voting with real-time feedback

import React, { useState, useEffect } from 'react';
import { useReviews } from '../../../hooks/useReviews';
import { ReviewVoteStats } from '../../../types/reviews';

interface ReviewVotingComponentProps {
  reviewId: number;
  initialStats: ReviewVoteStats;
  disabled?: boolean;
  className?: string;
}

export const ReviewVotingComponent: React.FC<ReviewVotingComponentProps> = ({
  reviewId,
  initialStats,
  disabled = false,
  className = '',
}) => {
  const { voteOnReview, getVoteStats } = useReviews();
  
  const [stats, setStats] = useState<ReviewVoteStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current vote stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      const currentStats = await getVoteStats(reviewId);
      if (currentStats) {
        setStats(currentStats);
      }
    };
    fetchStats();
  }, [reviewId, getVoteStats]);

  const handleVote = async (voteType: 'helpful' | 'not_helpful') => {
    if (disabled || loading) return;

    setLoading(true);
    setError(null);

    // Optimistic update
    const previousStats = { ...stats };
    let newStats = { ...stats };

    if (stats.user_vote === voteType) {
      // User is removing their vote
      if (voteType === 'helpful') {
        newStats.helpful_votes = Math.max(0, newStats.helpful_votes - 1);
      }
      newStats.total_votes = Math.max(0, newStats.total_votes - 1);
      newStats.user_vote = null;
    } else if (stats.user_vote === null) {
      // User is adding a new vote
      if (voteType === 'helpful') {
        newStats.helpful_votes += 1;
      }
      newStats.total_votes += 1;
      newStats.user_vote = voteType;
    } else {
      // User is changing their vote
      if (stats.user_vote === 'helpful' && voteType === 'not_helpful') {
        newStats.helpful_votes = Math.max(0, newStats.helpful_votes - 1);
      } else if (stats.user_vote === 'not_helpful' && voteType === 'helpful') {
        newStats.helpful_votes += 1;
      }
      newStats.user_vote = voteType;
    }

    // Calculate new percentage
    newStats.helpfulness_percentage = newStats.total_votes > 0 
      ? (newStats.helpful_votes / newStats.total_votes) * 100 
      : 0;

    setStats(newStats);

    try {
      const result = await voteOnReview(reviewId, { vote_type: voteType });
      if (result) {
        setStats(result);
      } else {
        // Revert optimistic update on failure
        setStats(previousStats);
        setError('Failed to record vote. Please try again.');
      }
    } catch (err) {
      // Revert optimistic update on error
      setStats(previousStats);
      setError('Failed to record vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatVoteText = (count: number, label: string) => {
    return `${count} ${count === 1 ? label : label + 's'}`;
  };

  if (disabled) {
    return (
      <div className={`flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span>{formatVoteText(stats.helpful_votes, 'helpful')}</span>
        </div>
        <div className="text-gray-300 dark:text-gray-600">•</div>
        <div>
          {stats.total_votes > 0 && (
            <span>{Math.round(stats.helpfulness_percentage)}% helpful</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Vote Buttons */}
      <div className="flex items-center space-x-2">
        {/* Helpful Button */}
        <button
          onClick={() => handleVote('helpful')}
          disabled={loading}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-full border transition-all ${
            stats.user_vote === 'helpful'
              ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title="Mark this review as helpful"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span className="text-sm font-medium">
            {stats.helpful_votes}
          </span>
        </button>

        {/* Not Helpful Button */}
        <button
          onClick={() => handleVote('not_helpful')}
          disabled={loading}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-full border transition-all ${
            stats.user_vote === 'not_helpful'
              ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title="Mark this review as not helpful"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
          </svg>
          <span className="text-sm font-medium">
            {stats.total_votes - stats.helpful_votes}
          </span>
        </button>
      </div>

      {/* Stats Display */}
      {stats.total_votes > 0 && (
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="text-gray-300 dark:text-gray-600">•</div>
          <span>
            {Math.round(stats.helpfulness_percentage)}% helpful
          </span>
          <span className="text-gray-300 dark:text-gray-600">
            ({formatVoteText(stats.total_votes, 'vote')})
          </span>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Updating...</span>
        </div>
      )}
    </div>
  );
};