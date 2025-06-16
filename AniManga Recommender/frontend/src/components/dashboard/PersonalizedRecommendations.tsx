/**
 * PersonalizedRecommendations Component
 *
 * Displays personalized anime/manga recommendations by calling the API endpoint
 * implemented in Task 1.2. Shows recommendations in a proper card grid layout
 * with responsive design and consistent styling.
 *
 * @component
 */

import React, { useState, useEffect } from "react";
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
   * Handle image load error by falling back to default placeholder
   */
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = event.target as HTMLImageElement;
    target.src = DEFAULT_PLACEHOLDER_IMAGE;
  };

  /**
   * Render individual recommendation card
   */
  const renderRecommendationCard = (item: any, itemIndex: number) => {
    // Extract the actual anime/manga data from the nested structure
    const animeData = item.item; // The actual anime/manga data is in item.item
    const title = animeData?.title || animeData?.name || "Unknown Title";
    const reasoning = item.reasoning || "No reasoning provided";
    const score = item.recommendation_score || 0;
    const mediaType = animeData?.media_type || animeData?.mediaType || "Unknown";
    const genres = animeData?.genres || [];
    const rating = animeData?.rating || animeData?.score || "N/A";

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

    // Debug logging to understand the data structure
    console.log("🔍 Recommendation item debug:", {
      title,
      imageUrl,
      animeData: animeData ? Object.keys(animeData) : "no animeData",
      hasImageUrl: !!animeData?.image_url,
      hasImageUrlAlt: !!animeData?.imageUrl,
      hasMainPicture: !!animeData?.main_picture,
      fullItem: item,
    });

    return (
      <Link
        key={itemIndex}
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
    },
    {
      title: "💎 Hidden Gems",
      subtitle: "Underrated titles that match your preferences",
      items: recs.hidden_gems || [],
    },
    {
      title: "📈 Trending in Your Favorite Genres",
      subtitle: "Popular titles in genres you love",
      items: recs.trending_genres || [],
    },
  ];

  return (
    <div className={`personalized-recommendations ${className}`}>
      <div className="recommendations-header">
        <h2>🎯 Personalized Recommendations</h2>
        <button onClick={handleRefresh} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      <div className="recommendations-content">
        {sections.map((section, index) => (
          <div key={index} className="recommendation-section">
            <div className="section-header">
              <h3>{section.title}</h3>
              <p className="section-subtitle">{section.subtitle}</p>
            </div>

            {section.items.length > 0 ? (
              <div className="recommendation-grid">
                {section.items.map((item: any, itemIndex: number) =>
                  renderRecommendationCard(item, itemIndex)
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
    </div>
  );
};

export default React.memo(PersonalizedRecommendations);
