// ABOUTME: Modal component for editing custom list details like title, description, privacy settings, and tags
// ABOUTME: Provides form validation and API integration for updating list metadata

import React, { useState, useEffect } from "react";
import { CustomList } from "../../types/social";
import { TagInputComponent } from "./TagInputComponent";
import "./EditListModal.css";

interface EditListModalProps {
  list: CustomList;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedList: Partial<CustomList>) => Promise<void>;
}

export const EditListModal: React.FC<EditListModalProps> = ({ list, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: list.title,
    description: list.description || "",
    privacy: list.privacy === "public" ? "Public" : 
             list.privacy === "friends_only" ? "Friends Only" : "Private",
  });
  const [tags, setTags] = useState<string[]>(list.tags || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: list.title,
        description: list.description || "",
        privacy: list.privacy === "public" ? "Public" : 
                 list.privacy === "friends_only" ? "Friends Only" : "Private",
      });
      setTags(list.tags || []);
      setErrors({});
    }
  }, [isOpen, list]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    } else if (formData.title.length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    }

    if (formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: Partial<CustomList> = {
        title: formData.title.trim(),
        privacy: formData.privacy === "Public" ? "public" : 
                 formData.privacy === "Friends Only" ? "friends_only" : "private",
        tags: tags,
      };

      const trimmedDescription = formData.description.trim();
      if (trimmedDescription) {
        updateData.description = trimmedDescription;
      }

      await onUpdate(updateData);
      onClose();
    } catch (error) {
      console.error("Failed to update list:", error);
      setErrors({ submit: "Failed to update list. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-list-modal-overlay" onClick={onClose}>
      <div className="edit-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit List</h2>
          <button className="modal-close" onClick={onClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className={`form-input ${errors.title ? "error" : ""}`}
              placeholder="Enter list title"
              maxLength={100}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
            <span className="character-count">{formData.title.length}/100</span>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className={`form-textarea ${errors.description ? "error" : ""}`}
              placeholder="Enter list description (optional)"
              rows={4}
              maxLength={500}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
            <span className="character-count">{formData.description.length}/500</span>
          </div>

          <div className="form-group">
            <label htmlFor="privacy" className="form-label">
              Privacy Setting
            </label>
            <select
              id="privacy"
              value={formData.privacy}
              onChange={(e) => handleChange("privacy", e.target.value)}
              className="form-select"
            >
              <option value="Public">Public - Anyone can view</option>
              <option value="Friends Only">Friends Only - Only friends can view</option>
              <option value="Private">Private - Only you can view</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tags</label>
            <TagInputComponent tags={tags} onChange={setTags} />
          </div>

          {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="spinner"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
