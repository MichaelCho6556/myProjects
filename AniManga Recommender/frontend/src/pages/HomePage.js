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

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initialPage = parseInt(searchParams.get("page")) || 1;
  const initialItemsPerPage = parseInt(searchParams.get("per_page")) || getInitialItemsPerPage();

  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get("per_page")) || 30);
  const [totalItems, setTotalItems] = useState(0);

  //filter states
  const [inputValue, setInputValue] = useState(searchParams.get("q") || ""); //what user types
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || ""); //debounced search term for API
  const [selectedMediaType, setSelectedMediaType] = useState(searchParams.get("media_type") || "All");
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get("genre") || "All");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "All");
  const [minScore, setMinScore] = useState(searchParams.get("min_score") || "");
  const [selectedYear, setSelectedYear] = useState(searchParams.get("year") || "");

  //state for dynamic filter options
  const [genreOptions, setGenreOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [mediaTypeOptions, setMediaTypeOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const topOfPageRef = useRef(null); // For scrolling NEED ANIMATION EFFECTS ON
  const debounceTimeoutRef = useRef(null);

  //effect to fetch distinct filter options once on component mount
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
            throw new Error("Filter options data not valid JSON");
          }
        }

        if (distinctData) {
          setGenreOptions(["All", ...(distinctData.genres || [])]);
          setStatusOptions(["All", ...(distinctData.statuses || [])]);
          setMediaTypeOptions(["All", ...(distinctData.media_types || [])]);
        }
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
        setGenreOptions(["All"]);
        setStatusOptions(["All"]);
        setMediaTypeOptions(["All"]);
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchFilterOptions();
  }, []);

  //effect for debouncing search input
  useEffect(() => {
    //clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    //set a new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      setSearchTerm(inputValue); // updaing the actual search term after delay
      setCurrentPage(1);
    }, DEBOUNCE_DELAY);

    //cleanup funciton to clear tiemout if component unmounts or inputValue changes again
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [inputValue]);

  //effect to fetch items based on filters and pagination and update localStorage for itemsPerPage
  useEffect(() => {
    //update URL search params when filters cahnge, good for sharable URLs
    const currentParams = new URLSearchParams();
    if (currentPage > 1) currentParams.set("page", currentPage.toString());
    if (itemsPerPage !== 30) currentParams.set("per_page", itemsPerPage.toString());
    if (searchTerm) currentParams.set("q", searchTerm);
    if (selectedMediaType !== "All") currentParams.set("media_type", selectedMediaType);
    if (selectedGenre !== "All") currentParams.set("genre", selectedGenre);
    if (selectedStatus !== "All") currentParams.set("status", selectedStatus);
    if (minScore) currentParams.set("min_score", minScore);
    if (selectedYear) currentParams.set("year", selectedYear);
    // only update URL if params actually changed to avoid unnecessary re-renders/history entries
    if (searchParams.toString() !== currentParams.toString()) {
      setSearchParams(currentParams, { replace: true });
    }

    //save itemsPerPage to localStorage when it changes
    localStorage.setItem("aniMangaItemsPerPage", itemsPerPage.toString());

    //dont fetch items if filter options are still loading to avoid race conditons
    if (filtersLoading && genreOptions.length <= 1) return;
    const fetchItems = async () => {
      if (topOfPageRef.current) {
        // Only scroll if not the initial load or if page/itemsPerPage changes
        if (
          currentPage !== 1 ||
          itemsPerPage !== 30 ||
          searchTerm ||
          selectedMediaType !== "All" ||
          selectedGenre !== "All" ||
          selectedStatus !== "All" ||
          minScore ||
          selectedYear
        ) {
          // Adjust initial itemsPerPage if different
          topOfPageRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("per_page", itemsPerPage);
      if (searchTerm) params.append("q", searchTerm);
      if (selectedMediaType !== "All") params.append("media_type", selectedMediaType);
      if (selectedGenre !== "All") params.append("genre", selectedGenre);
      if (selectedStatus !== "All") params.append("status", selectedStatus);
      if (minScore && !isNaN(parseFloat(minScore))) params.append("min_score", parseFloat(minScore));
      if (selectedYear && !isNaN(parseInt(selectedYear))) params.append("year", parseInt(selectedYear));

      try {
        const response = await axios.get(`${API_BASE_URL}/items?${params.toString()}`);

        let responseData = response.data;
        if (typeof responseData === "string") {
          try {
            responseData = JSON.parse(responseData);
          } catch (parseError) {
            console.error("Failed to parse response data as JSON:", parseError);
            setItems([]);
            setTotalPages(1);
            setTotalItems(0);
            setError("Received data from server, but it was not valid JSON.");
            setLoading(false);
            return;
          }
        }

        if (responseData && Array.isArray(responseData.items)) {
          setItems(responseData.items);
          setTotalPages(responseData.total_pages || 1);
          setTotalItems(responseData.total_items || 0);
        } else {
          console.error("Unexpected API response structure after parsing:", responseData);
          setItems([]);
          setTotalPages(1);
          setTotalItems(0);
          setError("Received an unexpected data structure from the server after parsing.");
        }
      } catch (err) {
        console.error("Failed to fetch items:", err);
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setError(err.message || "Failed to fetch items. Is the backend running?");
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
    filtersLoading,
    genreOptions,
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
