/**
 * SkeletonCard Component
 * Loading skeleton placeholder for ItemCard components
 */

import React from "react";

interface SkeletonCardProps {
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = "" }) => {
  return (
    <div
      className={`skeleton-card card-layout skeleton-pulse ${className}`.trim()}
      data-testid="skeleton-card"
      role="status"
      aria-label="Loading"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Image placeholder */}
      <div className="skeleton-image skeleton-shimmer aspect-ratio-preserved" data-testid="skeleton-image" />

      {/* Content area */}
      <div className="skeleton-content content-spacing" data-testid="skeleton-content">
        {/* Title placeholder */}
        <div className="skeleton-title skeleton-shimmer" data-testid="skeleton-title" />

        {/* Text lines */}
        <div className="skeleton-text skeleton-shimmer" data-testid="skeleton-text-1" />
        <div className="skeleton-text skeleton-shimmer" data-testid="skeleton-text-2" />
        <div className="skeleton-text skeleton-shimmer" data-testid="skeleton-text-3" />

        {/* Score placeholder */}
        <div className="skeleton-score skeleton-shimmer" data-testid="skeleton-score" />
      </div>
    </div>
  );
};

export default SkeletonCard;
