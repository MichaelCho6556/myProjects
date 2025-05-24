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

const API_BASE_URL = "http://localhost:5000/api";

const DEBOUNCE_DELAY = 500;

/**
 * Get initial items per page from localStorage with validation
 * @returns {number} Valid items per page value
 */
const getInitialItemsPerPage = () => {
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
 * @param {Array} optionsArray - Array of string options
 * @param {boolean} includeAll - Whether to include "All" option
 * @returns {Array} Array of {value, label} objects
 */
const toSelectOptions = (optionsArray, includeAll = false) => {
  const mapped = optionsArray
    .filter((opt) => typeof opt === "string" && opt.toLowerCase() !== "all")
    .map((opt) => ({ value: opt, label: opt }));
  return includeAll ? [{ value: "All", label: "All" }, ...mapped] : mapped;
};

/**
 * Helper to parse multi-select values from URL parameters
 * @param {string} paramValue - Comma-separated parameter value
 * @param {Array} optionsSource - Available options to match against
 * @returns {Array} Array of selected option objects
 */
const getMultiSelectValuesFromParam = (paramValue, optionsSource) => {
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
function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data and loading states
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(
    parseInt(searchParams.get("per_page")) || DEFAULT_ITEMS_PER_PAGE
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search and filter states
  const [inputValue, setInputValue] = useState(searchParams.get("q") || "");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [selectedMediaType, setSelectedMediaType] = useState(searchParams.get("media_type") || "All");
  const [selectedGenre, setSelectedGenre] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "All");
  const [minScore, setMinScore] = useState(searchParams.get("min_score") || "");
  const [selectedYear, setSelectedYear] = useState(searchParams.get("year") || "");
  const [selectedTheme, setSelectedTheme] = useState([]);
  const [selectedDemographic, setSelectedDemographic] = useState([]);
  const [selectedStudio, setSelectedStudio] = useState([]);
  const [selectedAuthor, setSelectedAuthor] = useState([]);
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "score_desc");

  // Filter options for dropdowns
  const [genreOptions, setGenreOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([{ value: "All", label: "All" }]);
  const [mediaTypeOptions, setMediaTypeOptions] = useState([{ value: "All", label: "All" }]);
  const [themeOptions, setThemeOptions] = useState([]);
  const [demographicOptions, setDemographicOptions] = useState([]);
  const [studioOptions, setStudioOptions] = useState([]);
  const [authorOptions, setAuthorOptions] = useState([]);

  // Refs for component lifecycle and debouncing
  const topOfPageRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const isMounted = useRef(false);

  // Create error handler for this component
  const handleError = createErrorHandler("HomePage", setError);

  /**
   * Effect 1: Fetch distinct filter options on component mount
   * This runs once to populate dropdown options for all filters
   */
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setFiltersLoading(true);
      try {
        const operation = () => axios.get(`${API_BASE_URL}/distinct-values`);
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
        handleError(err, "loading filter options");

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
  }, []);

  /**
   * Effect 2: Synchronize component state with URL parameters
   * This ensures the UI reflects the current URL state when navigating
   */
  useEffect(() => {
    if (filtersLoading) return; // Wait for filter options to load

    setCurrentPage(parseInt(searchParams.get("page")) || 1);
    setItemsPerPage(parseInt(searchParams.get("per_page")) || DEFAULT_ITEMS_PER_PAGE);

    const query = searchParams.get("q") || "";
    setInputValue(query);
    setSearchTerm(query);

    setSelectedMediaType(searchParams.get("media_type") || "All");
    setSelectedStatus(searchParams.get("status") || "All");
    setMinScore(searchParams.get("min_score") || "");
    setSelectedYear(searchParams.get("year") || "");
    setSortBy(searchParams.get("sort_by") || "score_desc");

    // Set multi-select values from URL parameters
    setSelectedGenre(getMultiSelectValuesFromParam(searchParams.get("genre"), genreOptions));
    setSelectedTheme(getMultiSelectValuesFromParam(searchParams.get("theme"), themeOptions));
    setSelectedDemographic(
      getMultiSelectValuesFromParam(searchParams.get("demographic"), demographicOptions)
    );
    setSelectedStudio(getMultiSelectValuesFromParam(searchParams.get("studio"), studioOptions));
    setSelectedAuthor(getMultiSelectValuesFromParam(searchParams.get("author"), authorOptions));
  }, [searchParams, filtersLoading]);

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
   * Stable function to fetch items from API with current filter state
   * Uses useCallback to prevent unnecessary re-renders and effect loops
   */
  const fetchItems = useCallback(async () => {
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
      setSearchParams(newUrlParams, { replace: true });
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
      const operation = () => axios.get(`${API_BASE_URL}/items?${paramsString}`);
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
      handleError(err, "fetching items");
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
  const handleInputChange = (event) => setInputValue(event.target.value);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (searchTerm !== inputValue) setSearchTerm(inputValue);
    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleMultiSelectChange = (setter, selectedOptions) => {
    setter(selectedOptions || []);
    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleSingleSelectChange = (setter, selectedOptionOrEvent) => {
    const value =
      selectedOptionOrEvent?.value !== undefined
        ? selectedOptionOrEvent.value
        : selectedOptionOrEvent.target.value;
    setter(value || "All");
    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
    setCurrentPage(1);
  };

  const handleMinScoreChange = (event) => {
    setMinScore(event.target.value);
    setCurrentPage(1);
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
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
  };

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  const handleItemsPerPageChange = (event) => {
    const newIPP = Number(event.target.value);
    localStorage.setItem("aniMangaItemsPerPage", newIPP.toString());
    setItemsPerPage(newIPP);
    setCurrentPage(1);
  };

  const scrollToTop = () => {
    if (topOfPageRef.current) {
      topOfPageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  /**
   * Generate dynamic document title based on current filters and search
   */
  const generateDocumentTitle = () => {
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
  const filterProps = {
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
      handleSingleSelectChange,
      handleMultiSelectChange,
      handleMinScoreChange,
      handleYearChange,
      handleResetFilters,
      setSelectedMediaType,
      setSelectedGenre,
      setSelectedTheme,
      setSelectedDemographic,
      setSelectedStudio,
      setSelectedAuthor,
      setSelectedStatus,
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
          <section className="skeleton-container" aria-label="Loading content">
            <div className="item-list">
              {Array.from({ length: itemsPerPage }).map((_, index) => (
                <SkeletonCard key={`skeleton-${index}`} />
              ))}
            </div>
          </section>
        )}

        {loading && items.length > 0 && (
          <div className="partial-loading-overlay" aria-live="polite">
            <div className="partial-loading-content">
              <Spinner size="40px" />
              <span>Updating results...</span>
            </div>
          </div>
        )}

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

        {!loading && !error && (
          <>
            {Array.isArray(items) && items.length > 0 && (
              <div className="results-summary" aria-live="polite">
                <p>
                  Showing {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                </p>
              </div>
            )}

            <section className="item-list" aria-label="Search results">
              {Array.isArray(items) && items.length > 0
                ? items.map((item) => <ItemCard key={item.uid} item={item} />)
                : null}
            </section>

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
}
export default HomePage;
