// ABOUTME: Advanced filters panel for list discovery with collapsible design and multiple filter options
// ABOUTME: Provides enhanced filtering capabilities including tags, sort options, and content type filters

import React, { useState } from 'react';
import { ChevronDownIcon, SearchIcon } from '../common/Icons';

interface AdvancedFiltersPanelProps {
  filters: {
    search: string;
    sortBy: string;
    tags: string[];
    contentType?: string;
    privacy?: string;
    itemCount?: string;
    followerCount?: string;
  };
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  availableTags?: string[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'recent', label: 'Recently Updated' },
  { value: 'followers', label: 'Most Followed' },
  { value: 'items', label: 'Most Items' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'anime', label: 'Anime Only' },
  { value: 'manga', label: 'Manga Only' },
  { value: 'mixed', label: 'Mixed Content' },
];

const PRIVACY_OPTIONS = [
  { value: 'all', label: 'All Privacy' },
  { value: 'public', label: 'Public Only' },
  { value: 'friends_only', label: 'Friends Only' },
];

const ITEM_COUNT_OPTIONS = [
  { value: 'all', label: 'Any Size' },
  { value: 'small', label: 'Small (1-10 items)' },
  { value: 'medium', label: 'Medium (11-50 items)' },
  { value: 'large', label: 'Large (50+ items)' },
];

const FOLLOWER_COUNT_OPTIONS = [
  { value: 'all', label: 'Any Followers' },
  { value: 'popular', label: 'Popular (10+ followers)' },
  { value: 'trending', label: 'Trending (50+ followers)' },
  { value: 'viral', label: 'Viral (100+ followers)' },
];

export const AdvancedFiltersPanel: React.FC<AdvancedFiltersPanelProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  availableTags = [],
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [tagSearchTerm, setTagSearchTerm] = useState('');

  const handleTagAdd = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      onFilterChange('tags', [...filters.tags, tag]);
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    onFilterChange('tags', filters.tags.filter(tag => tag !== tagToRemove));
  };

  const filteredTags = availableTags.filter(tag => 
    tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
    !filters.tags.includes(tag)
  );

  const hasActiveFilters = filters.tags.length > 0 || 
                          filters.contentType !== 'all' || 
                          filters.privacy !== 'all' || 
                          filters.itemCount !== 'all' || 
                          filters.followerCount !== 'all';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Filter Header */}
      <div 
        className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Advanced Filters
            </h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {filters.tags.length + (hasActiveFilters ? 1 : 0)} active
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFilters();
                }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
              >
                Clear All
              </button>
            )}
            
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
              <ChevronDownIcon 
                className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform ${
                  isCollapsed ? 'rotate-0' : 'rotate-180'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Content */}
      {!isCollapsed && (
        <div className="p-6 space-y-6">
          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Content Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_TYPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => onFilterChange('contentType', option.value)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    filters.contentType === option.value
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Privacy Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIVACY_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => onFilterChange('privacy', option.value)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    filters.privacy === option.value
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Count Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                List Size
              </label>
              <select
                value={filters.itemCount || 'all'}
                onChange={(e) => onFilterChange('itemCount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ITEM_COUNT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Follower Count Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Popularity
              </label>
              <select
                value={filters.followerCount || 'all'}
                onChange={(e) => onFilterChange('followerCount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {FOLLOWER_COUNT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            
            {/* Tag Search Input */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search tags..."
                value={tagSearchTerm}
                onChange={(e) => setTagSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            {/* Selected Tags */}
            {filters.tags.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Selected Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {filters.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 
                               text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
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
                </div>
              </div>
            )}

            {/* Available Tags */}
            {tagSearchTerm && filteredTags.length > 0 && (
              <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                <div className="flex flex-wrap gap-1">
                  {filteredTags.slice(0, 20).map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagAdd(tag)}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                               rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};