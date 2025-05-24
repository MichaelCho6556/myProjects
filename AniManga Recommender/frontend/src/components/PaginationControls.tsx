import React from "react";
import { PaginationControlsProps } from "../types";

/**
 * PaginationControls Component - Handles pagination navigation with full TypeScript support
 *
 * @param props - Component props with complete type safety
 * @returns JSX.Element
 */
const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  items = [],
  loading = false,
  onPrevPage,
  onNextPage,
  className = "",
}) => {
  /**
   * Calculate the range of items being displayed
   * @returns Object containing start and end item numbers
   */
  const getDisplayRange = (): { start: number; end: number } => {
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
  const handlePrevious = (): void => {
    if (canGoPrevious && onPrevPage) {
      onPrevPage();
    }
  };

  /**
   * Handle next page navigation with validation
   */
  const handleNext = (): void => {
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
        type="button"
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
        type="button"
      >
        Next
      </button>
    </div>
  );
};

export default React.memo(PaginationControls);
