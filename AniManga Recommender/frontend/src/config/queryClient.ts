/**
 * React Query (TanStack Query) Client Configuration
 * 
 * This module configures the QueryClient with production-ready settings
 * for the AniManga Recommender application. It defines cache times,
 * retry logic, and default behaviors for all queries and mutations.
 * 
 * Cache Strategy:
 * - User Profile: 30 minutes (frequently accessed, moderate changes)
 * - Items/Anime/Manga: 24 hours (rarely changes, large dataset)
 * - Recommendations: 1 hour (computed data, moderate freshness needed)
 * - Dashboard/Stats: 15 minutes (real-time feel, but cacheable)
 * - User Lists: 5 minutes (frequently updated by users)
 * 
 * Persistence Strategy:
 * - Critical data (items, recommendations) persisted to localStorage
 * - User-specific data cleared on logout
 * - Automatic cache restoration on app startup
 * - Version-based cache invalidation
 * 
 * @module queryClient
 * @since 1.0.0
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { logger } from '../utils/logger';
import { localStorage } from '../utils/localStorage';

/**
 * Cache time configurations for different data types (in milliseconds)
 */
export const CACHE_TIMES = {
  userProfile: 30 * 60 * 1000,      // 30 minutes
  recommendations: 60 * 60 * 1000,   // 1 hour
  items: 24 * 60 * 60 * 1000,       // 24 hours
  statistics: 15 * 60 * 1000,       // 15 minutes
  dashboard: 15 * 60 * 1000,        // 15 minutes
  userLists: 5 * 60 * 1000,         // 5 minutes
  activities: 5 * 60 * 1000,        // 5 minutes
  default: 5 * 60 * 1000,           // 5 minutes default
} as const;

/**
 * Stale time configurations (when to consider data stale)
 * Set to 80% of cache time to trigger background refetch before expiry
 */
export const STALE_TIMES = {
  userProfile: CACHE_TIMES.userProfile * 0.8,
  recommendations: CACHE_TIMES.recommendations * 0.8,
  items: CACHE_TIMES.items * 0.8,
  statistics: CACHE_TIMES.statistics * 0.8,
  dashboard: CACHE_TIMES.dashboard * 0.8,
  userLists: CACHE_TIMES.userLists * 0.8,
  activities: CACHE_TIMES.activities * 0.8,
  default: CACHE_TIMES.default * 0.8,
} as const;

/**
 * Global error handler for queries
 */
const queryErrorHandler = (error: unknown): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  // Log error for debugging
  logger.error('Query error', {
    error: errorMessage,
    context: 'QueryClient',
    timestamp: new Date().toISOString(),
  });

  // Don't show toast for authentication errors (handled by auth context)
  if (errorMessage.includes('authenticated') || errorMessage.includes('401')) {
    return;
  }

  // For other errors, we could show a toast notification here if needed
  // For now, we'll let individual components handle error display
};

/**
 * Global error handler for mutations
 */
const mutationErrorHandler = (error: unknown): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  // Log error for debugging
  logger.error('Mutation error', {
    error: errorMessage,
    context: 'MutationClient',
    timestamp: new Date().toISOString(),
  });

  // Mutations typically show their own error feedback
  // So we just log here without showing global notifications
};

/**
 * Create and configure the QueryClient instance
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: When to consider cached data stale
      staleTime: STALE_TIMES.default,
      
      // GC time: When to garbage collect inactive queries
      gcTime: CACHE_TIMES.default,
      
      // Enhanced retry configuration for cold starts and other errors
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error) {
          const message = error.message;
          if (message.includes('400') || message.includes('401') || 
              message.includes('403') || message.includes('404')) {
            return false;
          }
        }
        
        // Check if this is a cold start error (502 or 503)
        const isColdStart = error instanceof Error && 
          (error.message.includes('502') || error.message.includes('503') ||
           (error as any).response?.status === 502 || (error as any).response?.status === 503);
        
        // More retries for cold starts
        if (isColdStart) {
          return failureCount < 5; // Up to 5 retries for cold starts
        }
        
        // Standard retries for other errors
        return failureCount < 3;
      },
      
      // Retry delay with exponential backoff (longer for cold starts)
      retryDelay: (attemptIndex, error) => {
        // Check if this is a cold start error
        const isColdStart = error instanceof Error && 
          (error.message.includes('502') || error.message.includes('503') ||
           (error as any).response?.status === 502 || (error as any).response?.status === 503);
        
        if (isColdStart) {
          // Longer delays for cold starts: 3s, 6s, 12s, 24s, 30s
          return Math.min(3000 * (1.5 ** attemptIndex), 30000);
        }
        
        // Standard exponential backoff for other errors: 1s, 2s, 4s, 8s, etc.
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
      
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Don't refetch on mount if data exists and is fresh
      refetchOnMount: true,
      
      // Network mode - works even when offline with cached data
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry configuration for mutations
      retry: 1, // Only retry mutations once
      
      // Network mode for mutations
      networkMode: 'online', // Mutations require online status
    },
  },
  
  // Configure query cache with error handling
  queryCache: new QueryCache({
    onError: queryErrorHandler,
    onSuccess: (_data, query) => {
      // Log successful cache updates in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Query cache updated', {
          queryKey: query.queryKey,
          context: 'QueryCache',
        });
      }
    },
  }),
  
  // Configure mutation cache with error handling
  mutationCache: new MutationCache({
    onError: mutationErrorHandler,
    onSuccess: (_data, _variables, _context, mutation) => {
      // Log successful mutations in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Mutation completed', {
          mutationKey: mutation.options.mutationKey,
          context: 'MutationCache',
        });
      }
    },
  }),
});

/**
 * Helper function to get cache time for a specific query type
 */
export const getCacheTime = (queryType: keyof typeof CACHE_TIMES): number => {
  return CACHE_TIMES[queryType] || CACHE_TIMES.default;
};

/**
 * Helper function to get stale time for a specific query type
 */
export const getStaleTime = (queryType: keyof typeof STALE_TIMES): number => {
  return STALE_TIMES[queryType] || STALE_TIMES.default;
};

/**
 * Helper function to create consistent query keys
 */
export const createQueryKey = {
  // User-related queries
  userProfile: (userId?: string) => ['user', 'profile', userId].filter(Boolean),
  userStats: (userId: string) => ['user', 'stats', userId],
  userLists: (userId: string) => ['user', 'lists', userId],
  userItems: (status?: string) => ['user', 'items', status].filter(Boolean),
  
  // Item-related queries
  items: (filters?: Record<string, any>) => ['items', filters].filter(Boolean),
  item: (uid: string) => ['items', uid],
  recommendations: (uid: string, count?: number) => ['recommendations', uid, count].filter(Boolean),
  
  // Dashboard and analytics
  dashboard: () => ['dashboard'],
  analytics: (type: string, id?: string) => ['analytics', type, id].filter(Boolean),
  
  // Social features
  comments: (type: string, id: string) => ['comments', type, id],
  reviews: (itemUid: string) => ['reviews', itemUid],
  followers: (username: string) => ['followers', username],
  following: (username: string) => ['following', username],
  
  // Lists
  listDetails: (listId: string) => ['lists', listId],
  listItems: (listId: string) => ['lists', listId, 'items'],
  discoverLists: (filters?: Record<string, any>) => ['lists', 'discover', filters].filter(Boolean),
};

/**
 * Helper to invalidate related queries after mutations
 */
export const invalidateRelatedQueries = async (
  queryClient: QueryClient,
  keys: Array<string | string[]>
): Promise<void> => {
  await Promise.all(
    keys.map(key => 
      queryClient.invalidateQueries({ 
        queryKey: Array.isArray(key) ? key : [key] 
      })
    )
  );
};

/**
 * Create storage persister for React Query
 * Uses our custom localStorage utility for enhanced features
 */
export const persister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => {
      const data = localStorage.getItem<string>(key);
      return data || null;
    },
    setItem: (key: string, value: string) => {
      localStorage.setItem(key, value, {
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days TTL for cache
      });
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key);
    }
  },
  // Throttle cache writes to avoid performance issues
  throttleTime: 1000,
});

/**
 * Determine if a query should be persisted
 * Only persist non-user-specific, expensive queries
 */
export const shouldPersistQuery = (queryKey: unknown): boolean => {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;
  
  const key = queryKey[0];
  
  // Persist these query types
  const persistableQueries = [
    'items',           // Anime/manga catalog
    'recommendations', // Recommendation results
    'distinct-values', // Filter options
    'lists'           // Public lists only
  ];
  
  // Don't persist user-specific data
  const userSpecificQueries = [
    'user',
    'dashboard',
    'auth',
    'notifications'
  ];
  
  if (typeof key === 'string') {
    // Check if it's a user-specific query
    if (userSpecificQueries.some(q => key.includes(q))) {
      return false;
    }
    
    // Check if it's a persistable query
    return persistableQueries.some(q => key.includes(q));
  }
  
  return false;
};

/**
 * Clear user-specific cached data
 * Call this on logout
 */
export const clearUserCache = () => {
  const allKeys = localStorage.getAllKeys();
  
  // Remove user-specific cached queries
  allKeys.forEach(key => {
    if (key.includes('user') || key.includes('dashboard') || key.includes('auth')) {
      localStorage.removeItem(key);
    }
  });
  
  // Also clear from React Query
  queryClient.removeQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      if (Array.isArray(queryKey) && queryKey.length > 0) {
        const key = queryKey[0];
        return typeof key === 'string' && 
          (key.includes('user') || key.includes('dashboard') || key.includes('auth'));
      }
      return false;
    }
  });
};

/**
 * Get cache statistics for monitoring
 */
export const getCacheStats = () => {
  const stats = localStorage.getStats();
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();
  
  return {
    storage: stats,
    queries: {
      total: queries.length,
      active: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      stale: queries.filter(q => q.isStale()).length,
      persisted: queries.filter(q => shouldPersistQuery(q.queryKey)).length
    }
  };
};