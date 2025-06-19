import React from "react";
import "./Loading.css";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

interface LoadingBannerProps {
  message: string;
  isVisible: boolean;
  className?: string;
}

/**
 * Professional Loading Banner Component with Network Awareness
 * Shows loading state with spinner and adapts to connection quality
 */
const LoadingBanner: React.FC<LoadingBannerProps> = ({ message, isVisible, className = "" }) => {
  const { shouldWarnSlowConnection } = useNetworkStatus();

  if (!isVisible) return null;

  // Format message with slow connection warning if needed
  const displayMessage = shouldWarnSlowConnection 
    ? `${message} (Slow connection detected)`
    : message;

  const bannerClasses = [
    "loading-banner",
    shouldWarnSlowConnection ? "loading-banner--slow-connection" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <div
      className={bannerClasses}
      role="status"
      aria-live="polite"
      aria-label={displayMessage}
      title={displayMessage}
    >
      <div className="loading-content">
        <div 
          className="loading-spinner"
          aria-hidden="true"
        />
        <div className="loading-text">
          {displayMessage}
        </div>
        {shouldWarnSlowConnection && (
          <span 
            className="loading-connection-warning"
            aria-hidden="true"
            title="Slow connection"
          >
            🐌
          </span>
        )}
      </div>
    </div>
  );
};

export default LoadingBanner;
