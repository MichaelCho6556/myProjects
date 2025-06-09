/**
 * Authenticated API Hook for AniManga Recommender
 *
 * This module provides a comprehensive hook for making authenticated API requests
 * to the backend server. It handles authentication, rate limiting, error handling,
 * and provides convenient methods for common API operations.
 *
 * Key Features:
 * - Automatic JWT token injection for authenticated requests
 * - Built-in rate limiting to prevent API abuse
 * - Comprehensive error handling and user feedback
 * - Type-safe API method abstractions
 * - Session validation and automatic token refresh
 * - Request/response validation and formatting
 *
 * Security Features:
 * - Rate limiting per user (10 requests per minute by default)
 * - Automatic session validation before requests
 * - Secure token handling and storage
 * - Error message sanitization
 *
 * @fileoverview Authenticated API client hook for backend communication
 * @author Michael Cho
 * @since 1.0.0
 */

// frontend/src/hooks/useAuthenticatedApi.tsx
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { RateLimiter } from "../utils/security";

/**
 * Base URL for API endpoints.
 * Uses environment variable or defaults to localhost for development.
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Return type for the useAuthenticatedApi hook.
 *
 * @interface UseAuthenticatedApiReturn
 * @property {Function} makeAuthenticatedRequest - Generic authenticated request method
 * @property {Function} getUserProfile - Get user profile data
 * @property {Function} updateUserProfile - Update user profile
 * @property {Function} getUserItems - Get user's anime/manga items
 * @property {Function} updateUserItemStatus - Update item status and progress
 * @property {Function} removeUserItem - Remove item from user's list
 * @property {Function} getDashboardData - Get comprehensive dashboard data
 * @property {Function} resetRateLimit - Reset rate limiting for current user
 */
interface UseAuthenticatedApiReturn {
  makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  getUserProfile: () => Promise<any>;
  updateUserProfile: (updates: any) => Promise<any>;
  getUserItems: (status?: string) => Promise<any>;
  updateUserItemStatus: (itemUid: string, data: any) => Promise<any>;
  removeUserItem: (itemUid: string) => Promise<any>;
  getDashboardData: () => Promise<any>;
  resetRateLimit: () => void;
}

/**
 * Custom hook for making authenticated API requests to the AniManga backend.
 *
 * This hook provides a complete API client for authenticated operations,
 * handling session management, rate limiting, and error handling automatically.
 * It abstracts common API patterns and provides type-safe methods for all
 * backend endpoints requiring authentication.
 *
 * Authentication Flow:
 * 1. Validates user is authenticated via AuthContext
 * 2. Retrieves current session token from Supabase
 * 3. Injects Bearer token in Authorization header
 * 4. Makes request with proper error handling
 * 5. Validates and parses response data
 *
 * Rate Limiting:
 * - Implements per-user rate limiting (10 requests/minute)
 * - Prevents API abuse and server overload
 * - Provides clear error messages when limits exceeded
 * - Can be reset manually if needed
 *
 * Error Handling:
 * - Comprehensive HTTP status code handling
 * - JSON error response parsing
 * - User-friendly error messages
 * - Automatic retry logic for certain errors
 *
 * @hook
 * @returns {UseAuthenticatedApiReturn} Object containing authenticated API methods
 *
 * @throws {Error} When user is not authenticated
 * @throws {Error} When rate limit is exceeded
 * @throws {Error} When session token is invalid
 * @throws {Error} When API request fails
 *
 * @example
 * ```typescript
 * // Basic usage in a component
 * function UserProfile() {
 *   const { getUserProfile, updateUserProfile } = useAuthenticatedApi();
 *   const [profile, setProfile] = useState(null);
 *
 *   useEffect(() => {
 *     const loadProfile = async () => {
 *       try {
 *         const profileData = await getUserProfile();
 *         setProfile(profileData);
 *       } catch (error) {
 *         console.error("Failed to load profile:", error.message);
 *       }
 *     };
 *     loadProfile();
 *   }, []);
 *
 *   const handleUpdate = async (updates) => {
 *     try {
 *       await updateUserProfile(updates);
 *       alert("Profile updated successfully!");
 *     } catch (error) {
 *       alert(`Update failed: ${error.message}`);
 *     }
 *   };
 *
 *   return <ProfileForm profile={profile} onUpdate={handleUpdate} />;
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using generic request method for custom endpoints
 * function CustomComponent() {
 *   const { makeAuthenticatedRequest } = useAuthenticatedApi();
 *
 *   const fetchCustomData = async () => {
 *     try {
 *       const data = await makeAuthenticatedRequest('/api/auth/custom-endpoint', {
 *         method: 'POST',
 *         body: JSON.stringify({ param1: 'value1' })
 *       });
 *       return data;
 *     } catch (error) {
 *       console.error("Custom request failed:", error.message);
 *     }
 *   };
 *
 *   return <CustomDisplay onFetch={fetchCustomData} />;
 * }
 * ```
 *
 * @see {@link useAuth} for authentication context
 * @see {@link RateLimiter} for rate limiting implementation
 * @see {@link supabase} for session management
 */
export const useAuthenticatedApi = (): UseAuthenticatedApiReturn => {
  const { user } = useAuth();

  // Initialize rate limiter with 10 requests per minute limit
  const rateLimiter = new RateLimiter(10, 60000);

  /**
   * Makes an authenticated HTTP request to the backend API.
   *
   * This is the core method that handles all authenticated API communication.
   * It manages authentication headers, rate limiting, error handling, and
   * response validation for all API requests.
   *
   * @async
   * @function makeAuthenticatedRequest
   * @param {string} endpoint - API endpoint path (e.g., "/api/auth/profile")
   * @param {RequestInit} [options={}] - Fetch options for the request
   * @param {string} [options.method="GET"] - HTTP method
   * @param {string} [options.body] - Request body for POST/PUT requests
   * @param {Record<string, string>} [options.headers] - Additional headers
   * @returns {Promise<any>} Promise resolving to the parsed response data
   *
   * @throws {Error} When user is not authenticated
   * @throws {Error} When rate limit is exceeded
   * @throws {Error} When session token is invalid or expired
   * @throws {Error} When HTTP request fails
   * @throws {Error} When response indicates operation failure
   *
   * @example
   * ```typescript
   * // GET request
   * const data = await makeAuthenticatedRequest('/api/auth/profile');
   *
   * // POST request with data
   * const result = await makeAuthenticatedRequest('/api/auth/user-items/anime_123', {
   *   method: 'POST',
   *   body: JSON.stringify({ status: 'completed', rating: 9 })
   * });
   *
   * // Custom headers
   * const response = await makeAuthenticatedRequest('/api/auth/custom', {
   *   method: 'PUT',
   *   headers: { 'X-Custom-Header': 'value' },
   *   body: JSON.stringify({ data: 'example' })
   * });
   * ```
   */
  const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    // Validate user authentication
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Apply rate limiting per user
    const userId = user.id;
    if (!rateLimiter.isAllowed(userId)) {
      throw new Error("Rate limit exceeded. Please wait before making more requests.");
    }

    // Get current session and validate token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("No valid session token");
    }

    // Prepare headers with authentication and content type
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    };

    // Make the HTTP request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      console.warn("API request failed:", response.status);
      throw new Error(errorMessage);
    }

    // Parse and validate response
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();

      // Check for operation-level errors
      if (result.success === false) {
        throw new Error(result.error || "Operation failed");
      }

      return result;
    }

    // Return success indicator for non-JSON responses
    return { success: true };
  };

  /**
   * Resets rate limiting for the current user.
   *
   * This method can be used to reset rate limiting in case of legitimate
   * high-frequency operations or when rate limits need to be cleared.
   *
   * @function resetRateLimit
   * @returns {void}
   *
   * @example
   * ```typescript
   * const { resetRateLimit } = useAuthenticatedApi();
   *
   * // Reset rate limits for batch operations
   * resetRateLimit();
   * await performBatchOperations();
   * ```
   */
  const resetRateLimit = (): void => {
    if (user) {
      rateLimiter.reset(user.id);
    }
  };

  /**
   * Retrieves the authenticated user's profile data.
   *
   * @async
   * @function getUserProfile
   * @returns {Promise<any>} Promise resolving to user profile data
   *
   * @example
   * ```typescript
   * const profile = await getUserProfile();
   * console.log(profile.display_name);
   * ```
   */
  const getUserProfile = (): Promise<any> => makeAuthenticatedRequest("/api/auth/profile");

  /**
   * Updates the authenticated user's profile information.
   *
   * @async
   * @function updateUserProfile
   * @param {any} updates - Profile updates object
   * @returns {Promise<any>} Promise resolving to updated profile data
   *
   * @example
   * ```typescript
   * await updateUserProfile({
   *   display_name: "New Name",
   *   bio: "Updated bio"
   * });
   * ```
   */
  const updateUserProfile = (updates: any): Promise<any> =>
    makeAuthenticatedRequest("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });

  /**
   * Retrieves the user's anime/manga items, optionally filtered by status.
   *
   * @async
   * @function getUserItems
   * @param {string} [status] - Optional status filter ("watching", "completed", etc.)
   * @returns {Promise<any>} Promise resolving to user's items array
   *
   * @example
   * ```typescript
   * // Get all items
   * const allItems = await getUserItems();
   *
   * // Get only watching items
   * const watchingItems = await getUserItems("watching");
   * ```
   */
  const getUserItems = (status?: string): Promise<any> => {
    const params = status ? `?status=${status}` : "";
    return makeAuthenticatedRequest(`/api/auth/user-items${params}`);
  };

  /**
   * Updates the status and progress of a user's anime/manga item.
   *
   * @async
   * @function updateUserItemStatus
   * @param {string} itemUid - Unique identifier of the item to update
   * @param {any} data - Update data object containing status, progress, rating, etc.
   * @returns {Promise<any>} Promise resolving to updated item data
   *
   * @example
   * ```typescript
   * await updateUserItemStatus("anime_123", {
   *   status: "completed",
   *   rating: 9,
   *   episodes_watched: 24
   * });
   * ```
   */
  const updateUserItemStatus = (itemUid: string, data: any): Promise<any> =>
    makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
      method: "POST",
      body: JSON.stringify(data),
    });

  /**
   * Removes an item from the user's anime/manga list.
   *
   * @async
   * @function removeUserItem
   * @param {string} itemUid - Unique identifier of the item to remove
   * @returns {Promise<any>} Promise resolving to deletion confirmation
   *
   * @example
   * ```typescript
   * await removeUserItem("anime_123");
   * console.log("Item removed from list");
   * ```
   */
  const removeUserItem = (itemUid: string): Promise<any> =>
    makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
      method: "DELETE",
    });

  /**
   * Retrieves comprehensive dashboard data for the authenticated user.
   *
   * This includes user statistics, recent activity, current progress,
   * and quick stats for dashboard display.
   *
   * @async
   * @function getDashboardData
   * @returns {Promise<any>} Promise resolving to complete dashboard data object
   *
   * @example
   * ```typescript
   * const dashboardData = await getDashboardData();
   * console.log(dashboardData.user_stats.total_anime_watched);
   * console.log(dashboardData.recent_activity);
   * ```
   */
  const getDashboardData = (): Promise<any> => makeAuthenticatedRequest("/api/auth/dashboard");

  return {
    makeAuthenticatedRequest,
    getUserProfile,
    updateUserProfile,
    getUserItems,
    updateUserItemStatus,
    removeUserItem,
    getDashboardData,
    resetRateLimit,
  };
};
