// ABOUTME: Interactive filter chips component for intuitive filter management
// ABOUTME: Provides visual chips/pills for active filters with easy add/remove functionality

import React, { useState } from 'react';

interface FilterChip {
  id: string;
  label: string;
  value: string;
  type: 'sort' | 'content_type' | 'privacy' | 'size' | 'popularity' | 'tag';
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo';
  removable?: boolean;
}

interface FilterChipsProps {
  activeFilters: FilterChip[];
  onFilterRemove: (filterId: string) => void;
  onFilterAdd?: (filter: FilterChip) => void;
  suggestedFilters?: FilterChip[];
  showSuggestions?: boolean;
  maxSuggestions?: number;
}

// Icon components
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
  </svg>
);

export const FilterChips: React.FC<FilterChipsProps> = ({
  activeFilters,
  onFilterRemove,
  onFilterAdd,
  suggestedFilters = [],
  showSuggestions = true,
  maxSuggestions = 6
}) => {
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // Color mapping for different filter types
  const getChipColor = (chip: FilterChip) => {
    const baseColor = chip.color || getDefaultColorByType(chip.type);
    
    const colorMap: Record<NonNullable<FilterChip['color']>, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
      orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
      pink: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-700',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700'
    };
    
    return colorMap[baseColor as NonNullable<FilterChip['color']>] || colorMap.blue;
  };

  const getDefaultColorByType = (type: string): FilterChip['color'] => {
    const typeColorMap: Record<string, FilterChip['color']> = {
      sort: 'blue',
      content_type: 'purple',
      privacy: 'green',
      size: 'orange',
      popularity: 'pink',
      tag: 'indigo'
    };
    
    return typeColorMap[type] || 'blue';
  };

  const getSuggestedChipColor = (chip: FilterChip) => {
    const baseColor = chip.color || getDefaultColorByType(chip.type);
    
    const colorMap: Record<NonNullable<FilterChip['color']>, string> = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/40',
      green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/40',
      purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/40',
      orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800 dark:hover:bg-orange-900/40',
      pink: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800 dark:hover:bg-pink-900/40',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900/40'
    };
    
    return colorMap[baseColor as NonNullable<FilterChip['color']>] || colorMap.blue;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tag':
        return '#';
      case 'sort':
        return '↕';
      case 'content_type':
        return '📺';
      case 'privacy':
        return '🔒';
      case 'size':
        return '📊';
      case 'popularity':
        return '⭐';
      default:
        return '';
    }
  };

  // Filter out already active filters from suggestions
  const availableSuggestions = suggestedFilters.filter(
    suggestion => !activeFilters.some(active => active.id === suggestion.id)
  );

  const displayedSuggestions = showAllSuggestions 
    ? availableSuggestions 
    : availableSuggestions.slice(0, maxSuggestions);

  const hasMoreSuggestions = availableSuggestions.length > maxSuggestions;

  return (
    <div className="space-y-4">
      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FilterIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Filters ({activeFilters.length})
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <div
                key={filter.id}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium 
                          border transition-all duration-200 hover:shadow-md ${getChipColor(filter)}`}
              >
                {getTypeIcon(filter.type) && (
                  <span className="text-xs">{getTypeIcon(filter.type)}</span>
                )}
                <span>{filter.label}</span>
                {filter.removable !== false && (
                  <button
                    onClick={() => onFilterRemove(filter.id)}
                    className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label={`Remove ${filter.label} filter`}
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Filters */}
      {showSuggestions && displayedSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PlusIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Suggested Filters
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {displayedSuggestions.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onFilterAdd?.(filter)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium 
                          border transition-all duration-200 hover:shadow-md ${getSuggestedChipColor(filter)}`}
              >
                {getTypeIcon(filter.type) && (
                  <span className="text-xs">{getTypeIcon(filter.type)}</span>
                )}
                <span>{filter.label}</span>
                <PlusIcon className="w-3 h-3 opacity-60" />
              </button>
            ))}
            
            {hasMoreSuggestions && !showAllSuggestions && (
              <button
                onClick={() => setShowAllSuggestions(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium 
                         border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 
                         text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
                         transition-colors"
              >
                <span>+{availableSuggestions.length - maxSuggestions} more</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeFilters.length === 0 && displayedSuggestions.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FilterIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No filters applied</p>
          <p className="text-xs mt-1">Use the search and filters above to refine your results</p>
        </div>
      )}
    </div>
  );
};