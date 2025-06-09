import React from "react";
import "./Loading.css";

interface ItemCardSkeletonProps {
  className?: string;
  count?: number;
}

/**
 * Enhanced Item Card Skeleton Component
 * Professional skeleton loader for item cards with proper structure
 */
const ItemCardSkeleton: React.FC<ItemCardSkeletonProps> = ({ className = "", count = 1 }) => {
  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <ItemCardSkeleton key={index} className={className} />
        ))}
      </>
    );
  }

  return (
    <div
      className={`skeleton-item-card ${className}`.trim()}
      role="status"
      aria-label="Loading item"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Image skeleton */}
      <div className="skeleton-item-image skeleton-shimmer"></div>

      {/* Content skeleton */}
      <div className="skeleton-item-content">
        {/* Title skeleton */}
        <div className="skeleton-item-title skeleton-shimmer"></div>

        {/* Details skeleton */}
        <div className="skeleton-item-details">
          <div className="skeleton-item-meta skeleton-shimmer"></div>
          <div className="skeleton-item-meta skeleton-shimmer short"></div>
        </div>

        {/* Score skeleton */}
        <div className="skeleton-item-score skeleton-shimmer"></div>

        {/* Tags skeleton */}
        <div className="skeleton-item-tags">
          <div className="skeleton-tag skeleton-shimmer"></div>
          <div className="skeleton-tag skeleton-shimmer"></div>
          <div className="skeleton-tag skeleton-shimmer short"></div>
        </div>
      </div>
    </div>
  );
};

export default ItemCardSkeleton;
