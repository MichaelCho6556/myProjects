import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { AnimeItem } from "../types";
import { logger } from "../utils/logger";
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
  const [ratingInput, setRatingInput] = useState(""); // Raw input string for typing
  const [notes, setNotes] = useState("");

  // Memoize max progress to avoid excessive function calls
  const maxProgress = useMemo(() => {
    if (item.media_type === "anime") {
      return Math.max(item.episodes || 0, 1);
    } else {
      return Math.max(item.chapters || 0, 1);
    }
  }, [item.episodes, item.chapters, item.media_type]);

  // Memoize progress label 
  const progressLabel = useMemo(() => {
    if (item.media_type === "anime") {
      return "Episodes watched";
    } else {
      return "Chapters read";
    }
  }, [item.media_type]);

  const statusOptions = [
    { value: "plan_to_watch", label: "Plan to Watch", color: "#3b82f6" },
    { value: "watching", label: "Watching", color: "#10b981" },
    { value: "completed", label: "Completed", color: "#8b5cf6" },
    { value: "on_hold", label: "On Hold", color: "#f59e0b" },
    { value: "dropped", label: "Dropped", color: "#ef4444" },
  ];

  const loadUserItem = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUserItems();
      
      // Handle the new API response format that includes items array
      const userItems = response.items || response;
      
      const existingItem = userItems.find((ui: any) => ui.item_uid === item.uid);

      if (existingItem) {
        setUserItem(existingItem);
        setSelectedStatus(existingItem.status);
        setProgress(existingItem.progress || 0);
        setRating(existingItem.rating);
        setRatingInput(existingItem.rating ? existingItem.rating.toString() : "");
        setNotes(existingItem.notes || "");
      } else {
        setUserItem(null);
        setRatingInput("");
      }
    } catch (err: any) {
      logger.error("Failed to load user item", {
        error: err?.message || "Unknown error",
        context: "UserListActions",
        operation: "loadUserItem",
        userId: user?.id,
        itemUid: item.uid
      });
      setError("Failed to load your list status");
    } finally {
      setLoading(false);
    }
  }, [getUserItems, item.uid]);

  useEffect(() => {
    if (user) {
      loadUserItem();
    }
  }, [user, item.uid, loadUserItem]);

  const handleStatusUpdate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let finalProgress = progress;

      if (selectedStatus === "completed") {
        finalProgress = maxProgress;
        setProgress(maxProgress);
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
      logger.error("Status update error", {
        error: err?.message || "Unknown error",
        context: "UserListActions",
        operation: "updateStatus",
        userId: user?.id,
        itemUid: item.uid,
        newStatus: selectedStatus
      });
      setError(err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);

    if (newStatus === "completed") {
      setProgress(maxProgress);
    }
  };

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty input
    if (value === "") {
      setRatingInput("");
      setRating(undefined);
      return;
    }
    
    // Allow typing decimal numbers - basic validation only
    if (/^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      
      // Prevent invalid values from being entered in the input field
      if (!isNaN(numValue) && numValue > 10) {
        return; // Don't update input if value exceeds 10
      }
      
      setRatingInput(value);
      
      // Update rating state only if it's a valid complete number
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
        setRating(numValue);
      }
    }
  };

  const handleRatingBlur = () => {
    if (ratingInput === "") {
      setRating(undefined);
      return;
    }
    
    const numValue = parseFloat(ratingInput);
    if (isNaN(numValue) || numValue < 0 || numValue > 10) {
      // Invalid input - reset to previous valid value or empty
      if (rating !== undefined) {
        setRatingInput(rating.toString());
      } else {
        setRatingInput("");
        setRating(undefined);
      }
    } else {
      // Valid input - round to 1 decimal place and update both states
      const roundedValue = Math.round(numValue * 10) / 10;
      setRating(roundedValue);
      setRatingInput(roundedValue.toString());
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
      setRatingInput("");
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
                {userItem.progress} / {maxProgress}{" "}
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
            <label htmlFor="progress-input">{progressLabel}:</label>
            <div className="progress-input-wrapper">
              <input
                id="progress-input"
                type="number"
                min="0"
                max={maxProgress}
                value={progress}
                onChange={(e) =>
                  setProgress(Math.max(0, Math.min(maxProgress, parseInt(e.target.value) || 0)))
                }
                disabled={loading}
              />
              <span className="progress-max">/ {maxProgress}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rating-input">Rating (0.0 - 10.0, optional):</label>
            <input
              id="rating-input"
              type="text"
              value={ratingInput}
              onChange={handleRatingChange}
              onBlur={handleRatingBlur}
              placeholder="e.g., 9.2, 8.7, 7.5"
              disabled={loading}
              className="rating-decimal-input"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
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
