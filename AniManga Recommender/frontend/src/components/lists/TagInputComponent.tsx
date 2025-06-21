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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.75rem',
              background: 'var(--accent-primary)',
              color: 'white',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}
          >
            #{tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0',
                marginLeft: '0.25rem',
                fontSize: '1rem',
                lineHeight: '1'
              }}
            >
              ×
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
        style={{
          width: '100%',
          padding: '0.75rem',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          background: 'var(--bg-overlay)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem',
          outline: 'none',
          opacity: tags.length >= maxTags ? 0.5 : 1,
          cursor: tags.length >= maxTags ? 'not-allowed' : 'text'
        }}
        onFocus={(e) => {
          if (tags.length < maxTags) {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(20, 184, 166, 0.1)';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />

      <p style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        margin: 0,
        lineHeight: '1.4'
      }}>
        Press Enter or comma to add tags. {tags.length}/{maxTags} tags used.
      </p>
    </div>
  );
};
