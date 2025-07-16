// ABOUTME: Enhanced hero search section with prominent search input and visual hierarchy
// ABOUTME: Features auto-complete suggestions, recent searches, and engaging design

import React, { useState, useRef } from 'react';

interface SearchHeroSectionProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  recentSearches?: string[];
  popularSearches?: string[];
}

// Enhanced icon components
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const TrendingIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const SearchHeroSection: React.FC<SearchHeroSectionProps> = ({
  searchTerm,
  onSearchChange,
  onSearch,
  placeholder = "Search for community lists...",
  suggestions = [],
  recentSearches = ['anime romance', 'best manga 2024', 'shounen classics'],
  popularSearches = ['must watch anime', 'manga recommendations', 'hidden gems', 'action anime']
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Combine suggestions, recent searches, and popular searches
  const allSuggestions = React.useMemo(() => {
    const filtered = suggestions.filter(s => 
      s.toLowerCase().includes(searchTerm.toLowerCase()) && s !== searchTerm
    );
    
    const recent = searchTerm.length === 0 ? recentSearches : 
      recentSearches.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const popular = searchTerm.length === 0 ? popularSearches : 
      popularSearches.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    return [
      ...filtered.map(s => ({ text: s, type: 'suggestion' as const })),
      ...recent.map(s => ({ text: s, type: 'recent' as const })),
      ...popular.map(s => ({ text: s, type: 'popular' as const }))
    ].slice(0, 8);
  }, [suggestions, recentSearches, popularSearches, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
    setSelectedSuggestionIndex(-1);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    // Delay to allow click events on suggestions
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 150);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSearchChange(suggestion);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(suggestion);
    }
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || allSuggestions.length === 0) {
      if (e.key === 'Enter' && onSearch) {
        onSearch(searchTerm);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(allSuggestions[selectedSuggestionIndex].text);
        } else if (onSearch) {
          onSearch(searchTerm);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSearch = () => {
    onSearchChange('');
    inputRef.current?.focus();
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recent':
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
      case 'popular':
        return <TrendingIcon className="w-4 h-4 text-gray-400" />;
      default:
        return <SearchIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Discover Amazing Lists
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Explore curated anime and manga collections created by passionate community members
          </p>

          {/* Enhanced Search Input */}
          <div className="relative max-w-2xl mx-auto">
            <div className={`relative transition-all duration-300 ${
              isFocused 
                ? 'transform scale-105 shadow-2xl' 
                : 'shadow-lg hover:shadow-xl'
            }`}>
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <SearchIcon className="h-6 w-6 text-gray-400" />
              </div>
              
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="block w-full pl-16 pr-16 py-5 text-lg border-0 rounded-2xl 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         ring-2 ring-gray-200 dark:ring-gray-700
                         focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50
                         placeholder-gray-500 dark:placeholder-gray-400
                         transition-all duration-300"
                autoComplete="off"
              />
              
              {searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-6 flex items-center">
                  <button
                    onClick={clearSearch}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Clear search"
                  >
                    <XIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && allSuggestions.length > 0 && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 
                         rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 
                         max-h-80 overflow-y-auto z-50"
              >
                {searchTerm.length === 0 && (
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                      <SearchIcon className="w-4 h-4" />
                      Recent & Popular Searches
                    </div>
                  </div>
                )}

                <div className="py-2">
                  {allSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.type}-${suggestion.text}`}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 
                               transition-colors flex items-center gap-3 ${
                        index === selectedSuggestionIndex 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                          : ''
                      }`}
                    >
                      {getSuggestionIcon(suggestion.type)}
                      <div className="flex-1">
                        <span className="text-gray-900 dark:text-white">
                          {suggestion.text}
                        </span>
                        {suggestion.type !== 'suggestion' && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 capitalize">
                            {suggestion.type}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>2,847 public lists</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>156 active curators</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Updated daily</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};