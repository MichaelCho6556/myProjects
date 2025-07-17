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
      {/* Compact Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
        <div className="bg-black/10 backdrop-blur-sm py-8 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left Side - Title & Stats */}
              <div className="text-white">
                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  Discover Amazing Lists
                </h1>
                <p className="text-lg text-white/90 mb-6">
                  Explore curated anime and manga collections
                </p>
                
                {/* Inline Stats */}
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">2,847</div>
                      <div className="text-sm text-white/80">public lists</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">156</div>
                      <div className="text-sm text-white/80">active curators</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white/80">Updated daily</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Search Input */}
              <div className="relative">
                <div className={`relative transition-all duration-300 ${
                  isFocused 
                    ? 'transform scale-105 shadow-2xl' 
                    : 'shadow-lg hover:shadow-xl'
                }`}>
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-500" />
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
                    className="block w-full pl-14 pr-14 py-4 text-base border-0 rounded-xl 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             ring-2 ring-white/20 dark:ring-gray-700
                             focus:ring-4 focus:ring-white/40 focus:ring-opacity-50
                             placeholder-gray-500 dark:placeholder-gray-400
                             transition-all duration-300"
                    autoComplete="off"
                  />
                  
                  {searchTerm && (
                    <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};