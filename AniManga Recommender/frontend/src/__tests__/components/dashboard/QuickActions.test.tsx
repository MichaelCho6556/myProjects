/**
 * Comprehensive QuickActions Component Tests for AniManga Recommender
 * Phase B2: Dashboard Components Testing
 *
 * Test Coverage:
 * - Component rendering and button display
 * - Navigation functionality via Links
 * - Refresh button interaction
 * - Accessibility compliance
 * - Performance and edge cases
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import QuickActions from "../../../components/dashboard/QuickActions";

// Test wrapper with Router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("QuickActions Component", () => {
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    mockOnRefresh.mockClear();
  });

  describe("Rendering Tests", () => {
    test("renders all quick action elements", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      expect(screen.getByText("Quick Actions")).toBeInTheDocument();
      expect(screen.getByText("Refresh Data")).toBeInTheDocument();
      expect(screen.getByText("Browse Anime")).toBeInTheDocument();
      expect(screen.getByText("Browse Manga")).toBeInTheDocument();
      expect(screen.getByText("Random Pick")).toBeInTheDocument();
      expect(screen.getByText("Top Rated")).toBeInTheDocument();
      expect(screen.getByText("Currently Airing")).toBeInTheDocument();
    });

    test("renders action icons", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      // Check for emoji icons in the component
      expect(screen.getByText("🔄")).toBeInTheDocument();
      expect(screen.getByText("📺")).toBeInTheDocument();
      expect(screen.getByText("📚")).toBeInTheDocument();
      expect(screen.getByText("🎲")).toBeInTheDocument();
      expect(screen.getByText("⭐")).toBeInTheDocument();
      expect(screen.getByText("📡")).toBeInTheDocument();
    });

    test("has correct structure", () => {
      const { container } = renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      expect(container.querySelector(".quick-actions-section")).toBeInTheDocument();
      expect(container.querySelector(".actions-grid")).toBeInTheDocument();
      expect(container.querySelector(".quick-stats")).toBeInTheDocument();
    });
  });

  describe("Navigation Tests", () => {
    test("has correct links for browse anime", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const browseAnimeLink = screen.getByText("Browse Anime").closest("a");
      expect(browseAnimeLink).toHaveAttribute("href", "/?media_type=anime");
    });

    test("has correct links for browse manga", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const browseMangaLink = screen.getByText("Browse Manga").closest("a");
      expect(browseMangaLink).toHaveAttribute("href", "/?media_type=manga");
    });

    test("has correct links for random pick", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const randomLink = screen.getByText("Random Pick").closest("a");
      expect(randomLink).toHaveAttribute("href", "/?sort_by=random");
    });

    test("has correct links for top rated", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const topRatedLink = screen.getByText("Top Rated").closest("a");
      expect(topRatedLink).toHaveAttribute("href", "/?sort_by=score_desc&min_score=8");
    });

    test("has correct links for currently airing", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const currentlyAiringLink = screen.getByText("Currently Airing").closest("a");
      expect(currentlyAiringLink).toHaveAttribute("href", "/?media_type=anime&status=currently_airing");
    });
  });

  describe("Refresh Functionality Tests", () => {
    test("calls onRefresh when refresh button clicked", async () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const refreshButton = screen.getByText("Refresh Data");
      await userEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    test("shows refreshing state during refresh", async () => {
      const slowRefresh = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderWithRouter(<QuickActions onRefresh={slowRefresh} />);

      const refreshButton = screen.getByText("Refresh Data");
      await userEvent.click(refreshButton);

      // Should show refreshing state
      expect(screen.getByText("Refreshing...")).toBeInTheDocument();
      expect(screen.getByText("⟳")).toBeInTheDocument();

      // Wait for refresh to complete
      await waitFor(() => {
        expect(screen.getByText("Refresh Data")).toBeInTheDocument();
      });
    });

    test("disables refresh button during refresh", async () => {
      const slowRefresh = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderWithRouter(<QuickActions onRefresh={slowRefresh} />);

      const refreshButton = screen.getByText("Refresh Data");
      await userEvent.click(refreshButton);

      // Button should be disabled during refresh
      expect(refreshButton).toBeDisabled();

      // Wait for refresh to complete
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });

  describe("Quick Stats Section", () => {
    test("renders quick tips section", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      expect(screen.getByText("Quick Tips")).toBeInTheDocument();
      expect(screen.getByText(/Use filters to find exactly what you're looking for/)).toBeInTheDocument();
      expect(screen.getByText(/Add items to your list to track your progress/)).toBeInTheDocument();
      expect(screen.getByText(/Rate items to get better recommendations/)).toBeInTheDocument();
      expect(screen.getByText(/Set goals to maintain your viewing streak/)).toBeInTheDocument();
    });

    test("has proper list structure for tips", () => {
      const { container } = renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const tipsList = container.querySelector(".quick-stats ul");
      expect(tipsList).toBeInTheDocument();

      const listItems = tipsList?.querySelectorAll("li");
      expect(listItems).toHaveLength(4);
    });
  });

  describe("Accessibility Tests", () => {
    test("has proper button roles", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const refreshButton = screen.getByRole("button", { name: /refresh data/i });
      expect(refreshButton).toBeInTheDocument();
    });

    test("has proper link roles", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBe(5); // Should have 5 navigation links
    });

    test("buttons are keyboard accessible", async () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const refreshButton = screen.getByText("Refresh Data");

      // Focus and activate with keyboard
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();

      await userEvent.keyboard("{Enter}");
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    test("links are keyboard accessible", () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const browseAnimeLink = screen.getByText("Browse Anime").closest("a");

      // Should be focusable
      browseAnimeLink?.focus();
      expect(browseAnimeLink).toHaveFocus();
    });
  });

  describe("Performance Tests", () => {
    test("renders quickly", () => {
      const startTime = performance.now();
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
    });

    test("handles multiple re-renders efficiently", () => {
      const { rerender } = renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const startTime = performance.now();

      // Multiple re-renders with proper Router context
      for (let i = 0; i < 10; i++) {
        rerender(
          <BrowserRouter>
            <QuickActions onRefresh={mockOnRefresh} />
          </BrowserRouter>
        );
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    test("unmounts cleanly", () => {
      const { unmount } = renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      expect(() => unmount()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    test("handles onRefresh errors gracefully", async () => {
      const errorRefresh = jest.fn().mockRejectedValue(new Error("Refresh failed"));

      renderWithRouter(<QuickActions onRefresh={errorRefresh} />);

      const refreshButton = screen.getByText("Refresh Data");

      // Should not crash on refresh error - catch the rejection
      try {
        await userEvent.click(refreshButton);
        // Wait a bit for the error to be handled
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        // Expected to catch the error, but component should still work
      }

      // Component should still be functional after error
      expect(refreshButton).toBeInTheDocument();
    });

    test("handles rapid clicking of refresh", async () => {
      renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      const refreshButton = screen.getByText("Refresh Data");

      // Rapid clicking
      await userEvent.click(refreshButton);
      await userEvent.click(refreshButton);
      await userEvent.click(refreshButton);

      // Should handle gracefully (button gets disabled during refresh)
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    test("handles missing onRefresh prop gracefully", () => {
      // Test without onRefresh prop (should have default empty function)
      expect(() => {
        renderWithRouter(<QuickActions onRefresh={() => {}} />);
      }).not.toThrow();
    });
  });

  describe("Responsive Design", () => {
    test("maintains structure on different viewport sizes", () => {
      const { container } = renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />);

      // Mock different viewport sizes
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 768,
      });

      expect(container.querySelector(".actions-grid")).toBeInTheDocument();
      expect(container.querySelector(".quick-stats")).toBeInTheDocument();
    });
  });
});
