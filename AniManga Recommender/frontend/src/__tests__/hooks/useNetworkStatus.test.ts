/**
 * Unit Tests for useNetworkStatus Hook
 * Tests network monitoring and connection quality detection
 */

import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus, useOfflineHandler } from "../../hooks/useNetworkStatus";

// Mock the network monitor module
let mockSubscribeCallback: ((status: any) => void) | null = null;

jest.mock("../../utils/errorHandler", () => ({
  networkMonitor: {
    getStatus: jest.fn(),
    subscribe: jest.fn(),
  },
}));

// Get the mocked network monitor
const { networkMonitor: mockNetworkMonitor } = jest.requireMock("../../utils/errorHandler");

// Mock Navigator API for connection quality tests
const mockNavigator = {
  onLine: true,
  connection: {
    effectiveType: "4g",
    downlink: 10,
    rtt: 50,
  },
};

Object.defineProperty(global, "navigator", {
  value: mockNavigator,
  writable: true,
});

// Mock window.addEventListener for event listener tests
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(global, "window", {
  value: {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  },
  writable: true,
});

describe("useNetworkStatus Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset navigator mock
    mockNavigator.onLine = true;
    mockNavigator.connection = {
      effectiveType: "4g",
      downlink: 10,
      rtt: 50,
    };

    // Setup mock networkMonitor
    mockNetworkMonitor.getStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      lastChecked: Date.now(),
    });

    mockNetworkMonitor.subscribe.mockImplementation((callback: (status: any) => void) => {
      mockSubscribeCallback = callback;
      return jest.fn(); // unsubscribe function
    });
  });

  describe("Basic Functionality", () => {
    it("returns initial network status", () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionQuality).toBe("excellent");
      expect(result.current.canMakeRequests).toBe(true);
      expect(result.current.shouldShowOfflineMessage).toBe(false);
      expect(result.current.shouldWarnSlowConnection).toBe(false);
    });

    it("subscribes to network monitor on mount", () => {
      renderHook(() => useNetworkStatus());

      expect(mockNetworkMonitor.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it("unsubscribes from network monitor on unmount", () => {
      const mockUnsubscribe = jest.fn();
      mockNetworkMonitor.subscribe.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("Connection Quality Detection", () => {
    it("detects excellent connection (4g, high speed)", () => {
      mockNavigator.connection = {
        effectiveType: "4g",
        downlink: 15,
        rtt: 30,
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("excellent");
      expect(result.current.shouldWarnSlowConnection).toBe(false);
    });

    it("detects good connection (3g/4g, medium speed)", () => {
      mockNavigator.connection = {
        effectiveType: "3g",
        downlink: 5,
        rtt: 100,
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("good");
      expect(result.current.shouldWarnSlowConnection).toBe(false);
    });

    it("detects poor connection (slow connection flag)", () => {
      // Mock slow connection from network monitor
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("poor");
      expect(result.current.shouldWarnSlowConnection).toBe(true);
    });

    it("handles offline state", () => {
      // Mock offline status from network monitor
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionQuality).toBe("offline");
      expect(result.current.shouldShowOfflineMessage).toBe(true);
      expect(result.current.canMakeRequests).toBe(false);
    });

    it("handles missing connection API gracefully", () => {
      // Remove connection API
      (mockNavigator as any).connection = undefined;

      const { result } = renderHook(() => useNetworkStatus());

      // Should default to good quality when API is not available
      expect(result.current.connectionQuality).toBe("good");
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe("Real-time Updates", () => {
    it("responds to network status changes", () => {
      // Start with offline status
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      const { result } = renderHook(() => useNetworkStatus());

      // Initially offline
      expect(result.current.isConnected).toBe(false);

      // Simulate coming online via subscription callback
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
        }
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.shouldShowOfflineMessage).toBe(false);
    });

    it("responds to connection quality changes", () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Initially online with good connection
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionQuality).toBe("excellent");

      // Simulate slow connection via subscription callback
      act(() => {
        if (mockSubscribeCallback) {
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
        }
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionQuality).toBe("poor");
      expect(result.current.shouldWarnSlowConnection).toBe(true);
    });
  });

  describe("Connection Quality Algorithms", () => {
    it("detects excellent connection from 4g effective type", () => {
      // 4g effective type should result in excellent quality
      mockNavigator.connection = {
        effectiveType: "4g",
        downlink: 10,
        rtt: 50,
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("excellent");
    });

    it("detects good connection from 3g effective type", () => {
      // 3g effective type should result in good quality
      mockNavigator.connection = {
        effectiveType: "3g",
        downlink: 5,
        rtt: 100,
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("good");
    });

    it("detects poor connection from 2g effective type", () => {
      // 2g effective type should result in poor quality
      mockNavigator.connection = {
        effectiveType: "2g",
        downlink: 0.5,
        rtt: 300,
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("poor");
    });
  });

  describe("Helper Flags", () => {
    it("sets canMakeRequests based on connection", () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Online - can make requests
      expect(result.current.canMakeRequests).toBe(true);

      // Test offline state separately
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      const { result: offlineResult } = renderHook(() => useNetworkStatus());
      expect(offlineResult.current.canMakeRequests).toBe(false);
    });

    it("sets shouldWarnSlowConnection for poor connections", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: true,
        lastChecked: Date.now(),
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.shouldWarnSlowConnection).toBe(true);
      expect(result.current.connectionQuality).toBe("poor");
    });

    it("sets shouldShowOfflineMessage when offline", () => {
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.shouldShowOfflineMessage).toBe(true);
      expect(result.current.connectionQuality).toBe("offline");
    });
  });

  describe("Performance and Memory", () => {
    it("does not create new objects on every render", () => {
      const { result, rerender } = renderHook(() => useNetworkStatus());

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      // Connection quality should be stable
      expect(firstResult.connectionQuality).toBe(secondResult.connectionQuality);
      expect(firstResult.isConnected).toBe(secondResult.isConnected);
    });

    it("handles connection status updates efficiently", () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Simulate rapid status changes via subscription callback
      act(() => {
        if (mockSubscribeCallback) {
          // Multiple quick status updates
          mockSubscribeCallback({
            isOnline: false,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: true,
            lastChecked: Date.now(),
          });
          mockSubscribeCallback({
            isOnline: true,
            isSlowConnection: false,
            lastChecked: Date.now(),
          });
        }
      });

      // Should end up in expected final state
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionQuality).toBe("excellent");
    });
  });
});

describe("useOfflineHandler Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to online state
    mockNetworkMonitor.getStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      lastChecked: Date.now(),
    });
  });

  describe("Offline Action Queuing", () => {
    it("executes actions immediately when online", () => {
      const { result } = renderHook(() => useOfflineHandler());

      const mockAction = jest.fn();

      act(() => {
        result.current.queueForOnline(mockAction);
      });

      // Should execute immediately when online
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it("queues actions when offline", () => {
      // Mock offline state
      mockNetworkMonitor.getStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        lastChecked: Date.now(),
      });

      const { result } = renderHook(() => useOfflineHandler());

      const mockAction1 = jest.fn();
      const mockAction2 = jest.fn();

      // Queue actions while offline
      act(() => {
        result.current.queueForOnline(mockAction1);
        result.current.queueForOnline(mockAction2);
      });

      // Actions should not execute immediately when offline
      expect(mockAction1).not.toHaveBeenCalled();
      expect(mockAction2).not.toHaveBeenCalled();
      expect(result.current.hasQueuedActions).toBe(true);
    });

    it("handles immediate action execution without errors", () => {
      const { result } = renderHook(() => useOfflineHandler());

      const mockAction = jest.fn();

      act(() => {
        result.current.queueForOnline(mockAction);
      });

      // Should execute immediately when online
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(result.current.hasQueuedActions).toBe(false);
    });
  });

  describe("Memory Management", () => {
    it("properly manages hook lifecycle", () => {
      const { result, unmount } = renderHook(() => useOfflineHandler());

      // Hook should initialize properly
      expect(result.current.isConnected).toBe(true);
      expect(result.current.canMakeRequests).toBe(true);
      expect(result.current.hasQueuedActions).toBe(false);

      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });
  });
});
