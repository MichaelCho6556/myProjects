// ABOUTME: React component for creating and editing comments with @mention functionality
// ABOUTME: Handles comment submission, mentions autocomplete, and spoiler warnings

import React, { useState, useRef, useEffect, useCallback } from "react";
import { CommentFormProps, MentionUser, CreateCommentRequest } from "../../../types/comments";
import { useMentions } from "../../../hooks/useComments";
import { logger } from "../../../utils/logger";

// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url) => {
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

import "./CommentForm.css";

export const CommentForm: React.FC<CommentFormProps> = ({
  parentType,
  parentId,
  parentCommentId,
  onCommentCreated,
  onCancel,
  placeholder = "Add a comment...",
  autoFocus = false,
}) => {
  const [content, setContent] = useState("");
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 });
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionUser[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentions, setMentions] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  const { searchUsers, loading: mentionLoading } = useMentions();

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  // Search for mention suggestions
  const searchMentions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setMentionSuggestions([]);
        return;
      }

      try {
        const users = await searchUsers(query);
        setMentionSuggestions(users);
        setSelectedMentionIndex(0);
      } catch (error) {
        logger.error("Error searching mentions", {
          error: error instanceof Error ? error.message : "Unknown error",
          context: "CommentForm",
          operation: "searchMentions",
          query: query
        });
        setMentionSuggestions([]);
      }
    },
    [searchUsers]
  );

  // Handle content change and detect @mentions
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPosition = e.target.selectionStart;

    setContent(newContent);

    // Check for @ mentions
    const beforeCursor = newContent.slice(0, cursorPosition);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      const start = beforeCursor.lastIndexOf("@");

      setMentionPosition({ start, end: cursorPosition });
      setShowMentions(true);
      searchMentions(query);
    } else {
      setShowMentions(false);
      setMentionSuggestions([]);
    }
  };

  // Handle mention selection
  const selectMention = (user: MentionUser) => {
    const beforeMention = content.slice(0, mentionPosition.start);
    const afterMention = content.slice(mentionPosition.end);
    const mentionText = `@${user.username}`;

    const newContent = beforeMention + mentionText + " " + afterMention;
    setContent(newContent);

    // Add to mentions array if not already present
    if (!mentions.includes(user.id)) {
      setMentions((prev) => [...prev, user.id]);
    }

    setShowMentions(false);
    setMentionSuggestions([]);

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = mentionPosition.start + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 10);
  };

  // Handle keyboard navigation for mentions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev < mentionSuggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : mentionSuggestions.length - 1));
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        selectMention(mentionSuggestions[selectedMentionIndex]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
        setMentionSuggestions([]);
      }
    }

    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      return;
    }

    setIsSubmitting(true);

    try {
      const commentData: CreateCommentRequest = {
        parent_type: parentType,
        parent_id: parentId,
        content: trimmedContent,
        parent_comment_id: parentCommentId,
        contains_spoilers: containsSpoilers,
        mentions: mentions.length > 0 ? mentions : undefined,
      };

      if (onCommentCreated) {
        onCommentCreated(commentData);
      }

      // Reset form
      setContent("");
      setContainsSpoilers(false);
      setMentions([]);
    } catch (error) {
      logger.error("Error creating comment", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "CommentForm",
        operation: "handleSubmit",
        parentType: parentType,
        parentId: parentId,
        parentCommentId: parentCommentId
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent("");
    setContainsSpoilers(false);
    setMentions([]);
    setShowMentions(false);
    setMentionSuggestions([]);

    if (onCancel) {
      onCancel();
    }
  };

  const isFormValid = content.trim().length >= 10 && content.trim().length <= 2000;
  const characterCount = content.length;
  const characterLimit = 2000;

  return (
    <div className="comment-form">
      <form onSubmit={handleSubmit}>
        <div className="comment-form-input-container">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`comment-form-textarea ${showMentions ? "mentions-active" : ""}`}
            rows={3}
            maxLength={characterLimit}
            disabled={isSubmitting}
          />

          {/* Mention suggestions dropdown */}
          {showMentions && mentionSuggestions.length > 0 && (
            <div className="mention-dropdown" ref={mentionDropdownRef}>
              {mentionSuggestions.map((user, index) => (
                <div
                  key={user.id}
                  className={`mention-suggestion ${index === selectedMentionIndex ? "selected" : ""}`}
                  onClick={() => selectMention(user)}
                >
                  <div className="mention-avatar">
                    {user.avatar_url ? (
                      <img src={sanitizeUrl(user.avatar_url)} alt={user.username} />
                    ) : (
                      <div className="mention-avatar-placeholder">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="mention-info">
                    <div className="mention-username">@{user.username}</div>
                    {user.display_name && <div className="mention-display-name">{user.display_name}</div>}
                  </div>
                </div>
              ))}
              {mentionLoading && <div className="mention-loading">Searching users...</div>}
            </div>
          )}
        </div>

        <div className="comment-form-options">
          <label className="spoiler-checkbox">
            <input
              type="checkbox"
              checked={containsSpoilers}
              onChange={(e) => setContainsSpoilers(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>Contains spoilers</span>
          </label>

          <div className="character-count">
            <span className={characterCount > characterLimit * 0.9 ? "warning" : ""}>
              {characterCount}/{characterLimit}
            </span>
          </div>
        </div>

        <div className="comment-form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="comment-form-cancel"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}

          <button type="submit" className="comment-form-submit" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? "Posting..." : parentCommentId ? "Reply" : "Comment"}
          </button>
        </div>

        {content.trim().length > 0 && content.trim().length < 10 && (
          <div className="comment-form-error">Comments must be at least 10 characters long</div>
        )}
      </form>
    </div>
  );
};
