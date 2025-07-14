// ABOUTME: User statistics display component showing anime/manga completion stats and favorite genres
// ABOUTME: Provides visual representation of user activity and preferences with responsive design

import React from 'react';
import { UserStats } from '../../types/social';
import './UserStatsComponent.css';

interface UserStatsComponentProps {
  stats: UserStats;
  isLoading?: boolean;
  showAnimations?: boolean;
}

interface StatCardProps {
  value: number | string;
  label: string;
  sublabel?: string;
  progress?: {
    current: number;
    total: number;
  };
  isAnimated?: boolean;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  sublabel,
  progress,
  isAnimated = false,
  color = '#007bff'
}) => {
  const [displayValue, setDisplayValue] = React.useState<number | string>(isAnimated ? 0 : value);
  
  React.useEffect(() => {
    if (!isAnimated || typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }
    
    // Animate number counting
    const duration = 1000;
    const startTime = Date.now();
    const startValue = 0;
    const endValue = value as number;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, isAnimated]);
  
  const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0;
  
  return (
    <div className="stat-card">
      <div className="stat-content">
        <div className="stat-value" style={{ color }}>
          {displayValue}
        </div>
        <div className="stat-label">
          {label}
        </div>
        {sublabel && (
          <div className="stat-sublabel">
            {sublabel}
          </div>
        )}
        {progress && (
          <div className="stat-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${progressPercentage}%`,
                  backgroundColor: color,
                  transition: isAnimated ? 'width 1s ease-out' : 'none'
                }}
              />
            </div>
            <div className="progress-text">
              {progress.current} / {progress.total}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const UserStatsComponent: React.FC<UserStatsComponentProps> = ({
  stats,
  isLoading = false,
  showAnimations = true
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

  if (isLoading) {
    return (
      <div className="user-stats-container">
        <div className="stats-grid loading">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="stat-card skeleton">
              <div className="skeleton-stat-value"></div>
              <div className="skeleton-stat-label"></div>
              <div className="skeleton-stat-sublabel"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate completion percentages
  const animeCompletionRate = stats.totalAnime > 0 
    ? (stats.completedAnime / stats.totalAnime) * 100 
    : 0;
  const mangaCompletionRate = stats.totalManga > 0 
    ? (stats.completedManga / stats.totalManga) * 100 
    : 0;

  // Determine color based on value ranges
  const getRatingColor = (rating: number) => {
    if (rating >= 9) return '#4caf50';
    if (rating >= 8) return '#8bc34a';
    if (rating >= 7) return '#ffc107';
    if (rating >= 6) return '#ff9800';
    return '#f44336';
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return '#4caf50';
    if (rate >= 60) return '#8bc34a';
    if (rate >= 40) return '#ffc107';
    if (rate >= 20) return '#ff9800';
    return '#f44336';
  };

  const getStreakColor = (days: number) => {
    if (days >= 30) return '#9c27b0';
    if (days >= 14) return '#673ab7';
    if (days >= 7) return '#3f51b5';
    if (days >= 3) return '#2196f3';
    return '#607d8b';
  };

  return (
    <div className="user-stats-container">
      <div className="stats-grid">
        {/* Anime Stats with Progress */}
        <StatCard
          value={formatNumber(stats.completedAnime)}
          label="Anime Completed"
          sublabel={`${animeCompletionRate.toFixed(0)}% completion`}
          progress={{
            current: stats.completedAnime,
            total: stats.totalAnime
          }}
          isAnimated={showAnimations}
          color="#2196f3"
        />

        {/* Manga Stats with Progress */}
        <StatCard
          value={formatNumber(stats.completedManga)}
          label="Manga Completed"
          sublabel={`${mangaCompletionRate.toFixed(0)}% completion`}
          progress={{
            current: stats.completedManga,
            total: stats.totalManga
          }}
          isAnimated={showAnimations}
          color="#ff5722"
        />

        {/* Time Stats */}
        <StatCard
          value={formatHours(stats.totalHoursWatched)}
          label="Time Watched"
          sublabel={stats.totalHoursWatched >= 24 * 7 ? "That's dedication!" : "Keep watching!"}
          isAnimated={showAnimations}
          color="#9c27b0"
        />

        {/* Average Rating with Color */}
        <StatCard
          value={stats.averageRating.toFixed(1)}
          label="Avg. Rating"
          sublabel="out of 10"
          isAnimated={showAnimations}
          color={getRatingColor(stats.averageRating)}
        />

        {/* Completion Rate with Color */}
        <StatCard
          value={`${stats.completionRate.toFixed(0)}%`}
          label="Completion Rate"
          sublabel={stats.completionRate >= 80 ? "Excellent!" : "Keep it up!"}
          isAnimated={showAnimations}
          color={getCompletionColor(stats.completionRate)}
        />

        {/* Current Streak with Color */}
        <StatCard
          value={stats.currentStreak}
          label="Current Streak"
          sublabel={stats.currentStreak === 1 ? "day" : "days"}
          isAnimated={showAnimations}
          color={getStreakColor(stats.currentStreak)}
        />
      </div>

      {/* Rating Distribution Chart */}
      {stats.ratingDistribution && (
        <div className="rating-distribution">
          <h3 className="distribution-title">Rating Distribution</h3>
          <div className="distribution-chart">
            {Object.entries(stats.ratingDistribution)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([rating, count]) => {
                const maxCount = Math.max(...Object.values(stats.ratingDistribution || {}));
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={rating} className="distribution-bar">
                    <div className="bar-label">{rating}</div>
                    <div className="bar-container">
                      <div 
                        className="bar-fill"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: getRatingColor(Number(rating))
                        }}
                      />
                    </div>
                    <div className="bar-count">{count}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};