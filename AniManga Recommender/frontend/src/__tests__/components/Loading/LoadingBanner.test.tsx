/**
 * Unit Tests for LoadingBanner Component
 * Tests professional loading banner with network awareness
 */

import { render, screen } from "@testing-library/react";
import LoadingBanner from "../../../components/Loading/LoadingBanner";

// Mock the network status hook
jest.mock("../../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: jest.fn(() => ({
    isOnline: true,
    connectionQuality: "excellent",
    isSlowConnection: false,
  })),
}));

describe("LoadingBanner Component", () => {
  describe("Basic Rendering", () => {
    it("renders loading banner when visible", () => {
      render(<LoadingBanner message="Loading items..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass("loading-banner", "visible");
    });

    it("hides loading banner when not visible", () => {
      render(<LoadingBanner message="Loading items..." isVisible={false} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("loading-banner", "hidden");
    });

    it("displays provided loading message", () => {
      const message = "Loading your recommendations...";
      render(<LoadingBanner message={message} isVisible={true} />);

      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it("shows loading spinner when visible", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const spinner = screen.getByTestId("loading-spinner");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass("loading-spinner");
    });
  });

  describe("Network Awareness", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("shows slow connection warning when connection is slow", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
      });

      render(<LoadingBanner message="Loading..." isVisible={true} />);

      expect(screen.getByText(/slow connection detected/i)).toBeInTheDocument();
      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("slow-connection");
    });

    it("applies network-specific styling for poor connection", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
      });

      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("network-poor");
    });

    it("shows normal loading for excellent connection", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "excellent",
        isSlowConnection: false,
      });

      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).not.toHaveClass("slow-connection", "network-poor");
      expect(screen.queryByText(/slow connection/i)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveAttribute("aria-live", "polite");
    });

    it("announces loading state to screen readers", () => {
      render(<LoadingBanner message="Loading content" isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveTextContent("Loading content");
    });

    it("is hidden from screen readers when not visible", () => {
      render(<LoadingBanner message="Loading..." isVisible={false} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Animation and Styling", () => {
    it("applies professional loading animations", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const spinner = screen.getByTestId("loading-spinner");
      expect(spinner).toHaveClass("professional-spinner");
    });

    it("has smooth transition classes", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("smooth-transition");
    });

    it("applies gradient background styling", () => {
      render(<LoadingBanner message="Loading..." isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("gradient-background");
    });
  });

  describe("Props Validation", () => {
    it("handles empty message gracefully", () => {
      render(<LoadingBanner message="" isVisible={true} />);

      const banner = screen.getByRole("status");
      expect(banner).toBeInTheDocument();
    });

    it("handles long messages without breaking layout", () => {
      const longMessage =
        "This is a very long loading message that should not break the layout and should be displayed properly";
      render(<LoadingBanner message={longMessage} isVisible={true} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("toggles visibility correctly", () => {
      const { rerender } = render(<LoadingBanner message="Loading..." isVisible={false} />);

      expect(screen.getByRole("status")).toHaveClass("hidden");

      rerender(<LoadingBanner message="Loading..." isVisible={true} />);
      expect(screen.getByRole("status")).toHaveClass("visible");
    });
  });
});
