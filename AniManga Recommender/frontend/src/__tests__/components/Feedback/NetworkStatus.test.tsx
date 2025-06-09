/**
 * Unit Tests for NetworkStatus Component
 * Tests real-time network monitoring and status updates
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import NetworkStatus from "../../../components/Feedback/NetworkStatus";

// Mock the network monitor
let mockSubscribeCallback: ((status: any) => void) | null = null;

// Mock toast hook
const mockAddToast = jest.fn();
jest.mock("../../../components/Feedback/ToastProvider", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

// Mock the error handler module
jest.mock("../../../utils/errorHandler", () => ({
  networkMonitor: {
    getStatus: jest.fn(),
    subscribe: jest.fn(),
  },
}));

// Get the mocked network monitor
const { networkMonitor: mockNetworkMonitor } = jest.requireMock("../../../utils/errorHandler");

describe("NetworkStatus Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default online status
    mockNetworkMonitor.getStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      lastChecked: Date.now(),
    });

    // Setup mock subscribe
    mockNetworkMonitor.subscribe.mockImplementation((callback: (status: any) => void) => {
      mockSubscribeCallback = callback;
      return jest.fn(); // unsubscribe function
    });
  });

  describe("Online Status", () => {
    it("does not show notification when connection is good", () => {
      render(<NetworkStatus />);

      // Component should not render anything when online and not showing online status
      expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/slow connection/i)).not.toBeInTheDocument();
    });

    it("shows warning for poor connection", () => {
      // Mock a slow connection
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the slow connection status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
        }
      });

      expect(screen.getByText(/slow connection detected/i)).toBeInTheDocument();
      expect(screen.getByText(/loading may take longer/i)).toBeInTheDocument();
    });

    it("shows dismiss button for slow connections", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the slow connection status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
        }
      });

      const dismissButton = screen.getByLabelText(/dismiss slow connection warning/i);
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe("Offline Status", () => {
    it("shows offline notification when disconnected", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the offline status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: false,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
        }
      });

      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
      expect(screen.getByText(/please check your internet connection/i)).toBeInTheDocument();
    });

    it("shows retry button when offline", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the offline status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: false,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
        }
      });

      const retryButton = screen.getByLabelText(/retry connection/i);
      expect(retryButton).toBeInTheDocument();
    });

    it("triggers page reload when retry button is clicked", async () => {
      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, "location", {
        value: { reload: mockReload },
        writable: true,
      });

      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the offline status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: false,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
        }
      });

      const retryButton = screen.getByLabelText(/retry connection/i);
      fireEvent.click(retryButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe("Connection Quality Indicators", () => {
    it("shows no indicators when connection is good", () => {
      render(<NetworkStatus />);

      // Should not show any banners for good connection
      expect(screen.queryByText(/slow connection detected/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
    });

    it("shows slow connection icon for poor connection", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the slow connection status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
        }
      });

      // Check for the slow connection icon (🐌)
      expect(screen.getByText("🐌")).toBeInTheDocument();
    });

    it("shows offline icon when disconnected", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the offline status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: false,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
        }
      });

      // Check for the offline icon (📡)
      expect(screen.getByText("📡")).toBeInTheDocument();
    });
  });

  describe("Auto-dismiss Functionality", () => {
    it("auto-dismisses slow connection notification after delay", async () => {
      jest.useFakeTimers();

      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the slow connection status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
        }
      });

      expect(screen.getByText(/slow connection detected/i)).toBeInTheDocument();

      // Fast-forward time to trigger auto-dismiss
      act(() => {
        jest.advanceTimersByTime(10000); // Auto-dismiss after 10 seconds
      });

      await waitFor(() => {
        expect(screen.queryByText(/slow connection detected/i)).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it("does not auto-dismiss offline notifications", async () => {
      jest.useFakeTimers();

      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the offline status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: false,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
        }
      });

      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      // Should still be visible
      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe("Manual Dismiss", () => {
    it("shows dismiss button for slow connection warnings", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the slow connection status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
        }
      });

      const dismissButton = screen.getByLabelText(/dismiss slow connection warning/i);
      expect(dismissButton).toBeInTheDocument();
    });

    it("hides notification when dismiss button is clicked", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the slow connection status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
        }
      });

      const dismissButton = screen.getByLabelText(/dismiss slow connection warning/i);
      fireEvent.click(dismissButton);

      expect(screen.queryByText(/slow connection detected/i)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes for offline alert", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the offline status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: false,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
        }
      });

      const notification = screen.getByRole("alert");
      expect(notification).toHaveAttribute("aria-live", "assertive");
    });

    it("has proper ARIA attributes for slow connection status", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the slow connection status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
        }
      });

      const notification = screen.getByRole("status");
      expect(notification).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Visual Design", () => {
    it("applies appropriate CSS classes for slow connection", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the slow connection status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
        }
      });

      const banner = document.querySelector(".network-status__banner--slow");
      expect(banner).toBeInTheDocument();
    });

    it("applies appropriate CSS classes for offline state", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      render(<NetworkStatus />);

      // Trigger the offline status
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: false,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
        }
      });

      const banner = document.querySelector(".network-status__banner--offline");
      expect(banner).toBeInTheDocument();
    });
  });
});
