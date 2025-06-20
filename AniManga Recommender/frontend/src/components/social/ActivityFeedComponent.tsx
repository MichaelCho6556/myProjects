// ABOUTME: Activity feed component for displaying user activities and social interactions
// ABOUTME: Shows timeline of activities from followed users with real-time updates

import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../context/AuthContext';

interface ActivityItem {
  id: number;
  user_id: string;
  activity_type: string;
  item_uid?: string;
  activity_data: any;
  created_at: string;
  user_profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  item?: {
    uid: string;
    title: string;
    image_url?: string;
    media_type: string;
  };
}

interface ActivityFeedComponentProps {
  className?: string;
}

export const ActivityFeedComponent: React.FC<ActivityFeedComponentProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { makeAuthenticatedRequest } = useAuthenticatedApi();
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user, page]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest(`/api/auth/activity-feed?page=${page}&limit=20`);
      
      if (page === 1) {
        setActivities(response.activities || response);
      } else {
        setActivities(prev => [...prev, ...(response.activities || response)]);
      }
      
      setHasMore(response.has_more || false);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'completed':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'watching':
      case 'reading':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-10 5a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12z" />
            </svg>
          </div>
        );
      case 'plan_to_watch':
      case 'plan_to_read':
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'rated':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        );
      case 'created_list':
        return (
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
        );
      case 'followed_user':
        return (
          <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getActivityMessage = (activity: ActivityItem) => {
    const user = activity.user_profiles.display_name;
    const activityData = activity.activity_data || {};
    
    switch (activity.activity_type) {
      case 'completed':
        return (
          <span>
            <span className="font-medium">{user}</span> completed{' '}
            <span className="font-medium">{activity.item?.title}</span>
            {activityData.rating && (
              <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                ★ {activityData.rating}/10
              </span>
            )}
          </span>
        );
      case 'watching':
        return (
          <span>
            <span className="font-medium">{user}</span> started watching{' '}
            <span className="font-medium">{activity.item?.title}</span>
          </span>
        );
      case 'reading':
        return (
          <span>
            <span className="font-medium">{user}</span> started reading{' '}
            <span className="font-medium">{activity.item?.title}</span>
          </span>
        );
      case 'plan_to_watch':
        return (
          <span>
            <span className="font-medium">{user}</span> added{' '}
            <span className="font-medium">{activity.item?.title}</span> to their plan to watch
          </span>
        );
      case 'plan_to_read':
        return (
          <span>
            <span className="font-medium">{user}</span> added{' '}
            <span className="font-medium">{activity.item?.title}</span> to their plan to read
          </span>
        );
      case 'rated':
        return (
          <span>
            <span className="font-medium">{user}</span> rated{' '}
            <span className="font-medium">{activity.item?.title}</span>
            <span className="text-yellow-600 dark:text-yellow-400 ml-2">
              ★ {activityData.rating}/10
            </span>
          </span>
        );
      case 'created_list':
        return (
          <span>
            <span className="font-medium">{user}</span> created a new list{' '}
            <span className="font-medium">"{activityData.list_title}"</span>
          </span>
        );
      case 'followed_user':
        return (
          <span>
            <span className="font-medium">{user}</span> followed{' '}
            <span className="font-medium">{activityData.followed_username}</span>
          </span>
        );
      default:
        return (
          <span>
            <span className="font-medium">{user}</span> performed an activity
          </span>
        );
    }
  };

  const renderActivity = (activity: ActivityItem) => {
    return (
      <div key={activity.id} className="flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {activity.user_profiles.avatar_url ? (
            <img
              src={activity.user_profiles.avatar_url}
              alt={`${activity.user_profiles.display_name}'s avatar`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {activity.user_profiles.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Activity Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {/* Activity Icon */}
            <div className="flex-shrink-0 mt-1">
              {getActivityIcon(activity.activity_type)}
            </div>

            {/* Activity Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                {getActivityMessage(activity)}
              </p>
              
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {formatDate(activity.created_at)}
              </p>
            </div>

            {/* Item Image */}
            {activity.item?.image_url && (
              <div className="flex-shrink-0">
                <img
                  src={activity.item.image_url}
                  alt={activity.item.title}
                  className="w-12 h-16 object-cover rounded"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Activity Feed
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="mx-auto w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="font-medium">Sign in to see activity feed</p>
          <p className="text-sm">Follow other users to see their activities here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Activity Feed
      </h2>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Activities List */}
      {loading && page === 1 ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-4 p-4">
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                  </div>
                  <div className="w-12 h-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-700">
          {activities.map(renderActivity)}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="pt-4 text-center">
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More Activities'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="mx-auto w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium mb-2">No activities yet</p>
          <p className="text-sm">Follow other users to see their activities here!</p>
        </div>
      )}
    </div>
  );
};