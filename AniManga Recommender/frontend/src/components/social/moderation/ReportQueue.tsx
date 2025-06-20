// ABOUTME: Component displaying the list of moderation reports in a queue format
// ABOUTME: Handles report selection, pagination, and provides summary view of each report

import React from "react";
import { ReportQueueProps } from "../../../types/moderation";
import Spinner from "../../Spinner";
import "./ReportQueue.css";

export const ReportQueue: React.FC<ReportQueueProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  loading,
  onLoadMore,
  hasMore,
}) => {
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  const getPriorityIcon = (priority: string): string => {
    switch (priority) {
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case "comment":
        return "💬";
      case "review":
        return "📝";
      default:
        return "📄";
    }
  };

  const getReasonLabel = (reason: string): string => {
    switch (reason) {
      case "spam":
        return "Spam";
      case "harassment":
        return "Harassment";
      case "inappropriate":
        return "Inappropriate";
      case "offensive":
        return "Offensive";
      case "other":
        return "Other";
      default:
        return reason;
    }
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  if (loading && reports.length === 0) {
    return (
      <div className="report-queue">
        <div className="queue-loading">
          <Spinner />
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="report-queue">
        <div className="queue-empty">
          <div className="empty-icon">📋</div>
          <h4>No Reports Found</h4>
          <p>There are no reports matching your current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-queue">
      <div className="queue-list">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`report-item ${selectedReport?.id === report.id ? "selected" : ""}`}
            onClick={() => onSelectReport(report)}
          >
            <div className="report-header">
              <div className="report-meta">
                <span className="report-type">
                  {getTypeIcon(report.type)} {report.type}
                </span>
                <span className="report-priority">{getPriorityIcon(report.priority)}</span>
                <span className="report-time">{formatTimeAgo(report.created_at)}</span>
              </div>
              <div className="report-status">
                <span className={`status-badge ${report.status}`}>{report.status}</span>
              </div>
            </div>

            <div className="report-content">
              <div className="report-reason">
                <strong>Reason:</strong> {getReasonLabel(report.report_reason)}
              </div>

              <div className="report-preview">
                {report.type === "comment" && <p>{truncateText(report.content.text)}</p>}
                {report.type === "review" && (
                  <div>
                    <strong>{truncateText((report.content as any).title, 50)}</strong>
                    <p>{truncateText(report.content.text)}</p>
                  </div>
                )}
              </div>

              <div className="report-author">
                <span>by </span>
                {report.content.author ? (
                  <span className="author-name">@{report.content.author.username}</span>
                ) : (
                  <span className="author-unknown">Unknown user</span>
                )}
              </div>

              {report.reporter && (
                <div className="report-reporter">
                  <span>Reported by @{report.reporter.username}</span>
                </div>
              )}

              {report.anonymous && (
                <div className="report-anonymous">
                  <span>Anonymous report</span>
                </div>
              )}

              {report.additional_context && (
                <div className="report-context">
                  <strong>Context:</strong> {truncateText(report.additional_context, 80)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="queue-footer">
          <button onClick={onLoadMore} className="load-more-button" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="small" />
                Loading more...
              </>
            ) : (
              "Load More Reports"
            )}
          </button>
        </div>
      )}
    </div>
  );
};
