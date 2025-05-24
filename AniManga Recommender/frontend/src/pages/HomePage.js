import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import SkeletonCard from "../components/SkeletonCard";
import "../App.css";
import Select from "react-select";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Spinner from "../components/Spinner";
import useDocumentTitle from "../hooks/useDocumentTitle";

const API_BASE_URL = "http://localhost:5000/api";

const DEBOUNCE_DELAY = 500;

//helper function to get initial itemsPerPage from localstorage or default

const getInitialItemsPerPage = () => {
  const storedValue = localStorage.getItem("aniMangaItemsPerPage"); // unique key
  if (storedValue) {
    const parsedValue = parseInt(storedValue, 10);
    if ([10, 20, 25, 30, 50].includes(parsedValue)) {
      return parsedValue;
    }
  }
  return 30;
};

const DEFAULT_ITEMS_PER_PAGE = getInitialItemsPerPage();

// Helper to convert string options to react-select format
const toSelectOptions = (optionsArray, includeAll = false) => {
  const mapped = optionsArray
    .filter((opt) => typeof opt === "string" && opt.toLowerCase() !== "all") // Filter out 'All' if present
    .map((opt) => ({ value: opt, label: opt }));
  return includeAll ? [{ value: "All", label: "All" }, ...mapped] : mapped;
};

// Helper to conver all string to empty array for multi-select or pass value
const getMultiSelectValuesFromParam = (paramValue, optionsSource) => {
  if (!paramValue) return [];
  const selectedValues = paramValue.split(",").map((v) => v.trim().toLowerCase());
  return optionsSource.filter((opt) => selectedValues.includes(opt.value.toLowerCase()));
};

// Helper to convert react-select's array of {value, label} to URL param string
const getParamFromMultiSelectValues = (selectedOptions) => {
  if (!selectedOptions || selectedOptions.length === 0) return "";
  return selectedOptions.map((opt) => opt.value).join(",");
};

function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize states with a default, then let an effect update them from URL
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(
    parseInt(searchParams.get("per_page")) || DEFAULT_ITEMS_PER_PAGE
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states - initialize with defaults, URL will override
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

  //state for dynamic filter options
  const [genreOptions, setGenreOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([{ value: "All", label: "All" }]);
  const [mediaTypeOptions, setMediaTypeOptions] = useState([{ value: "All", label: "All" }]);
  const [themeOptions, setThemeOptions] = useState([]);
  const [demographicOptions, setDemographicOptions] = useState([]);
  const [studioOptions, setStudioOptions] = useState([]);
  const [authorOptions, setAuthorOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const topOfPageRef = useRef(null); // For scrolling NEED ANIMATION EFFECTS ON
  const debounceTimeoutRef = useRef(null);
  const isMounted = useRef(false);
  const initialSyncDone = useRef(false); // Track when initial URL sync is complete

  // Effect 1: Fetch distinct filter options (runs once on mount)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setFiltersLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/distinct-values`);
        let distinctData = response.data;
        if (typeof distinctData === "string") {
          try {
            distinctData = JSON.parse(distinctData);
          } catch (e) {
            console.error("Filter options data not valid JSON", e);
            throw new Error("Filter options data not valid JSON");
          }
        }
        if (distinctData) {
          setMediaTypeOptions(toSelectOptions(distinctData.media_types || [], true)); // true for 'All'
          setGenreOptions(toSelectOptions(distinctData.genres || [])); // false for 'All' (multi-select)
          setStatusOptions(toSelectOptions(distinctData.statuses || [], true)); // true for 'All'
          setThemeOptions(toSelectOptions(distinctData.themes || [])); // false for 'All' (multi-select)
          setDemographicOptions(toSelectOptions(distinctData.demographics || [])); // false for 'All' (multi-select)
          setStudioOptions(toSelectOptions(distinctData.studios || [])); // false for 'All' (multi-select)
          setAuthorOptions(toSelectOptions(distinctData.authors || [])); // false for 'All' (multi-
        }
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
        // Set default "All" options to prevent errors in dropdowns
        setMediaTypeOptions([{ value: "All", label: "All" }]);
        setGenreOptions([]);
        setStatusOptions([{ value: "All", label: "All" }]);
        setThemeOptions([]);
        setDemographicOptions([]);
        setStudioOptions([]);
        setAuthorOptions([]);
      } finally {
        setFiltersLoading(false);
        isMounted.current = true; // Mark as mounted after filter options are loaded
      }
    };
    fetchFilterOptions();
  }, []); // Empty dependency array: runs only once on mount

  // Effect 2: Sync local state FROM URL searchParams (when URL changes externally)
  useEffect(() => {
    if (filtersLoading) return; // Wait for filter options to be loaded first

    setCurrentPage(parseInt(searchParams.get("page")) || 1);
    setItemsPerPage(parseInt(searchParams.get("per_page")) || DEFAULT_ITEMS_PER_PAGE);
    const query = searchParams.get("q") || "";
    setInputValue(query);
    setSearchTerm(query);
    setSelectedMediaType(searchParams.get("media_type") || "All");

    setSelectedGenre(getMultiSelectValuesFromParam(searchParams.get("genre"), genreOptions));
    setSelectedTheme(getMultiSelectValuesFromParam(searchParams.get("theme"), themeOptions));
    setSelectedDemographic(
      getMultiSelectValuesFromParam(searchParams.get("demographic"), demographicOptions)
    );
    setSelectedStudio(getMultiSelectValuesFromParam(searchParams.get("studio"), studioOptions));
    setSelectedAuthor(getMultiSelectValuesFromParam(searchParams.get("author"), authorOptions));

    setSelectedStatus(searchParams.get("status") || "All");
    setMinScore(searchParams.get("min_score") || "");
    setSelectedYear(searchParams.get("year") || "");
    setSortBy(searchParams.get("sort_by") || "score_desc");
  }, [searchParams, filtersLoading]);

  /// Effect 3: Debounce inputValue to update searchTerm
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

  // Create a stable fetch function
  const fetchItems = useCallback(async () => {
    // Build URL params from current state
    const newUrlParams = new URLSearchParams();
    if (currentPage > 1) newUrlParams.set("page", currentPage.toString());
    if (itemsPerPage !== DEFAULT_ITEMS_PER_PAGE) newUrlParams.set("per_page", itemsPerPage.toString());
    if (searchTerm) newUrlParams.set("q", searchTerm);
    if (selectedMediaType && selectedMediaType !== "All") newUrlParams.set("media_type", selectedMediaType);

    // Handle multi-select for URL
    if (selectedGenre.length > 0) newUrlParams.set("genre", selectedGenre.map((g) => g.value).join(","));
    if (selectedTheme.length > 0) newUrlParams.set("theme", selectedTheme.map((t) => t.value).join(","));
    if (selectedDemographic.length > 0)
      newUrlParams.set("demographic", selectedDemographic.map((d) => d.value).join(","));
    if (selectedStudio.length > 0) newUrlParams.set("studio", selectedStudio.map((s) => s.value).join(","));
    if (selectedAuthor.length > 0) newUrlParams.set("author", selectedAuthor.map((a) => a.value).join(","));

    if (selectedStatus && selectedStatus !== "All") newUrlParams.set("status", selectedStatus);
    if (minScore) newUrlParams.set("min_score", minScore);
    if (selectedYear) newUrlParams.set("year", selectedYear);
    if (sortBy && sortBy !== "score_desc") newUrlParams.set("sort_by", sortBy);

    const paramsString = newUrlParams.toString();

    // Update URL if needed
    const currentParamsString = new URLSearchParams(window.location.search).toString();
    if (currentParamsString !== paramsString) {
      console.log("Updating URL. Current:", currentParamsString, "New:", paramsString);
      setSearchParams(newUrlParams, { replace: true });
    }

    // Handle scrolling
    if (
      topOfPageRef.current &&
      (currentPage !== 1 ||
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
        selectedAuthor.length > 0)
    ) {
      topOfPageRef.current.scrollIntoView({ behavior: "smooth" });
    }

    setLoading(true);
    setError(null);

    console.log("Fetching items with params:", paramsString);

    try {
      const response = await axios.get(`${API_BASE_URL}/items?${paramsString}`);
      const responseData = response.data;
      if (responseData && Array.isArray(responseData.items)) {
        setItems(responseData.items);
        setTotalPages(responseData.total_pages || 1);
        setTotalItems(responseData.total_items || 0);
      } else {
        throw new Error("Unexpected API response structure for items");
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setItems([]);
      setTotalPages(1);
      setTotalItems(0);
      setError(err.message || "Failed to fetch items.");
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

  // Effect 4: Fetch items when state changes or initial load is complete
  useEffect(() => {
    // Don't run if filters are still loading or component hasn't mounted
    if (filtersLoading || !isMounted.current) {
      console.log("Waiting for filters to load and component to mount");
      return;
    }

    // Small delay to ensure all state updates from URL sync are complete
    const timeoutId = setTimeout(() => {
      fetchItems();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchItems, filtersLoading]);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSearchChange = (event) => setSearchTerm(event.target.value);
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
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

  const handleFilterChange = (setter, value, paramName) => {
    setter(value);
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
    setSelectedTheme([]); // Reset multi-select to empty array
    setSelectedDemographic([]);
    setSelectedStudio([]);
    setSelectedAuthor([]);
    setSelectedStatus("All");
    setMinScore("");
    setSelectedYear("");
    setSortBy("score_desc");
    if (currentPage !== 1) setCurrentPage(1);
  };

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

  // NEED ANIMATION EFFECTS ON TO SEE EFFECT
  const scrollToTop = () => {
    if (topOfPageRef.current) {
      topOfPageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const PaginationControls = React.memo(() => (
    <div className="pagination-controls" role="navigation" aria-label="Pagination">
      <button
        onClick={handlePrevPage}
        disabled={currentPage <= 1 || loading}
        aria-label={`Go to previous page (currently on page ${currentPage})`}
        title="Previous page"
      >
        Previous
      </button>
      <span className="pagination-info" aria-live="polite">
        Page {currentPage} of {totalPages}
        {items.length > 0 &&
          !loading &&
          ` (Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(
            currentPage * itemsPerPage,
            totalItems
          )} of ${totalItems})`}
      </span>
      <button
        onClick={handleNextPage}
        disabled={currentPage >= totalPages || loading}
        aria-label={`Go to next page (currently on page ${currentPage} of ${totalPages})`}
        title="Next page"
      >
        Next
      </button>
    </div>
  ));

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "var(--bg-dark)",
      borderColor: state.isFocused ? "var(--accent-primary)" : "var(--border-color)",
      boxShadow: state.isFocused ? "var(--shadow-focus-ring)" : "none",
      "&:hover": { borderColor: state.isFocused ? "var(--accent-primary)" : "var(--border-highlight)" },
      minHeight: "calc(0.6rem * 2 + 0.9rem * 2 + 2px)", // Match padding of other inputs + border
      height: "auto",
    }),
    valueContainer: (provided) => ({ ...provided, padding: "calc(0.6rem - 2px) 0.9rem" }), // Adjust padding
    input: (provided) => ({ ...provided, color: "var(--text-primary)", margin: "0px", padding: "0px" }),
    placeholder: (provided) => ({ ...provided, color: "var(--text-muted)" }),
    singleValue: (provided) => ({ ...provided, color: "var(--text-primary)" }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: "var(--accent-secondary)",
      borderRadius: "4px",
    }),
    multiValueLabel: (provided) => ({ ...provided, color: "var(--text-primary)", fontWeight: "500" }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: "var(--text-primary)",
      "&:hover": { backgroundColor: "var(--accent-secondary-hover)", color: "white" },
    }),
    menu: (provided) => ({ ...provided, backgroundColor: "var(--bg-dark)", zIndex: 5 }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "var(--accent-primary)"
        : state.isFocused
        ? "var(--bg-overlay)"
        : "var(--bg-dark)",
      color: state.isSelected ? "var(--bg-deep-dark)" : "var(--text-primary)",
      "&:active": { backgroundColor: "var(--accent-primary-hover)" },
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "var(--text-muted)",
      "&:hover": { color: "var(--text-primary)" },
    }),
  };

  // Generate dynamic document title based on current state
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

  return (
    <>
      <div ref={topOfPageRef}></div>
      <main>
        <section className="filter-bar" role="search" aria-label="Filter and search options">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <label htmlFor="search-input" className="sr-only">
              Search anime and manga titles
            </label>
            <input
              id="search-input"
              type="text"
              placeholder="Search titles..."
              value={inputValue}
              onChange={handleInputChange}
              aria-describedby="search-help"
            />
            <span id="search-help" className="sr-only">
              Enter keywords to search for anime and manga titles
            </span>
            <button type="submit" aria-label="Submit search">
              Search
            </button>
          </form>

          <div className="filter-group sort-by-selector">
            <label htmlFor="sortBy">Sort by:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={handleSortChange}
              disabled={loading || filtersLoading}
            >
              <option value="score_desc">Score (High to Low)</option>
              <option value="score_asc">Score (Low to High)</option>
              <option value="popularity_desc">Popularity</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
              <option value="start_date_desc">Release Date (Newest)</option>
              <option value="start_date_asc">Release Date (Oldest)</option>
            </select>
            {filtersLoading && (
              <span className="filter-loading-indicator" aria-hidden="true">
                ⟳
              </span>
            )}
          </div>

          <div className="filter-group">
            <label htmlFor="mediaTypeFilter">Type:</label>
            <Select
              id="mediaTypeFilter"
              name="mediaTypeFilter"
              options={mediaTypeOptions}
              value={mediaTypeOptions.find((opt) => opt.value === selectedMediaType) || mediaTypeOptions[0]}
              onChange={(selectedOption) => handleSingleSelectChange(setSelectedMediaType, selectedOption)}
              styles={customSelectStyles}
              isDisabled={filtersLoading || loading}
              classNamePrefix="react-select"
              aria-label="Filter by media type"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="genreFilter">Genres:</label>
            <Select
              isMulti
              closeMenuOnSelect={false}
              id="genreFilter"
              name="genreFilter"
              options={genreOptions}
              value={selectedGenre}
              onChange={(selectedOptions) => handleMultiSelectChange(setSelectedGenre, selectedOptions)}
              placeholder="Select genres..."
              styles={customSelectStyles}
              isDisabled={filtersLoading || loading}
              classNamePrefix="react-select"
              aria-label="Filter by genres"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="themeFilter">Themes:</label>
            <Select
              isMulti
              closeMenuOnSelect={false}
              id="themeFilter"
              name="themeFilter"
              options={themeOptions}
              value={selectedTheme}
              onChange={(selectedOptions) => handleMultiSelectChange(setSelectedTheme, selectedOptions)}
              placeholder="Select themes..."
              styles={customSelectStyles}
              isDisabled={filtersLoading || loading}
              classNamePrefix="react-select"
              aria-label="Filter by themes"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="demographicFilter">Demographics:</label>
            <Select
              isMulti
              closeMenuOnSelect={false}
              id="demographicFilter"
              options={demographicOptions}
              value={selectedDemographic}
              onChange={(opts) => handleMultiSelectChange(setSelectedDemographic, opts)}
              placeholder="Select demographics..."
              styles={customSelectStyles}
              isDisabled={filtersLoading || loading}
              classNamePrefix="react-select"
              aria-label="Filter by demographics"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="studioFilter">Studios:</label>
            <Select
              isMulti
              closeMenuOnSelect={false}
              id="studioFilter"
              options={studioOptions}
              value={selectedStudio}
              onChange={(opts) => handleMultiSelectChange(setSelectedStudio, opts)}
              placeholder="Select studios..."
              styles={customSelectStyles}
              isDisabled={filtersLoading || loading}
              classNamePrefix="react-select"
              aria-label="Filter by studios"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="authorFilter">Authors:</label>
            <Select
              isMulti
              closeMenuOnSelect={false}
              id="authorFilter"
              options={authorOptions}
              value={selectedAuthor}
              onChange={(opts) => handleMultiSelectChange(setSelectedAuthor, opts)}
              placeholder="Select authors..."
              styles={customSelectStyles}
              isDisabled={filtersLoading || loading}
              classNamePrefix="react-select"
              aria-label="Filter by authors"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="statusFilter">Status:</label>
            <Select
              id="statusFilter"
              name="statusFilter"
              options={statusOptions}
              value={statusOptions.find((opt) => opt.value === selectedStatus) || statusOptions[0]}
              onChange={(selectedOption) => handleSingleSelectChange(setSelectedStatus, selectedOption)}
              styles={customSelectStyles}
              isDisabled={filtersLoading || loading}
              classNamePrefix="react-select"
              aria-label="Filter by status"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="minScoreFilter">Min Score (0-10):</label>
            <input
              type="number"
              id="minScoreFilter"
              min="0"
              max="10"
              step="0.1"
              value={minScore}
              onChange={handleMinScoreChange}
              placeholder="e.g., 7.5"
              aria-describedby="score-help"
            />
            <span id="score-help" className="sr-only">
              Enter minimum score from 0 to 10
            </span>
          </div>

          <div className="filter-group">
            <label htmlFor="yearFilter">Year:</label>
            <input
              type="number"
              id="yearFilter"
              min="1900"
              max={new Date().getFullYear() + 5}
              value={selectedYear}
              onChange={handleYearChange}
              placeholder="e.g., 2024"
              aria-describedby="year-help"
            />
            <span id="year-help" className="sr-only">
              Enter release year
            </span>
          </div>

          <button
            onClick={handleResetFilters}
            className="reset-filters-btn"
            disabled={loading}
            aria-label="Reset all filters to default values"
          >
            Reset Filters
          </button>
        </section>

        <div className="controls-bar">
          <PaginationControls />
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

            {Array.isArray(items) && items.length > 0 && totalPages > 1 && (
              <nav className="bottom-pagination-wrapper" aria-label="Page navigation">
                <PaginationControls />
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
