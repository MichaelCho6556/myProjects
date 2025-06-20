import React, { memo, useMemo } from "react";
import { UserStatistics, QuickStats } from "../../types";

interface StatisticsCardsProps {
  userStats: UserStatistics | undefined;
  quickStats: QuickStats | undefined;
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ userStats, quickStats }) => {
  // Memoized helper functions to prevent recreation on every render
  const formatHours = useMemo(() => (hours: number | undefined | null): string => {
    if (hours === undefined || hours === null || isNaN(hours)) {
      return "0.0";
    }
    return hours.toFixed(1);
  }, []);

  const formatNumber = useMemo(() => (value: number | undefined | null): number => {
    if (value === undefined || value === null || isNaN(value)) {
      return 0;
    }
    return value;
  }, []);

  // Memoized computed values to prevent recalculation
  const computedStats = useMemo(() => {
    if (!userStats || !quickStats) return null;
    
    return {
      animeWatched: formatNumber(userStats.total_anime_watched),
      hoursWatched: formatHours(userStats.total_hours_watched),
      mangaRead: formatNumber(userStats.total_manga_read),
      chaptersRead: formatNumber(userStats.total_chapters_read),
      currentlyWatching: formatNumber(quickStats.watching),
      completionRate: formatNumber(userStats.completion_rate),
    };
  }, [userStats, quickStats, formatNumber, formatHours]);

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

  // Fallback if computedStats is null (shouldn't happen given the check above)
  if (!computedStats) {
    return null;
  }

  return (
    <div className="statistics-grid">
      <div className="stat-card anime">
        <div className="stat-icon">📺</div>
        <div className="stat-content">
          <h3>Anime Watched</h3>
          <div className="stat-number">{computedStats.animeWatched}</div>
          <div className="stat-subtitle">{computedStats.hoursWatched} hours</div>
        </div>
      </div>

      <div className="stat-card manga">
        <div className="stat-icon">📚</div>
        <div className="stat-content">
          <h3>Manga Read</h3>
          <div className="stat-number">{computedStats.mangaRead}</div>
          <div className="stat-subtitle">{computedStats.chaptersRead} chapters</div>
        </div>
      </div>

      <div className="stat-card watching">
        <div className="stat-icon">▶️</div>
        <div className="stat-content">
          <h3>Currently Watching</h3>
          <div className="stat-number">{computedStats.currentlyWatching}</div>
          <div className="stat-subtitle">In progress</div>
        </div>
      </div>

      <div className="stat-card completion">
        <div className="stat-icon">✅</div>
        <div className="stat-content">
          <h3>Completion Rate</h3>
          <div className="stat-number">{computedStats.completionRate}%</div>
          <div className="stat-subtitle">Of started items</div>
        </div>
      </div>
    </div>
  );
};

export default memo(StatisticsCards);
