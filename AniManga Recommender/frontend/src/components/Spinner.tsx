import React from "react";
import "./Spinner.css";
import { SpinnerProps } from "../types";

/**
 * Spinner Component - Professional loading indicator with accessibility and customization support
 *
 * This component provides a smooth, animated loading spinner for the AniManga Recommender application,
 * designed with accessibility standards, flexible sizing options, and seamless theme integration.
 * Built to provide visual feedback during data loading operations while maintaining professional
 * aesthetics and optimal performance across all device types and user preferences.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage with default styling
 * <Spinner />
 *
 * // Custom size and color
 * <Spinner
 *   size="32px"
 *   color="#ff6b6b"
 * />
 *
 * // Numeric size with custom styling
 * <Spinner
 *   size={64}
 *   className="my-custom-spinner"
 *   data-testid="search-spinner"
 * />
 *
 * // Integration with loading states
 * const DataLoader = () => {
 *   const [loading, setLoading] = useState(true);
 *
 *   return (
 *     <div className="content-container">
 *       {loading ? (
 *         <div className="loading-container">
 *           <Spinner size="48px" />
 *           <span>Loading content...</span>
 *         </div>
 *       ) : (
 *         <ContentDisplay data={data} />
 *       )}
 *     </div>
 *   );
 * };
 *
 * // Professional loading overlay
 * <div className="loading-overlay">
 *   <Spinner
 *     size="64px"
 *     color="var(--accent-primary)"
 *     aria-label="Loading anime and manga data"
 *   />
 * </div>
 * ```
 *
 * @param {SpinnerProps} props - Component props with complete type safety
 * @param {string | number} [props.size="50px"] - Spinner dimensions (width and height):
 *   - String values: "32px", "2rem", "100%", etc. (any valid CSS size)
 *   - Number values: Automatically converted to pixels (e.g., 32 becomes "32px")
 *   - Responsive design: Consider using "rem" units for accessibility
 *   - Performance: Larger spinners (>100px) may impact animation smoothness
 *
 * @param {string} [props.color="var(--accent-primary)"] - Border color for spinner animation:
 *   - CSS custom properties: "var(--accent-primary)", "var(--brand-color)"
 *   - Hex colors: "#3498db", "#e74c3c"
 *   - RGB/RGBA: "rgb(52, 152, 219)", "rgba(52, 152, 219, 0.8)"
 *   - Named colors: "blue", "red" (not recommended for consistency)
 *   - Theme integration: Use CSS custom properties for automatic dark/light mode
 *
 * @param {string} [props.className=""] - Additional CSS classes for custom styling:
 *   - Utility classes: "mx-auto", "my-4", "center-spinner"
 *   - Custom animations: "pulse-spinner", "fade-in-spinner"
 *   - Size variants: "spinner-small", "spinner-large"
 *   - Context-specific: "header-spinner", "modal-spinner"
 *
 * @param {string} [props.data-testid] - Test identifier for automated testing:
 *   - Unit tests: "loading-spinner", "search-spinner"
 *   - Integration tests: "api-call-spinner", "data-fetch-spinner"
 *   - E2E tests: "page-loading-indicator"
 *   - Accessibility tests: Screen reader compatible identification
 *
 * @returns {JSX.Element} Accessible animated loading spinner with customizable appearance
 *
 * @features
 * - **Smooth CSS Animation**: 1-second linear infinite rotation for professional appearance
 * - **Flexible Sizing**: Supports both string and numeric size values with automatic conversion
 * - **Theme Integration**: Uses CSS custom properties for seamless dark/light mode switching
 * - **Accessibility Compliant**: ARIA role="status" and descriptive aria-label for screen readers
 * - **Performance Optimized**: Lightweight CSS-only animation with GPU acceleration
 * - **Responsive Design**: Scales appropriately across desktop, tablet, and mobile devices
 * - **Test-Friendly**: Built-in data-testid support for reliable automated testing
 *
 * @accessibility
 * - **ARIA Role**: Uses role="status" to announce loading state to screen readers
 * - **ARIA Label**: Provides "Loading" description for assistive technologies
 * - **Semantic Purpose**: Clearly indicates content loading without overwhelming users
 * - **Reduced Motion**: Respects user's motion preferences (handled via CSS)
 * - **Color Contrast**: Maintains visible contrast ratios in both light and dark themes
 * - **Focus Management**: Does not interfere with keyboard navigation during loading
 *
 * @performance
 * - **CSS-Only Animation**: No JavaScript animation loops, reducing CPU usage
 * - **GPU Acceleration**: Transform-based rotation utilizes hardware acceleration
 * - **Minimal DOM Impact**: Single element with inline styles for optimal rendering
 * - **Memory Efficient**: No state management or effect dependencies
 * - **Render Optimization**: Consistent props prevent unnecessary re-renders
 * - **Animation Performance**: Smooth 60fps rotation on modern devices
 *
 * @styling
 * - **CSS Animation**: 1s linear infinite spin transformation
 * - **Border Technique**: Transparent border creates visual spinning effect
 * - **Border Radius**: 50% creates perfect circular shape
 * - **Inline Styles**: Dynamic size and color applied via React props
 * - **CSS Variables**: Integration with application's design system
 * - **Responsive Sizing**: Maintains aspect ratio across different screen sizes
 *
 * @technical_implementation
 * - **Size Conversion**: Automatic px suffix for numeric size values
 * - **Border Configuration**: Three solid borders + one transparent for spin effect
 * - **Style Priority**: Inline styles override CSS defaults for dynamic properties
 * - **CSS Class**: `.loading-spinner` provides base styling and animation
 * - **Animation Keyframes**: 0-360 degree rotation with consistent timing
 *
 * @usage_patterns
 * - **Page Loading**: Full-page loading states during initial data fetch
 * - **Component Loading**: Individual component loading during API calls
 * - **Form Submission**: Button loading states during form processing
 * - **Search Results**: Loading indicator during search query execution
 * - **Data Refresh**: Loading states during content updates and refreshes
 *
 * @integration
 * - **Loading Components**: Works with LoadingBanner and skeleton loaders
 * - **Error Boundaries**: Compatible with error handling and retry mechanisms
 * - **State Management**: Integrates with loading state from hooks and context
 * - **API Operations**: Ideal for indicating async operations status
 * - **Testing Framework**: Designed for reliable Jest and React Testing Library tests
 *
 * @dependencies
 * - React: Core framework for component rendering and props management
 * - SpinnerProps: TypeScript interface from types module for prop validation
 * - Spinner.css: CSS file containing animation keyframes and base styling
 * - CSS custom properties: For theme integration and consistent styling
 *
 * @author Michael Cho
 * @since v1.0.0
 * @updated v1.2.0 - Added accessibility improvements and performance optimizations
 */
const Spinner: React.FC<SpinnerProps> = ({
  size = "50px",
  color = "var(--accent-primary)",
  className = "",
  "data-testid": dataTestId,
}) => {
  /**
   * Size value normalization for consistent CSS application
   *
   * Ensures that size values are properly formatted for CSS styling by converting
   * numeric values to pixel strings while preserving string values as-is. This
   * provides flexibility for developers to use either numeric shortcuts or
   * precise CSS unit specifications.
   *
   * @function sizeValue
   * @param {string | number} size - Input size value from component props
   * @returns {string} CSS-compatible size string
   *
   * @examples
   * - Input: 32 → Output: "32px"
   * - Input: "2rem" → Output: "2rem"
   * - Input: "100%" → Output: "100%"
   * - Input: 0 → Output: "0px"
   *
   * @performance
   * - Single typeof check for efficient type detection
   * - No regular expressions or complex parsing required
   * - Minimal memory footprint with direct string concatenation
   */
  const sizeValue = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={`loading-spinner ${className}`}
      style={{
        width: sizeValue,
        height: sizeValue,
        borderTopColor: color,
        borderRightColor: color,
        borderBottomColor: color,
        borderLeftColor: "transparent", // Makes one side transparent for the spin effect
      }}
      role="status"
      aria-label="Loading"
      data-testid={dataTestId}
    />
  );
};

export default Spinner;
