// ABOUTME: Grid-layout card component for visual list discovery with preview thumbnails and enhanced UX
// ABOUTME: Vertical card design optimized for grid display with visual hierarchy and engaging interactions

import React, { useState, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CustomList } from '../../types/social';
import { formatRelativeTime, generateAvatarColor } from '../../utils/helpers';
import { EyeIcon, HeartIcon, UsersIcon, MoreVerticalIcon } from '../common/Icons';
import { logger } from '../../utils/logger';

interface ListGridCardProps {
  list: CustomList;
  onToggleFollow: () => void;
  onTagClick: (tag: string) => void;
  onListClick?: () => void;
  isAuthenticated?: boolean;
}

export const ListGridCard: React.FC<ListGridCardProps> = memo(({
  list,
  onToggleFollow,
  onTagClick,
  onListClick,
  isAuthenticated = true
}) => {
  const [isFollowing, setIsFollowing] = useState(list.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(list.followersCount || 0);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleFollowClick = async (e: React.MouseEvent) => {
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
      logger.error('Failed to toggle follow state in ListGridCard', {
        listId: list.id,
        listTitle: list.title,
        isFollowing,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      setFollowersCount(list.followersCount || 0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    onTagClick(tag);
  };


  const getPrivacyBadgeColor = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'friends_only':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getContentTypeBadge = () => {
    // Determine content type based on actual data or use a default
    // TODO: This should be determined by API data in the future
    const defaultType = 'Mixed'; // Default to Mixed since we don't have actual data yet
    const colorMap = {
      'Anime': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Manga': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Mixed': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return { type: defaultType, color: colorMap[defaultType] };
  };

  const contentType = useMemo(() => getContentTypeBadge(), []);

  // Generate quality score based on followers and activity (memoized for performance)
  const qualityScore = useMemo(() => {
    const base = Math.min(5, Math.floor(followersCount / 10));
    const recency = formatRelativeTime(list.updatedAt).includes('h ago') || formatRelativeTime(list.updatedAt) === 'Just now' ? 1 : 0;
    return Math.min(5, base + recency);
  }, [followersCount, list.updatedAt]);

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
                 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden
                 group cursor-pointer"
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => setShowQuickActions(false)}
      onClick={(e) => {
        e.preventDefault();
        onListClick?.();
      }}
    >
      <div className="block">
        {/* Preview Thumbnails Section */}
        <div className="relative h-40 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600">
          {/* Placeholder for preview thumbnails - will be replaced with actual item images */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {list.itemCount} items
              </p>
            </div>
          </div>
          
          {/* Quality Rating Stars */}
          <div className="absolute top-3 left-3 flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < qualityScore 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Content Type Badge */}
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${contentType.color}`}>
              {contentType.type}
            </span>
          </div>

          {/* Quick Actions Menu */}
          {showQuickActions && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-label="More actions"
              >
                <MoreVerticalIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          )}

          {/* Collaborative Indicator */}
          {list.isCollaborative && (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                <UsersIcon className="w-3 h-3" />
                Collaborative
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          {/* Title and Privacy */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 flex-1 mr-2">
              {list.title}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getPrivacyBadgeColor(list.privacy)}`}>
              {list.privacy === 'public' ? 'Public' : list.privacy === 'friends_only' ? 'Friends' : 'Private'}
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
            {list.description || 'No description provided.'}
          </p>

          {/* Tags */}
          {list.tags && list.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {list.tags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => handleTagClick(e, tag)}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 
                           text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium
                           hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300
                           transition-colors"
                >
                  #{tag}
                </button>
              ))}
              {list.tags.length > 3 && (
                <span className="text-gray-500 dark:text-gray-400 text-xs px-2 py-1">
                  +{list.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <EyeIcon className="w-4 h-4" />
                <span>{list.itemCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <HeartIcon className="w-4 h-4" />
                <span>{followersCount}</span>
              </div>
            </div>
            <span className="text-xs">{formatRelativeTime(list.updatedAt)}</span>
          </div>

          {/* Creator and Follow Section */}
          <div className="flex items-center justify-between">
            {/* Creator */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-full ${generateAvatarColor(list.username)} 
                             flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                {list.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block truncate">
                  {list.username}
                </span>
              </div>
            </div>

            {/* Follow Button */}
            <div className="flex-shrink-0">
              {isAuthenticated ? (
                <button
                  onClick={handleFollowClick}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isFollowing
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </button>
              ) : (
                <Link
                  to="/auth/login"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 hover:shadow-md transition-all duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Set displayName for better debugging
ListGridCard.displayName = 'ListGridCard';