/**
 * Unit Tests for ErrorBoundary Component
 * Tests error catching, fallback UI display, and error reporting
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../../components/ErrorBoundary";

// Test component that throws errors
const ThrowError = ({ shouldThrow = false, errorMessage = "Test error" }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error thrown</div>;
};

// Mock console.error to prevent error output in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe("ErrorBoundary Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Normal Operation", () => {
    it("renders children when no error is thrown", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("No error thrown")).toBeInTheDocument();
    });

    it("renders multiple children correctly", () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Child 1")).toBeInTheDocument();
      expect(screen.getByText("Child 2")).toBeInTheDocument();
      expect(screen.getByText("No error thrown")).toBeInTheDocument();
    });

    it("does not show error UI when no error occurs", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /reload/i })).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("catches JavaScript errors and displays fallback UI", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
    });

    it("displays error message in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Custom error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/custom error message/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it("hides detailed error message in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Sensitive error info" />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/sensitive error info/i)).not.toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it("logs error to console", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });

    it("catches errors from deeply nested components", () => {
      render(
        <ErrorBoundary>
          <div>
            <div>
              <div>
                <ThrowError shouldThrow={true} />
              </div>
            </div>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe("Error Recovery", () => {
    it("provides reload button for error recovery", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole("button", { name: /reload/i });
      expect(reloadButton).toBeInTheDocument();
    });

    it("reloads page when reload button is clicked", () => {
      const originalReload = window.location.reload;
      window.location.reload = jest.fn();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole("button", { name: /reload/i });
      reloadButton.click();

      expect(window.location.reload).toHaveBeenCalled();

      window.location.reload = originalReload;
    });

    it("provides link to homepage", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const homeLink = screen.getByRole("link", { name: /go to homepage/i });
      expect(homeLink).toHaveAttribute("href", "/");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA roles and labels", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByLabelText(/error occurred/i)).toBeInTheDocument();
    });

    it("has proper heading hierarchy", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it("provides keyboard accessible buttons", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole("button", { name: /reload/i });
      expect(reloadButton).toHaveAttribute("type", "button");
    });
  });

  describe("Edge Cases", () => {
    it("handles error with undefined message", () => {
      const ErrorComponent = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("handles error with null error object", () => {
      const ErrorComponent = () => {
        throw null;
      };

      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("handles multiple errors gracefully", () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Rerender with a different error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Second error" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("resets error state when children change to non-erroring component", () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Rerender with non-erroring component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("No error thrown")).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe("Error Information Display", () => {
    it("displays user-friendly error message", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/please try again/i)).toBeInTheDocument();
    });

    it("displays helpful suggestions", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/reload/i)).toBeInTheDocument();
      expect(screen.getByText(/homepage/i)).toBeInTheDocument();
    });

    it("does not display technical error details to end users in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="TypeError: Cannot read property 'x' of undefined" />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/typeerror/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/cannot read property/i)).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Component Lifecycle", () => {
    it("cleans up properly when unmounted", () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(() => unmount()).not.toThrow();
    });

    it("handles errors that occur during rendering", () => {
      const RenderError = () => {
        throw new Error("Render error");
      };

      render(
        <ErrorBoundary>
          <RenderError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("handles errors that occur during component mounting", () => {
      const MountError = () => {
        React.useEffect(() => {
          throw new Error("Mount error");
        }, []);
        return <div>Component mounted</div>;
      };

      render(
        <ErrorBoundary>
          <MountError />
        </ErrorBoundary>
      );

      // Note: useEffect errors need to be caught differently in React 17+
      // This test verifies the boundary is set up correctly
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
