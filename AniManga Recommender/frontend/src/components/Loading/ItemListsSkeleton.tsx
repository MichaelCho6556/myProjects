import React from "react";
import "./ItemListsSkeleton.css";

interface ItemListsSkeletonProps {
  sections?: number;
  itemsPerSection?: number;
}

/**
 * ItemListsSkeleton Component - Loading skeleton for user item lists
 * 
 * Provides skeleton loading states that match the structure of ItemLists
 * component, showing categorized lists like "Currently Watching", "Plan to Watch", etc.
 * 
 * @param sections - Number of list sections to show (default: 4)
 * @param itemsPerSection - Number of skeleton items per section (default: 3)
 */
const ItemListsSkeleton: React.FC<ItemListsSkeletonProps> = ({
  sections = 4,
  itemsPerSection = 3,
}) => {

  return (
    <div className="item-lists-skeleton">
      {Array.from({ length: sections }, (_, sectionIndex) => (
        <div key={sectionIndex} className="list-section-skeleton">
          {/* Section Header */}
          <div className="section-header-skeleton">
            <div className="section-title-skeleton">
              <div className="title-text-skeleton"></div>
              <div className="count-badge-skeleton"></div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="items-grid-skeleton">
            {Array.from({ length: itemsPerSection }, (_, itemIndex) => (
              <div key={itemIndex} className="list-item-skeleton">
                <div className="item-image-skeleton"></div>
                <div className="item-info-skeleton">
                  <div className="item-title-skeleton"></div>
                  <div className="item-meta-skeleton">
                    <div className="meta-item-skeleton"></div>
                    <div className="meta-item-skeleton"></div>
                  </div>
                  <div className="item-progress-skeleton">
                    <div className="progress-bar-skeleton">
                      <div className="progress-fill-skeleton"></div>
                    </div>
                    <div className="progress-text-skeleton"></div>
                  </div>
                </div>
                <div className="item-actions-skeleton">
                  <div className="action-button-skeleton"></div>
                  <div className="action-button-skeleton"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItemListsSkeleton;