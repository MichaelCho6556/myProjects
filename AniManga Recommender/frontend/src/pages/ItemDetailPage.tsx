import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import "./ItemDetail.css";
import Spinner from "../components/Spinner";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { AnimeItem } from "../types";

const API_BASE_URL = "http://localhost:5000/api";
const DEFAULT_PLACEHOLDER_IMAGE = "/images/default.webp";

/**
 * Extract YouTube video ID from URL
 */
const getYouTubeID = (url?: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

/**
 * ItemDetailPage Component
 * Displays detailed information about an anime or manga item
 */
const ItemDetailPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<AnimeItem | null>(null);
  const [recommendations, setRecommendations] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic document title
  useDocumentTitle(
    item
      ? `${item.title} - ${item.media_type?.toUpperCase() || "Details"} | AniManga Recommender`
      : loading
      ? "Loading... | AniManga Recommender"
      : "Item Details | AniManga Recommender"
  );

  const loadItemData = useCallback(async () => {
    if (!uid) {
      setError("Invalid item ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Fetch item details
      const response = await axios.get(`${API_BASE_URL}/items/${uid}`);
      const itemData = response.data;

      if (!itemData || !itemData.uid) {
        setError("Item not found");
        setLoading(false);
        return;
      }

      setItem(itemData);

      // Fetch recommendations in parallel
      try {
        const recommendationsResponse = await axios.get(`${API_BASE_URL}/recommendations/${uid}?n=10`);

        // Handle the actual backend response format
        if (
          recommendationsResponse.data &&
          recommendationsResponse.data.recommendations &&
          Array.isArray(recommendationsResponse.data.recommendations)
        ) {
          setRecommendations(recommendationsResponse.data.recommendations);
        } else if (recommendationsResponse.data && Array.isArray(recommendationsResponse.data)) {
          // Fallback for direct array response
          setRecommendations(recommendationsResponse.data);
        } else {
          console.warn("Unexpected recommendations response format:", recommendationsResponse.data);
          setRecommendations([]);
        }
      } catch (error) {
        console.warn("Failed to load recommendations:", error);
        // Don't show error to user for recommendations failure
        setRecommendations([]);
      }
    } catch (error) {
      // Check if it's an axios-like error by looking at the error structure
      const errorObj = error as any;
      if (errorObj?.response?.status) {
        if (errorObj.response.status === 404) {
          setError("Item not found. Please check the URL and try again.");
        } else {
          setError("Failed to load item details. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadItemData();
  }, [uid, loadItemData]);

  const handleBackClick = () => {
    navigate(-1);
  };

  const formatScore = (score: number | null) => {
    if (!score || score === 0) return "N/A";
    return score.toFixed(2);
  };

  const formatScoredBy = (scoredBy: number | null) => {
    if (scoredBy === null || scoredBy === undefined) return "";
    return scoredBy.toLocaleString();
  };

  const getDefaultImage = () => DEFAULT_PLACEHOLDER_IMAGE;

  if (loading) {
    return (
      <main className="loading-container" role="main" aria-live="polite">
        <div className="loading-content">
          <Spinner aria-label="Loading" />
          <p>Loading item details...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="error-container" role="main">
        <div className="error-content">
          <h1>Error</h1>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleBackClick} className="btn btn-secondary">
              Back
            </button>
            <Link to="/" className="btn btn-primary">
              Go to Homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="error-container" role="main">
        <div className="error-content">
          <h1>Item not found</h1>
          <p>The requested item could not be found.</p>
          <Link to="/" className="btn btn-primary">
            Go to Homepage
          </Link>
        </div>
      </main>
    );
  }

  const youtubeID = item.trailer_url ? getYouTubeID(item.trailer_url) : null;

  return (
    <main className="item-detail-page" role="main">
      <div className="item-detail-container">
        {/* Back Link */}
        <Link to="/" className="back-link" aria-label="Go back to previous page">
          Back
        </Link>

        {/* Item Title */}
        <h2>{item.title}</h2>

        {/* Item Details Content */}
        <div className="item-detail-content">
          {/* Image Section */}
          <div className="item-detail-image">
            <img
              src={item.image_url || getDefaultImage()}
              alt={`Cover for ${item.title}`}
              className="item-image"
            />
          </div>

          {/* Info Section */}
          <div className="item-detail-info">
            {/* Media Type */}
            <p>
              <strong>Type:</strong>
              <Link to={`/?media_type=${encodeURIComponent(item.media_type)}`} className="tag-link">
                {item.media_type.toUpperCase()}
              </Link>
            </p>

            {/* Score */}
            <p>
              <strong>Score:</strong>
              {formatScore(item.score)}
              {item.scored_by && ` (${formatScoredBy(item.scored_by)} users)`}
            </p>

            {/* Status */}
            <p>
              <strong>Status:</strong>
              {item.status}
            </p>

            {/* Episodes/Chapters */}
            {item.media_type === "anime" && item.episodes && (
              <p>
                <strong>Episodes:</strong>
                {item.episodes}
              </p>
            )}

            {item.media_type === "manga" && (
              <>
                {item.chapters && (
                  <p>
                    <strong>Chapters:</strong>
                    {item.chapters}
                  </p>
                )}
                {item.volumes && (
                  <p>
                    <strong>Volumes:</strong>
                    {item.volumes}
                  </p>
                )}
              </>
            )}

            {/* Start Date */}
            {item.start_date && (
              <p>
                <strong>Start Date:</strong>
                {item.start_date}
              </p>
            )}

            {/* Rating */}
            {item.rating && (
              <p>
                <strong>Rating:</strong>
                {item.rating}
              </p>
            )}

            {/* Genres */}
            {item.genres && item.genres.length > 0 && (
              <div className="tag-list-container">
                <strong>Genres:</strong>
                {item.genres.map((genre, index) => (
                  <Link key={index} to={`/?genre=${encodeURIComponent(genre)}`} className="tag-link">
                    {genre}
                  </Link>
                ))}
              </div>
            )}

            {/* Themes */}
            {item.themes && item.themes.length > 0 && (
              <div className="tag-list-container">
                <strong>Themes:</strong>
                {item.themes.map((theme, index) => (
                  <Link key={index} to={`/?theme=${encodeURIComponent(theme)}`} className="tag-link">
                    {theme}
                  </Link>
                ))}
              </div>
            )}

            {/* Demographics */}
            {item.demographics && item.demographics.length > 0 && (
              <div className="tag-list-container">
                <strong>Demographics:</strong>
                {item.demographics.map((demographic, index) => (
                  <Link
                    key={index}
                    to={`/?demographic=${encodeURIComponent(demographic)}`}
                    className="tag-link"
                  >
                    {demographic}
                  </Link>
                ))}
              </div>
            )}

            {/* Producers */}
            {item.producers && item.producers.length > 0 && (
              <p>
                <strong>Producers:</strong>
                {item.producers.join(", ")}
              </p>
            )}

            {/* Studios */}
            {item.studios && item.studios.length > 0 && (
              <p>
                <strong>Studios:</strong>
                {item.studios.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Synopsis Section */}
        {item.synopsis && (
          <div className="synopsis-section">
            <strong>Synopsis</strong>
            <p>{item.synopsis}</p>
          </div>
        )}

        {/* Trailer Section */}
        {youtubeID && item.media_type === "anime" && (
          <div className="trailer-section">
            <h3>Trailer</h3>
            <div className="video-responsive">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeID}`}
                title={`${item.title} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="recommendations-section">
            <h3>Recommendations</h3>
            <div className="recommendations-list item-list">
              {recommendations.map((recItem) => (
                <ItemCard key={recItem.uid} item={recItem} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ItemDetailPage;
