// ABOUTME: Custom hook for managing user-created lists including creation, editing, tagging, and sharing
// ABOUTME: Provides centralized state management for custom list operations and list following

import { useState, useEffect, useCallback } from "react";
import { CustomList, ListComment, Tag } from "../types/social";
import { useAuthenticatedApi } from "./useAuthenticatedApi";

export function useListManagement() {
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [followedLists, setFollowedLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { makeAuthenticatedRequest } = useAuthenticatedApi();

  const fetchUserLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [ownListsResponse, followedListsResponse] = await Promise.all([
        makeAuthenticatedRequest("/api/auth/lists/custom"),
        makeAuthenticatedRequest("/api/auth/lists/followed"),
      ]);

      setCustomLists(ownListsResponse);
      setFollowedLists(followedListsResponse);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch user lists"));
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const createList = useCallback(
    async (listData: {
      title: string;
      description?: string;
      privacy: "Public" | "Private" | "Friends Only";
      tags: string[];
    }) => {
      try {
        const response = await makeAuthenticatedRequest("/api/auth/lists/custom", {
          method: "POST",
          body: JSON.stringify(listData),
        });
        const newList = response;
        setCustomLists((prev) => [newList, ...prev]);
        return newList;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to create list");
        setError(error);
        throw error;
      }
    },
    [makeAuthenticatedRequest]
  );

  const updateList = useCallback(
    async (
      listId: string,
      updates: {
        title?: string;
        description?: string;
        privacy?: "Public" | "Private" | "Friends Only";
        tags?: string[];
      }
    ) => {
      try {
        const response = await makeAuthenticatedRequest(`/api/auth/lists/${listId}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        });
        const updatedList = response;
        setCustomLists((prev) => prev.map((list) => (list.id === listId ? updatedList : list)));
        return updatedList;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update list");
        setError(error);
        throw error;
      }
    },
    [makeAuthenticatedRequest]
  );

  const deleteList = useCallback(
    async (listId: string) => {
      try {
        await makeAuthenticatedRequest(`/api/auth/lists/${listId}`, {
          method: "DELETE",
        });
        setCustomLists((prev) => prev.filter((list) => list.id !== listId));
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete list");
        setError(error);
        throw error;
      }
    },
    [makeAuthenticatedRequest]
  );

  const reorderListItems = useCallback(
    async (listId: string, itemIds: string[]) => {
      try {
        await makeAuthenticatedRequest(`/api/auth/lists/${listId}/reorder`, {
          method: "POST",
          body: JSON.stringify({ itemIds }),
        });
        // Update local state to reflect new order
        setCustomLists((prev) =>
          prev.map((list) => {
            if (list.id === listId && list.items) {
              const reorderedItems = itemIds
                .map((id) => list.items!.find((item) => item.id === id)!)
                .filter(Boolean);
              return { ...list, items: reorderedItems };
            }
            return list;
          })
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to reorder list items");
        setError(error);
        throw error;
      }
    },
    [makeAuthenticatedRequest]
  );

  const followList = useCallback(
    async (listId: string) => {
      try {
        const response = await makeAuthenticatedRequest(`/api/auth/lists/${listId}/follow`, {
          method: "POST",
        });
        const followedList = response;

        // Update followed lists
        setFollowedLists((prev) => {
          const isAlreadyFollowing = prev.some((list) => list.id === listId);
          if (isAlreadyFollowing) {
            return prev.filter((list) => list.id !== listId);
          } else {
            return [followedList, ...prev];
          }
        });

        // Update custom lists if it's one of user's own lists
        setCustomLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  isFollowing: !list.isFollowing,
                  followersCount: list.isFollowing ? list.followersCount - 1 : list.followersCount + 1,
                }
              : list
          )
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to follow/unfollow list");
        setError(error);
        throw error;
      }
    },
    [makeAuthenticatedRequest]
  );

  useEffect(() => {
    fetchUserLists();
  }, [fetchUserLists]);

  return {
    customLists,
    followedLists,
    isLoading,
    error,
    refetch: fetchUserLists,
    createList,
    updateList,
    deleteList,
    reorderListItems,
    followList,
  };
}

export function useListComments(listId: string) {
  const [comments, setComments] = useState<ListComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { makeAuthenticatedRequest } = useAuthenticatedApi();

  const fetchComments = useCallback(async () => {
    if (!listId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(`/api/lists/${listId}/comments`);
      setComments(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch comments"));
    } finally {
      setIsLoading(false);
    }
  }, [listId, makeAuthenticatedRequest]);

  const addComment = useCallback(
    async (commentData: { content: string; spoilerWarning: boolean; parentCommentId?: string }) => {
      try {
        const response = await makeAuthenticatedRequest(`/api/lists/${listId}/comments`, {
          method: "POST",
          body: JSON.stringify(commentData),
        });
        const newComment = response;

        if (commentData.parentCommentId) {
          // Add as reply to parent comment
          setComments((prev) =>
            prev.map((comment) => {
              if (comment.id === commentData.parentCommentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newComment],
                };
              }
              return comment;
            })
          );
        } else {
          // Add as top-level comment
          setComments((prev) => [newComment, ...prev]);
        }

        return newComment;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to add comment");
        setError(error);
        throw error;
      }
    },
    [listId, makeAuthenticatedRequest]
  );

  const likeComment = useCallback(
    async (commentId: string) => {
      try {
        await makeAuthenticatedRequest(`/api/lists/comments/${commentId}/like`, {
          method: "POST",
        });

        // Update comment like status
        const updateCommentLike = (comments: ListComment[]): ListComment[] => {
          return comments.map((comment) => {
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
                replies: updateCommentLike(comment.replies),
              };
            }
            return comment;
          });
        };

        setComments((prev) => updateCommentLike(prev));
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to like comment"));
      }
    },
    [makeAuthenticatedRequest]
  );

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    isLoading,
    error,
    refetch: fetchComments,
    addComment,
    likeComment,
  };
}

export function useListTags() {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { makeAuthenticatedRequest } = useAuthenticatedApi();

  const fetchTags = useCallback(
    async (query?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const queryParam = query ? `?q=${encodeURIComponent(query)}` : "";
        const response = await makeAuthenticatedRequest(`/api/lists/tags${queryParam}`);
        setAvailableTags(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch tags"));
      } finally {
        setIsLoading(false);
      }
    },
    [makeAuthenticatedRequest]
  );

  const getTrendingTags = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest("/api/lists/tags/trending");
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch trending tags"));
      return [];
    }
  }, [makeAuthenticatedRequest]);

  return {
    availableTags,
    isLoading,
    error,
    fetchTags,
    getTrendingTags,
  };
}
