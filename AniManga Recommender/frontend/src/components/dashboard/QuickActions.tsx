import React, { useState } from "react";
import { Link } from "react-router-dom";
import { logger } from "../../utils/logger";

interface QuickActionsProps {
  onRefresh: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error: any) {
      // Handle errors gracefully - just log them but don't crash
      logger.error("Refresh failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "QuickActions",
        operation: "handleRefresh"
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000); // Visual feedback
    }
  };

  return (
    <div className="quick-actions-section">
      <h3>Quick Actions</h3>

      <div className="actions-grid">
        {/* Refresh Dashboard */}
        <button onClick={handleRefresh} disabled={isRefreshing} className="action-button refresh">
          <span className="action-icon">{isRefreshing ? "⟳" : "🔄"}</span>
          <span className="action-text">{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
        </button>

        {/* Browse Anime */}
        <Link to="/?media_type=anime" className="action-button browse-anime">
          <span className="action-icon">📺</span>
          <span className="action-text">Browse Anime</span>
        </Link>

        {/* Browse Manga */}
        <Link to="/?media_type=manga" className="action-button browse-manga">
          <span className="action-icon">📚</span>
          <span className="action-text">Browse Manga</span>
        </Link>

        {/* Random Pick */}
        <Link to="/?sort_by=random" className="action-button random">
          <span className="action-icon">🎲</span>
          <span className="action-text">Random Pick</span>
        </Link>

        {/* Top Rated */}
        <Link to="/?sort_by=score_desc&min_score=8" className="action-button top-rated">
          <span className="action-icon">⭐</span>
          <span className="action-text">Top Rated</span>
        </Link>

        {/* Currently Airing */}
        <Link to="/?media_type=anime&status=currently_airing" className="action-button airing">
          <span className="action-icon">📡</span>
          <span className="action-text">Currently Airing</span>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <h4>Quick Tips</h4>
        <ul>
          <li>💡 Use filters to find exactly what you're looking for</li>
          <li>🔖 Add items to your list to track your progress</li>
          <li>⭐ Rate items to get better related suggestions</li>
          <li>🎯 Set goals to maintain your viewing streak</li>
        </ul>
      </div>
    </div>
  );
};

export default QuickActions;
