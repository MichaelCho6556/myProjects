// ABOUTME: User profile page component displaying public user information, statistics, and follow functionality
// ABOUTME: Handles profile viewing with privacy controls and responsive design for mobile and desktop

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserProfile } from "../hooks/useUserProfile";
import { UserStatsComponent } from "../components/social/UserStatsComponent";
import { FollowButton } from "../components/social/FollowButton";
import LoadingBanner from "../components/Loading/LoadingBanner";
import ErrorFallback from "../components/Error/ErrorFallback";
import { useAuth } from "../context/AuthContext";

export const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { profile, stats, isLoading, error, followUser } = useUserProfile(username || "");

  // Redirect if no username provided
  if (!username) {
    navigate("/");
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingBanner message="Loading user profile..." isVisible={true} />
        </div>
      </div>
    );
  }

  // Handle errors (including 404)
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorFallback error={error} />
        </div>
      </div>
    );
  }

  // Handle user not found or private profile
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-6">
                <svg className="mx-auto w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">User Not Found</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The user "{username}" does not exist or their profile is private.
              </p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if this is the current user's own profile
  const isOwnProfile = currentUser && currentUser.user_metadata?.username === username;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.displayName}'s avatar`}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{profile.displayName}</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-2">@{profile.username}</p>
              {profile.bio && <p className="text-gray-700 dark:text-gray-300 mb-4">{profile.bio}</p>}

              {/* Follow Stats */}
              <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  <strong className="text-gray-900 dark:text-white">{profile.followersCount}</strong>{" "}
                  followers
                </span>
                <span>
                  <strong className="text-gray-900 dark:text-white">{profile.followingCount}</strong>{" "}
                  following
                </span>
                <span>Joined {new Date(profile.joinDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {!isOwnProfile && currentUser && (
                <FollowButton
                  username={profile.username}
                  isFollowing={profile.isFollowing || false}
                  onToggleFollow={followUser}
                />
              )}
              {isOwnProfile && (
                <button
                  onClick={() => navigate("/settings/privacy")}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Edit Privacy Settings
                </button>
              )}
              {profile.isMutualFollow && !isOwnProfile && (
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Friends
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Statistics */}
        {stats && (
          <div className="mb-8">
            <UserStatsComponent stats={stats} showPrivateStats={isOwnProfile || !profile.isPrivate} />
          </div>
        )}

        {/* Additional Sections Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>Activity feed coming soon...</p>
            </div>
          </div>

          {/* Public Lists */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Public Lists</h2>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2"
                />
              </svg>
              <p>Custom lists coming soon...</p>
            </div>
          </div>
        </div>

        {/* Additional sections will be added here */}
        {/* - User's public lists */}
        {/* - Recent activity */}
        {/* - Favorite genres visualization */}
      </div>
    </div>
  );
};
