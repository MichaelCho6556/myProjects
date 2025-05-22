import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import "../App.css";

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
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get("genre") || "All");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "All");
  const [minScore, setMinScore] = useState(searchParams.get("min_score") || "");
  const [selectedYear, setSelectedYear] = useState(searchParams.get("year") || "");
  const [selectedTheme, setSelectedTheme] = useState(searchParams.get("theme") || "All");
  const [selectedDemographic, setSelectedDemographic] = useState(searchParams.get("demographic") || "All");
  const [selectedStudio, setSelectedStudio] = useState(searchParams.get("studio") || "All");
  const [selectedAuthor, setSelectedAuthor] = useState(searchParams.get("author") || "All");
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "score_desc");

  //state for dynamic filter options
  const [genreOptions, setGenreOptions] = useState(["All"]);
  const [statusOptions, setStatusOptions] = useState(["All"]);
  const [mediaTypeOptions, setMediaTypeOptions] = useState(["All"]);
  const [themeOptions, setThemeOptions] = useState(["All"]);
  const [demographicOptions, setDemographicOptions] = useState(["All"]);
  const [studioOptions, setStudioOptions] = useState(["All"]);
  const [authorOptions, setAuthorOptions] = useState(["All"]);
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
          setMediaTypeOptions(["All", ...(distinctData.media_types || [])]);
          setGenreOptions(["All", ...(distinctData.genres || [])]);
          setStatusOptions(["All", ...(distinctData.statuses || [])]);
          setThemeOptions(["All", ...(distinctData.themes || [])]);
          setDemographicOptions(["All", ...(distinctData.demographics || [])]);
          setStudioOptions(["All", ...(distinctData.studios || [])]);
          setAuthorOptions(["All", ...(distinctData.authors || [])]);
        }
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
        // Set default "All" options to prevent errors in dropdowns
        setMediaTypeOptions(["All"]);
        setGenreOptions(["All"]);
        setStatusOptions(["All"]);
        setThemeOptions(["All"]);
        setDemographicOptions(["All"]);
        setStudioOptions(["All"]);
        setAuthorOptions(["All"]);
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchFilterOptions();
  }, []); // Empty dependency array: runs only once on mount

  // Effect 2: Sync local state FROM URL searchParams (when URL changes externally)
  useEffect(() => {
    console.log("Effect 2 (URL -> State Sync) triggered. URL Params:", searchParams.toString());
    const newPage = parseInt(searchParams.get("page")) || 1;
    const newPerPage = parseInt(searchParams.get("per_page")) || DEFAULT_ITEMS_PER_PAGE;
    const newQuery = searchParams.get("q") || "";
    const newMediaType = searchParams.get("media_type") || "All";
    const newGenre = searchParams.get("genre") || "All";
    const newStatus = searchParams.get("status") || "All";
    const newMinScore = searchParams.get("min_score") || "";
    const newYear = searchParams.get("year") || "";
    const newTheme = searchParams.get("theme") || "All";
    const newDemographic = searchParams.get("demographic") || "All";
    const newStudio = searchParams.get("studio") || "All";
    const newAuthor = searchParams.get("author") || "All";

    setCurrentPage(newPage);
    setItemsPerPage(newPerPage);
    setInputValue(newQuery);
    setSearchTerm(newQuery); // Sync searchTerm as well
    setSelectedMediaType(newMediaType);
    setSelectedGenre(newGenre);
    setSelectedStatus(newStatus);
    setMinScore(newMinScore);
    setSelectedYear(newYear);
    setSelectedTheme(newTheme);
    setSelectedDemographic(newDemographic);
    setSelectedStudio(newStudio);
    setSelectedAuthor(newAuthor);
    setSortBy(searchParams.get("sort_by") || "score_desc");

    // This effect sets the state. The data fetching effect will then use these states.
  }, [searchParams]); // Only depends on searchParams

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
    if (selectedMediaType !== "All") newUrlParams.set("media_type", selectedMediaType);
    if (selectedGenre !== "All") newUrlParams.set("genre", selectedGenre);
    if (selectedStatus !== "All") newUrlParams.set("status", selectedStatus);
    if (minScore) newUrlParams.set("min_score", minScore);
    if (selectedYear) newUrlParams.set("year", selectedYear);
    if (selectedTheme !== "All") newUrlParams.set("theme", selectedTheme);
    if (selectedDemographic !== "All") newUrlParams.set("demographic", selectedDemographic);
    if (selectedStudio !== "All") newUrlParams.set("studio", selectedStudio);
    if (selectedAuthor !== "All") newUrlParams.set("author", selectedAuthor);
    if (sortBy && sortBy !== "score_desc") {
      newUrlParams.set("sort_by", sortBy);
    }

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

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
    setCurrentPage(1);
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

  const handleFilterChange = (setter, value, paramName) => {
    setter(value);
    if (currentPage !== 1) setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setInputValue("");
    setSearchTerm("");
    setSelectedMediaType("All");
    setSelectedGenre("All");
    setSelectedStatus("All");
    setMinScore("");
    setSelectedYear("");
    setSelectedTheme("All");
    setSelectedDemographic("All");
    setSelectedStudio("All");
    setSelectedAuthor("All");
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
    const newItemsPerPage = Number(event.target.value);
    setItemsPerPage(newItemsPerPage);
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

  return (
    <>
      <div ref={topOfPageRef}></div>
      <div className="filter-bar controls-bar">
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
          <select
            id="mediaTypeFilter"
            value={selectedMediaType}
            onChange={(e) => handleFilterChange(setSelectedMediaType, e.target.value, "media_type")}
            disabled={filtersLoading || loading}
          >
            {mediaTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="genreFilter">Genre:</label>
          <select
            id="genreFilter"
            value={selectedGenre}
            onChange={(e) => handleFilterChange(setSelectedGenre, e.target.value, "genre")}
            disabled={filtersLoading || loading}
          >
            {genreOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="statusFilter">Status:</label>
          <select
            id="statusFilter"
            value={selectedStatus}
            onChange={(e) => handleFilterChange(setSelectedStatus, e.target.value, "status")}
            disabled={filtersLoading || loading}
          >
            {statusOptions.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="themeFilter">Theme:</label>
          <select
            id="themeFilter"
            value={selectedTheme}
            onChange={(e) => handleFilterChange(setSelectedTheme, e.target.value, "theme")}
            disabled={filtersLoading || loading}
          >
            {themeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="demographicFilter">Demographic:</label>
          <select
            id="demographicFilter"
            value={selectedDemographic}
            onChange={(e) => handleFilterChange(setSelectedDemographic, e.target.value, "demographic")}
            disabled={filtersLoading || loading}
          >
            {demographicOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="studioFilter">Studio:</label>
          <select
            id="studioFilter"
            value={selectedStudio}
            onChange={(e) => handleFilterChange(setSelectedStudio, e.target.value, "studio")}
            disabled={filtersLoading || loading}
          >
            {studioOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="authorFilter">Author:</label>
          <select
            id="authorFilter"
            value={selectedAuthor}
            onChange={(e) => handleFilterChange(setSelectedAuthor, e.target.value, "author")}
            disabled={filtersLoading || loading}
          >
            {authorOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
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
            onChange={(e) => handleFilterChange(setMinScore, e.target.value, "minScore")}
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
            onChange={(e) => handleFilterChange(setSelectedYear, e.target.value, "year")}
            placeholder="e.g., 2024"
          />
        </div>

        <button onClick={handleResetFilters} className="reset-filters-btn" disabled={loading}>
          Reset Filters
        </button>
      </div>

      {/* --- Top Pagination and Items Per Page (Existing Controls Bar) --- */}
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
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {loading && <p>Loading Items...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!loading && !error && (
        <>
          <div className="item-list">
            {Array.isArray(items) && items.length > 0
              ? items.map((item) => <ItemCard key={item.uid} item={item} />)
              : // No direct message here, item-list will just be empty
                null}
          </div>

          {/* Conditionally render empty state message OUTSIDE and AFTER item-list */}
          {Array.isArray(items) && items.length === 0 && !loading && (
            <div className="empty-state-container">
              {/* Example with a simple text icon, replace with SVG or Font Awesome if preferred */}
              <div className="empty-state-icon">😕</div>
              <p className="empty-state-message">No items found for the current filters.</p>
              <p className="empty-state-suggestion">Try adjusting your search or filter criteria.</p>
            </div>
          )}

          {/* Only show bottom pagination if there are items AND more than one page */}
          {Array.isArray(items) && items.length > 0 && totalPages > 1 && (
            <div className="bottom-pagination-wrapper">
              <PaginationControls />
            </div>
          )}
        </>
      )}
      {!loading && Array.isArray(items) && items.length > 0 && (
        <button onClick={scrollToTop} className="scroll-to-top-btn">
          Scroll to Top
        </button>
      )}
    </>
  );
}

export default HomePage;
