import React from "react";
import "./Loading.css";

/**
 * Dashboard Skeleton Component
 * Professional skeleton loader for dashboard content
 */
const DashboardSkeleton: React.FC = () => {
  return (
    <div className="dashboard-skeleton" aria-label="Loading dashboard content">
      {/* Header skeleton */}
      <div className="skeleton-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-subtitle"></div>
      </div>

      {/* Statistics cards skeleton */}
      <div className="skeleton-stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton-stat-icon"></div>
            <div className="skeleton-stat-content">
              <div className="skeleton-stat-number"></div>
              <div className="skeleton-stat-label"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="skeleton-dashboard-grid">
        <div className="skeleton-dashboard-main">
          {/* Item lists skeleton */}
          <div className="skeleton-item-lists">
            <div className="skeleton-section-title"></div>
            <div className="skeleton-tabs">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-tab"></div>
              ))}
            </div>
            <div className="skeleton-items-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-item-card">
                  <div className="skeleton-item-image"></div>
                  <div className="skeleton-item-info">
                    <div className="skeleton-item-title"></div>
                    <div className="skeleton-item-meta"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions skeleton */}
          <div className="skeleton-quick-actions">
            <div className="skeleton-section-title"></div>
            <div className="skeleton-actions-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-action-button">
                  <div className="skeleton-action-icon"></div>
                  <div className="skeleton-action-text"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed skeleton */}
        <div className="skeleton-activity-feed">
          <div className="skeleton-section-title"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-activity-item">
              <div className="skeleton-activity-content">
                <div className="skeleton-activity-title"></div>
                <div className="skeleton-activity-description"></div>
              </div>
              <div className="skeleton-activity-time"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
