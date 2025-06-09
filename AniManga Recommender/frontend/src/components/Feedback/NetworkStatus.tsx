import React, { useState, useEffect } from "react";
import { networkMonitor, NetworkStatus as NetworkStatusType } from "../../utils/errorHandler";
import "./NetworkStatus.css";

interface NetworkStatusProps {
  position?: "top" | "bottom";
  showOnlineStatus?: boolean;
  className?: string;
}

/**
 * Network Status Indicator Component
 * Shows user connectivity status and warnings about slow connections
 */
const NetworkStatus: React.FC<NetworkStatusProps> = ({
  position = "top",
  showOnlineStatus = false,
  className = "",
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusType>(networkMonitor.getStatus());
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [showSlowConnectionMessage, setShowSlowConnectionMessage] = useState(false);

  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe((status) => {
      setNetworkStatus(status);

      // Show offline message when going offline
      if (!status.isOnline) {
        setShowOfflineMessage(true);
        setShowSlowConnectionMessage(false);
      } else {
        // Hide offline message when back online
        setShowOfflineMessage(false);

        // Show slow connection warning if applicable
        if (status.isSlowConnection) {
          setShowSlowConnectionMessage(true);
        } else {
          setShowSlowConnectionMessage(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Auto-hide slow connection message after 10 seconds
  useEffect(() => {
    if (showSlowConnectionMessage) {
      const timer = setTimeout(() => {
        setShowSlowConnectionMessage(false);
      }, 10000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [showSlowConnectionMessage]);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowSlowConnectionMessage(false);
  };

  // Don't render anything if online and not showing online status
  if (networkStatus.isOnline && !showOnlineStatus && !showSlowConnectionMessage) {
    return null;
  }

  return (
    <div className={`network-status network-status--${position} ${className}`.trim()}>
      {/* Offline Status */}
      {showOfflineMessage && (
        <div
          className="network-status__banner network-status__banner--offline"
          role="alert"
          aria-live="assertive"
        >
          <div className="network-status__content">
            <div className="network-status__icon" aria-hidden="true">
              📡
            </div>
            <div className="network-status__message">
              <strong>You're offline</strong>
              <p>Please check your internet connection. Some features may not work.</p>
            </div>
            <button className="network-status__action" onClick={handleRetry} aria-label="Retry connection">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Slow Connection Warning */}
      {showSlowConnectionMessage && networkStatus.isOnline && (
        <div className="network-status__banner network-status__banner--slow" role="status" aria-live="polite">
          <div className="network-status__content">
            <div className="network-status__icon" aria-hidden="true">
              🐌
            </div>
            <div className="network-status__message">
              <strong>Slow connection detected</strong>
              <p>Loading may take longer than usual.</p>
            </div>
            <button
              className="network-status__dismiss"
              onClick={handleDismiss}
              aria-label="Dismiss slow connection warning"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Online Status (when enabled) */}
      {showOnlineStatus && networkStatus.isOnline && !showSlowConnectionMessage && (
        <div
          className="network-status__indicator network-status__indicator--online"
          role="status"
          aria-live="polite"
        >
          <div className="network-status__dot" aria-hidden="true"></div>
          <span className="network-status__text">Online</span>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;
