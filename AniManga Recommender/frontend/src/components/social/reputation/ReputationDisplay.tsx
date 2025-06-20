// ABOUTME: React component for displaying user reputation scores and titles
// ABOUTME: Shows reputation breakdown, community standing, and achievement badges

import React, { useState } from "react";
import { ReputationDisplayProps } from "../../../types/reputation";
import { useReputation } from "../../../hooks/useReputation";
import "./ReputationDisplay.css";

export const ReputationDisplay: React.FC<ReputationDisplayProps> = ({
  userId,
  showBreakdown = false,
  className = "",
}) => {
  const { reputation, loading, error } = useReputation(userId);
  const [showDetails, setShowDetails] = useState(false);

  if (loading) {
    return (
      <div className={`reputation-display ${className}`}>
        <div className="reputation-loading">
          <div className="loading-spinner"></div>
          <span>Loading reputation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`reputation-display ${className}`}>
        <div className="reputation-error">
          <span className="error-icon">⚠️</span>
          <span>Unable to load reputation</span>
        </div>
      </div>
    );
  }

  if (!reputation) {
    return (
      <div className={`reputation-display ${className}`}>
        <div className="reputation-placeholder">
          <span className="placeholder-icon">👤</span>
          <span>No reputation data</span>
        </div>
      </div>
    );
  }

  const getReputationColor = (score: number): string => {
    if (score >= 1000) return "legendary";
    if (score >= 500) return "veteran";
    if (score >= 200) return "trusted";
    if (score >= 100) return "active";
    if (score >= 50) return "member";
    return "newcomer";
  };

  const getReputationIcon = (title: string): string => {
    switch (title) {
      case "Legendary Member":
        return "👑";
      case "Community Champion":
        return "🏆";
      case "Elite Contributor":
        return "⭐";
      case "Community Veteran":
        return "🎖️";
      case "Trusted Reviewer":
        return "🛡️";
      case "Active Contributor":
        return "📝";
      case "Community Member":
        return "👥";
      default:
        return "🌱";
    }
  };

  const calculateProgressToNext = (): { current: number; next: number; percentage: number } => {
    const thresholds = [
      { score: 0, title: "Newcomer" },
      { score: 50, title: "Community Member" },
      { score: 150, title: "Active Contributor" },
      { score: 300, title: "Trusted Reviewer" },
      { score: 600, title: "Community Veteran" },
      { score: 1000, title: "Elite Contributor" },
      { score: 2000, title: "Community Champion" },
      { score: 5000, title: "Legendary Member" },
    ];

    const currentScore = reputation.reputation_score;
    const currentIndex = thresholds.findIndex((t) => currentScore < t.score);

    if (currentIndex === -1) {
      // Already at max level
      return { current: currentScore, next: currentScore, percentage: 100 };
    }

    const prevThreshold = currentIndex === 0 ? 0 : thresholds[currentIndex - 1].score;
    const nextThreshold = thresholds[currentIndex].score;
    const progress = currentScore - prevThreshold;
    const total = nextThreshold - prevThreshold;
    const percentage = Math.min(100, (progress / total) * 100);

    return { current: currentScore, next: nextThreshold, percentage };
  };

  const progress = calculateProgressToNext();
  const reputationColor = getReputationColor(reputation.reputation_score);
  const reputationIcon = getReputationIcon(reputation.reputation_title);

  return (
    <div className={`reputation-display ${className}`}>
      <div className="reputation-header">
        <div className="reputation-badge">
          <span className="reputation-icon">{reputationIcon}</span>
          <div className="reputation-info">
            <div className={`reputation-score ${reputationColor}`}>{reputation.reputation_score}</div>
            <div className="reputation-title">{reputation.reputation_title}</div>
          </div>
        </div>

        {showBreakdown && (
          <button
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
            aria-label="Toggle reputation details"
          >
            <span className={`toggle-icon ${showDetails ? "expanded" : ""}`}>▼</span>
          </button>
        )}
      </div>

      {reputation.reputation_score < 5000 && (
        <div className="reputation-progress">
          <div className="progress-label">
            Progress to {progress.next === progress.current ? "Max Level" : `${progress.next} points`}
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${reputationColor}`}
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {progress.next === progress.current
              ? "Maximum level reached!"
              : `${progress.next - progress.current} points to next level`}
          </div>
        </div>
      )}

      {showBreakdown && showDetails && (
        <div className="reputation-breakdown">
          <h4>Reputation Breakdown</h4>

          <div className="breakdown-section">
            <h5>Contributions</h5>
            <div className="breakdown-items">
              <div className="breakdown-item">
                <span className="item-label">
                  <span className="item-icon">📖</span>
                  Reviews Written
                </span>
                <span className="item-value">
                  {reputation.total_reviews}
                  <span className="item-points">(+{reputation.review_reputation} pts)</span>
                </span>
              </div>
              <div className="breakdown-item">
                <span className="item-label">
                  <span className="item-icon">💬</span>
                  Comments Made
                </span>
                <span className="item-value">
                  {reputation.total_comments}
                  <span className="item-points">(+{reputation.comment_reputation} pts)</span>
                </span>
              </div>
              <div className="breakdown-item">
                <span className="item-label">
                  <span className="item-icon">👍</span>
                  Helpful Votes Received
                </span>
                <span className="item-value">{reputation.helpful_votes_received}</span>
              </div>
            </div>
          </div>

          <div className="breakdown-section">
            <h5>Community Activity</h5>
            <div className="breakdown-items">
              <div className="breakdown-item">
                <span className="item-label">
                  <span className="item-icon">📅</span>
                  Days Active
                </span>
                <span className="item-value">
                  {reputation.days_active}
                  <span className="item-points">(+{reputation.community_reputation} pts)</span>
                </span>
              </div>
              <div className="breakdown-item">
                <span className="item-label">
                  <span className="item-icon">🔥</span>
                  Activity Streak
                </span>
                <span className="item-value">{reputation.consecutive_days_active} days</span>
              </div>
            </div>
          </div>

          {reputation.moderation_penalty > 0 && (
            <div className="breakdown-section penalty-section">
              <h5>Moderation History</h5>
              <div className="breakdown-items">
                {reputation.warnings_received > 0 && (
                  <div className="breakdown-item penalty-item">
                    <span className="item-label">
                      <span className="item-icon">⚠️</span>
                      Warnings
                    </span>
                    <span className="item-value">{reputation.warnings_received}</span>
                  </div>
                )}
                {reputation.content_removed > 0 && (
                  <div className="breakdown-item penalty-item">
                    <span className="item-label">
                      <span className="item-icon">🗑️</span>
                      Content Removed
                    </span>
                    <span className="item-value">{reputation.content_removed}</span>
                  </div>
                )}
                {reputation.temp_bans > 0 && (
                  <div className="breakdown-item penalty-item">
                    <span className="item-label">
                      <span className="item-icon">🚫</span>
                      Temporary Bans
                    </span>
                    <span className="item-value">{reputation.temp_bans}</span>
                  </div>
                )}
                <div className="penalty-total">Total Penalty: -{reputation.moderation_penalty} points</div>
              </div>
            </div>
          )}

          {reputation.last_calculated && (
            <div className="breakdown-footer">
              <small className="last-updated">
                Last updated: {new Date(reputation.last_calculated).toLocaleDateString()}
              </small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
