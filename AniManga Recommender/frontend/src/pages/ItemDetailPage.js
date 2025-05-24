import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import "./ItemDetail.css";
import Spinner from "../components/Spinner";
import useDocumentTitle from "../hooks/useDocumentTitle";

const API_BASE_URL = "http://localhost:5000/api";
const DEFAULT_PLACEHOLDER_IMAGE = "/images/default.webp";

const getYouTubeID = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const renderSimpleList = (listData, label) => {
  if (!listData || !Array.isArray(listData) || listData.length === 0) {
    if (typeof listData === "string" && listData.trim() !== "") {
      return (
        <p>
          <strong>{label}:</strong> {listData}
        </p>
      );
    }
    return null;
  }
  const filteredList = listData.filter((item) => typeof item === "string" && item.trim() !== "");
  if (filteredList.length === 0) return null;
  return (
    <p>
      <strong>
        {label}: {filteredList.join(", ")}
      </strong>
    </p>
  );
};

function ItemDetailPage() {
  const { uid } = useParams(); // Get the 'uid' from the URL parameter
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [itemError, setItemError] = useState(null);

  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState(null);

  // Dynamic document title
  useDocumentTitle(
    item
      ? `${item.title} - ${item.media_type?.toUpperCase() || "Details"} | AniManga Recommender`
      : loadingItem
      ? "Loading... | AniManga Recommender"
      : "Item Details | AniManga Recommender"
  );

  useEffect(() => {
    const fetchAllData = async () => {
      if (!uid) return; // Don't fetch if uid is not available

      setLoadingItem(true);
      setItemError(null);
      setItem(null);

      setLoadingRecs(true);
      setRecsError(null);
      setRecommendations([]);

      window.scrollTo(0, 0);
      try {
        console.log(`Fetching details for UID: ${uid}`);
        const itemResponse = await axios.get(`${API_BASE_URL}/items/${uid}`);

        let itemData = itemResponse.data;
        if (typeof itemData === "string") {
          try {
            itemData = JSON.parse(itemData);
          } catch (e) {
            throw new Error("Item detail data is not valid JSON");
          }
        }
        setItem(itemData);
        setLoadingItem(false);

        console.log(`Fetching recommendation for UID: ${uid}`);
        const recsResponse = await axios.get(`${API_BASE_URL}/recommendations/${uid}?n=10`);
        let recsData = recsResponse.data;
        if (typeof recsData === "string") {
          try {
            recsData = JSON.parse(recsData);
          } catch (e) {
            throw new Error("Recommendations data is not valid JSON");
          }
        }

        if (recsData && Array.isArray(recsData.recommendations)) {
          setRecommendations(recsData.recommendations);
        } else {
          console.error("unexpected recommendations structure:", recsData);
          setRecommendations([]);
        }
      } catch (err) {
        console.error(`Failed to fetch item ${uid}:`, err);
        if (!item) {
          setItemError(err.message || `Failed to fetch item ${uid}.`);
          setLoadingItem(false);
        }
        setRecsError(err.message || `Failed to fetch recommendations for ${uid}.`);
      } finally {
        setLoadingItem(false);
        setLoadingRecs(false);
      }
    };

    fetchAllData();
  }, [uid]);

  //helper to render clickable tags
  const renderClickableTags = (tagArray, filterType, label) => {
    if (!tagArray || !Array.isArray(tagArray) || tagArray.length === 0) return null;
    const validTags = tagArray.filter((tag) => typeof tag === "string" && tag.trim() !== "");
    if (validTags.length === 0) return null;
    return (
      <div className="tag-list-container">
        <strong>{label}: </strong>
        {validTags.map((tag, index) => (
          <Link
            key={`${filterType}-${tag.trim()}-${index}`}
            to={{ pathname: "/", search: `?${filterType}=${encodeURIComponent(tag.trim())}` }}
            className="tag-link"
          >
            {tag.trim()}
          </Link>
        ))}
      </div>
    );
  };

  if (loadingItem && !item)
    return (
      <main className="loading-container" role="main" aria-live="polite">
        <div className="loading-content">
          <Spinner size="80px" />
          <p>Loading item details...</p>
        </div>
      </main>
    );

  if (itemError)
    return (
      <main className="error-container" role="main">
        <section className="error-state" role="alert">
          <div className="error-content">
            <div className="error-icon" aria-hidden="true">
              ⚠️
            </div>
            <h1>Unable to Load Item</h1>
            <p>We couldn't load the details for this item. Please try again later.</p>
            <details>
              <summary>Technical details</summary>
              <p>{itemError}</p>
            </details>
            <div className="error-actions">
              <Link to="/" className="btn-primary">
                ← Back to Home
              </Link>
              <button onClick={() => window.location.reload()} className="retry-button">
                Try Again
              </button>
            </div>
          </div>
        </section>
      </main>
    );

  if (!item)
    return (
      <main role="main">
        <p className="info-message">Item not found.</p>
        <Link to="/" className="btn-primary">
          ← Back to Home
        </Link>
      </main>
    );

  const youtubeID = item.trailer_url ? getYouTubeID(item.trailer_url) : null;

  return (
    <main className="item-detail-page" role="main">
      <nav aria-label="Breadcrumb">
        <Link to="/" className="back-link" aria-label="Go back to anime and manga list">
          ← Back to list
        </Link>
      </nav>

      <article className="item-detail-article">
        <header>
          <h1>{item.title || "No Title"}</h1>
        </header>

        <div className="item-detail-content">
          <div className="item-detail-image">
            <img
              src={item.image_url || item.main_picture || DEFAULT_PLACEHOLDER_IMAGE}
              alt={`Cover image for ${item.title || "Unknown title"}`}
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_PLACEHOLDER_IMAGE;
              }}
            />
          </div>

          <section className="item-detail-info" aria-label="Item details">
            <p>
              <strong>Type:</strong> {item.media_type ? item.media_type.toUpperCase() : "N/A"}
            </p>
            <p>
              <strong>Score:</strong> {item.score ? parseFloat(item.score).toFixed(2) : "N/A"}
              {item.scored_by ? ` (by ${item.scored_by.toLocaleString()} users)` : ""}
            </p>
            {item.status && (
              <p>
                <strong>Status:</strong> {item.status}
              </p>
            )}
            {item.rating && item.rating !== "Unknown" && (
              <p>
                <strong>Rating:</strong> {item.rating.toUpperCase()}
              </p>
            )}
            {item.media_type === "anime" && item.episodes > 0 && (
              <p>
                <strong>Episodes:</strong> {item.episodes}
              </p>
            )}
            {item.media_type === "anime" && item.episode_duration && (
              <p>
                <strong>Duration:</strong> {item.episode_duration}
              </p>
            )}
            {item.media_type === "manga" && item.chapters > 0 && (
              <p>
                <strong>Chapters:</strong> {item.chapters}
              </p>
            )}
            {item.media_type === "manga" && item.volumes > 0 && (
              <p>
                <strong>Volumes:</strong> {item.volumes}
              </p>
            )}
            {item.start_date && (
              <p>
                <strong>Start Date:</strong> {new Date(item.start_date).toLocaleDateString()}
              </p>
            )}
            {item.end_date && (
              <p>
                <strong>End Date:</strong> {new Date(item.end_date).toLocaleDateString()}
              </p>
            )}
            {renderClickableTags(item.genres, "genre", "Genres")}
            {renderClickableTags(item.themes, "theme", "Themes")}
            {renderClickableTags(item.demographics, "demographic", "Demographics")}
            {item.media_type === "anime" && renderClickableTags(item.studios, "studio", "Studios")}
            {renderSimpleList(item.producers, "Producers")}
            {renderSimpleList(item.licensors, "Licensors")}
            {item.media_type === "manga" && renderClickableTags(item.authors, "author", "Authors")}
            {renderSimpleList(item.serializations, "Serializations")}
            {renderSimpleList(item.title_synonyms, "Other Titles")}
            {item.synopsis && (
              <div className="synopsis-section">
                <strong>Synopsis:</strong>
                <p>{item.synopsis}</p>
              </div>
            )}
            {item.background && (
              <div className="background-section">
                <strong>Background:</strong>
                <p>{item.background}</p>
              </div>
            )}
            {item.url && (
              <p>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="external-link">
                  View on MyAnimeList
                </a>
              </p>
            )}
          </section>
        </div>
      </article>

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
            ></iframe>
          </div>
        </div>
      )}

      <div className="recommendations-section">
        <h3>Recommended for you:</h3>
        {loadingRecs && (
          <div
            className="loading-container"
            style={{ display: "flex", justifyContent: "center", padding: "30px" }}
          >
            <Spinner size="50px" />
          </div>
        )}
        {recsError && (
          <p style={{ color: "red" }} className="error-message">
            Error loading recommendations: {recsError}
          </p>
        )}
        {!loadingRecs && !recsError && recommendations.length > 0 && (
          <div className="item-list recommendations-list">
            {recommendations.map((recItem) => (
              <ItemCard key={recItem.uid} item={recItem} />
            ))}
          </div>
        )}
        {!loadingRecs && !recsError && recommendations.length === 0 && (
          <div className="empty-state-container">
            <div className="empty-state-icon">🤷</div>
            <p className="empty-state-message">No specific recommendations found for this item.</p>
          </div>
        )}
      </div>
    </main>
  );
}
export default ItemDetailPage;
