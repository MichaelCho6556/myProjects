// ABOUTME: Custom hook for managing user profile data including profile info, stats, and follow relationships
// ABOUTME: Provides centralized state management for all user profile related operations

import { useState, useEffect, useCallback } from "react";
import { UserProfile, UserStats, PrivacySettings, PublicList } from "../types/social";
import { UserActivity } from "../types";
import { useAuthenticatedApi } from "./useAuthenticatedApi";
import { logger } from "../utils/logger";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export function useUserProfile(username: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [publicLists, setPublicLists] = useState<PublicList[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [listsError, setListsError] = useState<Error | null>(null);
  const [activitiesError, setActivitiesError] = useState<Error | null>(null);
  const [statsCacheHit, setStatsCacheHit] = useState<boolean | undefined>();
  const [statsLastUpdated, setStatsLastUpdated] = useState<string | undefined>();
  const [statsUpdating, setStatsUpdating] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timer | null>(null);
  const api = useAuthenticatedApi();

  const fetchProfile = useCallback(async () => {
    if (!username) return;

    setIsLoading(true);
    setListsLoading(true);
    setActivitiesLoading(true);
    setError(null);
    setListsError(null);
    setActivitiesError(null);

    try {
      // Check if user is authenticated to include auth headers for profile auto-creation
      const headers: Record<string, string> = {};
      
      try {
        const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (authError) {
      }

      // Use the new unified endpoint to fetch all data in one request
      const unifiedResponse = await fetch(`${API_BASE_URL}/api/users/${username}/profile-full?activity_limit=20`, {
        headers
      });
      
      if (!unifiedResponse.ok) {
        if (unifiedResponse.status === 404) {
          throw new Error("User not found");
        }
        throw new Error(`HTTP ${unifiedResponse.status}`);
      }
      
      const unifiedData = await unifiedResponse.json();
      
      // Check if cache metadata indicates this is cached data
      if (unifiedData.cache_metadata?.cache_hit) {
        logger.debug("Profile data served from cache", {
          context: "useUserProfile",
          username,
          cached_at: unifiedData.cache_metadata.cached_at
        });
      }
      
      // Extract profile data
      const rawProfile = unifiedData.profile;
      if (!rawProfile) {
        throw new Error("No profile data received");
      }

      // Transform backend response to frontend format
      const transformedProfile: UserProfile = {
        id: rawProfile.id || "",
        username: rawProfile.username || "",
        displayName: rawProfile.display_name || rawProfile.username || "Unknown User",
        joinDate: rawProfile.created_at || new Date().toISOString(),
        avatarUrl: rawProfile.avatar_url || undefined,
        bio: rawProfile.bio || undefined,
        isPrivate: false, // Will be determined by privacy settings
        isCurrentUser: rawProfile.is_self || false,
        isFollowing: rawProfile.is_following || false,
        isFollowedBy: false, // Would need additional API call
        followersCount: rawProfile.follower_count || 0,
        followingCount: rawProfile.following_count || 0,
        isMutualFollow: false, // Would need additional logic
      };

      setProfile(transformedProfile);

      // Extract stats data from unified response
      if (unifiedData.stats) {
        const rawStats = unifiedData.stats;
        
        // Clear cache metadata since we're using unified endpoint
        setStatsCacheHit(unifiedData.cache_metadata?.cache_hit || false);
        setStatsLastUpdated(unifiedData.cache_metadata?.cached_at || undefined);
        setStatsUpdating(false);

        if (rawStats && typeof rawStats === 'object') {
          // Ensure favorite_genres is always an array
          const favoriteGenres = Array.isArray(rawStats.favorite_genres) 
            ? rawStats.favorite_genres 
            : [];
          
          const transformedStats: UserStats = {
            totalAnime:
              (rawStats.total_anime_watched || 0) +
              (rawStats.status_counts?.watching || 0) +
              (rawStats.status_counts?.on_hold || 0) +
              (rawStats.status_counts?.dropped || 0) +
              (rawStats.status_counts?.plan_to_watch || 0),
            completedAnime: rawStats.total_anime_watched || rawStats.status_counts?.completed || 0,
            totalManga:
              (rawStats.total_manga_read || 0) + 
              (rawStats.status_counts?.reading || 0) + 
              (rawStats.status_counts?.plan_to_read || 0),
            completedManga: rawStats.total_manga_read || 0,
            totalHoursWatched: rawStats.total_hours_watched || 0,
            totalChaptersRead: rawStats.total_chapters_read || 0,
            favoriteGenres: favoriteGenres,
            averageRating: rawStats.average_score || 0,
            completionRate: rawStats.completion_rate || 0,
            currentStreak: rawStats.current_streak_days || 0,
            longestStreak: rawStats.longest_streak_days || 0,
            ratingDistribution: rawStats.rating_distribution || undefined,
          };
          
          setStats(transformedStats);
        } else {
          // Set default empty stats if no data returned
          setStats({
            totalAnime: 0,
            completedAnime: 0,
            totalManga: 0,
            completedManga: 0,
            totalHoursWatched: 0,
            totalChaptersRead: 0,
            favoriteGenres: [],
            averageRating: 0,
            completionRate: 0,
            currentStreak: 0,
            longestStreak: 0,
          });
        }
      } else {
        // Set default empty stats on error
        setStats({
          totalAnime: 0,
          completedAnime: 0,
          totalManga: 0,
          completedManga: 0,
          totalHoursWatched: 0,
          totalChaptersRead: 0,
          favoriteGenres: [],
          averageRating: 0,
          completionRate: 0,
          currentStreak: 0,
          longestStreak: 0,
        });
      }

      // Extract lists data from unified response
      if (unifiedData.lists) {
        const rawLists = unifiedData.lists;
        
        if (rawLists && rawLists.lists && Array.isArray(rawLists.lists)) {
          // Validate each list object has required properties
          const validLists = rawLists.lists.filter((list: any) => 
            list && 
            typeof list.id !== 'undefined' && 
            typeof list.title === 'string'
          );
          setPublicLists(validLists);
        } else {
          setPublicLists([]);
        }
      } else {
        setPublicLists([]);
      }
      setListsLoading(false);

      // Extract activities data from unified response
      if (unifiedData.activities) {
        const rawActivities = unifiedData.activities;
        
        if (rawActivities && rawActivities.activities && Array.isArray(rawActivities.activities)) {
          setActivities(rawActivities.activities);
        } else {
          setActivities([]);
        }
      } else {
        setActivities([]);
      }
      setActivitiesLoading(false);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(new Error("User not found"));
      } else {
        setError(err instanceof Error ? err : new Error("Failed to fetch profile"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  const followUser = useCallback(async () => {
    if (!profile) return;

    try {
      const response = await api.post(`/api/auth/follow/${username}`);
      const result = response.data || response;

      if (result && result.success) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: result.is_following,
                followersCount: result.is_following ? prev.followersCount + 1 : prev.followersCount - 1,
              }
            : null
        );
        
        // Refetch profile to ensure server state is in sync
        // This ensures the follow state persists on page refresh
        setTimeout(() => {
          fetchProfile();
        }, 500); // Small delay to allow server to update
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to follow user"));
    }
  }, [profile, username, api, fetchProfile]);

  const updatePrivacySettings = useCallback(
    async (settings: PrivacySettings) => {
      try {
        // Transform frontend format to backend format
        const backendSettings = {
          profile_visibility: settings.profileVisibility.toLowerCase().replace(" ", "_"),
          list_visibility: settings.listVisibility.toLowerCase().replace(" ", "_"),
          activity_visibility: settings.activityVisibility.toLowerCase().replace(" ", "_"),
          show_statistics: settings.showCompletionStats,
        };

        await api.put("/api/auth/privacy-settings", backendSettings);
        // Refresh profile to get updated privacy settings
        await fetchProfile();
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update privacy settings"));
      }
    },
    [api, fetchProfile]
  );

  // Refetch function that can force a refresh
  const refetchStats = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const headers: Record<string, string> = {};
      
      try {
        const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (authError) {
      }

      const url = forceRefresh 
        ? `${API_BASE_URL}/api/analytics/user/${profile?.id}/stats?refresh=true`
        : `${API_BASE_URL}/api/analytics/user/${profile?.id}/stats`;
      
      const statsResponse = await fetch(url, { headers });
      
      if (statsResponse.ok) {
        const response = await statsResponse.json();
        
        if (response && response.stats) {
          const rawStats = response.stats;
          setStatsCacheHit(response.cache_hit || false);
          setStatsLastUpdated(response.last_updated || undefined);
          setStatsUpdating(response.updating || false);
          
          // Transform stats
          const favoriteGenres = Array.isArray(rawStats.favorite_genres) 
            ? rawStats.favorite_genres 
            : [];
          
          const transformedStats: UserStats = {
            totalAnime:
              (rawStats.total_anime_watched || 0) +
              (rawStats.status_counts?.watching || 0) +
              (rawStats.status_counts?.on_hold || 0) +
              (rawStats.status_counts?.dropped || 0) +
              (rawStats.status_counts?.plan_to_watch || 0),
            completedAnime: rawStats.total_anime_watched || rawStats.status_counts?.completed || 0,
            totalManga:
              (rawStats.total_manga_read || 0) + 
              (rawStats.status_counts?.reading || 0) + 
              (rawStats.status_counts?.plan_to_read || 0),
            completedManga: rawStats.total_manga_read || 0,
            totalHoursWatched: rawStats.total_hours_watched || 0,
            totalChaptersRead: rawStats.total_chapters_read || 0,
            favoriteGenres: favoriteGenres,
            averageRating: rawStats.average_score || 0,
            completionRate: rawStats.completion_rate || 0,
            currentStreak: rawStats.current_streak_days || 0,
            longestStreak: rawStats.longest_streak_days || 0,
            ratingDistribution: rawStats.rating_distribution || undefined,
          };
          
          setStats(transformedStats);
          
          // If stats are updating, start polling
          if (response.updating && !pollingInterval) {
            const interval = setInterval(() => {
              refetchStats(false); // Poll without forcing refresh
            }, 3000); // Poll every 3 seconds
            setPollingInterval(interval);
          } else if (!response.updating && pollingInterval) {
            // Stop polling when updating is complete
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      }
    } catch (err: any) {
      logger.error("Error refetching stats", {
        error: err?.message || "Unknown error",
        context: "useUserProfile",
        operation: "refetchStats",
        profileId: profile?.id
      });
    }
  }, [profile?.id, pollingInterval]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Poll when stats are updating
  useEffect(() => {
    if (statsUpdating && profile?.id) {
      refetchStats(false);
    }
  }, [statsUpdating, profile?.id, refetchStats]);

  return {
    profile,
    stats,
    publicLists,
    activities,
    isLoading,
    listsLoading,
    activitiesLoading,
    error,
    listsError,
    activitiesError,
    statsCacheHit,
    statsLastUpdated,
    statsUpdating,
    refetch: () => {
      fetchProfile();
      if (profile?.id) {
        refetchStats(true); // Force refresh when user clicks refresh
      }
    },
    followUser,
    updatePrivacySettings,
  };
}

export function useCurrentUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const api = useAuthenticatedApi();

  const fetchCurrentProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch current user's profile
      const profileResponse = await api.get("/api/auth/profile");
      const rawProfile = profileResponse.data || profileResponse;

      if (!rawProfile) {
        throw new Error("No profile data received from API");
      }

      const transformedProfile: UserProfile = {
        id: rawProfile.id,
        username: rawProfile.username,
        displayName: rawProfile.display_name || rawProfile.username,
        joinDate: rawProfile.created_at,
        avatarUrl: rawProfile.avatar_url,
        bio: rawProfile.bio,
        isPrivate: false,
        isCurrentUser: true,
        isFollowing: false,
        isFollowedBy: false,
        followersCount: rawProfile.follower_count || 0,
        followingCount: rawProfile.following_count || 0,
        isMutualFollow: false,
      };

      setProfile(transformedProfile);

      // Fetch privacy settings
      try {
        const privacyResponse = await api.get("/api/auth/privacy-settings");
        const rawPrivacy = privacyResponse.data || privacyResponse;

        if (rawPrivacy) {
          const transformedPrivacy: PrivacySettings = {
            profileVisibility: capitalizeVisibility(rawPrivacy.profile_visibility || "public"),
            listVisibility: capitalizeVisibility(rawPrivacy.list_visibility || "public"),
            activityVisibility: capitalizeVisibility(rawPrivacy.activity_visibility || "public"),
            showCompletionStats: rawPrivacy.show_statistics !== false,
          };

          setPrivacySettings(transformedPrivacy);
        } else {
          // Use defaults if no settings returned
          setPrivacySettings({
            profileVisibility: "Public",
            listVisibility: "Public",
            activityVisibility: "Public",
            showCompletionStats: true,
          });
        }
      } catch (privacyError) {
        // Set defaults but don't fail the whole component
        setPrivacySettings({
          profileVisibility: "Public",
          listVisibility: "Public",
          activityVisibility: "Public",
          showCompletionStats: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch current profile"));
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Helper function to convert backend format to frontend format
  const capitalizeVisibility = (value: string): "Public" | "Private" | "Friends Only" => {
    switch (value) {
      case "friends_only":
        return "Friends Only";
      case "private":
        return "Private";
      default:
        return "Public";
    }
  };

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        const response = await api.put("/api/auth/profile", updates);
        setProfile(response.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update profile"));
      }
    },
    [api]
  );

  const updatePrivacySettings = useCallback(
    async (settings: PrivacySettings) => {
      try {
        // Transform frontend format to backend format
        const backendSettings = {
          profile_visibility: settings.profileVisibility.toLowerCase().replace(" ", "_"),
          list_visibility: settings.listVisibility.toLowerCase().replace(" ", "_"),
          activity_visibility: settings.activityVisibility.toLowerCase().replace(" ", "_"),
          show_statistics: settings.showCompletionStats,
        };

        await api.put("/api/auth/privacy-settings", backendSettings);
        setPrivacySettings(settings);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update privacy settings"));
      }
    },
    [api]
  );

  useEffect(() => {
    fetchCurrentProfile();
  }, [fetchCurrentProfile]);

  return {
    profile,
    privacySettings,
    isLoading,
    error,
    refetch: fetchCurrentProfile,
    updateProfile,
    updatePrivacySettings,
  };
}

export function useFollowers(username: string) {
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const api = useAuthenticatedApi();

  const fetchFollowData = useCallback(async () => {
    if (!username) return;

    setIsLoading(true);
    setError(null);

    try {
      const [followersResponse, followingResponse] = await Promise.all([
        api.get(`/api/users/${username}/followers`),
        api.get(`/api/users/${username}/following`),
      ]);

      setFollowers(followersResponse.data?.followers || followersResponse.data || []);
      setFollowing(followingResponse.data?.following || followingResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch follow data"));
    } finally {
      setIsLoading(false);
    }
  }, [username, api]);

  useEffect(() => {
    fetchFollowData();
  }, [fetchFollowData]);

  return {
    followers,
    following,
    isLoading,
    error,
    refetch: fetchFollowData,
  };
}
