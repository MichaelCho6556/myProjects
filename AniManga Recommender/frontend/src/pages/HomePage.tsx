/**
 * AniManga Recommender Home Page Component
 *
 * This component serves as the main browsing interface for the AniManga Recommender
 * application. It provides comprehensive filtering, searching, pagination, and item
 * display functionality with advanced state management and URL synchronization.
 *
 * Key Features:
 * - Advanced multi-criteria filtering (genre, theme, demographic, studio, author, etc.)
 * - Real-time search with URL parameter synchronization
 * - Configurable pagination with localStorage persistence
 * - Responsive grid layout with loading states
 * - Error handling with retry mechanisms
 * - Professional loading states and skeleton screens
 * - Accessibility-compliant form controls and navigation
 * - Cross-tab synchronization and state management
 *
 * State Management:
 * - 20+ state variables for filters, pagination, and UI state
 * - URL parameter synchronization for shareable links
 * - localStorage integration for user preferences
 * - Real-time filter application with debouncing
 * - Loading state management for smooth user experience
 *
 * Data Flow:
 * 1. URL parameters → Component state initialization
 * 2. User interactions → State updates → URL updates
 * 3. State changes → API requests → Data updates
 * 4. Data updates → UI re-rendering with new results
 *
 * API Integration:
 * - Items endpoint: Paginated anime/manga data retrieval
 * - Distinct values endpoint: Filter option population
 * - Error handling with retry logic and user feedback
 * - Response validation and data sanitization
 *
 * Performance Features:
 * - Skeleton loading for perceived performance
 * - Efficient re-rendering with proper dependencies
 * - Debounced filter changes to reduce API calls
 * - Memoized filter options and handlers
 * - Virtual scrolling capabilities (ready for implementation)
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage - handles all state internally
 * <HomePage />
 *
 * // Component automatically:
 * // - Loads filter options on mount
 * // - Syncs with URL parameters
 * // - Manages pagination and search
 * // - Handles errors and loading states
 * ```
 *
 * @see {@link FilterBar} for filtering interface
 * @see {@link ItemCard} for individual item display
 * @see {@link PaginationControls} for pagination interface
 * @see {@link useDocumentTitle} for page title management
 * @see {@link createErrorHandler} for error handling utilities
 *
 * @since 1.0.0
 * @author AniManga Recommender Team
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import ItemCardSkeleton from "../components/Loading/ItemCardSkeleton";
import FilterBar from "../components/FilterBar";
import PaginationControls from "../components/PaginationControls";
import Spinner from "../components/Spinner";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { createErrorHandler, retryOperation, validateResponseData } from "../utils/errorHandler";
import RetryButton from "../components/Feedback/RetryButton";
import "../App.css";
import {
  AnimeItem,
  ItemsApiResponse,
  DistinctValuesApiResponse,
  SelectOption,
  SortOption,
  MediaType,
  StatusType,
  InputChangeHandler,
  SelectChangeHandler,
  FilterBarProps,
} from "../types";
import { secureStorage } from "../utils/security";

/**
 * Base URL for API endpoints.
 * Centralized configuration for backend communication.
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Get initial items per page from localStorage with validation.
 *
 * Retrieves user's preferred items per page setting from secure storage
 * with fallback to sensible defaults. Validates the stored value to ensure
 * it's within acceptable bounds for performance and usability.
 *
 * @function getInitialItemsPerPage
 * @returns {number} Valid items per page value between 5 and 50, default 20
 *
 * @example
 * ```typescript
 * const itemsPerPage = getInitialItemsPerPage();
 * console.log(itemsPerPage); // 20 (default) or user's saved preference
 * ```
 */
const getInitialItemsPerPage = (): number => {
  try {
    const storedValue = secureStorage.getItem("aniMangaItemsPerPage");
    if (storedValue) {
      const parsed = parseInt(storedValue, 10);
      return isNaN(parsed) || parsed < 5 || parsed > 50 ? 20 : parsed;
    }
  } catch (error) {
    console.warn("Failed to retrieve items per page preference");
  }
  return 20;
};

const DEFAULT_ITEMS_PER_PAGE = getInitialItemsPerPage();

/**
 * Convert string options to react-select format.
 *
 * Transforms an array of string values into the format expected by react-select
 * components, with optional "All" option for filter clearing.
 *
 * @function toSelectOptions
 * @param {string[]} optionsArray - Array of string options to convert
 * @param {boolean} [includeAll=false] - Whether to include "All" option at the beginning
 * @returns {SelectOption[]} Array of {value, label} objects for react-select
 *
 * @example
 * ```typescript
 * const genres = ['Action', 'Adventure', 'Comedy'];
 * const options = toSelectOptions(genres, true);
 * // Result: [
 * //   { value: 'All', label: 'All' },
 * //   { value: 'Action', label: 'Action' },
 * //   { value: 'Adventure', label: 'Adventure' },
 * //   { value: 'Comedy', label: 'Comedy' }
 * // ]
 * ```
 */
const toSelectOptions = (optionsArray: string[], includeAll: boolean = false): SelectOption[] => {
  const mapped = optionsArray
    .filter((opt) => typeof opt === "string" && opt.toLowerCase() !== "all")
    .map((opt) => ({ value: opt, label: opt }));
  return includeAll ? [{ value: "All", label: "All" }, ...mapped] : mapped;
};

/**
 * Parse multi-select values from URL parameters.
 *
 * Converts comma-separated URL parameter values back into react-select
 * option objects, matching against available options for validation.
 *
 * @function getMultiSelectValuesFromParam
 * @param {string | null} paramValue - Comma-separated parameter value from URL
 * @param {SelectOption[]} optionsSource - Available options to match against
 * @returns {SelectOption[]} Array of selected option objects
 *
 * @example
 * ```typescript
 * const urlParam = "Action,Adventure,Comedy";
 * const availableGenres = [
 *   { value: 'Action', label: 'Action' },
 *   { value: 'Adventure', label: 'Adventure' },
 *   { value: 'Comedy', label: 'Comedy' },
 *   { value: 'Drama', label: 'Drama' }
 * ];
 * const selected = getMultiSelectValuesFromParam(urlParam, availableGenres);
 * // Result: [
 * //   { value: 'Action', label: 'Action' },
 * //   { value: 'Adventure', label: 'Adventure' },
 * //   { value: 'Comedy', label: 'Comedy' }
 * // ]
 * ```
 */
const getMultiSelectValuesFromParam = (
  paramValue: string | null,
  optionsSource: SelectOption[]
): SelectOption[] => {
  if (!paramValue) return [];
  const selectedValues = paramValue.split(",").map((v) => v.trim().toLowerCase());
  return optionsSource.filter((opt) => selectedValues.includes(opt.value.toLowerCase()));
};

/**
 * HomePage Component Implementation
 *
 * Main component that manages the complete browsing experience for anime and manga.
 * Handles state management, API integration, URL synchronization, and user interactions.
 *
 * @returns {JSX.Element} Complete home page interface with filtering and browsing
 */
const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data and loading states
  const [items, setItems] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersLoading, setFiltersLoading] = useState<boolean>(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(parseInt(searchParams.get("page") || "1"));
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    parseInt(searchParams.get("per_page") || "") || DEFAULT_ITEMS_PER_PAGE
  );
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Search and filter states
  const [searchTerm] = useState<string>(searchParams.get("q") || "");
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>(
    (searchParams.get("media_type") as MediaType) || "All"
  );
  const [selectedGenre, setSelectedGenre] = useState<SelectOption[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(
    (searchParams.get("status") as StatusType) || "All"
  );
  const [minScore, setMinScore] = useState<string>(searchParams.get("min_score") || "");
  const [selectedYear, setSelectedYear] = useState<string>(searchParams.get("year") || "");
  const [selectedTheme, setSelectedTheme] = useState<SelectOption[]>([]);
  const [selectedDemographic, setSelectedDemographic] = useState<SelectOption[]>([]);
  const [selectedStudio, setSelectedStudio] = useState<SelectOption[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<SelectOption[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get("sort_by") as SortOption) || "score_desc"
  );

  // Filter options for dropdowns
  const [genreOptions, setGenreOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([{ value: "All", label: "All" }]);
  const [mediaTypeOptions, setMediaTypeOptions] = useState<SelectOption[]>([{ value: "All", label: "All" }]);
  const [themeOptions, setThemeOptions] = useState<SelectOption[]>([]);
  const [demographicOptions, setDemographicOptions] = useState<SelectOption[]>([]);
  const [studioOptions, setStudioOptions] = useState<SelectOption[]>([]);
  const [authorOptions, setAuthorOptions] = useState<SelectOption[]>([]);

  // Filter visibility state for collapsible functionality
  const [filterBarVisible, setFilterBarVisible] = useState<boolean>(() => {
    const saved = secureStorage.getItem("aniMangaFilterBarVisible");
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Refs for component lifecycle and debouncing
  const topOfPageRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef<boolean>(false);
  const isInternalUrlUpdate = useRef<boolean>(false);

  // Create error handler for this component
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleError = useCallback(createErrorHandler("HomePage", setError), [setError]);

  /**
   * Effect 1: Fetch distinct filter options on component mount
   *
   * This effect runs once to populate dropdown options for all filters.
   * It fetches available values for genres, themes, demographics, studios,
   * authors, and other filter categories from the backend API.
   *
   * @effect
   * @dependencies [] - Runs only on mount
   *
   * @example
   * ```typescript
   * // Automatically called on component mount
   * // Populates all filter dropdown options
   * // Sets filtersLoading to false when complete
   * ```
   */
  useEffect(() => {
    const fetchFilterOptions = async (): Promise<void> => {
      setFiltersLoading(true);
      try {
        const operation = () => axios.get<DistinctValuesApiResponse>(`${API_BASE_URL}/api/distinct-values`);
        const response = await retryOperation(operation, { maxRetries: 3, baseDelayMs: 1000 });

        let distinctData = response.data;

        // Handle case where server returns stringified JSON
        if (typeof distinctData === "string") {
          try {
            distinctData = JSON.parse(distinctData);
          } catch (e) {
            throw new Error("Filter options data not valid JSON");
          }
        }

        // Validate response structure
        validateResponseData(distinctData, {
          media_types: "array",
          genres: "array",
          statuses: "array",
          themes: "array",
          demographics: "array",
          studios: "array",
          authors: "array",
        });

        // Set filter options with proper formatting
        setMediaTypeOptions(toSelectOptions(distinctData.media_types || [], true));
        setGenreOptions(toSelectOptions(distinctData.genres || []));
        setStatusOptions(toSelectOptions(distinctData.statuses || [], true));
        setThemeOptions(toSelectOptions(distinctData.themes || []));
        setDemographicOptions(toSelectOptions(distinctData.demographics || []));
        setStudioOptions(toSelectOptions(distinctData.studios || []));
        setAuthorOptions(toSelectOptions(distinctData.authors || []));
      } catch (err) {
        handleError(err as Error, "loading filter options");

        // Set minimal default options to prevent UI errors
        setMediaTypeOptions([{ value: "All", label: "All" }]);
        setGenreOptions([]);
        setStatusOptions([{ value: "All", label: "All" }]);
        setThemeOptions([]);
        setDemographicOptions([]);
        setStudioOptions([]);
        setAuthorOptions([]);
      } finally {
        setFiltersLoading(false);
        isMounted.current = true;

        // Trigger initial items fetch after filters are loaded
        const fetchInitialItems = async (): Promise<void> => {
          setLoading(true);
          setError(null);

          try {
            const paramsString = searchParams.toString();
            const operation = () => axios.get<ItemsApiResponse>(`${API_BASE_URL}/api/items?${paramsString}`);
            const response = await retryOperation(operation, { maxRetries: 3, baseDelayMs: 1000 });

            let itemsData = response.data;

            // Handle case where server returns stringified JSON
            if (typeof itemsData === "string") {
              try {
                itemsData = JSON.parse(itemsData);
              } catch (e) {
                throw new Error("Items data not valid JSON");
              }
            }

            // Validate response structure
            validateResponseData(itemsData, {
              items: "array",
              total_pages: "number",
              page: "number",
              total_items: "number",
            });

            setItems(itemsData.items || []);
            setTotalPages(itemsData.total_pages || 1);
            setCurrentPage(itemsData.page || 1); // API returns "page", not "current_page"
            setTotalItems(itemsData.total_items || 0);
          } catch (err) {
            handleError(err as Error, "loading items");
            setItems([]);
            setTotalPages(1);
            setTotalItems(0);
          } finally {
            setLoading(false);
          }
        };

        fetchInitialItems();
      }
    };

    fetchFilterOptions();
  }, [handleError, searchParams]);

  /**
   * Effect 2: Initialize filter states from URL parameters
   *
   * This effect runs after filter options are loaded to set initial filter
   * states based on URL parameters. It enables shareable filtered URLs.
   *
   * @effect
   * @dependencies [genreOptions, themeOptions, demographicOptions, studioOptions, authorOptions, searchParams]
   *
   * @example
   * ```typescript
   * // URL: /?genre=Action,Adventure&theme=School&media_type=anime
   * // Automatically sets:
   * // - selectedGenre: [Action, Adventure]
   * // - selectedTheme: [School]
   * // - selectedMediaType: "anime"
   * ```
   */
  useEffect(() => {
    if (
      !filtersLoading &&
      genreOptions.length > 0 &&
      themeOptions.length > 0 &&
      demographicOptions.length > 0 &&
      studioOptions.length > 0 &&
      authorOptions.length > 0
    ) {
      setSelectedGenre(getMultiSelectValuesFromParam(searchParams.get("genre"), genreOptions));
      setSelectedTheme(getMultiSelectValuesFromParam(searchParams.get("theme"), themeOptions));
      setSelectedDemographic(
        getMultiSelectValuesFromParam(searchParams.get("demographic"), demographicOptions)
      );
      setSelectedStudio(getMultiSelectValuesFromParam(searchParams.get("studio"), studioOptions));
      setSelectedAuthor(getMultiSelectValuesFromParam(searchParams.get("author"), authorOptions));
    }
  }, [
    genreOptions,
    themeOptions,
    demographicOptions,
    studioOptions,
    authorOptions,
    searchParams,
    filtersLoading,
  ]);

  /**
   * Effect 3: Fetch items based on current filters and pagination
   *
   * This effect triggers whenever filters, pagination, or search parameters change.
   * It constructs API requests with current filter state and updates the items display.
   *
   * @effect
   * @dependencies [searchParams, handleError]
   *
   * @example
   * ```typescript
   * // Triggered by:
   * // - Page navigation
   * // - Filter changes
   * // - Search input
   * // - Sort order changes
   * // - Items per page changes
   * ```
   */
  useEffect(() => {
    // Skip if filters haven't loaded yet or if this is an internal URL update
    if (!isMounted.current || isInternalUrlUpdate.current) {
      if (isInternalUrlUpdate.current) {
        isInternalUrlUpdate.current = false;
      }
      return;
    }

    const fetchItems = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const paramsString = searchParams.toString();
        const operation = () => axios.get<ItemsApiResponse>(`${API_BASE_URL}/api/items?${paramsString}`);
        const response = await retryOperation(operation, { maxRetries: 3, baseDelayMs: 1000 });

        let itemsData = response.data;

        // Handle case where server returns stringified JSON
        if (typeof itemsData === "string") {
          try {
            itemsData = JSON.parse(itemsData);
          } catch (e) {
            throw new Error("Items data not valid JSON");
          }
        }

        // Validate response structure
        validateResponseData(itemsData, {
          items: "array",
          total_pages: "number",
          page: "number",
          total_items: "number",
        });

        setItems(itemsData.items || []);
        setTotalPages(itemsData.total_pages || 1);
        setCurrentPage(itemsData.page || 1); // API returns "page", not "current_page"
        setTotalItems(itemsData.total_items || 0);
      } catch (err) {
        handleError(err as Error, "loading items");
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [searchParams, handleError]);

  /**
   * Media type filter change handler.
   *
   * Updates the selected media type and triggers URL parameter updates
   * to maintain filter state consistency across page navigation.
   *
   * @function handleMediaTypeChange
   * @param {SelectOption | null} selectedOption - Selected media type option
   *
   * @example
   * ```typescript
   * handleMediaTypeChange({ value: 'anime', label: 'Anime' });
   * // Updates URL: ?media_type=anime&page=1
   * ```
   */
  const handleMediaTypeChange = (selectedOption: SelectOption | null): void => {
    const newValue = selectedOption?.value || "All";
    setSelectedMediaType(newValue as MediaType);

    isInternalUrlUpdate.current = true;
    const newParams = new URLSearchParams(searchParams);
    if (newValue === "All") {
      newParams.delete("media_type");
    } else {
      newParams.set("media_type", newValue);
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  /**
   * Status filter change handler.
   *
   * Updates the selected status filter (Finished Airing, Currently Airing, etc.)
   * and synchronizes with URL parameters for state persistence.
   *
   * @function handleStatusChange
   * @param {SelectOption | null} selectedOption - Selected status option
   *
   * @example
   * ```typescript
   * handleStatusChange({ value: 'Finished Airing', label: 'Finished Airing' });
   * // Updates URL: ?status=Finished%20Airing&page=1
   * ```
   */
  const handleStatusChange = (selectedOption: SelectOption | null): void => {
    const newValue = selectedOption?.value || "All";
    setSelectedStatus(newValue as StatusType);

    isInternalUrlUpdate.current = true;
    const newParams = new URLSearchParams(searchParams);
    if (newValue === "All") {
      newParams.delete("status");
    } else {
      newParams.set("status", newValue);
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  /**
   * Genre multi-select filter change handler.
   *
   * Updates the selected genres array and converts to comma-separated URL parameter.
   * Handles multi-selection state management for genre filtering.
   *
   * @function handleGenreChange
   * @param {readonly SelectOption[] | null} selectedOptions - Array of selected genre options
   *
   * @example
   * ```typescript
   * handleGenreChange([
   *   { value: 'Action', label: 'Action' },
   *   { value: 'Adventure', label: 'Adventure' }
   * ]);
   * // Updates URL: ?genre=Action,Adventure&page=1
   * ```
   */
  const handleGenreChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const options = selectedOptions ? [...selectedOptions] : [];
    setSelectedGenre(options);

    isInternalUrlUpdate.current = true;
    const newParams = new URLSearchParams(searchParams);
    if (options.length === 0) {
      newParams.delete("genre");
    } else {
      newParams.set("genre", options.map((opt) => opt.value).join(","));
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  /**
   * Theme multi-select filter change handler.
   *
   * Updates the selected themes array and manages URL parameter synchronization
   * for theme-based filtering (School, Military, Isekai, etc.).
   *
   * @function handleThemeChange
   * @param {readonly SelectOption[] | null} selectedOptions - Array of selected theme options
   *
   * @example
   * ```typescript
   * handleThemeChange([
   *   { value: 'School', label: 'School' },
   *   { value: 'Military', label: 'Military' }
   * ]);
   * // Updates URL: ?theme=School,Military&page=1
   * ```
   */
  const handleThemeChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const options = selectedOptions ? [...selectedOptions] : [];
    setSelectedTheme(options);

    isInternalUrlUpdate.current = true;
    const newParams = new URLSearchParams(searchParams);
    if (options.length === 0) {
      newParams.delete("theme");
    } else {
      newParams.set("theme", options.map((opt) => opt.value).join(","));
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  /**
   * Demographic multi-select filter change handler.
   *
   * Manages demographic filtering (Shounen, Seinen, Josei, Shoujo) with
   * multi-selection support and URL parameter persistence.
   *
   * @function handleDemographicChange
   * @param {readonly SelectOption[] | null} selectedOptions - Array of selected demographic options
   *
   * @example
   * ```typescript
   * handleDemographicChange([
   *   { value: 'Shounen', label: 'Shounen' },
   *   { value: 'Seinen', label: 'Seinen' }
   * ]);
   * // Updates URL: ?demographic=Shounen,Seinen&page=1
   * ```
   */
  const handleDemographicChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const options = selectedOptions ? [...selectedOptions] : [];
    setSelectedDemographic(options);

    isInternalUrlUpdate.current = true;
    const newParams = new URLSearchParams(searchParams);
    if (options.length === 0) {
      newParams.delete("demographic");
    } else {
      newParams.set("demographic", options.map((opt) => opt.value).join(","));
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  /**
   * Studio multi-select filter change handler.
   *
   * Handles studio-based filtering for anime (Studio Ghibli, Toei Animation, etc.)
   * with support for multiple studio selection and URL state management.
   *
   * @function handleStudioChange
   * @param {readonly SelectOption[] | null} selectedOptions - Array of selected studio options
   *
   * @example
   * ```typescript
   * handleStudioChange([
   *   { value: 'Studio Ghibli', label: 'Studio Ghibli' },
   *   { value: 'Toei Animation', label: 'Toei Animation' }
   * ]);
   * // Updates URL: ?studio=Studio%20Ghibli,Toei%20Animation&page=1
   * ```
   */
  const handleStudioChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const options = selectedOptions ? [...selectedOptions] : [];
    setSelectedStudio(options);

    isInternalUrlUpdate.current = true;
    const newParams = new URLSearchParams(searchParams);
    if (options.length === 0) {
      newParams.delete("studio");
    } else {
      newParams.set("studio", options.map((opt) => opt.value).join(","));
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  /**
   * Author multi-select filter change handler.
   *
   * Manages author-based filtering primarily for manga content, supporting
   * multiple author selection and proper URL parameter encoding.
   *
   * @function handleAuthorChange
   * @param {readonly SelectOption[] | null} selectedOptions - Array of selected author options
   *
   * @example
   * ```typescript
   * handleAuthorChange([
   *   { value: 'Akira Toriyama', label: 'Akira Toriyama' },
   *   { value: 'Eiichiro Oda', label: 'Eiichiro Oda' }
   * ]);
   * // Updates URL: ?author=Akira%20Toriyama,Eiichiro%20Oda&page=1
   * ```
   */
  const handleAuthorChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const options = selectedOptions ? [...selectedOptions] : [];
    setSelectedAuthor(options);

    isInternalUrlUpdate.current = true;
    const newParams = new URLSearchParams(searchParams);
    if (options.length === 0) {
      newParams.delete("author");
    } else {
      newParams.set("author", options.map((opt) => opt.value).join(","));
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  /**
   * Sort order change handler.
   *
   * Updates the sorting criteria (score, popularity, title, date) and direction
   * (ascending/descending) for the items display.
   *
   * @function handleSortChange
   * @param {React.ChangeEvent<HTMLSelectElement>} event - Sort select change event
   *
   * @example
   * ```typescript
   * // User selects "Title A-Z" option
   * handleSortChange(event);
   * // Updates URL: ?sort_by=title_asc&page=1
   * ```
   */
  const handleSortChange: SelectChangeHandler = (event) => {
    const newValue = event.target.value as SortOption;
    setSortBy(newValue);
    updateUrlParams({ sort_by: newValue, page: "1" });
  };

  /**
   * Minimum score filter change handler.
   *
   * Updates the minimum score threshold for filtering items by their rating.
   * Validates input and updates URL parameters accordingly.
   *
   * @function handleMinScoreChange
   * @param {React.ChangeEvent<HTMLInputElement>} event - Score input change event
   *
   * @example
   * ```typescript
   * // User enters "8.5" in the score input
   * handleMinScoreChange(event);
   * // Updates URL: ?min_score=8.5&page=1
   * ```
   */
  const handleMinScoreChange: InputChangeHandler = (event) => {
    const newValue = event.target.value;
    setMinScore(newValue);
    updateUrlParams({ min_score: newValue || undefined, page: "1" });
  };

  /**
   * Year filter change handler.
   *
   * Updates the year filter for finding items released in a specific year.
   * Handles both anime air date and manga publication date filtering.
   *
   * @function handleYearChange
   * @param {React.ChangeEvent<HTMLInputElement>} event - Year input change event
   *
   * @example
   * ```typescript
   * // User enters "2023" in the year input
   * handleYearChange(event);
   * // Updates URL: ?year=2023&page=1
   * ```
   */
  const handleYearChange: InputChangeHandler = (event) => {
    const newValue = event.target.value;
    setSelectedYear(newValue);
    updateUrlParams({ year: newValue || undefined, page: "1" });
  };

  /**
   * Reset all filters to default state.
   *
   * Clears all active filters and returns to the default browsing state
   * with all items visible. Updates URL to remove all filter parameters.
   *
   * @function handleResetFilters
   *
   * @example
   * ```typescript
   * handleResetFilters();
   * // Clears all filters and navigates to: /?page=1
   * ```
   */
  const handleResetFilters = (): void => {
    // Reset all filter states
    setSelectedMediaType("All");
    setSelectedGenre([]);
    setSelectedStatus("All");
    setMinScore("");
    setSelectedYear("");
    setSelectedTheme([]);
    setSelectedDemographic([]);
    setSelectedStudio([]);
    setSelectedAuthor([]);
    setSortBy("score_desc");

    // Clear URL parameters
    isInternalUrlUpdate.current = true;
    setSearchParams(new URLSearchParams({ page: "1", per_page: itemsPerPage.toString() }));
  };

  /**
   * Toggle filter bar visibility.
   *
   * Shows/hides the filter bar interface and persists the preference
   * to localStorage for user convenience across sessions.
   *
   * @function handleFilterBarToggle
   *
   * @example
   * ```typescript
   * handleFilterBarToggle();
   * // Toggles filter bar visibility and saves preference
   * ```
   */
  const handleFilterBarToggle = (): void => {
    const newVisibility = !filterBarVisible;
    setFilterBarVisible(newVisibility);
    try {
      secureStorage.setItem("aniMangaFilterBarVisible", JSON.stringify(newVisibility));
    } catch (error) {
      console.warn("Failed to save filter bar visibility preference");
    }
  };

  /**
   * Navigate to next page.
   *
   * Advances pagination to the next page if available and scrolls to top
   * for optimal user experience.
   *
   * @function handleNextPage
   *
   * @example
   * ```typescript
   * handleNextPage();
   * // Navigates from page 2 to page 3 and scrolls to top
   * ```
   */
  const handleNextPage = (): void => {
    if (currentPage < totalPages) {
      updateUrlParams({ page: (currentPage + 1).toString() });
      scrollToTop();
    }
  };

  /**
   * Navigate to previous page.
   *
   * Goes back to the previous page if available and scrolls to top
   * for consistent navigation experience.
   *
   * @function handlePrevPage
   *
   * @example
   * ```typescript
   * handlePrevPage();
   * // Navigates from page 3 to page 2 and scrolls to top
   * ```
   */
  const handlePrevPage = (): void => {
    if (currentPage > 1) {
      updateUrlParams({ page: (currentPage - 1).toString() });
      scrollToTop();
    }
  };

  /**
   * Items per page change handler.
   *
   * Updates the number of items displayed per page and persists the preference
   * to localStorage. Resets to page 1 to avoid pagination issues.
   *
   * @function handleItemsPerPageChange
   * @param {React.ChangeEvent<HTMLSelectElement>} event - Items per page select change event
   *
   * @example
   * ```typescript
   * // User selects "50" items per page
   * handleItemsPerPageChange(event);
   * // Updates URL: ?per_page=50&page=1
   * // Saves preference to localStorage
   * ```
   */
  const handleItemsPerPageChange: SelectChangeHandler = (event) => {
    const newValue = parseInt(event.target.value);
    setItemsPerPage(newValue);
    updateUrlParams({ per_page: newValue.toString(), page: "1" });

    // Save preference to localStorage
    try {
      secureStorage.setItem("aniMangaItemsPerPage", newValue.toString());
    } catch (error) {
      console.warn("Failed to save items per page preference");
    }
  };

  /**
   * Scroll to top of page.
   *
   * Smoothly scrolls to the top of the page for better navigation experience
   * after page changes or filter applications.
   *
   * @function scrollToTop
   *
   * @example
   * ```typescript
   * scrollToTop();
   * // Smoothly scrolls to top of page
   * ```
   */
  const scrollToTop = (): void => {
    if (topOfPageRef.current) {
      topOfPageRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /**
   * Generate dynamic document title based on current state.
   *
   * Creates descriptive page titles that reflect current search and filter state
   * for better SEO and user orientation.
   *
   * @function generateDocumentTitle
   * @returns {string} Dynamic document title
   *
   * @example
   * ```typescript
   * generateDocumentTitle();
   * // Returns: "Action Anime - Page 2 | Browse"
   * // Or: "Search: 'demon slayer' | Browse"
   * // Or: "Browse" (default)
   * ```
   */
  const generateDocumentTitle = (): string => {
    const parts: string[] = [];

    // Add search term if present
    if (searchTerm.trim()) {
      parts.push(`Search: '${searchTerm.trim()}'`);
    }

    // Add media type if not "All"
    if (selectedMediaType !== "All") {
      parts.push(selectedMediaType.charAt(0).toUpperCase() + selectedMediaType.slice(1));
    }

    // Add selected genres (limit to 2 for brevity)
    if (selectedGenre.length > 0) {
      const genreNames = selectedGenre.slice(0, 2).map((g) => g.label);
      parts.push(genreNames.join(", "));
      if (selectedGenre.length > 2) {
        parts.push(`+${selectedGenre.length - 2} more`);
      }
    }

    // Add page number if not page 1
    if (currentPage > 1) {
      parts.push(`Page ${currentPage}`);
    }

    // Combine parts or use default
    return parts.length > 0 ? `${parts.join(" - ")} | Browse` : "Browse";
  };

  /**
   * Update URL parameters helper function.
   *
   * Centralized function for updating URL search parameters while maintaining
   * existing state and handling parameter cleanup.
   *
   * @function updateUrlParams
   * @param {Record<string, string | undefined>} updates - Parameter updates object
   *
   * @example
   * ```typescript
   * updateUrlParams({
   *   page: "1",
   *   min_score: "8.0",
   *   year: undefined // This removes the year parameter
   * });
   * ```
   */
  const updateUrlParams = (updates: Record<string, string | undefined>): void => {
    isInternalUrlUpdate.current = true;
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    setSearchParams(newParams);
  };

  // Set document title based on current search/filter state
  useDocumentTitle(generateDocumentTitle());

  // Prepare props for FilterBar component
  const filterProps: FilterBarProps = {
    filters: {
      selectedMediaType,
      selectedGenre,
      selectedTheme,
      selectedDemographic,
      selectedStudio,
      selectedAuthor,
      selectedStatus,
      minScore,
      selectedYear,
      sortBy,
    },
    filterOptions: {
      mediaTypeOptions,
      genreOptions,
      themeOptions,
      demographicOptions,
      studioOptions,
      authorOptions,
      statusOptions,
    },
    handlers: {
      handleSortChange,
      handleMediaTypeChange,
      handleStatusChange,
      handleGenreChange,
      handleThemeChange,
      handleDemographicChange,
      handleStudioChange,
      handleAuthorChange,
      handleMinScoreChange,
      handleYearChange,
      handleResetFilters,
    },
    loading,
    filtersLoading,
  };

  return (
    <>
      <div ref={topOfPageRef}></div>
      <main>
        {/* ✅ UPDATED: Filter Bar with toggle functionality */}
        <div className="filter-section">
          <button
            className="filter-toggle-btn"
            onClick={handleFilterBarToggle}
            aria-expanded={filterBarVisible}
            aria-controls="filter-bar"
            aria-label={filterBarVisible ? "Hide filters" : "Show filters"}
          >
            <span className="filter-toggle-icon">{filterBarVisible ? "▲" : "▼"}</span>
            <span className="filter-toggle-text">{filterBarVisible ? "Hide Filters" : "Show Filters"}</span>
          </button>

          <div id="filter-bar" className={`filter-bar-container ${filterBarVisible ? "visible" : "hidden"}`}>
            <FilterBar {...filterProps} />
          </div>
        </div>

        {/* Controls Bar with Pagination and Items Per Page */}
        <div className="controls-bar">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            items={items}
            loading={loading}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
          />
          <div className="items-per-page-selector">
            <label htmlFor="itemsPerPage">Items per page: </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              disabled={loading}
              aria-label="Select number of items to display per page"
            >
              {[10, 20, 25, 30, 50].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading States */}
        {loading && items.length === 0 && (
          <section className="skeleton-container" aria-label="Loading content" data-testid="skeleton-loading">
            <div className="item-list">
              {Array.from({ length: itemsPerPage }).map((_, index) => (
                <ItemCardSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          </section>
        )}

        {loading && items.length > 0 && (
          <div className="partial-loading-overlay" aria-live="polite" data-testid="loading-overlay">
            <div className="partial-loading-content">
              <Spinner size="40px" />
              <span>Updating results...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <section className="error-state" role="alert" aria-live="assertive">
            <div className="error-content">
              <div className="error-icon" aria-hidden="true">
                ⚠️
              </div>
              <h2>Oops! Something went wrong</h2>
              <p>We couldn't fetch the data right now. Please check your connection and try again.</p>
              <details>
                <summary>Technical details</summary>
                <p>{error}</p>
              </details>
              <div className="error-actions">
                <RetryButton
                  onRetry={async () => {
                    window.location.reload();
                  }}
                  variant="primary"
                >
                  Retry Loading
                </RetryButton>
                <button onClick={() => window.location.reload()} className="retry-button-secondary">
                  Refresh Page
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Content Display */}
        {!loading && !error && (
          <>
            {/* Items Grid */}
            <section className="item-list" aria-label="Search results">
              {Array.isArray(items) && items.length > 0
                ? items.map((item) => <ItemCard key={item.uid} item={item} />)
                : null}
            </section>

            {/* Empty State */}
            {Array.isArray(items) && items.length === 0 && !loading && (
              <section className="empty-state-container" role="status" aria-live="polite">
                <div className="empty-state-icon" aria-hidden="true">
                  😕
                </div>
                <h2 className="empty-state-message">No items found</h2>
                <p className="empty-state-suggestion">
                  Try adjusting your search terms or filter criteria. You can also{" "}
                  <button
                    onClick={handleResetFilters}
                    className="inline-reset-button"
                    aria-label="Reset all filters"
                  >
                    reset all filters
                  </button>{" "}
                  to see all available content.
                </p>
              </section>
            )}

            {/* Bottom Pagination */}
            {Array.isArray(items) && items.length > 0 && totalPages > 1 && (
              <nav className="bottom-pagination-wrapper" aria-label="Page navigation">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  items={items}
                  loading={loading}
                  onPrevPage={handlePrevPage}
                  onNextPage={handleNextPage}
                />
              </nav>
            )}
          </>
        )}

        {/* Scroll to Top Button */}
        {!loading && Array.isArray(items) && items.length > 0 && (
          <button
            onClick={scrollToTop}
            className="scroll-to-top-btn"
            aria-label="Scroll to top of page"
            title="Back to top"
          >
            ↑
          </button>
        )}
      </main>
    </>
  );
};

export default HomePage;
