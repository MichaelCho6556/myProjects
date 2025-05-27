/**
 * PaginationControls Component
 * Handles pagination navigation with accessibility support
 */

import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  loading?: boolean;
  items?: any[];
  className?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPrevPage,
  onNextPage,
  loading = false,
  items,
  className = "",
}) => {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;
  const isDisabled = loading || !onPrevPage || !onNextPage;

  // Calculate item range for display
  const getItemRange = () => {
    if (!items || items.length === 0 || loading) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + items.length - 1, totalItems);

    return `Showing ${startItem}-${endItem} of ${totalItems}`;
  };

  const handlePrevClick = () => {
    if (!isDisabled && !isFirstPage && onPrevPage) {
      onPrevPage();
    }
  };

  const handleNextClick = () => {
    if (!isDisabled && !isLastPage && onNextPage) {
      onNextPage();
    }
  };

  return (
    <nav
      className={`pagination-controls ${className}`.trim()}
      role="navigation"
      aria-label="Pagination navigation"
    >
      <div className="pagination-info">
        <span aria-live="polite">
          Page {currentPage} of {totalPages}
        </span>

        {getItemRange() && <span className="item-range">{getItemRange()}</span>}
      </div>

      <div className="pagination-buttons">
        <button
          type="button"
          onClick={handlePrevClick}
          disabled={isDisabled || isFirstPage}
          className="btn btn-pagination btn-prev"
          aria-label="Go to previous page"
          title="Previous page"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={handleNextClick}
          disabled={isDisabled || isLastPage}
          className="btn btn-pagination btn-next"
          aria-label="Go to next page"
          title="Next page"
        >
          Next
        </button>
      </div>
    </nav>
  );
};

export default PaginationControls;
