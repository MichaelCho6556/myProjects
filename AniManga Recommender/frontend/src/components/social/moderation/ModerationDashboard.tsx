// ABOUTME: Main moderation dashboard component with two-panel layout
// ABOUTME: Manages report queue display and detailed report view with action buttons

import React, { useState, useCallback } from "react";
import { useModerationReports } from "../../../hooks/useModeration";
import { useModerationStats } from "../../../hooks/useModerationStats";
import { ModerationReport, UpdateReportRequest, ModerationFilters } from "../../../types/moderation";
import { ReportQueue } from "./ReportQueue";
import { ReportDetail } from "./ReportDetail";
import { ModerationAnalytics } from "./ModerationAnalytics";
import Spinner from "../../Spinner";
import "./ModerationDashboard.css";

export const ModerationDashboard: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [activeView, setActiveView] = useState<'reports' | 'analytics'>('reports');
  const [filters, setFilters] = useState<ModerationFilters>({
    status: "pending",
    sort: "newest",
  });

  const { reports, loading, error, pagination, fetchReports, updateReport, refreshReports, loadMoreReports } =
    useModerationReports(filters);

  const { 
    stats, 
    loading: statsLoading, 
    error: statsError, 
    updateTimeframe, 
    updateGranularity 
  } = useModerationStats();

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: ModerationFilters) => {
      setFilters(newFilters);
      setSelectedReport(null); // Clear selection when filters change
      fetchReports({ ...newFilters, page: 1 });
    },
    [fetchReports]
  );

  // Handle report selection
  const handleSelectReport = useCallback((report: ModerationReport) => {
    setSelectedReport(report);
  }, []);

  // Handle report resolution
  const handleResolveReport = useCallback(
    async (reportId: number, action: UpdateReportRequest) => {
      const success = await updateReport(reportId, action);
      if (success) {
        // If the resolved report is currently selected and it's no longer pending, clear selection
        if (selectedReport?.id === reportId && action.status !== "pending") {
          setSelectedReport(null);
        }
        // Refresh the list to get updated data
        refreshReports();
      }
    },
    [updateReport, selectedReport, refreshReports]
  );

  // Handle report dismissal
  const handleDismissReport = useCallback(
    async (reportId: number, notes?: string) => {
      const dismissAction: UpdateReportRequest = {
        status: "dismissed",
        resolution_action: "no_action",
        resolution_notes: notes || "Report dismissed",
      };

      await handleResolveReport(reportId, dismissAction);
    },
    [handleResolveReport]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refreshReports();
  }, [refreshReports]);

  if (error) {
    return (
      <div className="moderation-dashboard-error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h3>Error Loading Reports</h3>
          <p>{error}</p>
          <button onClick={handleRefresh} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="moderation-dashboard">
      <div className="dashboard-header">
        <div className="view-tabs">
          <button
            className={`view-tab ${activeView === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveView('reports')}
          >
            📋 Reports
          </button>
          <button
            className={`view-tab ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            📊 Analytics
          </button>
        </div>

        {activeView === 'reports' && (
          <div className="header-controls">
          <div className="filter-section">
            <div className="filter-group">
              <label htmlFor="status-filter">Status:</label>
              <select
                id="status-filter"
                value={filters.status || "pending"}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    status: (e.target.value as "pending" | "resolved" | "dismissed" | "all") || "pending",
                  })
                }
                className="filter-select"
              >
                <option value="all">All Reports</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="type-filter">Type:</label>
              <select
                id="type-filter"
                value={filters.type || ""}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    type: (e.target.value as "comment" | "review") || undefined,
                  })
                }
                className="filter-select"
              >
                <option value="">All Types</option>
                <option value="comment">Comments</option>
                <option value="review">Reviews</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="priority-filter">Priority:</label>
              <select
                id="priority-filter"
                value={filters.priority || ""}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    priority: (e.target.value as "low" | "medium" | "high") || undefined,
                  })
                }
                className="filter-select"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="sort-filter">Sort:</label>
              <select
                id="sort-filter"
                value={filters.sort || "newest"}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    sort: (e.target.value as "newest" | "oldest" | "priority") || "newest",
                  })
                }
                className="filter-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          <div className="action-controls">
            <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
              {loading ? <Spinner size="small" /> : "🔄"} Refresh
            </button>
          </div>
          </div>
        )}

        {pagination && (
          <div className="dashboard-stats">
            <span className="stats-text">
              Showing {reports.length} of {pagination.total_count} reports
            </span>
          </div>
        )}
      </div>

      <div className="dashboard-content">
        {activeView === 'reports' ? (
          <div className="dashboard-panels">
            {/* Left Panel - Report Queue */}
            <div className="queue-panel">
              <div className="panel-header">
                <h3>Report Queue</h3>
                {pagination && pagination.total_count > 0 && (
                  <span className="queue-count">{pagination.total_count} reports</span>
                )}
              </div>

              <ReportQueue
                reports={reports}
                selectedReport={selectedReport}
                onSelectReport={handleSelectReport}
                loading={loading}
                onLoadMore={loadMoreReports}
                hasMore={pagination?.has_next || false}
              />
            </div>

            {/* Right Panel - Report Detail */}
            <div className="detail-panel">
              <div className="panel-header">
                <h3>Report Details</h3>
              </div>

              <ReportDetail
                report={selectedReport}
                onResolveReport={handleResolveReport}
                onDismissReport={handleDismissReport}
                loading={loading}
              />
            </div>
          </div>
        ) : (
          /* Analytics View */
          <div className="analytics-view">
            {statsLoading ? (
              <div className="analytics-loading">
                <Spinner />
                <p>Loading analytics...</p>
              </div>
            ) : statsError ? (
              <div className="analytics-error">
                <div className="error-content">
                  <span className="error-icon">⚠️</span>
                  <h3>Error Loading Analytics</h3>
                  <p>{statsError}</p>
                </div>
              </div>
            ) : stats ? (
              <ModerationAnalytics
                stats={stats}
                onTimeframeChange={updateTimeframe}
                onGranularityChange={updateGranularity}
              />
            ) : (
              <div className="analytics-empty">
                <p>No analytics data available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
