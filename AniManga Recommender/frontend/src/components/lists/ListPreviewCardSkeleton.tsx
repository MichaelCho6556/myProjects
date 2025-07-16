// ABOUTME: Skeleton loading component for ListPreviewCard that matches the redesigned card layout
// ABOUTME: Provides smooth loading experience with animated placeholders using Tailwind CSS

import React from 'react';

export const ListPreviewCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Horizontal Layout */}
      <div className="flex items-start gap-6">
        
        {/* Left Side - List Info */}
        <div className="flex-1 min-w-0">
          {/* Title and Privacy */}
          <div className="mb-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4 mb-2"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-16"></div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"
              ></div>
            ))}
          </div>

          {/* Creator and Stats Row */}
          <div className="flex items-center justify-between">
            {/* Creator */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
            </div>
          </div>
        </div>

        {/* Right Side - Follow Button */}
        <div className="flex-shrink-0">
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-24"></div>
        </div>
      </div>
    </div>
  );
};