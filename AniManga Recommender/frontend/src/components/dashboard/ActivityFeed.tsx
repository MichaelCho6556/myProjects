import React from "react";
import { Link } from "react-router-dom";
import { UserActivity } from "../../types";

interface ActivityFeedProps {
  activities?: UserActivity[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities = [] }) => {
  const getActivityText = (activity: UserActivity): string => {
    switch (activity.activity_type) {
      case "status_changed":
        return `Changed status to "${activity.activity_data.new_status}"`;
      case "completed":
        return "Completed";
      case "added":
        return "Added to list";
      default:
        return activity.activity_type;
    }
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  };

  return (
    <div className="activity-feed">
      <h3>Recent Activity</h3>

      {activities.length === 0 ? (
        <div className="no-activity">
          <p>No recent activity. Start watching or reading something!</p>
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-content">
                <div className="activity-header">
                  <Link to={`/item/${activity.item_uid}`} className="activity-title">
                    {activity.item?.title || "Unknown Item"}
                  </Link>
                  <span className="activity-time">{getTimeAgo(activity.created_at)}</span>
                </div>
                <div className="activity-description">{getActivityText(activity)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
