import React from "react";
import "./Loading.css";

interface LoadingBannerProps {
  message: string;
  isVisible: boolean;
  className?: string;
}

/**
 * Minimal Loading Banner Component
 * Subtle loading bar that doesn't disrupt layout
 */
const LoadingBanner: React.FC<LoadingBannerProps> = ({ message, isVisible, className = "" }) => {
  if (!isVisible) return null;

  return (
    <div
      className={`loading-banner ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={message}
      title={message}
    />
  );
};

export default LoadingBanner;
