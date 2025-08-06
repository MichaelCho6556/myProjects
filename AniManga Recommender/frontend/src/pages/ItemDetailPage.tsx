/**
 * AniManga Recommender Item Detail Page Component
 *
 * This component provides a comprehensive detailed view of individual anime or manga items.
 * It displays complete information including metadata, synopsis, ratings, media content,
 * related content, and user interaction capabilities for authenticated users.
 *
 * Key Features:
 * - Complete item metadata display (score, status, episodes/chapters, dates)
 * - Rich media content (cover images, trailers for anime)
 * - Interactive tag system with filtered navigation
 * - Content-based related items engine integration
 * - User list management for authenticated users (add/remove/update status)
 * - Responsive design with proper accessibility
 * - Error handling with graceful fallbacks
 * - SEO-optimized with dynamic page titles
 *
 * Data Sources:
 * - Item details API: `/api/items/{uid}` - Complete item information
 * - Related Items API: `/api/recommendations/{uid}` - Related content suggestions
 * - User authentication context for personalized features
 *
 * Navigation Features:
 * - Clickable tags for filtered browsing (genres, themes, demographics, etc.)
 * - Back navigation with browser history support
 * - External links to official sources
 * - Related item navigation through similar content
 *
 * Media Integration:
 * - YouTube trailer embedding for anime content
 * - High-quality cover image display with fallbacks
 * - Responsive media containers for various screen sizes
 *
 * User Experience:
 * - Loading states with proper accessibility
 * - Error handling with actionable recovery options
 * - Smooth transitions and professional UI
 * - Mobile-responsive design
 *
 * @component
 * @example
 * ```tsx
 * // Automatic routing integration
 * <Route path="/item/:uid" element={<ItemDetailPage />} />
 *
 * // URL examples:
 * // /item/anime_1 - Displays anime with ID 1
 * // /item/manga_123 - Displays manga with ID 123
 *
 * // Component automatically:
 * // - Extracts UID from URL parameters
 * // - Loads item data and related items
 * // - Handles loading and error states
 * // - Updates document title dynamically
 * ```
 *
 * @see {@link ItemCard} for item grid display
 * @see {@link UserListActions} for user interaction features
 * @see {@link useAuth} for authentication integration
 * @see {@link useDocumentTitle} for dynamic page titles
 *
 * @since 1.0.0
 * @author AniManga Recommender Team
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import ItemCard from "../components/ItemCard";

import "./ItemDetail.css";
import Spinner from "../components/Spinner";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { AnimeItem } from "../types";
import { useAuth } from "../context/AuthContext";
import UserListActions from "../components/UserListActions";

// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url: string) => {
  if (!url) return '';
  
  // Decode URL to catch encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }
  
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // Dangerous schemes to block
  const dangerousSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:',
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return 'about:blank';
    }
  }
  
  // Additional check for encoded attempts
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return 'about:blank';
  }
  
  return url;
};

/**
 * Default placeholder image path for items without cover images.
 * Provides consistent fallback for missing or broken image URLs.
 */
const DEFAULT_PLACEHOLDER_IMAGE = "/images/default.webp";

/**
 * Extract YouTube video ID from various YouTube URL formats.
 *
 * Supports multiple YouTube URL patterns including youtu.be, youtube.com/watch,
 * embed URLs, and other common formats. Used for trailer embedding.
 *
 * @function getYouTubeID
 * @param {string} [url] - YouTube URL to parse
 * @returns {string | null} 11-character YouTube video ID or null if invalid
 *
 * @example
 * ```typescript
 * getYouTubeID('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * // Returns: 'dQw4w9WgXcQ'
 *
 * getYouTubeID('https://youtu.be/dQw4w9WgXcQ');
 * // Returns: 'dQw4w9WgXcQ'
 *
 * getYouTubeID('invalid-url');
 * // Returns: null
 *
 * getYouTubeID(undefined);
 * // Returns: null
 * ```
 *
 * @since 1.0.0
 */
const getYouTubeID = (url?: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

/**
 * ItemDetailPage Component Implementation
 *
 * Main component that renders detailed information for a specific anime or manga item.
 * Handles data loading, user interactions, and comprehensive content display.
 *
 * @returns {JSX.Element} Complete item detail page with all features
 */
const ItemDetailPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<AnimeItem | null>(null);
  const [related, setRelated] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Dynamic document title based on item data
  useDocumentTitle(
    item
      ? `${item.title} - ${item.media_type?.toUpperCase() || "Details"}`
      : loading
      ? "Loading..."
      : "Item Details"
  );

  /**
   * Load item data and related items from the API.
   *
   * This function handles the complete data loading process including item details
   * and content-based related items. It implements proper error handling and
   * validates response data to ensure UI stability.
   *
   * Data Loading Process:
   * 1. Validate UID parameter from URL
   * 2. Fetch item details from `/api/items/{uid}`
   * 3. Fetch related items from `/api/recommendations/{uid}`
   * 4. Handle various error conditions and API response formats
   * 5. Update component state with loaded data
   *
   * @async
   * @function loadItemData
   * @returns {Promise<void>} Promise that resolves when data loading is complete
   *
   * @throws {Error} When UID is invalid or missing
   * @throws {Error} When item is not found (404)
   * @throws {Error} When API requests fail
   *
   * @example
   * ```typescript
   * // Automatically called when component mounts or UID changes
   * useEffect(() => {
   *   loadItemData();
   * }, [uid, loadItemData]);
   *
   * // Manual reload (e.g., after error)
   * const handleRetry = () => {
   *   loadItemData();
   * };
   * ```
   *
   * Error Handling:
   * - Invalid UID: Sets error state with user-friendly message
   * - 404 Not Found: Provides specific "item not found" feedback
   * - Network errors: Generic error message with retry suggestions
   * - Malformed responses: Graceful handling with console warnings
   *
   * Performance Considerations:
   * - Parallel loading of item details and related items
   * - Non-blocking related items (failures don't affect main content)
   * - Proper loading state management for smooth UX
   *
   * @since 1.0.0
   */
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
      const itemData = await api.public.getItem(uid);

      if (!itemData || !itemData.uid) {
        setError("Item not found");
        setLoading(false);
        return;
      }

      setItem(itemData);

      // Fetch related items in parallel
      try {
        const relatedResponse = await api.public.getRecommendations(uid, 10);

        // Access related items from API response
        // Note: Backend still uses "recommendations" field name for API compatibility,
        // but frontend treats these as "related" items for improved user clarity
        if (
          relatedResponse &&
          relatedResponse.recommendations &&
          Array.isArray(relatedResponse.recommendations)
        ) {
          setRelated(relatedResponse.recommendations); // Store as 'related' items for frontend
        } else if (relatedResponse && Array.isArray(relatedResponse)) {
          setRelated(relatedResponse); // Handle alternative response format
        } else {
          console.warn("Unexpected related items response format:", relatedResponse);
          setRelated([]);
        }
      } catch (error) {
        console.warn("Failed to load related items:", error);
        setRelated([]);
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

  /**
   * Navigate back to the previous page in browser history.
   *
   * Uses React Router's navigate(-1) to provide browser-native back navigation.
   * This maintains user navigation context and provides expected behavior.
   *
   * @function handleBackClick
   * @returns {void}
   *
   * @example
   * ```typescript
   * <button onClick={handleBackClick}>
   *   ← Back
   * </button>
   * ```
   *
   * @since 1.0.0
   */
  const handleBackClick = () => {
    navigate(-1);
  };

  /**
   * Format score value for display with proper fallbacks.
   *
   * Converts numerical scores to formatted strings with consistent decimal places.
   * Handles null, undefined, and zero values with appropriate fallback text.
   *
   * @function formatScore
   * @param {number | null} score - Raw score value to format
   * @returns {string} Formatted score string or "N/A" for invalid values
   *
   * @example
   * ```typescript
   * formatScore(8.67);     // Returns: "8.67"
   * formatScore(9);        // Returns: "9.00"
   * formatScore(null);     // Returns: "N/A"
   * formatScore(0);        // Returns: "N/A"
   * formatScore(undefined); // Returns: "N/A"
   * ```
   *
   * @since 1.0.0
   */
  const formatScore = (score: number | null) => {
    if (!score || score === 0) return "N/A";
    return score.toFixed(2);
  };

  /**
   * Format "scored by" count for display with locale-appropriate number formatting.
   *
   * Converts user count numbers to localized string format with proper thousands
   * separators. Handles null and undefined values gracefully.
   *
   * @function formatScoredBy
   * @param {number | null} scoredBy - Number of users who scored the item
   * @returns {string} Formatted number string with locale separators or empty string
   *
   * @example
   * ```typescript
   * formatScoredBy(156789);    // Returns: "156,789" (en-US locale)
   * formatScoredBy(1234);      // Returns: "1,234"
   * formatScoredBy(null);      // Returns: ""
   * formatScoredBy(undefined); // Returns: ""
   * ```
   *
   * @since 1.0.0
   */
  const formatScoredBy = (scoredBy: number | null) => {
    if (scoredBy === null || scoredBy === undefined) return "";
    return scoredBy.toLocaleString();
  };

  /**
   * Get default placeholder image path.
   *
   * Returns the default image path for items without valid cover images.
   * Provides centralized fallback image management.
   *
   * @function getDefaultImage
   * @returns {string} Path to default placeholder image
   *
   * @example
   * ```typescript
   * const imageSrc = item.image_url || getDefaultImage();
   * ```
   *
   * @since 1.0.0
   */
  const getDefaultImage = () => DEFAULT_PLACEHOLDER_IMAGE;

  /**
   * Handle image loading errors by switching to placeholder.
   *
   * Event handler for image onError events that automatically replaces
   * broken or missing images with the default placeholder image.
   *
   * @function handleImageError
   * @param {React.SyntheticEvent<HTMLImageElement, Event>} event - Image error event
   * @returns {void}
   *
   * @example
   * ```tsx
   * <img
   *   src={sanitizeUrl(item.image_url)}
   *   alt={item.title}
   *   onError={handleImageError}
   * />
   * ```
   *
   * @since 1.0.0
   */
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = event.target as HTMLImageElement;
    target.src = DEFAULT_PLACEHOLDER_IMAGE;
  };

  /**
   * Handle user list status updates.
   *
   * Callback function triggered when user successfully updates their list status
   * for the current item. Can be extended to show notifications or refresh data.
   *
   * @function handleStatusUpdate
   * @returns {void}
   *
   * @example
   * ```tsx
   * <UserListActions
   *   item={item}
   *   onStatusUpdate={handleStatusUpdate}
   * />
   * ```
   *
   * Future Enhancement:
   * - Add toast notifications for user feedback
   * - Refresh item data if needed
   * - Update local state for immediate UI feedback
   *
   * @since 1.0.0
   */
  const handleStatusUpdate = () => {
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
              src={sanitizeUrl(item.image_url || getDefaultImage())}
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
                      href={sanitizeUrl(link.url)}
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
                src={sanitizeUrl(`https://www.youtube.com/embed/${youtubeID}`)}
                title={`${item.title} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Related Items Section */}
        {related.length > 0 && (
          <div className="related-section">
            <h3>
              Related{" "}
              {item?.media_type === "anime" ? "Anime" : item?.media_type === "manga" ? "Manga" : "Items"}
            </h3>
            <div className="related-list item-list">
              {related.map((relatedItem) => (
                <ItemCard key={relatedItem.uid} item={relatedItem} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ItemDetailPage;
