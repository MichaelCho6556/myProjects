// ABOUTME: User statistics display component showing anime/manga completion stats and favorite genres
// ABOUTME: Provides visual representation of user activity and preferences with responsive design

import React from 'react';
import { UserStats } from '../../types/social';
import './UserStatsComponent.css';

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
    return `${Math.round(hours)}h`;
  };

  // Removed emoji icons - no icons will be displayed

  return (
    <div className="user-stats-container">
      <h2 className="stats-title">Statistics</h2>
      
      <div className="stats-grid">
        {/* Anime Stats */}
        <div className="stat-card">
          {/* Icon removed */}
          <div className="stat-content">
            <div className="stat-value">
              {formatNumber(stats.completedAnime)}
            </div>
            <div className="stat-label">
              Anime Completed
            </div>
            <div className="stat-sublabel">
              of {formatNumber(stats.totalAnime)} total
            </div>
          </div>
        </div>

        {/* Manga Stats */}
        <div className="stat-card">
          {/* Icon removed */}
          <div className="stat-content">
            <div className="stat-value">
              {formatNumber(stats.completedManga)}
            </div>
            <div className="stat-label">
              Manga Completed
            </div>
            <div className="stat-sublabel">
              of {formatNumber(stats.totalManga)} total
            </div>
          </div>
        </div>

        {/* Time Stats */}
        <div className="stat-card">
          {/* Icon removed */}
          <div className="stat-content">
            <div className="stat-value">
              {formatHours(stats.totalHoursWatched)}
            </div>
            <div className="stat-label">
              Time Watched
            </div>
          </div>
        </div>

        {/* Average Rating */}
        <div className="stat-card">
          {/* Icon removed */}
          <div className="stat-content">
            <div className="stat-value">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="stat-label">
              Avg. Rating
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="stat-card">
          {/* Icon removed */}
          <div className="stat-content">
            <div className="stat-value">
              {stats.completionRate.toFixed(0)}%
            </div>
            <div className="stat-label">
              Completion Rate
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="stat-card">
          {/* Icon removed */}
          <div className="stat-content">
            <div className="stat-value">
              {stats.currentStreak}
            </div>
            <div className="stat-label">
              Current Streak
            </div>
            <div className="stat-sublabel">
              days
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};