import React from "react";
import { UserStatistics, QuickStats } from "../../types";

interface StatisticsCardsProps {
  userStats: UserStatistics;
  quickStats: QuickStats;
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ userStats, quickStats }) => {
  return (
    <div className="statistics-grid">
      <div className="stat-card anime">
        <div className="stat-icon">📺</div>
        <div className="stat-content">
          <h3>Anime Watched</h3>
          <div className="stat-number">{userStats.total_anime_watched}</div>
          <div className="stat-subtitle">{userStats.total_hours_watched.toFixed(1)} hours</div>
        </div>
      </div>

      <div className="stat-card manga">
        <div className="stat-icon">📚</div>
        <div className="stat-content">
          <h3>Manga Read</h3>
          <div className="stat-number">{userStats.total_manga_read}</div>
          <div className="stat-subtitle">{userStats.total_chapters_read} chapters</div>
        </div>
      </div>

      <div className="stat-card watching">
        <div className="stat-icon">▶️</div>
        <div className="stat-content">
          <h3>Currently Watching</h3>
          <div className="stat-number">{quickStats.watching}</div>
          <div className="stat-subtitle">In progress</div>
        </div>
      </div>

      <div className="stat-card completion">
        <div className="stat-icon">✅</div>
        <div className="stat-content">
          <h3>Completion Rate</h3>
          <div className="stat-number">{userStats.completion_rate}%</div>
          <div className="stat-subtitle">Of started items</div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCards;
