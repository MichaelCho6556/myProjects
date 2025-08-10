/**
 * React Query Custom Hooks for API Data Caching
 * 
 * This module provides type-safe, cache-enabled hooks for all API operations
 * in the AniManga Recommender application. Each hook is configured with
 * appropriate cache times and invalidation strategies.
 * 
 * Features:
 * - Automatic caching with configurable TTLs
 * - Background refetching when data becomes stale
 * - Optimistic updates for better UX
 * - Automatic cache invalidation on mutations
 * - Type-safe query keys and return types
 * - Integration with existing API service layer
 * 
 * @module useApiCache
 * @since 1.0.0
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
  UseQueryOptions,
} from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import {
  CACHE_TIMES,
  STALE_TIMES,
  createQueryKey,
  invalidateRelatedQueries,
} from '../config/queryClient';
import {
  DashboardData,
  UserItem,
  AnimeItem,
  UserStatistics,
} from '../types';
import { Comment } from '../types/comments';
import { Review } from '../types/reviews';
import { PublicList } from '../types/social';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Custom hook for fetching dashboard data with caching and offline support
 * Cache time: 15 minutes
 */
export const useDashboardQuery = () => {
  const { getDashboardData } = useAuthenticatedApi();
  const { isOnline } = useNetworkStatus();

  return useQuery<DashboardData>({
    queryKey: createQueryKey.dashboard(),
    queryFn: getDashboardData,
    staleTime: STALE_TIMES.dashboard,
    gcTime: CACHE_TIMES.dashboard,
    refetchInterval: false, // Don't auto-refetch, let user control
    // Enable offline support
    networkMode: isOnline ? 'online' : 'offlineFirst',
    // Show stale data while offline
    placeholderData: (previousData) => previousData,
    // Don't refetch on focus if data is fresh
    refetchOnWindowFocus: false,
    // Refetch when reconnecting to network
    refetchOnReconnect: true,
    // Only refetch on mount if data is stale
    refetchOnMount: false,
    meta: {
      // Custom metadata for offline handling
      offlineFallback: true,
      persist: false // Dashboard data is user-specific, don't persist
    }
  });
};

/**
 * Custom hook for fetching user profile data
 * Cache time: 30 minutes
 */
export const useUserProfileQuery = (username?: string, options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: createQueryKey.userProfile(username),
    queryFn: () => api.public.getUserProfile(username!),
    staleTime: STALE_TIMES.userProfile,
    gcTime: CACHE_TIMES.userProfile,
    enabled: !!username,
    ...options,
  });
};

/**
 * Custom hook for fetching user statistics
 * Cache time: 15 minutes
 */
export const useUserStatsQuery = (userId: string, forceRefresh?: boolean) => {
  return useQuery<UserStatistics>({
    queryKey: createQueryKey.userStats(userId),
    queryFn: () => api.public.getUserProfile(userId).then(data => data.stats),
    staleTime: forceRefresh ? 0 : STALE_TIMES.statistics,
    gcTime: CACHE_TIMES.statistics,
    enabled: !!userId,
  });
};

/**
 * Custom hook for fetching items with filters and offline support
 * Cache time: 24 hours (items rarely change)
 */
export const useItemsQuery = (filters?: Record<string, any>) => {
  return useQuery<{ items: AnimeItem[]; total: number }>({
    queryKey: createQueryKey.items(filters),
    queryFn: () => api.public.getItems(filters),
    staleTime: STALE_TIMES.items,
    gcTime: CACHE_TIMES.items,
    // Enhanced offline support
    networkMode: 'offlineFirst', // Always try cache first
    meta: {
      persist: true // This query should be persisted
    }
  });
};

/**
 * Custom hook for fetching a single item
 * Cache time: 24 hours
 */
export const useItemQuery = (uid: string) => {
  return useQuery<AnimeItem>({
    queryKey: createQueryKey.item(uid),
    queryFn: () => api.public.getItem(uid),
    staleTime: STALE_TIMES.items,
    gcTime: CACHE_TIMES.items,
    enabled: !!uid,
  });
};

/**
 * Custom hook for fetching recommendations with offline support
 * Cache time: 1 hour
 */
export const useRecommendationsQuery = (uid: string, count: number = 10) => {
  return useQuery<AnimeItem[]>({
    queryKey: createQueryKey.recommendations(uid, count),
    queryFn: () => api.public.getRecommendations(uid, count),
    staleTime: STALE_TIMES.recommendations,
    gcTime: CACHE_TIMES.recommendations,
    enabled: !!uid,
    // Offline support
    networkMode: 'offlineFirst',
    meta: {
      persist: true // Persist recommendations
    }
  });
};

/**
 * Custom hook for fetching user's items (anime/manga list)
 * Cache time: 5 minutes (frequently updated)
 */
export const useUserItemsQuery = (status?: string) => {
  const { getUserItems } = useAuthenticatedApi();

  return useQuery<UserItem[]>({
    queryKey: createQueryKey.userItems(status),
    queryFn: () => getUserItems(status),
    staleTime: STALE_TIMES.userLists,
    gcTime: CACHE_TIMES.userLists,
  });
};

/**
 * Custom hook for fetching user's lists
 * Cache time: 5 minutes
 */
export const useUserListsQuery = (userId: string) => {
  return useQuery<PublicList[]>({
    queryKey: createQueryKey.userLists(userId),
    queryFn: () => api.public.getUserLists(userId),
    staleTime: STALE_TIMES.userLists,
    gcTime: CACHE_TIMES.userLists,
    enabled: !!userId,
  });
};

/**
 * Custom hook for fetching comments
 * Cache time: 5 minutes
 */
export const useCommentsQuery = (entityType: string, entityId: string) => {
  return useQuery<Comment[]>({
    queryKey: createQueryKey.comments(entityType, entityId),
    queryFn: () => api.social.getComments(entityType, entityId),
    staleTime: STALE_TIMES.activities,
    gcTime: CACHE_TIMES.activities,
    enabled: !!entityType && !!entityId,
  });
};

/**
 * Custom hook for fetching reviews
 * Cache time: 5 minutes
 */
export const useReviewsQuery = (itemUid: string) => {
  return useQuery<Review[]>({
    queryKey: createQueryKey.reviews(itemUid),
    queryFn: () => api.social.getReviews(itemUid),
    staleTime: STALE_TIMES.activities,
    gcTime: CACHE_TIMES.activities,
    enabled: !!itemUid,
  });
};

/**
 * Custom hook for updating user item status with optimistic updates
 */
export const useUpdateUserItemMutation = () => {
  const queryClient = useQueryClient();
  const { updateUserItemStatus } = useAuthenticatedApi();

  return useMutation({
    mutationFn: ({ itemUid, data }: { itemUid: string; data: any }) =>
      updateUserItemStatus(itemUid, data),
    onMutate: async ({ itemUid, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: createQueryKey.userItems() });
      await queryClient.cancelQueries({ queryKey: createQueryKey.dashboard() });

      // Snapshot previous values
      const previousItems = queryClient.getQueryData(createQueryKey.userItems());
      const previousDashboard = queryClient.getQueryData(createQueryKey.dashboard()) as DashboardData;
      
      // Debug logging
      console.log('[DEBUG] Update mutation - Previous dashboard:', previousDashboard);
      console.log('[DEBUG] Update mutation - Item UID:', itemUid, 'New data:', data);

      // Optimistically update the userItems cache
      queryClient.setQueryData(createQueryKey.userItems(), (old: any) => {
        if (!old) return old;
        return old.map((item: UserItem) =>
          item.item_uid === itemUid ? { ...item, ...data } : item
        );
      });

      // Optimistically update the dashboard cache
      if (previousDashboard) {
        const updatedDashboard = { ...previousDashboard };
        
        // Find the item in all lists and update/move it (using immutable operations)
        const findAndRemoveItem = (list: UserItem[] | undefined): [UserItem | null, UserItem[]] => {
          if (!list) return [null, []];
          const index = list.findIndex(item => item.item_uid === itemUid);
          if (index !== -1) {
            const item = list[index];
            // Create NEW array without mutating original
            const newList = list.filter((_, i) => i !== index);
            return [item, newList];
          }
          return [null, list];
        };

        // Remove item from all lists first (immutably)
        let targetItem: UserItem | null = null;
        
        const [item1, newInProgress] = findAndRemoveItem(updatedDashboard.in_progress);
        targetItem = item1 || targetItem;
        updatedDashboard.in_progress = newInProgress;
        
        const [item2, newPlanToWatch] = findAndRemoveItem(updatedDashboard.plan_to_watch);
        targetItem = item2 || targetItem;
        updatedDashboard.plan_to_watch = newPlanToWatch;
        
        const [item3, newOnHold] = findAndRemoveItem(updatedDashboard.on_hold);
        targetItem = item3 || targetItem;
        updatedDashboard.on_hold = newOnHold;
        
        const [item4, newCompletedRecently] = findAndRemoveItem(updatedDashboard.completed_recently);
        targetItem = item4 || targetItem;
        updatedDashboard.completed_recently = newCompletedRecently;

        // If we found the item, update it and add to the appropriate list
        if (targetItem) {
          const updatedItem = { ...targetItem, ...data };
          
          // Add to the correct list based on new status
          switch (data.status) {
            case 'watching':
              updatedDashboard.in_progress = [...(updatedDashboard.in_progress || []), updatedItem];
              break;
            case 'plan_to_watch':
              updatedDashboard.plan_to_watch = [...(updatedDashboard.plan_to_watch || []), updatedItem];
              break;
            case 'on_hold':
              updatedDashboard.on_hold = [...(updatedDashboard.on_hold || []), updatedItem];
              break;
            case 'completed':
              updatedDashboard.completed_recently = [...(updatedDashboard.completed_recently || []), updatedItem];
              break;
            case 'dropped':
              // Dropped items don't appear in dashboard lists
              break;
          }

          // Update the dashboard cache
          queryClient.setQueryData(createQueryKey.dashboard(), updatedDashboard);
          
          // Debug logging
          console.log('[DEBUG] Update mutation - Updated dashboard:', updatedDashboard);
        }
      }

      // Return context with snapshots
      return { previousItems, previousDashboard };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(createQueryKey.userItems(), context.previousItems);
      }
      if (context?.previousDashboard) {
        queryClient.setQueryData(createQueryKey.dashboard(), context.previousDashboard);
      }
    },
    onSuccess: (data) => {
      console.log('[DEBUG] Update mutation SUCCESS - Response:', data);
      console.log('[DEBUG] Invalidating queries with keys:', {
        dashboard: createQueryKey.dashboard(),
        userItems: createQueryKey.userItems()
      });
      
      // Force immediate refetch with 'all' instead of 'active'
      queryClient.invalidateQueries({ 
        queryKey: createQueryKey.dashboard(),
        refetchType: 'all' // Changed from 'active' to force refetch
      });
      
      // Force refetch user items too
      queryClient.invalidateQueries({ 
        queryKey: createQueryKey.userItems(),
        refetchType: 'all' // Changed from 'active' to force refetch
      });
      
      // Don't block on stats update
      queryClient.invalidateQueries({ 
        queryKey: ['user', 'stats'],
        refetchType: 'none' // Don't force refetch, just mark as stale
      });
    },
  });
};

/**
 * Custom hook for removing user item
 */
export const useRemoveUserItemMutation = () => {
  const queryClient = useQueryClient();
  const { removeUserItem } = useAuthenticatedApi();

  return useMutation({
    mutationFn: (itemUid: string) => removeUserItem(itemUid),
    onMutate: async (itemUid: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: createQueryKey.userItems() });
      await queryClient.cancelQueries({ queryKey: createQueryKey.dashboard() });

      // Snapshot previous values
      const previousItems = queryClient.getQueryData(createQueryKey.userItems());
      const previousDashboard = queryClient.getQueryData(createQueryKey.dashboard()) as DashboardData;
      
      // Debug logging
      console.log('[DEBUG] Remove mutation - Previous dashboard:', previousDashboard);
      console.log('[DEBUG] Remove mutation - Removing item UID:', itemUid);

      // Optimistically remove from userItems cache
      queryClient.setQueryData(createQueryKey.userItems(), (old: any) => {
        if (!old) return old;
        return old.filter((item: UserItem) => item.item_uid !== itemUid);
      });

      // Optimistically remove from dashboard cache
      if (previousDashboard) {
        const updatedDashboard = { ...previousDashboard };
        
        // Remove item from all lists (immutably)
        if (updatedDashboard.in_progress) {
          updatedDashboard.in_progress = updatedDashboard.in_progress.filter(
            item => item.item_uid !== itemUid
          );
        }
        if (updatedDashboard.plan_to_watch) {
          updatedDashboard.plan_to_watch = updatedDashboard.plan_to_watch.filter(
            item => item.item_uid !== itemUid
          );
        }
        if (updatedDashboard.on_hold) {
          updatedDashboard.on_hold = updatedDashboard.on_hold.filter(
            item => item.item_uid !== itemUid
          );
        }
        if (updatedDashboard.completed_recently) {
          updatedDashboard.completed_recently = updatedDashboard.completed_recently.filter(
            item => item.item_uid !== itemUid
          );
        }

        // Update the dashboard cache
        queryClient.setQueryData(createQueryKey.dashboard(), updatedDashboard);
        
        // Debug logging
        console.log('[DEBUG] Remove mutation - Updated dashboard:', updatedDashboard);
      }

      // Return context with snapshots
      return { previousItems, previousDashboard };
    },
    onError: (_err, _itemUid, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(createQueryKey.userItems(), context.previousItems);
      }
      if (context?.previousDashboard) {
        queryClient.setQueryData(createQueryKey.dashboard(), context.previousDashboard);
      }
    },
    onSuccess: (data) => {
      console.log('[DEBUG] Remove mutation SUCCESS - Response:', data);
      console.log('[DEBUG] Invalidating queries after remove');
      
      // Force immediate refetch with 'all' instead of 'active'
      queryClient.invalidateQueries({ 
        queryKey: ['user', 'items'],
        refetchType: 'all' // Changed from 'active' to force refetch
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
        refetchType: 'all' // Changed from 'active' to force refetch
      });
      // Don't force stats refetch
      queryClient.invalidateQueries({ 
        queryKey: ['user', 'stats'],
        refetchType: 'none'
      });
    },
  });
};

/**
 * Custom hook for creating comments with cache updates
 */
export const useCreateCommentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => api.social.createComment(data),
    onSuccess: (_newComment, variables) => {
      // Invalidate comments for the specific entity
      queryClient.invalidateQueries({
        queryKey: createQueryKey.comments(variables.parent_type, variables.parent_id),
      });
    },
  });
};

/**
 * Custom hook for creating reviews with cache updates
 */
export const useCreateReviewMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => api.social.createReview(data),
    onSuccess: (_newReview, variables) => {
      // Invalidate reviews for the specific item
      queryClient.invalidateQueries({
        queryKey: createQueryKey.reviews(variables.item_uid),
      });
    },
  });
};

/**
 * Custom hook for following/unfollowing users
 */
export const useToggleFollowMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => api.social.toggleFollow(userId),
    onSuccess: (_data, userId) => {
      // Invalidate user profile and follow lists
      queryClient.invalidateQueries({ queryKey: createQueryKey.userProfile(userId) });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following', userId] });
    },
  });
};

/**
 * Custom hook for updating user profile
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const { updateUserProfile } = useAuthenticatedApi();

  return useMutation({
    mutationFn: (updates: any) => updateUserProfile(updates),
    onSuccess: () => {
      // Invalidate profile queries
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};

/**
 * Custom hook for force refreshing user statistics
 */
export const useForceRefreshStatsMutation = () => {
  const queryClient = useQueryClient();
  const { forceRefreshStats } = useAuthenticatedApi();

  return useMutation({
    mutationFn: () => forceRefreshStats(),
    onSuccess: () => {
      // Invalidate all stats-related queries
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
      queryClient.invalidateQueries({ queryKey: createQueryKey.dashboard() });
    },
  });
};

/**
 * Custom hook for batch fetching multiple items
 * Useful for fetching details of multiple items at once
 */
export const useItemsQueries = (uids: string[]) => {
  return useQueries({
    queries: uids.map(uid => ({
      queryKey: createQueryKey.item(uid),
      queryFn: () => api.public.getItem(uid),
      staleTime: STALE_TIMES.items,
      gcTime: CACHE_TIMES.items,
      enabled: !!uid,
    })),
  });
};

/**
 * Helper hook to prefetch data for navigation
 * Use this to prefetch data before user navigates to a new page
 */
export const usePrefetchData = () => {
  const queryClient = useQueryClient();

  const prefetchItem = (uid: string) => {
    return queryClient.prefetchQuery({
      queryKey: createQueryKey.item(uid),
      queryFn: () => api.public.getItem(uid),
      staleTime: STALE_TIMES.items,
    });
  };

  const prefetchUserProfile = (username: string) => {
    return queryClient.prefetchQuery({
      queryKey: createQueryKey.userProfile(username),
      queryFn: () => api.public.getUserProfile(username),
      staleTime: STALE_TIMES.userProfile,
    });
  };

  const prefetchRecommendations = (uid: string, count: number = 10) => {
    return queryClient.prefetchQuery({
      queryKey: createQueryKey.recommendations(uid, count),
      queryFn: () => api.public.getRecommendations(uid, count),
      staleTime: STALE_TIMES.recommendations,
    });
  };

  return {
    prefetchItem,
    prefetchUserProfile,
    prefetchRecommendations,
  };
};

/**
 * Helper hook to manually invalidate caches
 * Useful for force refreshing data
 */
export const useCacheInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateDashboard = () => {
    return queryClient.invalidateQueries({ queryKey: createQueryKey.dashboard() });
  };

  const invalidateUserData = (userId?: string) => {
    const queries: Array<string | string[]> = [
      ['user', 'profile'],
      ['user', 'stats'],
      ['user', 'items'],
      ['user', 'lists'],
    ];
    if (userId) {
      queries.push(['user', 'profile', userId]);
      queries.push(['user', 'stats', userId]);
      queries.push(['user', 'lists', userId]);
    }
    return invalidateRelatedQueries(queryClient, queries);
  };

  const invalidateAllCaches = () => {
    return queryClient.invalidateQueries();
  };

  return {
    invalidateDashboard,
    invalidateUserData,
    invalidateAllCaches,
  };
};

/**
 * Hook to check offline data availability
 * Useful for showing offline browsing options
 */
export const useOfflineDataStatus = () => {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  
  // Check React Query cache
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();
  const hasQueriesInCache = queries.some(q => q.state.data !== undefined);
  
  return {
    hasAnyData: hasQueriesInCache,
    isOnline
  };
};