// ABOUTME: User search results page displaying user profiles with pagination and filtering options
// ABOUTME: Provides comprehensive user discovery interface with follow functionality and profile previews

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { useAuth } from "../context/AuthContext";
import EnhancedSearch from "../components/EnhancedSearch";
import LoadingBanner from "../components/Loading/LoadingBanner";
import ErrorFallback from "../components/Error/ErrorFallback";
import { FollowButton } from "../components/social/FollowButton";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./UserSearchPage.css";

interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isFollowing?: boolean;
  isPrivate: boolean;
  followersCount: number;
  completedAnime: number;
  completedManga: number;
  joinDate: string;
}

interface SearchResponse {
  users: UserSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const UserSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const api = useAuthenticatedApi();

  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [pagination, setPagination] = useState<SearchResponse["pagination"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // Set document title
  useDocumentTitle(
    query ? `Search Users: "${query}" | AniManga Recommender` : "Search Users | AniManga Recommender"
  );

  // Perform search when query or pagination changes
  useEffect(() => {
    if (query.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
      setPagination(null);
      setHasSearched(false);
    }
  }, [query, page, limit]);

  const performSearch = async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await api.get(
        `/api/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
      );

      setSearchResults(response.users || []);
      setPagination(response.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to search users"));
      setSearchResults([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (newQuery: string, type: "media" | "users") => {
    if (type === "media") {
      // Redirect to media search (home page)
      navigate(`/?q=${encodeURIComponent(newQuery)}`);
      return;
    }

    // Update search params for user search
    const newParams = new URLSearchParams();
    newParams.set("q", newQuery);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFollowToggle = async () => {
    // Refresh search results to get updated follow status
    await performSearch();
  };

  const handleUserClick = (username: string) => {
    navigate(`/users/${username}`);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Search Header */}
        <header className="search-header">
          <h1>Search Users</h1>
          <p>Discover anime and manga enthusiasts in our community</p>

          <div className="search-container">
            <EnhancedSearch onSearch={handleSearch} className="search-widget" />
          </div>
        </header>

        {/* Search Results */}
        <main className="search-results">
          {/* Loading State */}
          {isLoading && <LoadingBanner message="Searching users..." isVisible={true} />}

          {/* Error State */}
          {error && !isLoading && <ErrorFallback error={error} onRetry={performSearch} />}

          {/* Results Content */}
          {!isLoading && !error && (
            <>
              {/* Results Header */}
              {hasSearched && pagination && (
                <div className="results-header">
                  <h2>
                    {pagination.total > 0
                      ? `Found ${pagination.total} user${pagination.total === 1 ? "" : "s"} for "${query}"`
                      : `No users found for "${query}"`}
                  </h2>
                  {pagination.total > 0 && (
                    <p className="results-info">
                      Showing {(pagination.page - 1) * pagination.limit + 1}-
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
                      results
                    </p>
                  )}
                </div>
              )}

              {/* User Results Grid */}
              {searchResults.length > 0 && (
                <div className="user-results-grid">
                  {searchResults.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      currentUser={currentUser}
                      onFollowToggle={handleFollowToggle}
                      onClick={() => handleUserClick(user.username)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.total > pagination.limit && (
                <div className="pagination-section">
                  <div className="pagination-controls">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="pagination-btn"
                    >
                      ← Previous
                    </button>

                    <span className="pagination-info">
                      Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                    </span>

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {hasSearched && searchResults.length === 0 && !isLoading && (
                <div className="empty-search-results">
                  <div className="empty-icon">👥</div>
                  <h3>No users found</h3>
                  <p>Try searching with different keywords or check your spelling.</p>
                  <div className="search-tips">
                    <h4>Search tips:</h4>
                    <ul>
                      <li>Try shorter, more general terms</li>
                      <li>Search by username or display name</li>
                      <li>Check for typos in your search</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Welcome State (no search performed yet) */}
              {!hasSearched && (
                <div className="welcome-search-state">
                  <div className="welcome-icon">🔍</div>
                  <h3>Start searching for users</h3>
                  <p>Use the search bar above to find other anime and manga fans.</p>
                  <div className="search-features">
                    <div className="feature-item">
                      <span className="feature-icon">👤</span>
                      <span>Find users by username or display name</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">📊</span>
                      <span>See their anime and manga stats</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">🤝</span>
                      <span>Follow users to see their activity</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

// User Card Component
interface UserCardProps {
  user: UserSearchResult;
  currentUser: any;
  onFollowToggle: () => Promise<void>;
  onClick: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, currentUser, onFollowToggle, onClick }) => {
  const isOwnProfile =
    currentUser &&
    (currentUser.id === user.id ||
      currentUser.user_metadata?.username === user.username ||
      currentUser.email?.split("@")[0] === user.username);

  return (
    <div className="user-card" onClick={onClick}>
      <div className="user-card-content">
        {/* User Avatar */}
        <div className="user-avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`${user.displayName}'s avatar`} />
          ) : (
            <div className="avatar-placeholder">{user.displayName.charAt(0).toUpperCase()}</div>
          )}
        </div>

        {/* User Info */}
        <div className="user-info">
          <h3 className="user-name">{user.displayName}</h3>
          <p className="user-username">@{user.username}</p>
          {user.bio && <p className="user-bio">{user.bio}</p>}

          <div className="user-stats">
            <span className="stat-item">
              <strong>{user.followersCount}</strong> followers
            </span>
            <span className="stat-item">
              <strong>{user.completedAnime}</strong> anime
            </span>
            <span className="stat-item">
              <strong>{user.completedManga}</strong> manga
            </span>
          </div>

          <div className="user-meta">
            <span>Joined {new Date(user.joinDate).toLocaleDateString()}</span>
            {user.isPrivate && <span className="private-badge">🔒 Private</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="user-actions" onClick={(e) => e.stopPropagation()}>
          {!isOwnProfile && currentUser && (
            <FollowButton
              isFollowing={user.isFollowing || false}
              onToggleFollow={onFollowToggle}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearchPage;
