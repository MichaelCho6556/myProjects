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

import React, { useState, useCallback, memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { RecommendationFeedback } from "../../types";
import LazyImage from "../LazyImage";

interface RecommendationCardProps {
  item: any;
  sectionType: string;
  removedItems?: Set<string>;
  addingToList?: Set<string>;
  recentlyAdded?: Set<string>;
  onNotInterested?: (itemUid: string, sectionType: string, title: string, mediaType: string) => void;
  onQuickAdd?: (itemUid: string, status: string, sectionType: string, title: string) => void;
  onCompleted?: (itemUid: string, sectionType: string, title: string) => void;
  onFeedback?: (feedback: RecommendationFeedback) => Promise<void>;
  onAddToList?: (itemUid: string, status: string, sectionType: string) => Promise<void>;
}

const DEFAULT_PLACEHOLDER_IMAGE = "/images/default.webp";

const RecommendationCard: React.FC<RecommendationCardProps> = memo(({
  item,
  sectionType,
  removedItems = new Set(),
  addingToList = new Set(),
  recentlyAdded = new Set(),
  onNotInterested,
  onQuickAdd,
  onCompleted,
  onFeedback,
  onAddToList,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize computed item data
  const itemData = useMemo(() => {
    const animeData = item.item || item;
    const title = animeData.title || "Unknown Title";
    const rating = animeData.score ? `${parseFloat(animeData.score).toFixed(1)}` : "N/A";
    const mediaType = animeData.media_type || "Unknown";
    const genres = Array.isArray(animeData.genres) ? animeData.genres : [];
    const reasoning = item.reasoning || item.reason || "Based on your preferences";
    const score = item.score || item.recommendation_score || 0.5;

    // Handle image URL with multiple fallbacks - check both camelCase and snake_case
    let imageUrl = animeData.imageUrl || animeData.image_url || animeData.main_picture;
    
    if (!imageUrl && animeData.images) {
      imageUrl = animeData.images?.jpg?.image_url ||
                 animeData.images?.large_image_url ||
                 animeData.picture?.large ||
                 animeData.picture?.medium;
    }



    imageUrl = imageUrl || DEFAULT_PLACEHOLDER_IMAGE;
    const itemUid = animeData?.uid || item.uid;

    return {
      title,
      rating,
      mediaType,
      genres,
      reasoning,
      score,
      imageUrl,
      itemUid,
      animeData,
    };
  }, [item]);

  // Memoize content type indicator
  const typeIndicator = useMemo(() => {
    const type = itemData.mediaType?.toLowerCase();
    if (type === "anime") {
      return { icon: "📺", label: "Anime", className: "content-type-anime" };
    } else if (type === "manga") {
      return { icon: "📖", label: "Manga", className: "content-type-manga" };
    }
    return { icon: "❓", label: "Unknown", className: "content-type-unknown" };
  }, [itemData.mediaType]);

  const predictedRating = item.predicted_rating ? item.predicted_rating.toFixed(1) : null;

  // Memoized event handlers for optimized callbacks
  const handleNotInterestedOptimized = useCallback(() => {
    if (onNotInterested) {
      onNotInterested(itemData.itemUid, sectionType, itemData.title, itemData.mediaType);
    }
  }, [onNotInterested, itemData.itemUid, sectionType, itemData.title, itemData.mediaType]);

  const handlePlanToWatch = useCallback(() => {
    if (onQuickAdd) {
      onQuickAdd(itemData.itemUid, "plan_to_watch", sectionType, itemData.title);
    }
  }, [onQuickAdd, itemData.itemUid, sectionType, itemData.title]);

  const handleWatching = useCallback(() => {
    if (onQuickAdd) {
      onQuickAdd(itemData.itemUid, "watching", sectionType, itemData.title);
    }
  }, [onQuickAdd, itemData.itemUid, sectionType, itemData.title]);

  const handleCompletedOptimized = useCallback(() => {
    if (onCompleted) {
      onCompleted(itemData.itemUid, sectionType, itemData.title);
    }
  }, [onCompleted, itemData.itemUid, sectionType, itemData.title]);

  const handleOnHold = useCallback(() => {
    if (onQuickAdd) {
      onQuickAdd(itemData.itemUid, "on_hold", sectionType, itemData.title);
    }
  }, [onQuickAdd, itemData.itemUid, sectionType, itemData.title]);

  const handleDropped = useCallback(() => {
    if (onQuickAdd) {
      onQuickAdd(itemData.itemUid, "dropped", sectionType, itemData.title);
    }
  }, [onQuickAdd, itemData.itemUid, sectionType, itemData.title]);

  /**
   * Handle "Not Interested" action (legacy)
   */
  const handleNotInterested = useCallback(
    async (reason?: string): Promise<void> => {
      if (isProcessing) return;

      try {
        setIsProcessing(true);
        setError(null);

        if (onFeedback) {
          await onFeedback({
            item_uid: itemData.itemUid,
            action: "not_interested",
            reason: reason as any,
            section_type: sectionType as any,
          });
        }
      } catch (err: any) {
        console.error("Error marking as not interested:", err);
        setError("Failed to process feedback");
      } finally {
        setIsProcessing(false);
      }
    },
    [itemData.itemUid, sectionType, onFeedback, isProcessing]
  );

  /**
   * Handle adding item to user list (legacy)
   */
  const handleAddToList = useCallback(
    async (status: string): Promise<void> => {
      if (isProcessing) return;

      try {
        setIsProcessing(true);
        setError(null);
        setShowAddDropdown(false);

        if (onAddToList) {
          await onAddToList(itemData.itemUid, status, sectionType);
        }
      } catch (err: any) {
        console.error("Error adding to list:", err);
        setError("Failed to add to list");
      } finally {
        setIsProcessing(false);
      }
    },
    [itemData.itemUid, sectionType, onAddToList, isProcessing]
  );

  /**
   * Handle click tracking
   */
  const handleCardClick = useCallback(async (): Promise<void> => {
    try {
      if (onFeedback) {
        await onFeedback({
          item_uid: itemData.itemUid,
          action: "clicked",
          section_type: sectionType as any,
        });
      }
    } catch (err) {
      // Don't block navigation on feedback failure
      console.warn("Failed to track click feedback:", err);
    }
  }, [itemData.itemUid, sectionType, onFeedback]);

  // Skip rendering if removed
  if (removedItems.has(itemData.itemUid)) {
    return null;
  }

  const isAdding = addingToList.has(itemData.itemUid);
  const isAdded = recentlyAdded.has(itemData.itemUid);

  const listOptions = [
    { value: "plan_to_watch", label: "Plan to Watch/Read" },
    { value: "watching", label: "Currently Watching/Reading" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
    { value: "dropped", label: "Dropped" },
  ];

  return (
    <div className="recommendation-card-wrapper">
      {error && (
        <div className="recommendation-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="recommendation-actions">
        <button
          onClick={onNotInterested ? handleNotInterestedOptimized : () => handleNotInterested("not_my_genre")}
          className="not-interested-btn"
          title="Not interested"
          aria-label={`Mark ${itemData.title} as not interested`}
          disabled={isProcessing}
        >
          ✕
        </button>

        {/* Info Tooltip */}
        <div className="tooltip-container">
          <button
            className="action-btn info-btn"
            title="Why this recommendation?"
            aria-label="Show recommendation details"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
          >
            ℹ️
          </button>
          {showTooltip && (
            <div className="recommendation-tooltip">
              <div className="tooltip-content">
                <h4>Why this recommendation?</h4>
                <p>
                  <strong>Reason:</strong> {itemData.reasoning}
                </p>
                <p>
                  <strong>Confidence:</strong> {Math.round(itemData.score * 100)}%
                </p>
                {itemData.genres.length > 0 && (
                  <p>
                    <strong>Genres:</strong> {itemData.genres.slice(0, 3).join(", ")}
                  </p>
                )}
                {itemData.rating !== "N/A" && (
                  <p>
                    <strong>Score:</strong> {itemData.rating}/10
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add to List Dropdown */}
        <div className="add-to-list-container">
          <button
            className={`action-btn add-to-list-btn ${isAdding ? "loading" : ""} ${isAdded ? "success" : ""}`}
            title={isAdding ? "Adding to list..." : isAdded ? "Added successfully!" : "Add to List"}
            aria-label="Add to your list"
            disabled={isAdding}
            onClick={() => setShowAddDropdown(!showAddDropdown)}
          >
            {isAdding ? "⟳" : isAdded ? "✓" : "➕"}
          </button>
          {showAddDropdown && (
            <div className="add-dropdown">
              {onQuickAdd ? (
                <>
                  <button
                    className="dropdown-option"
                    onClick={handlePlanToWatch}
                    disabled={isAdding}
                  >
                    📋 Plan to Watch
                  </button>
                  <button
                    className="dropdown-option"
                    onClick={handleWatching}
                    disabled={isAdding}
                  >
                    👁️ Watching
                  </button>
                  <button
                    className="dropdown-option"
                    onClick={handleCompletedOptimized}
                    disabled={isAdding}
                  >
                    ✅ Completed
                  </button>
                  <button
                    className="dropdown-option"
                    onClick={handleOnHold}
                    disabled={isAdding}
                  >
                    ⏸️ On Hold
                  </button>
                  <button
                    className="dropdown-option"
                    onClick={handleDropped}
                    disabled={isAdding}
                  >
                    🗑️ Dropped
                  </button>
                </>
              ) : (
                listOptions.map((option) => (
                  <button
                    key={option.value}
                    className="dropdown-option"
                    onClick={() => handleAddToList(option.value)}
                    disabled={isProcessing}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <Link to={`/item/${itemData.itemUid}`} className="recommendation-card-link" onClick={handleCardClick}>
        <article className="recommendation-card">
          <div className="recommendation-image">
            <LazyImage
              src={itemData.imageUrl}
              alt={`Cover for ${itemData.title}`}
              fallbackSrc={DEFAULT_PLACEHOLDER_IMAGE}
              title={itemData.title}
              className="aspect-cover"
            />
            
            <div className={`content-type-indicator ${typeIndicator.className}`}>
              <span className="type-icon">{typeIndicator.icon}</span>
              <span className="type-label">{typeIndicator.label}</span>
            </div>

            {predictedRating && (
              <div className="predicted-rating" title={`We think you'll rate this: ${predictedRating}/10`}>
                ★ {predictedRating}
              </div>
            )}
          </div>

          <div className="recommendation-content">
            <h4 className="recommendation-title">{itemData.title}</h4>
            
            <div className="recommendation-meta">
              <div className="rating-score">
                <span className="rating-icon">⭐</span>
                <span className="rating-value">{itemData.rating}</span>
              </div>
              
              <div className="match-score">
                <span className="match-label">Match:</span>
                <span className="match-value">{(itemData.score * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="recommendation-reason">
              <p>{itemData.reasoning}</p>
            </div>

            {itemData.genres.length > 0 && (
              <div className="recommendation-genres">
                {itemData.genres.slice(0, 3).map((genre: string, idx: number) => (
                  <span key={idx} className="genre-tag">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      </Link>

      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner">⟳</div>
        </div>
      )}
    </div>
  );
});

RecommendationCard.displayName = 'RecommendationCard';

export default RecommendationCard;
