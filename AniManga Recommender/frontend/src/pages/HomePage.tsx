import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import SkeletonCard from "../components/SkeletonCard";
import FilterBar from "../components/FilterBar";
import PaginationControls from "../components/PaginationControls";
import Spinner from "../components/Spinner";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { createErrorHandler, retryOperation, validateResponseData } from "../utils/errorHandler";
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
  FormSubmitHandler,
  FilterBarProps,
} from "../types";

const API_BASE_URL = "http://localhost:5000/api";
const DEBOUNCE_DELAY = 500;

/**
 * Get initial items per page from localStorage with validation
 * @returns Valid items per page value
 */
const getInitialItemsPerPage = (): number => {
  const storedValue = localStorage.getItem("aniMangaItemsPerPage");
  if (storedValue) {
    const parsedValue = parseInt(storedValue, 10);
    if ([10, 20, 25, 30, 50].includes(parsedValue)) {
      return parsedValue;
    }
  }
  return 30;
};

const DEFAULT_ITEMS_PER_PAGE = getInitialItemsPerPage();

/**
 * Helper function to convert string options to react-select format
 * @param optionsArray - Array of string options
 * @param includeAll - Whether to include "All" option
 * @returns Array of {value, label} objects
 */
const toSelectOptions = (optionsArray: string[], includeAll: boolean = false): SelectOption[] => {
  const mapped = optionsArray
    .filter((opt) => typeof opt === "string" && opt.toLowerCase() !== "all")
    .map((opt) => ({ value: opt, label: opt }));
  return includeAll ? [{ value: "All", label: "All" }, ...mapped] : mapped;
};

/**
 * Helper to parse multi-select values from URL parameters
 * @param paramValue - Comma-separated parameter value
 * @param optionsSource - Available options to match against
 * @returns Array of selected option objects
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
 * HomePage Component - Main page for browsing and filtering anime/manga
 *
 * Features:
 * - Advanced filtering with URL synchronization
 * - Pagination with configurable items per page
 * - Search functionality with debouncing
 * - Loading states and error handling
 * - Responsive design with accessibility
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
  const [inputValue, setInputValue] = useState<string>(searchParams.get("q") || "");
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("q") || "");
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

  // Refs for component lifecycle and debouncing
  const topOfPageRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef<boolean>(false);
  const isInternalUrlUpdate = useRef<boolean>(false);

  // Create error handler for this component
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleError = useCallback(createErrorHandler("HomePage", setError), [setError]);

  /**
   * Effect 1: Fetch distinct filter options on component mount
   * This runs once to populate dropdown options for all filters
   */
  useEffect(() => {
    const fetchFilterOptions = async (): Promise<void> => {
      setFiltersLoading(true);
      try {
        const operation = () => axios.get<DistinctValuesApiResponse>(`${API_BASE_URL}/distinct-values`);
        const response = await retryOperation(operation, 3, 1000);

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
      }
    };

    fetchFilterOptions();
  }, [handleError]);

  /**
   * Effect 2: Synchronize component state with URL parameters on mount
   * This ensures the UI reflects the current URL state when navigating from external links
   */
  useEffect(() => {
    if (filtersLoading) return; // Wait for filter options to load

    // Parse URL parameters once on mount or when filter options become available
    const urlParams = new URLSearchParams(window.location.search);

    setCurrentPage(parseInt(urlParams.get("page") || "1"));
    setItemsPerPage(parseInt(urlParams.get("per_page") || "") || DEFAULT_ITEMS_PER_PAGE);

    const query = urlParams.get("q") || "";
    setInputValue(query);
    setSearchTerm(query);

    setSelectedMediaType((urlParams.get("media_type") as MediaType) || "All");
    setSelectedStatus((urlParams.get("status") as StatusType) || "All");
    setMinScore(urlParams.get("min_score") || "");
    setSelectedYear(urlParams.get("year") || "");
    setSortBy((urlParams.get("sort_by") as SortOption) || "score_desc");

    // Set multi-select values from URL parameters only when options are available
    if (genreOptions.length > 0) {
      setSelectedGenre(getMultiSelectValuesFromParam(urlParams.get("genre"), genreOptions));
    }
    if (themeOptions.length > 0) {
      setSelectedTheme(getMultiSelectValuesFromParam(urlParams.get("theme"), themeOptions));
    }
    if (demographicOptions.length > 0) {
      setSelectedDemographic(getMultiSelectValuesFromParam(urlParams.get("demographic"), demographicOptions));
    }
    if (studioOptions.length > 0) {
      setSelectedStudio(getMultiSelectValuesFromParam(urlParams.get("studio"), studioOptions));
    }
    if (authorOptions.length > 0) {
      setSelectedAuthor(getMultiSelectValuesFromParam(urlParams.get("author"), authorOptions));
    }
  }, [
    filtersLoading,
    // Only depend on options when they first become available
    genreOptions.length > 0,
    themeOptions.length > 0,
    demographicOptions.length > 0,
    studioOptions.length > 0,
    authorOptions.length > 0,
  ]);

  /**
   * Effect 3: Debounce search input changes
   * Prevents excessive API calls while user is typing
   */
  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    debounceTimeoutRef.current = setTimeout(() => {
      if (inputValue !== searchTerm) {
        setSearchTerm(inputValue);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [inputValue, searchTerm]);

  /**
   * Effect 2.5: Handle URL changes from external navigation (like clicking tags)
   * This syncs state when the URL changes but doesn't trigger fetchItems unnecessarily
   */
  useEffect(() => {
    if (!isMounted.current || filtersLoading || isInternalUrlUpdate.current) {
      return;
    }

    const currentUrlParams = new URLSearchParams(window.location.search);

    // Handle single-select values first (these don't depend on options arrays)
    const urlMediaType = (currentUrlParams.get("media_type") as MediaType) || "All";
    if (selectedMediaType !== urlMediaType) {
      setSelectedMediaType(urlMediaType);
    }

    // Handle multi-select values - even if options aren't loaded yet, store the raw values
    const genreParam = currentUrlParams.get("genre");
    if (genreParam && genreOptions.length > 0) {
      const urlGenres = getMultiSelectValuesFromParam(genreParam, genreOptions);
      const currentGenreValues = selectedGenre
        .map((g) => g.value)
        .sort()
        .join(",");
      const urlGenreValues = urlGenres
        .map((g) => g.value)
        .sort()
        .join(",");
      if (currentGenreValues !== urlGenreValues) {
        setSelectedGenre(urlGenres);
      }
    } else if (genreParam && genreOptions.length === 0) {
      // If options aren't loaded yet but we have a genre parameter, force a re-check later
      setTimeout(() => {
        if (genreOptions.length > 0) {
          const urlGenres = getMultiSelectValuesFromParam(genreParam, genreOptions);
          setSelectedGenre(urlGenres);
        }
      }, 100);
    }

    const themeParam = currentUrlParams.get("theme");
    if (themeParam && themeOptions.length > 0) {
      const urlThemes = getMultiSelectValuesFromParam(themeParam, themeOptions);
      const currentThemeValues = selectedTheme
        .map((t) => t.value)
        .sort()
        .join(",");
      const urlThemeValues = urlThemes
        .map((t) => t.value)
        .sort()
        .join(",");
      if (currentThemeValues !== urlThemeValues) {
        setSelectedTheme(urlThemes);
      }
    } else if (themeParam && themeOptions.length === 0) {
      setTimeout(() => {
        if (themeOptions.length > 0) {
          const urlThemes = getMultiSelectValuesFromParam(themeParam, themeOptions);
          setSelectedTheme(urlThemes);
        }
      }, 100);
    }

    const demographicParam = currentUrlParams.get("demographic");
    if (demographicParam && demographicOptions.length > 0) {
      const urlDemographics = getMultiSelectValuesFromParam(demographicParam, demographicOptions);
      const currentDemographicValues = selectedDemographic
        .map((d) => d.value)
        .sort()
        .join(",");
      const urlDemographicValues = urlDemographics
        .map((d) => d.value)
        .sort()
        .join(",");
      if (currentDemographicValues !== urlDemographicValues) {
        setSelectedDemographic(urlDemographics);
      }
    } else if (demographicParam && demographicOptions.length === 0) {
      setTimeout(() => {
        if (demographicOptions.length > 0) {
          const urlDemographics = getMultiSelectValuesFromParam(demographicParam, demographicOptions);
          setSelectedDemographic(urlDemographics);
        }
      }, 100);
    }
  }, [
    searchParams,
    genreOptions,
    themeOptions,
    demographicOptions,
    selectedGenre,
    selectedTheme,
    selectedDemographic,
    selectedMediaType,
  ]);

  /**
   * Stable function to fetch items from API with current filter state
   * Uses useCallback to prevent unnecessary re-renders and effect loops
   */
  const fetchItems = useCallback(async (): Promise<void> => {
    // Build URL parameters from current state
    const newUrlParams = new URLSearchParams();

    if (currentPage > 1) newUrlParams.set("page", currentPage.toString());
    if (itemsPerPage !== DEFAULT_ITEMS_PER_PAGE) newUrlParams.set("per_page", itemsPerPage.toString());
    if (searchTerm) newUrlParams.set("q", searchTerm);
    if (selectedMediaType && selectedMediaType !== "All") newUrlParams.set("media_type", selectedMediaType);
    if (selectedStatus && selectedStatus !== "All") newUrlParams.set("status", selectedStatus);
    if (minScore) newUrlParams.set("min_score", minScore);
    if (selectedYear) newUrlParams.set("year", selectedYear);
    if (sortBy && sortBy !== "score_desc") newUrlParams.set("sort_by", sortBy);

    // Handle multi-select parameters
    if (selectedGenre.length > 0) newUrlParams.set("genre", selectedGenre.map((g) => g.value).join(","));
    if (selectedTheme.length > 0) newUrlParams.set("theme", selectedTheme.map((t) => t.value).join(","));
    if (selectedDemographic.length > 0)
      newUrlParams.set("demographic", selectedDemographic.map((d) => d.value).join(","));
    if (selectedStudio.length > 0) newUrlParams.set("studio", selectedStudio.map((s) => s.value).join(","));
    if (selectedAuthor.length > 0) newUrlParams.set("author", selectedAuthor.map((a) => a.value).join(","));

    const paramsString = newUrlParams.toString();

    // Update URL if parameters have changed
    const currentParamsString = new URLSearchParams(window.location.search).toString();
    if (currentParamsString !== paramsString) {
      isInternalUrlUpdate.current = true;
      setSearchParams(newUrlParams, { replace: true });
      // Reset flag after URL update
      setTimeout(() => {
        isInternalUrlUpdate.current = false;
      }, 0);
    }

    // Handle smooth scrolling for filtered results
    const hasActiveFilters =
      currentPage !== 1 ||
      itemsPerPage !== DEFAULT_ITEMS_PER_PAGE ||
      searchTerm ||
      selectedMediaType !== "All" ||
      selectedGenre.length > 0 ||
      selectedStatus !== "All" ||
      minScore ||
      selectedYear ||
      selectedTheme.length > 0 ||
      selectedDemographic.length > 0 ||
      selectedStudio.length > 0 ||
      selectedAuthor.length > 0;

    if (topOfPageRef.current && hasActiveFilters) {
      topOfPageRef.current.scrollIntoView({ behavior: "smooth" });
    }

    setLoading(true);
    setError(null);

    try {
      const operation = () => axios.get<ItemsApiResponse>(`${API_BASE_URL}/items?${paramsString}`);
      const response = await retryOperation(operation, 2, 1000);

      const responseData = response.data;

      // Validate response structure
      validateResponseData(responseData, {
        items: "array",
        total_pages: "number",
        total_items: "number",
      });

      setItems(responseData.items);
      setTotalPages(responseData.total_pages || 1);
      setTotalItems(responseData.total_items || 0);
    } catch (err) {
      handleError(err as Error, "fetching items");
      setItems([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedMediaType,
    selectedGenre,
    selectedStatus,
    minScore,
    selectedYear,
    selectedTheme,
    selectedDemographic,
    selectedStudio,
    selectedAuthor,
    sortBy,
    setSearchParams,
    handleError,
  ]);

  /**
   * Effect 4: Trigger data fetching when dependencies change
   * Waits for filters to load and component to mount before fetching
   */
  useEffect(() => {
    if (filtersLoading || !isMounted.current) {
      return;
    }

    // Small delay to ensure all state updates from URL sync are complete
    const timeoutId = setTimeout(() => {
      fetchItems();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchItems, filtersLoading]);

  // Event handlers for filter changes
  const handleInputChange: InputChangeHandler = (event) => setInputValue(event.target.value);

  const handleSearchSubmit: FormSubmitHandler = (event) => {
    event.preventDefault();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (searchTerm !== inputValue) setSearchTerm(inputValue);
    if (currentPage !== 1) setCurrentPage(1);
  };

  // Specific handlers for react-select components
  const handleMediaTypeChange = (selectedOption: SelectOption | null): void => {
    const newMediaType = (selectedOption?.value as MediaType) || "All";
    setSelectedMediaType(newMediaType);

    // Immediately update URL to prevent sync effect from overriding
    isInternalUrlUpdate.current = true;
    const currentParams = new URLSearchParams(window.location.search);
    if (newMediaType !== "All") {
      currentParams.set("media_type", newMediaType);
    } else {
      currentParams.delete("media_type");
    }
    setSearchParams(currentParams, { replace: true });
    setTimeout(() => {
      isInternalUrlUpdate.current = false;
    }, 50);

    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleStatusChange = (selectedOption: SelectOption | null): void => {
    const newStatus = (selectedOption?.value as StatusType) || "All";
    setSelectedStatus(newStatus);

    // Immediately update URL to prevent sync effect from overriding
    isInternalUrlUpdate.current = true;
    const currentParams = new URLSearchParams(window.location.search);
    if (newStatus !== "All") {
      currentParams.set("status", newStatus);
    } else {
      currentParams.delete("status");
    }
    setSearchParams(currentParams, { replace: true });
    setTimeout(() => {
      isInternalUrlUpdate.current = false;
    }, 50);

    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleGenreChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const newGenres = selectedOptions ? [...selectedOptions] : [];
    setSelectedGenre(newGenres);

    // Immediately update URL to prevent sync effect from overriding
    isInternalUrlUpdate.current = true;
    const currentParams = new URLSearchParams(window.location.search);
    if (newGenres.length > 0) {
      currentParams.set("genre", newGenres.map((g) => g.value).join(","));
    } else {
      currentParams.delete("genre");
    }
    setSearchParams(currentParams, { replace: true });
    setTimeout(() => {
      isInternalUrlUpdate.current = false;
    }, 50);

    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleThemeChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const newThemes = selectedOptions ? [...selectedOptions] : [];
    setSelectedTheme(newThemes);

    // Immediately update URL to prevent sync effect from overriding
    isInternalUrlUpdate.current = true;
    const currentParams = new URLSearchParams(window.location.search);
    if (newThemes.length > 0) {
      currentParams.set("theme", newThemes.map((t) => t.value).join(","));
    } else {
      currentParams.delete("theme");
    }
    setSearchParams(currentParams, { replace: true });
    setTimeout(() => {
      isInternalUrlUpdate.current = false;
    }, 50);

    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleDemographicChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const newDemographics = selectedOptions ? [...selectedOptions] : [];
    setSelectedDemographic(newDemographics);

    // Immediately update URL to prevent sync effect from overriding
    isInternalUrlUpdate.current = true;
    const currentParams = new URLSearchParams(window.location.search);
    if (newDemographics.length > 0) {
      currentParams.set("demographic", newDemographics.map((d) => d.value).join(","));
    } else {
      currentParams.delete("demographic");
    }
    setSearchParams(currentParams, { replace: true });
    setTimeout(() => {
      isInternalUrlUpdate.current = false;
    }, 50);

    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleStudioChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const newStudios = selectedOptions ? [...selectedOptions] : [];
    setSelectedStudio(newStudios);

    // Immediately update URL to prevent sync effect from overriding
    isInternalUrlUpdate.current = true;
    const currentParams = new URLSearchParams(window.location.search);
    if (newStudios.length > 0) {
      currentParams.set("studio", newStudios.map((s) => s.value).join(","));
    } else {
      currentParams.delete("studio");
    }
    setSearchParams(currentParams, { replace: true });
    setTimeout(() => {
      isInternalUrlUpdate.current = false;
    }, 50);

    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleAuthorChange = (selectedOptions: readonly SelectOption[] | null): void => {
    const newAuthors = selectedOptions ? [...selectedOptions] : [];
    setSelectedAuthor(newAuthors);

    // Immediately update URL to prevent sync effect from overriding
    isInternalUrlUpdate.current = true;
    const currentParams = new URLSearchParams(window.location.search);
    if (newAuthors.length > 0) {
      currentParams.set("author", newAuthors.map((a) => a.value).join(","));
    } else {
      currentParams.delete("author");
    }
    setSearchParams(currentParams, { replace: true });
    setTimeout(() => {
      isInternalUrlUpdate.current = false;
    }, 50);

    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleSortChange: SelectChangeHandler = (event) => {
    setSortBy(event.target.value as SortOption);
    setCurrentPage(1);
  };

  const handleMinScoreChange: InputChangeHandler = (event) => {
    setMinScore(event.target.value);
    setCurrentPage(1);
  };

  const handleYearChange: InputChangeHandler = (event) => {
    setSelectedYear(event.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = (): void => {
    // Mark this as an internal update to prevent the URL sync effect from triggering
    isInternalUrlUpdate.current = true;

    // Clear all state
    setInputValue("");
    setSearchTerm("");
    setSelectedMediaType("All");
    setSelectedGenre([]);
    setSelectedTheme([]);
    setSelectedDemographic([]);
    setSelectedStudio([]);
    setSelectedAuthor([]);
    setSelectedStatus("All");
    setMinScore("");
    setSelectedYear("");
    setSortBy("score_desc");
    if (currentPage !== 1) setCurrentPage(1);

    // Clear URL parameters
    setSearchParams({}, { replace: true });

    // Reset the flag after a short delay
    setTimeout(() => {
      isInternalUrlUpdate.current = false;
    }, 100);
  };

  // Pagination handlers
  const handleNextPage = (): void => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePrevPage = (): void => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  const handleItemsPerPageChange: SelectChangeHandler = (event) => {
    const newIPP = Number(event.target.value);
    localStorage.setItem("aniMangaItemsPerPage", newIPP.toString());
    setItemsPerPage(newIPP);
    setCurrentPage(1);
  };

  const scrollToTop = (): void => {
    if (topOfPageRef.current) {
      topOfPageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  /**
   * Generate dynamic document title based on current filters and search
   */
  const generateDocumentTitle = (): string => {
    let title = "AniManga Recommender";

    if (searchTerm) {
      title = `"${searchTerm}" - Search Results | ${title}`;
    } else if (
      selectedMediaType !== "All" ||
      selectedGenre.length > 0 ||
      selectedTheme.length > 0 ||
      selectedDemographic.length > 0 ||
      selectedStudio.length > 0 ||
      selectedAuthor.length > 0 ||
      selectedStatus !== "All" ||
      minScore ||
      selectedYear
    ) {
      title = `Filtered Results | ${title}`;
    } else {
      title = `Discover Anime & Manga | ${title}`;
    }

    return title;
  };

  useDocumentTitle(generateDocumentTitle());

  // Prepare props for FilterBar component
  const filterProps: FilterBarProps = {
    filters: {
      inputValue,
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
      handleInputChange,
      handleSearchSubmit,
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
        {/* Filter Bar */}
        <FilterBar {...filterProps} />

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
                <SkeletonCard key={`skeleton-${index}`} />
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
              <button onClick={() => window.location.reload()} className="retry-button">
                Try Again
              </button>
            </div>
          </section>
        )}

        {/* Content Display */}
        {!loading && !error && (
          <>
            {/* Results Summary */}
            {Array.isArray(items) && items.length > 0 && (
              <div className="results-summary" aria-live="polite">
                <p>
                  Showing {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                </p>
              </div>
            )}

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
