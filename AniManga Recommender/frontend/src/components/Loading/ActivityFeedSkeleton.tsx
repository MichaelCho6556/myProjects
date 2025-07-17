import React from "react";
import "./ActivityFeedSkeleton.css";

interface ActivityFeedSkeletonProps {
  items?: number;
}

/**
 * ActivityFeedSkeleton Component - Loading skeleton for activity feed
 * 
 * Provides skeleton loading states that match the structure of ActivityFeed
 * component, showing activity items with timestamps and action descriptions.
 * 
 * @param items - Number of activity items to show (default: 6)
 */
const ActivityFeedSkeleton: React.FC<ActivityFeedSkeletonProps> = ({
  items = 6,
}) => {
  return (
    <div className="activity-feed-skeleton">
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="activity-item-skeleton">
          <div className="activity-icon-skeleton"></div>
          <div className="activity-content-skeleton">
            <div className="activity-action-skeleton"></div>
            <div className="activity-title-skeleton"></div>
            <div className="activity-timestamp-skeleton"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeedSkeleton;