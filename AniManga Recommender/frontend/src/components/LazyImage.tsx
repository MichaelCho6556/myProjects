import React, { useState, useRef, useEffect, memo } from "react";
import "./LazyImage.css";

interface LazyImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  title?: string; // For generating initials fallback
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number;
  rootMargin?: string;
}

/**
 * LazyImage Component - High-performance lazy loading image with intersection observer
 * 
 * Features:
 * - Intersection Observer API for efficient lazy loading
 * - Automatic fallback for broken images
 * - Loading placeholder with fade-in animation
 * - Memory-efficient cleanup of observers
 * - Configurable loading threshold and margins
 * - React.memo optimization to prevent unnecessary re-renders
 * 
 * Performance Benefits:
 * - Reduces initial page load time
 * - Saves bandwidth by only loading visible images
 * - Smooth fade-in animations for better UX
 * - Automatic cleanup prevents memory leaks
 * 
 * @param src - Image source URL
 * @param alt - Alt text for accessibility
 * @param fallbackSrc - Fallback image URL (defaults to placeholder)
 * @param className - Additional CSS classes
 * @param title - Title for generating initials fallback
 * @param onLoad - Callback when image loads successfully
 * @param onError - Callback when image fails to load
 * @param threshold - Intersection threshold (0-1, default: 0.1)
 * @param rootMargin - Root margin for intersection observer (default: "50px")
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallbackSrc = "/images/default.webp",
  className = "",
  title,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = "50px",
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(!src || src.trim() === ''); // Start with error if no src
  const [isInView, setIsInView] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate initials from title
  const generateInitials = (title?: string): string => {
    if (!title) return "??";
    return title
      .split(" ")
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join("");
  };

  // Generate color from title for consistent placeholder
  const generateColor = (title?: string): string => {
    if (!title) return "#6366f1";
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
  };

  useEffect(() => {
    const currentImgRef = imgRef.current;
    
    if (!currentImgRef) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          // Stop observing once image is in view
          if (observerRef.current) {
            observerRef.current.unobserve(currentImgRef);
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Start observing
    observerRef.current.observe(currentImgRef);
    
    // Fallback: Load images after 500ms if intersection observer doesn't trigger
    const fallbackTimer = setTimeout(() => {
      if (!isInView) {
        setIsInView(true);
      }
    }, 500);

    // Cleanup function
    return () => {
      clearTimeout(fallbackTimer);
      if (observerRef.current && currentImgRef) {
        observerRef.current.unobserve(currentImgRef);
      }
    };
  }, [threshold, rootMargin, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  const handleFallbackError = () => {
    setFallbackError(true);
  };

  // Determine what to show
  const imageSrc = isError ? fallbackSrc : src;
  const shouldLoadImage = isInView;
  const showInitialsPlaceholder = isError && fallbackError;
  const showImage = shouldLoadImage && !showInitialsPlaceholder;

  return (
    <div 
      className={`lazy-image-container ${className}`} 
      ref={imgRef}
      data-error={isError}
    >
      {/* Placeholder - shown while loading or before intersection */}
      {!isLoaded && !showInitialsPlaceholder && (
        <div className="lazy-image-placeholder">
          <div className="shimmer-placeholder">
            <div className="shimmer-content">
              <div className="shimmer-image-icon">📷</div>
              <div className="shimmer-text">Loading...</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Actual image - only rendered when in view */}
      {showImage && (
        <img
          src={imageSrc}
          alt={alt}
          className={`lazy-image ${isLoaded ? "loaded" : "loading"}`}
          onLoad={handleLoad}
          onError={isError ? handleFallbackError : handleError}
          loading="lazy"
        />
      )}

      {/* Initials fallback when everything fails */}
      {showInitialsPlaceholder && (
        <div 
          className="initials-placeholder final-fallback"
          style={{ backgroundColor: generateColor(title) }}
        >
          <span className="initials-text">
            {generateInitials(title)}
          </span>
          <span className="fallback-label">No Image</span>
        </div>
      )}
    </div>
  );
};

export default memo(LazyImage);