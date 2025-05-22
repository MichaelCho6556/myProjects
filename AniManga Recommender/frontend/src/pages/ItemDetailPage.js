import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import "./ItemDetail.css";

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

  if (loadingItem && !item) return <p className="loading-message">Loading item details...</p>; // Show loading only if item is not yet set
  if (itemError)
    return (
      <p style={{ color: "red" }} className="error-message">
        Error loading item: {itemError}
      </p>
    );
  if (!item) return <p className="info-message">Item not found or still loading.</p>; // Fallback if item is null after loading attempt

  const youtubeID = item.trailer_url ? getYouTubeID(item.trailer_url) : null;

  return (
    <div className="item-detail-page">
      <Link to="/" className="back-link">
        ← Back to list
      </Link>
      <h2>{item.title || "No Title"}</h2>
      <div className="item-detail-content">
        <div className="item-detail-image">
          <img
            src={item.main_picture || DEFAULT_PLACEHOLDER_IMAGE}
            alt={item.title || "Item image"}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_PLACEHOLDER_IMAGE;
            }}
          />
        </div>
        <div className="item-detail-info">
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
          )}{" "}
          {/* e.g., PG-13, R */}
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
        </div>
      </div>

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
        {loadingRecs && <p className="loading-message">Loading recommendations...</p>}
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
    </div>
  );
}
export default ItemDetailPage;
