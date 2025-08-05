import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UserItem } from "../../types";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { logger } from "../../utils/logger";


// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url) => {
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

interface ItemListsProps {
  inProgress?: UserItem[];
  planToWatch?: UserItem[];
  onHold?: UserItem[];
  completedRecently?: UserItem[];
  onStatusUpdate: (itemUid: string, newStatus: string, additionalData?: any) => void;
  onItemDeleted?: () => void;
}

const ItemLists: React.FC<ItemListsProps> = ({
  inProgress = [],
  planToWatch = [],
  onHold = [],
  completedRecently = [],
  onStatusUpdate,
  onItemDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<string>("watching");
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const { removeUserItem } = useAuthenticatedApi();

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

  const handleDeleteItem = async (itemUid: string, itemTitle: string) => {
    if (!window.confirm(`Remove "${itemTitle}" from your list?`)) {
      return;
    }

    setDeletingItems((prev) => new Set(prev).add(itemUid));

    try {
      await removeUserItem(itemUid);

      // Notify parent component to refresh data
      if (onItemDeleted) {
        onItemDeleted();
      }
    } catch (error: any) {
      logger.error("Failed to delete item", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "ItemLists",
        operation: "handleDeleteItem",
        itemUid: itemUid
      });
      alert(`Failed to remove item: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setDeletingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemUid);
        return newSet;
      });
    }
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
                  src={sanitizeUrl(userItem.item?.image_url || "/images/default.webp")}
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
                  disabled={deletingItems.has(userItem.item_uid)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleDeleteItem(userItem.item_uid, userItem.item?.title || "Unknown")}
                  disabled={deletingItems.has(userItem.item_uid)}
                  className="delete-button"
                  title="Remove from list"
                >
                  {deletingItems.has(userItem.item_uid) ? "⟳" : "🗑️"}
                </button>
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
