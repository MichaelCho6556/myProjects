import React from "react";
import "./RecommendationsSkeleton.css";

interface RecommendationsSkeletonProps {
  sections?: number;
  itemsPerSection?: number;
}

/**
 * RecommendationsSkeleton Component - Loading skeleton for recommendation sections
 * 
 * Provides skeleton loading states that match the structure of PersonalizedRecommendations
 * component, including section headers, filter controls, and recommendation cards.
 * 
 * @param sections - Number of recommendation sections to show (default: 3)
 * @param itemsPerSection - Number of skeleton cards per section (default: 4)
 */
const RecommendationsSkeleton: React.FC<RecommendationsSkeletonProps> = ({
  sections = 3,
  itemsPerSection = 4,
}) => {
  return (
    <div className="recommendations-skeleton">
      {/* Filter Controls Skeleton */}
      <div className="filter-skeleton">
        <div className="filter-buttons-skeleton">
          <div className="skeleton-button"></div>
          <div className="skeleton-button"></div>
          <div className="skeleton-button"></div>
        </div>
      </div>

      {/* Sections Skeleton */}
      {Array.from({ length: sections }, (_, sectionIndex) => (
        <div key={sectionIndex} className="section-skeleton">
          {/* Section Header Skeleton */}
          <div className="section-header-skeleton">
            <div className="section-title-skeleton">
              <div className="skeleton-icon"></div>
              <div className="skeleton-title"></div>
            </div>
            <div className="section-actions-skeleton">
              <div className="skeleton-button small"></div>
              <div className="skeleton-button small"></div>
            </div>
          </div>

          {/* Items Grid Skeleton */}
          <div className="items-grid-skeleton">
            {Array.from({ length: itemsPerSection }, (_, itemIndex) => (
              <div key={itemIndex} className="item-card-skeleton">
                <div className="item-image-skeleton"></div>
                <div className="item-content-skeleton">
                  <div className="item-title-skeleton"></div>
                  <div className="item-type-skeleton"></div>
                  <div className="item-score-skeleton"></div>
                  <div className="item-description-skeleton">
                    <div className="skeleton-line"></div>
                    <div className="skeleton-line short"></div>
                  </div>
                  <div className="item-actions-skeleton">
                    <div className="skeleton-button"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendationsSkeleton;