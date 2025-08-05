// ABOUTME: Community recommendations component suggesting content based on user behavior and preferences
// ABOUTME: Uses collaborative filtering to recommend lists and content from similar users

import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../context/AuthContext';


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

interface RecommendedList {
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
  recommendation_score: number;
  recommendation_reason: string;
}

interface CommunityRecommendationsComponentProps {
  className?: string;
  onListClick?: (list: RecommendedList) => void;
}

export const CommunityRecommendationsComponent: React.FC<CommunityRecommendationsComponentProps> = ({ 
  className = '',
  onListClick
}) => {
  const { user } = useAuth();
  const { makeAuthenticatedRequest } = useAuthenticatedApi();
  
  const [recommendations, setRecommendations] = useState<RecommendedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user, page]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest(`/api/auth/recommended-lists?page=${page}&limit=20`);
      
      if (page === 1) {
        setRecommendations(response.recommendations || response);
      } else {
        setRecommendations(prev => [...prev, ...(response.recommendations || response)]);
      }
      
      setHasMore(response.has_more || false);
      setCacheInfo(response.cache_info || null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const refreshRecommendations = async () => {
    try {
      setLoading(true);
      setPage(1);
      const response = await makeAuthenticatedRequest('/api/auth/recommended-lists?page=1&limit=20&force_refresh=true');
      setRecommendations(response.recommendations || response);
      setHasMore(response.has_more || false);
      setCacheInfo(response.cache_info || null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to refresh recommendations');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreBadge = (score: number) => {
    if (score >= 25) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Perfect Match
        </span>
      );
    } else if (score >= 20) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          Great Match
        </span>
      );
    } else if (score >= 15) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
          Good Match
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        Worth Checking
      </span>
    );
  };

  const renderRecommendation = (recommendation: RecommendedList) => {
    return (
      <div 
        key={recommendation.id} 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500 ${
          onListClick ? 'cursor-pointer' : ''
        }`}
        onClick={() => onListClick?.(recommendation)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {recommendation.title}
            </h3>
            {recommendation.user_profiles && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  {recommendation.user_profiles.avatar_url ? (
                    <img
                      src={sanitizeUrl(recommendation.user_profiles.avatar_url)}
                      alt={`${recommendation.user_profiles.display_name}'s avatar`}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {recommendation.user_profiles.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  by {recommendation.user_profiles.display_name}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {getScoreBadge(recommendation.recommendation_score)}
          </div>
        </div>

        {/* Recommendation Reason */}
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {recommendation.recommendation_reason}
            </span>
          </div>
        </div>

        {/* Description */}
        {recommendation.description && (
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-2">
            {recommendation.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span className="text-xs">
            Created {formatDate(recommendation.created_at)}
          </span>
          <span className="text-xs font-medium">
            Score: {recommendation.recommendation_score}
          </span>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recommended for You
        </h2>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="mx-auto w-6 h-6 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="font-medium">Sign in to get personalized recommendations</p>
          <p className="text-sm">We'll suggest lists based on your interests and activity!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Recommended for You
        </h2>
        
        <div className="flex items-center gap-3">
          {cacheInfo && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {cacheInfo.status === 'calculating' ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span>Calculating...</span>
                </div>
              ) : (
                <span>
                  Updated {new Date(cacheInfo.generated_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
          
          <button
            onClick={refreshRecommendations}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Status Message */}
      {cacheInfo?.status === 'calculating' && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <div>
              <p className="text-blue-700 dark:text-blue-300 font-medium">
                Generating Your Recommendations
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                {cacheInfo.message || 'We\'re analyzing your preferences to find perfect list matches.'}
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

      {/* Recommendations List */}
      {loading && page === 1 ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg p-6 border-l-4 border-gray-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
              </div>
              <div className="h-12 bg-gray-200 dark:bg-gray-600 rounded mb-3"></div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-4">
            {recommendations.map(renderRecommendation)}
          </div>
          
          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-6">
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load More Recommendations'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="mx-auto w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-lg font-medium mb-2">No recommendations yet</p>
          <p className="text-sm">Try adding more items to your lists to get personalized recommendations!</p>
        </div>
      )}
    </div>
  );
};