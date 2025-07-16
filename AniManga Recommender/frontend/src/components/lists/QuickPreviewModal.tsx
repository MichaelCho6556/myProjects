// ABOUTME: Quick preview modal for list content without full navigation
// ABOUTME: Shows list details, preview items, and quick actions in overlay modal

import React, { useState, useEffect, useCallback, memo } from 'react';
import { CustomList } from '../../types/social';
import { XIcon, ExternalLinkIcon, HeartIcon, EyeIcon } from '../common/Icons';
import { formatRelativeTime, generateAvatarColor } from '../../utils/helpers';
import { logger } from '../../utils/logger';

interface QuickPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: CustomList | null;
  onToggleFollow?: () => void;
  onViewFull?: () => void;
  isAuthenticated?: boolean;
}

export const QuickPreviewModal: React.FC<QuickPreviewModalProps> = memo(({
  isOpen,
  onClose,
  list,
  onToggleFollow,
  onViewFull,
  isAuthenticated = true
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (list) {
      setIsFollowing(list.isFollowing || false);
    }
  }, [list]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleFollowClick = useCallback(async () => {
    if (!onToggleFollow || isLoading) return;
    
    setIsLoading(true);
    try {
      await onToggleFollow();
      setIsFollowing(!isFollowing);
    } catch (error) {
      logger.error('Failed to toggle follow state in QuickPreviewModal', {
        listId: list?.id,
        isFollowing,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
    } finally {
      setIsLoading(false);
    }
  }, [onToggleFollow, isLoading, isFollowing, list?.id]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);


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

  // Mock preview items - in real implementation, this would come from API
  const mockPreviewItems = [
    { id: '1', title: 'Attack on Titan', imageUrl: null, mediaType: 'anime' },
    { id: '2', title: 'Demon Slayer', imageUrl: null, mediaType: 'anime' },
    { id: '3', title: 'Your Name', imageUrl: null, mediaType: 'anime' },
    { id: '4', title: 'Spirited Away', imageUrl: null, mediaType: 'anime' },
    { id: '5', title: 'One Piece', imageUrl: null, mediaType: 'anime' }
  ];

  if (!isOpen || !list) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white line-clamp-1">
              {list.title}
            </h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrivacyBadgeColor(list.privacy)}`}>
              {list.privacy === 'public' ? 'Public' : list.privacy === 'friends_only' ? 'Friends' : 'Private'}
            </span>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* List Info */}
          <div className="p-6 space-y-4">
            {/* Creator and Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${generateAvatarColor(list.username)} 
                               flex items-center justify-center text-white font-bold`}>
                  {list.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{list.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Updated {formatRelativeTime(list.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <EyeIcon className="w-4 h-4" />
                  <span>{list.itemCount} items</span>
                </div>
                <div className="flex items-center gap-1">
                  <HeartIcon className="w-4 h-4" />
                  <span>{list.followersCount} followers</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                {list.description || 'No description provided for this list.'}
              </p>
            </div>

            {/* Tags */}
            {list.tags && list.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {list.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 
                             text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Preview Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Preview Items
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mockPreviewItems.slice(0, 6).map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {item.mediaType}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {list.itemCount > 6 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                  And {list.itemCount - 6} more items...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          {isAuthenticated ? (
            <button
              onClick={handleFollowClick}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isFollowing
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <HeartIcon className="w-4 h-4" filled={isFollowing} />
              {isLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow List'}
            </button>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Sign in to follow this list
            </div>
          )}

          <button
            onClick={onViewFull}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-600 text-white 
                     rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
          >
            <ExternalLinkIcon className="w-4 h-4" />
            View Full List
          </button>
        </div>
      </div>
    </div>
  );
});

// Set displayName for better debugging
QuickPreviewModal.displayName = 'QuickPreviewModal';