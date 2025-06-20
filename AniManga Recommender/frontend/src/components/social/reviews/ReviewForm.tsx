// ABOUTME: Review creation and editing form with rich text editor and rating system
// ABOUTME: Includes spoiler warnings, aspect ratings, and audience recommendations

import React, { useState, useCallback } from "react";
import { ReviewFormData } from "../../../types/reviews";

interface ReviewFormProps {
  onSubmit: (reviewData: Omit<ReviewFormData, "item_uid">) => void;
  onCancel: () => void;
  submitting: boolean;
  itemTitle: string;
  initialData?: Partial<ReviewFormData>;
  isEditing?: boolean;
}

const AUDIENCE_TAGS = [
  { id: "beginners", label: "Beginners", description: "New to anime/manga" },
  { id: "genre_fans", label: "Genre Fans", description: "Fans of this genre" },
  { id: "casual_viewers", label: "Casual Viewers", description: "Occasional watchers/readers" },
  { id: "hardcore_fans", label: "Hardcore Fans", description: "Dedicated enthusiasts" },
  { id: "all_ages", label: "All Ages", description: "Suitable for everyone" },
  { id: "mature_audiences", label: "Mature Audiences", description: "18+ recommended" },
];

const StarRating: React.FC<{
  value: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}> = ({ value, onChange, label, disabled = false }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className={`w-6 h-6 ${disabled ? "cursor-not-allowed" : "cursor-pointer"} transition-colors`}
          >
            <svg
              fill={(hover || value) >= star ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
              className={`w-full h-full ${
                (hover || value) >= star ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"
              }`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">{value}/10</span>
      </div>
    </div>
  );
};

export const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  onCancel,
  submitting,
  itemTitle,
  initialData,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState<Omit<ReviewFormData, "item_uid">>({
    title: initialData?.title || "",
    content: initialData?.content || "",
    overall_rating: initialData?.overall_rating || 7,
    story_rating: initialData?.story_rating || 0,
    characters_rating: initialData?.characters_rating || 0,
    art_rating: initialData?.art_rating || 0,
    sound_rating: initialData?.sound_rating || 0,
    contains_spoilers: initialData?.contains_spoilers || false,
    spoiler_level: initialData?.spoiler_level || "minor",
    recommended_for: initialData?.recommended_for || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    } else if (formData.title.length > 100) {
      newErrors.title = "Title must be 100 characters or less";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Review content is required";
    } else if (formData.content.length < 50) {
      newErrors.content = "Review must be at least 50 characters";
    } else if (formData.content.length > 5000) {
      newErrors.content = "Review must be 5000 characters or less";
    }

    if (formData.overall_rating < 1 || formData.overall_rating > 10) {
      newErrors.overall_rating = "Overall rating must be between 1 and 10";
    }

    if (formData.contains_spoilers && !formData.spoiler_level) {
      newErrors.spoiler_level = "Please specify spoiler level";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleAudienceTagToggle = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      recommended_for: prev.recommended_for.includes(tagId)
        ? prev.recommended_for.filter((tag) => tag !== tagId)
        : [...prev.recommended_for, tagId],
    }));
  };

  const insertSpoilerTag = () => {
    const textarea = document.getElementById("review-content") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);

      const spoilerText = selectedText || "spoiler content here";
      const newText = `${beforeText}[SPOILER]${spoilerText}[/SPOILER]${afterText}`;

      handleInputChange("content", newText);

      // Set cursor position after the spoiler tag
      setTimeout(() => {
        const newPosition = start + "[SPOILER]".length + spoilerText.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {isEditing ? "Edit Your Review" : "Write a Review"} for {itemTitle}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Review Title */}
        <div>
          <label
            htmlFor="review-title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Review Title *
          </label>
          <input
            id="review-title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Give your review a catchy title..."
            maxLength={100}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
              errors.title ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formData.title.length}/100 characters
          </p>
        </div>

        {/* Overall Rating */}
        <div>
          <StarRating
            value={formData.overall_rating}
            onChange={(value) => handleInputChange("overall_rating", value)}
            label="Overall Rating *"
            disabled={submitting}
          />
          {errors.overall_rating && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.overall_rating}</p>
          )}
        </div>

        {/* Aspect Ratings */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Detailed Ratings (Optional)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StarRating
              value={formData.story_rating ?? 0}
              onChange={(value) => handleInputChange("story_rating", value)}
              label="Story"
              disabled={submitting}
            />
            <StarRating
              value={formData.characters_rating ?? 0}
              onChange={(value) => handleInputChange("characters_rating", value)}
              label="Characters"
              disabled={submitting}
            />
            <StarRating
              value={formData.art_rating ?? 0}
              onChange={(value) => handleInputChange("art_rating", value)}
              label="Art/Animation"
              disabled={submitting}
            />
            <StarRating
              value={formData.sound_rating ?? 0}
              onChange={(value) => handleInputChange("sound_rating", value)}
              label="Sound/Music"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Review Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="review-content"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Your Review *
            </label>
            <button
              type="button"
              onClick={insertSpoilerTag}
              className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
            >
              Add Spoiler Tag
            </button>
          </div>
          <textarea
            id="review-content"
            value={formData.content}
            onChange={(e) => handleInputChange("content", e.target.value)}
            placeholder="Share your thoughts about this anime/manga... Use [SPOILER]spoiler text[/SPOILER] to hide spoilers."
            rows={8}
            maxLength={5000}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-vertical ${
              errors.content ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.content && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formData.content.length}/5000 characters
          </p>
        </div>

        {/* Spoiler Settings */}
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              id="contains-spoilers"
              type="checkbox"
              checked={formData.contains_spoilers}
              onChange={(e) => handleInputChange("contains_spoilers", e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label htmlFor="contains-spoilers" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              This review contains spoilers
            </label>
          </div>

          {formData.contains_spoilers && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Spoiler Level *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="minor"
                    checked={formData.spoiler_level === "minor"}
                    onChange={(e) => handleInputChange("spoiler_level", e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Minor Spoilers</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="major"
                    checked={formData.spoiler_level === "major"}
                    onChange={(e) => handleInputChange("spoiler_level", e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Major Spoilers</span>
                </label>
              </div>
              {errors.spoiler_level && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.spoiler_level}</p>
              )}
            </div>
          )}
        </div>

        {/* Recommended For */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recommended For (Optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleAudienceTagToggle(tag.id)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  formData.recommended_for.includes(tag.id)
                    ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
                title={tag.description}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? (
              <>
                <div className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isEditing ? "Updating..." : "Publishing..."}
              </>
            ) : isEditing ? (
              "Update Review"
            ) : (
              "Publish Review"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
