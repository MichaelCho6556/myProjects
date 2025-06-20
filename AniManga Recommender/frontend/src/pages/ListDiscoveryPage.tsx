// ABOUTME: List discovery page for finding and exploring public user-created lists with search and filtering
// ABOUTME: Provides comprehensive list browsing experience with infinite scroll pagination and community discovery

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { ListPreviewCard } from '../components/lists/ListPreviewCard';
import { UserSearchComponent } from '../components/social/UserSearchComponent';
import LoadingBanner from '../components/Loading/LoadingBanner';
import ErrorFallback from '../components/Error/ErrorFallback';
import { CustomList } from '../types/social';
import useDocumentTitle from '../hooks/useDocumentTitle';

type SortOption = 'recent' | 'popular' | 'followers' | 'items';

interface DiscoveryFilters {
  search: string;
  sortBy: SortOption;
  tags: string[];
}

// Map frontend sort options to backend sort fields
const mapSortOption = (sortOption: SortOption): string => {
  switch (sortOption) {
    case 'recent': return 'updated_at';
    case 'popular': return 'updated_at'; // Backend doesn't have popularity metric yet
    case 'followers': return 'updated_at'; // Backend doesn't have follower count yet
    case 'items': return 'updated_at'; // Backend doesn't have item count yet
    default: return 'updated_at';
  }
};

export const ListDiscoveryPage: React.FC = () => {
  const { user } = useAuth();
  const { get } = useAuthenticatedApi();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [lists, setLists] = useState<CustomList[]>([]);
  const [filters, setFilters] = useState<DiscoveryFilters>({
    search: searchParams.get('q') || '',
    sortBy: (searchParams.get('sort') as SortOption) || 'popular',
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showUserSearch, setShowUserSearch] = useState(false);
  
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useDocumentTitle('Discover Lists - Community Lists');

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const newParams = new URLSearchParams();
      if (filters.search) newParams.set('q', filters.search);
      if (filters.sortBy !== 'popular') newParams.set('sort', filters.sortBy);
      if (filters.tags.length > 0) newParams.set('tags', filters.tags.join(','));
      
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
  }, [filters.search, filters.sortBy, filters.tags]);

  const fetchLists = useCallback(async (isFirstPage = false) => {
    if (!user) return;

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
        limit: '12',
        sort_by: mapSortOption(filters.sortBy),
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));

      const response = await get(`/api/lists/discover?${params.toString()}`);
      const result = response.data;
      const rawLists = result.lists || [];
      
      // Transform backend response to frontend format
      const transformedLists = rawLists.map((rawList: any) => ({
        id: rawList.id.toString(),
        title: rawList.title,
        description: rawList.description || '',
        privacy: rawList.is_public ? 'Public' : 'Private',
        tags: [], // Would need to be fetched separately or included in response
        createdAt: rawList.created_at,
        updatedAt: rawList.updated_at,
        userId: rawList.user_id,
        username: rawList.user_profiles?.username || '',
        itemCount: 0, // Would need to be calculated by backend
        followersCount: 0, // Would need to be calculated by backend
        isFollowing: false,
        items: []
      }));
      
      if (isFirstPage) {
        setLists(transformedLists);
      } else {
        setLists(prev => [...prev, ...transformedLists]);
      }
      
      setHasMore(result.has_more || transformedLists.length === 12);
      
      if (!isFirstPage) {
        setPage(prev => prev + 1);
      }
      
    } catch (err: any) {
      console.error('Failed to fetch lists:', err);
      setError(err.response?.data?.message || 'Failed to load lists. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, page, filters, get]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchLists(true);
    }
  }, [user]);

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

  const handleFilterChange = (key: keyof DiscoveryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTagAdd = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      handleFilterChange('tags', [...filters.tags, tag]);
    }
  };

  const handleTagRemove = (tag: string) => {
    handleFilterChange('tags', filters.tags.filter(t => t !== tag));
  };

  const handleFollowList = async (listId: string) => {
    // Implement follow functionality
    console.log('Follow list:', listId);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please Sign In
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need to be signed in to discover community lists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Discover Community Lists
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explore curated lists created by other users in the AniManga community
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Lists
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by title, description, or creator..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="lg:w-48">
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                id="sort"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="popular">Most Popular</option>
                <option value="recent">Most Recent</option>
                <option value="followers">Most Followed</option>
                <option value="items">Most Items</option>
              </select>
            </div>

            {/* Toggle User Search */}
            <div className="lg:w-40 flex items-end">
              <button
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                         rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {showUserSearch ? 'List Search' : 'User Search'}
              </button>
            </div>
          </div>

          {/* Active Tags */}
          {filters.tags.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Active Filters
              </label>
              <div className="flex flex-wrap gap-2">
                {filters.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 
                             text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    #{tag}
                    <button
                      onClick={() => handleTagRemove(tag)}
                      className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => handleFilterChange('tags', [])}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mb-8">
            <LoadingBanner message="Discovering community lists..." isVisible={true} />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="mb-8">
            <ErrorFallback error={new Error(error)} />
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
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Lists Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try adjusting your search terms or filters to discover more lists.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Results Count */}
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {lists.length} list{lists.length !== 1 ? 's' : ''} found
                        {filters.search && ` for "${filters.search}"`}
                      </p>
                    </div>

                    {/* Lists Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {lists.map((list) => (
                        <ListPreviewCard 
                          key={list.id} 
                          list={list} 
                          onTagClick={handleTagAdd}
                          onToggleFollow={() => handleFollowList(list.id)}
                        />
                      ))}
                    </div>

                    {/* Load More Sentinel */}
                    {hasMore && (
                      <div ref={sentinelRef} className="mt-8 py-4">
                        {isLoadingMore && (
                          <div className="text-center">
                            <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Loading more lists...
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
  );
};