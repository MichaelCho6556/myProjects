import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { UserActivity } from "../../types";
import VirtualGrid from "../VirtualGrid";

interface ActivityFeedProps {
  activities?: UserActivity[];
}

const ACTIVITY_ITEM_HEIGHT = 80; // Height of each activity item
const VIRTUALIZATION_THRESHOLD = 15; // Start virtualizing after 15 items

// Grouped activity interface
interface GroupedActivity {
  id: string;
  activity_type: string;
  created_at: string;
  items: Array<{
    item_uid: string;
    title: string;
    activity_data?: any;
  }>;
  isGrouped: boolean;
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

  // Group consecutive similar activities
  const groupActivities = (activities: UserActivity[]): (UserActivity | GroupedActivity)[] => {
    if (activities.length === 0) return [];

    const grouped: (UserActivity | GroupedActivity)[] = [];
    let currentGroup: UserActivity[] = [];
    let currentActivityType = "";

    for (const activity of activities) {
      const activityKey = `${activity.activity_type}-${activity.activity_data?.new_status || ''}`;
      
      // Check if this activity can be grouped with the current group
      if (
        currentActivityType === activityKey &&
        currentGroup.length > 0 &&
        currentGroup.length < 5 && // Limit group size
        // Only group if activities are within 1 hour of each other
        Math.abs(new Date(activity.created_at).getTime() - new Date(currentGroup[0].created_at).getTime()) < 3600000
      ) {
        currentGroup.push(activity);
      } else {
        // Finalize current group
        if (currentGroup.length > 1) {
          // Create grouped activity
          grouped.push({
            id: `group-${currentGroup[0].id}`,
            activity_type: currentGroup[0].activity_type,
            created_at: currentGroup[0].created_at,
            items: currentGroup.map(act => ({
              item_uid: act.item_uid,
              title: act.item?.title || "Unknown Item",
              activity_data: act.activity_data
            })),
            isGrouped: true
          });
        } else if (currentGroup.length === 1) {
          // Add single activity as-is
          grouped.push(currentGroup[0]);
        }

        // Start new group
        currentGroup = [activity];
        currentActivityType = activityKey;
      }
    }

    // Handle the last group
    if (currentGroup.length > 1) {
      grouped.push({
        id: `group-${currentGroup[0].id}`,
        activity_type: currentGroup[0].activity_type,
        created_at: currentGroup[0].created_at,
        items: currentGroup.map(act => ({
          item_uid: act.item_uid,
          title: act.item?.title || "Unknown Item",
          activity_data: act.activity_data
        })),
        isGrouped: true
      });
    } else if (currentGroup.length === 1) {
      grouped.push(currentGroup[0]);
    }

    return grouped;
  };

  // Process activities with grouping
  const processedActivities = useMemo(() => groupActivities(activities), [activities]);

  // Activity item component for rendering
  const ActivityItem: React.FC<{ activity: UserActivity | GroupedActivity }> = ({ activity }) => {
    if ('isGrouped' in activity && activity.isGrouped) {
      // Render grouped activity
      const groupedActivity = activity as GroupedActivity;
      return (
        <div className="activity-item grouped">
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-group-title">
                {groupedActivity.items.length} items {groupedActivity.activity_type === 'status_changed' ? 'status changed' : groupedActivity.activity_type}
              </span>
              <span className="activity-time">{getTimeAgo(groupedActivity.created_at)}</span>
            </div>
            <div className="activity-group-items">
              {groupedActivity.items.slice(0, 3).map((item, index) => (
                <Link
                  key={`${item.item_uid}-${index}`}
                  to={`/item/${item.item_uid}`}
                  className="grouped-item-link"
                >
                  {item.title}
                </Link>
              ))}
              {groupedActivity.items.length > 3 && (
                <span className="more-items">
                  +{groupedActivity.items.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Render single activity
    const singleActivity = activity as UserActivity;
    return (
      <div className="activity-item">
        <div className="activity-content">
          <div className="activity-header">
            <Link to={`/item/${singleActivity.item_uid}`} className="activity-title">
              {singleActivity.item?.title || "Unknown Item"}
            </Link>
            <span className="activity-time">{getTimeAgo(singleActivity.created_at)}</span>
          </div>
          <div className="activity-description">{getActivityText(singleActivity)}</div>
        </div>
      </div>
    );
  };

  // Determine whether to use virtualization
  const shouldVirtualize = processedActivities.length > VIRTUALIZATION_THRESHOLD;

  // Memoize virtual grid render function
  const renderVirtualItem = useMemo(() => 
    (activity: UserActivity | GroupedActivity, index: number) => (
      <ActivityItem key={`${activity.id}-${index}`} activity={activity} />
    ), []
  );

  return (
    <div className="activity-feed">
      <h3>Recent Activity</h3>

      {processedActivities.length === 0 ? (
        <div className="no-activity">
          <p>No recent activity. Start watching or reading something!</p>
        </div>
      ) : shouldVirtualize ? (
        // Use virtual scrolling for large lists
        <div className="activity-list-virtual">
          <VirtualGrid
            items={processedActivities}
            renderItem={renderVirtualItem}
            itemHeight={ACTIVITY_ITEM_HEIGHT}
            itemWidth={280} // Full width of sidebar
            containerHeight={400} // Max height for activity feed
            gap={8}
            className="activity-virtual-grid"
          />
        </div>
      ) : (
        // Use regular rendering for small lists
        <div className="activity-list">
          {processedActivities.map((activity, index) => (
            <ActivityItem key={`${activity.id}-${index}`} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
