/**
 * Unit Tests for ErrorFallback Component
 * Tests comprehensive error fallback UI with retry mechanisms
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ErrorFallback from "../../../components/Error/ErrorFallback";

// Mock toast hook
const mockAddToast = jest.fn();
jest.mock("../../../hooks/useToast", () => ({
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

    it("displays error message in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      expect(screen.getByText(/test error message/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
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

      const retryButton = screen.getByRole("button", { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", async () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it("shows loading state during retry", async () => {
      const slowRetry = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderWithRouter(<ErrorFallback error={mockError} onRetry={slowRetry} />);

      const retryButton = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(retryButton);

      expect(screen.getByText(/retrying/i)).toBeInTheDocument();
      expect(retryButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText(/retrying/i)).not.toBeInTheDocument();
      });
    });

    it("shows toast notification on retry success", async () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: "info",
          title: "Retrying",
          message: "Attempting to reload...",
        });
      });
    });
  });

  describe("Navigation Options", () => {
    it("provides home page link", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const homeLink = screen.getByRole("link", { name: /go to home/i });
      expect(homeLink).toHaveAttribute("href", "/");
    });

    it("provides dashboard link for authenticated users", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} isAuthenticated={true} />);

      const dashboardLink = screen.getByRole("link", { name: /go to dashboard/i });
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });

    it("hides dashboard link for unauthenticated users", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} isAuthenticated={false} />);

      expect(screen.queryByRole("link", { name: /go to dashboard/i })).not.toBeInTheDocument();
    });
  });

  describe("Error Types", () => {
    it("shows network error message for network errors", () => {
      const networkError = new Error("Network Error");
      networkError.name = "NetworkError";

      renderWithRouter(<ErrorFallback error={networkError} onRetry={mockOnRetry} />);

      expect(screen.getByText(/network connection/i)).toBeInTheDocument();
    });

    it("shows authentication error message for auth errors", () => {
      const authError = new Error("Authentication failed");
      authError.name = "AuthenticationError";

      renderWithRouter(<ErrorFallback error={authError} onRetry={mockOnRetry} />);

      expect(screen.getByText(/authentication/i)).toBeInTheDocument();
    });

    it("shows generic error message for unknown errors", () => {
      const unknownError = new Error("Unknown error");

      renderWithRouter(<ErrorFallback error={unknownError} onRetry={mockOnRetry} />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA roles and labels", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("has proper heading hierarchy", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
    });

    it("has keyboard-accessible retry button", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: /try again/i });

      retryButton.focus();
      expect(retryButton).toHaveFocus();

      fireEvent.keyDown(retryButton, { key: "Enter" });
      expect(mockOnRetry).toHaveBeenCalled();
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

      const errorIcon = screen.getByTestId("error-icon");
      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon).toHaveClass("error-icon");
    });

    it("has professional styling classes", () => {
      renderWithRouter(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const container = screen.getByRole("alert");
      expect(container).toHaveClass("professional-error-ui");
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
      renderWithRouter(<ErrorFallback error={mockError} onRetry={undefined} />);

      expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    });
  });
});
