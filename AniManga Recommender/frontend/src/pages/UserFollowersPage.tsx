// ABOUTME: User followers page displaying paginated list of users following a specific user
// ABOUTME: Includes search functionality, follow/unfollow buttons, and responsive design

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorFallback from "../components/Error/ErrorFallback";
import { generateAvatarColor } from "../utils/helpers";
import "./UserProfilePage.css";

interface Follower {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_following: boolean;
  is_mutual: boolean;
  followed_at: string;
}

interface FollowersData {
  followers: Follower[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export const UserFollowersPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [followersData, setFollowersData] = useState<FollowersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Redirect if no username provided
  useEffect(() => {
    if (!username) {
      navigate("/");
    }
  }, [username, navigate]);

  const fetchFollowers = async (page: number = 1, reset: boolean = true) => {
    if (!username) return;

    if (reset) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const data = await api.public.getUserFollowers(username, { 
        page, 
        limit: 20 
      }) as FollowersData;
      
      if (reset) {
        setFollowersData(data);
      } else {
        setFollowersData(prev => prev ? {
          ...data,
          followers: [...prev.followers, ...data.followers]
        } : data);
      }
      
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching followers:', err);
      setError(err instanceof Error ? err : new Error("Failed to fetch followers"));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleFollowToggle = async (targetUserId: string, targetUsername: string) => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    try {
      const result = await api.social.toggleFollow(targetUsername);
      
      // Update local state
      setFollowersData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          followers: prev.followers.map(follower => 
            follower.id === targetUserId 
              ? { ...follower, is_following: result.is_following }
              : follower
          )
        };
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const loadMore = () => {
    if (followersData?.has_more && !isLoadingMore) {
      fetchFollowers(currentPage + 1, false);
    }
  };

  useEffect(() => {
    fetchFollowers();
  }, [username]);

  // Early return if no username
  if (!username) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container" style={{ position: "relative", minHeight: "400px" }}>
          <LoadingSpinner message="Loading followers..." />
        </div>
      </div>
    );
  }

  // Handle errors
  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <ErrorFallback error={error} />
        </div>
      </div>
    );
  }

  const filteredFollowers = followersData?.followers?.filter(follower =>
    follower.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    follower.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <header className="profile-header">
          <div className="profile-header-content">
            <div className="profile-info">
              <div className="breadcrumb">
                <Link to={`/users/${username}`} className="breadcrumb-link">
                  @{username}
                </Link>
                <span className="breadcrumb-separator">›</span>
                <span>Followers</span>
              </div>
              <h1 className="profile-name">
                {username}'s Followers
                {followersData && <span className="count-badge">({followersData.total})</span>}
              </h1>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-input-container">
            <svg className="search-icon" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"/>
            </svg>
            <input
              type="text"
              placeholder="Search followers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Followers List */}
        <main className="followers-main-content">
          {filteredFollowers.length === 0 ? (
            <div className="enhanced-empty-state">
              <h3>No Followers Found</h3>
              <p>
                {searchTerm 
                  ? `No followers match "${searchTerm}"`
                  : `@${username} doesn't have any followers yet`
                }
              </p>
            </div>
          ) : (
            <div className="followers-grid">
              {filteredFollowers.map((follower) => (
                <div key={follower.id} className="follower-card">
                  <div className="follower-header">
                    <Link 
                      to={`/users/${follower.username}`}
                      className="follower-avatar-link"
                    >
                      {follower.avatar_url ? (
                        <img
                          src={follower.avatar_url}
                          alt={`${follower.display_name}'s avatar`}
                          className="follower-avatar"
                        />
                      ) : (
                        <div className={`follower-avatar-placeholder ${generateAvatarColor(follower.username)}`}>
                          {follower.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    
                    <div className="follower-info">
                      <Link 
                        to={`/users/${follower.username}`}
                        className="follower-name-link"
                      >
                        <h3 className="follower-name">{follower.display_name}</h3>
                        <p className="follower-username">@{follower.username}</p>
                      </Link>
                    </div>
                  </div>

                  <div className="follower-actions">
                    {follower.is_mutual && (
                      <span className="mutual-badge">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        Mutual
                      </span>
                    )}
                    
                    {user && user.id !== follower.id && (
                      <button
                        onClick={() => handleFollowToggle(follower.id, follower.username)}
                        className={`follow-button ${follower.is_following ? 'following' : 'not-following'}`}
                      >
                        {follower.is_following ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>

                  <div className="follower-meta">
                    <span className="follow-date">
                      Followed {new Date(follower.followed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {followersData?.has_more && !searchTerm && (
            <div className="load-more-section">
              <button 
                onClick={loadMore}
                disabled={isLoadingMore}
                className="load-more-button"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};