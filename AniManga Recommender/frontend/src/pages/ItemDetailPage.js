import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import "./ItemDetail.css";

const API_BASE_URL = "http://localhost:5000/api";
const DEFAULT_PLACEHOLDER_IMAGE = "https://via.placeholder.com/300x450.png?text=No+Image"; // Larger placeholder

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
    if (!tagArray || !Array.isArray(tagArray) || tagArray.length === 0) {
      return null;
    }
    return (
      <div className="tag-list-container">
        <strong>{label}: </strong>
        {tagArray.map((tag, index) => {
          if (typeof tag !== "string" || !tag.trim()) {
            // Add a check for valid tag
            return null; // Skip empty or non-string tags
          }
          return (
            <Link
              key={`${filterType}-${tag.trim()}-${index}`} // Use tag.trim() in key for consistency
              to={{
                pathname: "/", // Go to the HomePage
                search: `?${filterType}=${encodeURIComponent(tag.trim())}`, // Construct search params
              }}
              className="tag-link"
            >
              {tag.trim()} {/* Display trimmed tag */}
            </Link>
          );
        })}
      </div>
    );
  };

  if (loadingItem) return <p>Loading item details...</p>;
  if (itemError) return <p style={{ color: "red" }}>Error: {itemError}</p>;
  if (!item) return <p>Item not found.</p>;

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
            alt={item.title}
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
          </p>
          {item.status && (
            <p>
              <strong>Status:</strong> {item.status}
            </p>
          )}
          {item.media_type === "anime" && item.episodes > 0 && (
            <p>
              <strong>Episodes:</strong> {item.episodes}
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
          {renderClickableTags(item.genres, "genre", "Genres")}
          {renderClickableTags(item.themes, "themes", "Themes")}
          {renderClickableTags(item.demographics, "deomographics", "Demographics")}
          {item.media_type === "anime" && renderClickableTags(item.studios, "studio", "Studios")}
          {item.media_type === "manga" && renderClickableTags(item.authors, "author", "Authors")}
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
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                View on MyAnimeList
              </a>
            </p>
          )}
          {item.trailer_url && item.media_type === "anime" && (
            <p>
              <a href={item.trailer_url} target="_blank" rel="noopener noreferrer">
                Watch Trailer
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="recommendations-section">
        <h3>Recommended for you:</h3>
        {loadingRecs && <p>Loading recommendations...</p>}
        {recsError && <p style={{ color: "red" }}>Error loading recommendations: {recsError}</p>}
        {!loadingRecs && !recsError && recommendations.length > 0 && (
          <div className="item-list recommendations-list">
            {" "}
            {/* Re-use item-list styling or create specific */}
            {recommendations.map((recItem) => (
              <ItemCard key={recItem.uid} item={recItem} />
            ))}
          </div>
        )}
        {!loadingRecs && !recsError && recommendations.length === 0 && (
          <p>No recommendations found for this item.</p>
        )}
      </div>
    </div>
  );
}
export default ItemDetailPage;
