// ABOUTME: User statistics display component showing anime/manga completion stats and favorite genres
// ABOUTME: Provides visual representation of user activity and preferences with responsive design

import React from 'react';
import { UserStats } from '../../types/social';

interface UserStatsComponentProps {
  stats: UserStats;
  showPrivateStats?: boolean;
}

export const UserStatsComponent: React.FC<UserStatsComponentProps> = ({
  stats,
  showPrivateStats = true
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const formatHours = (hours: number): string => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${hours}h`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Statistics
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {/* Anime Stats */}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatNumber(stats.completedAnime)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Anime Completed
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            of {formatNumber(stats.totalAnime)} total
          </div>
        </div>

        {/* Manga Stats */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatNumber(stats.completedManga)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Manga Completed
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            of {formatNumber(stats.totalManga)} total
          </div>
        </div>

        {/* Time Stats */}
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatHours(stats.totalHoursWatched)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Time Watched
          </div>
        </div>

        {/* Average Rating */}
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Avg. Rating
          </div>
        </div>
      </div>

      {showPrivateStats && (
        <>
          {/* Completion Rate */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Completion Rate
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {(stats.completionRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.completionRate * 100}%` }}
              />
            </div>
          </div>

          {/* Streaks */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {stats.currentStreak}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Current Streak (days)
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                {stats.longestStreak}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Longest Streak (days)
              </div>
            </div>
          </div>
        </>
      )}

      {/* Favorite Genres */}
      {stats.favoriteGenres.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Favorite Genres
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.favoriteGenres.slice(0, 5).map((genre, index) => (
              <span
                key={genre}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium
                  ${index === 0 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                    : index === 1
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }
                `}
              >
                #{index + 1} {genre}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};