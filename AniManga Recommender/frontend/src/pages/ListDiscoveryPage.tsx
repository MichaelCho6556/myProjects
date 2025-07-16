// ABOUTME: List discovery page for finding and exploring public user-created lists with search and filtering
// ABOUTME: Provides comprehensive list browsing experience with infinite scroll pagination and community discovery

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { ListPreviewCard } from "../components/lists/ListPreviewCard";
import { ListGridCard } from "../components/lists/ListGridCard";
import { ListPreviewCardSkeleton } from "../components/lists/ListPreviewCardSkeleton";
import { AdvancedFiltersPanel } from "../components/lists/AdvancedFiltersPanel";
import { SearchHeroSection } from "../components/lists/SearchHeroSection";
import { FilterChips } from "../components/lists/FilterChips";
import { UserSearchComponent } from "../components/social/UserSearchComponent";
import { QuickPreviewModal } from "../components/lists/QuickPreviewModal";
import ErrorFallback from "../components/Error/ErrorFallback";
import { CustomList } from "../types/social";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { SearchIcon, GridIcon, ListIcon, LoadingSpinner } from "../components/common/Icons";

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

  const [lists, setLists] = useState<CustomList[]>([]);
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedList, setSelectedList] = useState<CustomList | null>(null);

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

        // Use authenticated API if user is logged in, otherwise use public fetch
        let result;
        if (user) {
          const response = await get(
            `/api/lists/discover?${params.toString()}`
          );
          result = response;
        } else {
          const API_BASE_URL =
            process.env.REACT_APP_API_URL || "http://localhost:5000";
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
        const transformedLists = rawLists.map((rawList: any) => ({
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
          items: [],
        }));

        if (isFirstPage) {
          setLists(transformedLists);
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

  // Initial load
  useEffect(() => {
    fetchLists(true);
  }, []);

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

    try {
      const response = await post(`/api/auth/lists/${listId}/follow`);

      // Update the list in the local state to reflect the new follow status
      setLists((prevLists) =>
        prevLists.map((list) =>
          list.id === listId
            ? {
                ...list,
                isFollowing: response.is_following,
                followersCount: response.followers_count,
              }
            : list
        )
      );
    } catch (error: any) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      // You could add a toast notification here for better UX
      setError(
        error.response?.data?.message ||
          "Failed to update follow status. Please try again."
      );
    }
  }, [user, post, setLists, setError]);

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
    setSelectedList(list);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedList(null);
  }, []);

  const handleViewFull = useCallback((listId: string) => {
    // Navigate to full list detail page
    window.location.href = `/lists/${listId}`;
  }, []);

  // Generate active filter chips (memoized to prevent unnecessary recalculation)
  const activeFilterChips = useMemo(() => createFilterChips(filters), [filters]);

  // Generate suggested filter chips (memoized to prevent unnecessary filtering)
  const suggestedFilterChips = useMemo(() => [
    {
      id: 'sort-recent',
      label: 'Recently Updated',
      value: 'recent',
      type: 'sort' as const,
      color: 'blue' as const
    },
    {
      id: 'content-anime',
      label: 'Anime Only',
      value: 'anime',
      type: 'content_type' as const,
      color: 'purple' as const
    },
    {
      id: 'content-manga',
      label: 'Manga Only',
      value: 'manga',
      type: 'content_type' as const,
      color: 'purple' as const
    },
    {
      id: 'popularity-popular',
      label: 'Popular Lists',
      value: 'popular',
      type: 'popularity' as const,
      color: 'pink' as const
    }
  ].filter(chip => !activeFilterChips.some(active => active.id === chip.id)), [activeFilterChips]);

  // Note: This page is now publicly accessible, but some features require authentication

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Search Section */}
      <SearchHeroSection
        searchTerm={filters.search}
        onSearchChange={(value) => handleFilterChange("search", value)}
        placeholder="Search for amazing community lists..."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left Side - View Toggle and User Search */}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  aria-label="Grid view"
                >
                  <GridIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  aria-label="List view"
                >
                  <ListIcon className="w-5 h-5" />
                </button>
              </div>

              {/* User Search Toggle */}
              <button
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                         rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {showUserSearch ? "List Search" : "User Search"}
              </button>
            </div>

            {/* Right Side - Advanced Filters */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showAdvancedFilters 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                Advanced Filters
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        {(activeFilterChips.length > 0 || suggestedFilterChips.length > 0) && (
          <div className="mb-6">
            <FilterChips
              activeFilters={activeFilterChips}
              onFilterRemove={handleFilterChipRemove}
              suggestedFilters={suggestedFilterChips}
              showSuggestions={activeFilterChips.length < 3}
            />
          </div>
        )}

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
          <div className="mb-8">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Skeleton for grid card */}
                    <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 animate-pulse relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
                      <div className="flex gap-2">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12"></div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                        </div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[...Array(6)].map((_, index) => (
                  <ListPreviewCardSkeleton key={index} />
                ))}
              </div>
            )}
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
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <SearchIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Lists Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      Try adjusting your search terms or filters to discover more lists.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Results Count and Active Filters Summary */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {lists.length} list{lists.length !== 1 ? "s" : ""} found
                        {filters.search && ` for "${filters.search}"`}
                      </p>
                      
                      {/* Active Filter Summary */}
                      {(filters.tags.length > 0 || filters.contentType !== "all" || 
                        filters.privacy !== "all" || filters.itemCount !== "all" || 
                        filters.followerCount !== "all") && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Active filters:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {filters.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 
                                         text-blue-800 dark:text-blue-200 rounded-full text-xs"
                              >
                                #{tag}
                                <button
                                  onClick={() => handleTagRemove(tag)}
                                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                                  aria-label={`Remove ${tag} tag`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lists Display */}
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    ) : (
                      <div className="space-y-4">
                        {lists.map((list) => (
                          <ListPreviewCard
                            key={list.id}
                            list={list}
                            onTagClick={handleTagAdd}
                            onToggleFollow={() => handleFollowList(list.id)}
                            onListClick={() => handleListClick(list)}
                            isAuthenticated={!!user}
                          />
                        ))}
                      </div>
                    )}

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
