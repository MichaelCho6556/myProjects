// ABOUTME: Grid-layout card component for visual list discovery with preview thumbnails and enhanced UX
// ABOUTME: Vertical card design optimized for grid display with visual hierarchy and engaging interactions

import React, { useState, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CustomList } from '../../types/social';
import { formatRelativeTime, generateAvatarColor } from '../../utils/helpers';
import { HeartIcon, UsersIcon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
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
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(list.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(list.followersCount || 0);

  // Check if current user is the owner of the list
  const isOwner = user?.id === list.userId;

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


  const getContentTypeBadge = () => {
    // Use actual content type from backend data or fallback to mixed
    const contentType = list.contentType || 'mixed';
    const typeDisplayMap: Record<string, string> = {
      'anime': 'Anime',
      'manga': 'Manga',
      'mixed': 'Mixed',
      'empty': 'Empty'
    };
    const colorMap: Record<string, string> = {
      'Anime': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Manga': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Mixed': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Empty': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    const displayType = typeDisplayMap[contentType] || 'Mixed';
    return { type: displayType, color: colorMap[displayType] || colorMap['Mixed'] };
  };

  const contentType = useMemo(() => getContentTypeBadge(), [list.contentType]);

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 
                 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 
                 transition-all duration-200 overflow-hidden group cursor-pointer flex flex-col h-full"
      onClick={(e) => {
        e.preventDefault();
        onListClick?.();
      }}
    >
      <div className="flex flex-col h-full">
        {/* Compact Header */}
        <div className="relative h-20 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="absolute inset-0 bg-black/10 dark:bg-black/30 flex items-center justify-between px-4">
            {/* Left: Item Count */}
            <div className="text-white">
              <div className="text-2xl font-bold">{list.itemCount}</div>
              <div className="text-xs opacity-90">items</div>
            </div>
            
            {/* Right: Type Badge */}
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-1 bg-white/20 backdrop-blur text-white rounded text-xs font-medium">
                {contentType.type}
              </span>
              {list.isCollaborative && (
                <div className="text-xs text-white/80 mt-1">
                  <UsersIcon className="w-3 h-3 inline mr-1" />
                  Collab
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col flex-grow">
          <div className="p-4 flex-grow">
            {/* Title */}
            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 mb-1">
              {list.title}
            </h3>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
              {list.description || 'No description provided.'}
            </p>

            {/* Tags */}
            {list.tags && list.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {list.tags.slice(0, 2).map((tag) => (
                  <button
                    key={tag}
                    onClick={(e) => handleTagClick(e, tag)}
                    className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700 
                             text-gray-600 dark:text-gray-400 rounded text-xs
                             hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300
                             transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
                {list.tags.length > 2 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{list.tags.length - 2}
                  </span>
                )}
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <HeartIcon className="w-3.5 h-3.5" />
                  {followersCount}
                </span>
                <span className="text-xs">{formatRelativeTime(list.updatedAt)}</span>
              </div>
              {list.privacy === 'public' && (
                <span className="text-xs text-green-600 dark:text-green-400">Public</span>
              )}
            </div>
          </div>

          {/* Creator and Follow Section - Now outside the content padding */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              {/* Creator */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full ${generateAvatarColor(list.username)} 
                               flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {list.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {list.username}
                </span>
              </div>

              {/* Follow Button */}
              <div className="flex-shrink-0">
                {!isOwner && isAuthenticated ? (
                  <button
                    onClick={handleFollowClick}
                    disabled={isLoading}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isFollowing
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                ) : !isOwner && !isAuthenticated ? (
                  <Link
                    to="/auth/login"
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Sign in
                  </Link>
                ) : (
                  <div className="px-4 py-1.5 text-gray-500 text-sm">
                    Your list
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Set displayName for better debugging
ListGridCard.displayName = 'ListGridCard';