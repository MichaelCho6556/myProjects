import React from "react";
import Select from "react-select";
import { FilterBarProps, CustomSelectStyles } from "../types";

/**
 * FilterBar Component - Handles all filtering controls for the application
 *
 * @param props - Component props with complete type safety
 * @returns JSX.Element
 */
const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  filterOptions,
  handlers,
  loading,
  filtersLoading,
}) => {
  const {
    inputValue,
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
    handleInputChange,
    handleSearchSubmit,
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

  /**
   * Custom styles for react-select components
   * Ensures consistent theming with the application
   */
  const customSelectStyles: CustomSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: "var(--bg-dark)",
      borderColor: state.isFocused ? "var(--accent-primary)" : "var(--border-color)",
      boxShadow: state.isFocused ? "var(--shadow-focus-ring)" : "none",
      "&:hover": { borderColor: state.isFocused ? "var(--accent-primary)" : "var(--border-highlight)" },
      minHeight: "calc(0.6rem * 2 + 0.9rem * 2 + 2px)",
      height: "auto",
    }),
    valueContainer: (provided: any) => ({ ...provided, padding: "calc(0.6rem - 2px) 0.9rem" }),
    input: (provided: any) => ({ ...provided, color: "var(--text-primary)", margin: "0px", padding: "0px" }),
    placeholder: (provided: any) => ({ ...provided, color: "var(--text-muted)" }),
    singleValue: (provided: any) => ({ ...provided, color: "var(--text-primary)" }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: "var(--accent-secondary)",
      borderRadius: "4px",
    }),
    multiValueLabel: (provided: any) => ({ ...provided, color: "var(--text-primary)", fontWeight: "500" }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: "var(--text-primary)",
      "&:hover": { backgroundColor: "var(--accent-secondary-hover)", color: "white" },
    }),
    menu: (provided: any) => ({ ...provided, backgroundColor: "var(--bg-dark)", zIndex: 5 }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "var(--accent-primary)"
        : state.isFocused
        ? "var(--bg-overlay)"
        : "var(--bg-dark)",
      color: state.isSelected ? "var(--bg-deep-dark)" : "var(--text-primary)",
      "&:active": { backgroundColor: "var(--accent-primary-hover)" },
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: "var(--text-muted)",
      "&:hover": { color: "var(--text-primary)" },
    }),
  };

  return (
    <section className="filter-bar" role="search" aria-label="Filter and search options">
      {/* Search Form */}
      <form onSubmit={handleSearchSubmit} className="search-form">
        <label htmlFor="search-input" className="sr-only">
          Search anime and manga titles
        </label>
        <input
          id="search-input"
          type="text"
          placeholder="Search titles..."
          value={inputValue}
          onChange={handleInputChange}
          aria-describedby="search-help"
        />
        <span id="search-help" className="sr-only">
          Enter keywords to search for anime and manga titles
        </span>
        <button type="submit" aria-label="Submit search">
          Search
        </button>
      </form>

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
        {filtersLoading && (
          <span className="filter-loading-indicator" aria-hidden="true">
            ⟳
          </span>
        )}
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
          styles={customSelectStyles}
          isDisabled={filtersLoading || loading}
          classNamePrefix="react-select"
          aria-label="Filter by media type"
        />
      </div>

      {/* Genre Filter */}
      <div className="filter-group">
        <label htmlFor="genreFilter">Genres:</label>
        <Select
          isMulti
          closeMenuOnSelect={false}
          id="genreFilter"
          name="genreFilter"
          options={genreOptions}
          value={selectedGenre}
          onChange={handleGenreChange}
          placeholder="Select genres..."
          styles={customSelectStyles}
          isDisabled={filtersLoading || loading}
          classNamePrefix="react-select"
          aria-label="Filter by genres"
        />
      </div>

      {/* Theme Filter */}
      <div className="filter-group">
        <label htmlFor="themeFilter">Themes:</label>
        <Select
          isMulti
          closeMenuOnSelect={false}
          id="themeFilter"
          name="themeFilter"
          options={themeOptions}
          value={selectedTheme}
          onChange={handleThemeChange}
          placeholder="Select themes..."
          styles={customSelectStyles}
          isDisabled={filtersLoading || loading}
          classNamePrefix="react-select"
          aria-label="Filter by themes"
        />
      </div>

      {/* Demographics Filter */}
      <div className="filter-group">
        <label htmlFor="demographicFilter">Demographics:</label>
        <Select
          isMulti
          closeMenuOnSelect={false}
          id="demographicFilter"
          options={demographicOptions}
          value={selectedDemographic}
          onChange={handleDemographicChange}
          placeholder="Select demographics..."
          styles={customSelectStyles}
          isDisabled={filtersLoading || loading}
          classNamePrefix="react-select"
          aria-label="Filter by demographics"
        />
      </div>

      {/* Studios Filter */}
      <div className="filter-group">
        <label htmlFor="studioFilter">Studios:</label>
        <Select
          isMulti
          closeMenuOnSelect={false}
          id="studioFilter"
          options={studioOptions}
          value={selectedStudio}
          onChange={handleStudioChange}
          placeholder="Select studios..."
          styles={customSelectStyles}
          isDisabled={filtersLoading || loading}
          classNamePrefix="react-select"
          aria-label="Filter by studios"
        />
      </div>

      {/* Authors Filter */}
      <div className="filter-group">
        <label htmlFor="authorFilter">Authors:</label>
        <Select
          isMulti
          closeMenuOnSelect={false}
          id="authorFilter"
          options={authorOptions}
          value={selectedAuthor}
          onChange={handleAuthorChange}
          placeholder="Select authors..."
          styles={customSelectStyles}
          isDisabled={filtersLoading || loading}
          classNamePrefix="react-select"
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
          styles={customSelectStyles}
          isDisabled={filtersLoading || loading}
          classNamePrefix="react-select"
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

      {/* Reset Button */}
      <button
        onClick={handleResetFilters}
        className="reset-filters-btn"
        disabled={loading}
        aria-label="Reset all filters to default values"
      >
        Reset Filters
      </button>
    </section>
  );
};

export default React.memo(FilterBar);
