import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UserItem } from "../../types";

interface ItemListsProps {
  inProgress?: UserItem[];
  planToWatch?: UserItem[];
  onHold?: UserItem[];
  completedRecently?: UserItem[];
  onStatusUpdate: (itemUid: string, newStatus: string, additionalData?: any) => void;
}

const ItemLists: React.FC<ItemListsProps> = ({
  inProgress = [],
  planToWatch = [],
  onHold = [],
  completedRecently = [],
  onStatusUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<string>("watching");

  const statusOptions = [
    { value: "watching", label: "Watching" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
    { value: "dropped", label: "Dropped" },
    { value: "plan_to_watch", label: "Plan to Watch" },
  ];

  const handleStatusChange = (itemUid: string, newStatus: string) => {
    const additionalData = newStatus === "completed" ? { completion_date: new Date().toISOString() } : {};
    onStatusUpdate(itemUid, newStatus, additionalData);
  };

  const getViewAllLink = () => {
    return `/lists?status=${activeTab}`;
  };

  const renderItemList = (items: UserItem[], listType: string) => {
    if (!items || items.length === 0) {
      return (
        <div className="empty-list">
          <p>No items in this category yet!</p>
          <Link to="/" className="browse-link">
            Browse anime & manga →
          </Link>
        </div>
      );
    }

    return (
      <div className="item-cards-grid">
        {items.slice(0, 6).map((userItem) => (
          <div key={userItem.item_uid} className="dashboard-item-card">
            <div className="item-image-container">
              <Link to={`/item/${userItem.item_uid}`}>
                <img
                  src={userItem.item?.image_url || "/images/default.webp"}
                  alt={userItem.item?.title || "Unknown"}
                  className="item-thumbnail"
                />
              </Link>
            </div>

            <div className="item-info">
              <h4 className="item-title">
                <Link to={`/item/${userItem.item_uid}`}>{userItem.item?.title || "Unknown Title"}</Link>
              </h4>

              <div className="item-meta">
                <span className="item-type">{userItem.item?.media_type?.toUpperCase()}</span>
                {userItem.item?.score && <span className="item-score">★ {userItem.item.score}</span>}
              </div>

              {listType === "watching" && (
                <div className="progress-info">
                  <span>Progress: {userItem.progress || 0}</span>
                  {userItem.item?.episodes && <span>/ {userItem.item.episodes}</span>}
                </div>
              )}

              <div className="quick-actions">
                <select
                  value={userItem.status}
                  onChange={(e) => handleStatusChange(userItem.item_uid, e.target.value)}
                  className="status-select"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getLists = () => {
    switch (activeTab) {
      case "watching":
        return renderItemList(inProgress, "watching");
      case "plan_to_watch":
        return renderItemList(planToWatch, "plan_to_watch");
      case "on_hold":
        return renderItemList(onHold, "on_hold");
      case "completed":
        return renderItemList(completedRecently, "completed");
      default:
        return renderItemList(inProgress, "watching");
    }
  };

  return (
    <div className="item-lists-section">
      <div className="section-header">
        <h3>Your Lists</h3>
        <Link to={getViewAllLink()} className="view-all-link">
          View Full Lists →
        </Link>
      </div>

      <div className="list-tabs">
        <button
          className={`tab-button ${activeTab === "watching" ? "active" : ""}`}
          onClick={() => setActiveTab("watching")}
        >
          Watching ({inProgress.length})
        </button>
        <button
          className={`tab-button ${activeTab === "plan_to_watch" ? "active" : ""}`}
          onClick={() => setActiveTab("plan_to_watch")}
        >
          Plan to Watch ({planToWatch.length})
        </button>
        <button
          className={`tab-button ${activeTab === "on_hold" ? "active" : ""}`}
          onClick={() => setActiveTab("on_hold")}
        >
          On Hold ({onHold.length})
        </button>
        <button
          className={`tab-button ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          Recently Completed ({completedRecently.length})
        </button>
      </div>

      <div className="list-content">{getLists()}</div>
    </div>
  );
};

export default ItemLists;
