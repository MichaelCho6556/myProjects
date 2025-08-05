// ABOUTME: User search component for finding community members with autocomplete and filtering
// ABOUTME: Provides search functionality for discovering users by username, display name, and activity level

import React, { useState, useEffect, useCallback } from "react";
import { useUserSearch } from "../../hooks/useSocialFeatures";
import { FollowButton } from "./FollowButton";
import { useDebounce } from "../../hooks/useDebounce";


// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  // Decode URL to catch encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }
  
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // Dangerous schemes to block
  const dangerousSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:',
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return 'about:blank';
    }
  }
  
  // Additional check for encoded attempts
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return 'about:blank';
  }
  
  return url;
};

export const UserSearchComponent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 500);

  const { searchResults, isLoading, error, hasMore, searchUsers, clearSearch } = useUserSearch();

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchUsers(debouncedQuery);
    } else {
      clearSearch();
    }
  }, [debouncedQuery, searchUsers, clearSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFollowUser = useCallback(async (_username: string) => {
    // This would typically call an API to follow/unfollow the user
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <input
          className="user-search-input"
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search users by username or display name..."
          disabled={isLoading}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Search Results */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error.message}</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Search Results ({searchResults.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={sanitizeUrl(user.avatarUrl)}
                        alt={`${user.displayName}'s avatar`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-medium text-gray-500 dark:text-gray-400">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">{user.displayName}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">@{user.username}</p>
                    {user.bio && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">{user.bio}</p>
                    )}

                    {/* Stats */}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                      <span>{user.followersCount} followers</span>
                      <span>{user.completedAnime + user.completedManga} completed</span>
                    </div>
                  </div>
                </div>

                {/* Follow Button */}
                <div className="mt-3 flex justify-end">
                  <FollowButton
                    isFollowing={user.isFollowing || false}
                    onToggleFollow={() => handleFollowUser(user.username)}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => searchUsers(searchQuery, Math.floor(searchResults.length / 20) + 2)}
                disabled={isLoading}
                className="
                  px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                "
              >
                {isLoading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {searchQuery && searchResults.length === 0 && !isLoading && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="mx-auto w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try searching with a different username or display name.
          </p>
        </div>
      )}
    </div>
  );
};
