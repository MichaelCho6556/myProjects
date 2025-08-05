import React from "react";

// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  // Decode URL to catch encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }
  
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // Dangerous schemes to block
  const dangerousSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:',
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return 'about:blank';
    }
  }
  
  // Additional check for encoded attempts
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return 'about:blank';
  }
  
  return url;
};

import "./Error.css";

interface ErrorFallbackProps {
  error: Error | null;
  onRetry?: () => void;
  className?: string;
  showDetails?: boolean;
}

/**
 * Enhanced Error Fallback Component
 * Professional error display with user-friendly messaging
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  className = "",
  showDetails = false,
}) => {
  const getErrorMessage = (error: Error | null): string => {
    if (!error) return "An unexpected error occurred";

    // Network errors
    if (error.message.includes("Network") || error.message.includes("fetch")) {
      return "Network connection error. Please check your internet connection and try again.";
    }

    // Authentication errors
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      return "Your session has expired. Please refresh the page and sign in again.";
    }

    // Permission errors
    if (error.message.includes("403") || error.message.includes("Forbidden")) {
      return "You don't have permission to access this content.";
    }

    // Not found errors
    if (error.message.includes("404") || error.message.includes("Not Found")) {
      return "The requested content was not found.";
    }

    // Server errors
    if (error.message.includes("500") || error.message.includes("Server")) {
      return "A server error occurred. Please try again in a few moments.";
    }

    // Generic error
    return "Something unexpected happened. Please try refreshing the page.";
  };

  const getErrorIcon = (error: Error | null): string => {
    if (!error) return "⚠️";

    if (error.message.includes("Network") || error.message.includes("fetch")) {
      return "🌐";
    }

    if (error.message.includes("401") || error.message.includes("403")) {
      return "🔒";
    }

    if (error.message.includes("404")) {
      return "🔍";
    }

    if (error.message.includes("500")) {
      return "🔧";
    }

    return "⚠️";
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className={`error-fallback ${className}`.trim()} role="alert">
      <div className="error-fallback-content">
        <div className="error-icon" aria-hidden="true">
          {getErrorIcon(error)}
        </div>

        <h2 className="error-title">Oops! Something went wrong</h2>

        <p className="error-message">{getErrorMessage(error)}</p>

        {error && showDetails && (
          <details className="error-details">
            <summary>Technical Details</summary>
            <div className="error-technical">
              <p>
                <strong>Error:</strong> {error.name}
              </p>
              <p>
                <strong>Message:</strong> {error.message}
              </p>
              {error.stack && (
                <div className="error-stack">
                  <strong>Stack Trace:</strong>
                  <pre>{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}

        <div className="error-actions">
          {onRetry && (
            <button className="btn btn-primary" onClick={onRetry} aria-label="Retry the failed operation">
              Try Again
            </button>
          )}

          <button className="btn btn-secondary" onClick={handleRefresh} aria-label="Refresh the page">
            Refresh Page
          </button>

          <button className="btn btn-outline" onClick={handleGoHome} aria-label="Go to homepage">
            Go Home
          </button>
        </div>

        <div className="error-help">
          <p>
            If this problem persists, please{" "}
            <a href="mailto:support@animanga.com" className="error-help-link">
              contact support
            </a>{" "}
            or try again later.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
