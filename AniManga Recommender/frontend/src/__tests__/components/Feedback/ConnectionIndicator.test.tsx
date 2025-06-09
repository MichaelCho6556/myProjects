/**
 * Unit Tests for ConnectionIndicator Component
 * Tests visual connection quality indicator with signal bars
 */

import { render, screen } from "@testing-library/react";
import ConnectionIndicator from "../../../components/Feedback/ConnectionIndicator";

// Mock the network status hook
const mockNetworkStatus = {
  isConnected: true,
  connectionQuality: "excellent",
  shouldShowOfflineMessage: false,
  shouldWarnSlowConnection: false,
};

jest.mock("../../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: jest.fn(() => mockNetworkStatus),
}));

describe("ConnectionIndicator Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders with default props", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const indicator = screen.getByTestId("connection-indicator");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("connection-indicator--top-right");
    });

    it("applies position classes correctly", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      const { rerender } = render(<ConnectionIndicator position="top-left" />);
      let indicator = screen.getByTestId("connection-indicator");
      expect(indicator).toHaveClass("connection-indicator--top-left");

      rerender(<ConnectionIndicator position="bottom-right" />);
      indicator = screen.getByTestId("connection-indicator");
      expect(indicator).toHaveClass("connection-indicator--bottom-right");

      rerender(<ConnectionIndicator position="bottom-left" />);
      indicator = screen.getByTestId("connection-indicator");
      expect(indicator).toHaveClass("connection-indicator--bottom-left");
    });

    it("applies custom className", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator className="custom-indicator" />);

      const indicator = screen.getByTestId("connection-indicator");
      expect(indicator).toHaveClass("custom-indicator");
    });
  });

  describe("Connection Quality Display", () => {
    it("shows 4 signal bars for excellent connection", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "excellent",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const signalBars = screen.getAllByTestId("signal-bar");
      expect(signalBars).toHaveLength(4);

      // All bars should be active for excellent connection
      signalBars.forEach((bar) => {
        expect(bar).toHaveClass("connection-indicator__bar--active");
      });
    });

    it("shows 3 signal bars for good connection", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const signalBars = screen.getAllByTestId("signal-bar");
      expect(signalBars).toHaveLength(4);

      // First 3 bars should be active
      expect(signalBars[0]).toHaveClass("connection-indicator__bar--active");
      expect(signalBars[1]).toHaveClass("connection-indicator__bar--active");
      expect(signalBars[2]).toHaveClass("connection-indicator__bar--active");
      expect(signalBars[3]).not.toHaveClass("connection-indicator__bar--active");
    });

    it("shows 1 signal bar for poor connection", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "poor",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: true,
      });

      render(<ConnectionIndicator />);

      const signalBars = screen.getAllByTestId("signal-bar");
      expect(signalBars).toHaveLength(4);

      // Only first bar should be active
      expect(signalBars[0]).toHaveClass("connection-indicator__bar--active");
      expect(signalBars[1]).not.toHaveClass("connection-indicator__bar--active");
      expect(signalBars[2]).not.toHaveClass("connection-indicator__bar--active");
      expect(signalBars[3]).not.toHaveClass("connection-indicator__bar--active");
    });

    it("shows no active bars for offline connection", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "offline",
        isConnected: false,
        shouldShowOfflineMessage: true,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const signalBars = screen.getAllByTestId("signal-bar");
      expect(signalBars).toHaveLength(4);

      // No bars should be active
      signalBars.forEach((bar) => {
        expect(bar).not.toHaveClass("connection-indicator__bar--active");
      });
    });
  });

  describe("Status Text Display", () => {
    it("shows text when enabled", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "excellent",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator showText={true} />);

      expect(screen.getByText("Excellent")).toBeInTheDocument();
    });

    it("hides text when disabled", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "excellent",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator showText={false} />);

      expect(screen.queryByText("Excellent")).not.toBeInTheDocument();
    });

    it("shows correct status text for different qualities", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");

      const qualities = [
        { quality: "excellent", text: "Excellent" },
        { quality: "good", text: "Good" },
        { quality: "poor", text: "Poor" },
        { quality: "offline", text: "Offline" },
      ];

      qualities.forEach(({ quality, text }) => {
        useNetworkStatus.mockReturnValue({
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
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "excellent",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator showOnlyWhenPoor={true} />);

      expect(screen.queryByTestId("connection-indicator")).not.toBeInTheDocument();
    });

    it("shows indicator when connection is poor and showOnlyWhenPoor is true", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "poor",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: true,
      });

      render(<ConnectionIndicator showOnlyWhenPoor={true} />);

      expect(screen.getByTestId("connection-indicator")).toBeInTheDocument();
    });

    it("shows indicator when offline and showOnlyWhenPoor is true", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "offline",
        isConnected: false,
        shouldShowOfflineMessage: true,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator showOnlyWhenPoor={true} />);

      expect(screen.getByTestId("connection-indicator")).toBeInTheDocument();
    });

    it("always shows indicator when showOnlyWhenPoor is false", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");

      const qualities = ["excellent", "good", "poor", "offline"];

      qualities.forEach((quality) => {
        useNetworkStatus.mockReturnValue({
          connectionQuality: quality,
          isConnected: quality !== "offline",
          shouldShowOfflineMessage: quality === "offline",
          shouldWarnSlowConnection: quality === "poor",
        });

        const { rerender } = render(<ConnectionIndicator showOnlyWhenPoor={false} />);
        expect(screen.getByTestId("connection-indicator")).toBeInTheDocument();
        rerender(<></>);
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const indicator = screen.getByTestId("connection-indicator");
      expect(indicator).toHaveAttribute("role", "status");
      expect(indicator).toHaveAttribute("aria-label", "Network connection quality: Good");
    });

    it("updates ARIA label based on connection quality", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");

      const qualities = [
        { quality: "excellent", label: "Network connection quality: Excellent" },
        { quality: "good", label: "Network connection quality: Good" },
        { quality: "poor", label: "Network connection quality: Poor" },
        { quality: "offline", label: "Network connection quality: Offline" },
      ];

      qualities.forEach(({ quality, label }) => {
        useNetworkStatus.mockReturnValue({
          connectionQuality: quality,
          isConnected: quality !== "offline",
          shouldShowOfflineMessage: quality === "offline",
          shouldWarnSlowConnection: quality === "poor",
        });

        const { rerender } = render(<ConnectionIndicator />);
        const indicator = screen.getByTestId("connection-indicator");
        expect(indicator).toHaveAttribute("aria-label", label);
        rerender(<></>);
      });
    });

    it("provides accessible signal bar information", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        connectionQuality: "good",
        isConnected: true,
        shouldShowOfflineMessage: false,
        shouldWarnSlowConnection: false,
      });

      render(<ConnectionIndicator />);

      const signalBars = screen.getAllByTestId("signal-bar");
      signalBars.forEach((bar, index) => {
        expect(bar).toHaveAttribute("aria-hidden", "true");
      });
    });
  });
});
