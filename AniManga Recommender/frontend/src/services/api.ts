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

import axios, { AxiosInstance, AxiosError } from 'axios';
import { networkMonitor } from '../utils/errorHandler';
import { supabase } from '../lib/supabase';

/**
 * Cold start detection and event system
 */
export interface ColdStartEvent {
  type: 'cold-start-detected' | 'cold-start-resolved';
  timestamp: number;
  duration?: number;
}

class ColdStartDetector {
  private isFirstLoad = true;
  private coldStartDetected = false;
  private coldStartStartTime: number | null = null;
  private listeners: Set<(event: ColdStartEvent) => void> = new Set();

  detectColdStart(error: any): boolean {
    const isColdStart = this.isFirstLoad && error?.response && 
      (error.response.status === 502 || error.response.status === 503);
    if (isColdStart) {
      if (!this.coldStartDetected) {
        this.coldStartDetected = true;
        this.coldStartStartTime = Date.now();
        this.emit({
          type: 'cold-start-detected',
          timestamp: Date.now()
        });
      }
      return true;
    }
    return false;
  }

  resolveColdStart(): void {
    if (this.coldStartDetected) {
      this.coldStartDetected = false;
      this.isFirstLoad = false;
      const duration = this.coldStartStartTime 
        ? Date.now() - this.coldStartStartTime 
        : undefined;
      
      const event: ColdStartEvent = {
        type: 'cold-start-resolved',
        timestamp: Date.now()
      };
      if (duration !== undefined) {
        event.duration = duration;
      }
      this.emit(event);
    }
  }

  subscribe(listener: (event: ColdStartEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ColdStartEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  isInColdStart(): boolean {
    return this.coldStartDetected;
  }
}

export const coldStartDetector = new ColdStartDetector();

/**
 * Base URL for API endpoints
 * Uses environment variable or defaults to localhost for development
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';


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
      const response = await axiosInstance.get('/api/items', { 
        params,
        headers: { 'X-Skip-Auth': 'true' }
      });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get single item details
     */
    getItem: async (uid: string) => {
      const response = await axiosInstance.get(`/api/items/${uid}`, {
        headers: { 'X-Skip-Auth': 'true' }
      });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get recommendations for an item
     */
    getRecommendations: async (uid: string, n: number = 10) => {
      const response = await axiosInstance.get(`/api/recommendations/${uid}`, { 
        params: { n },
        headers: { 'X-Skip-Auth': 'true' }
      });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get distinct filter values
     */
    getDistinctValues: async () => {
      const response = await axiosInstance.get('/api/distinct-values', {
        headers: { 'X-Skip-Auth': 'true' }
      });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Discover public lists
     */
    discoverLists: async (params?: Record<string, any>) => {
      const response = await axiosInstance.get('/api/lists/discover', { params });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get user profile (public view)
     */
    getUserProfile: async (userId: string) => {
      const response = await axiosInstance.get(`/api/social/users/${userId}/profile`, {
        headers: { 'X-Skip-Auth': 'true' }
      });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get user's public lists
     */
    getUserLists: async (userId: string) => {
      const response = await axiosInstance.get(`/api/social/users/${userId}/lists`, {
        headers: { 'X-Skip-Auth': 'true' }
      });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get user's followers
     */
    getUserFollowers: async (userId: string, params?: Record<string, any>) => {
      const response = await axiosInstance.get(`/api/social/users/${userId}/followers`, { params });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get users that a user is following
     */
    getUserFollowing: async (userId: string, params?: Record<string, any>) => {
      const response = await axiosInstance.get(`/api/social/users/${userId}/following`, { params });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get list details
     */
    getListDetails: async (listId: string) => {
      const response = await axiosInstance.get(`/api/lists/${listId}`);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get list items
     */
    getListItems: async (listId: string, params?: Record<string, any>) => {
      const response = await axiosInstance.get(`/api/lists/${listId}/items`, { params });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get list analytics (if public)
     */
    getListAnalytics: async (listId: string) => {
      const response = await axiosInstance.get(`/api/analytics/lists/${listId}`);
      coldStartDetector.resolveColdStart();
      return response.data;
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
      const response = await axiosInstance.get('/api/auth/dashboard');
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get authenticated user's profile
     */
    getProfile: async () => {
      const response = await axiosInstance.get('/api/auth/profile');
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Update authenticated user's profile
     */
    updateProfile: async (data: any) => {
      const response = await axiosInstance.put('/api/auth/profile', data);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get authenticated user's items
     */
    getUserItems: async (status?: string) => {
      const response = await axiosInstance.get('/api/auth/user-items', { 
        params: status ? { status } : undefined 
      });
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Add or update user item
     */
    updateUserItem: async (itemUid: string, data: any) => {
      const response = await axiosInstance.post(`/api/auth/user-items/${itemUid}`, data);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Remove user item
     */
    removeUserItem: async (itemUid: string) => {
      const response = await axiosInstance.delete(`/api/auth/user-items/${itemUid}`);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Force refresh user statistics
     */
    forceRefreshStats: async () => {
      const response = await axiosInstance.post('/api/auth/force-refresh-stats');
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Cleanup orphaned items
     */
    cleanupOrphanedItems: async () => {
      const response = await axiosInstance.post('/api/auth/cleanup-orphaned-items');
      coldStartDetector.resolveColdStart();
      return response.data;
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
      const response = await axiosInstance.post(`/api/social/follow/${userId}`);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get comments for an entity
     */
    getComments: async (entityType: string, entityId: string) => {
      const response = await axiosInstance.get(`/api/social/comments/${entityType}/${entityId}`);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Create a comment
     */
    createComment: async (data: any) => {
      const response = await axiosInstance.post('/api/social/comments', data);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Get reviews for an item
     */
    getReviews: async (itemUid: string) => {
      const response = await axiosInstance.get(`/api/social/reviews/${itemUid}`);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Create a review
     */
    createReview: async (data: any) => {
      const response = await axiosInstance.post('/api/social/reviews', data);
      coldStartDetector.resolveColdStart();
      return response.data;
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
      const response = await axiosInstance.get('/api/auth/lists');
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Create a new list
     */
    createList: async (data: any) => {
      const response = await axiosInstance.post('/api/auth/lists', data);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Update list details
     */
    updateList: async (listId: string, data: any) => {
      const response = await axiosInstance.put(`/api/auth/lists/${listId}`, data);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Delete a list
     */
    deleteList: async (listId: string) => {
      const response = await axiosInstance.delete(`/api/auth/lists/${listId}`);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Add item to list
     */
    addItemToList: async (listId: string, itemId: string, data?: any) => {
      const response = await axiosInstance.post(`/api/auth/lists/${listId}/items/${itemId}`, data);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Remove item from list
     */
    removeItemFromList: async (listId: string, itemId: string) => {
      const response = await axiosInstance.delete(`/api/auth/lists/${listId}/items/${itemId}`);
      coldStartDetector.resolveColdStart();
      return response.data;
    },

    /**
     * Follow/unfollow a list
     */
    toggleListFollow: async (listId: string) => {
      const response = await axiosInstance.post(`/api/auth/lists/${listId}/follow`);
      coldStartDetector.resolveColdStart();
      return response.data;
    }
  },

  /**
   * Raw axios instance for custom requests
   */
  raw: axiosInstance
};

// Export types for use in components
export type ApiService = typeof api;
export { API_BASE_URL };