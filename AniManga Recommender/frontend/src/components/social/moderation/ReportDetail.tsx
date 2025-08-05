// ABOUTME: Component for displaying detailed report information and moderation actions
// ABOUTME: Provides full content view and quick action buttons for moderators to resolve reports

import React, { useState } from "react";
import { UpdateReportRequest, ReportDetailProps } from "../../../types/moderation";
import { logger } from "../../../utils/logger";
import Spinner from "../../Spinner";

// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  // Decode URL to catch encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }
  
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // Dangerous schemes to block
  const dangerousSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:',
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return 'about:blank';
    }
  }
  
  // Additional check for encoded attempts
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return 'about:blank';
  }
  
  return url;
};

import "./ReportDetail.css";

export const ReportDetail: React.FC<ReportDetailProps> = ({ report, onResolveReport, loading }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: UpdateReportRequest;
    title: string;
    description: string;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getReasonDescription = (reason: string): string => {
    switch (reason) {
      case "spam":
        return "Content contains spam or promotional material";
      case "harassment":
        return "Content contains harassment or bullying";
      case "inappropriate":
        return "Content is inappropriate for the platform";
      case "offensive":
        return "Content is offensive or contains hate speech";
      case "other":
        return "Other violation of community guidelines";
      default:
        return reason;
    }
  };

  const handleQuickAction = (action: UpdateReportRequest, title: string, description: string) => {
    setPendingAction({ action, title, description });
    setActionNotes("");
    setShowConfirmModal(true);
  };

  const confirmAction = async () => {
    if (!report || !pendingAction) return;

    setActionLoading(true);
    try {
      const actionWithNotes = {
        ...pendingAction.action,
        resolution_notes: actionNotes || pendingAction.description,
      };

      await onResolveReport(report.id, actionWithNotes);
      setShowConfirmModal(false);
      setPendingAction(null);
      setActionNotes("");
    } catch (error: any) {
      logger.error("Error performing action", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "ReportDetail",
        operation: "handleConfirmAction",
        reportId: report.id,
        action: pendingAction?.action
      });
    } finally {
      setActionLoading(false);
    }
  };

  const cancelAction = () => {
    setShowConfirmModal(false);
    setPendingAction(null);
    setActionNotes("");
  };

  const handleDismiss = () => {
    handleQuickAction(
      { status: "dismissed", resolution_action: "no_action" },
      "Dismiss Report",
      "Report dismissed - no action required"
    );
  };

  const handleRemoveContent = () => {
    handleQuickAction(
      { status: "resolved", resolution_action: "remove_content" },
      "Remove Content",
      "Content removed for violating community guidelines"
    );
  };

  const handleWarnUser = () => {
    handleQuickAction(
      { status: "resolved", resolution_action: "warn_user" },
      "Warn User",
      "User warned about content violating community guidelines"
    );
  };

  const handleTempBan = () => {
    handleQuickAction(
      { status: "resolved", resolution_action: "temp_ban" },
      "Temporary Ban",
      "User temporarily banned for violating community guidelines"
    );
  };

  const handlePermanentBan = () => {
    handleQuickAction(
      { status: "resolved", resolution_action: "permanent_ban" },
      "Permanent Ban",
      "User permanently banned for severe violations"
    );
  };

  if (!report) {
    return (
      <div className="report-detail">
        <div className="detail-empty">
          <div className="empty-icon">👁️</div>
          <h4>No Report Selected</h4>
          <p>Select a report from the queue to view details and take action.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-detail">
      <div className="detail-content">
        {/* Report Information */}
        <div className="report-info-section">
          <div className="section-header">
            <h4>Report Information</h4>
            <span className={`status-badge ${report.status}`}>{report.status}</span>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <label>Report ID:</label>
              <span>#{report.id}</span>
            </div>
            <div className="info-item">
              <label>Type:</label>
              <span className="type-value">{report.type === "comment" ? "💬 Comment" : "📝 Review"}</span>
            </div>
            <div className="info-item">
              <label>Priority:</label>
              <span className={`priority-value ${report.priority}`}>
                {report.priority === "high" && "🔴"}
                {report.priority === "medium" && "🟡"}
                {report.priority === "low" && "🟢"}
                {report.priority}
              </span>
            </div>
            <div className="info-item">
              <label>Reported:</label>
              <span>{formatDate(report.created_at)}</span>
            </div>
            <div className="info-item">
              <label>Reason:</label>
              <span>{getReasonDescription(report.report_reason)}</span>
            </div>
            <div className="info-item">
              <label>Reporter:</label>
              <span>
                {report.anonymous
                  ? "🕶️ Anonymous"
                  : report.reporter
                  ? `@${report.reporter.username}`
                  : "Unknown"}
              </span>
            </div>
          </div>

          {report.additional_context && (
            <div className="additional-context">
              <label>Additional Context:</label>
              <p>{report.additional_context}</p>
            </div>
          )}
        </div>

        {/* Reported Content */}
        <div className="content-section">
          <div className="section-header">
            <h4>Reported Content</h4>
          </div>

          <div className="content-details">
            <div className="content-meta">
              <div className="author-info">
                {report.content.author ? (
                  <div className="author-card">
                    {report.content.author.avatar_url ? (
                      <img
                        src={sanitizeUrl(report.content.author.avatar_url)}
                        alt={report.content.author.username}
                        className="author-avatar"
                      />
                    ) : (
                      <div className="author-avatar-placeholder">
                        {report.content.author.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="author-details">
                      <div className="author-username">@{report.content.author.username}</div>
                      {report.content.author.display_name && (
                        <div className="author-display-name">{report.content.author.display_name}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="author-unknown">Unknown Author</div>
                )}
              </div>

              <div className="content-date">Posted: {formatDate(report.content.created_at)}</div>
            </div>

            <div className="content-body">
              {report.type === "review" && (
                <div className="review-content">
                  <h5 className="review-title">{(report.content as any).title}</h5>
                  {(report.content as any).rating && (
                    <div className="review-rating">Rating: {(report.content as any).rating}/10 ⭐</div>
                  )}
                  <div className="review-text">{report.content.text}</div>
                </div>
              )}

              {report.type === "comment" && (
                <div className="comment-content">
                  <div className="comment-text">{report.content.text}</div>
                  <div className="comment-context">
                    On: {(report.content as any).parent_type} #{(report.content as any).parent_id}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {report.status === "pending" && (
          <div className="actions-section">
            <div className="section-header">
              <h4>Quick Actions</h4>
            </div>

            <div className="action-buttons">
              <button onClick={handleDismiss} className="action-button dismiss" disabled={loading}>
                ✅ Dismiss Report
              </button>

              <button onClick={handleWarnUser} className="action-button warn" disabled={loading}>
                ⚠️ Warn User
              </button>

              <button onClick={handleRemoveContent} className="action-button remove" disabled={loading}>
                🗑️ Remove Content
              </button>

              <button onClick={handleTempBan} className="action-button temp-ban" disabled={loading}>
                ⏰ Temporary Ban
              </button>

              <button onClick={handlePermanentBan} className="action-button permanent-ban" disabled={loading}>
                🚫 Permanent Ban
              </button>
            </div>
          </div>
        )}

        {report.status !== "pending" && (
          <div className="resolved-section">
            <div className="resolved-status">
              <span className="resolved-icon">✅</span>
              <span>This report has been {report.status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingAction && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-header">
              <h3>{pendingAction.title}</h3>
            </div>

            <div className="modal-body">
              <p>Are you sure you want to perform this action?</p>
              <p className="action-description">{pendingAction.description}</p>

              <div className="notes-section">
                <label htmlFor="action-notes">Additional Notes (Optional):</label>
                <textarea
                  id="action-notes"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add any additional context or notes..."
                  rows={3}
                  className="notes-textarea"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={cancelAction} className="modal-button cancel" disabled={actionLoading}>
                Cancel
              </button>
              <button onClick={confirmAction} className="modal-button confirm" disabled={actionLoading}>
                {actionLoading ? <Spinner size="small" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
