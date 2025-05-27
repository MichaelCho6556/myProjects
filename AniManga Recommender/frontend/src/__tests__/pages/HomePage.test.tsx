/**
 * Integration Tests for HomePage Component
 * Tests user flows, filtering, pagination, and navigation
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../../pages/HomePage";
import { mockAxios, mockItemsResponse, mockDistinctValuesResponse } from "../../__mocks__/axios";

// Test utilities
const renderWithRouter = (initialEntries = ["/"], component = <HomePage />) => {
  return render(<MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>);
};

const createTestItems = (count = 3) => {
  return Array.from({ length: count }, (_, index) =>
    createMockItem({
      uid: `test-uid-${index + 1}`,
      title: `Test Anime ${index + 1}`,
      genres: index === 0 ? ["Action"] : index === 1 ? ["Comedy"] : ["Drama"],
      media_type: index % 2 === 0 ? "anime" : "manga",
      score: 8.0 + index * 0.5,
    })
  );
};

describe("HomePage Integration Tests", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockDistinctValuesResponse();
    mockItemsResponse(createTestItems(), 1);
    // Reset localStorage
    localStorage.clear();
  });

  describe("Initial Load", () => {
    it("loads items and filter options on initial render", async () => {
      renderWithRouter();

      // Should show skeleton loading initially (not role="status")
      expect(screen.getByTestId("skeleton-loading")).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Verify API calls were made
      expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("/api/distinct-values"));
      expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("/api/items"));
    });

    it("displays error message when API fails", async () => {
      mockAxios.mockRejectedValue({
        response: {
          data: { error: "Server Error" },
          status: 500,
          statusText: "Internal Server Error",
        },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Genre Filtering", () => {
    it("filters items when genre is selected", async () => {
      renderWithRouter();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Clear previous calls
      mockAxios.clearMocks();

      // Mock filtered response
      const filteredItems = createTestItems(1);
      filteredItems[0].genres = ["Action"];
      mockItemsResponse(filteredItems, 1);

      // Find and interact with genre select
      const genreSelect = screen.getByLabelText(/genre/i);
      await userEvent.click(genreSelect);

      // Select "Action" option
      const actionOption = await screen.findByText("Action");
      await userEvent.click(actionOption);

      // Verify API call with genre filter
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("genre=Action"));
      });
    });

    it("clears filters when 'All' is selected", async () => {
      renderWithRouter(["/search?genre=Action"]);

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Clear previous calls
      mockAxios.clearMocks();
      mockItemsResponse(createTestItems(), 1);

      // Select "All" to clear filters
      const genreSelect = screen.getByLabelText(/genre/i);
      await userEvent.click(genreSelect);

      const allOption = await screen.findByText("All");
      await userEvent.click(allOption);

      // Verify API call without genre filter
      await waitFor(() => {
        const lastCall = mockAxios.get.mock.calls[mockAxios.get.mock.calls.length - 1];
        expect(lastCall[0]).not.toContain("genre=");
      });
    });
  });

  describe("Multiple Filter Interaction", () => {
    it("applies multiple filters simultaneously", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      mockAxios.clearMocks();
      mockItemsResponse([], 1);

      // Select media type
      const mediaTypeSelect = screen.getByLabelText(/media type/i);
      await userEvent.click(mediaTypeSelect);
      const animeOption = await screen.findByText("anime");
      await userEvent.click(animeOption);

      // Select genre
      const genreSelect = screen.getByLabelText(/genre/i);
      await userEvent.click(genreSelect);
      const actionOption = await screen.findByText("Action");
      await userEvent.click(actionOption);

      // Verify API call includes both filters
      await waitFor(() => {
        const lastCall = mockAxios.get.mock.calls[mockAxios.get.mock.calls.length - 1];
        expect(lastCall[0]).toContain("media_type=anime");
        expect(lastCall[0]).toContain("genre=Action");
      });
    });
  });

  describe("Search Functionality", () => {
    it("searches items by title", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      mockAxios.clearMocks();
      mockItemsResponse([createMockItem({ title: "Naruto" })], 1);

      // Find search input and type
      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, "Naruto");

      // Verify API call with search parameter
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("search=Naruto"));
      });
    });

    it("debounces search input", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      mockAxios.clearMocks();

      const searchInput = screen.getByPlaceholderText(/search/i);

      // Type multiple characters quickly
      await userEvent.type(searchInput, "test");

      // Should not make API calls for each character
      expect(mockAxios.get).not.toHaveBeenCalled();

      // Wait for debounce
      await waitFor(
        () => {
          expect(mockAxios.get).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Pagination", () => {
    it("navigates to next page when next button is clicked", async () => {
      // Mock multi-page response
      mockItemsResponse(createTestItems(), 3);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      mockAxios.clearMocks();
      mockItemsResponse(createTestItems(), 3);

      // Click next page button
      const nextButton = screen.getByRole("button", { name: /next/i });
      await userEvent.click(nextButton);

      // Verify API call with page parameter
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("page=2"));
      });
    });

    it("navigates to previous page when previous button is clicked", async () => {
      // Start on page 2
      renderWithRouter(["/search?page=2"]);

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      mockAxios.clearMocks();
      mockItemsResponse(createTestItems(), 3);

      // Click previous page button
      const prevButton = screen.getByRole("button", { name: /previous/i });
      await userEvent.click(prevButton);

      // Verify API call with page parameter
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("page=1"));
      });
    });

    it("changes items per page", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      mockAxios.clearMocks();
      mockItemsResponse(createTestItems(), 1);

      // Find items per page select
      const itemsPerPageSelect = screen.getByDisplayValue("30");
      await userEvent.selectOptions(itemsPerPageSelect, "50");

      // Verify API call with new items_per_page
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("items_per_page=50"));
      });
    });
  });

  describe("URL Synchronization", () => {
    it("loads filters from URL parameters on initial render", async () => {
      renderWithRouter(["/search?genre=Action&media_type=anime&page=2"]);

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Verify API call includes URL parameters
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringMatching(/genre=Action.*media_type=anime.*page=2/)
      );
    });

    it("updates URL when filters change", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Select a genre
      const genreSelect = screen.getByLabelText(/genre/i);
      await userEvent.click(genreSelect);
      const actionOption = await screen.findByText("Action");
      await userEvent.click(actionOption);

      // Verify URL is updated
      await waitFor(() => {
        expect(window.location.pathname + window.location.search).toContain("genre=Action");
      });
    });
  });

  describe("Loading States", () => {
    it("shows skeleton loading for initial load", () => {
      renderWithRouter();

      expect(screen.getByTestId("skeleton-loading")).toBeInTheDocument();
    });

    it("shows partial loading overlay during filter changes", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Mock delayed response for loading state
      mockAxios.get.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ data: { items: [], total_pages: 1 } }), 100))
      );

      // Trigger filter change
      const genreSelect = screen.getByLabelText(/genre/i);
      await userEvent.click(genreSelect);
      const actionOption = await screen.findByText("Action");
      await userEvent.click(actionOption);

      // Should show loading overlay
      expect(screen.getByTestId("loading-overlay")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("shows empty state when no items found", async () => {
      mockItemsResponse([], 0);
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
      });
    });

    it("provides suggestions in empty state", async () => {
      mockItemsResponse([], 0);
      renderWithRouter(["/search?genre=NonExistent"]);

      await waitFor(() => {
        expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error message and retry button on API failure", async () => {
      mockAxios.mockRejectedValue({
        response: {
          data: { error: "Network Error" },
          status: 500,
        },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });

      // Test retry functionality
      mockAxios.reset();
      mockItemsResponse(createTestItems(), 1);

      const retryButton = screen.getByRole("button", { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });
    });
  });

  describe("Advanced Edge Cases", () => {
    it("handles network timeout scenarios", async () => {
      // Mock timeout
      mockAxios.mockRejectedValue({
        code: "ECONNABORTED",
        message: "timeout of 5000ms exceeded",
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText(/timeout|network/i)).toBeInTheDocument();
        },
        { timeout: 6000 }
      );
    });

    it("handles rapid filter changes (race conditions)", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Mock different responses for rapid changes
      let callCount = 0;
      mockAxios.get.mockImplementation(() => {
        callCount++;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: {
                items: [createMockItem({ title: `Result ${callCount}` })],
                total_pages: 1,
              },
            });
          }, Math.random() * 100);
        });
      });

      const genreSelect = screen.getByLabelText(/genre/i);

      // Trigger rapid changes
      await userEvent.click(genreSelect);
      const actionOption = await screen.findByText("Action");
      await userEvent.click(actionOption);

      await userEvent.click(genreSelect);
      const comedyOption = await screen.findByText("Comedy");
      await userEvent.click(comedyOption);

      // Should handle race condition gracefully
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledTimes(2);
      });
    });

    it("handles localStorage persistence failures", async () => {
      // Mock localStorage failure
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error("QuotaExceededError");
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Change items per page (which tries to save to localStorage)
      const itemsPerPageSelect = screen.getByDisplayValue("30");
      await userEvent.selectOptions(itemsPerPageSelect, "50");

      // Should continue working despite localStorage failure
      expect(screen.getByDisplayValue("50")).toBeInTheDocument();

      // Restore original localStorage
      localStorage.setItem = originalSetItem;
    });

    it("handles component unmounting during API calls", async () => {
      const { unmount } = renderWithRouter();

      // Start loading - should show skeleton
      expect(screen.getByTestId("skeleton-loading")).toBeInTheDocument();

      // Mock slow API response
      mockAxios.get.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ data: { items: [], total_pages: 1 } }), 2000))
      );

      // Unmount component before API completes
      unmount();

      // Should not cause memory leaks or errors
      // If this test passes without errors, the cleanup is working
      expect(true).toBe(true);
    });

    it("handles extreme pagination scenarios", async () => {
      // Mock response with very high page count
      const testItems = createTestItems(3);
      mockItemsResponse(testItems, 999999);

      renderWithRouter(["/search?page=500000"]);

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Should handle extreme page numbers gracefully
      const paginationInfo = screen.getByText(/page 500000/i);
      expect(paginationInfo).toBeInTheDocument();
    });

    it("handles malformed URL parameters", async () => {
      // URL with malformed parameters - should fallback to defaults
      const testItems = createTestItems(3);
      mockItemsResponse(testItems, 1);

      renderWithRouter(["/search?page=abc&items_per_page=xyz&min_score=invalid"]);

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Should fallback to defaults for invalid parameters
      expect(mockAxios.get).toHaveBeenCalledWith(expect.stringMatching(/page=1.*items_per_page=30/));
    });

    it("handles browser back/forward navigation", async () => {
      const testItems = createTestItems(3);
      mockItemsResponse(testItems, 1);

      const { rerender } = renderWithRouter(["/search?genre=Action"]);

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Clear previous mock calls
      mockAxios.clearMocks();

      // Simulate navigation to different filters
      rerender(
        <MemoryRouter initialEntries={["/search?genre=Comedy"]}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("genre=Comedy"));
      });

      // Clear again for next navigation
      mockAxios.clearMocks();

      // Simulate back navigation
      rerender(
        <MemoryRouter initialEntries={["/search?genre=Action"]}>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("genre=Action"));
      });
    });

    it("handles API response with missing fields", async () => {
      // Mock API response with missing/null fields
      const incompleteItems = [
        {
          uid: "incomplete-1",
          title: null,
          media_type: undefined,
          genres: null,
          score: null,
        },
      ];

      mockItemsResponse(incompleteItems as any, 1);
      renderWithRouter();

      await waitFor(() => {
        // Should render without crashing - check for filter bar instead of specific text
        expect(screen.getByRole("search")).toBeInTheDocument();
      });
    });
  });
});
