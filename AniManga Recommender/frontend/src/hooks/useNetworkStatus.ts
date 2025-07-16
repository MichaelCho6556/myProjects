import { useState, useEffect } from "react";
import { networkMonitor, NetworkStatus } from "../utils/errorHandler";
import { logger } from "../utils/logger";

interface UseNetworkStatusReturn extends NetworkStatus {
  isConnected: boolean;
  connectionQuality: "excellent" | "good" | "poor" | "offline";
  canMakeRequests: boolean;
  shouldShowOfflineMessage: boolean;
  shouldWarnSlowConnection: boolean;
}

/**
 * Custom hook for network status monitoring
 * Provides easy access to network state and connection quality
 */
export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(networkMonitor.getStatus());

  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe((status) => {
      setNetworkStatus(status);
    });

    return unsubscribe;
  }, []);

  // Determine connection quality
  const getConnectionQuality = (): "excellent" | "good" | "poor" | "offline" => {
    if (!networkStatus.isOnline) {
      return "offline";
    }

    if (networkStatus.isSlowConnection) {
      return "poor";
    }

    // Check if we have connection info available
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        switch (effectiveType) {
          case "4g":
            return "excellent";
          case "3g":
            return "good";
          case "2g":
          case "slow-2g":
            return "poor";
          default:
            return "good";
        }
      }
    }

    return "good"; // Default assumption if no connection info
  };

  const connectionQuality = getConnectionQuality();
  const isConnected = networkStatus.isOnline;
  const canMakeRequests = isConnected && connectionQuality !== "offline";
  const shouldShowOfflineMessage = !isConnected;
  const shouldWarnSlowConnection = isConnected && connectionQuality === "poor";

  return {
    ...networkStatus,
    isConnected,
    connectionQuality,
    canMakeRequests,
    shouldShowOfflineMessage,
    shouldWarnSlowConnection,
  };
};

/**
 * Hook for components that need to handle offline scenarios
 */
export const useOfflineHandler = () => {
  const { isConnected, canMakeRequests } = useNetworkStatus();
  const [offlineActions, setOfflineActions] = useState<(() => void)[]>([]);

  // Queue actions to execute when back online
  const queueForOnline = (action: () => void) => {
    if (canMakeRequests) {
      action();
    } else {
      setOfflineActions((prev) => [...prev, action]);
    }
  };

  // Execute queued actions when back online
  useEffect(() => {
    if (canMakeRequests && offlineActions.length > 0) {
      offlineActions.forEach((action) => {
        try {
          action();
        } catch (error: any) {
          logger.error("Error executing queued offline action", {
            error: error?.message || "Unknown error",
            context: "useNetworkStatus",
            operation: "executeOfflineActions"
          });
        }
      });
      setOfflineActions([]);
    }
  }, [canMakeRequests, offlineActions]);

  return {
    isConnected,
    canMakeRequests,
    queueForOnline,
    hasQueuedActions: offlineActions.length > 0,
  };
};

export default useNetworkStatus;
