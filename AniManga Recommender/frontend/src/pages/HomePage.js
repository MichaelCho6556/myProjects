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

  const topOfPageRef = useRef(null); // For scrolling

  useEffect(() => {
    const fetchItems = async () => {
      if (topOfPageRef.current) {
        // Only scroll if not the initial load or if page/itemsPerPage changes
        if (currentPage !== 1 || itemsPerPage !== 30) {
          // Adjust initial itemsPerPage if different
          topOfPageRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }

      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/items?page=${currentPage}&per_page=${itemsPerPage}`
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
  }, [currentPage, itemsPerPage]);

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
      {" "}
      {/* Using Fragment as the top-level element for this page */}
      <div ref={topOfPageRef}></div>
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
              <p>No items found or data is not in the expected format.</p>
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
