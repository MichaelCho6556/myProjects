// ABOUTME: Custom React hooks for comment system functionality
// ABOUTME: Provides API integration for comments CRUD operations, reactions, and moderation

import { useState, useEffect, useCallback } from "react";
import { useAuthenticatedApi } from "./useAuthenticatedApi";
import {
  Comment,
  CommentSortOption,
  CommentFilters,
  MentionUser,
  CreateCommentRequest,
  UpdateCommentRequest,
  ReportCommentRequest,
} from "../types/comments";

export interface UseCommentsResult {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  } | null;
  fetchComments: (filters?: Partial<CommentFilters>) => Promise<void>;
  createComment: (data: CreateCommentRequest) => Promise<Comment | null>;
  updateComment: (commentId: number, data: UpdateCommentRequest) => Promise<Comment | null>;
  deleteComment: (commentId: number) => Promise<boolean>;
  reactToComment: (commentId: number, reactionType: string) => Promise<boolean>;
  reportComment: (commentId: number, data: ReportCommentRequest) => Promise<boolean>;
  loadMoreReplies: (commentId: number, page?: number) => Promise<Comment[]>;
  refreshComments: () => Promise<void>;
}

export function useComments(
  parentType: "item" | "list" | "review",
  parentId: string,
  initialSort: CommentSortOption = "newest"
): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseCommentsResult["pagination"]>(null);
  const [currentFilters, setCurrentFilters] = useState<CommentFilters>({
    sort: initialSort,
    page: 1,
    limit: 20,
  });

  const api = useAuthenticatedApi();

  const fetchComments = useCallback(
    async (filters?: Partial<CommentFilters>) => {
      if (!parentType || !parentId) return;

      setLoading(true);
      setError(null);

      try {
        const updatedFilters = { ...currentFilters, ...filters };
        setCurrentFilters(updatedFilters);

        const params = new URLSearchParams({
          page: updatedFilters.page.toString(),
          limit: updatedFilters.limit.toString(),
          sort: updatedFilters.sort,
        });

        const response = await api.get(`/api/comments/${parentType}/${parentId}?${params}`);

        if (updatedFilters.page === 1) {
          setComments(response.comments);
        } else {
          // For pagination, append to existing comments
          setComments((prev) => [...prev, ...response.comments]);
        }

        setPagination(response.pagination);
      } catch (err: any) {
        console.error("Error fetching comments:", err);
        setError(err.response?.data?.error || "Failed to fetch comments");
      } finally {
        setLoading(false);
      }
    },
    [api, parentType, parentId, currentFilters]
  );

  const createComment = useCallback(
    async (data: CreateCommentRequest): Promise<Comment | null> => {
      try {
        setError(null);
        const response = await api.post("/api/comments", data);

        if (response.comment) {
          // Add the new comment to the appropriate location
          if (data.parent_comment_id) {
            // This is a reply - find the parent comment and add to its replies
            setComments((prev) =>
              prev.map((comment) => {
                if (comment.id === data.parent_comment_id) {
                  const updatedReplies = [...(comment.replies || []), response.comment];
                  return {
                    ...comment,
                    replies: updatedReplies,
                    reply_count: (comment.reply_count || 0) + 1,
                  };
                }
                return comment;
              })
            );
          } else {
            // This is a top-level comment
            setComments((prev) => [response.comment, ...prev]);
            setPagination((prev) => (prev ? { ...prev, total_count: prev.total_count + 1 } : null));
          }

          return response.comment;
        }
        return null;
      } catch (err: any) {
        console.error("Error creating comment:", err);
        setError(err.response?.data?.error || "Failed to create comment");
        return null;
      }
    },
    [api]
  );

  const updateComment = useCallback(
    async (commentId: number, data: UpdateCommentRequest): Promise<Comment | null> => {
      try {
        setError(null);
        const response = await api.put(`/api/comments/${commentId}`, data);

        if (response.comment) {
          // Update the comment in the state
          const updateCommentInList = (commentsList: Comment[]): Comment[] => {
            return commentsList.map((comment) => {
              if (comment.id === commentId) {
                return response.comment;
              }
              if (comment.replies) {
                return {
                  ...comment,
                  replies: updateCommentInList(comment.replies),
                };
              }
              return comment;
            });
          };

          setComments((prev) => updateCommentInList(prev));
          return response.comment;
        }
        return null;
      } catch (err: any) {
        console.error("Error updating comment:", err);
        setError(err.response?.data?.error || "Failed to update comment");
        return null;
      }
    },
    [api]
  );

  const deleteComment = useCallback(
    async (commentId: number): Promise<boolean> => {
      try {
        setError(null);
        await api.delete(`/api/comments/${commentId}`);

        // Update the comment in the state to show as deleted
        const updateCommentInList = (commentsList: Comment[]): Comment[] => {
          return commentsList.map((comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                deleted: true,
                content: "[Comment deleted]",
              };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: updateCommentInList(comment.replies),
              };
            }
            return comment;
          });
        };

        setComments((prev) => updateCommentInList(prev));
        return true;
      } catch (err: any) {
        console.error("Error deleting comment:", err);
        setError(err.response?.data?.error || "Failed to delete comment");
        return false;
      }
    },
    [api]
  );

  const reactToComment = useCallback(
    async (commentId: number, reactionType: string): Promise<boolean> => {
      try {
        setError(null);
        const response = await api.post(`/api/comments/${commentId}/react`, { reaction_type: reactionType });

        // Update the comment reaction counts
        const updateCommentInList = (commentsList: Comment[]): Comment[] => {
          return commentsList.map((comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                like_count: response.like_count,
                dislike_count: response.dislike_count,
                total_reactions: response.total_reactions,
              };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: updateCommentInList(comment.replies),
              };
            }
            return comment;
          });
        };

        setComments((prev) => updateCommentInList(prev));
        return true;
      } catch (err: any) {
        console.error("Error reacting to comment:", err);
        setError(err.response?.data?.error || "Failed to react to comment");
        return false;
      }
    },
    [api]
  );

  const reportComment = useCallback(
    async (commentId: number, data: ReportCommentRequest): Promise<boolean> => {
      try {
        setError(null);
        await api.post(`/api/comments/${commentId}/report`, data);
        return true;
      } catch (err: any) {
        console.error("Error reporting comment:", err);
        setError(err.response?.data?.error || "Failed to report comment");
        return false;
      }
    },
    [api]
  );

  const loadMoreReplies = useCallback(
    async (commentId: number, page: number = 2): Promise<Comment[]> => {
      try {
        setError(null);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });

        const response = await api.get(`/api/comments/${commentId}/replies?${params}`);

        // Update the specific comment with more replies
        setComments((prev) =>
          prev.map((comment) => {
            if (comment.id === commentId) {
              const newReplies = [...(comment.replies || []), ...response.replies];
              return {
                ...comment,
                replies: newReplies,
                has_more_replies: response.pagination.has_next,
              };
            }
            return comment;
          })
        );

        return response.replies;
      } catch (err: any) {
        console.error("Error loading more replies:", err);
        setError(err.response?.data?.error || "Failed to load more replies");
        return [];
      }
    },
    [api]
  );

  const refreshComments = useCallback(async () => {
    await fetchComments({ page: 1 });
  }, [fetchComments]);

  // Initial load
  useEffect(() => {
    if (parentType && parentId) {
      fetchComments();
    }
  }, [parentType, parentId, fetchComments]);

  return {
    comments,
    loading,
    error,
    pagination,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
    reactToComment,
    reportComment,
    loadMoreReplies,
    refreshComments,
  };
}

export interface UseMentionsResult {
  searchUsers: (query: string) => Promise<MentionUser[]>;
  loading: boolean;
  error: string | null;
}

export function useMentions(): UseMentionsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useAuthenticatedApi();

  const searchUsers = useCallback(
    async (query: string): Promise<MentionUser[]> => {
      if (!query || query.length < 2) return [];

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: query,
          limit: "10",
        });

        // Note: This endpoint should be implemented in the backend
        const response = await api.get(`/api/users/search?${params}`);
        return response.users || [];
      } catch (err: any) {
        console.error("Error searching users:", err);
        setError(err.response?.data?.error || "Failed to search users");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  return {
    searchUsers,
    loading,
    error,
  };
}
