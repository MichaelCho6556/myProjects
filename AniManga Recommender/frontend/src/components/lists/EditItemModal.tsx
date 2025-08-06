// ABOUTME: Enhanced modal component for editing individual items within custom lists
// ABOUTME: Provides comprehensive interface for updating ratings, notes, tags, status, dates, and rewatch count

import React, { useState, useEffect, useRef } from "react";
import { ListItem } from "../../types/social";
import { logger } from "../../utils/logger";

import "./EditItemModal.css";

// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url: string) => {
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

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: string, updatedData: Partial<ListItem>) => Promise<void>;
  item: ListItem | null;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({ isOpen, onClose, onSave, item }) => {
  const [notes, setNotes] = useState("");
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [watchStatus, setWatchStatus] = useState<string>("plan_to_watch");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [dateStarted, setDateStarted] = useState("");
  const [dateCompleted, setDateCompleted] = useState("");
  const [rewatchCount, setRewatchCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Tag input handling
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setNotes(item.notes || "");
      setPersonalRating(item.personalRating || null);
      setWatchStatus(item.watchStatus || "plan_to_watch");
      setCustomTags(item.customTags || []);
      setDateStarted(item.dateStarted || "");
      setDateCompleted(item.dateCompleted || "");
      setRewatchCount(item.rewatchCount || 0);
      setHasChanges(false);
    }
  }, [item]);

  useEffect(() => {
    if (item) {
      const originalNotes = item.notes || "";
      const originalRating = item.personalRating || null;
      const originalStatus = item.watchStatus || "plan_to_watch";
      const originalTags = JSON.stringify(item.customTags || []);
      const originalDateStarted = item.dateStarted || "";
      const originalDateCompleted = item.dateCompleted || "";
      const originalRewatchCount = item.rewatchCount || 0;

      const currentNotes = notes.trim();
      const currentTags = JSON.stringify(customTags);

      setHasChanges(
        currentNotes !== originalNotes ||
          personalRating !== originalRating ||
          watchStatus !== originalStatus ||
          currentTags !== originalTags ||
          dateStarted !== originalDateStarted ||
          dateCompleted !== originalDateCompleted ||
          rewatchCount !== originalRewatchCount
      );
    }
  }, [notes, personalRating, watchStatus, customTags, dateStarted, dateCompleted, rewatchCount, item]);

  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      const updatedData: Partial<ListItem> = {};

      // Only include properties that have values
      const trimmedNotes = notes.trim();
      if (trimmedNotes) {
        updatedData.notes = trimmedNotes;
      }

      if (personalRating !== null) {
        updatedData.personalRating = personalRating;
      }

      if (watchStatus) {
        updatedData.watchStatus = watchStatus as
          | "plan_to_watch"
          | "watching"
          | "completed"
          | "on_hold"
          | "dropped";
      }

      if (customTags.length > 0) {
        updatedData.customTags = customTags;
      }

      if (dateStarted) {
        updatedData.dateStarted = dateStarted;
      }

      if (dateCompleted) {
        updatedData.dateCompleted = dateCompleted;
      }

      if (rewatchCount > 0) {
        updatedData.rewatchCount = rewatchCount;
      }

      await onSave(item.id, updatedData);
      onClose();
    } catch (error) {
      logger.error("Failed to save item", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "EditItemModal",
        operation: "handleSave",
        itemId: item?.id,
        itemUid: item?.itemUid
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const handleStarClick = (rating: number) => {
    setPersonalRating(rating === personalRating ? null : rating);
  };

  const handleRatingInputChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 10) {
      setPersonalRating(null);
    } else {
      setPersonalRating(Math.round(numValue * 10) / 10);
    }
  };

  const clearRating = () => {
    setPersonalRating(null);
  };

  const handleStatusChange = (status: string) => {
    setWatchStatus(status);

    // Auto-set completion date when status changes to completed
    if (status === "completed" && !dateCompleted) {
      setDateCompleted(new Date().toISOString().split("T")[0]);
    }
  };

  // Tag management functions
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !customTags.includes(trimmedTag) && customTags.length < 10) {
      setCustomTags([...customTags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && customTags.length > 0) {
      removeTag(customTags[customTags.length - 1]);
    }
  };

  const getDisplayMediaType = (mediaType: string): string => {
    if (!mediaType) return "Anime";

    const type = mediaType.toLowerCase().trim();

    if (type === "tv" || type === "ova" || type === "movie" || type === "special" || type === "ona") {
      return "Anime";
    }

    if (
      type === "manga" ||
      type === "manhwa" ||
      type === "manhua" ||
      type === "one_shot" ||
      type === "doujinshi"
    ) {
      return "Manga";
    }

    return mediaType.charAt(0).toUpperCase() + mediaType.slice(1).toLowerCase();
  };

  const statusOptions = [
    { value: "plan_to_watch", label: "Plan to Watch", color: "#3b82f6" },
    { value: "watching", label: "Watching", color: "#10b981" },
    { value: "completed", label: "Completed", color: "#8b5cf6" },
    { value: "on_hold", label: "On Hold", color: "#f59e0b" },
    { value: "dropped", label: "Dropped", color: "#ef4444" },
  ];

  if (!isOpen || !item) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="edit-item-modal enhanced" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Item Details</h2>
          <button className="close-button" onClick={handleClose} disabled={isSaving} aria-label="Close modal">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Item Info */}
          <div className="item-info">
            {item.imageUrl && <img src={sanitizeUrl(item.imageUrl)} alt={item.title} className="item-image" />}
            <div className="item-details">
              <h3>{item.title}</h3>
              <span className="media-type">{getDisplayMediaType(item.mediaType)}</span>
            </div>
          </div>

          <div className="form-sections">
            {/* Personal Rating Section */}
            <div className="form-section">
              <div className="section-header">
                <h4>Personal Rating</h4>
                {personalRating && (
                  <button
                    type="button"
                    onClick={clearRating}
                    className="clear-rating-btn"
                    disabled={isSaving}
                  >
                    Clear Rating
                  </button>
                )}
              </div>
              <div className="rating-controls">
                <div className="star-rating">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star ${
                        personalRating && star <= Math.floor(personalRating) ? "filled" : ""
                      } ${
                        personalRating && star === Math.floor(personalRating) + 1 && personalRating % 1 !== 0
                          ? "half-filled"
                          : ""
                      }`}
                      onClick={() => handleStarClick(star)}
                      disabled={isSaving}
                      aria-label={`Rate ${star} out of 10`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className="rating-input-section">
                  <div className="rating-input-container">
                    <input
                      id="rating-input"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={personalRating || ""}
                      onChange={(e) => handleRatingInputChange(e.target.value)}
                      placeholder="Enter rating (0.0 - 10.0)"
                      className="rating-input"
                      disabled={isSaving}
                    />
                    <span className="rating-suffix">/10</span>
                  </div>
                  {personalRating && (
                    <div className="rating-display">
                      <span className="rating-value">★ {personalRating}/10</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Watch Status Section */}
            <div className="form-section">
              <div className="section-header">
                <h4>Watch Status</h4>
              </div>
              <div className="status-buttons">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`status-btn ${option.value.replace("_", "-")} ${
                      watchStatus === option.value ? "active" : ""
                    }`}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={isSaving}
                    style={{ borderColor: watchStatus === option.value ? option.color : undefined }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates Section */}
            <div className="form-section">
              <div className="section-header">
                <h4>Dates</h4>
              </div>
              <div className="date-inputs">
                <div className="form-group">
                  <label htmlFor="date-started" className="form-label">
                    Date Started:
                  </label>
                  <input
                    id="date-started"
                    type="date"
                    value={dateStarted}
                    onChange={(e) => setDateStarted(e.target.value)}
                    className="date-input"
                    disabled={isSaving}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="date-completed" className="form-label">
                    Date Completed:
                  </label>
                  <input
                    id="date-completed"
                    type="date"
                    value={dateCompleted}
                    onChange={(e) => setDateCompleted(e.target.value)}
                    className="date-input"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Rewatch Count Section */}
            <div className="form-section">
              <div className="section-header">
                <h4>Times {item.mediaType === "manga" ? "Re-read" : "Rewatched"}</h4>
              </div>
              <div className="rewatch-controls">
                <button
                  type="button"
                  onClick={() => setRewatchCount(Math.max(0, rewatchCount - 1))}
                  className="rewatch-btn decrease"
                  disabled={isSaving || rewatchCount <= 0}
                  aria-label="Decrease rewatch count"
                >
                  −
                </button>
                <div className="rewatch-count-display">
                  <span className="rewatch-count">{rewatchCount}</span>
                  <span className="rewatch-label">times</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRewatchCount(rewatchCount + 1)}
                  className="rewatch-btn increase"
                  disabled={isSaving}
                  aria-label="Increase rewatch count"
                >
                  +
                </button>
              </div>
            </div>

            {/* Custom Tags Section */}
            <div className="form-section">
              <div className="section-header">
                <h4>Custom Tags</h4>
                <span className="tag-count">{customTags.length}/10</span>
              </div>
              <div className="tags-container">
                <div className="tags-list">
                  {customTags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="tag-remove"
                        disabled={isSaving}
                        aria-label={`Remove ${tag} tag`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {customTags.length < 10 && (
                  <div className="tag-input-container">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="Add a tag and press Enter"
                      className="tag-input"
                      disabled={isSaving}
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={() => addTag(tagInput)}
                      className="tag-add-btn"
                      disabled={isSaving || !tagInput.trim()}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
              <small className="tag-help">
                Press Enter or comma to add tags. Max 10 tags, 20 characters each.
              </small>
            </div>

            {/* Personal Notes Section */}
            <div className="form-section">
              <div className="section-header">
                <h4>Personal Notes</h4>
              </div>
              <div className="textarea-container">
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your thoughts, review, or notes about this item..."
                  rows={4}
                  maxLength={1000}
                  disabled={isSaving}
                  className="notes-textarea"
                />
                <div className="character-count">
                  <span className={notes.length > 900 ? "warning" : notes.length > 800 ? "caution" : ""}>
                    {notes.length}/1000 characters
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-buttons">
            <button type="button" className="cancel-button" onClick={handleClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              type="button"
              className="save-button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
