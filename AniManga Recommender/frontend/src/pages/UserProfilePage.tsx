// ABOUTME: User profile page component displaying public user information, statistics, and follow functionality
// ABOUTME: Handles profile viewing with privacy controls and responsive design for mobile and desktop

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserProfile } from "../hooks/useUserProfile";
import { UserStatsComponent } from "../components/social/UserStatsComponent";
import { FollowButton } from "../components/social/FollowButton";
import LoadingBanner from "../components/Loading/LoadingBanner";
import ErrorFallback from "../components/Error/ErrorFallback";
import { useAuth } from "../context/AuthContext";
import "./UserProfilePage.css";

export const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { profile, stats, publicLists, isLoading, error, followUser } = useUserProfile(username || "");

  // Redirect if no username provided (moved to useEffect to prevent infinite loops)
  useEffect(() => {
    if (!username) {
      navigate("/");
    }
  }, [username, navigate]);

  // Early return if no username (prevent hook calls after redirect)
  if (!username) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <LoadingBanner message="Loading user profile..." isVisible={true} />
        </div>
      </div>
    );
  }

  // Handle errors (including 404)
  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <ErrorFallback error={error} />
        </div>
      </div>
    );
  }

  // Handle user not found or private profile
  if (!profile) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="error-state">
            <div className="error-content">
              <div className="error-icon">👤</div>
              <h2>User Not Found</h2>
              <p>The user "{username}" does not exist or their profile is private.</p>
              <button onClick={() => navigate("/")} className="retry-button">
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if this is the current user's own profile
  // Compare by user ID or multiple username formats
  const isOwnProfile =
    currentUser &&
    profile &&
    (currentUser.id === profile.id ||
      currentUser.user_metadata?.username === username ||
      currentUser.user_metadata?.username === profile.username ||
      currentUser.email?.split("@")[0] === username);

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Profile Header */}
        <header className="profile-header">
          <div className="profile-header-content">
            <div className="profile-avatar">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.displayName}'s avatar`}
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-placeholder">{profile.displayName.charAt(0).toUpperCase()}</div>
              )}
            </div>

            <div className="profile-info">
              <h1 className="profile-name">{profile.displayName}</h1>
              <p className="profile-username">@{profile.username}</p>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}

              <div className="profile-meta">
                <span className="meta-item">
                  <strong>{profile.followersCount}</strong> followers
                </span>
                <span className="meta-item">
                  <strong>{profile.followingCount}</strong> following
                </span>
                <span className="meta-item">Joined {new Date(profile.joinDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="profile-actions">
              {!isOwnProfile && currentUser && (
                <FollowButton
                  isFollowing={profile.isFollowing || false}
                  onToggleFollow={followUser}
                />
              )}
              {isOwnProfile && (
                <button onClick={() => navigate("/settings/privacy")} className="action-button secondary">
                  Edit Profile
                </button>
              )}
              {profile.isMutualFollow && !isOwnProfile && (
                <span className="mutual-follow-badge">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </header>

        {/* User Statistics */}
        {stats && (
          <section className="profile-stats">
            <UserStatsComponent stats={stats} />
          </section>
        )}

        {/* Profile Content */}
        <div className="profile-content">
          {/* Recent Activity and Favorite Genres Row */}
          <div className="content-row">
            {/* Recent Activity Section */}
            <section className="profile-section">
              <div className="section-header">
                <div className="section-title">
                  <h2>Recent Activity</h2>
                </div>
              </div>
              <div className="section-content">
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <h3>Activity Timeline</h3>
                  <p>
                    Track {isOwnProfile ? "your" : `${profile.displayName}'s`} recent anime and manga activity
                  </p>
                  <small>Coming soon - dashboard-style activity feed</small>
                </div>
              </div>
            </section>

            {/* Favorite Genres Section */}
            <section className="profile-section">
              <div className="section-header">
                <div className="section-title">
                  <h2>Favorite Genres</h2>
                </div>
              </div>
              <div className="section-content">
                {stats && stats.favoriteGenres.length > 0 ? (
                  <div className="genres-list">
                    {stats.favoriteGenres.slice(0, 5).map((genre, index) => (
                      <div key={genre} className="genre-item">
                        <span className="genre-rank">#{index + 1}</span>
                        <span className="genre-name">{genre}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🏷️</div>
                    <h3>Genre Preferences</h3>
                    <p>Discover {isOwnProfile ? "your" : `${profile.displayName}'s`} most watched genres</p>
                    <small>No genre data available</small>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Public Lists Section */}
          <section className="profile-section">
            <div className="section-header">
              <div className="section-title">
                <h2>Public Lists</h2>
              </div>
            </div>
            <div className="section-content">
              {publicLists && publicLists.length > 0 ? (
                <div className="lists-container">
                  {publicLists.map((list) => (
                    <div key={list.id} className="list-item-card">
                      <div className="list-header">
                        <h3 className="list-title">{list.title}</h3>
                        <span className="list-item-count">{list.itemCount} items</span>
                      </div>
                      {list.description && (
                        <p className="list-description">{list.description}</p>
                      )}
                      <div className="list-meta">
                        <span className="list-meta-item">
                          Updated {new Date(list.updatedAt).toLocaleDateString()}
                        </span>
                        {list.isCollaborative && (
                          <span className="list-badge collaborative">Collaborative</span>
                        )}
                      </div>
                      <button 
                        onClick={() => navigate(list.url)}
                        className="list-view-button"
                      >
                        View List
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <h3>Custom Lists</h3>
                  <p>View {isOwnProfile ? "your" : `${profile.displayName}'s`} curated collections</p>
                  <small>No public lists available</small>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
