// ABOUTME: Comment moderation tools component for reporting and moderating comments
// ABOUTME: Provides interfaces for reporting, moderating, and managing comment content

import React, { useState } from "react";
import { CommentModerationProps, CommentReportReason } from "../../../types/comments";
import { logger } from "../../../utils/logger";
import "./CommentModerationTools.css";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: CommentReportReason, context: string, anonymous: boolean) => void;
  isSubmitting: boolean;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [selectedReason, setSelectedReason] = useState<CommentReportReason>("inappropriate");
  const [additionalContext, setAdditionalContext] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const reportReasons: { value: CommentReportReason; label: string; description: string }[] = [
    {
      value: "spam",
      label: "Spam",
      description: "Unwanted promotional content or repetitive messages",
    },
    {
      value: "harassment",
      label: "Harassment",
      description: "Bullying, threats, or personal attacks",
    },
    {
      value: "inappropriate",
      label: "Inappropriate Content",
      description: "Content that violates community guidelines",
    },
    {
      value: "offensive",
      label: "Offensive Language",
      description: "Hate speech, slurs, or discriminatory language",
    },
    {
      value: "other",
      label: "Other",
      description: "Other reasons not listed above",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedReason, additionalContext, anonymous);
    handleClose();
  };

  const handleClose = () => {
    setSelectedReason("inappropriate");
    setAdditionalContext("");
    setAnonymous(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h3>Report Comment</h3>
          <button onClick={handleClose} className="close-button">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          <div className="report-reasons">
            <label className="form-label">Why are you reporting this comment?</label>
            {reportReasons.map((reason) => (
              <label key={reason.value} className="reason-option">
                <input
                  type="radio"
                  name="reason"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={(e) => setSelectedReason(e.target.value as CommentReportReason)}
                />
                <div className="reason-content">
                  <div className="reason-label">{reason.label}</div>
                  <div className="reason-description">{reason.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="additional-context">
            <label htmlFor="context" className="form-label">
              Additional context (optional)
            </label>
            <textarea
              id="context"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Provide additional details about why you're reporting this comment..."
              maxLength={500}
              rows={3}
              className="context-textarea"
            />
            <div className="character-count">{additionalContext.length}/500</div>
          </div>

          <div className="report-options">
            <label className="anonymous-option">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              <span>Report anonymously</span>
            </label>
          </div>

          <div className="report-actions">
            <button type="button" onClick={handleClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="submit-button">
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ModerationActionsProps {
  onAction: (action: "hide" | "delete" | "warn") => void;
  isVisible: boolean;
}

const ModerationActions: React.FC<ModerationActionsProps> = ({ onAction, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="moderation-actions">
      <button
        onClick={() => onAction("hide")}
        className="mod-action-btn hide-btn"
        title="Hide comment from public view"
      >
        👁️ Hide
      </button>
      <button
        onClick={() => onAction("delete")}
        className="mod-action-btn delete-btn"
        title="Delete comment permanently"
      >
        🗑️ Delete
      </button>
      <button
        onClick={() => onAction("warn")}
        className="mod-action-btn warn-btn"
        title="Send warning to user"
      >
        ⚠️ Warn
      </button>
    </div>
  );
};

export const CommentModerationTools: React.FC<CommentModerationProps> = ({
  onReport,
  onModerate,
  canModerate = false,
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showModerationActions, setShowModerationActions] = useState(false);

  const handleReport = async () => {
    setIsReporting(true);
    try {
      await onReport();
      // In a real implementation, this would call the report API with the provided data
    } catch (error: any) {
      logger.error("Error reporting comment", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "CommentModerationTools",
        operation: "handleReport"
      });
    } finally {
      setIsReporting(false);
    }
  };

  const handleModerationAction = (action: "hide" | "delete" | "warn") => {
    if (onModerate) {
      onModerate(action);
    }
    setShowModerationActions(false);
  };

  return (
    <div className="comment-moderation-tools">
      {/* Report button for regular users */}
      <button
        onClick={() => setShowReportModal(true)}
        className="moderation-tool-btn report-btn"
        title="Report this comment"
      >
        🚩 Report
      </button>

      {/* Moderation actions for moderators */}
      {canModerate && (
        <div className="moderator-tools">
          <button
            onClick={() => setShowModerationActions(!showModerationActions)}
            className="moderation-tool-btn moderate-btn"
            title="Moderation actions"
          >
            🛡️ Moderate
          </button>
          <ModerationActions onAction={handleModerationAction} isVisible={showModerationActions} />
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReport}
        isSubmitting={isReporting}
      />
    </div>
  );
};
