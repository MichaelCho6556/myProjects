/**
 * PersonalizedRecommendations Component
 *
 * Displays personalized anime/manga recommendations by calling the API endpoint
 * implemented in Task 1.2. Shows recommendations in a proper card grid layout
 * with responsive design, consistent styling, and interactive features.
 *
 * @component
 */

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { PersonalizedRecommendationsProps } from "../../types";
import Spinner from "../Spinner";

const DEFAULT_PLACEHOLDER_IMAGE = "/images/default.webp";

/**
 * PersonalizedRecommendations component that fetches and displays recommendations
 */
const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({
  onRefresh,
  className = "",
}) => {
  const { user } = useAuth();
  const { makeAuthenticatedRequest } = useAuthenticatedApi();

  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [removedItems, setRemovedItems] = useState<Set<string>>(new Set());
  const [refreshingSection, setRefreshingSection] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState<{
    show: boolean;
    itemUid: string;
    itemTitle: string;
    sectionType: string;
  }>({
    show: false,
    itemUid: "",
    itemTitle: "",
    sectionType: "",
  });

  useEffect(() => {
    if (user?.id) {
      fetchRecommendations();
    }
  }, [user?.id]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🎯 Fetching personalized recommendations...");
      const response = await makeAuthenticatedRequest("/api/auth/personalized-recommendations");

      console.log("📊 Recommendations response:", response);
      setRecommendations(response);
    } catch (err: any) {
      console.error("❌ Error fetching recommendations:", err);
      setError(err.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchRecommendations();
    if (onRefresh) {
      onRefresh();
    }
  };

  /**
   * Handle section-specific refresh
   */
  const handleSectionRefresh = async (sectionType: string) => {
    try {
      setRefreshingSection(sectionType);
      // Since backend doesn't support section-specific refresh yet,
      // we'll refresh all recommendations and filter on frontend
      const response = await makeAuthenticatedRequest(`/api/auth/personalized-recommendations?refresh=true`);

      // Update the full recommendations object
      if (response?.recommendations) {
        setRecommendations(response);
      }
    } catch (err: any) {
      console.error(`❌ Error refreshing section ${sectionType}:`, err);
    } finally {
      setRefreshingSection(null);
    }
  };

  /**
   * Handle "Not Interested" feedback
   */
  const handleNotInterested = useCallback(
    async (itemUid: string, sectionType: string, reason?: string) => {
      try {
        // Send feedback to backend
        await makeAuthenticatedRequest("/api/auth/personalized-recommendations/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_uid: itemUid,
            action: "not_interested",
            reason: reason || "not_interested",
            section_type: sectionType,
          }),
        });

        // Remove item from UI immediately (optimistic update)
        setRemovedItems((prev) => new Set([...Array.from(prev), itemUid]));

        // Show success message
        console.log(`✅ Marked ${itemUid} as not interested`);
      } catch (err: any) {
        console.error("❌ Error submitting feedback:", err);
      }
    },
    [makeAuthenticatedRequest]
  );

  /**
   * Handle quick-add to user list
   */
  const handleQuickAdd = useCallback(
    async (itemUid: string, status: string, sectionType: string, itemTitle: string = "") => {
      try {
        // If status is "completed", show rating modal
        if (status === "completed") {
          setShowRatingModal({
            show: true,
            itemUid,
            itemTitle,
            sectionType,
          });
          return;
        }

        // Add item to user's list using the correct endpoint
        await makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: status,
            progress: 0,
          }),
        });

        // Send feedback about the add action
        await makeAuthenticatedRequest("/api/auth/personalized-recommendations/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_uid: itemUid,
            action: "added_to_list",
            list_status: status,
            section_type: sectionType,
          }),
        });

        console.log(`✅ Added ${itemUid} to ${status}`);

        // Auto-refresh recommendations after successful addition
        setTimeout(() => {
          fetchRecommendations();
        }, 500); // Small delay to ensure backend processing is complete
      } catch (err: any) {
        console.error("❌ Error adding to list:", err);
      }
    },
    [makeAuthenticatedRequest, fetchRecommendations]
  );

  /**
   * Handle completed item with rating and notes
   */
  const handleCompletedWithRating = useCallback(
    async (itemUid: string, rating: number, notes: string, sectionType: string) => {
      try {
        // Add item to user's list as completed with rating and notes
        await makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "completed",
            progress: 0,
            rating: rating,
            notes: notes,
          }),
        });

        // Send feedback about the add action with rating
        await makeAuthenticatedRequest("/api/auth/personalized-recommendations/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_uid: itemUid,
            action: "added_to_list",
            list_status: "completed",
            section_type: sectionType,
            rating: rating,
          }),
        });

        console.log(`✅ Added ${itemUid} to completed with rating ${rating}`);

        // Close modal
        setShowRatingModal({ show: false, itemUid: "", itemTitle: "", sectionType: "" });

        // Auto-refresh recommendations after successful addition
        setTimeout(() => {
          fetchRecommendations();
        }, 500);
      } catch (err: any) {
        console.error("❌ Error adding completed item:", err);
      }
    },
    [makeAuthenticatedRequest, fetchRecommendations]
  );

  /**
   * Handle image load error by falling back to default placeholder
   */
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = event.target as HTMLImageElement;
    target.src = DEFAULT_PLACEHOLDER_IMAGE;
  };

  /**
   * Render individual recommendation card with interactive features
   */
  const renderRecommendationCard = (item: any, itemIndex: number, sectionType: string) => {
    // Extract the actual anime/manga data from the nested structure
    const animeData = item.item; // The actual anime/manga data is in item.item
    const title = animeData?.title || animeData?.name || "Unknown Title";
    const reasoning = item.reasoning || "No reasoning provided";
    const score = item.recommendation_score || 0;
    const mediaType = animeData?.media_type || animeData?.mediaType || "Unknown";
    const genres = animeData?.genres || [];
    const rating = animeData?.rating || animeData?.score || "N/A";
    const predictedRating = item.predicted_rating;

    // Fix image URL extraction - handle multiple possible field names
    let imageUrl = animeData?.image_url || animeData?.imageUrl || animeData?.main_picture;

    // Additional fallback checks
    if (!imageUrl && animeData) {
      // Check for nested image structures that might exist
      imageUrl =
        animeData.images?.jpg?.image_url ||
        animeData.images?.large_image_url ||
        animeData.picture?.large ||
        animeData.picture?.medium;
    }

    // Final fallback to placeholder
    if (!imageUrl) {
      imageUrl = DEFAULT_PLACEHOLDER_IMAGE;
    }

    const itemUid = animeData?.uid || item.uid;

    // Skip rendering if item was removed
    if (removedItems.has(itemUid)) {
      return null;
    }

    return (
      <div key={itemIndex} className="recommendation-card-wrapper">
        <div className="recommendation-actions">
          <button
            className="action-btn not-interested-btn"
            onClick={() => handleNotInterested(itemUid, sectionType)}
            title="Not Interested"
            aria-label="Mark as not interested"
          >
            ❌
          </button>

          <div className="tooltip-container">
            <button
              className="action-btn info-btn"
              title="Why this recommendation?"
              aria-label="Show recommendation details"
            >
              ℹ️
            </button>
            <div className="recommendation-tooltip">
              <div className="tooltip-content">
                <h4>Why this recommendation?</h4>
                <p>
                  <strong>Reason:</strong> {reasoning}
                </p>
                <p>
                  <strong>Confidence:</strong> {Math.round(score * 100)}%
                </p>
                {genres.length > 0 && (
                  <p>
                    <strong>Genres:</strong> {genres.slice(0, 3).join(", ")}
                  </p>
                )}
                {rating !== "N/A" && (
                  <p>
                    <strong>Score:</strong> {rating}/10
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="add-to-list-container">
            <button className="action-btn add-to-list-btn" title="Add to List" aria-label="Add to your list">
              ➕
            </button>
            <div className="add-dropdown">
              <button
                className="dropdown-option"
                onClick={() => handleQuickAdd(itemUid, "plan_to_watch", sectionType, title)}
              >
                📋 Plan to Watch
              </button>
              <button
                className="dropdown-option"
                onClick={() => handleQuickAdd(itemUid, "watching", sectionType, title)}
              >
                👁️ Watching
              </button>
              <button
                className="dropdown-option"
                onClick={() => handleQuickAdd(itemUid, "on_hold", sectionType, title)}
              >
                ⏸️ On Hold
              </button>
              <button
                className="dropdown-option"
                onClick={() => handleQuickAdd(itemUid, "completed", sectionType, title)}
              >
                ✅ Completed
              </button>
            </div>
          </div>
        </div>

        <Link
          to={`/item/${itemUid}`}
          className="recommendation-card-link"
          aria-label={`View details for ${title} - ${mediaType} with score ${rating}`}
        >
          <article className="recommendation-card">
            <div className="recommendation-image-container">
              <img
                src={imageUrl}
                alt={`Cover for ${title}`}
                loading="lazy"
                onError={handleImageError}
                className="recommendation-image"
              />

              {predictedRating && (
                <div className="predicted-rating" title={`We think you'll rate this: ${predictedRating}/10`}>
                  ★ {predictedRating.toFixed(1)}
                </div>
              )}
            </div>

            <div className="recommendation-content">
              <h4 className="recommendation-title">{title}</h4>

              <div className="recommendation-meta">
                <span className="recommendation-type">{mediaType.toUpperCase()}</span>
                <span className="recommendation-rating">★ {rating}/10</span>
              </div>

              <div className="recommendation-reason">
                <p>{reasoning}</p>
              </div>

              {genres.length > 0 && (
                <div className="recommendation-genres">
                  {genres.slice(0, 3).map((genre: string, idx: number) => (
                    <span key={idx} className="genre-tag">
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              <div className="recommendation-score">
                <span className="score-label">Match:</span>
                <span className="score-value">{(score * 100).toFixed(0)}%</span>
              </div>
            </div>
          </article>
        </Link>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`personalized-recommendations ${className}`}>
        <div className="recommendations-loading">
          <Spinner size={24} />
          <p>Loading your personalized recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`personalized-recommendations ${className}`}>
        <div className="recommendations-error">
          <h2>🎯 Personalized Recommendations</h2>
          <p>⚠️ Could not load recommendations: {error}</p>
          <p>This feature requires the backend API from Task 1.2 to be running.</p>
          <button onClick={handleRefresh} className="retry-button">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  if (
    !recommendations ||
    !recommendations.recommendations ||
    Object.keys(recommendations.recommendations).length === 0
  ) {
    return (
      <div className={`personalized-recommendations ${className}`}>
        <div className="recommendations-placeholder">
          <h2>🎯 Personalized Recommendations</h2>
          <p>
            No recommendations available yet. Add more anime and manga to your lists to get personalized
            suggestions!
          </p>
          <div className="placeholder-features">
            <div className="feature-item">📊 Based on your completed titles</div>
            <div className="feature-item">📈 Trending in your favorite genres</div>
            <div className="feature-item">💎 Hidden gems you might love</div>
          </div>
          <button onClick={handleRefresh} className="refresh-button">
            🔄 Refresh Recommendations
          </button>
        </div>
      </div>
    );
  }

  const { recommendations: recs } = recommendations;
  const sections = [
    {
      title: "📊 Based on Your Completed Titles",
      subtitle: "Recommendations similar to anime and manga you've enjoyed",
      items: recs.completed_based || [],
      sectionType: "completed_based",
    },
    {
      title: "💎 Hidden Gems",
      subtitle: "Underrated titles that match your preferences",
      items: recs.hidden_gems || [],
      sectionType: "hidden_gems",
    },
    {
      title: "📈 Trending in Your Favorite Genres",
      subtitle: "Popular titles in genres you love",
      items: recs.trending_genres || [],
      sectionType: "trending_genres",
    },
  ];

  return (
    <div className={`personalized-recommendations ${className}`}>
      <div className="recommendations-header">
        <h2>🎯 Personalized Recommendations</h2>
        <button onClick={handleRefresh} className="refresh-button">
          🔄 Refresh All
        </button>
      </div>

      <div className="recommendations-content">
        {sections.map((section, index) => (
          <div key={index} className="recommendation-section">
            <div className="section-header">
              <div className="section-title-group">
                <h3>{section.title}</h3>
                <p className="section-subtitle">{section.subtitle}</p>
              </div>
              <button
                className="section-refresh-btn"
                onClick={() => handleSectionRefresh(section.sectionType)}
                disabled={refreshingSection === section.sectionType}
                title={`Refresh ${section.title}`}
              >
                {refreshingSection === section.sectionType ? "⟳" : "🔄"}
              </button>
            </div>

            {section.items.length > 0 ? (
              <div className="recommendation-grid">
                {section.items.map((item: any, itemIndex: number) =>
                  renderRecommendationCard(item, itemIndex, section.sectionType)
                )}
              </div>
            ) : (
              <div className="section-empty">
                <p>No recommendations available in this category yet.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {recommendations.cache_info && (
        <div className="cache-info">
          <p>{recommendations.cache_info.cache_hit ? "💾 Cached" : "🔄 Fresh"} recommendations</p>
          <p>Generated: {new Date(recommendations.generated_at).toLocaleString()}</p>
        </div>
      )}

      {/* Rating Modal for Completed Items */}
      {showRatingModal.show && (
        <RatingModal
          isOpen={showRatingModal.show}
          itemTitle={showRatingModal.itemTitle}
          onSubmit={(rating, notes) =>
            handleCompletedWithRating(showRatingModal.itemUid, rating, notes, showRatingModal.sectionType)
          }
          onClose={() => setShowRatingModal({ show: false, itemUid: "", itemTitle: "", sectionType: "" })}
        />
      )}
    </div>
  );
};

/**
 * Rating Modal Component for Completed Items
 */
interface RatingModalProps {
  isOpen: boolean;
  itemTitle: string;
  onSubmit: (rating: number, notes: string) => void;
  onClose: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ isOpen, itemTitle, onSubmit, onClose }) => {
  const [rating, setRating] = useState<string>("8.0");
  const [notes, setNotes] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericRating = parseFloat(rating);
    if (numericRating >= 1 && numericRating <= 10) {
      onSubmit(numericRating, notes);
    }
  };

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow empty string for editing
    if (value === "") {
      setRating("");
      return;
    }

    // Allow valid decimal numbers between 1-10
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
      setRating(value);
    } else if (!isNaN(numValue) && numValue > 10) {
      setRating("10.0");
    } else if (!isNaN(numValue) && numValue < 1) {
      setRating("1.0");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rating-modal-overlay" onClick={onClose}>
      <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rating-modal-header">
          <h3>Rate & Add to Completed</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="rating-modal-content">
          <div className="item-title">
            <strong>{itemTitle}</strong>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="rating-section">
              <label htmlFor="rating-input">Your Rating (1.0 - 10.0):</label>
              <div className="rating-input-container">
                <input
                  id="rating-input"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  value={rating}
                  onChange={handleRatingChange}
                  className="rating-input"
                  placeholder="8.0"
                />
                <span className="rating-suffix">/10</span>
              </div>
              <div className="rating-help">Enter a rating between 1.0 and 10.0 (decimals allowed)</div>
            </div>

            <div className="notes-section">
              <label htmlFor="notes">Notes (optional):</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you think about this anime/manga?"
                rows={3}
                maxLength={500}
              />
              <div className="character-count">{notes.length}/500</div>
            </div>

            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={!rating || parseFloat(rating) < 1 || parseFloat(rating) > 10}
              >
                Add to Completed
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PersonalizedRecommendations);
