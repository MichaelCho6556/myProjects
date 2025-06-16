/**
 * RecommendationCard Component
 *
 * Individual recommendation card that displays item details with interactive features.
 * Provides "Not Interested", "Why This?", and "Add to List" functionality with
 * proper error handling and user feedback.
 *
 * Features:
 * - Item image with fallback handling
 * - Recommendation reasoning and predicted rating display
 * - Interactive action buttons with hover states
 * - Tooltip for detailed recommendation explanation
 * - Dropdown for adding to user lists
 * - Accessibility support and keyboard navigation
 *
 * @component
 */

import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { RecommendationItem, RecommendationFeedback } from "../../types";

interface RecommendationCardProps {
  item: RecommendationItem;
  sectionType: "based_on_completed" | "trending_genres" | "hidden_gems";
  onFeedback: (feedback: RecommendationFeedback) => Promise<void>;
  onAddToList: (itemUid: string, status: string, sectionType: string) => Promise<void>;
}

const DEFAULT_PLACEHOLDER_IMAGE = "/images/default.webp";

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  sectionType,
  onFeedback,
  onAddToList,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = item.image_url || DEFAULT_PLACEHOLDER_IMAGE;
  const score = item.score ? parseFloat(item.score.toString()).toFixed(1) : "N/A";
  const predictedRating = item.predicted_rating ? item.predicted_rating.toFixed(1) : null;
  const confidence = Math.round(item.recommendation_score * 100);

  /**
   * Handle image load error by falling back to default placeholder
   */
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = event.target as HTMLImageElement;
    target.src = DEFAULT_PLACEHOLDER_IMAGE;
  };

  /**
   * Handle "Not Interested" action
   */
  const handleNotInterested = useCallback(
    async (reason?: string): Promise<void> => {
      if (isProcessing) return;

      try {
        setIsProcessing(true);
        setError(null);

        await onFeedback({
          item_uid: item.uid,
          action: "not_interested",
          reason: reason as any,
          section_type: sectionType,
        });
      } catch (err: any) {
        console.error("Error marking as not interested:", err);
        setError("Failed to process feedback");
      } finally {
        setIsProcessing(false);
      }
    },
    [item.uid, sectionType, onFeedback, isProcessing]
  );

  /**
   * Handle adding item to user list
   */
  const handleAddToList = useCallback(
    async (status: string): Promise<void> => {
      if (isProcessing) return;

      try {
        setIsProcessing(true);
        setError(null);
        setShowAddDropdown(false);

        await onAddToList(item.uid, status, sectionType);
      } catch (err: any) {
        console.error("Error adding to list:", err);
        setError("Failed to add to list");
      } finally {
        setIsProcessing(false);
      }
    },
    [item.uid, sectionType, onAddToList, isProcessing]
  );

  /**
   * Handle click tracking
   */
  const handleCardClick = useCallback(async (): Promise<void> => {
    try {
      await onFeedback({
        item_uid: item.uid,
        action: "clicked",
        section_type: sectionType,
      });
    } catch (err) {
      // Don't block navigation on feedback failure
      console.warn("Failed to track click feedback:", err);
    }
  }, [item.uid, sectionType, onFeedback]);

  const listOptions = [
    { value: "plan_to_watch", label: "Plan to Watch/Read" },
    { value: "watching", label: "Currently Watching/Reading" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
    { value: "dropped", label: "Dropped" },
  ];

  return (
    <div className="recommendation-card">
      {error && (
        <div className="recommendation-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="recommendation-actions">
        <button
          className="not-interested-btn"
          onClick={() => handleNotInterested("not_my_genre")}
          disabled={isProcessing}
          title="Not interested in this recommendation"
          aria-label="Mark as not interested"
        >
          ✕
        </button>

        <button
          className="info-btn"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          aria-label="Why this recommendation?"
        >
          ℹ️
        </button>

        <div className="add-to-list-container">
          <button
            className="add-to-list-btn"
            onClick={() => setShowAddDropdown(!showAddDropdown)}
            disabled={isProcessing}
            aria-label="Add to list"
            aria-expanded={showAddDropdown}
          >
            +
          </button>

          {showAddDropdown && (
            <div className="add-dropdown">
              {listOptions.map((option) => (
                <button
                  key={option.value}
                  className="dropdown-option"
                  onClick={() => handleAddToList(option.value)}
                  disabled={isProcessing}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showTooltip && (
        <div className="recommendation-tooltip">
          <div className="tooltip-content">
            <h4>Why this recommendation?</h4>
            <p>
              <strong>Reason:</strong> {item.reason}
            </p>
            <p>
              <strong>Confidence:</strong> {confidence}%
            </p>
            {item.genres && item.genres.length > 0 && (
              <p>
                <strong>Genres:</strong> {item.genres.join(", ")}
              </p>
            )}
            {item.score && (
              <p>
                <strong>Score:</strong> {score}/10
              </p>
            )}
          </div>
        </div>
      )}

      <Link
        to={`/item/${item.uid}`}
        className="recommendation-link"
        onClick={handleCardClick}
        aria-label={`View details for ${item.title}`}
      >
        <div className="item-image-container">
          <img
            src={imageUrl}
            alt={`Cover for ${item.title}`}
            loading="lazy"
            onError={handleImageError}
            className="item-image"
          />

          {predictedRating && (
            <div className="predicted-rating" title={`We think you'll rate this: ${predictedRating}/10`}>
              ★ {predictedRating}
            </div>
          )}
        </div>

        <div className="item-content">
          <h4 className="item-title">{item.title}</h4>

          <div className="item-meta">
            <span className="item-type">{item.media_type.toUpperCase()}</span>
            <span className="item-score">★ {score}</span>
          </div>

          <div className="recommendation-reason">
            <p>{item.reason}</p>
          </div>

          {item.synopsis && (
            <div className="item-synopsis">
              <p>{item.synopsis.length > 120 ? `${item.synopsis.substring(0, 120)}...` : item.synopsis}</p>
            </div>
          )}

          <div className="confidence-bar">
            <div className="confidence-label">Confidence: {confidence}%</div>
            <div className="confidence-track">
              <div className="confidence-fill" style={{ width: `${confidence}%` }} />
            </div>
          </div>
        </div>
      </Link>

      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner">⟳</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(RecommendationCard);
