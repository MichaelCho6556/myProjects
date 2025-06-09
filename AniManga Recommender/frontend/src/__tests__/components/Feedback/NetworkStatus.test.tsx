/**
 * Unit Tests for NetworkStatus Component
 * Tests real-time network monitoring and status updates
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import NetworkStatus from "../../../components/Feedback/NetworkStatus";

// Mock the network status hook
const mockNetworkStatus = {
  isOnline: true,
  connectionQuality: "excellent",
  isSlowConnection: false,
  speed: 10.5,
};

jest.mock("../../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: jest.fn(() => mockNetworkStatus),
}));

// Mock toast hook
const mockAddToast = jest.fn();
jest.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

describe("NetworkStatus Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Online Status", () => {
    it("does not show notification when connection is excellent", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "excellent",
        isSlowConnection: false,
        speed: 10.5,
      });

      render(<NetworkStatus />);

      expect(screen.queryByTestId("network-status")).not.toBeInTheDocument();
    });

    it("shows warning for poor connection", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        speed: 0.5,
      });

      render(<NetworkStatus />);

      const notification = screen.getByTestId("network-status");
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveClass("warning");
      expect(screen.getByText(/slow connection/i)).toBeInTheDocument();
    });

    it("shows speed information for slow connections", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        speed: 0.8,
      });

      render(<NetworkStatus />);

      expect(screen.getByText(/0.8 Mbps/i)).toBeInTheDocument();
    });
  });

  describe("Offline Status", () => {
    it("shows offline notification when disconnected", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionQuality: "offline",
        isSlowConnection: false,
        speed: 0,
      });

      render(<NetworkStatus />);

      const notification = screen.getByTestId("network-status");
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveClass("offline");
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });

    it("shows retry button when offline", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionQuality: "offline",
        isSlowConnection: false,
        speed: 0,
      });

      render(<NetworkStatus />);

      const retryButton = screen.getByRole("button", { name: /check connection/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("triggers connection check when retry button is clicked", async () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionQuality: "offline",
        isSlowConnection: false,
        speed: 0,
      });

      render(<NetworkStatus />);

      const retryButton = screen.getByRole("button", { name: /check connection/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: "info",
          title: "Checking Connection",
          message: "Testing network connectivity...",
        });
      });
    });
  });

  describe("Connection Quality Indicators", () => {
    it("shows appropriate icon for excellent connection", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "excellent",
        isSlowConnection: false,
        speed: 15.0,
      });

      render(<NetworkStatus />);

      // Should not show notification for excellent connection
      expect(screen.queryByTestId("network-status")).not.toBeInTheDocument();
    });

    it("shows warning icon for poor connection", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        speed: 0.3,
      });

      render(<NetworkStatus />);

      const warningIcon = screen.getByTestId("warning-icon");
      expect(warningIcon).toBeInTheDocument();
      expect(warningIcon).toHaveClass("icon-warning");
    });

    it("shows offline icon when disconnected", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionQuality: "offline",
        isSlowConnection: false,
        speed: 0,
      });

      render(<NetworkStatus />);

      const offlineIcon = screen.getByTestId("offline-icon");
      expect(offlineIcon).toBeInTheDocument();
      expect(offlineIcon).toHaveClass("icon-offline");
    });
  });

  describe("Auto-dismiss Functionality", () => {
    it("auto-dismisses poor connection notification after delay", async () => {
      jest.useFakeTimers();

      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        speed: 0.5,
      });

      render(<NetworkStatus />);

      expect(screen.getByTestId("network-status")).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(8000); // Auto-dismiss after 8 seconds
      });

      await waitFor(() => {
        expect(screen.queryByTestId("network-status")).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it("does not auto-dismiss offline notifications", async () => {
      jest.useFakeTimers();

      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionQuality: "offline",
        isSlowConnection: false,
        speed: 0,
      });

      render(<NetworkStatus />);

      expect(screen.getByTestId("network-status")).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should still be visible
      expect(screen.getByTestId("network-status")).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe("Manual Dismiss", () => {
    it("shows dismiss button for warning notifications", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        speed: 0.4,
      });

      render(<NetworkStatus />);

      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it("hides notification when dismiss button is clicked", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        speed: 0.4,
      });

      render(<NetworkStatus />);

      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId("network-status")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionQuality: "offline",
        isSlowConnection: false,
        speed: 0,
      });

      render(<NetworkStatus />);

      const notification = screen.getByRole("alert");
      expect(notification).toHaveAttribute("aria-live", "assertive");
      expect(notification).toHaveAttribute("aria-atomic", "true");
    });

    it("has descriptive labels for screen readers", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        speed: 0.3,
      });

      render(<NetworkStatus />);

      const notification = screen.getByLabelText(/network status warning/i);
      expect(notification).toBeInTheDocument();
    });

    it("announces status changes to screen readers", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      const { rerender } = render(<NetworkStatus />);

      // Initially online
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "excellent",
        isSlowConnection: false,
        speed: 10.0,
      });
      rerender(<NetworkStatus />);

      // Goes offline
      useNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionQuality: "offline",
        isSlowConnection: false,
        speed: 0,
      });
      rerender(<NetworkStatus />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });
  });

  describe("Visual Design", () => {
    it("applies appropriate styling for warning state", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        speed: 0.5,
      });

      render(<NetworkStatus />);

      const notification = screen.getByTestId("network-status");
      expect(notification).toHaveClass("network-warning");
    });

    it("applies appropriate styling for offline state", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionQuality: "offline",
        isSlowConnection: false,
        speed: 0,
      });

      render(<NetworkStatus />);

      const notification = screen.getByTestId("network-status");
      expect(notification).toHaveClass("network-offline");
    });

    it("has smooth animation transitions", () => {
      const { useNetworkStatus } = require("../../../hooks/useNetworkStatus");
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionQuality: "poor",
        isSlowConnection: true,
        speed: 0.5,
      });

      render(<NetworkStatus />);

      const notification = screen.getByTestId("network-status");
      expect(notification).toHaveClass("smooth-transition");
    });
  });
});
