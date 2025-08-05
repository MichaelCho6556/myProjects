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
import { useDashboardQuery, useUpdateUserItemMutation, useOfflineDataStatus } from "../hooks/useApiCache";
import { useColdStart } from "../hooks/useColdStart";
import useDocumentTitle from "../hooks/useDocumentTitle";
import StatisticsCards from "../components/dashboard/StatisticsCards";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import ItemLists from "../components/dashboard/ItemLists";
import QuickActions from "../components/dashboard/QuickActions";
import PersonalizedRecommendations from "../components/dashboard/PersonalizedRecommendations";
import DashboardSkeleton from "../components/Loading/DashboardSkeleton";
import ColdStartLoader from "../components/common/ColdStartLoader";
import ErrorFallback from "../components/Error/ErrorFallback";
import CollapsibleSection from "../components/CollapsibleSection";
import EmptyState from "../components/EmptyState";
import { ListAnalyticsDashboard } from "../components/analytics/ListAnalyticsDashboard";
import CacheStatusIndicator from "../components/dashboard/CacheStatusIndicator";
import "./DashboardPage.css";
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
  
  // Cold start detection
  const { isInColdStart } = useColdStart();
  const { hasAnyData } = useOfflineDataStatus();
  
  // Use React Query for dashboard data
  const { 
    data: dashboardData, 
    isLoading, 
    error: queryError, 
    refetch: refetchDashboard,
    isFetching 
  } = useDashboardQuery();
  
  // Mutations
  const updateUserItemMutation = useUpdateUserItemMutation();
  
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

  /**
   * Refreshes dashboard data using React Query
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
  const refreshDashboard = useCallback(async (): Promise<void> => {
    await refetchDashboard();
  }, [refetchDashboard]);

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
            await refetchDashboard();
          } finally {
            setSectionLoading((prev) => ({ ...prev, [sectionName]: false }));
            resolve();
          }
        }, delay);
      });
    },
    [sectionLoading, refetchDashboard]
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
  const handleStatusUpdate = useCallback(async (
    itemUid: string,
    newStatus: string,
    additionalData?: any
  ): Promise<void> => {
    try {
      const updateData = {
        status: newStatus,
        ...additionalData,
      };

      await updateUserItemMutation.mutateAsync({
        itemUid,
        data: updateData,
      });

      // React Query will automatically invalidate and refetch
      // No need to manually refresh dashboard
    } catch (err: any) {
      logger.error("Status update error", {
        error: err?.message || "Unknown error",
        context: "DashboardPage",
        operation: "handleStatusUpdate",
        userId: user?.id,
        itemUid: itemUid,
        newStatus: newStatus
      });
      // Error is handled by the mutation hook
    }
  }, [updateUserItemMutation, user?.id]);

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

  // Render cold start loader if backend is starting up
  if (isInColdStart && isLoading) {
    return (
      <div className="dashboard-page">
        <ColdStartLoader 
          isVisible={true}
          hasCachedData={hasAnyData}
          onBrowseOffline={() => {
            // Force React Query to use cached data
            window.location.reload();
          }}
        />
      </div>
    );
  }
  
  // Render normal loading state with skeleton
  if (isLoading) {
    return (
      <div className="dashboard-page">
        <DashboardSkeleton />
      </div>
    );
  }

  // Render error state with retry functionality
  if (queryError) {
    return (
      <div className="dashboard-page">
        <ErrorFallback 
          error={queryError instanceof Error ? queryError : new Error(String(queryError))} 
          onRetry={() => refetchDashboard()} 
          showDetails={true} 
        />
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
              updating={dashboardData.updating || isFetching}
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
                onItemDeleted={refetchDashboard}
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
              <PersonalizedRecommendations onRefresh={refetchDashboard} />
            </CollapsibleSection>

            <CollapsibleSection
              id="quick-actions"
              title="Quick Actions"
              icon="⚡"
              showRefreshButton={true}
              onRefresh={refreshQuickActions}
              isLoading={sectionLoading.quickActions}
            >
              <QuickActions onRefresh={refetchDashboard} />
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
