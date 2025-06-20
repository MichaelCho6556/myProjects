// ABOUTME: Main comment thread component that displays hierarchical comment discussions
// ABOUTME: Manages comment loading, sorting, pagination, and integrates with all comment sub-components

import React, { useState } from "react";
import { CommentThreadProps, CommentSortOption, ReactionType } from "../../../types/comments";
import { useComments } from "../../../hooks/useComments";
import { useAuth } from "../../../context/AuthContext";
import { CommentForm } from "./CommentForm";
import { Comment } from "./Comment";
import Spinner from "../../Spinner";
import "./CommentThreadComponent.css";

interface CommentSortConfig {
  value: CommentSortOption;
  label: string;
  icon: string;
}

const SORT_OPTIONS: CommentSortConfig[] = [
  { value: "newest", label: "Newest First", icon: "🕐" },
  { value: "oldest", label: "Oldest First", icon: "📅" },
  { value: "most_liked", label: "Most Liked", icon: "👍" },
];

export const CommentThreadComponent: React.FC<CommentThreadProps> = ({
  parentType,
  parentId,
  initialSort = "newest",
}) => {
  const [currentSort, setCurrentSort] = useState<CommentSortOption>(initialSort);
  const [showCommentForm, setShowCommentForm] = useState(false);

  const { user } = useAuth();

  const {
    comments,
    loading,
    error,
    pagination,
    fetchComments,
    createComment,
    deleteComment,
    reactToComment,
    reportComment,
    refreshComments,
  } = useComments(parentType, parentId, initialSort);

  // Handle sorting change
  const handleSortChange = (sortOption: CommentSortOption) => {
    setCurrentSort(sortOption);
    fetchComments({ sort: sortOption, page: 1 });
  };

  // Handle comment creation
  const handleCommentCreated = async (commentData: any) => {
    const newComment = await createComment(commentData);
    if (newComment) {
      setShowCommentForm(false);
      return newComment;
    }
    return null;
  };

  // Handle comment editing
  const handleEditComment = async (commentId: number) => {
    // This would typically open an edit modal or inline editor
    // For now, we'll just call the API
    console.log("Edit comment:", commentId);
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId: number) => {
    await deleteComment(commentId);
  };

  // Handle comment reporting
  const handleReportComment = async (commentId: number) => {
    // This would typically open a report modal
    // For now, we'll just call the API with a default reason
    const success = await reportComment(commentId, {
      report_reason: "inappropriate",
      additional_context: "Reported via comment thread",
    });

    if (success) {
      alert("Comment reported successfully");
    }
  };

  // Handle comment reactions
  const handleReactToComment = async (commentId: number, reactionType: ReactionType) => {
    await reactToComment(commentId, reactionType);
  };

  // Handle reply to comment
  const handleReplyToComment = (commentId: number) => {
    // This would scroll to the comment and open its reply form
    console.log("Reply to comment:", commentId);
  };

  // Load more comments (pagination)
  const handleLoadMore = () => {
    if (pagination && pagination.has_next) {
      fetchComments({ page: pagination.current_page + 1 });
    }
  };

  // Refresh comments
  const handleRefresh = () => {
    refreshComments();
  };

  if (error) {
    return (
      <div className="comment-thread-error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
        <button onClick={handleRefresh} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="comment-thread">
      <div className="comment-thread-header">
        <div className="comment-count">
          <h3>{pagination?.total_count || 0} Comments</h3>
        </div>

        <div className="comment-controls">
          <div className="sort-controls">
            <label className="sort-label">Sort by:</label>
            <select
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value as CommentSortOption)}
              className="sort-select"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRefresh}
            className="refresh-button"
            disabled={loading}
            title="Refresh comments"
          >
            🔄
          </button>
        </div>
      </div>

      {/* New comment form */}
      {user ? (
        <div className="new-comment-section">
          {!showCommentForm ? (
            <button onClick={() => setShowCommentForm(true)} className="show-comment-form-button">
              💬 Add a comment...
            </button>
          ) : (
            <CommentForm
              parentType={parentType}
              parentId={parentId}
              onCommentCreated={handleCommentCreated}
              onCancel={() => setShowCommentForm(false)}
              placeholder="Share your thoughts..."
              autoFocus
            />
          )}
        </div>
      ) : (
        <div className="login-prompt">
          <p>Please log in to join the discussion.</p>
        </div>
      )}

      {/* Comments list */}
      <div className="comments-list">
        {loading && comments.length === 0 ? (
          <div className="comments-loading">
            <Spinner />
            <span>Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="no-comments">
            <div className="no-comments-icon">💭</div>
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onReply={handleReplyToComment}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                onReport={handleReportComment}
                onReact={handleReactToComment}
                canModerate={false}
                currentUserId={user?.id || ""}
              />
            ))}

            {/* Load more button */}
            {pagination && pagination.has_next && (
              <div className="load-more-section">
                <button onClick={handleLoadMore} className="load-more-button" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size="small" />
                      Loading more...
                    </>
                  ) : (
                    `Load ${Math.min(
                      pagination.per_page,
                      pagination.total_count - comments.length
                    )} more comments`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Loading overlay for actions */}
      {loading && comments.length > 0 && (
        <div className="loading-overlay">
          <Spinner size="small" />
        </div>
      )}
    </div>
  );
};
