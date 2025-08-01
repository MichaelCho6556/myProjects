// ABOUTME: User following page displaying paginated list of users that a specific user is following
// ABOUTME: Includes search functionality, follow/unfollow buttons, and responsive design

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorFallback from "../components/Error/ErrorFallback";
import { generateAvatarColor } from "../utils/helpers";
import "./UserProfilePage.css";

interface Following {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_following: boolean;
  is_mutual: boolean;
  followed_at: string;
}

interface FollowingData {
  following: Following[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const UserFollowingPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [followingData, setFollowingData] = useState<FollowingData | null>(null);
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

  const fetchFollowing = async (page: number = 1, reset: boolean = true) => {
    if (!username) return;

    if (reset) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const headers: Record<string, string> = {};
      
      // Add auth header if user is logged in
      try {
        const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (authError) {
      }

      const response = await fetch(`${API_BASE_URL}/api/users/${username}/following?page=${page}&limit=20`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("User not found");
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data: FollowingData = await response.json();
      
      if (reset) {
        setFollowingData(data);
      } else {
        setFollowingData(prev => prev ? {
          ...data,
          following: [...prev.following, ...data.following]
        } : data);
      }
      
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching following:', err);
      setError(err instanceof Error ? err : new Error("Failed to fetch following"));
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
      const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
      if (!session?.access_token) {
        navigate('/auth/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/follow/${targetUsername}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state
        setFollowingData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            following: prev.following.map(following => 
              following.id === targetUserId 
                ? { ...following, is_following: result.is_following }
                : following
            )
          };
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const loadMore = () => {
    if (followingData?.has_more && !isLoadingMore) {
      fetchFollowing(currentPage + 1, false);
    }
  };

  useEffect(() => {
    fetchFollowing();
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
          <LoadingSpinner message="Loading following..." />
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

  const filteredFollowing = followingData?.following?.filter(following =>
    following.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    following.display_name.toLowerCase().includes(searchTerm.toLowerCase())
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
                <span>Following</span>
              </div>
              <h1 className="profile-name">
                {username}'s Following
                {followingData && <span className="count-badge">({followingData.total})</span>}
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
              placeholder="Search following..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Following List */}
        <main className="followers-main-content">
          {filteredFollowing.length === 0 ? (
            <div className="enhanced-empty-state">
              <h3>No Following Found</h3>
              <p>
                {searchTerm 
                  ? `No following match "${searchTerm}"`
                  : `@${username} isn't following anyone yet`
                }
              </p>
            </div>
          ) : (
            <div className="followers-grid">
              {filteredFollowing.map((following) => (
                <div key={following.id} className="follower-card">
                  <div className="follower-header">
                    <Link 
                      to={`/users/${following.username}`}
                      className="follower-avatar-link"
                    >
                      {following.avatar_url ? (
                        <img
                          src={following.avatar_url}
                          alt={`${following.display_name}'s avatar`}
                          className="follower-avatar"
                        />
                      ) : (
                        <div className={`follower-avatar-placeholder ${generateAvatarColor(following.username)}`}>
                          {following.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    
                    <div className="follower-info">
                      <Link 
                        to={`/users/${following.username}`}
                        className="follower-name-link"
                      >
                        <h3 className="follower-name">{following.display_name}</h3>
                        <p className="follower-username">@{following.username}</p>
                      </Link>
                    </div>
                  </div>

                  <div className="follower-actions">
                    {following.is_mutual && (
                      <span className="mutual-badge">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        Mutual
                      </span>
                    )}
                    
                    {user && user.id !== following.id && (
                      <button
                        onClick={() => handleFollowToggle(following.id, following.username)}
                        className={`follow-button ${following.is_following ? 'following' : 'not-following'}`}
                      >
                        {following.is_following ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>

                  <div className="follower-meta">
                    <span className="follow-date">
                      Followed {new Date(following.followed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {followingData?.has_more && !searchTerm && (
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