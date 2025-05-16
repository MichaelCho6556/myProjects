import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import "./ItemDetail.css";

const API_BASE_URL = "http://localhost:5000/api";
const DEFAULT_PLACEHOLDER_IMAGE =
  "https://via.placeholder.com/300x450.png?text=No+Image"; // Larger placeholder

function ItemDetailPage() {
  const { uid } = useParams(); // Get the 'uid' from the URL parameter
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Recommendations state (we'll add logic for this later)
  // const [recommendations, setRecommendations] = useState([]);
  // const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    const fetchItemDetails = async () => {
      if (!uid) return; // Don't fetch if uid is not available

      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/items/${uid}`); // Corrected endpoint

        let responseData = response.data;
        if (typeof responseData === "string") {
          try {
            responseData = JSON.parse(responseData);
          } catch (parseError) {
            console.error("Failed to parse item detail as JSON:", parseError);
            setItem(null);
            setError("Received invalid data for item detail.");
            return;
          }
        }
        setItem(responseData);
      } catch (err) {
        console.error(`Failed to fetch item ${uid}:`, err);
        setError(err.message || `Failed to fetch item ${uid}.`);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
    // TODO: Fetch recommendations here as well in a separate call or combined logic

    // Scroll to top when component mounts or uid changes
    window.scrollTo(0, 0);
  }, [uid]); // Re-fetch if the uid parameter changes

  if (loading) return <p>Loading item details...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!item) return <p>Item not found.</p>;

  // Helper to display list data
  const renderList = (listData, label) => {
    if (!listData || (Array.isArray(listData) && listData.length === 0)) {
      return null; // Don't render if empty or not an array
    }
    const displayString = Array.isArray(listData)
      ? listData.join(", ")
      : typeof listData === "string"
      ? listData
      : "";
    return displayString ? (
      <p>
        <strong>{label}:</strong> {displayString}
      </p>
    ) : null;
  };

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
            <strong>Type:</strong>{" "}
            {item.media_type ? item.media_type.toUpperCase() : "N/A"}
          </p>
          <p>
            <strong>Score:</strong>{" "}
            {item.score ? parseFloat(item.score).toFixed(2) : "N/A"}
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
          {renderList(item.genres, "Genres")}
          {renderList(item.themes, "Themes")}
          {renderList(item.demographics, "Demographics")}
          {item.media_type === "anime" && renderList(item.studios, "Studios")}
          {item.media_type === "manga" && renderList(item.authors, "Authors")}
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
              <a
                href={item.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch Trailer
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Placeholder for Recommendations Section */}
      <div className="recommendations-section">
        <h3>Recommended for you:</h3>
        {/* Recommendation logic will go here later */}
        <p>Recommendations coming soon...</p>
      </div>
    </div>
  );
}

export default ItemDetailPage;
