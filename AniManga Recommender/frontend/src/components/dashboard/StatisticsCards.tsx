import React from "react";
import { UserStatistics, QuickStats } from "../../types";

interface StatisticsCardsProps {
  userStats: UserStatistics | undefined;
  quickStats: QuickStats | undefined;
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ userStats, quickStats }) => {
  // Return loading state if data is not available
  if (!userStats || !quickStats) {
    return (
      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-icon">📺</div>
          <div className="stat-content">
            <h3>Anime Watched</h3>
            <div className="stat-number">-</div>
            <div className="stat-subtitle">Loading...</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>Manga Read</h3>
            <div className="stat-number">-</div>
            <div className="stat-subtitle">Loading...</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">▶️</div>
          <div className="stat-content">
            <h3>Currently Watching</h3>
            <div className="stat-number">-</div>
            <div className="stat-subtitle">Loading...</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Completion Rate</h3>
            <div className="stat-number">-</div>
            <div className="stat-subtitle">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to safely format hours
  const formatHours = (hours: number | undefined | null): string => {
    if (hours === undefined || hours === null || isNaN(hours)) {
      return "0.0";
    }
    return hours.toFixed(1);
  };

  // Helper function to safely format numbers
  const formatNumber = (value: number | undefined | null): number => {
    if (value === undefined || value === null || isNaN(value)) {
      return 0;
    }
    return value;
  };

  return (
    <div className="statistics-grid">
      <div className="stat-card anime">
        <div className="stat-icon">📺</div>
        <div className="stat-content">
          <h3>Anime Watched</h3>
          <div className="stat-number">{formatNumber(userStats.total_anime_watched)}</div>
          <div className="stat-subtitle">{formatHours(userStats.total_hours_watched)} hours</div>
        </div>
      </div>

      <div className="stat-card manga">
        <div className="stat-icon">📚</div>
        <div className="stat-content">
          <h3>Manga Read</h3>
          <div className="stat-number">{formatNumber(userStats.total_manga_read)}</div>
          <div className="stat-subtitle">{formatNumber(userStats.total_chapters_read)} chapters</div>
        </div>
      </div>

      <div className="stat-card watching">
        <div className="stat-icon">▶️</div>
        <div className="stat-content">
          <h3>Currently Watching</h3>
          <div className="stat-number">{formatNumber(quickStats.watching)}</div>
          <div className="stat-subtitle">In progress</div>
        </div>
      </div>

      <div className="stat-card completion">
        <div className="stat-icon">✅</div>
        <div className="stat-content">
          <h3>Completion Rate</h3>
          <div className="stat-number">{formatNumber(userStats.completion_rate)}%</div>
          <div className="stat-subtitle">Of started items</div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCards;
