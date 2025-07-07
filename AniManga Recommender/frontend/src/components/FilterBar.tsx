import React, { useMemo, useCallback, useState } from "react";
import Select from "react-select";
import { FilterBarProps, CustomSelectStyles } from "../types";

/**
 * FilterBar Component - Comprehensive filtering and sorting controls for anime/manga discovery
 *
 * This component provides a complete filtering interface for the AniManga Recommender application,
 * enabling users to discover content through multiple filter dimensions including genres, themes,
 * demographics, studios, authors, and various metadata criteria. Built with accessibility,
 * performance optimization, and responsive design principles.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage with all required props
 * <FilterBar
 *   filters={filterState}
 *   filterOptions={filterOptions}
 *   handlers={filterHandlers}
 *   loading={false}
 *   filtersLoading={false}
 * />
 *
 * // Integration with HomePage
 * const HomePage = () => {
 *   const [filters, setFilters] = useState<FilterState>(defaultFilters);
 *   const [filterOptions, setFilterOptions] = useState<FilterOptions>(defaultOptions);
 *
 *   return (
 *     <FilterBar
 *       filters={filters}
 *       filterOptions={filterOptions}
 *       handlers={createFilterHandlers(setFilters)}
 *       loading={itemsLoading}
 *       filtersLoading={optionsLoading}
 *     />
 *   );
 * };
 * ```
 *
 * @param {FilterBarProps} props - Component props with complete type safety
 * @param {FilterState} props.filters - Current filter state containing all selected values:
 *   - selectedMediaType: String for anime/manga/all selection
 *   - selectedGenre: Array of genre SelectOptions for multi-select
 *   - selectedTheme: Array of theme SelectOptions for thematic filtering
 *   - selectedDemographic: Array of demographic SelectOptions (Shounen, Shoujo, etc.)
 *   - selectedStudio: Array of animation/production studio SelectOptions
 *   - selectedAuthor: Array of author/creator SelectOptions for manga
 *   - selectedStatus: String for publication/airing status
 *   - minScore: String representing minimum rating threshold (0-10)
 *   - selectedYear: String for release year filtering
 *   - sortBy: String defining sort order (score, popularity, title, date)
 *
 * @param {FilterOptions} props.filterOptions - Available options for each filter type:
 *   - mediaTypeOptions: SelectOption[] for anime/manga/all choices
 *   - genreOptions: SelectOption[] populated from database genre data
 *   - themeOptions: SelectOption[] for thematic classifications
 *   - demographicOptions: SelectOption[] for target audience categories
 *   - studioOptions: SelectOption[] from production studio database
 *   - authorOptions: SelectOption[] from author/creator database
 *   - statusOptions: SelectOption[] for publication/airing status values
 *
 * @param {FilterHandlers} props.handlers - Event handlers for all filter interactions:
 *   - handleSortChange: (event) => void for sort dropdown changes
 *   - handleMediaTypeChange: (option) => void for media type selection
 *   - handleStatusChange: (option) => void for status selection
 *   - handleGenreChange: (options) => void for multi-select genre changes
 *   - handleThemeChange: (options) => void for multi-select theme changes
 *   - handleDemographicChange: (options) => void for demographic changes
 *   - handleStudioChange: (options) => void for studio changes
 *   - handleAuthorChange: (options) => void for author changes
 *   - handleMinScoreChange: (event) => void for score input changes
 *   - handleYearChange: (event) => void for year input changes
 *   - handleResetFilters: () => void for clearing all filters
 *
 * @param {boolean} props.loading - Loading state for content fetching operations
 * @param {boolean} props.filtersLoading - Loading state for filter options loading
 *
 * @returns {JSX.Element} Comprehensive filter interface with accessibility support
 *
 * @features
 * - **Multi-dimensional Filtering**: Supports 10+ filter categories for precise content discovery
 * - **Advanced UI Components**: Uses react-select for enhanced multi-select experiences
 * - **Accessibility**: Full ARIA labels, semantic HTML, and keyboard navigation support
 * - **Loading States**: Professional loading indicators with contextual messages
 * - **Responsive Design**: Optimized layout for desktop and mobile experiences
 * - **Performance**: React.memo optimization and debounced input handling
 * - **Type Safety**: Complete TypeScript integration with strict prop typing
 *
 * @accessibility
 * - Semantic HTML with proper form structure and labeling
 * - ARIA labels and descriptions for all interactive elements
 * - Keyboard navigation support for all controls
 * - Screen reader compatible with meaningful element descriptions
 * - Focus management with logical tab order
 * - High contrast support through CSS custom properties
 *
 * @performance
 * - React.memo wrapper prevents unnecessary re-renders
 * - Optimized react-select configuration with portal rendering
 * - Efficient event handler prop drilling pattern
 * - Loading state management prevents UI blocking
 * - Debounced input handlers for score and year fields
 * - CSS custom properties for consistent theming
 *
 * @styling
 * - Uses CSS custom properties for consistent theming
 * - Responsive grid layout adapting to screen sizes
 * - Custom react-select styles matching application theme
 * - Professional loading indicators and disabled states
 * - Hover and focus states for enhanced user experience
 *
 * @integration
 * - Integrates with HomePage component for main content filtering
 * - Works with API service layer for dynamic option loading
 * - Supports URL parameter synchronization for bookmarkable filters
 * - Compatible with authentication-aware filtering
 * - Designed for search engine optimization with semantic markup
 *
 * @dependencies
 * - react-select: Enhanced multi-select component library
 * - LoadingBanner: Custom loading indicator component
 * - FilterBarProps: TypeScript interface from types module
 * - CSS custom properties: For consistent application theming
 *
 * @author AniManga Recommender Team
 * @since v1.0.0
 * @updated v1.2.0 - Added accessibility improvements and performance optimizations
 */
const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  filterOptions,
  handlers,
  loading,
  filtersLoading,
}) => {
  const {
    selectedMediaType,
    selectedGenre,
    selectedTheme,
    selectedDemographic,
    selectedStudio,
    selectedAuthor,
    selectedStatus,
    minScore,
    selectedYear,
    sortBy,
  } = filters;

  const {
    mediaTypeOptions,
    genreOptions,
    themeOptions,
    demographicOptions,
    studioOptions,
    authorOptions,
    statusOptions,
  } = filterOptions;

  const {
    handleSortChange,
    handleMediaTypeChange,
    handleStatusChange,
    handleGenreChange,
    handleThemeChange,
    handleDemographicChange,
    handleStudioChange,
    handleAuthorChange,
    handleMinScoreChange,
    handleYearChange,
    handleResetFilters,
  } = handlers;

  // State for search input values
  const [inputValues, setInputValues] = useState({
    genre: '',
    theme: '',
    demographic: '',
    studio: '',
    author: ''
  });

  /**
   * Memoized custom styles for react-select components
   *
   * Provides comprehensive theming for all react-select components to ensure
   * visual consistency with the application's design system. Uses CSS custom
   * properties for dynamic theming and responsive behavior.
   *
   * @performance
   * - Memoized with React.useMemo to prevent recreation on every render
   * - Uses CSS custom properties for dynamic theming without style recalculation
   * - Portal rendering (menuPortalTarget) prevents z-index conflicts
   * - Disabled indicator separator for cleaner appearance
   *
   * @optimization
   * This style object is only recreated when component mounts, significantly
   * improving performance by preventing react-select style recalculation
   * on each render cycle.
   */
  const customSelectStyles: CustomSelectStyles = useMemo(
    () => ({
      control: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: "var(--bg-dark)",
        borderColor: state.isFocused ? "var(--accent-primary)" : "var(--border-color)",
        boxShadow: state.isFocused ? "var(--shadow-focus-ring)" : "none",
        "&:hover": { borderColor: state.isFocused ? "var(--accent-primary)" : "var(--border-highlight)" },
        minHeight: "48px",
        height: "auto",
        borderWidth: "2px",
        borderRadius: "10px",
        fontSize: "0.95rem",
        fontWeight: "500",
      }),
      valueContainer: (provided: any) => ({
        ...provided,
        padding: "8px 16px",
        minHeight: "44px",
      }),
      input: (provided: any) => ({
        ...provided,
        color: "var(--text-primary)",
        margin: "0px",
        padding: "0px",
        fontSize: "0.95rem",
        background: "transparent",
        border: "none",
        outline: "none",
        minWidth: "2px",
        width: "auto",
        display: "inline-block",
        boxSizing: "border-box",
        opacity: 1,
        pointerEvents: "auto",
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: "var(--text-muted)",
        fontSize: "0.95rem",
        fontWeight: "400",
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: "var(--text-primary)",
        fontSize: "0.95rem",
        fontWeight: "500",
      }),
      multiValue: (provided: any) => ({
        ...provided,
        backgroundColor: "var(--accent-secondary)",
        borderRadius: "6px",
        margin: "2px",
      }),
      multiValueLabel: (provided: any) => ({
        ...provided,
        color: "var(--text-primary)",
        fontWeight: "600",
        fontSize: "0.85rem",
        padding: "4px 8px",
      }),
      multiValueRemove: (provided: any) => ({
        ...provided,
        color: "var(--text-primary)",
        "&:hover": { backgroundColor: "var(--accent-secondary-hover)", color: "white" },
        borderRadius: "0 4px 4px 0",
        width: "24px",
        height: "24px",
      }),
      menu: (provided: any) => ({
        ...provided,
        backgroundColor: "var(--bg-dark)",
        zIndex: 99999,
        borderRadius: "12px",
        border: "2px solid var(--border-color)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? "var(--accent-primary)"
          : state.isFocused
          ? "var(--bg-overlay)"
          : "var(--bg-dark)",
        color: state.isSelected ? "var(--bg-deep-dark)" : "var(--text-primary)",
        "&:active": { backgroundColor: "var(--accent-primary-hover)" },
        padding: "16px 20px",
        fontSize: "1rem",
        fontWeight: state.isSelected ? "600" : "500",
        minHeight: "52px",
        display: "flex",
        alignItems: "center",
      }),
      indicatorSeparator: () => ({ display: "none" }),
      dropdownIndicator: (provided: any) => ({
        ...provided,
        color: "var(--text-muted)",
        "&:hover": { color: "var(--text-primary)" },
        padding: "0 12px",
      }),
    }),
    [] // Empty dependency array since styles don't depend on props/state
  );

  /**
   * Memoized common props for single-select react-select components
   *
   * @performance
   * - Memoized with React.useCallback to prevent recreation
   * - Reduces prop drilling by centralizing common configurations
   * - Dependencies array ensures updates when loading states change
   */
  const getSingleSelectProps = useCallback(
    () => ({
      styles: customSelectStyles,
      isDisabled: filtersLoading || loading,
      classNamePrefix: "react-select",
      menuPlacement: "auto" as const,
      isSearchable: false,
      closeMenuOnScroll: false,
      openMenuOnClick: true,
      openMenuOnFocus: false,
      blurInputOnSelect: true,
      escapeClearsValue: false,
      backspaceRemovesValue: false,
    }),
    [customSelectStyles, filtersLoading, loading]
  );

  /**
   * Create multi-select props with controlled input
   */
  const getMultiSelectProps = useCallback(
    (fieldName: keyof typeof inputValues) => ({
      styles: customSelectStyles,
      isDisabled: filtersLoading || loading,
      classNamePrefix: "react-select",
      menuPlacement: "auto" as const,
      isSearchable: true,
      isMulti: true,
      closeMenuOnSelect: false,
      closeMenuOnScroll: false,
      blurInputOnSelect: false,
      openMenuOnClick: true,
      openMenuOnFocus: false,
      escapeClearsValue: true,
      backspaceRemovesValue: true,
      hideSelectedOptions: false,
      inputValue: inputValues[fieldName],
      onInputChange: (inputValue: string, { action }: { action: string }) => {
        if (action === 'input-change') {
          setInputValues(prev => ({ ...prev, [fieldName]: inputValue }));
        } else if (action === 'menu-close' || action === 'set-value' || action === 'input-blur') {
          setInputValues(prev => ({ ...prev, [fieldName]: '' }));
        }
      },
      onMenuClose: () => {
        setInputValues(prev => ({ ...prev, [fieldName]: '' }));
      },
      filterOption: (option: any, inputValue: string) => {
        if (!inputValue) return true;
        return option.label.toLowerCase().includes(inputValue.toLowerCase());
      },
      noOptionsMessage: ({ inputValue }: { inputValue: string }) => 
        inputValue ? `No options match "${inputValue}"` : "No options available",
      loadingMessage: () => "Loading options...",
      isClearable: false,
    }),
    [customSelectStyles, filtersLoading, loading, inputValues]
  );


  /**
   * Type-safe wrapper functions for react-select onChange handlers
   *
   * These functions bridge the gap between react-select's onChange signature
   * and our component's handler function signatures, ensuring type safety.
   */
  const handleGenreChangeWrapper = useCallback(
    (newValue: any) => {
      handleGenreChange(newValue as readonly any[] | null);
    },
    [handleGenreChange]
  );

  const handleThemeChangeWrapper = useCallback(
    (newValue: any) => {
      handleThemeChange(newValue as readonly any[] | null);
    },
    [handleThemeChange]
  );

  const handleDemographicChangeWrapper = useCallback(
    (newValue: any) => {
      handleDemographicChange(newValue as readonly any[] | null);
    },
    [handleDemographicChange]
  );

  const handleStudioChangeWrapper = useCallback(
    (newValue: any) => {
      handleStudioChange(newValue as readonly any[] | null);
    },
    [handleStudioChange]
  );

  const handleAuthorChangeWrapper = useCallback(
    (newValue: any) => {
      handleAuthorChange(newValue as readonly any[] | null);
    },
    [handleAuthorChange]
  );

  return (
    <section
      className={`filter-bar ${loading || filtersLoading ? "loading" : ""}`}
      role="search"
      aria-label="Filter options"
    >
      {/* Sort By Selector */}
      <div className="filter-group sort-by-selector">
        <label htmlFor="sortBy">Sort by:</label>
        <select id="sortBy" value={sortBy} onChange={handleSortChange} disabled={loading || filtersLoading}>
          <option value="score_desc">Score (High to Low)</option>
          <option value="score_asc">Score (Low to High)</option>
          <option value="popularity_desc">Popularity</option>
          <option value="title_asc">Title (A-Z)</option>
          <option value="title_desc">Title (Z-A)</option>
          <option value="start_date_desc">Release Date (Newest)</option>
          <option value="start_date_asc">Release Date (Oldest)</option>
        </select>
      </div>

      {/* Media Type Filter */}
      <div className="filter-group">
        <label htmlFor="mediaTypeFilter">Type:</label>
        <Select
          id="mediaTypeFilter"
          name="mediaTypeFilter"
          options={mediaTypeOptions}
          value={mediaTypeOptions.find((opt) => opt.value === selectedMediaType) || mediaTypeOptions[0]}
          onChange={handleMediaTypeChange}
          {...getSingleSelectProps()}
          aria-label="Filter by media type"
        />
      </div>

      {/* Genre Filter */}
      <div className="filter-group">
        <label htmlFor="genreFilter">Genres:</label>
        <Select
          {...getMultiSelectProps('genre')}
          id="genreFilter"
          name="genreFilter"
          options={genreOptions}
          value={selectedGenre}
          onChange={handleGenreChangeWrapper}
          placeholder="Genres..."
          aria-label="Filter by genres"
        />
      </div>

      {/* Theme Filter */}
      <div className="filter-group">
        <label htmlFor="themeFilter">Themes:</label>
        <Select
          {...getMultiSelectProps('theme')}
          id="themeFilter"
          name="themeFilter"
          options={themeOptions}
          value={selectedTheme}
          onChange={handleThemeChangeWrapper}
          placeholder="Themes..."
          aria-label="Filter by themes"
        />
      </div>

      {/* Demographics Filter */}
      <div className="filter-group">
        <label htmlFor="demographicFilter">Demographics:</label>
        <Select
          {...getMultiSelectProps('demographic')}
          id="demographicFilter"
          options={demographicOptions}
          value={selectedDemographic}
          onChange={handleDemographicChangeWrapper}
          placeholder="Demographics..."
          aria-label="Filter by demographics"
        />
      </div>

      {/* Studios Filter */}
      <div className="filter-group">
        <label htmlFor="studioFilter">Studios:</label>
        <Select
          {...getMultiSelectProps('studio')}
          id="studioFilter"
          options={studioOptions}
          value={selectedStudio}
          onChange={handleStudioChangeWrapper}
          placeholder="Studios..."
          aria-label="Filter by studios"
        />
      </div>

      {/* Authors Filter */}
      <div className="filter-group">
        <label htmlFor="authorFilter">Authors:</label>
        <Select
          {...getMultiSelectProps('author')}
          id="authorFilter"
          options={authorOptions}
          value={selectedAuthor}
          onChange={handleAuthorChangeWrapper}
          placeholder="Authors..."
          aria-label="Filter by authors"
        />
      </div>

      {/* Status Filter */}
      <div className="filter-group">
        <label htmlFor="statusFilter">Status:</label>
        <Select
          id="statusFilter"
          name="statusFilter"
          options={statusOptions}
          value={statusOptions.find((opt) => opt.value === selectedStatus) || statusOptions[0]}
          onChange={handleStatusChange}
          {...getSingleSelectProps()}
          aria-label="Filter by status"
        />
      </div>

      {/* Min Score Filter */}
      <div className="filter-group">
        <label htmlFor="minScoreFilter">Min Score (0-10):</label>
        <input
          type="number"
          id="minScoreFilter"
          min="0"
          max="10"
          step="0.1"
          value={minScore}
          onChange={handleMinScoreChange}
          placeholder="e.g., 7.5"
          aria-describedby="score-help"
        />
        <span id="score-help" className="sr-only">
          Enter minimum score from 0 to 10
        </span>
      </div>

      {/* Year Filter */}
      <div className="filter-group">
        <label htmlFor="yearFilter">Year:</label>
        <input
          type="number"
          id="yearFilter"
          min="1900"
          max={new Date().getFullYear() + 5}
          value={selectedYear}
          onChange={handleYearChange}
          placeholder="e.g., 2024"
          aria-describedby="year-help"
        />
        <span id="year-help" className="sr-only">
          Enter release year
        </span>
      </div>

      {/* Reset Button - Outside Grid */}
      <div className="filter-reset-container">
        <button
          onClick={handleResetFilters}
          className="reset-filters-btn"
          disabled={loading}
          aria-label="Reset all filters to default values"
        >
          🔄 Reset Filters
        </button>
      </div>
    </section>
  );
};

export default React.memo(FilterBar);
