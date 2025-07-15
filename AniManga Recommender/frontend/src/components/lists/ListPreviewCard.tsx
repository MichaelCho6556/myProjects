// ABOUTME: Preview card component for displaying list information in discovery and search results
// ABOUTME: Shows list details with follow button, tags, and preview items in compact format

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomList } from '../../types/social';

interface ListPreviewCardProps {
  list: CustomList;
  onToggleFollow: () => void;
  onTagClick: (tag: string) => void;
  isAuthenticated?: boolean;
}

export const ListPreviewCard: React.FC<ListPreviewCardProps> = ({
  list,
  onToggleFollow,
  onTagClick,
  isAuthenticated = true
}) => {
  const [isFollowing, setIsFollowing] = useState(list.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onToggleFollow();
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    onTagClick(tag);
  };

  return (
    <Link to={`/lists/${list.id}`} className="block group">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 
                      hover:shadow-md dark:hover:shadow-lg transition-shadow duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 
                          group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1 mr-2">
              {list.title}
            </h3>
            
            {/* Follow Button */}
            {isAuthenticated ? (
              <button
                onClick={handleFollowClick}
                disabled={isLoading}
                className={`flex-shrink-0 px-3 py-1 text-sm font-medium rounded-full transition-colors
                  ${isFollowing 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <svg className="animate-spin h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : isFollowing ? (
                  'Following'
                ) : (
                  'Follow'
                )}
              </button>
            ) : (
              <Link
                to="/auth/login"
                className="flex-shrink-0 px-3 py-1 text-sm font-medium rounded-full 
                          bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 
                          hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Sign in to follow
              </Link>
            )}
          </div>

          {/* Description */}
          {list.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {list.description}
            </p>
          )}

          {/* Creator Info */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {(list.creatorUsername || list.displayName)?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              by <span className="font-medium">{list.creatorUsername || list.displayName || 'Unknown'}</span>
            </span>
          </div>

          {/* Tags */}
          {list.tags && list.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {list.tags.slice(0, 3).map(tag => (
                <button
                  key={tag}
                  onClick={(e) => handleTagClick(e, tag)}
                  className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                           rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  #{tag}
                </button>
              ))}
              {list.tags.length > 3 && (
                <span className="inline-block px-2 py-1 text-gray-500 dark:text-gray-400 text-xs">
                  +{list.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              {/* Item Count */}
              <div className="flex items-center gap-1">
                <span className="text-sm">📝</span>
                <span>{list.itemCount || 0} items</span>
              </div>

              {/* Followers Count */}
              {list.followersCount > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{list.followersCount}</span>
                </div>
              )}
            </div>

            {/* Privacy Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                list.privacy === 'public' 
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : list.privacy === 'friends_only'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {list.privacy === 'public' ? 'PUBLIC' : 
                 list.privacy === 'friends_only' ? 'FRIENDS ONLY' : 'PRIVATE'}
              </span>
            </div>
          </div>

          {/* Last Updated */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Updated {new Date(list.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Link>
  );
};