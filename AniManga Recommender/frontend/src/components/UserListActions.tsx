import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { AnimeItem } from "../types";
import "./UserListActions.css";

interface UserListActionsProps {
  item: AnimeItem;
  onStatusUpdate?: () => void;
}

interface UserItemData {
  status: string;
  progress: number;
  rating?: number;
  notes?: string;
}

const UserListActions: React.FC<UserListActionsProps> = ({ item, onStatusUpdate }) => {
  const { user } = useAuth();
  const { getUserItems, updateUserItemStatus, removeUserItem } = useAuthenticatedApi();

  const [userItem, setUserItem] = useState<UserItemData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [selectedStatus, setSelectedStatus] = useState("plan_to_watch");
  const [progress, setProgress] = useState(0);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const statusOptions = [
    { value: "plan_to_watch", label: "Plan to Watch", color: "#3b82f6" },
    { value: "watching", label: "Watching", color: "#10b981" },
    { value: "completed", label: "Completed", color: "#8b5cf6" },
    { value: "on_hold", label: "On Hold", color: "#f59e0b" },
    { value: "dropped", label: "Dropped", color: "#ef4444" },
  ];

  useEffect(() => {
    if (user) {
      loadUserItem();
    }
  }, [user, item.uid]);

  const loadUserItem = async () => {
    try {
      setLoading(true);
      const userItems = await getUserItems();
      const existingItem = userItems.find((ui: any) => ui.item_uid === item.uid);

      if (existingItem) {
        setUserItem(existingItem);
        setSelectedStatus(existingItem.status);
        setProgress(existingItem.progress || 0);
        setRating(existingItem.rating);
        setNotes(existingItem.notes || "");
      } else {
        setUserItem(null);
      }
    } catch (err: any) {
      console.error("Failed to load user item:", err);
      setError("Failed to load your list status");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let finalProgress = progress;

      if (selectedStatus === "completed") {
        const maxProgress = getMaxProgress();
        finalProgress = maxProgress;
        setProgress(maxProgress);
        console.log(`Auto-setting progress to ${maxProgress} for completed anime/manga`);
      }

      const updateData: any = {
        status: selectedStatus,
        progress: finalProgress,
      };

      if (rating !== undefined && rating > 0) {
        updateData.rating = Math.round(rating * 10) / 10;
      }

      if (notes.trim()) {
        updateData.notes = notes.trim();
      }

      if (selectedStatus === "completed") {
        updateData.completion_date = new Date().toISOString();
      }

      console.log("Sending update data:", updateData);

      const result = await updateUserItemStatus(item.uid, updateData);

      if (result && (result.success === true || result.data)) {
        await loadUserItem();
        setIsEditing(false);

        // 🆕 TRIGGER DASHBOARD REFRESH
        localStorage.setItem("animanga_list_updated", Date.now().toString());
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "animanga_list_updated",
            newValue: Date.now().toString(),
          })
        );

        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        throw new Error("Update failed - no success confirmation received");
      }
    } catch (err: any) {
      console.error("Status update error:", err);
      setError(err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);

    if (newStatus === "completed") {
      const maxProgress = getMaxProgress();
      setProgress(maxProgress);
      console.log(`Auto-setting progress to ${maxProgress} for completed status`);
    }
  };

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setRating(undefined);
      return;
    }

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
      setRating(Math.round(numValue * 10) / 10);
    }
  };

  const handleRemoveFromList = async () => {
    if (!user || !userItem) return;

    if (!window.confirm("Are you sure you want to remove this from your list?")) {
      return;
    }

    try {
      setLoading(true);
      await removeUserItem(item.uid);
      setUserItem(null);
      setSelectedStatus("plan_to_watch");
      setProgress(0);
      setRating(undefined);
      setNotes("");

      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (err: any) {
      setError(err.message || "Failed to remove from list");
    } finally {
      setLoading(false);
    }
  };

  const getMaxProgress = () => {
    if (item.media_type === "anime") {
      const episodes = item.episodes || 0;
      console.log(`Anime episodes available: ${episodes}`);
      return Math.max(episodes, 1);
    } else {
      const chapters = item.chapters || 0;
      console.log(`Manga chapters available: ${chapters}`);
      return Math.max(chapters, 1);
    }
  };

  const getProgressLabel = () => {
    if (item.media_type === "anime") {
      return "Episodes watched";
    } else {
      return "Chapters read";
    }
  };

  if (!user) {
    return (
      <div className="user-list-actions">
        <div className="auth-prompt">
          <p>Sign in to add this to your list</p>
        </div>
      </div>
    );
  }

  if (loading && !userItem) {
    return (
      <div className="user-list-actions">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-list-actions">
      <h3>Your List</h3>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="error-dismiss">
            ×
          </button>
        </div>
      )}

      {userItem && !isEditing ? (
        // Display mode - showing current status
        <div className="status-display">
          <div className="current-status">
            <span
              className="status-badge"
              style={{ backgroundColor: statusOptions.find((opt) => opt.value === userItem.status)?.color }}
            >
              {statusOptions.find((opt) => opt.value === userItem.status)?.label}
            </span>

            {userItem.progress > 0 && (
              <span className="progress-display">
                {userItem.progress} / {getMaxProgress()}{" "}
                {item.media_type === "anime" ? "episodes" : "chapters"}
              </span>
            )}

            {userItem.rating && <span className="rating-display">⭐ {userItem.rating.toFixed(1)}/10</span>}
          </div>

          <div className="action-buttons">
            <button onClick={() => setIsEditing(true)} className="btn-edit" disabled={loading}>
              Edit
            </button>
            <button onClick={handleRemoveFromList} className="btn-remove" disabled={loading}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        // Edit mode - form for adding/updating
        <div className="status-form">
          <div className="form-group">
            <label htmlFor="status-select">Status:</label>
            <select
              id="status-select"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={loading}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="progress-input">{getProgressLabel()}:</label>
            <div className="progress-input-wrapper">
              <input
                id="progress-input"
                type="number"
                min="0"
                max={getMaxProgress()}
                value={progress}
                onChange={(e) =>
                  setProgress(Math.max(0, Math.min(getMaxProgress(), parseInt(e.target.value) || 0)))
                }
                disabled={loading}
              />
              <span className="progress-max">/ {getMaxProgress()}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rating-input">Rating (0.0 - 10.0, optional):</label>
            <input
              id="rating-input"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={rating !== undefined ? rating.toFixed(1) : ""}
              onChange={handleRatingChange}
              placeholder="e.g., 9.2, 8.7, 7.5"
              disabled={loading}
              className="rating-decimal-input"
            />
            <small className="rating-help">
              Enter a decimal rating like 9.1, 8.7, 6.5, etc. (0.0 to 10.0)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="notes-input">Notes (optional):</label>
            <textarea
              id="notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your thoughts about this..."
              rows={3}
              disabled={loading}
              maxLength={500}
            />
          </div>

          <div className="form-actions">
            <button onClick={handleStatusUpdate} className="btn-save" disabled={loading}>
              {loading ? "Saving..." : userItem ? "Update" : "Add to List"}
            </button>

            {userItem && (
              <button onClick={() => setIsEditing(false)} className="btn-cancel" disabled={loading}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListActions;
