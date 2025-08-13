import React, { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { ItemCardProps } from "../types";
import { sanitizeUrl } from "../utils/urlSecurity";
import LazyImage from "./LazyImage";

const DEFAULT_PLACEHOLDER_IMAGE = "/images/default.webp";

/**
 * ItemCard Component - Displays individual anime/manga item cards with optimized performance.
 *
 * This component renders a clickable card interface for anime/manga items,
 * featuring responsive design, lazy loading, error handling, and accessibility
 * support. It serves as the primary item display component across the application.
 *
 * Features:
 * - Responsive card layout with image and metadata
 * - Lazy loading images for performance optimization
 * - Automatic fallback for broken/missing images
 * - Accessibility-compliant link structure and ARIA labels
 * - React.memo optimization to prevent unnecessary re-renders
 * - Flexible genre and theme display handling
 * - Type-safe props with comprehensive error handling
 *
 * Image Handling:
 * - Supports both 'image_url' and 'main_picture' for backward compatibility
 * - Automatic fallback to default placeholder on load errors
 * - Lazy loading attribute for performance optimization
 * - Proper alt text for screen readers
 *
 * Data Display:
 * - Formatted score display with 2 decimal precision
 * - Conditional genre and theme rendering
 * - Media type formatting (uppercase display)
 * - Safe handling of missing or malformed data
 *
 * Performance Optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - Lazy image loading for better page performance
 * - Efficient conditional rendering for optional fields
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage with anime item
 * <ItemCard item={animeItem} />
 *
 * // With custom CSS class
 * <ItemCard item={mangaItem} className="featured-card" />
 *
 * // Grid layout usage
 * {items.map(item => (
 *   <ItemCard key={item.uid} item={item} />
 * ))}
 * ```
 *
 * @param {Object} props - Component properties
 * @param {ItemCardProps['item']} props.item - Anime/manga item data object containing:
 *   - uid (string): Unique identifier for the item
 *   - title (string): Display title of the anime/manga
 *   - media_type (string): Type ('anime' or 'manga')
 *   - score (number|string): Rating score (0-10)
 *   - image_url|main_picture (string): Cover image URL
 *   - genres (string[]): Array of genre names
 *   - themes (string[]): Array of theme names
 * @param {string} [props.className=""] - Additional CSS classes for styling
 *
 * @returns {JSX.Element|null} Rendered item card component or null if no item provided
 *
 * @see {@link ItemCardProps} for complete prop type definitions
 * @see {@link DEFAULT_PLACEHOLDER_IMAGE} for fallback image configuration
 *
 * @since 1.0.0
 * @author AniManga Recommender Team
 */
const ItemCard: React.FC<ItemCardProps> = ({ item, className = "" }) => {
  // Memoize computed values to prevent recalculation on every render
  const computedData = useMemo(() => {
    if (!item) {
      return {
        title: "No Title",
        mediaType: "N/A",
        score: "N/A",
        imageUrl: DEFAULT_PLACEHOLDER_IMAGE,
        genresDisplay: "None",
        themesDisplay: "None"
      };
    }
    const title = item.title || "No Title";
    const mediaType = item.media_type || "N/A";
    const score = item.score ? parseFloat(item.score.toString()).toFixed(2) : "N/A";
    // Handle both image_url and main_picture for backward compatibility
    const imageUrl = item.image_url || (item as any).main_picture || DEFAULT_PLACEHOLDER_IMAGE;

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

    return {
      title,
      mediaType,
      score,
      imageUrl,
      genresDisplay,
      themesDisplay,
    };
  }, [item]);

  const { title, mediaType, score, imageUrl, genresDisplay, themesDisplay } = computedData;
  
  // Format similarity as percentage if available
  const similarityPercent = item.similarity ? `${Math.round(item.similarity * 100)}% Match` : null;

  // Handle null item after hooks are called
  if (!item) {
    return null;
  }

  return (
    <Link
      to={`/item/${item.uid}`}
      className={`item-card-link ${className}`}
      aria-label={`View details for ${title} - ${mediaType} with score ${score}`}
    >
      <article className="item-card">
        <div className="item-card-image">
          <LazyImage
            src={sanitizeUrl(imageUrl)}
            alt={`Cover for ${title}`}
            fallbackSrc={DEFAULT_PLACEHOLDER_IMAGE}
            title={title}
            className="aspect-cover"
          />
        </div>
        <div className="item-card-content-wrapper">
          <h3>{title}</h3>
          <div className="details">
            <p>
              <strong>Type:</strong> {mediaType.toUpperCase()}
            </p>
            <p>
              <strong>Score:</strong> {score}
            </p>
            {similarityPercent && (
              <p className="similarity-score">
                <strong>Match:</strong> {similarityPercent}
              </p>
            )}
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

export default memo(ItemCard);
