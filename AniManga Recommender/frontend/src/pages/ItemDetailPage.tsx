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
        if (recommendationsResponse.data && Array.isArray(recommendationsResponse.data)) {
          setRecommendations(recommendationsResponse.data);
        }
      } catch (error) {
        console.warn("Failed to load recommendations:", error);
        // Don't show error to user for recommendations failure
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

  const handleGenreClick = (genre: string) => {
    navigate(`/search?genre=${encodeURIComponent(genre)}`);
  };

  const handleMediaTypeClick = (mediaType: string) => {
    navigate(`/search?media_type=${encodeURIComponent(mediaType)}`);
  };

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
        {/* Back button */}
        <button
          onClick={handleBackClick}
          className="btn btn-back"
          aria-label="Go back to previous page"
          type="button"
        >
          Back
        </button>

        {/* Item details */}
        <div className="item-detail-content">
          <div className="item-image-section">
            <img
              src={item.image_url || getDefaultImage()}
              alt={`Cover for ${item.title}`}
              className="item-image"
            />
          </div>

          <div className="item-info-section">
            <h1>{item.title}</h1>

            {/* Media type */}
            <button
              onClick={() => handleMediaTypeClick(item.media_type)}
              className="btn btn-tag media-type-tag"
              type="button"
            >
              {item.media_type.toUpperCase()}
            </button>

            {/* Score */}
            <div className="score-section" aria-label={`Score: ${formatScore(item.score)}`}>
              <span className="score">{formatScore(item.score)}</span>
              {item.scored_by && <span className="scored-by">({formatScoredBy(item.scored_by)})</span>}
            </div>

            {/* Status */}
            <div className="status-section" aria-label={`Status: ${item.status}`}>
              <span className="label">Status:</span>
              <span className="value">{item.status}</span>
            </div>

            {/* Episodes/Chapters */}
            {item.media_type === "anime" && item.episodes && (
              <div className="episodes-section">
                <span className="label">Episodes:</span>
                <span className="value">{item.episodes}</span>
              </div>
            )}

            {item.media_type === "manga" && (
              <>
                {item.chapters && (
                  <div className="chapters-section">
                    <span className="label">Chapters:</span>
                    <span className="value">{item.chapters}</span>
                  </div>
                )}
                {item.volumes && (
                  <div className="volumes-section">
                    <span className="label">Volumes:</span>
                    <span className="value">{item.volumes}</span>
                  </div>
                )}
              </>
            )}

            {/* Start date */}
            {item.start_date && (
              <div className="start-date-section">
                <span className="label">Start Date:</span>
                <span className="value">{item.start_date}</span>
              </div>
            )}

            {/* Rating */}
            {item.rating && (
              <div className="rating-section">
                <span className="label">Rating:</span>
                <span className="value">{item.rating}</span>
              </div>
            )}

            {/* Synopsis */}
            <div className="synopsis-section">
              <h2>Synopsis</h2>
              <p>{item.synopsis || "No synopsis available."}</p>
            </div>

            {/* Genres */}
            <div className="genres-section">
              <h3>Genres</h3>
              {item.genres && item.genres.length > 0 ? (
                <div className="tags-container">
                  {item.genres.map((genre, index) => (
                    <button
                      key={index}
                      onClick={() => handleGenreClick(genre)}
                      className="btn btn-tag genre-tag"
                      type="button"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              ) : (
                <p>No genres available.</p>
              )}
            </div>

            {/* Themes */}
            {item.themes && item.themes.length > 0 && (
              <div className="themes-section">
                <h3>Themes</h3>
                <div className="tags-container">
                  {item.themes.map((theme, index) => (
                    <span key={index} className="tag theme-tag">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Demographics */}
            {item.demographics && item.demographics.length > 0 && (
              <div className="demographics-section">
                <h3>Demographics</h3>
                <div className="tags-container">
                  {item.demographics.map((demographic, index) => (
                    <span key={index} className="tag demographic-tag">
                      {demographic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Producers */}
            {item.producers && item.producers.length > 0 && (
              <div className="producers-section">
                <h3>Producers</h3>
                <div className="list-container">
                  {item.producers.map((producer, index) => (
                    <span key={index} className="list-item">
                      {producer}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Studios */}
            {item.studios && item.studios.length > 0 && (
              <div className="studios-section">
                <h3>Studios</h3>
                <div className="list-container">
                  {item.studios.map((studio, index) => (
                    <span key={index} className="list-item">
                      {studio}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations section */}
        {recommendations.length > 0 && (
          <div className="recommendations-section">
            <h2>Recommendations</h2>
            <div className="recommendations-grid">
              {recommendations.map((recItem) => (
                <ItemCard key={recItem.uid} item={recItem} />
              ))}
            </div>
          </div>
        )}
      </div>

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
    </main>
  );
};

export default ItemDetailPage;
