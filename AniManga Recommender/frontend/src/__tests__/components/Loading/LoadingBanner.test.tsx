/**
 * Unit Tests for LoadingBanner Component
 * Tests professional loading banner with network awareness
 */

import { render, screen } from "@testing-library/react";
import LoadingBanner from "../../../components/Loading/LoadingBanner";

// Mock the network status hook using factory function
jest.mock("../../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: jest.fn(),
}));

describe("LoadingBanner Component", () => {
  // Get the mocked function
  const mockUseNetworkStatus = jest.requireMock("../../../hooks/useNetworkStatus").useNetworkStatus;

  beforeEach(() => {
    // Reset mock to default state
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      connectionQuality: "excellent",
      isSlowConnection: false,
      shouldWarnSlowConnection: false,
    });
  });

  describe("Basic Rendering", () => {
    it("renders loading banner when visible", () => {
      render(<LoadingBanner message="Loading items..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass("loading-banner");
    });

    it("hides loading banner when not visible", () => {
      render(<LoadingBanner message="Loading items..." isVisible={false} />);

      // Component returns null when not visible
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("displays provided loading message", () => {
      const message = "Loading your related items...";
      render(<LoadingBanner message={message} isVisible={true} />);

      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it("shows loading spinner when visible", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const spinner = document.querySelector(".loading-spinner");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass("loading-spinner");
    });
  });

  describe("Network Awareness", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("shows slow connection warning when connection is slow", () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        shouldWarnSlowConnection: true,
      });

      render(<LoadingBanner message="Loading..." isVisible={true} />);

      expect(screen.getByText("Loading... (Slow connection detected)")).toBeInTheDocument();
      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("loading-banner--slow-connection");
    });

    it("displays slow connection warning icon", () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        shouldWarnSlowConnection: true,
      });

      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const warningIcon = document.querySelector(".loading-connection-warning");
      expect(warningIcon).toBeInTheDocument();
      expect(warningIcon).toHaveTextContent("🐌");
    });

    it("shows normal loading for excellent connection", () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "excellent",
        isSlowConnection: false,
        shouldWarnSlowConnection: false,
      });

      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).not.toHaveClass("loading-banner--slow-connection");
      expect(screen.queryByText(/slow connection detected/i)).not.toBeInTheDocument();
      expect(document.querySelector(".loading-connection-warning")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveAttribute("aria-live", "polite");
      expect(banner).toHaveAttribute("aria-label", "Loading...");
    });

    it("announces loading state to screen readers", () => {
      render(<LoadingBanner message="Loading content" isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveAttribute("aria-label", "Loading content");
    });

    it("has proper aria-hidden attributes for decorative elements", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const spinner = document.querySelector(".loading-spinner");
      expect(spinner).toHaveAttribute("aria-hidden", "true");
    });

    it("shows slow connection warning with proper accessibility", () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        shouldWarnSlowConnection: true,
      });

      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const warningIcon = document.querySelector(".loading-connection-warning");
      expect(warningIcon).toHaveAttribute("aria-hidden", "true");
      expect(warningIcon).toHaveAttribute("title", "Slow connection");
    });
  });

  describe("CSS Classes and Styling", () => {
    it("applies base loading banner class", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("loading-banner");
    });

    it("applies custom className when provided", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} className="custom-class" />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("loading-banner", "custom-class");
    });

    it("applies slow connection styling when needed", () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        shouldWarnSlowConnection: true,
      });

      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("loading-banner--slow-connection");
    });

    it("has proper content structure", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const content = document.querySelector(".loading-content");
      const spinner = document.querySelector(".loading-spinner");
      const text = document.querySelector(".loading-text");

      expect(content).toBeInTheDocument();
      expect(spinner).toBeInTheDocument();
      expect(text).toBeInTheDocument();
    });
  });

  describe("Props Validation", () => {
    it("handles empty message gracefully", () => {
      render(<LoadingBanner message="" isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute("aria-label", "");
    });

    it("handles long messages without breaking layout", () => {
      const longMessage =
        "This is a very long loading message that should not break the layout and should be displayed properly";
      render(<LoadingBanner message={longMessage} isVisible={true} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", longMessage);
    });

    it("toggles visibility correctly", () => {
      const { rerender } = render(<LoadingBanner message="Loading..." isVisible={false} />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();

      rerender(<LoadingBanner message="Loading..." isVisible={true} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("Message Formatting", () => {
    it("formats message with slow connection warning", () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        shouldWarnSlowConnection: true,
      });

      const baseMessage = "Loading your data";
      render(<LoadingBanner message={baseMessage} isVisible={true} />);

      const expectedMessage = `${baseMessage} (Slow connection detected)`;
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", expectedMessage);
    });

    it("keeps original message when connection is good", () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "excellent",
        isSlowConnection: false,
        shouldWarnSlowConnection: false,
      });

      const message = "Loading your data";
      render(<LoadingBanner message={message} isVisible={true} />);

      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", message);
      expect(screen.queryByText(/slow connection detected/i)).not.toBeInTheDocument();
    });
  });
});
