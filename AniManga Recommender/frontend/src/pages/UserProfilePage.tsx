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
import ActivityFeed from "../components/dashboard/ActivityFeed";
import CacheStatusIndicator from "../components/dashboard/CacheStatusIndicator";
import "./UserProfilePage.css";

export const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { 
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
    refetch,
    followUser 
  } = useUserProfile(username || "");

  // Debug logging
  React.useEffect(() => {
    console.log('🎯 UserProfilePage Debug:', {
      username,
      activitiesLoading,
      activitiesError,
      activitiesCount: activities?.length || 0,
      activities: activities
    });
  }, [username, activities, activitiesLoading, activitiesError]);

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
              <div className="error-icon"></div>
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

        {/* New Profile Body Layout */}
        <div className="profile-body">
          {/* Main Content Column */}
          <main className="profile-main-content">
            {/* Recent Activity Section */}
            <section className="profile-section">
              <div className="section-header">
                <div className="section-title">
                  <h2>Recent Activity</h2>
                </div>
              </div>
              <div className="section-content">
                {activitiesLoading ? (
                  <div className="activity-loading-skeleton">
                    <div className="skeleton-activity-item">
                      <div className="skeleton-line" style={{ width: '70%' }}></div>
                      <div className="skeleton-line" style={{ width: '40%' }}></div>
                    </div>
                    <div className="skeleton-activity-item">
                      <div className="skeleton-line" style={{ width: '60%' }}></div>
                      <div className="skeleton-line" style={{ width: '50%' }}></div>
                    </div>
                    <div className="skeleton-activity-item">
                      <div className="skeleton-line" style={{ width: '80%' }}></div>
                      <div className="skeleton-line" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                ) : activitiesError ? (
                  <div className="enhanced-empty-state error-state">
                    <h3>Activity Unavailable</h3>
                    <p>Unable to load recent activity data. This might be due to privacy settings or a temporary issue.</p>
                    <small className="error-message">{activitiesError.message}</small>
                  </div>
                ) : activities && activities.length > 0 ? (
                  <ActivityFeed activities={activities} />
                ) : (
                  <div className="enhanced-empty-state">
                    <h3>Activity Timeline</h3>
                    <p>
                      Track {isOwnProfile ? "your" : `${profile.displayName}'s`} recent anime and manga activity
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Custom Lists Section */}
            <section className="profile-section">
              <div className="section-header">
                <div className="section-title">
                  <h2>Custom Lists</h2>
                  {publicLists && publicLists.length > 0 && (
                    <span className="section-count">{publicLists.length}</span>
                  )}
                </div>
              </div>
              <div className="section-content">
                {listsLoading ? (
                  <div className="lists-loading-skeleton">
                    <div className="skeleton-list-card">
                      <div className="skeleton-card-header">
                        <div className="skeleton-line title" style={{ width: '70%' }}></div>
                        <div className="skeleton-line" style={{ width: '30%' }}></div>
                      </div>
                      <div className="skeleton-line description" style={{ width: '90%' }}></div>
                      <div className="skeleton-line meta" style={{ width: '50%' }}></div>
                    </div>
                    <div className="skeleton-list-card">
                      <div className="skeleton-card-header">
                        <div className="skeleton-line title" style={{ width: '60%' }}></div>
                        <div className="skeleton-line" style={{ width: '25%' }}></div>
                      </div>
                      <div className="skeleton-line description" style={{ width: '85%' }}></div>
                      <div className="skeleton-line meta" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                ) : listsError ? (
                  <div className="error-state">
                    <div className="error-icon"></div>
                    <h3>Lists Unavailable</h3>
                    <p>Unable to load custom lists. This might be due to privacy settings or a temporary issue.</p>
                    <small className="error-message">{listsError.message}</small>
                  </div>
                ) : publicLists && publicLists.length > 0 ? (
                  <div className="enhanced-lists-container">
                    {publicLists.map((list) => (
                      <div key={list.id} className="enhanced-list-card">
                        <div className="list-card-header">
                          <div className="list-primary-info">
                            <h3 className="list-title">{list.title}</h3>
                            <div className="list-privacy-indicators">
                              {!list.isPublic && profile?.isFollowing && (
                                <span className="privacy-badge friends-only">
                                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                  </svg>
                                  Friends Only
                                </span>
                              )}
                              {list.isCollaborative && (
                                <span className="privacy-badge collaborative">
                                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                                  </svg>
                                  Collaborative
                                </span>
                              )}
                              {list.isPublic && (
                                <span className="privacy-badge public">
                                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                  </svg>
                                  Public
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="list-stats">
                            <div className="stat-item">
                              <span className="stat-number">{list.itemCount || 0}</span>
                              <span className="stat-label">Items</span>
                            </div>
                          </div>
                        </div>
                        
                        {list.description && (
                          <p className="list-description">{list.description}</p>
                        )}
                        
                        <div className="list-footer">
                          <div className="list-meta">
                            <span className="list-meta-item">
                              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.08 5.74-.08 5.74s-5.58-.02-7.13-.15c-.12-.01-.02-3.77-.02-5.64-.01-2.21.61-3.24.61-3.24s1.25-.86 3.01-.86 2.92.86 2.92.86.76 1.04.69 3.29z"/>
                              </svg>
                              Updated {new Date(list.updatedAt).toLocaleDateString()}
                            </span>
                            <span className="list-meta-item">
                              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
                              </svg>
                              Created {new Date(list.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <button 
                            onClick={() => navigate(list.url)}
                            className="enhanced-view-button"
                          >
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.08 5.74-.08 5.74s-5.58-.02-7.13-.15c-.12-.01-.02-3.77-.02-5.64-.01-2.21.61-3.24.61-3.24s1.25-.86 3.01-.86 2.92.86 2.92.86.76 1.04.69 3.29z"/>
                            </svg>
                            View List
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="enhanced-empty-state">
                    <h3>No Lists Yet</h3>
                    <p>
                      {isOwnProfile 
                        ? "Create your first custom list to organize your favorite anime and manga"
                        : `${profile.displayName} hasn't created any ${profile.isFollowing && !isOwnProfile ? 'visible' : 'public'} lists yet`
                      }
                    </p>
                    {isOwnProfile && (
                      <button 
                        onClick={() => navigate('/lists/create')}
                        className="create-list-button"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        Create Your First List
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </main>

          {/* Sidebar Column */}
          <aside className="profile-sidebar">
            {/* User Statistics Section */}
            {stats && (
              <section className="profile-section">
                <div className="section-header">
                  <div className="section-title">
                    <h2>Statistics</h2>
                  </div>
                  <CacheStatusIndicator
                    cacheHit={statsCacheHit}
                    lastUpdated={statsLastUpdated}
                    updating={statsUpdating}
                    onRefresh={refetch}
                  />
                </div>
                <div className="section-content">
                  <UserStatsComponent 
                    stats={stats} 
                    isLoading={statsUpdating}
                    showAnimations={!statsCacheHit}
                  />
                </div>
              </section>
            )}

            {/* Favorite Genres Section */}
            <section className="profile-section">
              <div className="section-header">
                <div className="section-title">
                  <h2>Favorite Genres</h2>
                </div>
              </div>
              <div className="section-content">
                {stats && stats.favoriteGenres.length > 0 ? (
                  <div className="genres-pills-container">
                    {stats.favoriteGenres.slice(0, 8).map((genre) => (
                      <span key={genre} className="genre-pill">
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="enhanced-empty-state">
                    <h3>Genre Preferences</h3>
                    <p>Discover {isOwnProfile ? "your" : `${profile.displayName}'s`} most watched genres</p>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};
