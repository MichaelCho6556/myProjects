import React from "react";
import { Link } from "react-router-dom";
import { ItemCardProps } from "../types";

const DEFAULT_PLACEHOLDER_IMAGE = "/images/default.webp";

/**
 * ItemCard Component - Displays individual anime/manga item with TypeScript support
 *
 * @param props - Component props with type safety
 * @returns JSX.Element or null
 */
const ItemCard: React.FC<ItemCardProps> = ({ item, className = "" }) => {
  if (!item) {
    return null;
  }

  const title = item.title || "No Title";
  const mediaType = item.media_type || "N/A";
  const score = item.score ? parseFloat(item.score.toString()).toFixed(2) : "N/A";
  const imageUrl = item.image_url || DEFAULT_PLACEHOLDER_IMAGE;

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

  /**
   * Handle image load error by falling back to default placeholder
   */
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = event.target as HTMLImageElement;
    target.src = DEFAULT_PLACEHOLDER_IMAGE;
  };

  return (
    <Link
      to={`/item/${item.uid}`}
      className={`item-card-link ${className}`}
      aria-label={`View details for ${title} - ${mediaType} with score ${score}`}
    >
      <article className="item-card">
        <img src={imageUrl} alt={`Cover for ${title}`} loading="lazy" onError={handleImageError} />
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
};

export default React.memo(ItemCard);
