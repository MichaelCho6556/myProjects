// ABOUTME: Custom hook for managing social features including activity feed, popular lists, and user search
// ABOUTME: Provides centralized state management for social discovery and community features

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  PopularList,
  ListRecommendation,
  UserSearchResult,
  ListSearchResult,
} from "../types/social";
import { useAuthenticatedApi } from "./useAuthenticatedApi";

export function useSocialFeatures() {
  const [activityFeed, setActivityFeed] = useState<Activity[]>([]);
  const [popularLists, setPopularLists] = useState<PopularList[]>([]);
  const [recommendedLists, setRecommendedLists] = useState<ListRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const api = useAuthenticatedApi();

  const fetchSocialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [activityResponse, popularResponse, recommendedResponse] = await Promise.all([
        api.get("/api/auth/activity-feed?limit=20"),
        api.get("/api/lists/popular?limit=10"),
        api.get("/api/auth/recommended-lists?limit=10"),
      ]);

      setActivityFeed(activityResponse.data);
      setPopularLists(popularResponse.data);
      setRecommendedLists(recommendedResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch social data"));
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const loadMoreActivities = useCallback(async () => {
    try {
      const offset = activityFeed.length;
      const response = await api.get(`/api/auth/activity-feed?limit=20&offset=${offset}`);
      setActivityFeed((prev) => [...prev, ...response.data]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load more activities"));
    }
  }, [api, activityFeed.length]);

  useEffect(() => {
    fetchSocialData();
  }, [fetchSocialData]);

  return {
    activityFeed,
    popularLists,
    recommendedLists,
    isLoading,
    error,
    refetch: fetchSocialData,
    loadMoreActivities,
  };
}

export function useUserSearch() {
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const api = useAuthenticatedApi();

  const searchUsers = useCallback(
    async (query: string, page: number = 1) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get(
          `/api/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`
        );

        if (page === 1) {
          setSearchResults(response.data.data);
        } else {
          setSearchResults((prev) => [...prev, ...response.data.data]);
        }

        setHasMore(response.data.pagination.hasNext);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to search users"));
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setError(null);
    setHasMore(false);
  }, []);

  return {
    searchResults,
    isLoading,
    error,
    hasMore,
    searchUsers,
    clearSearch,
  };
}

export function useListDiscovery() {
  const [lists, setLists] = useState<ListSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const api = useAuthenticatedApi();

  const discoverLists = useCallback(
    async (
      params: {
        query?: string;
        tags?: string[];
        sortBy?: "recent" | "popular" | "followers";
        page?: number;
      } = {}
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (params.query) queryParams.set("q", params.query);
        if (params.tags && params.tags.length > 0) queryParams.set("tags", params.tags.join(","));
        if (params.sortBy) queryParams.set("sortBy", params.sortBy);
        queryParams.set("page", (params.page || 1).toString());
        queryParams.set("limit", "20");

        const response = await api.get(`/api/lists/discover?${queryParams.toString()}`);

        if ((params.page || 1) === 1) {
          setLists(response.data.data);
        } else {
          setLists((prev) => [...prev, ...response.data.data]);
        }

        setHasMore(response.data.pagination.hasNext);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to discover lists"));
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const followList = useCallback(
    async (listId: string) => {
      try {
        await api.post(`/api/auth/lists/${listId}/follow`);
        setLists((prev) =>
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
        setError(err instanceof Error ? err : new Error("Failed to follow list"));
      }
    },
    [api]
  );

  return {
    lists,
    isLoading,
    error,
    hasMore,
    discoverLists,
    followList,
  };
}

export function useActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const api = useAuthenticatedApi();

  const fetchActivities = useCallback(
    async (offset: number = 0) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get(`/api/auth/activity-feed?limit=20&offset=${offset}`);

        if (offset === 0) {
          setActivities(response.data);
        } else {
          setActivities((prev) => [...prev, ...response.data]);
        }

        setHasMore(response.data.length === 20);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch activity feed"));
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchActivities(activities.length);
    }
  }, [fetchActivities, activities.length, isLoading, hasMore]);

  const refresh = useCallback(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  useEffect(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  return {
    activities,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
