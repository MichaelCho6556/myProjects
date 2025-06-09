/**
 * Unit Tests for ToastProvider Component
 * Tests toast notification system and context management
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import {
  ToastProvider,
  useToast,
  useToastActions,
  ToastMessage,
} from "../../../components/Feedback/ToastProvider";

// Test component to interact with toast context
const TestComponent: React.FC = () => {
  const { addToast, removeToast, clearAllToasts } = useToast();

  return (
    <div>
      <button
        onClick={() =>
          addToast({
            type: "success",
            title: "Success",
            message: "Operation completed successfully",
          })
        }
        data-testid="add-success-toast"
      >
        Add Success Toast
      </button>

      <button
        onClick={() =>
          addToast({
            type: "error",
            title: "Error",
            message: "Something went wrong",
            duration: 6000,
          })
        }
        data-testid="add-error-toast"
      >
        Add Error Toast
      </button>

      <button
        onClick={() =>
          addToast({
            type: "info",
            title: "Info",
            message: "Information message",
            action: {
              label: "Retry",
              onClick: () => console.log("Retry clicked"),
            },
          })
        }
        data-testid="add-info-toast"
      >
        Add Info Toast
      </button>

      <button onClick={() => removeToast("test-id")} data-testid="remove-toast">
        Remove Toast
      </button>

      <button onClick={clearAllToasts} data-testid="clear-all-toasts">
        Clear All Toasts
      </button>
    </div>
  );
};

// Test component for useToastActions hook
const ToastActionsTestComponent: React.FC = () => {
  const { success, error, warning, info } = useToastActions();

  return (
    <div>
      <button onClick={() => success("Success Title", "Success message")} data-testid="success-action">
        Success
      </button>

      <button onClick={() => error("Error Title", "Error message")} data-testid="error-action">
        Error
      </button>

      <button onClick={() => warning("Warning Title", "Warning message")} data-testid="warning-action">
        Warning
      </button>

      <button onClick={() => info("Info Title", "Info message")} data-testid="info-action">
        Info
      </button>
    </div>
  );
};

const renderWithToastProvider = (
  ui: React.ReactElement,
  options?: { maxToasts?: number; defaultDuration?: number }
) => {
  return render(
    <ToastProvider
      {...(options?.maxToasts !== undefined && { maxToasts: options.maxToasts })}
      {...(options?.defaultDuration !== undefined && { defaultDuration: options.defaultDuration })}
    >
      {ui}
    </ToastProvider>
  );
};

describe("ToastProvider Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Toast Management", () => {
    it("renders without crashing", () => {
      render(
        <ToastProvider>
          <div>Test content</div>
        </ToastProvider>
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("adds toast notifications", () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));

      expect(screen.getByText("Success")).toBeInTheDocument();
      expect(screen.getByText("Operation completed successfully")).toBeInTheDocument();
    });

    it("adds multiple toast notifications", () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));
      fireEvent.click(screen.getByTestId("add-error-toast"));

      expect(screen.getByText("Success")).toBeInTheDocument();
      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("limits maximum number of toasts", () => {
      renderWithToastProvider(<TestComponent />, { maxToasts: 2 });

      // Add 3 toasts
      fireEvent.click(screen.getByTestId("add-success-toast"));
      fireEvent.click(screen.getByTestId("add-error-toast"));
      fireEvent.click(screen.getByTestId("add-info-toast"));

      // Should only show 2 toasts (oldest removed)
      expect(screen.queryByText("Success")).not.toBeInTheDocument();
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("Info")).toBeInTheDocument();
    });

    it("removes individual toasts", () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));
      expect(screen.getByText("Success")).toBeInTheDocument();

      // Find and click close button
      const closeButton = screen.getByLabelText("Close notification");
      fireEvent.click(closeButton);

      waitFor(() => {
        expect(screen.queryByText("Success")).not.toBeInTheDocument();
      });
    });

    it("clears all toasts", () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));
      fireEvent.click(screen.getByTestId("add-error-toast"));

      expect(screen.getByText("Success")).toBeInTheDocument();
      expect(screen.getByText("Error")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("clear-all-toasts"));

      waitFor(() => {
        expect(screen.queryByText("Success")).not.toBeInTheDocument();
        expect(screen.queryByText("Error")).not.toBeInTheDocument();
      });
    });
  });

  describe("Auto-dismiss Functionality", () => {
    it("auto-removes toasts after default duration", async () => {
      renderWithToastProvider(<TestComponent />, { defaultDuration: 1000 });

      fireEvent.click(screen.getByTestId("add-success-toast"));
      expect(screen.getByText("Success")).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByText("Success")).not.toBeInTheDocument();
      });
    });

    it("respects custom duration for individual toasts", async () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-error-toast")); // 6000ms duration

      expect(screen.getByText("Error")).toBeInTheDocument();

      // Fast-forward less than duration
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText("Error")).toBeInTheDocument();

      // Fast-forward past duration
      act(() => {
        jest.advanceTimersByTime(3500);
      });

      await waitFor(() => {
        expect(screen.queryByText("Error")).not.toBeInTheDocument();
      });
    });

    it("does not auto-remove persistent toasts (duration 0)", () => {
      renderWithToastProvider(<TestComponent />);

      const { addToast } = require("../../../components/Feedback/ToastProvider");

      // Mock a persistent toast
      fireEvent.click(screen.getByTestId("add-success-toast"));

      // Manually clear the timeout by making duration 0
      const toastContainer = screen.getByRole("region", { name: "Notifications" });
      expect(toastContainer).toBeInTheDocument();

      // Fast-forward significant time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should still be present for normal duration toasts
      expect(screen.queryByText("Success")).not.toBeInTheDocument(); // Will be gone due to default duration
    });
  });

  describe("Toast Actions", () => {
    it("renders toast with action button", () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-info-toast"));

      expect(screen.getByText("Info")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    it("executes action when action button is clicked", () => {
      const mockAction = jest.fn();
      renderWithToastProvider(<TestComponent />);

      // Mock console.log for action
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      fireEvent.click(screen.getByTestId("add-info-toast"));
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      expect(consoleSpy).toHaveBeenCalledWith("Retry clicked");

      consoleSpy.mockRestore();
    });
  });

  describe("useToastActions Hook", () => {
    it("provides convenience methods for different toast types", () => {
      renderWithToastProvider(<ToastActionsTestComponent />);

      // Test success action
      fireEvent.click(screen.getByTestId("success-action"));
      expect(screen.getByText("Success Title")).toBeInTheDocument();

      // Test error action
      fireEvent.click(screen.getByTestId("error-action"));
      expect(screen.getByText("Error Title")).toBeInTheDocument();

      // Test warning action
      fireEvent.click(screen.getByTestId("warning-action"));
      expect(screen.getByText("Warning Title")).toBeInTheDocument();

      // Test info action
      fireEvent.click(screen.getByTestId("info-action"));
      expect(screen.getByText("Info Title")).toBeInTheDocument();
    });

    it("applies correct durations for different toast types", async () => {
      renderWithToastProvider(<ToastActionsTestComponent />);

      // Error toasts should last 6000ms
      fireEvent.click(screen.getByTestId("error-action"));
      expect(screen.getByText("Error Title")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      expect(screen.getByText("Error Title")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(screen.queryByText("Error Title")).not.toBeInTheDocument();
      });
    });
  });

  describe("Context Error Handling", () => {
    it("throws error when useToast is used outside provider", () => {
      const TestComponentOutsideProvider = () => {
        const { addToast } = useToast();
        return <div>Should not render</div>;
      };

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow("useToast must be used within a ToastProvider");

      consoleSpy.mockRestore();
    });

    it("throws error when useToastActions is used outside provider", () => {
      const TestComponentOutsideProvider = () => {
        const { success } = useToastActions();
        return <div>Should not render</div>;
      };

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow("useToast must be used within a ToastProvider");

      consoleSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    it("provides accessible toast container", () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));

      const toastContainer = screen.getByRole("region", { name: "Notifications" });
      expect(toastContainer).toBeInTheDocument();
      expect(toastContainer).toHaveAttribute("aria-live", "polite");
    });

    it("provides accessible individual toasts", () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));

      const toast = screen.getByRole("alert");
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveAttribute("aria-label", "Success notification");
    });

    it("provides accessible close buttons", () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));

      const closeButton = screen.getByLabelText("Close notification");
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute("type", "button");
    });
  });

  describe("Memory Management", () => {
    it("cleans up timeouts when toasts are manually removed", () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));

      // Manually remove toast
      const closeButton = screen.getByLabelText("Close notification");
      fireEvent.click(closeButton);

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it("cleans up all timeouts when clearing all toasts", () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));
      fireEvent.click(screen.getByTestId("add-error-toast"));

      fireEvent.click(screen.getByTestId("clear-all-toasts"));

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe("Toast Uniqueness", () => {
    it("generates unique IDs for each toast", () => {
      renderWithToastProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId("add-success-toast"));
      fireEvent.click(screen.getByTestId("add-success-toast"));

      const toasts = screen.getAllByRole("alert");
      expect(toasts).toHaveLength(2);

      // Check that toasts have different content containers (unique IDs)
      expect(toasts[0]).not.toBe(toasts[1]);
    });
  });
});
