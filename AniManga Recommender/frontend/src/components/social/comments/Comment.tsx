// ABOUTME: Individual comment component with recursive rendering for threaded discussions
// ABOUTME: Handles comment display, editing, deletion, reactions, and reply functionality

import React, { useState, useEffect } from "react";
import { CommentItemProps, ReactionType } from "../../../types/comments";
import { CommentForm } from "./CommentForm";
import { CommentReactionsComponent } from "./CommentReactionsComponent";
import { useAuth } from "../../../context/AuthContext";
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

import "./Comment.css";

export const Comment: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onReact,
  canModerate = false,
  currentUserId,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showMoreReplies, setShowMoreReplies] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canEditState, setCanEditState] = useState(true);
  const [editTimeRemaining, setEditTimeRemaining] = useState<number | null>(null);

  const { user } = useAuth();
  const isAuthor = user?.id === comment.user_id;
  const canEdit = isAuthor && !comment.deleted && !comment.edited && canEditState;
  const canDelete = isAuthor || canModerate;

  // Calculate edit time remaining (15 minutes)
  useEffect(() => {
    if (!canEdit) return;

    const createdAt = new Date(comment.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (diffMinutes >= 15) {
      setCanEditState(false);
      return;
    }

    const timeRemaining = 15 - diffMinutes;
    setEditTimeRemaining(Math.max(0, timeRemaining));

    const interval = setInterval(() => {
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      if (diffMinutes >= 15) {
        setCanEditState(false);
        setEditTimeRemaining(0);
        clearInterval(interval);
      } else {
        setEditTimeRemaining(15 - diffMinutes);
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [canEdit, comment.created_at]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const formatEditTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleReact = async (reactionType: ReactionType) => {
    if (onReact) {
      await onReact(comment.id, reactionType);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== comment.content) {
      onEdit(comment.id);
      // Note: The actual API call would be handled by the parent component
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(comment.id);
      }
    } catch (error: any) {
      logger.error("Error deleting comment", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "Comment",
        operation: "handleDelete",
        commentId: comment.id,
        userId: currentUserId
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReply = () => {
    if (comment.thread_depth >= 2) {
      // Max depth reached, can't reply
      return;
    }
    setShowReplyForm(true);
  };

  const handleReplyCreated = () => {
    setShowReplyForm(false);
    if (onReply) {
      onReply(comment.id);
    }
  };

  const handleLoadMoreReplies = () => {
    setShowMoreReplies(true);
    // This would trigger loading more replies in the parent component
  };

  // Process content for mentions and spoilers
  const renderToxicityIndicators = () => {
    // Show toxicity warning for regular users
    if (comment.toxicity_warning && !comment.is_flagged && !canModerate) {
      const level = comment.toxicity_level || 'medium';
      return (
        <div className={`toxicity-warning toxicity-${level}`}>
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            This comment may contain potentially offensive content
          </span>
          {comment.toxicity_level && (
            <span className={`toxicity-badge ${level}`}>
              {level.toUpperCase()}
            </span>
          )}
        </div>
      );
    }

    // Show detailed toxicity information for moderators and authors
    if ((canModerate || isAuthor) && comment.toxicity_score !== undefined) {
      return (
        <div className="moderation-info">
          <div className="toxicity-details">
            <span className="toxicity-score">
              Toxicity: {(comment.toxicity_score * 100).toFixed(0)}%
            </span>
            {comment.analysis_confidence && (
              <span className="confidence-score" title="Analysis confidence">
                Confidence: {(comment.analysis_confidence * 100).toFixed(0)}%
              </span>
            )}
            {comment.toxicity_score > 0.3 && (
              <span className={`toxicity-level ${
                comment.toxicity_score > 0.8 ? 'high' : 
                comment.toxicity_score > 0.6 ? 'medium' : 'low'
              }`}>
                {comment.toxicity_score > 0.8 ? 'High Risk' : 
                 comment.toxicity_score > 0.6 ? 'Medium Risk' : 'Low Risk'}
              </span>
            )}
          </div>
          
          {comment.toxicity_categories && Object.keys(comment.toxicity_categories).length > 0 && (
            <div className="toxicity-categories">
              {Object.entries(comment.toxicity_categories)
                .filter(([_, isPresent]) => isPresent)
                .map(([category, _]) => (
                  <span key={category} className={`category-tag ${category}`}>
                    {category.replace('_', ' ')}
                  </span>
                ))}
            </div>
          )}
          
          {comment.cache_metadata?.last_analyzed && (
            <div className="analysis-timestamp">
              <span className="timestamp-label">Analyzed:</span>
              <span className="timestamp-value">
                {new Date(comment.cache_metadata.last_analyzed).toLocaleString()}
              </span>
              {comment.cache_metadata.cache_hit && (
                <span className="cache-indicator" title="Data from cache">📋</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const renderAnalysisStatus = () => {
    const status = comment.cache_metadata?.analysis_status;
    
    if (!status || status === 'completed' || status === 'unknown') {
      return null;
    }

    const statusConfig = {
      pending: { icon: '⏳', text: 'Analysis pending...', class: 'pending' },
      analyzing: { icon: '🔍', text: 'Analyzing content...', class: 'analyzing' },
      failed: { icon: '❌', text: 'Analysis failed', class: 'failed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <div className={`analysis-status ${config.class}`}>
        <span className="status-icon">{config.icon}</span>
        <span className="status-text">{config.text}</span>
        {status === 'analyzing' && (
          <div className="analyzing-spinner">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    );
  };

  const processContent = (content: string) => {
    if (comment.deleted) {
      return <span className="deleted-content">{content}</span>;
    }

    // Process @mentions
    let processedContent = content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

    // Handle spoiler content
    if (comment.contains_spoilers) {
      return (
        <div className="spoiler-content">
          <div className="spoiler-warning">⚠️ Spoiler content</div>
          <div className="spoiler-text" dangerouslySetInnerHTML={{ __html: processedContent }} />
        </div>
      );
    }

    return <div dangerouslySetInnerHTML={{ __html: processedContent }} />;
  };

  return (
    <div className={`comment ${comment.deleted ? "deleted" : ""}`}>
      <div className="comment-header">
        <div className="comment-author">
          <div className="author-avatar">
            {comment.author?.avatar_url ? (
              <img src={sanitizeUrl(comment.author.avatar_url)} alt={comment.author.username} className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                {comment.author?.username?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="author-info">
            <span className="author-name">
              {comment.author?.display_name || comment.author?.username || "Anonymous"}
            </span>
            {comment.author?.username && comment.author.display_name && (
              <span className="author-username">@{comment.author.username}</span>
            )}
          </div>
        </div>

        <div className="comment-meta">
          <span className="comment-time" title={new Date(comment.created_at).toLocaleString()}>
            {formatTimeAgo(comment.created_at)}
          </span>
          {comment.edited && (
            <span className="edited-indicator" title="This comment was edited">
              (edited)
            </span>
          )}
          {canEdit && editTimeRemaining && editTimeRemaining > 0 && (
            <span className="edit-timer" title="Edit time remaining">
              {formatEditTimeRemaining(editTimeRemaining)}
            </span>
          )}
        </div>
      </div>

      <div className="comment-content">
        {/* Show moderation status if content is flagged */}
        {comment.is_flagged && (
          <div className="moderation-banner">
            <span className="moderation-icon">⚠️</span>
            <span className="moderation-text">
              {comment.moderation_status === 'pending' 
                ? 'This comment is under review'
                : comment.moderation_status === 'removed'
                ? 'This comment has been removed for violating community guidelines'
                : 'This comment has been flagged'}
            </span>
            {isAuthor && comment.moderation_status === 'removed' && (
              <button 
                className="appeal-btn"
                onClick={() => window.location.href = `/appeal/comment/${comment.id}`}
              >
                Appeal
              </button>
            )}
          </div>
        )}
        
        {/* Enhanced toxicity indicators */}
        {renderToxicityIndicators()}
        
        {/* Analysis status indicator */}
        {renderAnalysisStatus()}
        
        {isEditing ? (
          <div className="comment-edit-form">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="edit-textarea"
              rows={3}
              maxLength={2000}
            />
            <div className="edit-actions">
              <button onClick={handleCancelEdit} className="edit-cancel">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="edit-save"
                disabled={editContent.trim().length < 10 || editContent.trim() === comment.content}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          processContent(comment.content)
        )}
      </div>

      {!comment.deleted && (
        <>
          <CommentReactionsComponent
            comment={comment}
            onReact={handleReact}
            currentUserId={currentUserId || ""}
          />

          <div className="comment-actions">
            {!isEditing && (
              <>
                {comment.thread_depth < 2 && (
                  <button onClick={handleReply} className="comment-action-btn reply-btn" disabled={!user}>
                    Reply
                  </button>
                )}

                {canEdit && editTimeRemaining && editTimeRemaining > 0 && (
                  <button onClick={handleEdit} className="comment-action-btn edit-btn">
                    Edit
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="comment-action-btn delete-btn"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                )}

                {!isAuthor && user && (
                  <button
                    onClick={() => onReport && onReport(comment.id)}
                    className="comment-action-btn report-btn"
                  >
                    Report
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Reply form */}
      {showReplyForm && (
        <div className="reply-form-container">
          <CommentForm
            parentType={comment.parent_type}
            parentId={comment.parent_id}
            parentCommentId={comment.id}
            onCommentCreated={handleReplyCreated}
            onCancel={() => setShowReplyForm(false)}
            placeholder="Write a reply..."
            autoFocus
          />
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              onReply={onReply || (() => {})}
              onEdit={onEdit || (() => {})}
              onDelete={onDelete || (() => {})}
              onReport={onReport || (() => {})}
              onReact={onReact || (() => {})}
              canModerate={canModerate}
              currentUserId={currentUserId || ""}
            />
          ))}

          {comment.has_more_replies && !showMoreReplies && (
            <button onClick={handleLoadMoreReplies} className="load-more-replies">
              Load {(comment.reply_count || 0) - (comment.replies?.length || 0)} more replies
            </button>
          )}
        </div>
      )}
    </div>
  );
};
