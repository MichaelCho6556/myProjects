import React from "react";
import { Link } from "react-router-dom";

const DEFAULT_PLACEHOLDER_IMAGE = "/images/default.webp";

function ItemCard({ item }) {
  if (!item) {
    return null;
  }
  const title = item.title || "No Title";
  const mediaType = item.media_type || "N/A";
  const score = item.score ? parseFloat(item.score).toFixed(2) : "N/A";
  const imageUrl = item.main_picture || DEFAULT_PLACEHOLDER_IMAGE;

  const genresDisplay = Array.isArray(item.genres)
    ? item.genres.join(", ")
    : typeof item.genres === "string"
    ? item.genres
    : "None";
  const themesDisplay = Array.isArray(item.themes)
    ? item.themes.join(", ")
    : typeof item.themes === "string"
    ? item.themes
    : "None";

  return (
    <Link
      to={`/item/${item.uid}`}
      className="item-card-link"
      aria-label={`View details for ${title} - ${mediaType} with score ${score}`}
    >
      <article className="item-card">
        <img
          src={imageUrl}
          alt={`Cover image for ${title}`}
          loading="lazy"
          onError={(e) => {
            e.target.src = DEFAULT_PLACEHOLDER_IMAGE;
          }}
        />
        <div className="item-card-content-wrapper">
          <h3>{title}</h3>
          <div className="details">
            <p>
              <strong>Type:</strong> {mediaType.toUpperCase()}
            </p>
            <p>
              <strong>Score:</strong> {score}
            </p>
          </div>
          <div className="genres-themes-wrapper">
            {item.genres && (Array.isArray(item.genres) ? item.genres.length > 0 : true) && (
              <p className="genres">
                <strong>Genres:</strong> {genresDisplay}
              </p>
            )}
            {item.themes && (Array.isArray(item.themes) ? item.themes.length > 0 : true) && (
              <p className="themes">
                <strong>Themes:</strong> {themesDisplay}
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default React.memo(ItemCard);
