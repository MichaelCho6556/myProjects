// ABOUTME: Filter and sorting component for reviews with sort options
// ABOUTME: Allows users to change review sorting and filtering preferences

import React from 'react';
import { ReviewSortBy } from '../../../types/reviews';

interface ReviewFiltersProps {
  sortBy: ReviewSortBy;
  onSortChange: (sortBy: ReviewSortBy) => void;
  reviewCount: number;
  className?: string;
}

const SORT_OPTIONS = [
  {
    value: 'helpfulness' as ReviewSortBy,
    label: 'Most Helpful',
    description: 'Reviews with the highest helpfulness scores',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
      </svg>
    ),
  },
  {
    value: 'newest' as ReviewSortBy,
    label: 'Newest First',
    description: 'Most recently posted reviews',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    value: 'oldest' as ReviewSortBy,
    label: 'Oldest First',
    description: 'Earliest posted reviews',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    value: 'rating' as ReviewSortBy,
    label: 'Highest Rated',
    description: 'Reviews with the highest ratings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

export const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  sortBy,
  onSortChange,
  reviewCount,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Review Count */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {reviewCount === 0 ? 'No reviews' : `${reviewCount} review${reviewCount === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Sort Options */}
      <div className="flex items-center space-x-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
        
        {/* Desktop Dropdown */}
        <div className="hidden md:block relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as ReviewSortBy)}
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Mobile Button Group */}
        <div className="md:hidden flex items-center space-x-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                sortBy === option.value
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title={option.description}
            >
              {option.icon}
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};