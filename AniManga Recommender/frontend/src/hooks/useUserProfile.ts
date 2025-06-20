// ABOUTME: Custom hook for managing user profile data including profile info, stats, and follow relationships
// ABOUTME: Provides centralized state management for all user profile related operations

import { useState, useEffect, useCallback } from "react";
import { UserProfile, UserStats, PrivacySettings } from "../types/social";
import { useAuthenticatedApi } from "./useAuthenticatedApi";

export function useUserProfile(username: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const api = useAuthenticatedApi();

  const fetchProfile = useCallback(async () => {
    if (!username) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile data - the API returns the profile data directly
      const rawProfile = await api.get(`/api/users/${username}/profile`);

      // Transform backend response to frontend format
      const transformedProfile: UserProfile = {
        id: rawProfile.id || '',
        username: rawProfile.username || '',
        displayName: rawProfile.display_name || rawProfile.username || 'Unknown User',
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

      // Fetch stats data if available
      try {
        const statsResponse = await api.get(`/api/users/${username}/stats`);
        const rawStats = statsResponse.data;

        if (rawStats) {
          const transformedStats: UserStats = {
            totalAnime:
              (rawStats.total_anime_watched || 0) +
              (rawStats.watching || 0) +
              (rawStats.on_hold || 0) +
              (rawStats.dropped || 0) +
              (rawStats.plan_to_watch || 0),
            completedAnime: rawStats.total_anime_watched || 0,
            totalManga:
              (rawStats.total_manga_read || 0) + (rawStats.reading || 0) + (rawStats.plan_to_read || 0),
            completedManga: rawStats.total_manga_read || 0,
            totalHoursWatched: rawStats.total_hours_watched || 0,
            totalChaptersRead: rawStats.total_chapters_read || 0,
            favoriteGenres: rawStats.favorite_genres || [],
            averageRating: rawStats.average_score || 0,
            completionRate: rawStats.completion_rate || 0,
            currentStreak: rawStats.current_streak_days || 0,
            longestStreak: rawStats.longest_streak_days || 0,
          };

          setStats(transformedStats);
        }
      } catch (statsError) {
        // Stats might not be available due to privacy settings
        setStats(null);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(new Error("User not found"));
      } else {
        setError(err instanceof Error ? err : new Error("Failed to fetch profile"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [username, api]);

  const followUser = useCallback(async () => {
    if (!profile) return;

    try {
      const response = await api.post(`/api/auth/follow/${username}`);
      const result = response.data;

      if (result.success) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: result.is_following,
                followersCount: result.is_following ? prev.followersCount + 1 : prev.followersCount - 1,
              }
            : null
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to follow user"));
    }
  }, [profile, username, api]);

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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    stats,
    isLoading,
    error,
    refetch: fetchProfile,
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
      const rawProfile = profileResponse.data;

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

      // Fetch privacy settings - note: backend might not have this endpoint yet
      try {
        const privacyResponse = await api.get("/api/auth/privacy-settings");
        const rawPrivacy = privacyResponse.data;

        if (rawPrivacy) {
          const transformedPrivacy: PrivacySettings = {
            profileVisibility: capitalizeVisibility(rawPrivacy.profile_visibility || "public"),
            listVisibility: capitalizeVisibility(rawPrivacy.list_visibility || "public"),
            activityVisibility: capitalizeVisibility(rawPrivacy.activity_visibility || "public"),
            showCompletionStats: rawPrivacy.show_statistics !== false,
          };

          setPrivacySettings(transformedPrivacy);
        }
      } catch (privacyError) {
        // Privacy settings endpoint might not exist yet, set defaults
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
        await api.put("/api/auth/privacy-settings", settings);
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

      setFollowers(followersResponse.data);
      setFollowing(followingResponse.data);
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
