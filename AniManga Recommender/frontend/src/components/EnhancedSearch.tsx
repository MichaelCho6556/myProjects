// ABOUTME: Enhanced search component with media/user search differentiation and intelligent search routing
// ABOUTME: Provides unified search interface with dropdown selector for search type and proper result handling

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { sanitizeSearchInput } from '../utils/security';
import './EnhancedSearch.css';

type SearchType = 'media' | 'users';

interface SearchSuggestion {
  id: string;
  title: string;
  type: 'anime' | 'manga' | 'user';
  subtitle?: string;
  image?: string;
}

interface EnhancedSearchProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string, type: SearchType) => void;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  className = "",
  onSearch
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('media');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const api = useAuthenticatedApi();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize search value from URL
  useEffect(() => {
    const queryParam = searchParams.get('q');
    const userParam = searchParams.get('user');
    
    if (queryParam) {
      setSearchValue(queryParam);
      setSearchType('media');
    } else if (userParam) {
      setSearchValue(userParam);
      setSearchType('users');
    }
  }, [searchParams]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions
  const fetchSuggestions = async (query: string, type: SearchType) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      if (type === 'media') {
        // Search for anime/manga
        const response = await api.get(`/api/items?q=${encodeURIComponent(query)}&per_page=5`);
        const items = response.items || [];
        
        const mediaSuggestions: SearchSuggestion[] = items.map((item: any) => ({
          id: item.uid,
          title: item.title,
          type: item.media_type?.toLowerCase() || 'anime',
          subtitle: `${item.media_type} • Score: ${item.score || 'N/A'}`,
          image: item.image_url
        }));
        
        setSuggestions(mediaSuggestions);
      } else {
        // Search for users
        const response = await api.get(`/api/users/search?q=${encodeURIComponent(query)}&limit=5`);
        const users = response.users || [];
        
        const userSuggestions: SearchSuggestion[] = users.map((user: any) => ({
          id: user.username,
          title: user.displayName || user.username,
          type: 'user' as const,
          subtitle: `@${user.username} • ${user.completedAnime || 0} anime completed`,
          image: user.avatarUrl
        }));
        
        setSuggestions(userSuggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeSearchInput(event.target.value);
    setSearchValue(value);

    // Debounce suggestions
    const timeoutId = setTimeout(() => {
      if (value.trim()) {
        fetchSuggestions(value.trim(), searchType);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchValue.trim()) return;

    performSearch(searchValue.trim(), searchType);
  };

  const performSearch = (query: string, type: SearchType) => {
    setShowSuggestions(false);

    if (onSearch) {
      onSearch(query, type);
      return;
    }

    // Navigate to appropriate search results
    if (type === 'media') {
      const params = new URLSearchParams(searchParams);
      params.set('q', query);
      params.set('page', '1');
      params.delete('user'); // Clear user search param
      navigate(`/?${params.toString()}`);
    } else {
      // Navigate to search results page for users
      navigate(`/search/users?q=${encodeURIComponent(query)}`);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'user') {
      navigate(`/users/${suggestion.id}`);
    } else {
      navigate(`/items/${suggestion.id}`);
    }
    setShowSuggestions(false);
    setSearchValue('');
  };

  const handleTypeChange = (type: SearchType) => {
    setSearchType(type);
    setSearchValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const getPlaceholderText = () => {
    return searchType === 'media' 
      ? "Search anime and manga..." 
      : "Search users and profiles...";
  };

  return (
    <div className={`enhanced-search ${className}`} ref={searchRef}>
      <form onSubmit={handleSubmit} className="search-form">
        {/* Search Type Selector */}
        <div className="search-type-selector">
          <button
            type="button"
            className={`type-button ${searchType === 'media' ? 'active' : ''}`}
            onClick={() => handleTypeChange('media')}
            aria-label="Search for anime and manga"
          >
            <span className="type-icon">🎬</span>
            <span className="type-label">Media</span>
          </button>
          <button
            type="button"
            className={`type-button ${searchType === 'users' ? 'active' : ''}`}
            onClick={() => handleTypeChange('users')}
            aria-label="Search for users and profiles"
          >
            <span className="type-icon">👥</span>
            <span className="type-label">Users</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={handleInputChange}
            placeholder={getPlaceholderText()}
            className="search-input"
            aria-describedby="search-help"
            maxLength={100}
            autoComplete="off"
          />
          <button type="submit" className="search-submit-btn" aria-label="Submit search">
            {isLoading ? (
              <div className="search-spinner" aria-hidden="true" />
            ) : (
              <span className="search-icon">🔍</span>
            )}
          </button>
        </div>

        {/* Hidden help text for accessibility */}
        <span id="search-help" className="sr-only">
          {searchType === 'media' 
            ? "Search for anime and manga titles, authors, or studios"
            : "Search for user profiles by username or display name"
          }
        </span>
      </form>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected="false"
            >
              <div className="suggestion-content">
                {suggestion.image && (
                  <img 
                    src={suggestion.image} 
                    alt=""
                    className="suggestion-image"
                    loading="lazy"
                  />
                )}
                <div className="suggestion-text">
                  <div className="suggestion-title">{suggestion.title}</div>
                  {suggestion.subtitle && (
                    <div className="suggestion-subtitle">{suggestion.subtitle}</div>
                  )}
                </div>
                <div className="suggestion-type">
                  {suggestion.type === 'user' ? '👤' : suggestion.type === 'anime' ? '📺' : '📚'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results state */}
      {showSuggestions && !isLoading && suggestions.length === 0 && searchValue.length >= 2 && (
        <div className="search-no-results">
          <div className="no-results-content">
            <div className="no-results-icon">😔</div>
            <div className="no-results-text">
              No {searchType === 'media' ? 'anime or manga' : 'users'} found
            </div>
            <div className="no-results-subtitle">
              Try a different search term or check spelling
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;