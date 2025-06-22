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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setNotes(item.notes || "");
      setPersonalRating(null); // We'll extend the ListItem type to include rating later
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      const updatedData: Partial<ListItem> = {};
      
      // Only include notes if there's actual content
      const trimmedNotes = notes.trim();
      if (trimmedNotes) {
        updatedData.notes = trimmedNotes;
      }

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
              <span className="media-type">{item.mediaType}</span>
            </div>
          </div>

          {/* Personal Rating */}
          <div className="form-group">
            <label>Personal Rating</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${
                    personalRating && star <= personalRating ? "filled" : ""
                  }`}
                  onClick={() => handleStarClick(star)}
                  disabled={isSaving}
                >
                  ★
                </button>
              ))}
              {personalRating && (
                <span className="rating-value">{personalRating}/10</span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes">Personal Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your thoughts, progress notes, or any personal comments about this item..."
              rows={4}
              maxLength={1000}
              disabled={isSaving}
            />
            <div className="character-count">
              {notes.length}/1000 characters
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="form-group">
              <label>Quick Status</label>
              <div className="status-buttons">
                <button type="button" className="status-btn watching">
                  Currently Watching/Reading
                </button>
                <button type="button" className="status-btn completed">
                  Completed
                </button>
                <button type="button" className="status-btn on-hold">
                  On Hold
                </button>
                <button type="button" className="status-btn dropped">
                  Dropped
                </button>
                <button type="button" className="status-btn plan-to">
                  Plan to Watch/Read
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
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
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};