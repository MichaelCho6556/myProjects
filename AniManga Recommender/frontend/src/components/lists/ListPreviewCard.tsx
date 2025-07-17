// ABOUTME: Preview card component for displaying list information in discovery and search results
// ABOUTME: Shows list details with follow button, tags, and preview items in compact format

import React, { useState, memo, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CustomList } from '../../types/social';
import { formatRelativeTime, generateAvatarColor } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';

interface ListPreviewCardProps {
  list: CustomList;
  onToggleFollow: () => void;
  onTagClick: (tag: string) => void;
  onListClick?: () => void;
  isAuthenticated?: boolean;
}

export const ListPreviewCard: React.FC<ListPreviewCardProps> = memo(({
  list,
  onToggleFollow,
  onTagClick,
  onListClick,
  isAuthenticated = true
}) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(list.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(list.followersCount || 0);

  // Check if current user is the owner of the list
  const isOwner = user?.id === list.userId;

  // Memoize privacy badge class calculation
  const privacyBadgeClass = useMemo(() => {
    switch (list.privacy) {
      case 'public':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'friends_only':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }, [list.privacy]);

  // Memoize privacy label calculation
  const privacyLabel = useMemo(() => {
    switch (list.privacy) {
      case 'public':
        return 'Public';
      case 'friends_only':
        return 'Friends';
      default:
        return 'Private';
    }
  }, [list.privacy]);

  const handleFollowClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onToggleFollow();
      const newFollowingState = !isFollowing;
      setIsFollowing(newFollowingState);
      setFollowersCount(prev => newFollowingState ? prev + 1 : Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Failed to toggle follow state in ListPreviewCard', {
        listId: list.id,
        listTitle: list.title,
        isFollowing,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      setFollowersCount(list.followersCount || 0);
    } finally {
      setIsLoading(false);
    }
  }, [onToggleFollow, isLoading, isFollowing, list.id, list.title, list.followersCount]);

  const handleTagClick = useCallback((e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    onTagClick(tag);
  }, [onTagClick]);


  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        onListClick?.();
      }}
    >
      {/* Horizontal Layout */}
      <div className="flex items-start gap-6">
        
        {/* Left Side - List Info */}
        <div className="flex-1 min-w-0">
          {/* Title and Privacy */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <Link 
                to={`/lists/${list.id}`}
                className="block group"
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {list.title}
                </h3>
              </Link>
              
              {/* Privacy Badge */}
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${privacyBadgeClass}`}>
                  {privacyLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
            {list.description || 'No description provided.'}
          </p>

          {/* Tags */}
          {list.tags && list.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {list.tags.slice(0, 4).map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => handleTagClick(e, tag)}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 
                           text-gray-700 dark:text-gray-300 rounded text-xs font-medium
                           hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300
                           transition-colors"
                >
                  #{tag}
                </button>
              ))}
              {list.tags.length > 4 && (
                <span className="text-gray-500 dark:text-gray-400 text-xs px-2 py-1">
                  +{list.tags.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Creator and Stats Row */}
          <div className="flex items-center justify-between">
            {/* Creator */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${generateAvatarColor(list.username)} 
                             flex items-center justify-center text-white text-sm font-bold`}>
                {list.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {list.username}
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(list.updatedAt)}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <span>{list.itemCount}</span>
                <span>items</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{followersCount}</span>
                <span>followers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Follow Button */}
        <div className="flex-shrink-0">
          {!isOwner && isAuthenticated ? (
            <button
              onClick={handleFollowClick}
              disabled={isLoading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isFollowing
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </button>
          ) : !isOwner && !isAuthenticated ? (
            <Link
              to="/auth/login"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sign in to follow
            </Link>
          ) : (
            <div className="px-6 py-2 text-gray-500 text-sm">
              Your list
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Set displayName for better debugging
ListPreviewCard.displayName = 'ListPreviewCard';