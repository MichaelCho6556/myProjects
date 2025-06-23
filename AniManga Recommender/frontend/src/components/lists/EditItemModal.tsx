// ABOUTME: Modal component for editing individual items within custom lists
// ABOUTME: Provides interface for updating item notes, ratings, and other metadata

import React, { useState, useEffect } from "react";
import { ListItem } from "../../types/social";
import "./EditItemModal.css";

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: string, updatedData: Partial<ListItem>) => Promise<void>;
  item: ListItem | null;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  item,
}) => {
  const [notes, setNotes] = useState("");
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [watchStatus, setWatchStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (item) {
      setNotes(item.notes || "");
      setPersonalRating(null); // We'll extend the ListItem type to include rating later
      setWatchStatus(null);
      setHasChanges(false);
    }
  }, [item]);

  useEffect(() => {
    if (item) {
      const originalNotes = item.notes || "";
      const currentNotes = notes.trim();
      setHasChanges(currentNotes !== originalNotes || personalRating !== null || watchStatus !== null);
    }
  }, [notes, personalRating, watchStatus, item]);

  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      const updatedData: any = {};
      
      // Include notes (allow clearing by sending empty string)
      const trimmedNotes = notes.trim();
      updatedData.notes = trimmedNotes;
      
      // Include personal rating if set
      if (personalRating !== null) {
        updatedData.personal_rating = personalRating;
      }
      
      // Include watch status if set  
      if (watchStatus !== null) {
        updatedData.status = watchStatus;
      }
      
      console.log('Sending update data:', updatedData);

      await onSave(item.id, updatedData);
      onClose();
    } catch (error) {
      console.error("Failed to save item:", error);
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
      setPersonalRating(Math.round(numValue * 10) / 10); // Round to 1 decimal place
    }
  };

  const getDisplayMediaType = (mediaType: string): string => {
    // Debug: Log the actual value we receive
    console.log('MediaType received:', JSON.stringify(mediaType), 'Type:', typeof mediaType);
    
    // Handle null, undefined, and empty values
    if (mediaType === null || mediaType === undefined || !mediaType || 
        (typeof mediaType === 'string' && mediaType.trim() === '') || 
        mediaType === 'null' || mediaType === 'undefined') {
      return 'Anime'; // Default to Anime instead of Unknown
    }
    
    const type = mediaType.toLowerCase().trim();
    
    // Handle specific anime types
    if (type === 'tv' || type === 'ova' || type === 'movie' || type === 'special' || type === 'ona') {
      return 'Anime';
    }
    
    // Handle manga types
    if (type === 'manga' || type === 'manhwa' || type === 'manhua' || type === 'one_shot' || type === 'doujinshi') {
      return 'Manga';
    }
    
    // Handle video/promotional content - these should still be Anime if they're anime related
    if (type === 'pv' || type === 'cm' || type === 'music') {
      return 'Anime'; // Changed from 'Video' to 'Anime' since PV usually means anime preview
    }
    
    // Handle novels
    if (type === 'novel' || type === 'light_novel') {
      return 'Novel';
    }
    
    // For completely empty or null values, check if we can infer from title or other context
    if (!type || type === '') {
      return 'Anime'; // Default to Anime for items without type
    }
    
    // Default to capitalizing first letter for other types
    return mediaType.charAt(0).toUpperCase() + mediaType.slice(1).toLowerCase();
  };

  const handleStatusClick = (status: string) => {
    setWatchStatus(watchStatus === status ? null : status);
  };

  const clearRating = () => {
    setPersonalRating(null);
  };

  if (!isOpen || !item) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="edit-item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Item</h2>
          <button
            className="close-button"
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Item Info */}
          <div className="item-info">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="item-image"
              />
            )}
            <div className="item-details">
              <h3>{item.title}</h3>
              <span className="media-type">{getDisplayMediaType(item.mediaType)}</span>
            </div>
          </div>

          {/* Personal Rating */}
          <div className="form-group">
            <div className="rating-header">
              <label className="form-label">Personal Rating</label>
              {personalRating && (
                <button
                  type="button"
                  onClick={clearRating}
                  className="clear-rating-btn"
                  disabled={isSaving}
                >
                  Clear
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
                      personalRating && star === Math.ceil(personalRating) && personalRating % 1 !== 0 ? "half-filled" : ""
                    }`}
                    onClick={() => handleStarClick(star)}
                    disabled={isSaving}
                    aria-label={`Rate ${star} out of 10`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="rating-input-container">
                <label htmlFor="rating-input" className="rating-input-label">Precise Rating:</label>
                <input
                  id="rating-input"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={personalRating || ''}
                  onChange={(e) => handleRatingInputChange(e.target.value)}
                  placeholder="0.0 - 10.0"
                  className="rating-input"
                  disabled={isSaving}
                />
                <span className="rating-suffix">/10</span>
              </div>
            </div>
            {personalRating && (
              <div className="rating-display">
                <span className="rating-value">{personalRating}/10</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes" className="form-label">Personal Notes</label>
            <div className="textarea-container">
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your thoughts or notes about this item..."
                rows={3}
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

          {/* Quick Status */}
          <div className="quick-actions">
            <div className="form-group">
              <label className="form-label">Watch Status</label>
              <div className="status-buttons">
                <button 
                  type="button" 
                  className={`status-btn watching ${watchStatus === 'watching' ? 'active' : ''}`}
                  onClick={() => handleStatusClick('watching')}
                  disabled={isSaving}
                >
                  Currently {item?.mediaType === 'Manga' ? 'Reading' : 'Watching'}
                </button>
                <button 
                  type="button" 
                  className={`status-btn completed ${watchStatus === 'completed' ? 'active' : ''}`}
                  onClick={() => handleStatusClick('completed')}
                  disabled={isSaving}
                >
                  Completed
                </button>
                <button 
                  type="button" 
                  className={`status-btn on-hold ${watchStatus === 'on-hold' ? 'active' : ''}`}
                  onClick={() => handleStatusClick('on-hold')}
                  disabled={isSaving}
                >
                  On Hold
                </button>
                <button 
                  type="button" 
                  className={`status-btn dropped ${watchStatus === 'dropped' ? 'active' : ''}`}
                  onClick={() => handleStatusClick('dropped')}
                  disabled={isSaving}
                >
                  Dropped
                </button>
                <button 
                  type="button" 
                  className={`status-btn plan-to ${watchStatus === 'plan-to' ? 'active' : ''}`}
                  onClick={() => handleStatusClick('plan-to')}
                  disabled={isSaving}
                >
                  Plan to {item?.mediaType === 'Manga' ? 'Read' : 'Watch'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-buttons">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={isSaving}
            >
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