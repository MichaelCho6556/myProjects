// ABOUTME: User profile page component displaying public user information, statistics, and follow functionality
// ABOUTME: Handles profile viewing with privacy controls and responsive design for mobile and desktop

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserProfile } from "../hooks/useUserProfile";
import { UserStatsComponent } from "../components/social/UserStatsComponent";
import { FollowButton } from "../components/social/FollowButton";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorFallback from "../components/Error/ErrorFallback";
import { useAuth } from "../context/AuthContext";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import CacheStatusIndicator from "../components/dashboard/CacheStatusIndicator";

import "./UserProfilePage.css";

// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url: string) => {
  if (!url) return '';
  
  // Decode URL to catch encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }
  
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // Dangerous schemes to block
  const dangerousSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:',
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return 'about:blank';
    }
  }
  
  // Additional check for encoded attempts
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return 'about:blank';
  }
  
  return url;
};

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
        <div className="dashboard-container" style={{ position: "relative", minHeight: "400px" }}>
          <LoadingSpinner message="Loading user profile..." />
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
                  src={sanitizeUrl(profile.avatarUrl)}
                  alt={`${profile.displayName}'s avatar`}
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-placeholder">{profile.displayName.charAt(0).toUpperCase()}</div>
              )}
            </div>

            <div className="profile-info">
              <h1 className="profile-name">{profile.displayName}</h1>
              <p className="profile-member-since">Member since {new Date(profile.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              
              <div className="profile-social-stats">
                <button 
                  className="social-stat-item" 
                  onClick={() => navigate(`/users/${username}/followers`)}
                  title={`View ${profile.displayName}'s followers`}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  <span>{profile.followersCount} Followers</span>
                </button>
                
                <button 
                  className="social-stat-item"
                  onClick={() => navigate(`/users/${username}/following`)}
                  title={`View who ${profile.displayName} is following`}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                    <path d="M6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                  <span>{profile.followingCount} Following</span>
                </button>
                
                {stats && (
                  <div className="social-stat-item stat-display">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                    </svg>
                    <span>{stats.completionRate}% Completion Rate</span>
                  </div>
                )}
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
                <button onClick={() => navigate("/settings/privacy")} className="edit-profile-button">
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

        {/* Three-Column Grid Layout */}
        <div className="profile-body">
          {/* Left Sidebar - Statistics & Favorite Genres */}
          <aside className="profile-left-sidebar">
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

          </aside>

          {/* Main Content Column - Activity & Lists */}
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
                    {[...Array(5)].map((_, index) => (
                      <div key={index} className="skeleton-activity-item">
                        <div className="skeleton-line" style={{ width: '70%' }}></div>
                        <div className="skeleton-line" style={{ width: '40%' }}></div>
                      </div>
                    ))}
                  </div>
                ) : activitiesError ? (
                  <div className="enhanced-empty-state error-state">
                    <h3>Activity Unavailable</h3>
                    <p>Unable to load recent activity data. This might be due to privacy settings or a temporary issue.</p>
                    <small className="error-message">{activitiesError.message}</small>
                  </div>
                ) : activities && activities.length > 0 ? (
                  <div className="recent-activity-container">
                    <ActivityFeed activities={activities.slice(0, 12)} />
                    {activities.length > 12 && (
                      <button className="load-more-btn">
                        Load More Activity
                      </button>
                    )}
                  </div>
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
                  <div className="custom-lists-container">
                    {publicLists.map((list) => (
                      <div key={list.id} className="list-card">
                        {/* Header Row: Icon, Name, Privacy, Count, Actions */}
                        <div className="list-header-row">
                          <div className="list-title-section">
                            <svg className="list-icon" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                            </svg>
                            <h3 className="list-name">{list.title}</h3>
                          </div>
                          
                          <div className="list-badges-section">
                            {list.privacy === 'public' ? (
                              <span className="privacy-badge public">PUBLIC</span>
                            ) : list.privacy === 'friends_only' ? (
                              <span className="privacy-badge friends-only">FRIENDS ONLY</span>
                            ) : (
                              <span className="privacy-badge private">PRIVATE</span>
                            )}
                            {list.isCollaborative && (
                              <span className="privacy-badge collaborative">COLLAB</span>
                            )}
                          </div>
                          
                          <div className="list-actions-section">
                            <span className="item-count">{list.itemCount || 0} ITEMS</span>
                            <button 
                              onClick={() => navigate(list.url)}
                              className="view-list-btn"
                              aria-label={`View ${list.title} list`}
                            >
                              View
                            </button>
                            <button 
                              className="menu-btn"
                              aria-label={`More options for ${list.title}`}
                            >
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Description Row */}
                        {list.description && (
                          <div className="list-description">
                            {list.description}
                          </div>
                        )}
                        
                        {/* Metadata Row */}
                        <div className="list-metadata">
                          Updated {new Date(list.updatedAt).toLocaleDateString()} • Created {new Date(list.createdAt).toLocaleDateString()}
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

          {/* Right Sidebar - Additional Info & Quick Actions */}
          <aside className="profile-right-sidebar">
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

            {/* Quick Actions */}
            <section className="profile-section">
              <div className="section-header">
                <div className="section-title">
                  <h2>Quick Links</h2>
                </div>
              </div>
              <div className="section-content">
                <div className="quick-links">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="quick-link-btn"
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                    </svg>
                    Dashboard
                  </button>
                  <button 
                    onClick={() => navigate('/lists')}
                    className="quick-link-btn"
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                    </svg>
                    My Lists
                  </button>
                  {isOwnProfile && (
                    <button 
                      onClick={() => navigate('/settings/privacy')}
                      className="quick-link-btn"
                    >
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Settings
                    </button>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};
