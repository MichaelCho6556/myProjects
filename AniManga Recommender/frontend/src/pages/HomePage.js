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

function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize states with a default, then let an effect update them from URL
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(getInitialItemsPerPage()); // Use your helper
  const [totalItems, setTotalItems] = useState(0);

  // Filter states - initialize with defaults, URL will override
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [minScore, setMinScore] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("All");
  const [selectedDemographic, setSelectedDemographic] = useState("All");
  const [selectedStudio, setSelectedStudio] = useState("All");
  const [selectedAuthor, setSelectedAuthor] = useState("All");

  //state for dynamic filter options
  const [themeOptions, setThemeOptions] = useState([]);
  const [demographicOptions, setDemographicOptions] = useState([]);
  const [studioOptions, setStudioOptions] = useState([]);
  const [authorOptions, setAuthorOptions] = useState([]);
  const [genreOptions, setGenreOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [mediaTypeOptions, setMediaTypeOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const topOfPageRef = useRef(null); // For scrolling NEED ANIMATION EFFECTS ON
  const debounceTimeoutRef = useRef(null);
  const isInitialLoadDone = useRef(false); // To manage initial load behavior

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

  // Effect 2: Sync local filter states FROM URL searchParams
  // Runs on mount and whenever searchParams (from URL) changes.
  useEffect(() => {
    console.log("Effect 2 (URL -> State Sync) - searchParams:", searchParams.toString());
    setCurrentPage(parseInt(searchParams.get("page")) || 1);
    setItemsPerPage(parseInt(searchParams.get("per_page")) || getInitialItemsPerPage());
    const queryFromUrl = searchParams.get("q") || "";
    setInputValue(queryFromUrl);
    setSearchTerm(queryFromUrl);
    setSelectedMediaType(searchParams.get("media_type") || "All");
    setSelectedGenre(searchParams.get("genre") || "All");
    setSelectedStatus(searchParams.get("status") || "All");
    setMinScore(searchParams.get("min_score") || "");
    setSelectedYear(searchParams.get("year") || "");
    setSelectedTheme(searchParams.get("theme") || "All");
    setSelectedDemographic(searchParams.get("demographic") || "All");
    setSelectedStudio(searchParams.get("studio") || "All");
    setSelectedAuthor(searchParams.get("author") || "All");

    isInitialLoadDone.current = true; // Mark that initial state sync from URL is done
  }, [searchParams]);

  // Effect 3: Debounce inputValue to update searchTerm
  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      if (inputValue !== searchTerm) {
        setSearchTerm(inputValue);
        setCurrentPage(1);
      }
    }, DEBOUNCE_DELAY);
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [inputValue, searchTerm]); // Removed currentPage from here to avoid potential loops with its own setter

  // Effect 4: Sync URL searchParams FROM component filter states AND Fetch Items
  // This is the main effect that reacts to user interactions or programmatic state changes.
  useEffect(() => {
    // Don't run if the very first URL->State sync isn't done OR if filter options are still loading
    if (!isInitialUrlSyncDone.current || filtersLoading) {
      // If filters are loading, but initial URL sync is done, we might still want to show loading
      // and not an empty page if the URL had parameters.
      // This condition ensures we wait for both initial URL parsing and filter options.
      if (filtersLoading) setLoading(true); // Keep loading true if filters are still coming
      return;
    }

    // 1. Update URL from current state
    const newUrlParams = new URLSearchParams();
    if (currentPage > 1) newUrlParams.set("page", currentPage.toString());
    if (itemsPerPage !== getInitialItemsPerPage()) newUrlParams.set("per_page", itemsPerPage.toString());
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

    if (searchParams.toString() !== newUrlParams.toString()) {
      console.log("Effect 4 (State -> URL & Fetch): Updating URL to", newUrlParams.toString());
      setSearchParams(newUrlParams, { replace: true });
      // When setSearchParams is called, Effect 2 will run.
      // We want to avoid fetching items in *this* run of Effect 4 if the URL was just updated,
      // as Effect 2 will set states, which will then re-trigger *this* Effect 4.
      // The fetch should happen when this effect runs *after* Effect 2 has stabilized the state.
      return; // Exit this effect run; Effect 2 will set state, then this effect runs again.
    }

    // 2. Fetch Items (only if URL is stable with current state)
    const fetchItems = async () => {
      if (topOfPageRef.current) {
        /* ... scroll logic ... */
      }
      setLoading(true);
      setError(null);

      const apiCallParams = newUrlParams; // Use the same params built for URL update
      console.log("Effect 4 (Fetch Items): Fetching with params:", apiCallParams.toString());

      try {
        const response = await axios.get(`${API_BASE_URL}/items?${apiCallParams.toString()}`);
        let responseData = response.data;
        if (typeof responseData === "string") {
          try {
            responseData = JSON.parse(responseData);
          } catch (e) {
            console.error("Items data not valid JSON", e);
            throw new Error("Items data not valid JSON");
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

    fetchItems();
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
    filtersLoading, // To re-evaluate when filters are loaded
    searchParams,
    setSearchParams, // searchParams to react to URL changes, setSearchParams for updating
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
    setSearchTerm(inputValue);
    setCurrentPage(1);
  };

  const handleFilterChange = (setter, value, paramName) => {
    setter(value);
    setCurrentPage(1);
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

  const PaginationControls = () => (
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
  );

  return (
    <>
      <div ref={topOfPageRef}></div>
      <div className="filter-bar controls-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input type="text" placeholder="Search titles..." value={inputValue} onChange={handleInputChange} />
          <button type="submit">Search</button>
        </form>

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
