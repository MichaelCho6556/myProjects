// ABOUTME: Tag input component for managing list tags with autocomplete and validation
// ABOUTME: Provides tag suggestions and handles tag creation with proper normalization

import React, { useState } from "react";

interface TagInputComponentProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
}

export const TagInputComponent: React.FC<TagInputComponentProps> = ({
  tags,
  onChange,
  maxTags = 5,
  placeholder = "Add tags...",
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !tags.includes(normalizedTag) && tags.length < maxTags) {
      onChange([...tags, normalizedTag]);
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
          >
            #{tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              �
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={tags.length >= maxTags ? "Maximum tags reached" : placeholder}
        disabled={tags.length >= maxTags}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Press Enter or comma to add tags. {tags.length}/{maxTags} tags used.
      </p>
    </div>
  );
};
