// ABOUTME: List discovery page for finding and exploring public user-created lists with search and filtering
// ABOUTME: Provides comprehensive list browsing experience with infinite scroll pagination and community discovery

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { supabase } from "../lib/supabase";
// Removed ListPreviewCard import - using grid view only
import { ListGridCard } from "../components/lists/ListGridCard";
// Removed ListPreviewCardSkeleton import - using grid view only
import { AdvancedFiltersPanel } from "../components/lists/AdvancedFiltersPanel";
import { UserSearchComponent } from "../components/social/UserSearchComponent";
import { QuickPreviewModal } from "../components/lists/QuickPreviewModal";
import ErrorFallback from "../components/Error/ErrorFallback";
import { CustomList } from "../types/social";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { SearchIcon, LoadingSpinner } from "../components/common/Icons";

type SortOption = "recent" | "popular" | "followers" | "items";

interface DiscoveryFilters {
  search: string;
  sortBy: SortOption;
  tags: string[];
  contentType: string;
  privacy: string;
  itemCount: string;
  followerCount: string;
}

// Map frontend sort options to backend sort fields
const mapSortOption = (sortOption: SortOption): string => {
  switch (sortOption) {
    case "recent":
      return "updated_at";
    case "popular":
      return "popularity";
    case "followers":
      return "followers_count";
    case "items":
      return "item_count";
    default:
      return "updated_at";
  }
};

// Helper function to create filter chips from current filters
const createFilterChips = (filters: DiscoveryFilters) => {
  const chips = [];

  // Sort filter
  if (filters.sortBy !== "popular") {
    chips.push({
      id: `sort-${filters.sortBy}`,
      label: `Sort: ${getSortLabel(filters.sortBy)}`,
      value: filters.sortBy,
      type: 'sort' as const,
      color: 'blue' as const
    });
  }

  // Content type filter
  if (filters.contentType !== "all") {
    chips.push({
      id: `content-${filters.contentType}`,
      label: `Type: ${getContentTypeLabel(filters.contentType)}`,
      value: filters.contentType,
      type: 'content_type' as const,
      color: 'purple' as const
    });
  }

  // Privacy filter
  if (filters.privacy !== "all") {
    chips.push({
      id: `privacy-${filters.privacy}`,
      label: `Privacy: ${getPrivacyLabel(filters.privacy)}`,
      value: filters.privacy,
      type: 'privacy' as const,
      color: 'green' as const
    });
  }

  // Size filters
  if (filters.itemCount !== "all") {
    chips.push({
      id: `size-${filters.itemCount}`,
      label: `Size: ${getSizeLabel(filters.itemCount)}`,
      value: filters.itemCount,
      type: 'size' as const,
      color: 'orange' as const
    });
  }

  if (filters.followerCount !== "all") {
    chips.push({
      id: `popularity-${filters.followerCount}`,
      label: `Popularity: ${getPopularityLabel(filters.followerCount)}`,
      value: filters.followerCount,
      type: 'popularity' as const,
      color: 'pink' as const
    });
  }

  // Tag filters
  filters.tags.forEach(tag => {
    chips.push({
      id: `tag-${tag}`,
      label: `#${tag}`,
      value: tag,
      type: 'tag' as const,
      color: 'indigo' as const
    });
  });

  return chips;
};

const getSortLabel = (sortBy: string) => {
  const map: { [key: string]: string } = {
    recent: "Recently Updated",
    popular: "Most Popular",
    followers: "Most Followed",
    items: "Most Items"
  };
  return map[sortBy] || sortBy;
};

const getContentTypeLabel = (type: string) => {
  const map: { [key: string]: string } = {
    anime: "Anime Only",
    manga: "Manga Only",
    mixed: "Mixed Content"
  };
  return map[type] || type;
};

const getPrivacyLabel = (privacy: string) => {
  const map: { [key: string]: string } = {
    public: "Public Only",
    friends_only: "Friends Only"
  };
  return map[privacy] || privacy;
};

const getSizeLabel = (size: string) => {
  const map: { [key: string]: string } = {
    small: "Small (1-10)",
    medium: "Medium (11-50)",
    large: "Large (50+)"
  };
  return map[size] || size;
};

const getPopularityLabel = (popularity: string) => {
  const map: { [key: string]: string } = {
    popular: "Popular (10+)",
    trending: "Trending (50+)",
    viral: "Viral (100+)"
  };
  return map[popularity] || popularity;
};

export const ListDiscoveryPage: React.FC = () => {
  const { user } = useAuth();
  const { get, post } = useAuthenticatedApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [lists, setLists] = useState<CustomList[]>([]);
  const [totalLists, setTotalLists] = useState(0);
  const [filters, setFilters] = useState<DiscoveryFilters>({
    search: searchParams.get("q") || "",
    sortBy: (searchParams.get("sort") as SortOption) || "popular",
    tags: searchParams.get("tags")?.split(",").filter(Boolean) || [],
    contentType: searchParams.get("contentType") || "all",
    privacy: searchParams.get("privacy") || "all",
    itemCount: searchParams.get("itemCount") || "all",
    followerCount: searchParams.get("followerCount") || "all",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedList, setSelectedList] = useState<CustomList | null>(null);
  // Removed viewMode state - only using grid view

  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useDocumentTitle("Discover Lists - Community Lists");

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const newParams = new URLSearchParams();
      if (filters.search) newParams.set("q", filters.search);
      if (filters.sortBy !== "popular") newParams.set("sort", filters.sortBy);
      if (filters.tags.length > 0)
        newParams.set("tags", filters.tags.join(","));

      setSearchParams(newParams);

      // Reset pagination and refetch
      setPage(1);
      setLists([]);
      setHasMore(true);
      fetchLists(true);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search, filters.sortBy, filters.tags, filters.contentType, filters.privacy, filters.itemCount, filters.followerCount]);

  const fetchLists = useCallback(
    async (isFirstPage = false) => {
      const currentPage = isFirstPage ? 1 : page;

      try {
        if (isFirstPage) {
          setIsLoading(true);
          setError(null);
        } else {
          setIsLoadingMore(true);
        }

        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "12",
          sort_by: mapSortOption(filters.sortBy),
        });

        if (filters.search) params.set("search", filters.search);
        if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));
        if (filters.contentType && filters.contentType !== 'all') params.set('contentType', filters.contentType);
        if (filters.privacy && filters.privacy !== 'all') params.set('privacy', filters.privacy);
        if (filters.itemCount && filters.itemCount !== 'all') params.set('itemCount', filters.itemCount);
        if (filters.followerCount && filters.followerCount !== 'all') params.set('followerCount', filters.followerCount);

        // Use authenticated API if user is logged in, otherwise use public fetch
        let result;
        const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
        
        if (user) {
          // Get current session and token
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          if (token) {
            const requestHeaders = {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            };
            
            // Use fetch with Authorization header for public endpoint with auth
            const response = await fetch(
              `${API_BASE_URL}/api/lists/discover?${params.toString()}`,
              {
                method: 'GET',
                headers: requestHeaders,
              }
            );
            if (!response.ok) {
              // If token is invalid/expired, fallback to anonymous request
              if (response.status === 401) {
                const anonResponse = await fetch(
                  `${API_BASE_URL}/api/lists/discover?${params.toString()}`
                );
                if (!anonResponse.ok) {
                  throw new Error(`HTTP ${anonResponse.status}: ${anonResponse.statusText}`);
                }
                result = await anonResponse.json();
              } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
            } else {
              result = await response.json();
            }
          } else {
            // Fallback to anonymous request
            const response = await fetch(
              `${API_BASE_URL}/api/lists/discover?${params.toString()}`
            );
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            result = await response.json();
          }
        } else {
          const response = await fetch(
            `${API_BASE_URL}/api/lists/discover?${params.toString()}`
          );
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          result = await response.json();
        }
        const rawLists = result.lists || [];

        // Note: Backend API already provides tags correctly via list_tag_associations table

        // Transform backend response to frontend format
        const transformedLists = rawLists.map((rawList: any) => {
          const transformed = {
            id: rawList.id.toString(),
            title: rawList.title,
            description: rawList.description || "",
            privacy: rawList.privacy || "private",
            tags: rawList.tags || [],
            createdAt: rawList.created_at,
            updatedAt: rawList.updated_at,
            userId: rawList.user_id,
            username: rawList.user_profiles?.username || "",
            itemCount: rawList.item_count || 0,
            followersCount: rawList.followers_count || 0,
            isFollowing: rawList.is_following || false,
            contentType: rawList.content_type || "mixed",
            previewItems: rawList.preview_items || [],
            items: [],
          };
          
          
          return transformed;
        });

        if (isFirstPage) {
          setLists(transformedLists);
          setTotalLists(result.total || 0);
        } else {
          setLists((prev) => [...prev, ...transformedLists]);
        }

        setHasMore(result.has_more || transformedLists.length === 12);

        if (!isFirstPage) {
          setPage((prev) => prev + 1);
        }
      } catch (err: any) {
        // TODO: Replace with proper error logging service (e.g., Sentry)
        setError(
          err.response?.data?.message ||
            "Failed to load lists. Please try again."
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user, page, filters, get]
  );

  // Initial load - only on mount
  useEffect(() => {
    fetchLists(true);
  }, []); // Empty dependency array - only run on mount

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchLists(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [fetchLists, hasMore, isLoadingMore]);

  const handleFilterChange = useCallback((key: keyof DiscoveryFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleTagAdd = useCallback((tag: string) => {
    if (!filters.tags.includes(tag)) {
      handleFilterChange("tags", [...filters.tags, tag]);
    }
  }, [filters.tags, handleFilterChange]);

  const handleTagRemove = useCallback((tag: string) => {
    handleFilterChange(
      "tags",
      filters.tags.filter((t) => t !== tag)
    );
  }, [filters.tags, handleFilterChange]);

  const handleFollowList = useCallback(async (listId: string) => {
    if (!user) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      return;
    }

    // Find the current list to get the username and current follow status
    const currentList = lists.find(list => list.id === listId);
    if (!currentList || !currentList.username) {
      setError("List or username not found");
      return;
    }

    // Note: This now tracks whether we're following the USER who created the list
    const wasFollowing = currentList.isFollowing;
    const username = currentList.username;

    try {
      // Optimistic update - update UI immediately for better UX
      // Update all lists by this user
      setLists((prevLists) =>
        prevLists.map((list) =>
          list.username === username
            ? {
                ...list,
                isFollowing: !(wasFollowing ?? false),
                // Note: followersCount is for the list, not the user
                // We keep it unchanged as it reflects list followers
              }
            : list
        )
      );

      // Call the user follow endpoint instead of list follow
      const response = await post(`/api/auth/follow/${username}`);

      // Update all lists by this user with actual response data
      setLists((prevLists) =>
        prevLists.map((list) =>
          list.username === username
            ? {
                ...list,
                isFollowing: response.is_following ?? false,
                // Keep list follower count unchanged
              }
            : list
        )
      );
    } catch (error: any) {
      // Revert optimistic update on error
      setLists((prevLists) =>
        prevLists.map((list) =>
          list.username === username
            ? {
                ...list,
                isFollowing: wasFollowing ?? false,
              }
            : list
        )
      );

      // TODO: Replace with proper error logging service (e.g., Sentry)
      // You could add a toast notification here for better UX
      setError(
        error.response?.data?.message ||
          "Failed to update follow status. Please try again."
      );
    }
  }, [user, post, setLists, setError, lists]);

  const handleRetry = useCallback(() => {
    setError(null);
    setPage(1);
    setLists([]);
    setHasMore(true);
    fetchLists(true);
  }, [fetchLists]);

  const handleFilterChipRemove = useCallback((filterId: string) => {
    const [type, value] = filterId.split('-');
    
    switch (type) {
      case 'sort':
        handleFilterChange('sortBy', 'popular');
        break;
      case 'content':
        handleFilterChange('contentType', 'all');
        break;
      case 'privacy':
        handleFilterChange('privacy', 'all');
        break;
      case 'size':
        handleFilterChange('itemCount', 'all');
        break;
      case 'popularity':
        handleFilterChange('followerCount', 'all');
        break;
      case 'tag':
        handleTagRemove(value);
        break;
    }
  }, [handleFilterChange, handleTagRemove]);

  const handleListClick = useCallback((list: CustomList) => {
    // Show preview modal for quick preview
    setSelectedList(list);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedList(null);
  }, []);

  const handleViewFull = useCallback((listId: string) => {
    // Navigate to full list detail page
    navigate(`/lists/${listId}`);
    setSelectedList(null); // Close modal
  }, [navigate]);

  // Generate active filter chips (memoized to prevent unnecessary recalculation)
  const activeFilterChips = useMemo(() => createFilterChips(filters), [filters]);

  // Note: This page is now publicly accessible, but some features require authentication

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Compact Header Bar */}
      <div 
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        style={{ 
          position: 'sticky', 
          top: '76px', 
          zIndex: 30 
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Title and Stats */}
            <div className="flex items-center gap-6" style={{ flexShrink: 0 }}>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white" style={{ whiteSpace: 'nowrap' }}>Discover Lists</h1>
              <div className="hidden lg:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="font-semibold text-gray-900 dark:text-white">{totalLists.toLocaleString()}</span>
                  <span className="text-gray-500 dark:text-gray-400">lists available</span>
                </div>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="font-semibold text-gray-900 dark:text-white">{lists.length}</span>
                  <span className="text-gray-500 dark:text-gray-400">showing</span>
                </div>
              </div>
            </div>
            
            {/* Center: Search */}
            <div className="flex-1 max-w-xl mx-4">
              <div className="relative">
                <span 
                  className="absolute text-gray-400 pointer-events-none" 
                  style={{ 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    zIndex: 10
                  }}
                >
                  <SearchIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search lists..."
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ 
                    paddingLeft: '40px',
                    paddingRight: '16px',
                    paddingTop: '8px',
                    paddingBottom: '8px'
                  }}
                />
              </div>
            </div>
            
            {/* Right: View Controls */}
            <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
              {/* View mode toggle removed - using grid view only */}
              <button
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {showUserSearch ? "Lists" : "Users"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Left Sidebar - Categories */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Filters</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    handleFilterChange('sortBy', 'popular');
                    handleFilterChange('contentType', 'all');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    filters.sortBy === 'popular' && filters.contentType === 'all'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>⭐ Popular</span>
                  </div>
                </button>
                <button
                  onClick={() => handleFilterChange('sortBy', 'recent')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    filters.sortBy === 'recent'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>🕒 Recent</span>
                  </div>
                </button>
                <button
                  onClick={() => handleFilterChange('contentType', 'anime')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    filters.contentType === 'anime'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>📺 Anime</span>
                  </div>
                </button>
                <button
                  onClick={() => handleFilterChange('contentType', 'manga')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    filters.contentType === 'manga'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>📚 Manga</span>
                  </div>
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>🎛️ Advanced</span>
                    <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
              </div>
              
              {/* Active Filters Summary */}
              {activeFilterChips.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Filters</span>
                    <button
                      onClick={() => {
                        setFilters({
                          search: "",
                          sortBy: "popular",
                          tags: [],
                          contentType: "all",
                          privacy: "all",
                          itemCount: "all",
                          followerCount: "all",
                        });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {activeFilterChips.map((filter) => (
                      <div
                        key={filter.id}
                        className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between"
                      >
                        <span className="truncate">{filter.label}</span>
                        <button
                          onClick={() => handleFilterChipRemove(filter.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <AdvancedFiltersPanel 
                filters={filters}
                onFilterChange={(key: string, value: any) => {
                  handleFilterChange(key as keyof DiscoveryFilters, value);
                }}
                onClearFilters={() => {
                  setFilters({
                    search: "",
                    sortBy: "popular",
                    tags: [],
                    contentType: "all",
                    privacy: "all",
                    itemCount: "all",
                    followerCount: "all",
                  });
                }}
                isCollapsed={false}
                onToggleCollapse={() => setShowAdvancedFilters(!showAdvancedFilters)}
              />
            )}

            {/* Loading State */}
            {isLoading && lists.length === 0 && (
              <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[...Array(12)].map((_, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 animate-pulse"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                            </div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-20"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="mb-8">
                <ErrorFallback
                  error={new Error(error)}
                  onRetry={handleRetry}
                  showDetails={false}
                />
              </div>
            )}

            {/* Content */}
            {showUserSearch ? (
              <UserSearchComponent />
            ) : (
              <>
                {!isLoading && !error && (
                  <>
                    {lists.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mb-6">
                          <SearchIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                          No Lists Found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                          Try adjusting your search terms or filters to discover more lists.
                        </p>
                        <button
                          onClick={() => {
                            setFilters({
                              search: "",
                              sortBy: "popular",
                              tags: [],
                              contentType: "all",
                              privacy: "all",
                              itemCount: "all",
                              followerCount: "all",
                            });
                          }}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {lists.length} {lists.length === 1 ? 'List' : 'Lists'}
                            {filters.search && (
                              <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                                matching "{filters.search}"
                              </span>
                            )}
                          </h2>
                          <div className="flex items-center gap-2">
                            <select
                              value={filters.sortBy}
                              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="popular">Most Popular</option>
                              <option value="recent">Recently Updated</option>
                              <option value="followers">Most Followed</option>
                              <option value="items">Most Items</option>
                            </select>
                          </div>
                        </div>

                        {/* Lists Display */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {lists.map((list) => (
                              <ListGridCard
                                key={list.id}
                                list={list}
                                onTagClick={handleTagAdd}
                                onToggleFollow={() => handleFollowList(list.id)}
                                onListClick={() => handleListClick(list)}
                                isAuthenticated={!!user}
                              />
                            ))}
                          </div>

                        {/* Load More Sentinel */}
                        {hasMore && (
                          <div ref={sentinelRef} className="mt-8 py-4">
                            {isLoadingMore && (
                              <div className="text-center">
                                <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <LoadingSpinner className="animate-spin h-5 w-5" />
                                  <span>Loading more lists...</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Preview Modal */}
      <QuickPreviewModal
        isOpen={!!selectedList}
        onClose={handleCloseModal}
        list={selectedList}
        {...(selectedList && {
          onToggleFollow: () => { handleFollowList(selectedList.id); },
          onViewFull: () => handleViewFull(selectedList.id)
        })}
        isAuthenticated={!!user}
      />
    </div>
  );
};