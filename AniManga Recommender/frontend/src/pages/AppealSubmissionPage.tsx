// ABOUTME: Page component for users to submit appeals for moderated content
// ABOUTME: Provides form interface for appeal submission and displays user's appeal history

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppeals } from "../hooks/useReputation";
import { useAuth } from "../context/AuthContext";
import { CreateAppealRequest, ModerationAppeal } from "../types/reputation";
import { logger } from "../utils/logger";
import "./AppealSubmissionPage.css";

interface LocationState {
  contentType?: "comment" | "review" | "profile";
  contentId?: number;
  originalAction?: string;
  reportId?: number;
}

export const AppealSubmissionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const { appeals, loading: appealsLoading, createAppeal } = useAppeals();

  // Form state
  const [formData, setFormData] = useState<CreateAppealRequest>({
    content_type: state?.contentType || "comment",
    content_id: state?.contentId || 0,
    original_action: state?.originalAction || "",
    appeal_reason: "",
    user_statement: "",
    report_id: state?.reportId || 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<ModerationAppeal | null>(null);

  // Filter appeals to show only user's appeals
  const userAppeals = appeals.filter((appeal) => appeal.user_id === user?.id);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  const handleInputChange = (field: keyof CreateAppealRequest, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear errors when user starts typing
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.content_type ||
      !formData.content_id ||
      !formData.original_action ||
      !formData.appeal_reason
    ) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    if (formData.appeal_reason.length < 10) {
      setSubmitError("Appeal reason must be at least 10 characters long.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const appeal = await createAppeal(formData);

      if (appeal) {
        setSubmitSuccess(appeal);
        // Reset form
        setFormData({
          content_type: "comment",
          content_id: 0,
          original_action: "",
          appeal_reason: "",
          user_statement: "",
          report_id: 0,
        });
      } else {
        setSubmitError("Failed to submit appeal. Please try again.");
      }
    } catch (error: any) {
      logger.error("Error submitting appeal", {
        error: error?.message || "Unknown error",
        context: "AppealSubmissionPage",
        operation: "handleSubmit",
        userId: user?.id,
        contentType: formData.content_type,
        contentId: formData.content_id
      });
      setSubmitError("An error occurred while submitting your appeal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "approved":
        return "status-approved";
      case "rejected":
        return "status-rejected";
      case "escalated":
        return "status-escalated";
      default:
        return "status-unknown";
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "high":
        return "priority-high";
      case "urgent":
        return "priority-urgent";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "priority-normal";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="appeal-submission-page">
      <div className="page-header">
        <h1>Moderation Appeals</h1>
        <p>Submit an appeal if you believe your content was incorrectly moderated</p>
      </div>

      <div className="page-content">
        <div className="appeal-sections">
          <section className="appeal-form-section">
            <h2>Submit New Appeal</h2>

            {submitSuccess && (
              <div className="success-banner">
                <span className="success-icon">✅</span>
                <div className="success-content">
                  <h3>Appeal Submitted Successfully</h3>
                  <p>
                    Your appeal has been submitted and will be reviewed by our moderation team. Appeal ID: #
                    {submitSuccess.id}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="appeal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="content_type">Content Type *</label>
                  <select
                    id="content_type"
                    value={formData.content_type}
                    onChange={(e) =>
                      handleInputChange("content_type", e.target.value as "comment" | "review" | "profile")
                    }
                    required
                  >
                    <option value="comment">Comment</option>
                    <option value="review">Review</option>
                    <option value="profile">Profile</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="content_id">Content ID *</label>
                  <input
                    type="number"
                    id="content_id"
                    value={formData.content_id || ""}
                    onChange={(e) => handleInputChange("content_id", parseInt(e.target.value) || 0)}
                    placeholder="Enter the ID of the content"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="original_action">Original Moderation Action *</label>
                <input
                  type="text"
                  id="original_action"
                  value={formData.original_action}
                  onChange={(e) => handleInputChange("original_action", e.target.value)}
                  placeholder="e.g., Content Removed, Warning Issued, Account Suspended"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="appeal_reason">Reason for Appeal *</label>
                <textarea
                  id="appeal_reason"
                  value={formData.appeal_reason}
                  onChange={(e) => handleInputChange("appeal_reason", e.target.value)}
                  placeholder="Please explain why you believe the moderation action was incorrect (minimum 10 characters)"
                  required
                  rows={4}
                  minLength={10}
                />
                <small className="field-help">{formData.appeal_reason.length}/500 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="user_statement">Additional Statement (Optional)</label>
                <textarea
                  id="user_statement"
                  value={formData.user_statement}
                  onChange={(e) => handleInputChange("user_statement", e.target.value)}
                  placeholder="Provide any additional context or information that might help with your appeal"
                  rows={3}
                />
              </div>

              {formData.report_id && (
                <div className="form-group">
                  <label htmlFor="report_id">Related Report ID</label>
                  <input
                    type="number"
                    id="report_id"
                    value={formData.report_id}
                    onChange={(e) => handleInputChange("report_id", parseInt(e.target.value) || undefined)}
                    placeholder="If you know the report ID, enter it here"
                  />
                </div>
              )}

              {submitError && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {submitError}
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="submit-button" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner"></span>
                      Submitting Appeal...
                    </>
                  ) : (
                    "Submit Appeal"
                  )}
                </button>

                <button type="button" className="cancel-button" onClick={() => navigate(-1)}>
                  Cancel
                </button>
              </div>
            </form>
          </section>

          <section className="appeals-history-section">
            <h2>Your Appeals History</h2>

            {appealsLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>Loading your appeals...</span>
              </div>
            ) : userAppeals.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <h3>No Appeals Yet</h3>
                <p>You haven't submitted any appeals. When you do, they'll appear here.</p>
              </div>
            ) : (
              <div className="appeals-list">
                {userAppeals.map((appeal) => (
                  <div key={appeal.id} className="appeal-card">
                    <div className="appeal-header">
                      <div className="appeal-info">
                        <h4>Appeal #{appeal.id}</h4>
                        <span className="appeal-type">
                          {appeal.content_type} • ID: {appeal.content_id}
                        </span>
                      </div>
                      <div className="appeal-badges">
                        <span className={`status-badge ${getStatusColor(appeal.status)}`}>
                          {appeal.status}
                        </span>
                        <span className={`priority-badge ${getPriorityColor(appeal.priority)}`}>
                          {appeal.priority}
                        </span>
                      </div>
                    </div>

                    <div className="appeal-content">
                      <div className="appeal-field">
                        <label>Original Action:</label>
                        <span>{appeal.original_action}</span>
                      </div>

                      <div className="appeal-field">
                        <label>Reason:</label>
                        <p>{appeal.appeal_reason}</p>
                      </div>

                      {appeal.user_statement && (
                        <div className="appeal-field">
                          <label>Your Statement:</label>
                          <p>{appeal.user_statement}</p>
                        </div>
                      )}

                      {appeal.status !== "pending" && appeal.resolution_reason && (
                        <div className="appeal-resolution">
                          <h5>Resolution</h5>
                          <div className="appeal-field">
                            <label>Reason:</label>
                            <p>{appeal.resolution_reason}</p>
                          </div>
                          {appeal.resolution_notes && (
                            <div className="appeal-field">
                              <label>Notes:</label>
                              <p>{appeal.resolution_notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="appeal-footer">
                      <span className="appeal-date">
                        Submitted: {new Date(appeal.created_at).toLocaleDateString()}
                      </span>
                      {appeal.resolved_at && (
                        <span className="appeal-date">
                          Resolved: {new Date(appeal.resolved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
