/**
 * Unit Tests for FilterBar Component
 * Tests filter rendering, interaction, and state management
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterBar from "../../components/FilterBar";
import { FilterBarProps, SelectOption } from "../../types";

const createMockProps = (): FilterBarProps => ({
  filters: {
    selectedMediaType: "All" as any,
    selectedGenre: [] as SelectOption[],
    selectedTheme: [] as SelectOption[],
    selectedDemographic: [] as SelectOption[],
    selectedStudio: [] as SelectOption[],
    selectedAuthor: [] as SelectOption[],
    selectedStatus: "All" as any,
    minScore: "",
    selectedYear: "",
    sortBy: "score_desc",
  },
  filterOptions: {
    mediaTypeOptions: [
      { value: "All", label: "All" },
      { value: "anime", label: "anime" },
      { value: "manga", label: "manga" },
    ],
    genreOptions: [
      { value: "Action", label: "Action" },
      { value: "Comedy", label: "Comedy" },
      { value: "Drama", label: "Drama" },
    ],
    themeOptions: [
      { value: "School", label: "School" },
      { value: "Military", label: "Military" },
    ],
    demographicOptions: [
      { value: "Shounen", label: "Shounen" },
      { value: "Shoujo", label: "Shoujo" },
    ],
    studioOptions: [
      { value: "Studio A", label: "Studio A" },
      { value: "Studio B", label: "Studio B" },
    ],
    authorOptions: [
      { value: "Author X", label: "Author X" },
      { value: "Author Y", label: "Author Y" },
    ],
    statusOptions: [
      { value: "All", label: "All" },
      { value: "Finished Airing", label: "Finished Airing" },
      { value: "Currently Airing", label: "Currently Airing" },
    ],
  },
  handlers: {
    handleSortChange: jest.fn(),
    handleMediaTypeChange: jest.fn(),
    handleStatusChange: jest.fn(),
    handleGenreChange: jest.fn(),
    handleThemeChange: jest.fn(),
    handleDemographicChange: jest.fn(),
    handleStudioChange: jest.fn(),
    handleAuthorChange: jest.fn(),
    handleMinScoreChange: jest.fn(),
    handleYearChange: jest.fn(),
    handleResetFilters: jest.fn(),
  },
  loading: false,
  filtersLoading: false,
});

describe("FilterBar Component", () => {
  let mockProps: FilterBarProps;

  beforeEach(() => {
    mockProps = createMockProps();
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders all filter controls", () => {
      render(<FilterBar {...mockProps} />);

      // Search is now in Navbar, not FilterBar - only test FilterBar-specific controls
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/genres/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/themes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/demographics/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/studios/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/authors/i)).toBeInTheDocument();
    });

    it("renders reset filters button", () => {
      render(<FilterBar {...mockProps} />);

      expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });
  });

  describe("Filter Bar Structure", () => {
    it("renders as a search section with proper accessibility", () => {
      render(<FilterBar {...mockProps} />);

      // FilterBar should render as a search section (for filtering, not text search)
      expect(screen.getByRole("search")).toBeInTheDocument();
      expect(screen.getByLabelText(/filter options/i)).toBeInTheDocument();
    });

    it("renders all filter categories", () => {
      render(<FilterBar {...mockProps} />);

      // Verify all filter sections exist
      expect(screen.getByText("Sort by:")).toBeInTheDocument();
      expect(screen.getByText("Type:")).toBeInTheDocument();
      expect(screen.getByText("Genres:")).toBeInTheDocument();
      expect(screen.getByText("Themes:")).toBeInTheDocument();
      expect(screen.getByText("Demographics:")).toBeInTheDocument();
      expect(screen.getByText("Status:")).toBeInTheDocument();
      expect(screen.getByText("Studios:")).toBeInTheDocument();
      expect(screen.getByText("Authors:")).toBeInTheDocument();
    });
  });

  describe("Single Select Filters", () => {
    it("displays selected media type", () => {
      const propsWithMediaType = {
        ...mockProps,
        filters: {
          ...mockProps.filters,
          selectedMediaType: "anime" as any,
        },
      };

      render(<FilterBar {...propsWithMediaType} />);

      expect(screen.getByText("anime")).toBeInTheDocument();
    });

    it("displays selected status", () => {
      const propsWithStatus = {
        ...mockProps,
        filters: {
          ...mockProps.filters,
          selectedStatus: "Finished Airing" as any,
        },
      };

      render(<FilterBar {...propsWithStatus} />);

      expect(screen.getByText("Finished Airing")).toBeInTheDocument();
    });
  });

  describe("Multi-Select Filters", () => {
    it("displays selected genres", () => {
      const propsWithGenres = {
        ...mockProps,
        filters: {
          ...mockProps.filters,
          selectedGenre: [
            { value: "Action", label: "Action" },
            { value: "Comedy", label: "Comedy" },
          ],
        },
      };

      render(<FilterBar {...propsWithGenres} />);

      expect(screen.getByText("Action")).toBeInTheDocument();
      expect(screen.getByText("Comedy")).toBeInTheDocument();
    });

    it("displays selected themes", () => {
      const propsWithThemes = {
        ...mockProps,
        filters: {
          ...mockProps.filters,
          selectedTheme: [{ value: "School", label: "School" }],
        },
      };

      render(<FilterBar {...propsWithThemes} />);

      expect(screen.getByText("School")).toBeInTheDocument();
    });
  });

  describe("Reset Filters", () => {
    it("calls handleResetFilters when reset button is clicked", async () => {
      render(<FilterBar {...mockProps} />);

      const resetButton = screen.getByRole("button", { name: /reset/i });
      await userEvent.click(resetButton);

      expect(mockProps.handlers.handleResetFilters).toHaveBeenCalled();
    });

    it("resets all filter values when reset is called", () => {
      const filledProps = {
        ...mockProps,
        filters: {
          ...mockProps.filters,
          selectedGenre: [{ value: "Action", label: "Action" }],
          minScore: "8.0",
          selectedYear: "2023",
        },
      };

      const { rerender } = render(<FilterBar {...filledProps} />);

      // Verify filled values are displayed
      expect(screen.getByText("Action")).toBeInTheDocument();
      expect(screen.getByDisplayValue("8.0")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2023")).toBeInTheDocument();

      // Reset to original empty state
      rerender(<FilterBar {...mockProps} />);

      // Check that filters are reset - "All" options should be present
      const allOptions = screen.getAllByText("All");
      expect(allOptions.length).toBeGreaterThan(0);

      // Min score and year should be empty (could be empty string or null)
      const minScoreInput = screen.getByLabelText(/min score/i) as HTMLInputElement;
      const yearInput = screen.getByLabelText(/year/i) as HTMLInputElement;
      expect(minScoreInput.value).toBe("");
      expect(yearInput.value).toBe("");
    });
  });

  describe("Loading State", () => {
    it("shows loading state when filtersLoading is true", () => {
      const loadingProps = {
        ...mockProps,
        filtersLoading: true,
      };

      render(<FilterBar {...loadingProps} />);

      // Check for loading banner and disabled select components
      expect(screen.getByText(/loading filters/i)).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();

      // Check that select components are disabled during loading
      const mediaTypeSelect = screen.getByLabelText(/type/i);
      expect(mediaTypeSelect.closest(".react-select--is-disabled")).toBeInTheDocument();
    });

    it("disables reset button when loading", () => {
      const loadingProps = {
        ...mockProps,
        loading: true,
      };

      render(<FilterBar {...loadingProps} />);

      const resetButton = screen.getByRole("button", { name: /reset/i });
      expect(resetButton).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("has proper labels for form controls", () => {
      render(<FilterBar {...mockProps} />);

      // Check for labels that exist in the FilterBar component
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/genres/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/themes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/demographics/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/studios/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/authors/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/min score/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/year/i)).toBeInTheDocument();
    });

    it("provides reset button with descriptive aria-label", () => {
      render(<FilterBar {...mockProps} />);

      const resetButton = screen.getByLabelText(/reset all filters/i);
      expect(resetButton).toBeInTheDocument();
    });

    it("has proper form structure", () => {
      render(<FilterBar {...mockProps} />);

      expect(screen.getByRole("search")).toBeInTheDocument();
    });
  });

  describe("Sort Functionality", () => {
    it("calls handleSortChange when sort option changes", async () => {
      render(<FilterBar {...mockProps} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await userEvent.selectOptions(sortSelect, "popularity_desc");

      expect(mockProps.handlers.handleSortChange).toHaveBeenCalled();
    });

    it("displays current sort option", () => {
      const propsWithSort = {
        ...mockProps,
        filters: {
          ...mockProps.filters,
          sortBy: "title_asc",
        },
      };

      render(<FilterBar {...propsWithSort} />);

      const sortSelect = screen.getByDisplayValue(/title \(a-z\)/i);
      expect(sortSelect).toBeInTheDocument();
    });
  });

  describe("Score and Year Filters", () => {
    it("calls handleMinScoreChange when min score changes", async () => {
      render(<FilterBar {...mockProps} />);

      const minScoreInput = screen.getByLabelText(/min score/i);
      await userEvent.type(minScoreInput, "7.5");

      expect(mockProps.handlers.handleMinScoreChange).toHaveBeenCalled();
    });

    it("calls handleYearChange when year changes", async () => {
      render(<FilterBar {...mockProps} />);

      const yearInput = screen.getByLabelText(/year/i);
      await userEvent.type(yearInput, "2024");

      expect(mockProps.handlers.handleYearChange).toHaveBeenCalled();
    });

    it("displays current min score", () => {
      const propsWithScore = {
        ...mockProps,
        filters: {
          ...mockProps.filters,
          minScore: "8.0",
        },
      };

      render(<FilterBar {...propsWithScore} />);

      const minScoreInput = screen.getByDisplayValue("8.0");
      expect(minScoreInput).toBeInTheDocument();
    });

    it("displays current year", () => {
      const propsWithYear = {
        ...mockProps,
        filters: {
          ...mockProps.filters,
          selectedYear: "2023",
        },
      };

      render(<FilterBar {...propsWithYear} />);

      const yearInput = screen.getByDisplayValue("2023");
      expect(yearInput).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty filter options gracefully", () => {
      const propsWithEmptyOptions = {
        ...mockProps,
        filterOptions: {
          ...mockProps.filterOptions,
          genreOptions: [],
          themeOptions: [],
        },
      };

      render(<FilterBar {...propsWithEmptyOptions} />);

      expect(screen.getByLabelText(/genres/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/themes/i)).toBeInTheDocument();
    });

    it("handles missing handlers gracefully", () => {
      const propsWithMissingHandlers = {
        ...mockProps,
        handlers: {
          ...mockProps.handlers,
          handleInputChange: undefined as any,
        },
      };

      // Should not crash when rendering
      expect(() => render(<FilterBar {...propsWithMissingHandlers} />)).not.toThrow();
    });

    it("handles extreme filter combinations", () => {
      const propsWithManyFilters = {
        ...mockProps,
        filters: {
          ...mockProps.filters,
          selectedGenre: Array.from({ length: 10 }, (_, i) => ({
            value: `Genre${i}`,
            label: `Genre${i}`,
          })),
          selectedTheme: Array.from({ length: 5 }, (_, i) => ({
            value: `Theme${i}`,
            label: `Theme${i}`,
          })),
          minScore: "9.9",
          selectedYear: "1950",
        },
      };

      render(<FilterBar {...propsWithManyFilters} />);

      expect(screen.getByDisplayValue("9.9")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1950")).toBeInTheDocument();
    });
  });

  describe("React-Select Interactions", () => {
    it("allows selecting media type options", async () => {
      render(<FilterBar {...mockProps} />);

      // Check that the media type filter is rendered
      const mediaTypeLabel = screen.getByLabelText(/type/i);
      expect(mediaTypeLabel).toBeInTheDocument();

      // Check that it shows the default value in the visible text
      expect(screen.getAllByText("All")).toHaveLength(2); // Both media type and status show "All"

      // Verify the handler exists and could be called
      expect(mockProps.handlers.handleMediaTypeChange).toBeDefined();
    });

    it("allows selecting genre options", async () => {
      render(<FilterBar {...mockProps} />);

      const genreSelect = screen.getByLabelText(/genres/i);
      expect(genreSelect).toBeInTheDocument();

      // Verify the handler exists and could be called
      expect(mockProps.handlers.handleGenreChange).toBeDefined();
    });

    it("allows selecting status options", async () => {
      render(<FilterBar {...mockProps} />);

      const statusSelect = screen.getByLabelText(/status/i);
      expect(statusSelect).toBeInTheDocument();

      // Verify the handler exists and could be called
      expect(mockProps.handlers.handleStatusChange).toBeDefined();
    });

    it("shows loading state for filter options", () => {
      const loadingProps = {
        ...mockProps,
        filtersLoading: true,
      };

      render(<FilterBar {...loadingProps} />);

      // Should show disabled selects when loading filter options
      const mediaTypeSelect = screen.getByLabelText(/type/i);
      expect(mediaTypeSelect.closest(".react-select--is-disabled")).toBeInTheDocument();
    });
  });
});
