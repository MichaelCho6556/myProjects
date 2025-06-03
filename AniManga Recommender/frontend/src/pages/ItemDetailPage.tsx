import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import "./ItemDetail.css";
import Spinner from "../components/Spinner";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { AnimeItem } from "../types";
import { useAuth } from "../context/AuthContext";
import UserListActions from "../components/UserListActions";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
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
  const { user } = useAuth();

  // Dynamic document title
  useDocumentTitle(
    item
      ? `${item.title} - ${item.media_type?.toUpperCase() || "Details"}`
      : loading
      ? "Loading..."
      : "Item Details"
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

      // Fetch item details - Using correct API endpoint
      const response = await axios.get(`${API_BASE_URL}/api/items/${uid}`);
      const itemData = response.data;

      if (!itemData || !itemData.uid) {
        setError("Item not found");
        setLoading(false);
        return;
      }

      setItem(itemData);

      // Fetch recommendations in parallel
      try {
        const recommendationsResponse = await axios.get(`${API_BASE_URL}/api/recommendations/${uid}?n=10`);

        if (
          recommendationsResponse.data &&
          recommendationsResponse.data.recommendations &&
          Array.isArray(recommendationsResponse.data.recommendations)
        ) {
          setRecommendations(recommendationsResponse.data.recommendations);
        } else if (recommendationsResponse.data && Array.isArray(recommendationsResponse.data)) {
          setRecommendations(recommendationsResponse.data);
        } else {
          console.warn("Unexpected recommendations response format:", recommendationsResponse.data);
          setRecommendations([]);
        }
      } catch (error) {
        console.warn("Failed to load recommendations:", error);
        setRecommendations([]);
      }
    } catch (error) {
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

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = event.target as HTMLImageElement;
    target.src = DEFAULT_PLACEHOLDER_IMAGE;
  };

  const handleStatusUpdate = () => {
    console.log("Status updated successfully!");
  };

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
          ← Back
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
              onError={handleImageError}
            />
          </div>

          {/* Info Section */}
          <div className="item-detail-info">
            {/* Media Type */}
            <p>
              <strong>Type:</strong>
              <Link
                to={`/?media_type=${encodeURIComponent(item.media_type)}`}
                className="tag-link"
                title={`View all ${item.media_type}`}
              >
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
            {item.status && (
              <p>
                <strong>Status:</strong>
                <Link
                  to={`/?status=${encodeURIComponent(item.status)}`}
                  className="tag-link"
                  title={`View all ${item.status} items`}
                >
                  {item.status}
                </Link>
              </p>
            )}

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
                <div className="tags-wrapper">
                  {item.genres.map((genre, index) => (
                    <Link
                      key={`genre-${index}`}
                      to={`/?genre=${encodeURIComponent(genre)}`}
                      className="tag-link"
                      title={`View all ${genre} items`}
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Themes */}
            {item.themes && item.themes.length > 0 && (
              <div className="tag-list-container">
                <strong>Themes:</strong>
                <div className="tags-wrapper">
                  {item.themes.map((theme, index) => (
                    <Link
                      key={`theme-${index}`}
                      to={`/?theme=${encodeURIComponent(theme)}`}
                      className="tag-link"
                      title={`View all ${theme} themed items`}
                    >
                      {theme}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Demographics */}
            {item.demographics && item.demographics.length > 0 && (
              <div className="tag-list-container">
                <strong>Demographics:</strong>
                <div className="tags-wrapper">
                  {item.demographics.map((demographic, index) => (
                    <Link
                      key={`demographic-${index}`}
                      to={`/?demographic=${encodeURIComponent(demographic)}`}
                      className="tag-link"
                      title={`View all ${demographic} items`}
                    >
                      {demographic}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Studios */}
            {item.studios && item.studios.length > 0 && (
              <div className="tag-list-container">
                <strong>Studios:</strong>
                <div className="tags-wrapper">
                  {item.studios.map((studio, index) => (
                    <Link
                      key={`studio-${index}`}
                      to={`/?studio=${encodeURIComponent(studio)}`}
                      className="tag-link"
                      title={`View all items by ${studio}`}
                    >
                      {studio}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Authors */}
            {item.authors && item.authors.length > 0 && (
              <div className="tag-list-container">
                <strong>Authors:</strong>
                <div className="tags-wrapper">
                  {item.authors.map((author, index) => (
                    <Link
                      key={`author-${index}`}
                      to={`/?author=${encodeURIComponent(author)}`}
                      className="tag-link"
                      title={`View all items by ${author}`}
                    >
                      {author}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Producers (non-clickable for now) */}
            {item.producers && item.producers.length > 0 && (
              <p>
                <strong>Producers:</strong>
                {item.producers.join(", ")}
              </p>
            )}

            {/* External Links */}
            {item.external_links && item.external_links.length > 0 && (
              <div className="tag-list-container">
                <strong>External Links:</strong>
                <div className="tags-wrapper">
                  {item.external_links.map((link, index) => (
                    <a
                      key={`link-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="external-link"
                    >
                      {link.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* User List Actions - Only show when user is signed in */}
            {user && (
              <div className="user-list-actions-container">
                <UserListActions item={item} onStatusUpdate={handleStatusUpdate} />
              </div>
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

        {/* Background Section */}
        {item.background && (
          <div className="background-section">
            <strong>Background</strong>
            <p>{item.background}</p>
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
