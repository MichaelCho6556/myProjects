import React from "react";

/**
 * PaginationControls Component - Handles pagination navigation
 *
 * @param {Object} props - Component props
 * @param {number} props.currentPage - Current active page number
 * @param {number} props.totalPages - Total number of available pages
 * @param {number} props.totalItems - Total number of items across all pages
 * @param {number} props.itemsPerPage - Number of items displayed per page
 * @param {Array} props.items - Current page items (for display calculations)
 * @param {boolean} props.loading - Loading state to disable controls
 * @param {Function} props.onPrevPage - Handler for previous page navigation
 * @param {Function} props.onNextPage - Handler for next page navigation
 * @param {string} props.className - Additional CSS classes
 */
function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  items = [],
  loading = false,
  onPrevPage,
  onNextPage,
  className = "",
}) {
  /**
   * Calculate the range of items being displayed
   * @returns {Object} Object containing start and end item numbers
   */
  const getDisplayRange = () => {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    return { start, end };
  };

  const { start, end } = getDisplayRange();
  const hasItems = items.length > 0;
  const canGoPrevious = currentPage > 1 && !loading;
  const canGoNext = currentPage < totalPages && !loading;

  /**
   * Handle previous page navigation with validation
   */
  const handlePrevious = () => {
    if (canGoPrevious && onPrevPage) {
      onPrevPage();
    }
  };

  /**
   * Handle next page navigation with validation
   */
  const handleNext = () => {
    if (canGoNext && onNextPage) {
      onNextPage();
    }
  };

  return (
    <div className={`pagination-controls ${className}`} role="navigation" aria-label="Pagination">
      <button
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        aria-label={`Go to previous page (currently on page ${currentPage})`}
        title="Previous page"
      >
        Previous
      </button>

      <span className="pagination-info" aria-live="polite">
        Page {currentPage} of {totalPages}
        {hasItems && !loading && ` (Showing ${start}-${end} of ${totalItems})`}
      </span>

      <button
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label={`Go to next page (currently on page ${currentPage} of ${totalPages})`}
        title="Next page"
      >
        Next
      </button>
    </div>
  );
}

export default React.memo(PaginationControls);
