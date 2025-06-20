// ABOUTME: Main review system component that combines review form and review list
// ABOUTME: Handles review creation, display, and management for anime/manga items

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useReviews } from "../../../hooks/useReviews";
import { ReviewFormData, ReviewSortBy } from "../../../types/reviews";
import { ReviewForm } from "./ReviewForm";
import { ReviewCard } from "./ReviewCard";
import { ReviewFilters } from "./ReviewFilters";

interface ReviewSystemProps {
  itemUid: string;
  itemTitle: string;
  className?: string;
}

export const ReviewSystem: React.FC<ReviewSystemProps> = ({ itemUid, itemTitle, className = "" }) => {
  const { user } = useAuth();
  const { reviews, loading, error, submitting, createReview, fetchReviews, clearError } = useReviews();

  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<ReviewSortBy>("helpfulness");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  // Check if user has already reviewed this item
  useEffect(() => {
    if (user && reviews.length > 0) {
      const userReview = reviews.find((review) => review.user_id === user.id);
      setUserHasReviewed(!!userReview);
    }
  }, [user, reviews]);

  // Fetch reviews when component mounts or sorting changes
  useEffect(() => {
    loadReviews(1);
  }, [itemUid, sortBy]);

  const loadReviews = async (pageNum: number = 1) => {
    const response = await fetchReviews(itemUid, pageNum, 10, sortBy);
    if (response) {
      setHasMore(response.has_more);
      setPage(pageNum);
    }
  };

  const handleCreateReview = async (reviewData: Omit<ReviewFormData, "item_uid">) => {
    const fullReviewData: ReviewFormData = {
      ...reviewData,
      item_uid: itemUid,
    };

    const newReview = await createReview(fullReviewData);
    if (newReview) {
      setShowForm(false);
      setUserHasReviewed(true);
      // Refresh reviews to show the new one
      loadReviews(1);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadReviews(page + 1);
    }
  };

  const handleSortChange = (newSortBy: ReviewSortBy) => {
    setSortBy(newSortBy);
    setPage(1);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews for {itemTitle}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Write Review Button */}
          {user && !userHasReviewed && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Write a Review
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* User Already Reviewed Notice */}
      {user && userHasReviewed && (
        <div className="mx-6 mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            You have already reviewed this item. You can find your review below.
          </p>
        </div>
      )}

      {/* Login Prompt */}
      {!user && (
        <div className="mx-6 mt-4 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            <span className="font-medium">Sign in to write a review</span> and help others discover great
            anime and manga!
          </p>
        </div>
      )}

      {/* Review Form */}
      {showForm && user && !userHasReviewed && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <ReviewForm
            onSubmit={handleCreateReview}
            onCancel={() => setShowForm(false)}
            submitting={submitting}
            itemTitle={itemTitle}
          />
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="p-6">
        <ReviewFilters sortBy={sortBy} onSortChange={handleSortChange} reviewCount={reviews.length} />
      </div>

      {/* Reviews List */}
      <div className="px-6 pb-6">
        {loading && page === 1 ? (
          // Loading skeleton
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                      </div>
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <>
            {/* Reviews */}
            <div className="space-y-6">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} currentUserId={user?.id || ""} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="inline-block w-4 h-4 mr-2 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </>
                  ) : (
                    "Load More Reviews"
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          // No reviews state
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reviews yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Be the first to share your thoughts about {itemTitle}!
            </p>
            {user && !userHasReviewed && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Write the First Review
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
