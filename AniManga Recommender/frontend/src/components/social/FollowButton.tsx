// ABOUTME: Follow/unfollow button component for user profiles with loading states and visual feedback
// ABOUTME: Handles follow relationships between users with optimistic updates and error handling

import React, { useState } from 'react';
import { logger } from '../../utils/logger';

interface FollowButtonProps {
  isFollowing: boolean;
  onToggleFollow: () => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  isFollowing,
  onToggleFollow,
  disabled = false,
  size = 'md'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticIsFollowing, setOptimisticIsFollowing] = useState(isFollowing);
  const [error, setError] = useState<string | null>(null);

  // Update optimistic state when prop changes
  React.useEffect(() => {
    setOptimisticIsFollowing(isFollowing);
  }, [isFollowing]);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    // Clear any previous error
    setError(null);
    
    // Optimistic update
    const previousState = optimisticIsFollowing;
    setOptimisticIsFollowing(!previousState);
    setIsLoading(true);

    try {
      // Call parent's onToggleFollow which handles the API call
      await onToggleFollow();
      
      // The parent will update the isFollowing prop, which will update our optimistic state
      // No need to make a separate API call here
    } catch (error) {
      // Revert optimistic update on failure
      setOptimisticIsFollowing(previousState);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update follow status';
      setError(errorMessage);
      logger.error('Failed to toggle follow', {
        error: error instanceof Error ? error.message : "Unknown error" || 'Unknown error',
        context: 'FollowButton',
        operation: 'handleToggleFollow',
        isFollowing: isFollowing
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const baseClasses = `
    font-medium rounded-lg transition-colors duration-200 
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
  `;

  return (
    <div className="space-y-2">
      {optimisticIsFollowing ? (
        <button
          onClick={handleClick}
          disabled={disabled || isLoading}
          className={`
            ${baseClasses}
            bg-gray-200 text-gray-800 hover:bg-gray-300
            dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600
            focus:ring-gray-500
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Unfollowing...
            </span>
          ) : 'Following'}
        </button>
      ) : (
        <button
          onClick={handleClick}
          disabled={disabled || isLoading}
          className={`
            ${baseClasses}
            bg-blue-600 text-white hover:bg-blue-700
            dark:bg-blue-500 dark:hover:bg-blue-600
            focus:ring-blue-500
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Following...
            </span>
          ) : 'Follow'}
        </button>
      )}
      
      {/* Error Message */}
      {error && (
        <p className="text-red-600 dark:text-red-400 text-xs">
          {error}
        </p>
      )}
    </div>
  );
};