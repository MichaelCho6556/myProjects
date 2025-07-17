/**
 * Dashboard page component that displays comprehensive user statistics and activity.
 *
 * This component serves as the main user dashboard for the AniManga Recommender,
 * providing a complete overview of the user's anime and manga activity, progress,
 * and personalized statistics. It implements real-time data loading, error handling,
 * and responsive design patterns.
 *
 * Key Features:
 * - User statistics cards with anime/manga metrics
 * - Recent activity feed with timeline
 * - User item lists organized by status (watching, completed, etc.)
 * - Quick action shortcuts for common tasks
 * - Real-time data synchronization across browser tabs
 * - Professional loading states and error boundaries
 *
 * Data Sources:
 * - User statistics from backend analytics
 * - Recent activity from user action logs
 * - Item lists from user's personal collections
 * - Quick statistics for dashboard widgets
 *
 * Authentication:
 * - Requires authenticated user session
 * - Redirects to sign-in if user not authenticated
 * - Uses Supabase authentication context
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage - automatically fetches data for authenticated user
 * <DashboardPage />
 *
 * // Component handles all authentication checks and data loading internally
 * // No props required as it uses authentication context
 * ```
 *
 * @see {@link StatisticsCards} for user statistics display
 * @see {@link ActivityFeed} for recent activity timeline
 * @see {@link ItemLists} for user's anime/manga collections
 * @see {@link QuickActions} for dashboard action shortcuts
 * @see {@link DashboardData} for complete data interface
 *
 * @since 1.0.0
 * @author Michael Cho
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { DashboardData } from "../types";
import useDocumentTitle from "../hooks/useDocumentTitle";
import StatisticsCards from "../components/dashboard/StatisticsCards";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import ItemLists from "../components/dashboard/ItemLists";
import QuickActions from "../components/dashboard/QuickActions";
import PersonalizedRecommendations from "../components/dashboard/PersonalizedRecommendations";
import DashboardSkeleton from "../components/Loading/DashboardSkeleton";
import ErrorFallback from "../components/Error/ErrorFallback";
import CollapsibleSection from "../components/CollapsibleSection";
import EmptyState from "../components/EmptyState";
import { ListAnalyticsDashboard } from "../components/analytics/ListAnalyticsDashboard";
import CacheStatusIndicator from "../components/dashboard/CacheStatusIndicator";
import "./DashboardPage.css";
import { supabase } from "../lib/supabase";
import { logger } from "../utils/logger";

/**
 * Dashboard page component interface.
 *
 * Currently, this component doesn't accept any props as it manages
 * all state internally and relies on authentication context.
 *
 * @interface DashboardPageProps
 */
interface DashboardPageProps {
  // No props currently - component is self-contained
}

/**
 * Main dashboard page component implementation.
 *
 * Manages dashboard data loading, error states, and real-time synchronization
 * across browser tabs. Implements comprehensive error boundaries and loading
 * states for optimal user experience.
 *
 * @param props - Component props (currently empty)
 * @returns JSX.Element representing the complete dashboard interface
 */
const DashboardPage: React.FC<DashboardPageProps> = () => {
  const { user } = useAuth();
  const { makeAuthenticatedRequest } = useAuthenticatedApi();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionLoading, setSectionLoading] = useState({
    recommendations: false,
    itemLists: false,
    quickActions: false,
    activityFeed: false,
  });

  // Debounce timer refs for section refreshes
  const refreshTimers = useRef<{
    recommendations?: NodeJS.Timeout;
    itemLists?: NodeJS.Timeout;
    quickActions?: NodeJS.Timeout;
    activityFeed?: NodeJS.Timeout;
  }>({});

  useDocumentTitle("Dashboard");

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  /**
   * Fetches comprehensive dashboard data from the backend API.
   *
   * This function handles the complete data loading process including:
   * - Session validation and token refresh
   * - API request with proper authentication
   * - Error handling and user feedback
   * - Data validation and state updates
   *
   * @async
   * @function fetchDashboardData
   * @returns {Promise<void>} Promise that resolves when data is loaded
   *
   * @throws {Error} When session is invalid or API request fails
   *
   * @example
   * ```typescript
   * // Called automatically on component mount and user changes
   * await fetchDashboardData();
   * ```
   */
  const fetchDashboardData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Get current session and token properly
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        logger.error("No valid session found", {
          error: sessionError?.message || "Session not found",
          context: "DashboardPage",
          operation: "fetchDashboardData",
          userId: user?.id
        });
        setError("Authentication required. Please sign in again.");
        return;
      }

      console.log("🚀 Making dashboard request...");

      // ✅ FIXED: Use the dedicated getDashboardData method OR makeAuthenticatedRequest correctly
      const response = await makeAuthenticatedRequest("/api/auth/dashboard");

      console.log("📊 Dashboard API Response:", response);

      // ✅ FIXED: The response IS the dashboard data (not wrapped in .data)
      if (response && typeof response === "object") {
        console.log("✅ Setting dashboard data:", response);
        setDashboardData(response);
      } else {
        console.warn("⚠️ Invalid dashboard data format:", response);
        setError("Invalid dashboard data format received");
      }
    } catch (error: any) {
      logger.error("Error fetching dashboard data", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "DashboardPage",
        operation: "fetchDashboardData",
        userId: user?.id,
        errorCode: error?.code || error?.response?.status
      });
      setError(`Failed to load dashboard: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refreshes dashboard data and provides user feedback.
   *
   * This function is called when users perform actions that might
   * affect dashboard data or when manual refresh is requested.
   *
   * @async
   * @function refreshDashboard
   * @returns {Promise<void>} Promise that resolves when refresh is complete
   *
   * @example
   * ```typescript
   * // Called by QuickActions component or after user actions
   * await refreshDashboard();
   * ```
   */
  const refreshDashboard = async (): Promise<void> => {
    console.log("🔄 Refreshing dashboard data...");
    await fetchDashboardData();
  };

  /**
   * Helper function for debounced section refresh to prevent rapid API calls
   */
  const debouncedSectionRefresh = useCallback(
    (sectionName: keyof typeof sectionLoading, delay: number = 1000) => {
      // Clear existing timer for this section
      if (refreshTimers.current[sectionName]) {
        clearTimeout(refreshTimers.current[sectionName]);
      }

      // Check if section is already loading
      if (sectionLoading[sectionName]) {
        return Promise.resolve();
      }

      setSectionLoading((prev) => ({ ...prev, [sectionName]: true }));

      return new Promise<void>((resolve) => {
        refreshTimers.current[sectionName] = setTimeout(async () => {
          try {
            await fetchDashboardData();
          } finally {
            setSectionLoading((prev) => ({ ...prev, [sectionName]: false }));
            resolve();
          }
        }, delay);
      });
    },
    [sectionLoading]
  );

  /**
   * Section-specific refresh functions for individual loading states
   */
  const refreshRecommendations = useCallback(async (): Promise<void> => {
    await debouncedSectionRefresh("recommendations", 500);
  }, [debouncedSectionRefresh]);

  const refreshItemLists = useCallback(async (): Promise<void> => {
    await debouncedSectionRefresh("itemLists", 500);
  }, [debouncedSectionRefresh]);

  const refreshQuickActions = useCallback(async (): Promise<void> => {
    await debouncedSectionRefresh("quickActions", 500);
  }, [debouncedSectionRefresh]);

  const refreshActivityFeed = useCallback(async (): Promise<void> => {
    await debouncedSectionRefresh("activityFeed", 500);
  }, [debouncedSectionRefresh]);

  // Set up cross-tab synchronization for real-time updates
  useEffect(() => {
    /**
     * Handles storage events for cross-tab data synchronization.
     *
     * Listens for localStorage changes indicating that another tab
     * has updated user data, triggering a dashboard refresh.
     *
     * @param e - Storage event from localStorage changes
     */
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "animanga_list_updated") {
        console.log("📱 Detected list update, refreshing dashboard...");
        refreshDashboard();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(refreshTimers.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  /**
   * Handles item status updates from child components.
   *
   * This function processes status changes from ItemLists component,
   * updates the backend, and refreshes dashboard data to reflect changes.
   *
   * @async
   * @function handleStatusUpdate
   * @param itemUid - Unique identifier of the item to update
   * @param newStatus - New status to set (watching, completed, etc.)
   * @param additionalData - Optional additional data for the update
   * @returns {Promise<void>} Promise that resolves when update is complete
   *
   * @example
   * ```typescript
   * // Called by ItemLists component when user changes item status
   * await handleStatusUpdate("anime_123", "completed", { rating: 9 });
   * ```
   */
  const handleStatusUpdate = async (
    itemUid: string,
    newStatus: string,
    additionalData?: any
  ): Promise<void> => {
    try {
      const updateData = {
        status: newStatus,
        ...additionalData,
      };

      await makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
        method: "POST",
        body: JSON.stringify(updateData),
      });

      await fetchDashboardData();
    } catch (err: any) {
      logger.error("Status update error", {
        error: err?.message || "Unknown error",
        context: "DashboardPage",
        operation: "handleStatusUpdate",
        userId: user?.id,
        itemUid: itemUid,
        newStatus: newStatus
      });
      setError("Failed to update item status");
    }
  };

  // Render authentication required state
  if (!user) {
    return (
      <div className="dashboard-page">
        <EmptyState
          type="new-user"
          title="Welcome to AniManga Recommender!"
          description="Sign in to track your anime and manga progress, get personalized recommendations, and connect with the community."
          actionButton={{
            text: "Sign In",
            onClick: () => {
              // This would typically open the auth modal
              window.location.href = "/auth";
            },
            variant: "primary",
          }}
          secondaryAction={{
            text: "Browse without signing in",
            href: "/",
          }}
        />
      </div>
    );
  }

  // Render loading state with skeleton
  if (loading) {
    return (
      <div className="dashboard-page">
        <DashboardSkeleton />
      </div>
    );
  }

  // Render error state with retry functionality
  if (error) {
    return (
      <div className="dashboard-page">
        <ErrorFallback error={new Error(error)} onRetry={fetchDashboardData} showDetails={true} />
      </div>
    );
  }

  // Render empty state for new users
  if (!dashboardData) {
    return (
      <div className="dashboard-page">
        <EmptyState
          type="new-user"
          title="Welcome to Your Dashboard!"
          description="Start building your anime and manga collection to unlock detailed statistics, personalized recommendations, and activity tracking."
          actionButton={{
            text: "Browse Anime & Manga",
            href: "/",
            variant: "primary",
          }}
          secondaryAction={{
            text: "Learn How to Get Started",
            href: "/help/getting-started",
          }}
        />
      </div>
    );
  }

  // Render main dashboard interface
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div>
              <h1>Welcome back, {user.user_metadata?.display_name || "User"}!</h1>
              <p>Here's your anime and manga activity overview</p>
            </div>
            <CacheStatusIndicator
              cacheHit={dashboardData.cache_hit}
              lastUpdated={dashboardData.last_updated}
              updating={dashboardData.updating}
              onRefresh={refreshDashboard}
            />
          </div>
        </header>

        <StatisticsCards userStats={dashboardData.user_stats} quickStats={dashboardData.quick_stats} />

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <CollapsibleSection
              id="item-lists"
              title="Your Lists"
              icon="📋"
              showRefreshButton={true}
              onRefresh={refreshItemLists}
              isLoading={sectionLoading.itemLists}
            >
              <ItemLists
                inProgress={dashboardData.in_progress}
                planToWatch={dashboardData.plan_to_watch}
                onHold={dashboardData.on_hold}
                completedRecently={dashboardData.completed_recently}
                onStatusUpdate={handleStatusUpdate}
                onItemDeleted={fetchDashboardData}
              />
            </CollapsibleSection>

            <CollapsibleSection
              id="recommendations"
              title="Personalized Recommendations"
              icon="🎯"
              showRefreshButton={true}
              onRefresh={refreshRecommendations}
              isLoading={sectionLoading.recommendations}
            >
              <PersonalizedRecommendations onRefresh={fetchDashboardData} />
            </CollapsibleSection>

            <CollapsibleSection
              id="quick-actions"
              title="Quick Actions"
              icon="⚡"
              showRefreshButton={true}
              onRefresh={refreshQuickActions}
              isLoading={sectionLoading.quickActions}
            >
              <QuickActions onRefresh={fetchDashboardData} />
            </CollapsibleSection>

            <CollapsibleSection
              id="analytics"
              title="Analytics Dashboard"
              icon="📊"
              showRefreshButton={false}
            >
              <ListAnalyticsDashboard />
            </CollapsibleSection>
          </div>

          <div className="dashboard-sidebar">
            <CollapsibleSection
              id="activity-feed"
              title="Recent Activity"
              icon="🕒"
              showRefreshButton={true}
              onRefresh={refreshActivityFeed}
              isLoading={sectionLoading.activityFeed}
            >
              <ActivityFeed activities={dashboardData.recent_activity} />
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
