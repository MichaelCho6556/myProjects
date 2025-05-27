/**
 * Unit Tests for PaginationControls Component
 * Tests pagination navigation, page display, and edge cases
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaginationControls from "../../components/PaginationControls";

const defaultProps = {
  currentPage: 1,
  totalPages: 10,
  itemsPerPage: 30,
  totalItems: 300,
  onPrevPage: jest.fn(),
  onNextPage: jest.fn(),
};

describe("PaginationControls Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("displays current page information", () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.getByText("Page 1 of 10")).toBeInTheDocument();
    });

    it("displays items range when items are present", () => {
      const propsWithItems = { ...defaultProps, items: new Array(30).fill({}) };
      render(<PaginationControls {...propsWithItems} />);

      expect(screen.getByText(/Showing 1-30 of 300/)).toBeInTheDocument();
    });

    it("does not display items range when no items", () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
      expect(screen.getByText("Page 1 of 10")).toBeInTheDocument();
    });
  });

  describe("Navigation Buttons", () => {
    it("renders previous and next buttons", () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("calls onNextPage when next button is clicked", async () => {
      render(<PaginationControls {...defaultProps} />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      await userEvent.click(nextButton);

      expect(defaultProps.onNextPage).toHaveBeenCalledWith();
    });

    it("calls onPrevPage when previous button is clicked", async () => {
      const props = { ...defaultProps, currentPage: 5 };
      render(<PaginationControls {...props} />);

      const prevButton = screen.getByRole("button", { name: /previous/i });
      await userEvent.click(prevButton);

      expect(defaultProps.onPrevPage).toHaveBeenCalledWith();
    });
  });

  describe("Button States", () => {
    it("disables previous button on first page", () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    });

    it("disables next button on last page", () => {
      const props = { ...defaultProps, currentPage: 10 };
      render(<PaginationControls {...props} />);

      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });

    it("enables both buttons on middle pages", () => {
      const props = { ...defaultProps, currentPage: 5 };
      render(<PaginationControls {...props} />);

      expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled();
      expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
    });

    it("disables all buttons when loading", () => {
      const props = { ...defaultProps, loading: true };
      render(<PaginationControls {...props} />);

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });
  });

  describe("Edge Cases", () => {
    it("handles single page gracefully", () => {
      const props = { ...defaultProps, totalPages: 1 };
      render(<PaginationControls {...props} />);

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
      expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    });

    it("handles zero total pages", () => {
      const props = { ...defaultProps, totalPages: 0, totalItems: 0 };
      render(<PaginationControls {...props} />);

      expect(screen.getByText("Page 1 of 0")).toBeInTheDocument();
    });

    it("handles very large page numbers", () => {
      const props = { ...defaultProps, currentPage: 999, totalPages: 1000 };
      render(<PaginationControls {...props} />);

      expect(screen.getByText("Page 999 of 1000")).toBeInTheDocument();
    });

    it("handles invalid current page (greater than total)", () => {
      const props = { ...defaultProps, currentPage: 15, totalPages: 10 };
      render(<PaginationControls {...props} />);

      // Should still render without crashing
      expect(screen.getByText("Page 15 of 10")).toBeInTheDocument();
    });

    it("handles negative page numbers", () => {
      const props = { ...defaultProps, currentPage: -1, totalPages: 10 };
      render(<PaginationControls {...props} />);

      expect(screen.getByText("Page -1 of 10")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.getByRole("navigation")).toBeInTheDocument();
      expect(screen.getByLabelText(/pagination/i)).toBeInTheDocument();
    });

    it("provides descriptive button labels", () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.getByLabelText(/go to previous page/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/go to next page/i)).toBeInTheDocument();
    });

    it("has proper button titles", () => {
      render(<PaginationControls {...defaultProps} />);

      const prevButton = screen.getByRole("button", { name: /previous/i });
      const nextButton = screen.getByRole("button", { name: /next/i });

      expect(prevButton).toHaveAttribute("title", "Previous page");
      expect(nextButton).toHaveAttribute("title", "Next page");
    });

    it("provides live region for screen readers", () => {
      render(<PaginationControls {...defaultProps} />);

      const liveRegion = screen.getByText("Page 1 of 10");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
    });

    it("uses proper button types", () => {
      render(<PaginationControls {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });
  });

  describe("Loading States", () => {
    it("disables buttons during loading", () => {
      const props = { ...defaultProps, loading: true };
      render(<PaginationControls {...props} />);

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });

    it("does not show item range during loading", () => {
      const props = { ...defaultProps, loading: true, items: new Array(30).fill({}) };
      render(<PaginationControls {...props} />);

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
      expect(screen.getByText("Page 1 of 10")).toBeInTheDocument();
    });
  });

  describe("Data Display", () => {
    it("shows item range correctly for first page", () => {
      const props = { ...defaultProps, items: new Array(30).fill({}) };
      render(<PaginationControls {...props} />);

      expect(screen.getByText(/Showing 1-30 of 300/)).toBeInTheDocument();
    });

    it("shows item range correctly for middle page", () => {
      const props = {
        ...defaultProps,
        currentPage: 2,
        items: new Array(30).fill({}),
      };
      render(<PaginationControls {...props} />);

      expect(screen.getByText(/Showing 31-60 of 300/)).toBeInTheDocument();
    });

    it("shows item range correctly for last page with fewer items", () => {
      const props = {
        ...defaultProps,
        currentPage: 10,
        totalItems: 295,
        items: new Array(25).fill({}),
      };
      render(<PaginationControls {...props} />);

      expect(screen.getByText(/Showing 271-295 of 295/)).toBeInTheDocument();
    });

    it("handles empty items array", () => {
      const props = { ...defaultProps, items: [] };
      render(<PaginationControls {...props} />);

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });
  });

  describe("Component Lifecycle", () => {
    it("cleans up properly when unmounted", () => {
      const { unmount } = render(<PaginationControls {...defaultProps} />);

      expect(() => unmount()).not.toThrow();
    });

    it("handles props changes correctly", () => {
      const { rerender } = render(<PaginationControls {...defaultProps} />);

      expect(screen.getByText("Page 1 of 10")).toBeInTheDocument();

      const newProps = { ...defaultProps, currentPage: 3, totalPages: 20 };
      rerender(<PaginationControls {...newProps} />);

      expect(screen.getByText("Page 3 of 20")).toBeInTheDocument();
    });

    it("maintains memoization with same props", () => {
      const { rerender } = render(<PaginationControls {...defaultProps} />);

      // Re-render with same props should not cause issues
      rerender(<PaginationControls {...defaultProps} />);

      expect(screen.getByText("Page 1 of 10")).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const props = { ...defaultProps, className: "custom-pagination" };
      render(<PaginationControls {...props} />);

      const container = screen.getByRole("navigation");
      expect(container).toHaveClass("pagination-controls", "custom-pagination");
    });

    it("applies default className when none provided", () => {
      render(<PaginationControls {...defaultProps} />);

      const container = screen.getByRole("navigation");
      expect(container).toHaveClass("pagination-controls");
    });
  });

  describe("Performance", () => {
    it("handles rapid button clicks", async () => {
      const props = { ...defaultProps, currentPage: 5 };
      render(<PaginationControls {...props} />);

      const nextButton = screen.getByRole("button", { name: /next/i });

      // Rapid clicks
      await userEvent.click(nextButton);
      await userEvent.click(nextButton);
      await userEvent.click(nextButton);

      // Should call onNextPage for each click
      expect(defaultProps.onNextPage).toHaveBeenCalledTimes(3);
    });

    it("prevents action when button is disabled", async () => {
      render(<PaginationControls {...defaultProps} />);

      const prevButton = screen.getByRole("button", { name: /previous/i });

      // Try to click disabled button
      await userEvent.click(prevButton);

      // Should not call onPrevPage
      expect(defaultProps.onPrevPage).not.toHaveBeenCalled();
    });
  });

  describe("Button Functionality", () => {
    it("does not call handlers when buttons are disabled", async () => {
      render(<PaginationControls {...defaultProps} />);

      // Previous button should be disabled on first page
      const prevButton = screen.getByRole("button", { name: /previous/i });
      expect(prevButton).toBeDisabled();

      // Clicking disabled button should not call handler
      await userEvent.click(prevButton);
      expect(defaultProps.onPrevPage).not.toHaveBeenCalled();
    });

    it("handles missing handlers gracefully", () => {
      const propsWithoutHandlers = {
        currentPage: 5,
        totalPages: 10,
        itemsPerPage: 30,
        totalItems: 300,
        onPrevPage: undefined as any,
        onNextPage: undefined as any,
      };

      // Should not crash even with undefined handlers
      expect(() => {
        render(<PaginationControls {...propsWithoutHandlers} />);
      }).not.toThrow();
    });
  });

  describe("Boundary Conditions", () => {
    it("handles zero items per page", () => {
      const props = { ...defaultProps, itemsPerPage: 0, items: [] };
      render(<PaginationControls {...props} />);

      expect(screen.getByText("Page 1 of 10")).toBeInTheDocument();
    });

    it("handles extremely large numbers", () => {
      const props = {
        ...defaultProps,
        currentPage: Number.MAX_SAFE_INTEGER - 1,
        totalPages: Number.MAX_SAFE_INTEGER,
        totalItems: Number.MAX_SAFE_INTEGER,
      };

      expect(() => {
        render(<PaginationControls {...props} />);
      }).not.toThrow();
    });

    it("handles NaN values gracefully", () => {
      const props = {
        ...defaultProps,
        currentPage: NaN,
        totalPages: NaN,
        totalItems: NaN,
      };

      expect(() => {
        render(<PaginationControls {...props} />);
      }).not.toThrow();
    });
  });
});
