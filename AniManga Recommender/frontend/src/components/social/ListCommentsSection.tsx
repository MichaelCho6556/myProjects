// ABOUTME: Comments section component for public lists with threaded replies and moderation
// ABOUTME: Provides comment creation, display, and interaction features with spoiler warnings

import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../context/AuthContext';

interface Comment {
  id: number;
  content: string;
  is_spoiler: boolean;
  parent_comment_id?: number;
  created_at: string;
  user_profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface ListCommentsSectionProps {
  listId: string;
  className?: string;
}

export const ListCommentsSection: React.FC<ListCommentsSectionProps> = ({ 
  listId, 
  className = '' 
}) => {
  const { user } = useAuth();
  const { makeAuthenticatedRequest } = useAuthenticatedApi();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [visibleSpoilers, setVisibleSpoilers] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [listId, page]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest(`/api/lists/${listId}/comments?page=${page}&limit=20`);
      
      if (page === 1) {
        setComments(response.comments || response);
      } else {
        setComments(prev => [...prev, ...(response.comments || response)]);
      }
      
      setHasMore(response.has_more || false);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || submitting) return;
    
    try {
      setSubmitting(true);
      
      const response = await makeAuthenticatedRequest(`/api/lists/${listId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: newComment.trim(),
          is_spoiler: isSpoiler,
          parent_comment_id: replyingTo
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Add new comment to the list
      setComments(prev => [response, ...prev]);
      setNewComment('');
      setIsSpoiler(false);
      setReplyingTo(null);
      
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSpoilerVisibility = (commentId: number) => {
    setVisibleSpoilers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderComment = (comment: Comment) => {
    const isReply = comment.parent_comment_id !== null;
    const isSpoilerVisible = visibleSpoilers.has(comment.id);
    
    return (
      <div 
        key={comment.id} 
        className={`${isReply ? 'ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''} mb-4`}
      >
        <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              {comment.user_profiles.avatar_url ? (
                <img
                  src={comment.user_profiles.avatar_url}
                  alt={`${comment.user_profiles.display_name}'s avatar`}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {comment.user_profiles.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {comment.user_profiles.display_name}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                @{comment.user_profiles.username}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {formatDate(comment.created_at)}
            </span>
          </div>

          {/* Comment Content */}
          {comment.is_spoiler && !isSpoilerVisible ? (
            <div className="mb-3">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Spoiler Warning
                  </span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                  This comment contains spoilers. Click to reveal.
                </p>
                <button
                  onClick={() => toggleSpoilerVisibility(comment.id)}
                  className="text-sm bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded hover:bg-yellow-300 dark:hover:bg-yellow-700"
                >
                  Show Spoiler
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-3">
              {comment.is_spoiler && (
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                    Spoiler
                  </span>
                  <button
                    onClick={() => toggleSpoilerVisibility(comment.id)}
                    className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
                  >
                    Hide
                  </button>
                </div>
              )}
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          )}

          {/* Reply Button */}
          {user && !isReply && (
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Comments ({comments.length})
      </h3>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          {replyingTo && (
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Replying to comment
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? "Write your reply..." : "Share your thoughts about this list..."}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            disabled={submitting}
          />
          
          <div className="flex items-center justify-between mt-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                disabled={submitting}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Contains spoilers
              </span>
            </label>
            
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : (replyingTo ? 'Reply' : 'Comment')}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to leave a comment
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Comments List */}
      {loading && page === 1 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map(renderComment)}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More Comments'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="mx-auto w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="font-medium">No comments yet</p>
          <p className="text-sm">Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
};