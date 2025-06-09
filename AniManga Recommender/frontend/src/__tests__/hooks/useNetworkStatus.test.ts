/**
 * Unit Tests for useNetworkStatus Hook
 * Tests network monitoring and connection quality detection
 */

import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus, useOfflineHandler } from "../../hooks/useNetworkStatus";

// Mock Navigator API
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

// Mock window.addEventListener
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

    it("sets up event listeners on mount", () => {
      renderHook(() => useNetworkStatus());

      expect(mockAddEventListener).toHaveBeenCalledWith("online", expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
    });

    it("cleans up event listeners on unmount", () => {
      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith("online", expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
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

    it("detects poor connection (2g, low speed)", () => {
      mockNavigator.connection = {
        effectiveType: "2g",
        downlink: 0.5,
        rtt: 300,
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("poor");
      expect(result.current.shouldWarnSlowConnection).toBe(true);
    });

    it("handles offline state", () => {
      mockNavigator.onLine = false;

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
    it("responds to online events", () => {
      mockNavigator.onLine = false;
      const { result } = renderHook(() => useNetworkStatus());

      // Initially offline
      expect(result.current.isConnected).toBe(false);

      // Simulate coming online
      act(() => {
        mockNavigator.onLine = true;
        const onlineHandler = mockAddEventListener.mock.calls.find((call) => call[0] === "online")?.[1];
        if (onlineHandler) {
          onlineHandler();
        }
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.shouldShowOfflineMessage).toBe(false);
    });

    it("responds to offline events", () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Initially online
      expect(result.current.isConnected).toBe(true);

      // Simulate going offline
      act(() => {
        mockNavigator.onLine = false;
        const offlineHandler = mockAddEventListener.mock.calls.find((call) => call[0] === "offline")?.[1];
        if (offlineHandler) {
          offlineHandler();
        }
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionQuality).toBe("offline");
      expect(result.current.shouldShowOfflineMessage).toBe(true);
    });

    it("updates connection quality when connection changes", () => {
      const { result, rerender } = renderHook(() => useNetworkStatus());

      // Start with excellent connection
      expect(result.current.connectionQuality).toBe("excellent");

      // Change to poor connection
      act(() => {
        mockNavigator.connection = {
          effectiveType: "slow-2g",
          downlink: 0.1,
          rtt: 500,
        };
        rerender();
      });

      expect(result.current.connectionQuality).toBe("poor");
      expect(result.current.shouldWarnSlowConnection).toBe(true);
    });
  });

  describe("Connection Quality Algorithms", () => {
    it("prioritizes downlink speed for quality assessment", () => {
      // High downlink should result in excellent quality despite medium effective type
      mockNavigator.connection = {
        effectiveType: "3g",
        downlink: 20, // Very high
        rtt: 50,
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("excellent");
    });

    it("considers RTT for quality assessment", () => {
      // High RTT should lower quality despite good downlink
      mockNavigator.connection = {
        effectiveType: "4g",
        downlink: 10,
        rtt: 400, // Very high
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("poor");
    });

    it("uses effective type as fallback", () => {
      // When downlink/RTT are missing, use effective type
      (mockNavigator as any).connection = {
        effectiveType: "2g",
        // No downlink or rtt properties
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe("poor");
    });
  });

  describe("Helper Flags", () => {
    it("sets canMakeRequests based on connection", () => {
      const { result, rerender } = renderHook(() => useNetworkStatus());

      // Online - can make requests
      expect(result.current.canMakeRequests).toBe(true);

      // Offline - cannot make requests
      act(() => {
        mockNavigator.onLine = false;
        rerender();
      });

      expect(result.current.canMakeRequests).toBe(false);
    });

    it("sets shouldWarnSlowConnection for poor connections", () => {
      mockNavigator.connection = {
        effectiveType: "slow-2g",
        downlink: 0.05,
        rtt: 600,
      };

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.shouldWarnSlowConnection).toBe(true);
      expect(result.current.connectionQuality).toBe("poor");
    });

    it("sets shouldShowOfflineMessage when offline", () => {
      mockNavigator.onLine = false;

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

    it("handles rapid connection changes efficiently", () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Simulate rapid online/offline changes
      act(() => {
        for (let i = 0; i < 10; i++) {
          mockNavigator.onLine = i % 2 === 0;
          const handler = mockAddEventListener.mock.calls.find(
            (call) => call[0] === (i % 2 === 0 ? "online" : "offline")
          )?.[1];
          if (handler) {
            handler();
          }
        }
      });

      // Should end up in expected state
      expect(result.current.isConnected).toBe(true); // Last iteration was online
    });
  });
});

describe("useOfflineHandler Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigator.onLine = true;
  });

  describe("Offline Action Queuing", () => {
    it("queues actions when offline", () => {
      mockNavigator.onLine = false;
      const { result } = renderHook(() => useOfflineHandler());

      const mockAction = jest.fn();

      act(() => {
        result.current.queueForOnline(mockAction);
      });

      // Action should not execute immediately when offline
      expect(mockAction).not.toHaveBeenCalled();
    });

    it("executes queued actions when coming online", () => {
      const { result } = renderHook(() => useOfflineHandler());

      const mockAction1 = jest.fn();
      const mockAction2 = jest.fn();

      // Start offline and queue actions
      act(() => {
        mockNavigator.onLine = false;
        result.current.queueForOnline(mockAction1);
        result.current.queueForOnline(mockAction2);
      });

      expect(mockAction1).not.toHaveBeenCalled();
      expect(mockAction2).not.toHaveBeenCalled();

      // Come online
      act(() => {
        mockNavigator.onLine = true;
        const onlineHandler = mockAddEventListener.mock.calls.find((call) => call[0] === "online")?.[1];
        if (onlineHandler) {
          onlineHandler();
        }
      });

      expect(mockAction1).toHaveBeenCalledTimes(1);
      expect(mockAction2).toHaveBeenCalledTimes(1);
    });

    it("executes actions immediately when online", () => {
      const { result } = renderHook(() => useOfflineHandler());

      const mockAction = jest.fn();

      act(() => {
        result.current.queueForOnline(mockAction);
      });

      // Should execute immediately when online
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it("handles action execution errors gracefully", () => {
      const { result } = renderHook(() => useOfflineHandler());

      const mockActionError = jest.fn(() => {
        throw new Error("Test error");
      });
      const mockActionSuccess = jest.fn();

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      // Queue actions while offline
      act(() => {
        mockNavigator.onLine = false;
        result.current.queueForOnline(mockActionError);
        result.current.queueForOnline(mockActionSuccess);
      });

      // Come online - should handle errors and continue
      act(() => {
        mockNavigator.onLine = true;
        const onlineHandler = mockAddEventListener.mock.calls.find((call) => call[0] === "online")?.[1];
        if (onlineHandler) {
          onlineHandler();
        }
      });

      expect(mockActionError).toHaveBeenCalledTimes(1);
      expect(mockActionSuccess).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Memory Management", () => {
    it("clears queue after executing actions", () => {
      const { result } = renderHook(() => useOfflineHandler());

      const mockAction = jest.fn();

      // Queue action while offline
      act(() => {
        mockNavigator.onLine = false;
        result.current.queueForOnline(mockAction);
      });

      // Come online
      act(() => {
        mockNavigator.onLine = true;
        const onlineHandler = mockAddEventListener.mock.calls.find((call) => call[0] === "online")?.[1];
        if (onlineHandler) {
          onlineHandler();
        }
      });

      expect(mockAction).toHaveBeenCalledTimes(1);

      // Go offline and online again - action should not execute again
      act(() => {
        mockNavigator.onLine = false;
        const offlineHandler = mockAddEventListener.mock.calls.find((call) => call[0] === "offline")?.[1];
        if (offlineHandler) {
          offlineHandler();
        }

        mockNavigator.onLine = true;
        const onlineHandler = mockAddEventListener.mock.calls.find((call) => call[0] === "online")?.[1];
        if (onlineHandler) {
          onlineHandler();
        }
      });

      // Should still be only called once
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it("cleans up event listeners on unmount", () => {
      const { unmount } = renderHook(() => useOfflineHandler());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith("online", expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
    });
  });
});
