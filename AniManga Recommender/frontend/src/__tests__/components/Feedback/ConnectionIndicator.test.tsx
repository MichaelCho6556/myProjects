/**
 * Unit Tests for ConnectionIndicator Component
 * Tests visual connection quality indicator with signal bars
 */

import { render, screen } from "@testing-library/react";
import ConnectionIndicator from "../../../components/Feedback/ConnectionIndicator";

// Mock the network status hook
jest.mock("../../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: jest.fn(),
}));

describe("ConnectionIndicator Component", () => {
  // Get the mocked function
  const mockUseNetworkStatus = jest.requireMock("../../../hooks/useNetworkStatus").useNetworkStatus;

  beforeEach(() => {
    // Reset mock to default state
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      connectionQuality: "good",
      shouldShowOfflineMessage: false,
      shouldWarnSlowConnection: false,
    });
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders with default props", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const indicator = screen.getByRole("status");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("connection-indicator--top-right");
    });

    it("applies position classes correctly", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      const { rerender } = render(<ConnectionIndicator position="top-left" />);
      let indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("connection-indicator--top-left");

      rerender(<ConnectionIndicator position="bottom-right" />);
      indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("connection-indicator--bottom-right");

      rerender(<ConnectionIndicator position="bottom-left" />);
      indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("connection-indicator--bottom-left");
    });

    it("applies custom className", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator className="custom-indicator" />);

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("custom-indicator");
    });
  });

  describe("Connection Quality Display", () => {
    it("shows 4 signal bars for excellent connection", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "excellent",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const signalBars = document.querySelectorAll(".connection-indicator__bar");
      expect(signalBars).toHaveLength(4);

      // All bars should be active for excellent connection
      signalBars.forEach((bar) => {
        expect(bar).toHaveClass("connection-indicator__bar--active");
      });
    });

    it("shows 3 signal bars for good connection", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const signalBars = document.querySelectorAll(".connection-indicator__bar");
      expect(signalBars).toHaveLength(4);

      // First 3 bars should be active
      expect(signalBars[0]).toHaveClass("connection-indicator__bar--active");
      expect(signalBars[1]).toHaveClass("connection-indicator__bar--active");
      expect(signalBars[2]).toHaveClass("connection-indicator__bar--active");
      expect(signalBars[3]).not.toHaveClass("connection-indicator__bar--active");
    });

    it("shows 1 signal bar for poor connection", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "poor",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: true,
      });

      render(<ConnectionIndicator />);

      const signalBars = document.querySelectorAll(".connection-indicator__bar");
      expect(signalBars).toHaveLength(4);

      // Only first bar should be active
      expect(signalBars[0]).toHaveClass("connection-indicator__bar--active");
      expect(signalBars[1]).not.toHaveClass("connection-indicator__bar--active");
      expect(signalBars[2]).not.toHaveClass("connection-indicator__bar--active");
      expect(signalBars[3]).not.toHaveClass("connection-indicator__bar--active");
    });

    it("shows no active bars for offline connection", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "offline",
        isConnected: false,
        shouldShowOfflineMessage: true,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const signalBars = document.querySelectorAll(".connection-indicator__bar");
      expect(signalBars).toHaveLength(4);

      // No bars should be active
      signalBars.forEach((bar) => {
        expect(bar).not.toHaveClass("connection-indicator__bar--active");
      });
    });
  });

  describe("Status Text Display", () => {
    it("shows text when enabled", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "excellent",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator showText={true} />);

      expect(screen.getByText("Excellent")).toBeInTheDocument();
    });

    it("hides text when disabled", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "excellent",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator showText={false} />);

      expect(screen.queryByText("Excellent")).not.toBeInTheDocument();
    });

    it("shows correct status text for different qualities", () => {
      const qualities = [
        { quality: "excellent", text: "Excellent" },
        { quality: "good", text: "Good" },
        { quality: "poor", text: "Poor" },
        { quality: "offline", text: "Offline" },
      ];

      qualities.forEach(({ quality, text }) => {
        mockUseNetworkStatus.mockReturnValue({
          connectionQuality: quality,
          isConnected: quality !== "offline",
          shouldShowOfflineMessage: quality === "offline",
          shouldWarnSlowConnection: quality === "poor",
        });

        const { rerender } = render(<ConnectionIndicator showText={true} />);
        expect(screen.getByText(text)).toBeInTheDocument();
        rerender(<></>);
      });
    });
  });

  describe("Conditional Rendering", () => {
    it("hides indicator when connection is excellent and showOnlyWhenPoor is true", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "excellent",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator showOnlyWhenPoor={true} />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("shows indicator when connection is poor and showOnlyWhenPoor is true", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "poor",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: true,
      });

      render(<ConnectionIndicator showOnlyWhenPoor={true} />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("shows indicator when offline and showOnlyWhenPoor is true", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "offline",
        isConnected: false,
        shouldShowOfflineMessage: true,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator showOnlyWhenPoor={true} />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("always shows indicator when showOnlyWhenPoor is false", () => {
      const qualities = ["excellent", "good", "poor", "offline"];

      qualities.forEach((quality) => {
        mockUseNetworkStatus.mockReturnValue({
          connectionQuality: quality,
          isConnected: quality !== "offline",
          shouldShowOfflineMessage: quality === "offline",
          shouldWarnSlowConnection: quality === "poor",
        });

        const { rerender } = render(<ConnectionIndicator showOnlyWhenPoor={false} />);
        expect(screen.getByRole("status")).toBeInTheDocument();
        rerender(<></>);
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("role", "status");
      expect(indicator).toHaveAttribute("aria-label", "Connection status: Good");
    });

    it("updates ARIA label based on connection quality", () => {
      const qualities = [
        { quality: "excellent", label: "Connection status: Excellent" },
        { quality: "good", label: "Connection status: Good" },
        { quality: "poor", label: "Connection status: Poor" },
        { quality: "offline", label: "Connection status: Offline" },
      ];

      qualities.forEach(({ quality, label }) => {
        mockUseNetworkStatus.mockReturnValue({
          connectionQuality: quality,
          isConnected: quality !== "offline",
          shouldShowOfflineMessage: quality === "offline",
          shouldWarnSlowConnection: quality === "poor",
        });

        const { rerender } = render(<ConnectionIndicator />);
        const indicator = screen.getByRole("status");
        expect(indicator).toHaveAttribute("aria-label", label);
        rerender(<></>);
      });
    });

    it("provides accessible signal bar information", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const signalContainer = document.querySelector(".connection-indicator__signal");
      expect(signalContainer).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Warning and Status Indicators", () => {
    it("shows warning icon for poor connection", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "poor",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: true,
      });

      render(<ConnectionIndicator />);

      const warningIcon = document.querySelector(".connection-indicator__warning");
      expect(warningIcon).toBeInTheDocument();
      expect(warningIcon).toHaveTextContent("⚠️");
      expect(warningIcon).toHaveAttribute("aria-label", "Slow connection warning");
    });

    it("shows offline icon when disconnected", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "offline",
        isConnected: false,
        shouldShowOfflineMessage: true,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const offlineIcon = document.querySelector(".connection-indicator__offline");
      expect(offlineIcon).toBeInTheDocument();
      expect(offlineIcon).toHaveTextContent("📵");
      expect(offlineIcon).toHaveAttribute("aria-label", "Offline indicator");
    });

    it("includes screen reader text for connection details", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "poor",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: true,
      });

      render(<ConnectionIndicator />);

      const srOnlyText = document.querySelector(".sr-only");
      expect(srOnlyText).toBeInTheDocument();
      expect(srOnlyText).toHaveTextContent("Connection quality: Poor. Warning: slow connection detected");
    });
  });

  describe("Signal Bar Styling", () => {
    it("applies correct colors for different connection qualities", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "excellent",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const activeBars = document.querySelectorAll(".connection-indicator__bar--active");
      activeBars.forEach((bar) => {
        expect(bar).toHaveStyle("background-color: rgb(16, 185, 129)"); // Green for excellent
      });
    });

    it("applies correct heights to signal bars", () => {
      mockUseNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const signalBars = document.querySelectorAll(".connection-indicator__bar");
      expect(signalBars[0]).toHaveStyle("height: 25%");
      expect(signalBars[1]).toHaveStyle("height: 50%");
      expect(signalBars[2]).toHaveStyle("height: 75%");
      expect(signalBars[3]).toHaveStyle("height: 100%");
    });
  });
});
