import React from "react";
import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
  size?: "small" | "medium" | "large";
  className?: string;
}

/**
 * LoadingSpinner Component - A professional, centered loading indicator
 * 
 * @param message - Optional loading message to display below the spinner
 * @param fullPage - If true, covers the entire viewport with an overlay
 * @param size - Size of the spinner (small, medium, large)
 * @param className - Additional CSS classes
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  fullPage = false,
  size = "medium",
  className = "",
}) => {
  const wrapperClass = `loading-spinner-wrapper ${fullPage ? "loading-spinner-wrapper--full-page" : ""} ${className}`.trim();
  const spinnerSizeClass = `loading-spinner-icon loading-spinner-icon--${size}`;

  return (
    <div className={wrapperClass}>
      <div className="loading-spinner-content">
        <div className={spinnerSizeClass}>
          <div className="loading-spinner-circle loading-spinner-circle--1"></div>
          <div className="loading-spinner-circle loading-spinner-circle--2"></div>
        </div>
        {message && (
          <p className="loading-spinner-message">{message}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;