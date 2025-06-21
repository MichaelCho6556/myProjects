// ABOUTME: Activity feed component for displaying user and community activities on the dashboard
// ABOUTME: Features dynamic rendering of different activity types with expandable details and timestamps

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingBanner from '../Loading/LoadingBanner';
import ErrorFallback from '../Error/ErrorFallback';

// Activity Types
interface BaseActivity {
  id: string;
  type: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  timestamp: string;
  data: any;
}

interface UserCompletedItemActivity extends BaseActivity {
  type: 'user_completed_item';
  data: {
    itemUid: string;
    itemTitle: string;
    itemImageUrl?: string;
    mediaType: 'anime' | 'manga';
    rating?: number;
    episodesWatched?: number;
    chaptersRead?: number;
  };
}

interface UserCreatedListActivity extends BaseActivity {
  type: 'user_created_list';
  data: {
    listId: string;
    listTitle: string;
    listDescription?: string;
    itemCount: number;
    privacy: string;
    tags: string[];
  };
}

interface UserFollowedUserActivity extends BaseActivity {
  type: 'user_followed_user';
  data: {
    followedUserId: string;
    followedUsername: string;
    followedDisplayName?: string;
  };
}

interface UserStartedItemActivity extends BaseActivity {
  type: 'user_started_item';
  data: {
    itemUid: string;
    itemTitle: string;
    itemImageUrl?: string;
    mediaType: 'anime' | 'manga';
  };
}

interface UserAddedToListActivity extends BaseActivity {
  type: 'user_added_to_list';
  data: {
    listId: string;
    listTitle: string;
    itemUid: string;
    itemTitle: string;
    itemImageUrl?: string;
    mediaType: 'anime' | 'manga';
  };
}

type Activity = 
  | UserCompletedItemActivity 
  | UserCreatedListActivity 
  | UserFollowedUserActivity 
  | UserStartedItemActivity
  | UserAddedToListActivity;

interface ActivityFeedComponentProps {
  limit?: number;
  showHeader?: boolean;
}

export const ActivityFeedComponent: React.FC<ActivityFeedComponentProps> = ({ 
  limit = 10,
  showHeader = true 
}) => {
  const { user } = useAuth();
  const { get } = useAuthenticatedApi();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchActivityFeed();
    }
  }, [user, limit]);

  const fetchActivityFeed = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await get(`/api/auth/activity-feed?limit=${limit}`);
      setActivities(response.data.activities || []);
    } catch (err: any) {
      console.error('Failed to fetch activity feed:', err);
      setError(err.response?.data?.message || 'Failed to load activity feed.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderActivity = (activity: Activity) => {
    switch (activity.type) {
      case 'user_completed_item':
        return <UserCompletedItemActivityComponent activity={activity} />;
      case 'user_created_list':
        return <UserCreatedListActivityComponent activity={activity} />;
      case 'user_followed_user':
        return <UserFollowedUserActivityComponent activity={activity} />;
      case 'user_started_item':
        return <UserStartedItemActivityComponent activity={activity} />;
      case 'user_added_to_list':
        return <UserAddedToListActivityComponent activity={activity} />;
      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <LoadingBanner message="Loading activity feed..." isVisible={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <ErrorFallback error={new Error(error)} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {showHeader && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Activity Feed
            </h2>
            <Link 
              to="/activity" 
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              View All
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Recent activity from users you follow
          </p>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {activities.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Recent Activity
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Follow some users to see their activity here!
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* User Avatar */}
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {activity.avatarUrl ? (
                    <img
                      src={activity.avatarUrl}
                      alt={activity.displayName || activity.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {(activity.displayName || activity.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      to={`/users/${activity.username}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {activity.displayName || activity.username}
                    </Link>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  
                  {renderActivity(activity)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Individual Activity Components
const UserCompletedItemActivityComponent: React.FC<{ activity: UserCompletedItemActivity }> = ({ activity }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        completed{' '}
        <Link
          to={`/item/${activity.data.itemUid}`}
          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          {activity.data.itemTitle}
        </Link>
        {activity.data.rating && (
          <span className="ml-2 text-yellow-600 dark:text-yellow-400">
            ★ {activity.data.rating}/10
          </span>
        )}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {activity.data.mediaType === 'anime' 
          ? `${activity.data.episodesWatched || 0} episodes` 
          : `${activity.data.chaptersRead || 0} chapters`}
      </p>
    </div>
    {activity.data.itemImageUrl && (
      <img
        src={activity.data.itemImageUrl}
        alt={activity.data.itemTitle}
        className="w-12 h-16 object-cover rounded"
      />
    )}
  </div>
);

const UserCreatedListActivityComponent: React.FC<{ activity: UserCreatedListActivity }> = ({ activity }) => (
  <div>
    <p className="text-sm text-gray-700 dark:text-gray-300">
      created a new list{' '}
      <Link
        to={`/lists/${activity.data.listId}`}
        className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
      >
        {activity.data.listTitle}
      </Link>
    </p>
    {activity.data.listDescription && (
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
        {activity.data.listDescription}
      </p>
    )}
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {activity.data.itemCount} items
      </span>
      {activity.data.tags.length > 0 && (
        <div className="flex gap-1">
          {activity.data.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

const UserFollowedUserActivityComponent: React.FC<{ activity: UserFollowedUserActivity }> = ({ activity }) => (
  <p className="text-sm text-gray-700 dark:text-gray-300">
    started following{' '}
    <Link
      to={`/users/${activity.data.followedUsername}`}
      className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
    >
      {activity.data.followedDisplayName || activity.data.followedUsername}
    </Link>
  </p>
);

const UserStartedItemActivityComponent: React.FC<{ activity: UserStartedItemActivity }> = ({ activity }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        started watching{' '}
        <Link
          to={`/item/${activity.data.itemUid}`}
          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          {activity.data.itemTitle}
        </Link>
      </p>
    </div>
    {activity.data.itemImageUrl && (
      <img
        src={activity.data.itemImageUrl}
        alt={activity.data.itemTitle}
        className="w-12 h-16 object-cover rounded"
      />
    )}
  </div>
);

const UserAddedToListActivityComponent: React.FC<{ activity: UserAddedToListActivity }> = ({ activity }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        added{' '}
        <Link
          to={`/item/${activity.data.itemUid}`}
          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          {activity.data.itemTitle}
        </Link>
        {' '}to{' '}
        <Link
          to={`/lists/${activity.data.listId}`}
          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          {activity.data.listTitle}
        </Link>
      </p>
    </div>
    {activity.data.itemImageUrl && (
      <img
        src={activity.data.itemImageUrl}
        alt={activity.data.itemTitle}
        className="w-12 h-16 object-cover rounded"
      />
    )}
  </div>
);