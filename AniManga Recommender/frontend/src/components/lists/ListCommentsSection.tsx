// ABOUTME: Comments section component for custom lists with threaded replies and spoiler support
// ABOUTME: Provides community discussion features with moderation controls and interactive engagement

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { logger } from "../../utils/logger";
import LoadingBanner from "../Loading/LoadingBanner";
import ErrorFallback from "../Error/ErrorFallback";

interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  replies?: Comment[];
  likesCount: number;
  isLiked: boolean;
}

interface ListCommentsSectionProps {
  listId: string;
  isPublic: boolean;
}

export const ListCommentsSection: React.FC<ListCommentsSectionProps> = ({ listId, isPublic }) => {
  const { user } = useAuth();
  const { get, post, delete: deleteMethod } = useAuthenticatedApi();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment form state
  const [newComment, setNewComment] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isPublic) {
      fetchComments();
    }
  }, [listId, isPublic]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await get(`/api/lists/${listId}/comments`);
      setComments(response.data.comments || []);
    } catch (err: any) {
      logger.error("Failed to fetch comments", {
        error: err?.message || "Unknown error",
        context: "ListCommentsSection",
        operation: "fetchComments",
        listId: listId
      });
      setError(err.response?.data?.message || "Failed to load comments.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitComment = async () => {
    if (!user || !newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const commentData = {
        content: newComment.trim(),
        isSpoiler,
        parentId: replyingTo,
      };

      const response = await post(`/api/lists/${listId}/comments`, commentData);
      const createdComment = response.data.comment;

      if (replyingTo) {
        // Add as reply to existing comment
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === replyingTo
              ? { ...comment, replies: [...(comment.replies || []), createdComment] }
              : comment
          )
        );
      } else {
        // Add as top-level comment
        setComments((prev) => [createdComment, ...prev]);
      }

      // Reset form
      setNewComment("");
      setIsSpoiler(false);
      setReplyingTo(null);
    } catch (err: any) {
      logger.error("Failed to submit comment", {
        error: err?.message || "Unknown error",
        context: "ListCommentsSection",
        operation: "submitComment",
        listId: listId,
        userId: user?.id
      });
      setError(err.response?.data?.message || "Failed to submit comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const likeComment = async (commentId: string) => {
    if (!user) return;

    try {
      await post(`/api/lists/${listId}/comments/${commentId}/like`, {});

      // Update like status optimistically
      const updateComment = (comment: Comment): Comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1,
          };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(updateComment),
          };
        }
        return comment;
      };

      setComments((prev) => prev.map(updateComment));
    } catch (error) {
      logger.error("Failed to like comment", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "ListCommentsSection",
        operation: "likeComment",
        commentId: commentId,
        userId: user?.id
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user || !window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      await deleteMethod(`/api/lists/${listId}/comments/${commentId}`);

      // Remove comment from state
      const removeComment = (comments: Comment[]): Comment[] => {
        return comments
          .filter((comment) => comment.id !== commentId)
          .map((comment) => ({
            ...comment,
            replies: comment.replies ? removeComment(comment.replies) : [],
          }));
      };

      setComments((prev) => removeComment(prev));
    } catch (error) {
      logger.error("Failed to delete comment", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "ListCommentsSection",
        operation: "deleteComment",
        commentId: commentId,
        userId: user?.id
      });
    }
  };

  const startReply = (commentId: string) => {
    setReplyingTo(commentId);
    setNewComment("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  if (!isPublic) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Private List</h3>
          <p className="text-gray-600 dark:text-gray-400">Comments are only available for public lists.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Join the Discussion</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Sign in to leave comments and engage with the community.
          </p>
        </div>
      </div>
    );
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? "ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
          {comment.avatarUrl ? (
            <img
              src={comment.avatarUrl}
              alt={comment.displayName || comment.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {(comment.displayName || comment.username).charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {comment.displayName || comment.username}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(comment.createdAt)}
            </span>
            {comment.isSpoiler && (
              <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                Spoiler
              </span>
            )}
          </div>

          {/* Comment Text */}
          <div
            className={`text-sm text-gray-700 dark:text-gray-300 mb-2 ${
              comment.isSpoiler
                ? "bg-gray-200 dark:bg-gray-700 p-2 rounded blur-sm hover:blur-none transition-all cursor-pointer"
                : ""
            }`}
          >
            {comment.content}
          </div>

          {/* Comment Actions */}
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => likeComment(comment.id)}
              className={`flex items-center gap-1 ${
                comment.isLiked
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              } transition-colors`}
            >
              <svg
                className="w-4 h-4"
                fill={comment.isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {comment.likesCount > 0 && comment.likesCount}
            </button>

            {!isReply && (
              <button
                onClick={() => startReply(comment.id)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Reply
              </button>
            )}

            {comment.userId === user.id && (
              <button
                onClick={() => deleteComment(comment.id)}
                className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">{comment.replies.map((reply) => renderComment(reply, true))}</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comments ({comments.length})</h3>
      </div>

      {/* Comment Form */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        {replyingTo && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-400">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800 dark:text-blue-200">Replying to comment</span>
              <button
                onClick={cancelReply}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* User Avatar */}
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {(user.user_metadata?.display_name || user.email?.split("@")[0] || "U").charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Form */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400 resize-none"
              rows={3}
            />

            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Mark as spoiler</span>
              </label>

              <button
                onClick={submitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Posting..." : replyingTo ? "Reply" : "Comment"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="p-6">
        {isLoading ? (
          <LoadingBanner message="Loading comments..." isVisible={true} />
        ) : error ? (
          <ErrorFallback error={new Error(error)} />
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Comments Yet</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Be the first to share your thoughts about this list!
            </p>
          </div>
        ) : (
          <div className="space-y-6">{comments.map((comment) => renderComment(comment))}</div>
        )}
      </div>
    </div>
  );
};
