import React, { useState, useCallback } from "react";
import { useToast } from "./ToastProvider";
import { retryOperation, formatRetryMessage, getRetryDelay, RetryConfig } from "../../utils/errorHandler";
import { logger } from "../../utils/logger";
import "./RetryButton.css";

interface RetryButtonProps {
  onRetry: () => Promise<void>;
  retryConfig?: Partial<RetryConfig>;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "medium" | "large";
  showProgress?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Enhanced Retry Button Component
 * Provides intelligent retry functionality with progress indication
 */
const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  retryConfig,
  disabled = false,
  variant = "primary",
  size = "medium",
  showProgress = true,
  className = "",
  children = "Try Again",
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);
  const { addToast } = useToast();

  const handleRetry = useCallback(async () => {
    if (isRetrying || disabled) return;

    setIsRetrying(true);
    setRetryAttempt(0);

    const config: Partial<RetryConfig> = {
      maxRetries: 3,
      baseDelayMs: 1000,
      onRetry: (attempt, _error) => {
        setRetryAttempt(attempt);
        const delay = getRetryDelay(attempt - 1, retryConfig?.baseDelayMs || 1000);
        setNextRetryIn(delay);

        if (showProgress) {
          addToast({
            type: "info",
            title: "Retrying",
            message: formatRetryMessage(attempt, retryConfig?.maxRetries || 3, delay),
            duration: delay + 500,
          });
        }
      },
      onFinalFailure: (_error) => {
        addToast({
          type: "error",
          title: "Retry Failed",
          message: "All retry attempts failed. Please check your connection and try again later.",
          duration: 5000,
        });
      },
      ...retryConfig,
    };

    try {
      await retryOperation(onRetry, config);

      if (retryAttempt > 0) {
        addToast({
          type: "success",
          title: "Success",
          message: `Operation succeeded after ${retryAttempt + 1} attempt${retryAttempt > 0 ? "s" : ""}!`,
          duration: 3000,
        });
      }
    } catch (error) {
      logger.error("Retry operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "RetryButton",
        operation: "handleRetry",
        maxRetries: retryConfig?.maxRetries || 3,
        retryAttempts: retryAttempt
      });
    } finally {
      setIsRetrying(false);
      setRetryAttempt(0);
      setNextRetryIn(0);
    }
  }, [onRetry, retryConfig, disabled, isRetrying, retryAttempt, showProgress, addToast]);

  const getButtonText = () => {
    if (!isRetrying) return children;

    if (retryAttempt === 0) {
      return "Retrying...";
    }

    if (nextRetryIn > 0) {
      const seconds = Math.ceil(nextRetryIn / 1000);
      return `Retrying in ${seconds}s...`;
    }

    return `Attempt ${retryAttempt}...`;
  };

  const isDisabled = disabled || isRetrying;

  return (
    <button
      className={`retry-button retry-button--${variant} retry-button--${size} ${
        isRetrying ? "retry-button--retrying" : ""
      } ${className}`.trim()}
      onClick={handleRetry}
      disabled={isDisabled}
      aria-label={isRetrying ? "Retry in progress" : "Retry operation"}
      aria-describedby={isRetrying ? "retry-status" : undefined}
    >
      <span className="retry-button__content">
        {isRetrying && (
          <div className="retry-button__spinner" aria-hidden="true">
            <div className="retry-button__spinner-ring"></div>
          </div>
        )}
        <span className="retry-button__text">{getButtonText()}</span>
      </span>

      {isRetrying && showProgress && (
        <div className="retry-button__progress" aria-hidden="true">
          <div
            className="retry-button__progress-bar"
            style={{
              animationDuration: nextRetryIn > 0 ? `${nextRetryIn}ms` : "2s",
            }}
          ></div>
        </div>
      )}

      {isRetrying && (
        <div id="retry-status" className="sr-only" aria-live="polite">
          {getButtonText()}
        </div>
      )}
    </button>
  );
};

export default RetryButton;
