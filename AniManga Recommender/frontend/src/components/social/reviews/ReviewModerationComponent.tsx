// ABOUTME: Modal component for reporting reviews with multiple report reasons
// ABOUTME: Includes anonymous reporting option and validation

import React, { useState } from "react";
import { useReviews } from "../../../hooks/useReviews";
import { ReviewReport } from "../../../types/reviews";

interface ReviewModerationComponentProps {
  reviewId: number;
  onClose: () => void;
  onReportSubmitted: () => void;
}

const REPORT_REASONS = [
  {
    id: "spam",
    label: "Spam",
    description: "Repetitive, promotional, or irrelevant content",
  },
  {
    id: "inappropriate",
    label: "Inappropriate Content",
    description: "Content that violates community guidelines",
  },
  {
    id: "spoilers",
    label: "Unmarked Spoilers",
    description: "Contains spoilers without proper warnings",
  },
  {
    id: "harassment",
    label: "Harassment",
    description: "Targeting or attacking specific users or groups",
  },
  {
    id: "fake",
    label: "Fake Review",
    description: "Appears to be fake or manipulated review",
  },
  {
    id: "other",
    label: "Other",
    description: "Other violations not covered above",
  },
] as const;

export const ReviewModerationComponent: React.FC<ReviewModerationComponentProps> = ({
  reviewId,
  onClose,
  onReportSubmitted,
}) => {
  const { reportReview } = useReviews();

  const [formData, setFormData] = useState<Omit<ReviewReport, "review_id">>({
    report_reason: "spam",
    additional_context: "",
    anonymous: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const reportData: ReviewReport = {
        ...formData,
        review_id: reviewId,
      };

      const success = await reportReview(reviewId, reportData);

      if (success) {
        onReportSubmitted();
      } else {
        setError("Failed to submit report. Please try again.");
      }
    } catch (err) {
      setError("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Report Review</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Report Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What's wrong with this review? *
            </label>
            <div className="space-y-3">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.report_reason === reason.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={reason.id}
                    checked={formData.report_reason === reason.id}
                    onChange={(e) => handleInputChange("report_reason", e.target.value)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{reason.label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{reason.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Context */}
          <div>
            <label
              htmlFor="additional-context"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Additional Details (Optional)
            </label>
            <textarea
              id="additional-context"
              value={formData.additional_context}
              onChange={(e) => handleInputChange("additional_context", e.target.value)}
              placeholder="Provide any additional context that might help our moderators..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {(formData.additional_context || "").length}/500 characters
            </p>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-start space-x-3">
            <input
              id="anonymous-report"
              type="checkbox"
              checked={formData.anonymous}
              onChange={(e) => handleInputChange("anonymous", e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <div className="flex-1">
              <label
                htmlFor="anonymous-report"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Submit anonymously
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Your identity will not be shared with moderators or other users
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Info Message */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Report Guidelines</p>
                <ul className="space-y-1 text-xs">
                  <li>• Our moderation team will review your report within 24-48 hours</li>
                  <li>• False reports may result in restrictions on your account</li>
                  <li>• You'll receive a notification once the report is reviewed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {submitting ? (
                <>
                  <div className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
