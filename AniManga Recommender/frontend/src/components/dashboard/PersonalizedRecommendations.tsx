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
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { PersonalizedRecommendationsProps } from "../../types";
import RecommendationsSkeleton from "../Loading/RecommendationsSkeleton";
import EmptyState from "../EmptyState";

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

  // Add content type filter state
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | "anime" | "manga">("all");

  // Add loading states for better UX
  const [addingToList, setAddingToList] = useState<Set<string>>(new Set());
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      fetchRecommendations();
    }
  }, [user?.id, contentTypeFilter]); // Refetch when content type filter changes

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🎯 Fetching personalized recommendations...");
      console.log("🔍 Current contentTypeFilter:", contentTypeFilter);

      // Add timestamp for cache busting to ensure fresh recommendations
      const timestamp = Date.now();

      // Include content type filter in the API request
      const params = new URLSearchParams();
      params.set("refresh", "true");
      params.set("t", timestamp.toString());
      if (contentTypeFilter !== "all") {
        params.set("content_type", contentTypeFilter);
      }

      const finalUrl = `/api/auth/personalized-recommendations?${params.toString()}`;
      console.log("🌐 API URL:", finalUrl);
      console.log("📤 Request params:", Object.fromEntries(params.entries()));

      const response = await makeAuthenticatedRequest(finalUrl);

      console.log("📊 Recommendations response:", response);

      // Debug the actual recommendations data structure
      if (response?.recommendations) {
        console.log("🔍 DETAILED RESPONSE DEBUG:");
        Object.entries(response.recommendations).forEach(([section, items]) => {
          console.log(`  📂 Section: ${section}`);
          if (Array.isArray(items)) {
            console.log(`     📊 Item count: ${items.length}`);
            items.slice(0, 3).forEach((item, idx) => {
              const mediaType = item?.item?.mediaType;
              const title = item?.item?.title;
              console.log(`     ${idx + 1}. ${title} (${mediaType})`);
            });
            if (items.length > 3) {
              console.log(`     ... and ${items.length - 3} more items`);
            }
          }
        });
      }
      setRecommendations(response);
    } catch (err: any) {
      console.error("❌ Error fetching recommendations:", err);
      setError(err.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    // Don't clear removed items - user dismissed them for a reason
    // Instead, fetch new recommendations that should exclude dismissed items
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
      console.log(`🔄 Refreshing section: ${sectionType}`);

      // Don't clear removed items - we want to keep them dismissed
      // The backend should provide new recommendations that exclude dismissed items

      // Force refresh with timestamp to ensure we get truly fresh data
      const timestamp = Date.now();

      // IMPORTANT: Include current content type filter in section refresh!
      const params = new URLSearchParams();
      params.set("refresh", "true");
      params.set("t", timestamp.toString());
      if (contentTypeFilter !== "all") {
        params.set("content_type", contentTypeFilter);
      }

      const refreshUrl = `/api/auth/personalized-recommendations?${params.toString()}`;
      console.log("🔄 Section refresh URL:", refreshUrl);
      console.log("🔄 Section refresh with content filter:", contentTypeFilter);

      const response = await makeAuthenticatedRequest(refreshUrl);

      console.log("📊 Section refresh response:", response);

      // Update the full recommendations object
      if (response?.recommendations) {
        setRecommendations(response);
        console.log(`✅ Successfully refreshed section: ${sectionType} with new recommendations`);
      } else {
        console.warn("⚠️ No recommendations data in response");
      }
    } catch (err: any) {
      console.error(`❌ Error refreshing section ${sectionType}:`, err);
      // Show user-friendly error message if needed
      setError(`Failed to refresh ${sectionType} section. Please try again.`);
    } finally {
      setRefreshingSection(null);
    }
  };

  /**
   * Check if a title might have anime/manga counterpart
   */
  const mightHaveCounterpart = (title: string) => {
    // Simple heuristic - titles that are likely to have both formats
    const commonCrossFormats = [
      "naruto",
      "one piece",
      "attack on titan",
      "demon slayer",
      "my hero academia",
      "dragon ball",
      "bleach",
      "death note",
      "fullmetal alchemist",
      "tokyo ghoul",
      "jujutsu kaisen",
      "chainsaw man",
      "spy x family",
      "mob psycho",
      "one punch man",
    ];

    const titleLower = title.toLowerCase();
    return commonCrossFormats.some(
      (format) => titleLower.includes(format) || format.includes(titleLower.split(" ")[0])
    );
  };

  /**
   * Enhanced not interested handler with cross-format suggestion
   */
  const handleNotInterestedWithSuggestion = async (
    itemUid: string,
    sectionType: string,
    title: string,
    mediaType: string
  ) => {
    const hasCounterpart = mightHaveCounterpart(title);

    if (hasCounterpart) {
      const counterpartType = mediaType.toLowerCase() === "anime" ? "manga" : "anime";
      const confirmed = window.confirm(
        `Not interested in the ${mediaType.toLowerCase()}?\n\n` +
          `"${title}" also exists as ${counterpartType}. Would you like to:\n\n` +
          `• Click "OK" to dismiss this ${mediaType.toLowerCase()} only\n` +
          `• Click "Cancel" to keep it and explore both formats\n\n` +
          `Tip: You can use the content type filter above to show only ${counterpartType} recommendations!`
      );

      if (!confirmed) {
        return; // User decided to keep it
      }
    }

    // Proceed with dismissal
    await handleNotInterested(itemUid, sectionType);
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
   * Handle quick-add to user list with enhanced UX
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

        // Show loading state immediately
        setAddingToList((prev) => new Set([...Array.from(prev), itemUid]));

        console.log(`📝 Adding ${itemTitle} (${itemUid}) to ${status}...`);

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

        console.log(`✅ Successfully added ${itemTitle} to ${status}`);

        // Show success state
        setRecentlyAdded((prev) => new Set([...Array.from(prev), itemUid]));

        // Hide success indicator after 2 seconds
        setTimeout(() => {
          setRecentlyAdded((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemUid);
            return newSet;
          });
        }, 2000);

        // Optimistically remove item from recommendations immediately
        setRemovedItems((prev) => new Set([...Array.from(prev), itemUid]));

        // Auto-refresh recommendations after successful addition
        setTimeout(() => {
          console.log("🔄 Auto-refreshing recommendations after add...");
          fetchRecommendations();
        }, 800); // Increased delay to ensure backend processing
      } catch (err: any) {
        console.error(`❌ Error adding ${itemTitle} to list:`, err);
        // Show error notification to user (you can enhance this with a toast system)
        alert(`Failed to add "${itemTitle}" to your list. Please try again.`);
      } finally {
        // Clear loading state
        setAddingToList((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemUid);
          return newSet;
        });
      }
    },
    [makeAuthenticatedRequest, fetchRecommendations]
  );

  /**
   * Handle completed item with rating and notes - Enhanced
   */
  const handleCompletedWithRating = useCallback(
    async (itemUid: string, rating: number, notes: string, sectionType: string) => {
      try {
        const itemTitle = showRatingModal.itemTitle;

        console.log(`📝 Adding ${itemTitle} (${itemUid}) to completed with rating ${rating}...`);

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

        console.log(`✅ Successfully added ${itemTitle} to completed with rating ${rating}`);

        // Close modal first for better UX
        setShowRatingModal({ show: false, itemUid: "", itemTitle: "", sectionType: "" });

        // Show success state
        setRecentlyAdded((prev) => new Set([...Array.from(prev), itemUid]));

        // Optimistically remove item from recommendations
        setRemovedItems((prev) => new Set([...Array.from(prev), itemUid]));

        // Auto-refresh recommendations after successful addition
        setTimeout(() => {
          console.log("🔄 Auto-refreshing recommendations after completed add...");
          fetchRecommendations();
        }, 800);

        // Hide success indicator after 2 seconds
        setTimeout(() => {
          setRecentlyAdded((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemUid);
            return newSet;
          });
        }, 2000);
      } catch (err: any) {
        console.error("❌ Error adding completed item:", err);
        alert(`Failed to add "${showRatingModal.itemTitle}" to your completed list. Please try again.`);
      }
    },
    [makeAuthenticatedRequest, fetchRecommendations, showRatingModal.itemTitle]
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

    // Get content type indicator
    const typeIndicator = getContentTypeIndicator(mediaType);

    // Skip rendering if item was removed
    if (removedItems.has(itemUid)) {
      return null;
    }

    return (
      <div key={`${sectionType}-${itemUid}-${itemIndex}`} className="recommendation-card-wrapper">
        <div className="recommendation-actions">
          <button
            onClick={() => handleNotInterestedWithSuggestion(itemUid, sectionType, title, mediaType)}
            className="not-interested-btn"
            title="Not interested"
            aria-label={`Mark ${title} as not interested`}
          >
            ✕
          </button>

          {/* Info Tooltip */}
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

          {/* Add to List Dropdown with Enhanced States */}
          <div className="add-to-list-container">
            <button
              className={`action-btn add-to-list-btn ${addingToList.has(itemUid) ? "loading" : ""} ${
                recentlyAdded.has(itemUid) ? "success" : ""
              }`}
              title={
                addingToList.has(itemUid)
                  ? "Adding to list..."
                  : recentlyAdded.has(itemUid)
                  ? "Added successfully!"
                  : "Add to List"
              }
              aria-label="Add to your list"
              disabled={addingToList.has(itemUid)}
            >
              {addingToList.has(itemUid) ? "⟳" : recentlyAdded.has(itemUid) ? "✓" : "➕"}
            </button>
            <div className="add-dropdown">
              <button
                className="dropdown-option"
                onClick={() => handleQuickAdd(itemUid, "plan_to_watch", sectionType, title)}
                disabled={addingToList.has(itemUid)}
              >
                📋 Plan to Watch
              </button>
              <button
                className="dropdown-option"
                onClick={() => handleQuickAdd(itemUid, "watching", sectionType, title)}
                disabled={addingToList.has(itemUid)}
              >
                👁️ Watching
              </button>
              <button
                className="dropdown-option"
                onClick={() => handleQuickAdd(itemUid, "on_hold", sectionType, title)}
                disabled={addingToList.has(itemUid)}
              >
                ⏸️ On Hold
              </button>
              <button
                className="dropdown-option"
                onClick={() => handleQuickAdd(itemUid, "completed", sectionType, title)}
                disabled={addingToList.has(itemUid)}
              >
                ✅ Completed
              </button>
            </div>
          </div>
        </div>

        <Link
          to={`/items/${itemUid}`}
          className="recommendation-card-link"
          aria-label={`View details for ${title}`}
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

              {/* Content Type Indicator */}
              <div className={`content-type-badge ${typeIndicator.className}`}>
                <span className="type-icon">{typeIndicator.icon}</span>
                <span className="type-label">{typeIndicator.label}</span>
              </div>

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

  /**
   * Get content type indicator
   */
  const getContentTypeIndicator = (mediaType: string) => {
    const type = mediaType?.toLowerCase();
    if (type === "anime") {
      return { icon: "📺", label: "Anime", className: "content-type-anime" };
    } else if (type === "manga") {
      return { icon: "📖", label: "Manga", className: "content-type-manga" };
    }
    return { icon: "❓", label: "Unknown", className: "content-type-unknown" };
  };

  if (loading) {
    return (
      <div className={`personalized-recommendations ${className}`}>
        <RecommendationsSkeleton sections={3} itemsPerSection={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`personalized-recommendations ${className}`}>
        <EmptyState
          type="error"
          title="Unable to Load Recommendations"
          description={error}
          actionButton={{
            text: "Try Again",
            onClick: fetchRecommendations,
            variant: "primary"
          }}
        />
      </div>
    );
  }

  if (!recommendations || !recommendations.recommendations) {
    return (
      <div className={`personalized-recommendations ${className}`}>
        <EmptyState
          type="no-recommendations"
          title="No Recommendations Available"
          description="Complete some anime or manga to get personalized recommendations! The more you add to your lists, the better our suggestions become."
          actionButton={{
            text: "Browse Anime & Manga",
            href: "/",
            variant: "primary"
          }}
          secondaryAction={{
            text: "Learn How Recommendations Work",
            href: "/help/recommendations"
          }}
        />
      </div>
    );
  }

  console.log("🔍 RENDER DEBUG - Current contentTypeFilter:", contentTypeFilter);
  console.log("🔍 RENDER DEBUG - Full recommendations object:", recommendations);

  const { recommendations: recs } = recommendations;

  // Filter out removed items from each section (backend handles content type filtering)
  const sections = [
    {
      title: "📊 Based on Your Completed Titles",
      subtitle: "Recommendations similar to anime and manga you've enjoyed",
      items: (recs.completed_based || []).filter((item: any) => !removedItems.has(item.item?.uid)),
      sectionType: "completed_based",
    },
    {
      title: "💎 Hidden Gems",
      subtitle: "Underrated titles that match your preferences",
      items: (recs.hidden_gems || []).filter((item: any) => !removedItems.has(item.item?.uid)),
      sectionType: "hidden_gems",
    },
    {
      title: "📈 Trending in Your Favorite Genres",
      subtitle: "Popular titles in genres you love",
      items: (recs.trending_genres || []).filter((item: any) => !removedItems.has(item.item?.uid)),
      sectionType: "trending_genres",
    },
  ];

  console.log(
    "🔍 SECTIONS DEBUG - sections created:",
    sections.map((s) => ({
      title: s.title,
      originalCount:
        s.sectionType === "completed_based"
          ? (recs.completed_based || []).length
          : s.sectionType === "hidden_gems"
          ? (recs.hidden_gems || []).length
          : (recs.trending_genres || []).length,
      filteredCount: s.items.length,
    }))
  );

  return (
    <div className={`personalized-recommendations ${className}`}>
      <div className="personalized-recommendations-header">
        <div className="section-title-container">
          <h2 className="section-title">🎯 Personalized Recommendations</h2>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="refresh-button"
            title="Refresh all recommendations"
          >
            {loading ? "🔄" : "🔄"}
          </button>
        </div>
        <p className="section-subtitle">Tailored suggestions based on your preferences and activity</p>
      </div>

      {/* Content Type Filter Controls */}
      <div className="content-type-filter">
        <div className="filter-group">
          <span className="filter-label">Show:</span>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${contentTypeFilter === "all" ? "active" : ""}`}
              onClick={() => {
                console.log("🔍 FILTER CLICK - Setting filter to: all");
                setContentTypeFilter("all");
              }}
            >
              📚 All Content
            </button>
            <button
              className={`filter-btn ${contentTypeFilter === "anime" ? "active" : ""}`}
              onClick={() => {
                console.log("🔍 FILTER CLICK - Setting filter to: anime");
                setContentTypeFilter("anime");
              }}
            >
              📺 Anime Only
            </button>
            <button
              className={`filter-btn ${contentTypeFilter === "manga" ? "active" : ""}`}
              onClick={() => {
                console.log("🔍 FILTER CLICK - Setting filter to: manga");
                setContentTypeFilter("manga");
              }}
            >
              📖 Manga Only
            </button>
          </div>
        </div>

        {/* Filter Result Summary */}
        {contentTypeFilter !== "all" && (
          <div className="filter-summary">
            <span className="filter-result-text">
              Showing {contentTypeFilter} only •
              {sections.reduce((total, section) => total + section.items.length, 0)} recommendations
            </span>
            <button
              className="clear-filter-btn"
              onClick={() => setContentTypeFilter("all")}
              title="Show all content types"
            >
              Clear Filter
            </button>
          </div>
        )}
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

      {/* Rating Modal for Completed Items - Rendered using Portal for proper centering */}
      {showRatingModal.show &&
        createPortal(
          <RatingModal
            isOpen={showRatingModal.show}
            itemTitle={showRatingModal.itemTitle}
            onSubmit={(rating, notes) =>
              handleCompletedWithRating(showRatingModal.itemUid, rating, notes, showRatingModal.sectionType)
            }
            onClose={() => setShowRatingModal({ show: false, itemUid: "", itemTitle: "", sectionType: "" })}
          />,
          document.body
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

    // Allow empty string, decimal point, and numbers during typing
    if (value === "" || value === "." || /^\d*\.?\d*$/.test(value)) {
      setRating(value);
    }
  };

  const handleRatingBlur = () => {
    // Only validate and fix on blur (when user finishes typing)
    if (rating === "" || rating === ".") {
      setRating("8.0");
      return;
    }

    const numValue = parseFloat(rating);
    if (isNaN(numValue)) {
      setRating("8.0");
    } else if (numValue < 1) {
      setRating("1.0");
    } else if (numValue > 10) {
      setRating("10.0");
    } else {
      // Format to one decimal place if it's a whole number
      setRating(numValue % 1 === 0 ? numValue.toFixed(1) : rating);
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
                  onBlur={handleRatingBlur}
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
