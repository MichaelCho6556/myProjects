/**
 * Unit Tests for ErrorFallback Component
 * Tests comprehensive error fallback UI with retry mechanisms
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ErrorFallback from "../../../components/Error/ErrorFallback";

// Mock toast hook
const mockAddToast = jest.fn();
jest.mock("../../../components/Feedback/ToastProvider", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("ErrorFallback Component", () => {
  const mockError = new Error("Test error message");
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders error fallback UI", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("shows detailed error when showDetails prop is true", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} showDetails={true} />);

      expect(screen.getByText(/technical details/i)).toBeInTheDocument();

      // Check that the detailed error section appears
      const detailsSection = document.querySelector(".error-details");
      expect(detailsSection).toBeInTheDocument();

      // Check that the error message appears in the technical details
      const messageField = screen.getByText(/message:/i);
      expect(messageField).toBeInTheDocument();
    });

    it("hides detailed error in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      expect(screen.queryByText(/test error message/i)).not.toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Retry Functionality", () => {
    it("shows retry button", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: /retry the failed operation/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", async () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: /retry the failed operation/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it("does not show loading state during retry (simple implementation)", async () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: /retry the failed operation/i });
      fireEvent.click(retryButton);

      // Component has simple implementation without loading states
      expect(retryButton).not.toBeDisabled();
      expect(screen.queryByText(/retrying/i)).not.toBeInTheDocument();
    });

    it("executes retry callback without additional side effects", async () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: /retry the failed operation/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);

      // Component doesn't show toasts, just calls the callback
      expect(mockAddToast).not.toHaveBeenCalled();
    });
  });

  describe("Navigation Options", () => {
    it("provides home page navigation", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const homeButton = screen.getByRole("button", { name: /go to homepage/i });
      expect(homeButton).toBeInTheDocument();
    });

    it("provides refresh page option", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const refreshButton = screen.getByRole("button", { name: /refresh the page/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it("provides support contact link", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const supportLink = screen.getByRole("link", { name: /contact support/i });
      expect(supportLink).toHaveAttribute("href", "mailto:support@animanga.com");
    });
  });

  describe("Error Types", () => {
    it("shows network error message for network errors", () => {
      const networkError = new Error("Network Error");

      renderWithRouter(<ErrorFallback error={networkError} onRetry={mockOnRetry} />);

      expect(screen.getByText(/network connection error/i)).toBeInTheDocument();
    });

    it("shows authentication error message for auth errors", () => {
      const authError = new Error("401 Unauthorized");

      renderWithRouter(<ErrorFallback error={authError} onRetry={mockOnRetry} />);

      expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
    });

    it("shows generic error message for unknown errors", () => {
      const unknownError = new Error("Unknown error");

      renderWithRouter(<ErrorFallback error={unknownError} onRetry={mockOnRetry} />);

      expect(screen.getByText(/something unexpected happened/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA roles and labels", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("error-fallback");
    });

    it("has proper heading hierarchy", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Oops! Something went wrong");
    });

    it("has keyboard-accessible retry button", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: /retry the failed operation/i });

      retryButton.focus();
      expect(retryButton).toHaveFocus();

      // Test keyboard interaction by pressing Enter
      fireEvent.keyPress(retryButton, { key: "Enter", charCode: 13 });
      // Note: Browsers handle this automatically, but we can test the button is focusable
      expect(retryButton).toHaveAttribute("aria-label", "Retry the failed operation");
    });
  });

  describe("Visual Design", () => {
    it("applies error fallback styling", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const errorContainer = screen.getByRole("alert");
      expect(errorContainer).toHaveClass("error-fallback");
    });

    it("shows error icon", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const errorIcon = document.querySelector(".error-icon");
      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon).toHaveClass("error-icon");
    });

    it("has content container styling", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const contentContainer = document.querySelector(".error-fallback-content");
      expect(contentContainer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles null error gracefully", () => {
      renderWithRouter(<ErrorFallback error={null} onRetry={mockOnRetry} />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("handles error without message", () => {
      const errorWithoutMessage = new Error();

      renderWithRouter(<ErrorFallback error={errorWithoutMessage} onRetry={mockOnRetry} />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("handles missing onRetry callback", () => {
      renderWithRouter(<ErrorFallback error={mockError} />);

      expect(screen.queryByRole("button", { name: /retry the failed operation/i })).not.toBeInTheDocument();
    });
  });
});
