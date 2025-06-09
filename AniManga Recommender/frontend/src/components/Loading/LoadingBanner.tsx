import React from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import "./Loading.css";

interface LoadingBannerProps {
  message: string;
  isVisible: boolean;
  className?: string;
}

/**
 * Professional Loading Banner Component
 * Replaces basic spinners with polished loading states
 */
const LoadingBanner: React.FC<LoadingBannerProps> = ({ message, isVisible, className = "" }) => {
  const { shouldWarnSlowConnection } = useNetworkStatus();

  if (!isVisible) return null;

  // Adjust message based on connection quality
  const getDisplayMessage = () => {
    if (shouldWarnSlowConnection) {
      return `${message} (Slow connection detected)`;
    }
    return message;
  };

  const displayMessage = getDisplayMessage();

  return (
    <div
      className={`loading-banner ${
        shouldWarnSlowConnection ? "loading-banner--slow-connection" : ""
      } ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={displayMessage}
    >
      <div className="loading-content">
        <div className="loading-spinner" aria-hidden="true"></div>
        <span className="loading-text">{displayMessage}</span>
        {shouldWarnSlowConnection && (
          <div className="loading-connection-warning" aria-hidden="true" title="Slow connection">
            🐌
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingBanner;
