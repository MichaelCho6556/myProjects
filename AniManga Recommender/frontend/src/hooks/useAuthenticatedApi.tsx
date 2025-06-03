// frontend/src/hooks/useAuthenticatedApi.tsx
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const useAuthenticatedApi = () => {
  const { user } = useAuth();

  const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get current session token
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

  // User profile operations
  const getUserProfile = () => makeAuthenticatedRequest("/api/auth/profile");

  const updateUserProfile = (updates: any) =>
    makeAuthenticatedRequest("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });

  // User item operations
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

  // NEW: Dashboard-specific method to ensure consistency
  const getDashboardData = () => makeAuthenticatedRequest("/api/auth/dashboard");

  return {
    makeAuthenticatedRequest,
    getUserProfile,
    updateUserProfile,
    getUserItems,
    updateUserItemStatus,
    removeUserItem,
    getDashboardData,
  };
};
