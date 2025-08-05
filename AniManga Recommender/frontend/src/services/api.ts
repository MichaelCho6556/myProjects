/**
 * Centralized API Service Module for AniManga Recommender
 * 
 * This module provides a unified interface for all API communications with the backend,
 * implementing robust error handling, retry logic for cold starts, and type safety.
 * Designed to handle production deployment scenarios where servers may experience
 * cold starts (e.g., Render free tier).
 * 
 * Key Features:
 * - Centralized axios instance with default configuration
 * - Automatic retry logic for server cold starts (502/503 errors)
 * - Integration with existing error handling and retry mechanisms
 * - Type-safe API methods for all endpoints
 * - Request/response interceptors for common operations
 * - Network status awareness
 * - Circuit breaker pattern integration
 * 
 * @module api
 * @author Michael Cho
 * @since 1.0.0
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { retryOperation, networkMonitor, RetryConfig } from '../utils/errorHandler';
import { supabase } from '../lib/supabase';

/**
 * Base URL for API endpoints
 * Uses environment variable or defaults to localhost for development
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Cold start retry configuration
 * Optimized for handling server wake-up scenarios
 */
const COLD_START_RETRY_CONFIG: Partial<RetryConfig> = {
  maxRetries: 5, // More retries for cold starts
  baseDelayMs: 3000, // Longer initial delay
  maxDelayMs: 30000,
  exponentialBase: 1.5, // Slower exponential growth
  jitter: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  onRetry: (attempt, error) => {
    console.info(`Retrying API call (attempt ${attempt}). Server may be starting up...`);
  },
  onFinalFailure: (error) => {
    console.error('API call failed after all retries:', error);
  }
};

/**
 * Standard retry configuration for regular errors
 */
const STANDARD_RETRY_CONFIG: Partial<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  exponentialBase: 2,
  jitter: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/**
 * Create axios instance with default configuration
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    async (config) => {
      // Check network status before making request
      const networkStatus = networkMonitor.getStatus();
      if (!networkStatus.isOnline) {
        throw new Error('No internet connection. Please check your network.');
      }

      // Add auth token if available and not explicitly excluded
      if (config.headers && !config.headers['X-Skip-Auth']) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
          }
        } catch (error) {
          console.warn('Failed to get auth session:', error);
        }
      }

      // Remove internal headers
      delete config.headers['X-Skip-Auth'];

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      // Handle successful responses
      return response;
    },
    (error: AxiosError) => {
      // Log error details for debugging
      if (error.response) {
        console.warn(`API Error: ${error.response.status} - ${error.config?.url}`);
      } else if (error.request) {
        console.warn('API Error: No response received', error.config?.url);
      } else {
        console.warn('API Error:', error.message);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Create the axios instance
const axiosInstance = createAxiosInstance();

/**
 * Determine if an error is likely due to a cold start
 */
const isColdStartError = (error: any): boolean => {
  if (error.response) {
    const status = error.response.status;
    // 502 Bad Gateway and 503 Service Unavailable are common during cold starts
    return status === 502 || status === 503;
  }
  return false;
};

/**
 * Execute API request with appropriate retry strategy
 */
const executeWithRetry = async <T>(
  operation: () => Promise<AxiosResponse<T>>,
  customConfig?: Partial<RetryConfig>
): Promise<T> => {
  try {
    // First attempt
    const response = await operation();
    return response.data;
  } catch (error) {
    // Determine retry strategy based on error type
    const retryConfig = isColdStartError(error) 
      ? { ...COLD_START_RETRY_CONFIG, ...customConfig }
      : { ...STANDARD_RETRY_CONFIG, ...customConfig };

    // Retry with appropriate configuration
    const response = await retryOperation(operation, retryConfig);
    return response.data;
  }
};

/**
 * API Service Interface
 */
export const api = {
  /**
   * Public endpoints (no authentication required)
   */
  public: {
    /**
     * Get paginated items with optional filters
     */
    getItems: async (params?: Record<string, any>) => {
      return executeWithRetry(() => 
        axiosInstance.get('/api/items', { 
          params,
          headers: { 'X-Skip-Auth': 'true' }
        })
      );
    },

    /**
     * Get single item details
     */
    getItem: async (uid: string) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/items/${uid}`, {
          headers: { 'X-Skip-Auth': 'true' }
        })
      );
    },

    /**
     * Get recommendations for an item
     */
    getRecommendations: async (uid: string, n: number = 10) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/recommendations/${uid}`, { 
          params: { n },
          headers: { 'X-Skip-Auth': 'true' }
        })
      );
    },

    /**
     * Get distinct filter values
     */
    getDistinctValues: async () => {
      return executeWithRetry(() => 
        axiosInstance.get('/api/distinct-values', {
          headers: { 'X-Skip-Auth': 'true' }
        })
      );
    },

    /**
     * Discover public lists
     */
    discoverLists: async (params?: Record<string, any>) => {
      return executeWithRetry(() => 
        axiosInstance.get('/api/lists/discover', { params })
      );
    },

    /**
     * Get user profile (public view)
     */
    getUserProfile: async (userId: string) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/social/users/${userId}/profile`, {
          headers: { 'X-Skip-Auth': 'true' }
        })
      );
    },

    /**
     * Get user's public lists
     */
    getUserLists: async (userId: string) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/social/users/${userId}/lists`, {
          headers: { 'X-Skip-Auth': 'true' }
        })
      );
    },

    /**
     * Get user's followers
     */
    getUserFollowers: async (userId: string, params?: Record<string, any>) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/social/users/${userId}/followers`, { params })
      );
    },

    /**
     * Get users that a user is following
     */
    getUserFollowing: async (userId: string, params?: Record<string, any>) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/social/users/${userId}/following`, { params })
      );
    },

    /**
     * Get list details
     */
    getListDetails: async (listId: string) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/lists/${listId}`)
      );
    },

    /**
     * Get list items
     */
    getListItems: async (listId: string, params?: Record<string, any>) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/lists/${listId}/items`, { params })
      );
    },

    /**
     * Get list analytics (if public)
     */
    getListAnalytics: async (listId: string) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/analytics/lists/${listId}`)
      );
    }
  },

  /**
   * Authenticated endpoints (requires user authentication)
   * Note: These methods will automatically include the auth token via interceptor
   */
  auth: {
    /**
     * Get authenticated user's dashboard data
     */
    getDashboard: async () => {
      return executeWithRetry(() => 
        axiosInstance.get('/api/auth/dashboard')
      );
    },

    /**
     * Get authenticated user's profile
     */
    getProfile: async () => {
      return executeWithRetry(() => 
        axiosInstance.get('/api/auth/profile')
      );
    },

    /**
     * Update authenticated user's profile
     */
    updateProfile: async (data: any) => {
      return executeWithRetry(() => 
        axiosInstance.put('/api/auth/profile', data)
      );
    },

    /**
     * Get authenticated user's items
     */
    getUserItems: async (status?: string) => {
      return executeWithRetry(() => 
        axiosInstance.get('/api/auth/user-items', { 
          params: status ? { status } : undefined 
        })
      );
    },

    /**
     * Add or update user item
     */
    updateUserItem: async (itemUid: string, data: any) => {
      return executeWithRetry(() => 
        axiosInstance.post(`/api/auth/user-items/${itemUid}`, data)
      );
    },

    /**
     * Remove user item
     */
    removeUserItem: async (itemUid: string) => {
      return executeWithRetry(() => 
        axiosInstance.delete(`/api/auth/user-items/${itemUid}`)
      );
    },

    /**
     * Force refresh user statistics
     */
    forceRefreshStats: async () => {
      return executeWithRetry(() => 
        axiosInstance.post('/api/auth/force-refresh-stats')
      );
    },

    /**
     * Cleanup orphaned items
     */
    cleanupOrphanedItems: async () => {
      return executeWithRetry(() => 
        axiosInstance.post('/api/auth/cleanup-orphaned-items')
      );
    }
  },

  /**
   * Social features endpoints
   */
  social: {
    /**
     * Follow/unfollow a user
     */
    toggleFollow: async (userId: string) => {
      return executeWithRetry(() => 
        axiosInstance.post(`/api/social/follow/${userId}`)
      );
    },

    /**
     * Get comments for an entity
     */
    getComments: async (entityType: string, entityId: string) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/social/comments/${entityType}/${entityId}`)
      );
    },

    /**
     * Create a comment
     */
    createComment: async (data: any) => {
      return executeWithRetry(() => 
        axiosInstance.post('/api/social/comments', data)
      );
    },

    /**
     * Get reviews for an item
     */
    getReviews: async (itemUid: string) => {
      return executeWithRetry(() => 
        axiosInstance.get(`/api/social/reviews/${itemUid}`)
      );
    },

    /**
     * Create a review
     */
    createReview: async (data: any) => {
      return executeWithRetry(() => 
        axiosInstance.post('/api/social/reviews', data)
      );
    }
  },

  /**
   * List management endpoints
   */
  lists: {
    /**
     * Get authenticated user's lists
     */
    getMyLists: async () => {
      return executeWithRetry(() => 
        axiosInstance.get('/api/auth/lists')
      );
    },

    /**
     * Create a new list
     */
    createList: async (data: any) => {
      return executeWithRetry(() => 
        axiosInstance.post('/api/auth/lists', data)
      );
    },

    /**
     * Update list details
     */
    updateList: async (listId: string, data: any) => {
      return executeWithRetry(() => 
        axiosInstance.put(`/api/auth/lists/${listId}`, data)
      );
    },

    /**
     * Delete a list
     */
    deleteList: async (listId: string) => {
      return executeWithRetry(() => 
        axiosInstance.delete(`/api/auth/lists/${listId}`)
      );
    },

    /**
     * Add item to list
     */
    addItemToList: async (listId: string, itemId: string, data?: any) => {
      return executeWithRetry(() => 
        axiosInstance.post(`/api/auth/lists/${listId}/items/${itemId}`, data)
      );
    },

    /**
     * Remove item from list
     */
    removeItemFromList: async (listId: string, itemId: string) => {
      return executeWithRetry(() => 
        axiosInstance.delete(`/api/auth/lists/${listId}/items/${itemId}`)
      );
    },

    /**
     * Follow/unfollow a list
     */
    toggleListFollow: async (listId: string) => {
      return executeWithRetry(() => 
        axiosInstance.post(`/api/auth/lists/${listId}/follow`)
      );
    }
  },

  /**
   * Raw axios instance for custom requests
   */
  raw: axiosInstance,

  /**
   * Utility method to create a custom retry configuration
   */
  withRetryConfig: <T>(
    operation: () => Promise<AxiosResponse<T>>,
    config: Partial<RetryConfig>
  ) => {
    return executeWithRetry(operation, config);
  }
};

// Export types for use in components
export type ApiService = typeof api;
export { API_BASE_URL };