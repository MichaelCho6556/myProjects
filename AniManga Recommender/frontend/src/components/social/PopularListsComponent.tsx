// ABOUTME: Popular lists component displaying trending and most-followed user-created lists
// ABOUTME: Shows community-curated content with engagement metrics and trending indicators

import React, { useState, useEffect } from "react";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";


// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url: string) => {
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

interface PopularList {
  id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  popularity_score: number;
  item_count: number;
  recent_comments: number;
  total_activity: number;
}

interface PopularListsComponentProps {
  className?: string;
  onListClick?: (list: PopularList) => void;
}

export const PopularListsComponent: React.FC<PopularListsComponentProps> = ({
  className = "",
  onListClick,
}) => {
  const { makeAuthenticatedRequest } = useAuthenticatedApi();

  const [lists, setLists] = useState<PopularList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);

  useEffect(() => {
    fetchPopularLists();
  }, [page]);

  const fetchPopularLists = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest(`/api/lists/popular?page=${page}&limit=20`);

      if (page === 1) {
        setLists(response.lists || response);
      } else {
        setLists((prev) => [...prev, ...(response.lists || response)]);
      }

      setHasMore(response.has_more || false);
      setCacheInfo(response.cache_info || null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to load popular lists");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPopularityBadge = (score: number) => {
    if (score >= 20) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          🔥 Trending
        </span>
      );
    } else if (score >= 15) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
          📈 Rising
        </span>
      );
    } else if (score >= 10) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          ⭐ Popular
        </span>
      );
    }
    return null;
  };

  const renderList = (list: PopularList) => {
    return (
      <div
        key={list.id}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
          onListClick ? "cursor-pointer" : ""
        }`}
        onClick={() => onListClick?.(list)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{list.title}</h3>
            {list.user_profiles && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  {list.user_profiles.avatar_url ? (
                    <img
                      src={sanitizeUrl(list.user_profiles.avatar_url)}
                      alt={`${list.user_profiles.display_name}'s avatar`}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {list.user_profiles.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  by {list.user_profiles.display_name}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {getPopularityBadge(list.popularity_score)}
            <span className="text-sm text-gray-500 dark:text-gray-400">Score: {list.popularity_score}</span>
          </div>
        </div>

        {/* Description */}
        {list.description && (
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-2">{list.description}</p>
        )}

        {/* Metrics */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-sm">📝</span>
              <span>{list.item_count} items</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-sm">💬</span>
              <span>{list.recent_comments} comments</span>
            </div>

            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>{list.total_activity} activity</span>
            </div>
          </div>

          <span className="text-xs">{formatDate(list.created_at)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Popular This Week</h2>

        {cacheInfo && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {cacheInfo.status === "calculating" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Calculating...</span>
              </div>
            ) : (
              <span>Updated {new Date(cacheInfo.generated_at).toLocaleTimeString()}</span>
            )}
          </div>
        )}
      </div>

      {/* Status Message */}
      {cacheInfo?.status === "calculating" && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <div>
              <p className="text-blue-700 dark:text-blue-300 font-medium">Calculating Popular Lists</p>
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                {cacheInfo.message || "We're analyzing community activity to find the most popular lists."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Lists Grid */}
      {loading && page === 1 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
              </div>
              <div className="flex justify-between">
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                </div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      ) : lists.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{lists.map(renderList)}</div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-6">
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Loading..." : "Load More Lists"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
            <span className="text-4xl">📋</span>
          </div>
          <p className="text-lg font-medium mb-2">No popular lists yet</p>
          <p className="text-sm">Check back soon as the community creates and engages with lists!</p>
        </div>
      )}
    </div>
  );
};
