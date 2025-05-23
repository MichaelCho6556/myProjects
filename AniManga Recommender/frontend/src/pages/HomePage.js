import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import "../App.css";
import Select from "react-select";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Spinner from "../components/Spinner";

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
const getMultiSelectValue = (value, options) => {
  if (!value || value.toLowerCase() === "all") return [];
  if (Array.isArray(value)) return value;

  const selectedValues = value.split(",");
  return options.filter((opt) => selectedValues.includes(opt.value));
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
      }
    };
    fetchFilterOptions();
  }, []); // Empty dependency array: runs only once on mount

  // Effect 2: Sync local state FROM URL searchParams (when URL changes externally)
  useEffect(() => {
    if (filtersLoading && !isMounted.current) return; // Wait for filter options if not yet mounted

    setCurrentPage(parseInt(searchParams.get("page")) || 1);
    setItemsPerPage(parseInt(searchParams.get("per_page")) || DEFAULT_ITEMS_PER_PAGE);
    const query = searchParams.get("q") || "";
    setInputValue(query);
    setSearchTerm(query);
    setSelectedMediaType(searchParams.get("media_type") || "All");

    // MODIFIED: Handle multi-select from URL
    setSelectedGenre(getMultiSelectValue(searchParams.get("genre"), genreOptions));
    setSelectedTheme(getMultiSelectValue(searchParams.get("theme"), themeOptions));
    setSelectedDemographic(getMultiSelectValue(searchParams.get("demographic"), demographicOptions));
    setSelectedStudio(getMultiSelectValue(searchParams.get("studio"), studioOptions));
    setSelectedAuthor(getMultiSelectValue(searchParams.get("author"), authorOptions));

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
        // setCurrentPage(1); // Let main effect handle page reset if searchTerm changes
      }
    }, DEBOUNCE_DELAY);
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [inputValue, searchTerm]);

  // Effect 4: Sync URL searchParams FROM component filter states AND Fetch Items
  // This is the main effect that reacts to user interactions or programmatic state changes.
  useEffect(() => {
    // Don't run if the very first URL->State sync isn't done OR if filter options are still loading
    if (filtersLoading && !isMounted.current) {
      console.log("Main Effect: Filters loading on initial mount, delaying.");
      return;
    }

    // 1. Update URL from current state
    const newUrlParams = new URLSearchParams();
    if (currentPage > 1) newUrlParams.set("page", currentPage.toString());
    if (itemsPerPage !== DEFAULT_ITEMS_PER_PAGE) newUrlParams.set("per_page", itemsPerPage.toString());
    if (searchTerm) newUrlParams.set("q", searchTerm);
    if (selectedMediaType && selectedMediaType !== "All") newUrlParams.set("media_type", selectedMediaType);

    // MODIFIED: Handle multi-select for URL
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

    if (searchParams.toString() !== newUrlParams.toString()) {
      console.log("Main Effect (URL Update): Updating URL to", newUrlParams.toString());
      setSearchParams(newUrlParams, { replace: true });
      // When setSearchParams is called, Effect 2 will run and re-sync states.
      // This current effect will also re-run because `searchParams` is a dependency.
      // On that re-run, this `if` block should be false, and it will proceed to fetch.
      return; // Important: Exit this run to let URL sync and state re-sync happen.
    }

    // 2. Fetch Items (only if URL is stable with current state)
    const fetchItems = async () => {
      if (
        topOfPageRef.current &&
        (currentPage !== 1 ||
          itemsPerPage !== DEFAULT_ITEMS_PER_PAGE ||
          searchTerm ||
          selectedMediaType !== "All" ||
          selectedGenre !== "All" ||
          selectedStatus !== "All" ||
          minScore ||
          selectedYear ||
          selectedTheme !== "All" ||
          selectedDemographic !== "All" ||
          selectedStudio !== "All" ||
          selectedAuthor !== "All")
      ) {
        topOfPageRef.current.scrollIntoView({ behavior: "smooth" });
      }
      setLoading(true);
      setError(null);

      const apiCallParamsString = newUrlParams.toString(); // Use the params we just built/verified
      console.log("Main Effect (Fetch Items): Fetching with params:", apiCallParamsString);

      try {
        const response = await axios.get(`${API_BASE_URL}/items?${apiCallParamsString}`);
        let responseData = response.data;
        if (typeof responseData === "string") {
          try {
            responseData = JSON.parse(responseData);
          } catch (e) {
            console.error("Items data not valid JSON", e);
            setItems([]);
            setTotalPages(1);
            setTotalItems(0);
            setError("Invalid data format from server.");
            setLoading(false);
            return;
          }
        }
        if (responseData && Array.isArray(responseData.items)) {
          setItems(responseData.items);
          setTotalPages(responseData.total_pages || 1);
          setTotalItems(responseData.total_items || 0);
        } else {
          console.error("Unexpected items API structure:", responseData);
          setItems([]);
          setTotalPages(1);
          setTotalItems(0);
          setError("Unexpected data structure for items.");
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
    };

    if (isMounted.current || searchParams.toString() !== "") {
      // Fetch if not initial mount OR if URL has params
      fetchItems();
    } else if (!filtersLoading) {
      // If initial mount, no URL params, but filters are loaded, then fetch
      fetchItems();
    }

    if (!isMounted.current) {
      isMounted.current = true;
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
    filtersLoading,
    searchParams,
    setSearchParams,
  ]);

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
    <div className="pagination-controls">
      <button onClick={handlePrevPage} disabled={currentPage <= 1 || loading}>
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages}
        {items.length > 0 &&
          !loading &&
          ` (Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(
            currentPage * itemsPerPage,
            totalItems
          )} of ${totalItems})`}
      </span>
      <button onClick={handleNextPage} disabled={currentPage >= totalPages || loading}>
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

  return (
    <>
      <div ref={topOfPageRef}></div>
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input type="text" placeholder="Search titles..." value={inputValue} onChange={handleInputChange} />
          <button type="submit">Search</button>
        </form>

        <div className="filter-group sort-by-selector">
          <label htmlFor="sortBy">Sort by:</label>
          <select id="sortBy" value={sortBy} onChange={handleSortChange} disabled={loading || filtersLoading}>
            <option value="score_desc">Score (High to Low)</option>
            <option value="score_asc">Score (Low to High)</option>
            <option value="popularity_desc">Popularity</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
            <option value="start_date_desc">Release Date (Newest)</option>
            <option value="start_date_asc">Release Date (Oldest)</option>
          </select>
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
          />
        </div>

        {/* MODIFIED: Genre Filter with react-select */}
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
          />
        </div>

        {/* MODIFIED: Theme Filter with react-select */}
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
          />
        </div>
        {/* You can convert Demographic, Studio, Author similarly if desired */}
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
          />
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
          />
        </div>
        <button onClick={handleResetFilters} className="reset-filters-btn" disabled={loading}>
          Reset Filters
        </button>
      </div>

      <div className="controls-bar">
        <PaginationControls />
        <div className="items-per-page-selector">
          <label htmlFor="itemsPerPage">Items per page: </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            disabled={loading}
          >
            {[10, 20, 25, 30, 50].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div
          className="loading-container"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            padding: "50px",
          }}
        >
          <Spinner size="70px" />
          {/* Optionally add text: <p style={{marginTop: '15px', color: 'var(--text-secondary)'}}>Loading items...</p> */}
        </div>
      )}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!loading && !error && (
        <>
          <div className="item-list">
            {Array.isArray(items) && items.length > 0
              ? items.map((item) => <ItemCard key={item.uid} item={item} />)
              : null}
          </div>
          {Array.isArray(items) && items.length === 0 && !loading && (
            <div className="empty-state-container">
              <div className="empty-state-icon">😕</div>
              <p className="empty-state-message">No items found for the current filters.</p>
              <p className="empty-state-suggestion">Try adjusting your search or filter criteria.</p>
            </div>
          )}
          {Array.isArray(items) && items.length > 0 && totalPages > 1 && (
            <div className="bottom-pagination-wrapper" style={{ marginTop: "20px" }}>
              {" "}
              <PaginationControls />{" "}
            </div>
          )}
        </>
      )}
      {!loading && Array.isArray(items) && items.length > 0 && (
        <button onClick={scrollToTop} className="scroll-to-top-btn">
          ↑
        </button>
      )}
    </>
  );
}
export default HomePage;
