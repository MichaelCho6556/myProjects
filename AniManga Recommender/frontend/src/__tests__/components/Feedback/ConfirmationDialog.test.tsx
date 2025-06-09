/**
 * Unit Tests for ConfirmationDialog Component
 * Tests confirmation dialogs for critical user actions
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConfirmationDialog from "../../../components/Feedback/ConfirmationDialog";

describe("ConfirmationDialog Component", () => {
  const defaultProps = {
    isOpen: true,
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders when open", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Confirm Action")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<ConfirmationDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders with custom button text", () => {
      render(<ConfirmationDialog {...defaultProps} confirmText="Delete" cancelText="Keep" />);

      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
    });

    it("applies variant styling", () => {
      const { rerender } = render(<ConfirmationDialog {...defaultProps} variant="danger" />);

      expect(screen.getByRole("dialog")).toHaveClass("confirmation-danger");
      expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass("btn-danger");

      rerender(<ConfirmationDialog {...defaultProps} variant="warning" />);

      expect(screen.getByRole("dialog")).toHaveClass("confirmation-warning");
      expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass("btn-warning");
    });

    it("applies custom className", () => {
      render(<ConfirmationDialog {...defaultProps} className="custom-dialog" />);

      expect(screen.getByRole("dialog")).toHaveClass("custom-dialog");
    });
  });

  describe("User Interactions", () => {
    it("calls onConfirm when confirm button is clicked", () => {
      const mockOnConfirm = jest.fn();
      render(<ConfirmationDialog {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when cancel button is clicked", () => {
      const mockOnCancel = jest.fn();
      render(<ConfirmationDialog {...defaultProps} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when overlay is clicked", () => {
      const mockOnCancel = jest.fn();
      render(<ConfirmationDialog {...defaultProps} onCancel={mockOnCancel} />);

      // Click the overlay (outside the dialog content)
      const overlay = screen.getByRole("dialog").parentElement;
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
      }
    });

    it("does not call onCancel when dialog content is clicked", () => {
      const mockOnCancel = jest.fn();
      render(<ConfirmationDialog {...defaultProps} onCancel={mockOnCancel} />);

      // Click inside the dialog content
      const dialog = screen.getByRole("dialog");
      fireEvent.click(dialog);

      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Navigation", () => {
    it("closes dialog when Escape key is pressed", async () => {
      const mockOnCancel = jest.fn();
      render(<ConfirmationDialog {...defaultProps} onCancel={mockOnCancel} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("confirms dialog when Enter key is pressed", async () => {
      const mockOnConfirm = jest.fn();
      render(<ConfirmationDialog {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.keyDown(document, { key: "Enter" });

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it("traps focus within dialog", async () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      const confirmButton = screen.getByRole("button", { name: "Confirm" });

      // Confirm button should be focused initially
      expect(confirmButton).toHaveFocus();

      // Simulate Tab navigation
      fireEvent.keyDown(confirmButton, { key: "Tab" });
      expect(cancelButton).toHaveFocus();

      // Tab again should wrap back to confirm button
      fireEvent.keyDown(cancelButton, { key: "Tab" });
      expect(confirmButton).toHaveFocus();

      // Shift+Tab should go back to cancel button
      fireEvent.keyDown(confirmButton, { key: "Tab", shiftKey: true });
      expect(cancelButton).toHaveFocus();
    });

    it("focuses confirm button when dialog opens", () => {
      const { rerender } = render(<ConfirmationDialog {...defaultProps} isOpen={false} />);

      rerender(<ConfirmationDialog {...defaultProps} isOpen={true} />);

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      expect(confirmButton).toHaveFocus();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "confirmation-title");
      expect(dialog).toHaveAttribute("aria-describedby", "confirmation-message");
    });

    it("has proper heading structure", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("Confirm Action");
      expect(heading).toHaveAttribute("id", "confirmation-title");
    });

    it("has descriptive message element", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const message = screen.getByText("Are you sure you want to proceed?");
      expect(message).toHaveAttribute("id", "confirmation-message");
    });

    it("provides screen reader context", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      // Dialog should be announced to screen readers
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Title and message should be linked via ARIA
      expect(dialog).toHaveAttribute("aria-labelledby", "confirmation-title");
      expect(dialog).toHaveAttribute("aria-describedby", "confirmation-message");
    });
  });

  describe("Icon Display", () => {
    it("shows appropriate icon for danger variant", () => {
      render(<ConfirmationDialog {...defaultProps} variant="danger" />);

      const icon = screen.getByTestId("confirmation-icon");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent("⚠️");
    });

    it("shows appropriate icon for warning variant", () => {
      render(<ConfirmationDialog {...defaultProps} variant="warning" />);

      const icon = screen.getByTestId("confirmation-icon");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent("⚠️");
    });

    it("shows appropriate icon for info variant", () => {
      render(<ConfirmationDialog {...defaultProps} variant="info" />);

      const icon = screen.getByTestId("confirmation-icon");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent("ℹ️");
    });
  });

  describe("Dialog Management", () => {
    it("cleans up event listeners when closed", () => {
      const { rerender } = render(<ConfirmationDialog {...defaultProps} />);

      const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

      rerender(<ConfirmationDialog {...defaultProps} isOpen={false} />);

      expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it("cleans up event listeners when unmounted", () => {
      const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

      const { unmount } = render(<ConfirmationDialog {...defaultProps} />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it("does not add event listeners when closed", () => {
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");

      render(<ConfirmationDialog {...defaultProps} isOpen={false} />);

      expect(addEventListenerSpy).not.toHaveBeenCalledWith("keydown", expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });

  describe("Visual States", () => {
    it("applies correct button styling", () => {
      render(<ConfirmationDialog {...defaultProps} variant="danger" />);

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      const cancelButton = screen.getByRole("button", { name: "Cancel" });

      expect(confirmButton).toHaveClass("btn-danger");
      expect(cancelButton).toHaveClass("btn-secondary");
    });

    it("maintains consistent dialog structure", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      // Check for main structural elements
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Confirm Action")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles missing onConfirm gracefully", () => {
      render(<ConfirmationDialog {...defaultProps} onConfirm={undefined as any} />);

      expect(() => {
        fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      }).not.toThrow();
    });

    it("handles missing onCancel gracefully", () => {
      render(<ConfirmationDialog {...defaultProps} onCancel={undefined as any} />);

      expect(() => {
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      }).not.toThrow();
    });

    it("handles very long messages", () => {
      const longMessage = "A".repeat(1000);

      render(<ConfirmationDialog {...defaultProps} message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("handles special characters in title and message", () => {
      const specialTitle = "Title with <script>alert('xss')</script>";
      const specialMessage = "Message with & < > \" ' symbols";

      render(<ConfirmationDialog {...defaultProps} title={specialTitle} message={specialMessage} />);

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });
});
