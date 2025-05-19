import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import "../App.css";

const API_BASE_URL = "http://localhost:5000/api";

function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  const [totalItems, setTotalItems] = useState(0);

  //filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [minScore, setMinScore] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  //state for dynamic filter options
  const [genreOptions, setGenreOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [mediaTypeOptions, setMediaTypeOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const topOfPageRef = useRef(null); // For scrolling

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

  //effect to fetch items based on filters and pagination
  useEffect(() => {
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
      if (selectedMediaType !== "All")
        params.append("media_type", selectedMediaType);
      if (selectedGenre !== "All") params.append("genre", selectedGenre);
      if (selectedStatus !== "All") params.append("status", selectedStatus);
      if (minScore && !isNaN(parseFloat(minScore)))
        params.append("min_score", parseFloat(minScore));
      if (selectedYear && !isNaN(parseInt(selectedYear)))
        params.append("year", parseInt(selectedYear));

      try {
        const response = await axios.get(
          `${API_BASE_URL}/items?${params.toString()}`
        );

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
          console.error(
            "Unexpected API response structure after parsing:",
            responseData
          );
          setItems([]);
          setTotalPages(1);
          setTotalItems(0);
          setError(
            "Received an unexpected data structure from the server after parsing."
          );
        }
      } catch (err) {
        console.error("Failed to fetch items:", err);
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setError(
          err.message || "Failed to fetch items. Is the backend running?"
        );
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
  ]);

  const handleSearchChange = (event) => setSearchTerm(event.target.value);
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setCurrentPage(1);
  };

  const handleFilterChange = (setter, value) => {
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
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

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
      <button
        onClick={handleNextPage}
        disabled={currentPage >= totalPages || loading}
      >
        Next
      </button>
    </div>
  );

  return (
    <>
      <div ref={topOfPageRef}></div>
      <div className="filter-bar controls-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Search titles..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <button type="submit">Search</button>
        </form>

        <div className="filter-group">
          <label htmlFor="mediaTypeFilter">Type:</label>
          <select
            id="mediaTypeFilter"
            value={selectedMediaType}
            onChange={(e) =>
              handleFilterChange(setSelectedMediaType, e.target.value)
            }
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
            onChange={(e) =>
              handleFilterChange(setSelectedGenre, e.target.value)
            }
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
            onChange={(e) =>
              handleFilterChange(setSelectedStatus, e.target.value)
            }
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
            onChange={(e) => handleFilterChange(setMinScore, e.target.value)}
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
            onChange={(e) =>
              handleFilterChange(setSelectedYear, e.target.value)
            }
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
            {Array.isArray(items) && items.length > 0 ? (
              items.map((item) => <ItemCard key={item.uid} item={item} />)
            ) : (
              <p>No items found for the current filters.</p> // Updated message
            )}
          </div>
          <div className="bottom-pagination-wrapper">
            <PaginationControls />
          </div>
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
