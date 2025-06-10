/**
 * SkeletonCard Component - Professional loading placeholder with shimmer animation and accessibility
 *
 * This component provides a sophisticated skeleton loading placeholder for ItemCard components
 * in the AniManga Recommender application. Built with accessibility standards, smooth shimmer
 * animations, and responsive design principles to maintain user engagement during data loading
 * operations while providing clear visual feedback about content structure and loading progress.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage as ItemCard placeholder
 * <SkeletonCard />
 *
 * // Custom styling with additional classes
 * <SkeletonCard className="featured-skeleton" />
 *
 * // Grid layout with multiple skeleton cards
 * const LoadingGrid = () => (
 *   <div className="items-grid">
 *     {Array.from({ length: 12 }, (_, index) => (
 *       <SkeletonCard key={index} />
 *     ))}
 *   </div>
 * );
 *
 * // Conditional rendering during data loading
 * const ItemsDisplay = () => {
 *   const { data, loading } = useItems();
 *
 *   return (
 *     <div className="content-grid">
 *       {loading ? (
 *         // Show skeleton cards while loading
 *         Array.from({ length: itemsPerPage }, (_, index) => (
 *           <SkeletonCard key={index} />
 *         ))
 *       ) : (
 *         // Show actual item cards when loaded
 *         data?.items.map(item => (
 *           <ItemCard key={item.uid} item={item} />
 *         ))
 *       )}
 *     </div>
 *   );
 * };
 *
 * // Advanced loading state with mixed content
 * const ProgressiveLoading = () => {
 *   const [loadedItems, setLoadedItems] = useState([]);
 *   const [remainingCount, setRemainingCount] = useState(12);
 *
 *   return (
 *     <div className="progressive-grid">
 *       {loadedItems.map(item => (
 *         <ItemCard key={item.uid} item={item} />
 *       ))}
 *       {Array.from({ length: remainingCount }, (_, index) => (
 *         <SkeletonCard key={`skeleton-${index}`} />
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 *
 * @param {SkeletonCardProps} props - Component props with type safety
 * @param {string} [props.className=""] - Additional CSS classes for custom styling:
 *   - Layout utilities: "featured-card", "compact-view", "list-mode"
 *   - Grid positioning: "grid-item", "spotlight-card", "sidebar-card"
 *   - Custom animations: "slow-shimmer", "fast-shimmer", "pulse-mode"
 *   - Theme variants: "dark-skeleton", "light-skeleton", "high-contrast"
 *   - Responsive modifiers: "mobile-optimized", "desktop-enhanced"
 *
 * @returns {JSX.Element} Accessible skeleton loading placeholder with shimmer animation
 *
 * @features
 * - **Shimmer Animation**: Smooth gradient animation mimicking content loading progression
 * - **Accessibility Compliant**: ARIA live regions, status announcements, and screen reader support
 * - **Responsive Design**: Adapts to different screen sizes maintaining proper aspect ratios
 * - **Performance Optimized**: CSS-only animations with GPU acceleration for smooth rendering
 * - **Content Structure**: Mirrors actual ItemCard layout for seamless transition experience
 * - **Test-Friendly**: Comprehensive data-testid attributes for reliable automated testing
 * - **Reduced Motion Support**: Respects user preferences for motion and accessibility needs
 *
 * @accessibility
 * - **ARIA Role**: `role="status"` announces loading state to assistive technologies
 * - **ARIA Label**: Descriptive "Loading" text for screen reader context
 * - **ARIA Busy**: `aria-busy="true"` indicates dynamic content loading
 * - **Live Region**: `aria-live="polite"` provides non-intrusive status updates
 * - **Semantic Structure**: Logical content hierarchy for assistive technology navigation
 * - **Reduced Motion**: Honors `prefers-reduced-motion` for accessibility compliance
 * - **High Contrast**: Supports `prefers-contrast: high` for enhanced visibility
 *
 * @performance
 * - **CSS-Only Animation**: No JavaScript animations reducing CPU and battery usage
 * - **GPU Acceleration**: Hardware-accelerated background-position animation
 * - **Minimal DOM**: Efficient element structure with optimized class usage
 * - **Memory Efficient**: Static component with no state or effect dependencies
 * - **Render Optimization**: Lightweight structure prevents performance bottlenecks
 * - **Animation Performance**: 60fps shimmer animation on modern devices
 * - **Network Independence**: Local animation continues regardless of network status
 *
 * @ux_benefits
 * - **Perceived Performance**: Users perceive faster loading with visual content structure
 * - **Engagement Maintenance**: Shimmer animation keeps users engaged during loading
 * - **Layout Stability**: Prevents content jumping by reserving space for actual content
 * - **Progressive Loading**: Supports mixed loading states with partial content display
 * - **Professional Appearance**: Polished loading experience matching modern UI standards
 * - **User Confidence**: Clear indication that content is actively loading
 *
 * @content_structure
 * - **Image Placeholder**: Aspect-ratio preserved image area with shimmer effect
 * - **Title Placeholder**: Single line representing anime/manga title with realistic width
 * - **Text Lines**: Multiple content lines representing synopsis and metadata
 * - **Score Placeholder**: Dedicated area for rating information display
 * - **Content Spacing**: Matches actual ItemCard padding and margin specifications
 *
 * @animation_details
 * - **Shimmer Effect**: Linear gradient moving from left to right across content areas
 * - **Animation Duration**: 1.5s infinite loop for smooth, non-distracting motion
 * - **Gradient Composition**: Three-color gradient using CSS custom properties
 * - **Background Size**: 200% width creating smooth animation transition
 * - **Border Radius**: Consistent 6px radius matching application design system
 *
 * @responsive_behavior
 * - **Mobile Optimization**: Compact layout for smaller screens with touch-friendly sizing
 * - **Tablet Adaptation**: Balanced layout for medium screens with appropriate spacing
 * - **Desktop Enhancement**: Full-featured layout with optimal content distribution
 * - **Grid Integration**: Seamlessly works with CSS Grid and Flexbox layouts
 * - **Aspect Ratio**: Maintains proper image proportions across all screen sizes
 *
 * @testing_support
 * - **Component Testing**: Main container with `data-testid="skeleton-card"`
 * - **Image Testing**: Image placeholder with `data-testid="skeleton-image"`
 * - **Content Testing**: Content area with `data-testid="skeleton-content"`
 * - **Title Testing**: Title element with `data-testid="skeleton-title"`
 * - **Text Testing**: Individual text lines with numbered test IDs for granular testing
 * - **Score Testing**: Score element with `data-testid="skeleton-score"`
 *
 * @integration
 * - **ItemCard Compatibility**: Designed to match ItemCard component layout exactly
 * - **Grid Systems**: Works with HomePage grid layouts and responsive designs
 * - **Loading States**: Integrates with useItems hook and loading state management
 * - **Error Boundaries**: Compatible with error handling and retry mechanisms
 * - **State Management**: Works with Redux, Context, or local state for loading control
 *
 * @styling
 * - **CSS Custom Properties**: Uses application design system variables
 * - **Shimmer Animation**: Defined in Loading.css with skeleton-loading keyframes
 * - **Layout Classes**: `.card-layout` for consistent card structure
 * - **Animation Classes**: `.skeleton-pulse` and `.skeleton-shimmer` for visual effects
 * - **Content Classes**: Specific classes for image, content, title, text, and score areas
 *
 * @dependencies
 * - React: Core framework for component rendering and lifecycle management
 * - SkeletonCardProps: TypeScript interface from types module for prop validation
 * - Loading.css: CSS file containing shimmer animation and skeleton styling
 * - CSS custom properties: For consistent theming and responsive behavior
 *
 * @author Michael Cho
 * @since v1.0.0
 * @updated v1.2.0 - Added accessibility improvements and performance optimizations
 */

import React from "react";
import { SkeletonCardProps } from "../types";

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = "" }) => {
  return (
    <div
      className={`skeleton-card card-layout skeleton-pulse ${className}`.trim()}
      data-testid="skeleton-card"
      role="status"
      aria-label="Loading"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Image placeholder */}
      <div className="skeleton-image skeleton-shimmer aspect-ratio-preserved" data-testid="skeleton-image" />

      {/* Content area */}
      <div className="skeleton-content content-spacing" data-testid="skeleton-content">
        {/* Title placeholder */}
        <div className="skeleton-title skeleton-shimmer" data-testid="skeleton-title" />

        {/* Text lines */}
        <div className="skeleton-text skeleton-shimmer" data-testid="skeleton-text-1" />
        <div className="skeleton-text skeleton-shimmer" data-testid="skeleton-text-2" />
        <div className="skeleton-text skeleton-shimmer" data-testid="skeleton-text-3" />

        {/* Score placeholder */}
        <div className="skeleton-score skeleton-shimmer" data-testid="skeleton-score" />
      </div>
    </div>
  );
};

export default SkeletonCard;
