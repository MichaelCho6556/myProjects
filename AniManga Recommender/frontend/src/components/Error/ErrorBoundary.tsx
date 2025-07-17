import React, { Component, ErrorInfo, ReactNode } from "react";
import ErrorFallback from "./ErrorFallback";
import { logger } from "../../utils/logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void; errorId: string }>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  name?: string;
}

/**
 * Enhanced Error Boundary Component with comprehensive error handling
 *
 * Features:
 * - Automatic error reporting and logging
 * - Retry mechanism with configurable limits
 * - Error isolation to prevent cascade failures
 * - Development vs production error display
 * - Error context tracking with unique IDs
 * - Graceful fallback rendering
 * - Performance monitoring integration
 *
 * @param children - Child components to monitor for errors
 * @param fallback - Custom error fallback component
 * @param onError - Error callback for logging/reporting
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param resetOnPropsChange - Reset error state when props change
 * @param resetKeys - Specific prop keys to watch for reset
 * @param isolate - Prevent error propagation to parent boundaries
 * @param name - Boundary name for debugging
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, name } = this.props;
    const errorId = this.state.errorId;

    // Enhanced error logging
    const errorContext = {
      errorId,
      timestamp: new Date().toISOString(),
      boundaryName: name || "Anonymous",
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      additionalContext: this.getAdditionalContext(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group(`🚨 Error Boundary Triggered: ${errorId}`);
      logger.error("Error boundary caught error", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "ErrorBoundary",
        operation: "componentDidCatch",
        errorId: errorId,
        retryCount: this.state.retryCount,
        errorInfo: errorInfo?.componentStack || "No component stack",
        errorContext: errorContext
      });
      console.groupEnd();
    }

    // Report to error tracking service
    this.reportError(errorContext);

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.children !== this.props.children) {
      if (resetOnPropsChange) {
        this.resetError();
      } else if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key) => prevProps[key as keyof ErrorBoundaryProps] !== this.props[key as keyof ErrorBoundaryProps]
        );
        if (hasResetKeyChanged) {
          this.resetError();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return ErrorBoundary.generateErrorId();
  }

  private getUserId(): string | null {
    // Get user ID from auth context or localStorage
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user.id || null;
    } catch {
      return null;
    }
  }

  private getSessionId(): string | null {
    // Get session ID from sessionStorage
    try {
      return sessionStorage.getItem("sessionId") || null;
    } catch {
      return null;
    }
  }

  private getAdditionalContext() {
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      memory: (performance as any).memory
        ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
          }
        : null,
      connection: (navigator as any).connection
        ? {
            effectiveType: (navigator as any).connection.effectiveType,
            downlink: (navigator as any).connection.downlink,
            rtt: (navigator as any).connection.rtt,
          }
        : null,
    };
  }

  private reportError(errorContext: any) {
    // Report to error tracking service (e.g., Sentry, LogRocket, etc.)
    try {
      // Example implementation - replace with your error tracking service
      if (window.gtag) {
        window.gtag("event", "exception", {
          description: errorContext.error.message,
          fatal: false,
          custom_map: {
            error_id: errorContext.errorId,
            boundary_name: errorContext.boundaryName,
          },
        });
      }

      // Could also send to your own error tracking endpoint
      fetch("/api/errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorContext),
      }).catch(() => {
        // Silently fail if error reporting fails
      });
    } catch {
      // Don't throw if error reporting fails
    }
  }

  private resetError = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn(`Max retries (${maxRetries}) reached for error boundary`);
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
      retryCount: retryCount + 1,
    });
  };

  private handleRetry = () => {
    // Add a small delay to prevent immediate re-errors
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetError();
    }, 100);
  };

  render() {
    const { hasError, error, errorId, retryCount } = this.state;
    const { children, fallback: FallbackComponent, maxRetries = 3, isolate } = this.props;

    if (hasError && error) {
      // Custom fallback component
      if (FallbackComponent) {
        return <FallbackComponent error={error} retry={this.handleRetry} errorId={errorId} />;
      }

      // Default fallback
      const canRetry = retryCount < maxRetries;

      const fallbackProps: any = {
        error,
        showDetails: process.env.NODE_ENV === "development",
        className: isolate ? "error-boundary-isolated" : "",
      };

      if (canRetry) {
        fallbackProps.onRetry = this.handleRetry;
      }

      return <ErrorFallback {...fallbackProps} />;
    }

    return children;
  }
}

export default ErrorBoundary;
