import React from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import "./ConnectionIndicator.css";

interface ConnectionIndicatorProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showText?: boolean;
  showOnlyWhenPoor?: boolean;
  className?: string;
}

/**
 * Connection Quality Indicator Component
 * Shows visual indicator of connection strength and quality
 */
const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  position = "top-right",
  showText = false,
  showOnlyWhenPoor = false,
  className = "",
}) => {
  const { connectionQuality, isConnected, shouldShowOfflineMessage, shouldWarnSlowConnection } =
    useNetworkStatus();

  // Don't render if connection is good and we only show when poor
  if (showOnlyWhenPoor && connectionQuality === "excellent") {
    return null;
  }

  const getSignalBars = () => {
    switch (connectionQuality) {
      case "excellent":
        return 4;
      case "good":
        return 3;
      case "poor":
        return 1;
      case "offline":
        return 0;
      default:
        return 2;
    }
  };

  const getStatusColor = () => {
    switch (connectionQuality) {
      case "excellent":
        return "#10b981"; // Green
      case "good":
        return "#3b82f6"; // Blue
      case "poor":
        return "#f59e0b"; // Orange
      case "offline":
        return "#ef4444"; // Red
      default:
        return "#6b7280"; // Gray
    }
  };

  const getStatusText = () => {
    if (!isConnected) return "Offline";

    switch (connectionQuality) {
      case "excellent":
        return "Excellent";
      case "good":
        return "Good";
      case "poor":
        return "Poor";
      case "offline":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  const signalBars = getSignalBars();
  const statusColor = getStatusColor();
  const statusText = getStatusText();

  return (
    <div
      className={`connection-indicator connection-indicator--${position} ${className}`.trim()}
      role="status"
      aria-label={`Connection status: ${statusText}`}
      title={`Connection: ${statusText}`}
    >
      <div className="connection-indicator__content">
        {/* Signal strength bars */}
        <div className="connection-indicator__signal" aria-hidden="true">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`connection-indicator__bar ${
                bar <= signalBars ? "connection-indicator__bar--active" : ""
              }`}
              style={{
                backgroundColor: bar <= signalBars ? statusColor : "rgba(0, 0, 0, 0.2)",
                height: `${bar * 25}%`,
              }}
            />
          ))}
        </div>

        {/* Optional text label */}
        {showText && (
          <span className="connection-indicator__text" style={{ color: statusColor }}>
            {statusText}
          </span>
        )}

        {/* Warning indicator for poor connection */}
        {shouldWarnSlowConnection && (
          <div
            className="connection-indicator__warning"
            aria-label="Slow connection warning"
            title="Slow connection detected"
          >
            ⚠️
          </div>
        )}

        {/* Offline indicator */}
        {shouldShowOfflineMessage && (
          <div
            className="connection-indicator__offline"
            aria-label="Offline indicator"
            title="No internet connection"
          >
            📵
          </div>
        )}
      </div>

      {/* Connection quality details (screen reader only) */}
      <div className="sr-only">
        Connection quality: {statusText}
        {shouldWarnSlowConnection && ". Warning: slow connection detected"}
        {shouldShowOfflineMessage && ". No internet connection available"}
      </div>
    </div>
  );
};

export default ConnectionIndicator;
