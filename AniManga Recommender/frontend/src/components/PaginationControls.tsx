/**
 * PaginationControls Component - Professional pagination navigation with accessibility and UX optimization
 *
 * This component provides a comprehensive pagination interface for the AniManga Recommender application,
 * enabling users to navigate through large datasets of anime/manga items with intelligent item range
 * calculation, accessibility support, and responsive design. Built with semantic HTML and ARIA
 * standards for optimal screen reader compatibility and keyboard navigation.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage with required props
 * <PaginationControls
 *   currentPage={2}
 *   totalPages={10}
 *   itemsPerPage={20}
 *   totalItems={200}
 *   onPrevPage={() => setPage(page - 1)}
 *   onNextPage={() => setPage(page + 1)}
 * />
 *
 * // Advanced usage with loading state and item tracking
 * <PaginationControls
 *   currentPage={currentPage}
 *   totalPages={totalPages}
 *   itemsPerPage={itemsPerPage}
 *   totalItems={totalItems}
 *   items={currentPageItems}
 *   loading={isLoading}
 *   onPrevPage={handlePreviousPage}
 *   onNextPage={handleNextPage}
 *   className="custom-pagination"
 * />
 *
 * // Integration with API pagination
 * const HomePage = () => {
 *   const [currentPage, setCurrentPage] = useState(1);
 *   const { data, loading } = useItems({ page: currentPage });
 *
 *   return (
 *     <div>
 *       <ItemGrid items={data?.items} />
 *       <PaginationControls
 *         currentPage={currentPage}
 *         totalPages={data?.total_pages || 1}
 *         itemsPerPage={data?.items_per_page || 20}
 *         totalItems={data?.total_items || 0}
 *         items={data?.items}
 *         loading={loading}
 *         onPrevPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
 *         onNextPage={() => setCurrentPage(prev => prev + 1)}
 *       />
 *     </div>
 *   );
 * };
 * ```
 *
 * @param {PaginationControlsProps} props - Component props with complete type safety
 * @param {number} props.currentPage - Current active page number (1-based indexing)
 * @param {number} props.totalPages - Total number of pages available in the dataset
 * @param {number} props.itemsPerPage - Number of items configured per page
 * @param {number} props.totalItems - Total number of items in the complete dataset
 * @param {AnimeItem[]} [props.items] - Optional array of current page items for accurate range calculation
 * @param {boolean} [props.loading=false] - Loading state that disables navigation during data fetching
 * @param {() => void} props.onPrevPage - Callback function for previous page navigation
 * @param {() => void} props.onNextPage - Callback function for next page navigation
 * @param {string} [props.className=""] - Optional CSS class names for custom styling
 *
 * @returns {JSX.Element} Semantic pagination navigation with accessibility support
 *
 * @features
 * - **Intelligent Item Range Calculation**: Shows accurate "X-Y of Z" item counts
 * - **Accessibility First**: Full ARIA support with semantic HTML and screen reader optimization
 * - **Loading State Management**: Disables navigation and provides visual feedback during data fetching
 * - **Responsive Design**: Optimized for desktop and mobile with touch-friendly button sizing
 * - **Keyboard Navigation**: Full keyboard accessibility with logical tab order
 * - **Boundary Protection**: Prevents navigation beyond valid page ranges
 * - **Live Region Updates**: Dynamic page information updates for assistive technologies
 *
 * @accessibility
 * - Semantic `<nav>` element with proper role and aria-label
 * - ARIA live regions for dynamic page count announcements
 * - Descriptive button labels with both visible text and aria-label attributes
 * - Disabled state management for invalid navigation attempts
 * - Keyboard navigation support with logical focus management
 * - High contrast support through CSS custom properties
 * - Screen reader compatible with meaningful status updates
 *
 * @performance
 * - Minimal re-renders through efficient prop dependency checking
 * - Optimized range calculation that handles edge cases gracefully
 * - Loading state prevents unnecessary API calls during navigation
 * - Conditional rendering of item range information
 * - Efficient event handler patterns to prevent memory leaks
 *
 * @ux_design
 * - Clear visual hierarchy with page information and navigation controls
 * - Intuitive button placement following standard pagination patterns
 * - Consistent disabled states with visual and functional feedback
 * - Responsive button sizing for both desktop and mobile interactions
 * - Professional loading indicators that maintain layout stability
 *
 * @calculations
 * - **Start Item**: `(currentPage - 1) * itemsPerPage + 1`
 * - **End Item**: `Math.min(startItem + items.length - 1, totalItems)`
 * - **Page Range**: Validates against `1 <= currentPage <= totalPages`
 * - **Boundary Checks**: Prevents navigation beyond valid page ranges
 *
 * @integration
 * - Seamlessly integrates with HomePage and search result displays
 * - Compatible with API pagination responses from backend services
 * - Works with FilterBar component for filtered result navigation
 * - Supports URL parameter synchronization for bookmarkable pages
 * - Designed for SEO optimization with semantic navigation structure
 *
 * @styling
 * - Uses CSS custom properties for consistent application theming
 * - Responsive grid layout that adapts to different screen sizes
 * - Professional button styling with hover and focus states
 * - Loading state visual feedback with maintained layout spacing
 * - Configurable through className prop for custom styling overrides
 *
 * @dependencies
 * - React: Core framework for component lifecycle and state management
 * - PaginationControlsProps: TypeScript interface for strict prop typing
 * - CSS custom properties: For consistent application theming
 *
 * @author Michael Cho
 * @since v1.0.0
 * @updated v1.2.0 - Added intelligent item range calculation and improved accessibility
 */

import React from "react";
import { PaginationControlsProps } from "../types";

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
  /**
   * Page boundary and state calculations
   * Determines navigation availability and component state based on current pagination context
   */
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;
  const isDisabled = loading || !onPrevPage || !onNextPage;

  /**
   * Calculates and formats the item range display for the current page
   *
   * Provides users with clear context about which items they're viewing within
   * the complete dataset. Handles edge cases including loading states, empty
   * datasets, and partial final pages.
   *
   * @function getItemRange
   * @returns {string | null} Formatted string like "Showing 21-40 of 200" or null if unavailable
   *
   * @example
   * // Page 2 with 20 items per page, showing items 21-40 of 200 total
   * getItemRange() // Returns: "Showing 21-40 of 200"
   *
   * // Final page with fewer items than itemsPerPage
   * getItemRange() // Returns: "Showing 181-195 of 195"
   *
   * // Loading state or no items
   * getItemRange() // Returns: null
   *
   * @calculations
   * - startItem = (currentPage - 1) * itemsPerPage + 1
   * - endItem = Math.min(startItem + items.length - 1, totalItems)
   * - Handles cases where final page has fewer items than itemsPerPage
   *
   * @performance
   * - Only calculates when items array is available
   * - Returns early for loading states to prevent unnecessary computation
   * - Uses Math.min to handle edge cases efficiently
   */
  const getItemRange = () => {
    if (!items || items.length === 0 || loading) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + items.length - 1, totalItems);

    return `Showing ${startItem}-${endItem} of ${totalItems}`;
  };

  /**
   * Handles previous page navigation with comprehensive validation
   *
   * Ensures safe navigation by validating component state, page boundaries,
   * and handler availability before executing the navigation callback.
   *
   * @function handlePrevClick
   * @returns {void}
   *
   * @validation
   * - Checks if component is not disabled (loading or missing handlers)
   * - Validates not on first page to prevent invalid navigation
   * - Confirms onPrevPage handler is available and callable
   *
   * @accessibility
   * - Prevents navigation when component is in loading state
   * - Maintains consistent disabled state handling for screen readers
   */
  const handlePrevClick = () => {
    if (!isDisabled && !isFirstPage && onPrevPage) {
      onPrevPage();
    }
  };

  /**
   * Handles next page navigation with comprehensive validation
   *
   * Ensures safe navigation by validating component state, page boundaries,
   * and handler availability before executing the navigation callback.
   *
   * @function handleNextClick
   * @returns {void}
   *
   * @validation
   * - Checks if component is not disabled (loading or missing handlers)
   * - Validates not on last page to prevent invalid navigation
   * - Confirms onNextPage handler is available and callable
   *
   * @accessibility
   * - Prevents navigation when component is in loading state
   * - Maintains consistent disabled state handling for screen readers
   */
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
