// ABOUTME: User statistics display component showing anime/manga completion stats and favorite genres
// ABOUTME: Provides visual representation of user activity and preferences with responsive design

import React from 'react';
import { UserStats } from '../../types/social';

interface UserStatsComponentProps {
  stats: UserStats;
}

export const UserStatsComponent: React.FC<UserStatsComponentProps> = ({
  stats
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
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
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

        {/* Completion Rate */}
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {(stats.completionRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Completion Rate
          </div>
        </div>

        {/* Current Streak */}
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.currentStreak}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Current Streak
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            days
          </div>
        </div>
      </div>


    </div>
  );
};