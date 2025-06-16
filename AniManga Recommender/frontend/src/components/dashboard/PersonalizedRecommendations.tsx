/**
 * PersonalizedRecommendations Component
 *
 * Displays personalized anime/manga recommendations by calling the API endpoint
 * implemented in Task 1.2. Shows a placeholder if no recommendations are available.
 *
 * @component
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { PersonalizedRecommendationsProps } from "../../types";
import Spinner from "../Spinner";

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
            <h3>{section.title}</h3>
            <p>{section.subtitle}</p>
            <div className="recommendation-items">
              {section.items.map((item: any, itemIndex: number) => {
                // Extract the actual anime/manga data from the nested structure
                const animeData = item.item; // The actual anime/manga data is in item.item
                const title = animeData?.title || animeData?.name || "Unknown Title";
                const reasoning = item.reasoning || "No reasoning provided";
                const score = item.recommendation_score || 0;
                const mediaType = animeData?.media_type || "Unknown";
                const genres = animeData?.genres || [];
                const rating = animeData?.rating || animeData?.score || "N/A";

                return (
                  <div key={itemIndex} className="recommendation-item">
                    <div className="item-header">
                      <h4>{title}</h4>
                      <span className="item-type">{mediaType}</span>
                    </div>
                    <p className="item-reasoning">{reasoning}</p>
                    <div className="item-details">
                      <span className="item-rating">📊 {rating}/10</span>
                      <span className="item-score">🎯 {score.toFixed(2)}</span>
                    </div>
                    {genres.length > 0 && (
                      <div className="item-genres">
                        {genres.slice(0, 3).map((genre: string, idx: number) => (
                          <span key={idx} className="genre-tag">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
