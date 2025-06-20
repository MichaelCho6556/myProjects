// ABOUTME: Custom React hook for managing review operations and state
// ABOUTME: Provides functions for creating, fetching, voting, and reporting reviews

import { useState, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { 
  Review, 
  ReviewFormData, 
  ReviewsResponse, 
  ReviewVoteStats, 
  ReviewVoteRequest, 
  ReviewReport,
  ReviewSortBy 
} from '../types/reviews';

interface UseReviewsReturn {
  // State
  reviews: Review[];
  loading: boolean;
  error: string | null;
  submitting: boolean;
  
  // Review operations
  createReview: (reviewData: ReviewFormData) => Promise<Review | null>;
  fetchReviews: (itemUid: string, page?: number, limit?: number, sortBy?: ReviewSortBy) => Promise<ReviewsResponse | null>;
  updateReview: (reviewId: number, reviewData: Partial<ReviewFormData>) => Promise<Review | null>;
  deleteReview: (reviewId: number) => Promise<boolean>;
  
  // Voting operations
  voteOnReview: (reviewId: number, voteData: ReviewVoteRequest) => Promise<ReviewVoteStats | null>;
  getVoteStats: (reviewId: number) => Promise<ReviewVoteStats | null>;
  
  // Reporting operations
  reportReview: (reviewId: number, reportData: ReviewReport) => Promise<boolean>;
  
  // Utility functions
  clearError: () => void;
  resetState: () => void;
}

export const useReviews = (): UseReviewsReturn => {
  const { makeAuthenticatedRequest } = useAuthenticatedApi();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setReviews([]);
    setLoading(false);
    setError(null);
    setSubmitting(false);
  }, []);

  const createReview = useCallback(async (reviewData: ReviewFormData): Promise<Review | null> => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await makeAuthenticatedRequest('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      // Optimistically add the new review to the list
      setReviews(prev => [response, ...prev]);
      
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create review';
      setError(errorMessage);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [makeAuthenticatedRequest]);

  const fetchReviews = useCallback(async (
    itemUid: string, 
    page: number = 1, 
    limit: number = 10, 
    sortBy: ReviewSortBy = 'helpfulness'
  ): Promise<ReviewsResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
      });

      const response = await makeAuthenticatedRequest(`/api/reviews/${itemUid}?${params.toString()}`);

      if (page === 1) {
        setReviews(response.reviews);
      } else {
        setReviews(prev => [...prev, ...response.reviews]);
      }

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch reviews';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const updateReview = useCallback(async (
    reviewId: number, 
    reviewData: Partial<ReviewFormData>
  ): Promise<Review | null> => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await makeAuthenticatedRequest(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      // Update the review in the local state
      setReviews(prev => 
        prev.map(review => 
          review.id === reviewId ? response : review
        )
      );

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update review';
      setError(errorMessage);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [makeAuthenticatedRequest]);

  const deleteReview = useCallback(async (reviewId: number): Promise<boolean> => {
    try {
      setSubmitting(true);
      setError(null);

      await makeAuthenticatedRequest(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      // Remove the review from local state
      setReviews(prev => prev.filter(review => review.id !== reviewId));

      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete review';
      setError(errorMessage);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [makeAuthenticatedRequest]);

  const voteOnReview = useCallback(async (
    reviewId: number, 
    voteData: ReviewVoteRequest
  ): Promise<ReviewVoteStats | null> => {
    try {
      setError(null);

      const response = await makeAuthenticatedRequest(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteData),
      });

      // Update the review's vote stats in local state
      if (response.vote_stats) {
        setReviews(prev => 
          prev.map(review => {
            if (review.id === reviewId) {
              return {
                ...review,
                total_votes: response.vote_stats.total_votes,
                helpful_votes: response.vote_stats.helpful_votes,
                helpfulness_score: response.vote_stats.helpful_votes - (response.vote_stats.total_votes - response.vote_stats.helpful_votes)
              };
            }
            return review;
          })
        );
      }

      return response.vote_stats;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to vote on review';
      setError(errorMessage);
      return null;
    }
  }, [makeAuthenticatedRequest]);

  const getVoteStats = useCallback(async (reviewId: number): Promise<ReviewVoteStats | null> => {
    try {
      setError(null);

      const response = await makeAuthenticatedRequest(`/api/reviews/${reviewId}/votes`);

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to get vote stats';
      setError(errorMessage);
      return null;
    }
  }, [makeAuthenticatedRequest]);

  const reportReview = useCallback(async (
    reviewId: number, 
    reportData: ReviewReport
  ): Promise<boolean> => {
    try {
      setError(null);

      await makeAuthenticatedRequest(`/api/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to report review';
      setError(errorMessage);
      return false;
    }
  }, [makeAuthenticatedRequest]);

  return {
    // State
    reviews,
    loading,
    error,
    submitting,
    
    // Review operations
    createReview,
    fetchReviews,
    updateReview,
    deleteReview,
    
    // Voting operations
    voteOnReview,
    getVoteStats,
    
    // Reporting operations
    reportReview,
    
    // Utility functions
    clearError,
    resetState,
  };
};