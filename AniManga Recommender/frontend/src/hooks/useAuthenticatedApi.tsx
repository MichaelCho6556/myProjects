// frontend/src/hooks/useAuthenticatedApi.tsx
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { RateLimiter } from "../utils/security";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const useAuthenticatedApi = () => {
  const { user } = useAuth();

  const rateLimiter = new RateLimiter(10, 60000);

  const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    const userId = user.id;
    if (!rateLimiter.isAllowed(userId)) {
      throw new Error("Rate limit exceeded. Please wait before making more requests.");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("No valid session token");
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

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

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error || "Operation failed");
      }

      return result;
    }

    return { success: true };
  };

  const resetRateLimit = () => {
    if (user) {
      rateLimiter.reset(user.id);
    }
  };

  const getUserProfile = () => makeAuthenticatedRequest("/api/auth/profile");

  const updateUserProfile = (updates: any) =>
    makeAuthenticatedRequest("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });

  const getUserItems = (status?: string) => {
    const params = status ? `?status=${status}` : "";
    return makeAuthenticatedRequest(`/api/auth/user-items${params}`);
  };

  const updateUserItemStatus = (itemUid: string, data: any) =>
    makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
      method: "POST",
      body: JSON.stringify(data),
    });

  const removeUserItem = (itemUid: string) =>
    makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
      method: "DELETE",
    });

  const getDashboardData = () => makeAuthenticatedRequest("/api/auth/dashboard");

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
