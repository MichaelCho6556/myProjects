// ABOUTME: Inline edit panel that appears directly under the item being edited
// ABOUTME: Provides compact, tabbed interface for editing item details without losing context

import React, { useState, useEffect, useRef } from "react";
import { ListItem } from "../../types/social";
import { logger } from "../../utils/logger";

import "./InlineEditPanel.css";

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

interface InlineEditPanelProps {
  item: ListItem;
  onSave: (itemId: string, updatedData: Partial<ListItem>) => Promise<void>;
  onCancel: () => void;
  isVisible: boolean;
}

type TabType = "rating" | "notes" | "details";

export const InlineEditPanel: React.FC<InlineEditPanelProps> = ({ item, onSave, onCancel, isVisible }) => {
  const [activeTab, setActiveTab] = useState<TabType>("rating");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [watchStatus, setWatchStatus] = useState<string>("plan_to_watch");
  const [notes, setNotes] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [dateStarted, setDateStarted] = useState("");
  const [dateCompleted, setDateCompleted] = useState("");
  const [rewatchCount, setRewatchCount] = useState(0);

  // Tag input
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with item data
  useEffect(() => {
    if (item) {
      setPersonalRating(item.personalRating || null);
      setWatchStatus(item.watchStatus || "plan_to_watch");
      setNotes(item.notes || "");
      setCustomTags(item.customTags || []);
      setDateStarted(item.dateStarted || "");
      setDateCompleted(item.dateCompleted || "");
      setRewatchCount(item.rewatchCount || 0);
      setHasChanges(false);
    }
  }, [item]);

  // Track changes
  useEffect(() => {
    if (item) {
      const originalRating = item.personalRating || null;
      const originalStatus = item.watchStatus || "plan_to_watch";
      const originalNotes = item.notes || "";
      const originalTags = JSON.stringify(item.customTags || []);
      const originalDateStarted = item.dateStarted || "";
      const originalDateCompleted = item.dateCompleted || "";
      const originalRewatchCount = item.rewatchCount || 0;

      const currentTags = JSON.stringify(customTags);

      setHasChanges(
        personalRating !== originalRating ||
          watchStatus !== originalStatus ||
          notes.trim() !== originalNotes ||
          currentTags !== originalTags ||
          dateStarted !== originalDateStarted ||
          dateCompleted !== originalDateCompleted ||
          rewatchCount !== originalRewatchCount
      );
    }
  }, [personalRating, watchStatus, notes, customTags, dateStarted, dateCompleted, rewatchCount, item]);

  // Check for date validation errors
  const hasDateErrors = Boolean(
    (dateStarted && dateCompleted && dateStarted > dateCompleted) ||
      (dateCompleted && dateStarted && dateCompleted < dateStarted)
  );

  const handleSave = async () => {
    if (!item || !hasChanges || hasDateErrors) return;

    setIsSaving(true);
    try {
      // Split updates into two parts: list item and personal tracking
      const listItemData: any = {};
      const userItemData: any = {};

      // List item updates (only notes are supported for custom list items)
      const trimmedNotes = notes.trim();
      if (trimmedNotes !== (item.notes || "")) {
        listItemData.notes = trimmedNotes || null;
      }

      // Personal tracking updates (go to user_items table)
      if (personalRating !== null && personalRating !== (item.personalRating || null)) {
        userItemData.rating = personalRating;
      }

      if (watchStatus !== (item.watchStatus || "plan_to_watch")) {
        userItemData.status = watchStatus;
      }

      if (JSON.stringify(customTags) !== JSON.stringify(item.customTags || [])) {
        userItemData.customTags = customTags.length > 0 ? customTags : null;
      }

      if (dateStarted !== (item.dateStarted || "")) {
        userItemData.started_date = dateStarted || null;
      }

      if (dateCompleted !== (item.dateCompleted || "")) {
        userItemData.completion_date = dateCompleted || null;
      }

      if (rewatchCount !== (item.rewatchCount || 0)) {
        userItemData.rewatchCount = rewatchCount > 0 ? rewatchCount : 0;
      }

      // Update list item (only notes)
      if (Object.keys(listItemData).length > 0) {
        await onSave(item.id, listItemData);
      }

      // Update personal tracking if needed
      if (Object.keys(userItemData).length > 0) {
        // Store personal tracking data locally until backend supports it
        const storageKey = `user-item-tracking-${item.itemUid || item.id}`;
        const existingData = JSON.parse(localStorage.getItem(storageKey) || "{}");
        const mergedData = { ...existingData, ...userItemData };
        localStorage.setItem(storageKey, JSON.stringify(mergedData));


        // Also update the item in the parent component's state for immediate UI feedback
        const updatedItemData: Partial<ListItem> = {
          ...listItemData,
          ...(personalRating !== null && { personalRating }),
          ...(watchStatus && { watchStatus: watchStatus as any }),
          ...(customTags.length > 0 && { customTags }),
          ...(dateStarted && { dateStarted }),
          ...(dateCompleted && { dateCompleted }),
          ...(rewatchCount > 0 && { rewatchCount }),
        };

        // Call onSave with all the updated data so the UI reflects the changes immediately
        await onSave(item.id, updatedItemData);
      } else if (Object.keys(listItemData).length === 0) {
        // If only personal tracking data changed, still need to call onSave for UI update
        const updatedItemData: Partial<ListItem> = {
          ...(personalRating !== null && { personalRating }),
          ...(watchStatus && { watchStatus: watchStatus as any }),
          ...(customTags.length > 0 && { customTags }),
          ...(dateStarted && { dateStarted }),
          ...(dateCompleted && { dateCompleted }),
          ...(rewatchCount > 0 && { rewatchCount }),
        };
        await onSave(item.id, updatedItemData);
      }

      // Close the edit panel on successful save
      onCancel();
    } catch (error) {
      logger.error("Failed to save item", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "InlineEditPanel",
        operation: "handleSave",
        itemId: item?.id,
        itemUid: item?.itemUid
      });
      throw error; // Re-throw so the error handling in the UI can show feedback
    } finally {
      setIsSaving(false);
    }
  };

  const handleStarClick = (rating: number) => {
    setPersonalRating(rating === personalRating ? null : rating);
  };

  const handleRatingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Allow empty input
    if (inputValue === "") {
      setPersonalRating(null);
      return;
    }

    // Restrict to one decimal place using regex
    const decimalRegex = /^\d{1,2}(\.\d{0,1})?$/;
    if (!decimalRegex.test(inputValue)) {
      // If input doesn't match pattern, don't update
      return;
    }

    const value = parseFloat(inputValue);
    if (isNaN(value) || value < 0) {
      setPersonalRating(null);
    } else if (value > 10) {
      setPersonalRating(10);
    } else {
      // Round to 1 decimal place to ensure consistency
      setPersonalRating(Math.round(value * 10) / 10);
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

  const statusOptions = [
    { value: "plan_to_watch", label: "Plan to Watch", color: "#3b82f6", icon: "📋" },
    { value: "watching", label: "Watching", color: "#10b981", icon: "▶️" },
    { value: "completed", label: "Completed", color: "#8b5cf6", icon: "✅" },
    { value: "on_hold", label: "On Hold", color: "#f59e0b", icon: "⏸️" },
    { value: "dropped", label: "Dropped", color: "#ef4444", icon: "❌" },
  ];

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

  if (!isVisible) return null;

  return (
    <div className="inline-edit-panel">
      <div className="edit-panel-header">
        <div className="item-preview">
          {item.imageUrl && <img src={sanitizeUrl(item.imageUrl)} alt={item.title} className="preview-image" />}
          <div className="preview-details">
            <h4 className="preview-title">{item.title}</h4>
            <span className="preview-type">{getDisplayMediaType(item.mediaType)}</span>
          </div>
        </div>
        <button className="close-btn" onClick={onCancel} disabled={isSaving}>
          ×
        </button>
      </div>

      <div className="edit-panel-tabs">
        <button
          className={`tab-btn ${activeTab === "rating" ? "active" : ""}`}
          onClick={() => setActiveTab("rating")}
        >
          ⭐ Rating & Status
        </button>
        <button
          className={`tab-btn ${activeTab === "notes" ? "active" : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          📝 Notes
        </button>
        <button
          className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          🏷️ Tags & Dates
        </button>
      </div>

      <div className="edit-panel-content">
        {/* Rating & Status Tab */}
        {activeTab === "rating" && (
          <div className="tab-content">
            {/* Enhanced Rating */}
            <div className="quick-rating">
              <label className="field-label">Personal Rating</label>

              <div className="rating-system">
                {/* Star rating for quick selection */}
                <div className="star-rating-compact">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star ${
                        personalRating && star <= Math.floor(personalRating) ? "filled" : ""
                      }`}
                      onClick={() => handleStarClick(star)}
                      disabled={isSaving}
                      title={`Rate ${star}/10`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                {/* Precise rating input */}
                <div className="rating-input-section">
                  <div className="rating-input-group">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={personalRating || ""}
                      onChange={handleRatingInputChange}
                      placeholder="8.7"
                      className="rating-input"
                      disabled={isSaving}
                      pattern="^\d{1,2}(\.\d{0,1})?$"
                      title="Enter a rating between 0.0 and 10.0 (one decimal place maximum)"
                    />
                    <span className="rating-suffix">/10</span>
                    {personalRating && (
                      <button onClick={clearRating} className="clear-rating-btn" disabled={isSaving}>
                        Clear
                      </button>
                    )}
                  </div>

                  {personalRating && (
                    <div className="rating-display">
                      <span className="rating-value">★ {personalRating}/10</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Selection */}
            <div className="quick-status">
              <label className="field-label">Watch Status</label>
              <div className="status-grid">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`status-option ${watchStatus === option.value ? "active" : ""}`}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={isSaving}
                    style={{ "--status-color": option.color } as React.CSSProperties}
                  >
                    <span className="status-icon">{option.icon}</span>
                    <span className="status-label">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rewatch Counter */}
            <div className="rewatch-section">
              <label className="field-label">
                {getDisplayMediaType(item.mediaType) === "Anime" ? "Rewatch Count" : "Reread Count"}
              </label>
              <div className="counter-controls">
                <button
                  type="button"
                  onClick={() => setRewatchCount(Math.max(0, rewatchCount - 1))}
                  disabled={isSaving || rewatchCount <= 0}
                  className="counter-btn"
                >
                  -
                </button>
                <span className="counter-value">{rewatchCount}</span>
                <button
                  type="button"
                  onClick={() => setRewatchCount(rewatchCount + 1)}
                  disabled={isSaving}
                  className="counter-btn"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="tab-content">
            <label className="field-label">Personal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your thoughts, review, or any notes about this item..."
              className="notes-input"
              rows={4}
              maxLength={1000}
              disabled={isSaving}
            />
            <div className="character-count">
              <span className={notes.length > 900 ? "warning" : notes.length > 800 ? "caution" : ""}>
                {notes.length}/1000
              </span>
            </div>
          </div>
        )}

        {/* Tags & Dates Tab */}
        {activeTab === "details" && (
          <div className="tab-content">
            {/* Custom Tags */}
            <div className="tags-section">
              <label className="field-label">Custom Tags</label>
              <div className="tags-container">
                {customTags.map((tag) => (
                  <span key={tag} className="tag-item">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="tag-remove"
                      disabled={isSaving}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {customTags.length < 10 && (
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Add tag..."
                    className="tag-input"
                    maxLength={20}
                    disabled={isSaving}
                  />
                )}
              </div>
              <div className="tags-help">Press Enter or comma to add tags. Max 10 tags, 20 chars each.</div>
            </div>

            {/* Dates */}
            <div className="dates-section">
              <div className="date-field">
                <label className="field-label">Date Started</label>
                <input
                  type="date"
                  value={dateStarted}
                  onChange={(e) => setDateStarted(e.target.value)}
                  className="date-input"
                  disabled={isSaving}
                  max={dateCompleted || undefined}
                  title={dateCompleted ? "Start date cannot be after completion date" : "Select start date"}
                />
                {dateStarted && dateCompleted && dateStarted > dateCompleted && (
                  <div className="date-validation-error">⚠️ Start date cannot be after completion date</div>
                )}
              </div>
              <div className="date-field">
                <label className="field-label">Date Completed</label>
                <input
                  type="date"
                  value={dateCompleted}
                  onChange={(e) => setDateCompleted(e.target.value)}
                  className="date-input"
                  disabled={isSaving}
                  min={dateStarted || undefined}
                  title={
                    dateStarted ? "Completion date cannot be before start date" : "Select completion date"
                  }
                />
                {dateCompleted && dateStarted && dateCompleted < dateStarted && (
                  <div className="date-validation-error">⚠️ Completion date cannot be before start date</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="edit-panel-actions">
        <button type="button" onClick={onCancel} className="btn-cancel" disabled={isSaving}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn-save"
          disabled={isSaving || !hasChanges || hasDateErrors}
        >
          {isSaving ? (
            <>
              <div className="spinner"></div>
              Saving...
            </>
          ) : hasDateErrors ? (
            "Fix Date Errors"
          ) : (
            <>Save Changes{hasChanges ? " •" : ""}</>
          )}
        </button>
      </div>
    </div>
  );
};
