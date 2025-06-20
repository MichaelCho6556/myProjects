// ABOUTME: User's custom lists management page for creating, viewing, and managing personal curated lists
// ABOUTME: Provides interface for list creation, editing, and organization with drag-and-drop functionality

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { CreateCustomListModal } from '../../components/lists/CreateCustomListModal';
import LoadingBanner from '../../components/Loading/LoadingBanner';
import ErrorFallback from '../../components/Error/ErrorFallback';
import { CustomList } from '../../types/social';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export const MyCustomListsPage: React.FC = () => {
  const { user } = useAuth();
  const { get } = useAuthenticatedApi();
  
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'public' | 'private' | 'friends'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'items'>('recent');

  useDocumentTitle('My Custom Lists');

  const fetchMyLists = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await get('/api/auth/lists/my-lists');
      setLists(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch custom lists:', err);
      setError(err.response?.data?.message || 'Failed to load your lists. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLists();
  }, [user]);

  const handleCreateList = (newList: CustomList) => {
    setLists(prev => [newList, ...prev]);
  };

  const filteredLists = lists.filter(list => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'public') return list.privacy === 'Public';
    if (selectedFilter === 'private') return list.privacy === 'Private';
    if (selectedFilter === 'friends') return list.privacy === 'Friends Only';
    return true;
  });

  const sortedLists = [...filteredLists].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'items':
        return b.itemCount - a.itemCount;
      default:
        return 0;
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please Sign In
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be signed in to view your custom lists.
          </p>
          <Link 
            to="/" 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Custom Lists</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create and manage your curated anime and manga lists
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link 
              to="/discover/lists"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Discover Lists
            </Link>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New List
            </button>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            {/* Privacy Filters */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All Lists' },
                { value: 'public', label: 'Public' },
                { value: 'friends', label: 'Friends Only' },
                { value: 'private', label: 'Private' }
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedFilter(filter.value as any)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === filter.value
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="recent">Recently Updated</option>
              <option value="title">Title (A-Z)</option>
              <option value="items">Most Items</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingBanner message="Loading your custom lists..." isVisible={true} />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="mb-6">
            <ErrorFallback error={new Error(error)} />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && sortedLists.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {selectedFilter === 'all' ? 'No Custom Lists Yet' : `No ${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Lists`}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {selectedFilter === 'all' 
                ? 'Create your first custom list to organize and share your favorite anime and manga!'
                : `You don't have any ${selectedFilter} lists yet. Create one or change the filter to see other lists.`
              }
            </p>
            {selectedFilter === 'all' ? (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Your First List
              </button>
            ) : (
              <button
                onClick={() => setSelectedFilter('all')}
                className="px-6 py-3 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                Show All Lists
              </button>
            )}
          </div>
        )}

        {/* Lists Grid */}
        {!isLoading && !error && sortedLists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedLists.map(list => (
              <div
                key={list.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                {/* List Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                      {list.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        {list.itemCount} items
                      </span>
                      <span>•</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        list.privacy === 'Public' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : list.privacy === 'Friends Only'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {list.privacy}
                      </span>
                    </div>
                  </div>
                </div>

                {/* List Description */}
                {list.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                    {list.description}
                  </p>
                )}

                {/* Tags */}
                {list.tags && list.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {list.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                    {list.tags.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{list.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* List Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span>Updated {new Date(list.updatedAt).toLocaleDateString()}</span>
                  {list.followersCount > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {list.followersCount} followers
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link
                    to={`/lists/${list.id}`}
                    className="flex-1 px-3 py-2 text-center text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm font-medium"
                  >
                    View & Edit
                  </Link>
                  <button
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    title="More options"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create List Modal */}
        <CreateCustomListModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreateList={handleCreateList}
        />
      </div>
    </div>
  );
};