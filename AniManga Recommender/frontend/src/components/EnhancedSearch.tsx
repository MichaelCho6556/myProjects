// ABOUTME: Enhanced unified search component with intelligent search type detection and improved UX
// ABOUTME: Provides seamless search interface that automatically detects media vs user searches

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { sanitizeSearchInput } from "../utils/security";
import { logger } from "../utils/logger";
import { SearchIcon } from "./common/Icons";
import "./EnhancedSearch.css";

interface SearchSuggestion {
  id: string;
  title: string;
  type: "anime" | "manga" | "user";
  subtitle?: string;
  image?: string;
  url: string; // Direct navigation URL
}

interface EnhancedSearchProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string, type: "media" | "users") => void;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({ className = "", onSearch }) => {
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const api = useAuthenticatedApi();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize search value from URL only on mount
  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam) {
      setSearchValue(queryParam);
    }
  }, []); // Empty dependency array - only run on mount

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Unified fetch suggestions that gets both media and users
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      const allSuggestions: SearchSuggestion[] = [];

      // Check if this is a user-specific search
      const isUserSearch = query.startsWith("@");
      const searchQuery = isUserSearch ? query.substring(1) : query;

      // If query is just "@", don't search yet
      if (isUserSearch && searchQuery.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
        return;
      }

      try {
        if (isUserSearch) {
          // Only search for users when @ is used
          const usersResponse = await api.get(
            `/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=6`
          );
          const users = usersResponse.users || [];

          const userSuggestions: SearchSuggestion[] = users.map((user: any) => ({
            id: user.username,
            title: user.displayName || user.username,
            type: "user" as const,
            subtitle: `@${user.username} • ${user.completedAnime || 0} anime completed`,
            image: user.avatarUrl,
            url: `/users/${user.username}`,
          }));
          allSuggestions.push(...userSuggestions);
        } else {
          // Fetch both media and users in parallel for general search
          const [mediaResponse, usersResponse] = await Promise.allSettled([
            api.get(`/api/items?q=${encodeURIComponent(query)}&per_page=3`),
            api.get(`/api/users/search?q=${encodeURIComponent(query)}&limit=3`),
          ]);

          // Process media results
          if (mediaResponse.status === "fulfilled") {
            const items = mediaResponse.value.items || [];
            const mediaSuggestions: SearchSuggestion[] = items.map((item: any) => ({
              id: item.uid,
              title: item.title,
              type: item.media_type?.toLowerCase() || "anime",
              subtitle: `${item.media_type} • Score: ${item.score || "N/A"}`,
              image: item.image_url,
              url: `/items/${item.uid}`,
            }));
            allSuggestions.push(...mediaSuggestions);
          }

          // Process user results
          if (usersResponse.status === "fulfilled") {
            const users = usersResponse.value.users || [];
            const userSuggestions: SearchSuggestion[] = users.map((user: any) => ({
              id: user.username,
              title: user.displayName || user.username,
              type: "user" as const,
              subtitle: `@${user.username} • ${user.completedAnime || 0} anime completed`,
              image: user.avatarUrl,
              url: `/users/${user.username}`,
            }));
            allSuggestions.push(...userSuggestions);
          }
        }

        // Sort suggestions: prioritize exact matches, then by relevance
        allSuggestions.sort((a, b) => {
          const searchTerm = isUserSearch ? searchQuery.toLowerCase() : query.toLowerCase();
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();

          // Exact matches first
          if (aTitle === searchTerm && bTitle !== searchTerm) return -1;
          if (bTitle === searchTerm && aTitle !== searchTerm) return 1;

          // Starts with query second
          if (aTitle.startsWith(searchTerm) && !bTitle.startsWith(searchTerm)) return -1;
          if (bTitle.startsWith(searchTerm) && !aTitle.startsWith(searchTerm)) return 1;

          // For general search, prioritize media items; for user search, users are already filtered
          if (!isUserSearch) {
            if (a.type !== "user" && b.type === "user") return -1;
            if (b.type !== "user" && a.type === "user") return 1;
          }

          return 0;
        });

        setSuggestions(allSuggestions.slice(0, 6)); // Limit to 6 total suggestions
        setShowSuggestions(true);
      } catch (error) {
        logger.error("Failed to fetch suggestions", {
          error: error instanceof Error ? error.message : "Unknown error",
          context: "EnhancedSearch",
          operation: "fetchSuggestions",
          query: query
        });
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value; // Don't sanitize immediately to allow normal typing
    setSearchValue(value);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for suggestions
    debounceTimeoutRef.current = setTimeout(() => {
      const sanitizedValue = sanitizeSearchInput(value);
      if (sanitizedValue.trim()) {
        fetchSuggestions(sanitizedValue.trim());
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  };

  const handleInputFocus = () => {
    if (searchValue.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const sanitizedValue = sanitizeSearchInput(searchValue);
    if (!sanitizedValue.trim()) return;

    performSearch(sanitizedValue.trim());
  };

  const performSearch = (query: string) => {
    setShowSuggestions(false);

    // Check if user is using @ symbol to search for users specifically
    const isUserSearch = query.startsWith("@");
    const cleanQuery = isUserSearch ? query.substring(1) : query;

    if (onSearch) {
      onSearch(cleanQuery, isUserSearch ? "users" : "media");
      return;
    }

    // Navigate based on search type
    if (isUserSearch) {
      navigate(`/search/users?q=${encodeURIComponent(cleanQuery)}`);
    } else {
      // Default to media search (home page)
      const params = new URLSearchParams(searchParams);
      params.set("q", query);
      params.set("page", "1");
      navigate(`/?${params.toString()}`);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    navigate(suggestion.url);
    setShowSuggestions(false);
    // Keep the search value to show what was searched
    setSearchValue(suggestion.title);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const getPlaceholderText = () => {
    return "Search anime, manga, or @users...";
  };

  const renderSuggestionIcon = (type: string) => {
    switch (type) {
      case "user":
        return "👤";
      case "anime":
        return "📺";
      case "manga":
        return "📚";
      default:
        return "🎬";
    }
  };

  return (
    <div className={`enhanced-search ${className}`} ref={searchRef}>
      <form onSubmit={handleSubmit} className="search-form">
        {/* Unified Search Input */}
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
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
              <SearchIcon className="search-icon" size={16} />
            )}
          </button>
        </div>

        {/* Hidden help text for accessibility */}
        <span id="search-help" className="sr-only">
          Search for anime, manga titles, or use @username to search for users
        </span>
      </form>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected="false"
            >
              <div className="suggestion-content">
                {suggestion.image && (
                  <img src={suggestion.image} alt="" className="suggestion-image" loading="lazy" />
                )}
                <div className="suggestion-text">
                  <div className="suggestion-title">{suggestion.title}</div>
                  {suggestion.subtitle && <div className="suggestion-subtitle">{suggestion.subtitle}</div>}
                </div>
                <div className="suggestion-type">{renderSuggestionIcon(suggestion.type)}</div>
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
            <div className="no-results-text">No results found</div>
            <div className="no-results-subtitle">
              Try different keywords or use @username to search for users
            </div>
          </div>
        </div>
      )}

      {/* Search tip for users - only show when there are suggestions and it's not a user search */}
      {showSuggestions && suggestions.length > 0 && searchValue.trim() && !searchValue.startsWith("@") && (
        <div className="search-tip">
          <span className="tip-icon">💡</span>
          <span className="tip-text">Tip: Use @username to search for users specifically</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;
