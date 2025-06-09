/**
 * Enhanced Error Handler Utility
 * Provides error parsing, logging, retry mechanisms, and user-friendly message generation
 */

import { ApiError, ValidationStructure } from "../types";

export interface ParsedError {
  userMessage: string;
  technicalDetails: string;
  statusCode: number | null;
  originalError: ApiError;
  isRetryable: boolean;
  suggestedAction?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitter: boolean;
  retryableStatuses: number[];
  onRetry?: (attempt: number, error: ApiError) => void;
  onFinalFailure?: (error: ApiError) => void;
}

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  lastChecked: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  exponentialBase: 2,
  jitter: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Circuit breaker pattern implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}

  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error("Circuit breaker is OPEN - too many recent failures");
      }
      this.state = "HALF_OPEN";
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }

  getState() {
    return this.state;
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

// Network status monitoring
class NetworkMonitor {
  private status: NetworkStatus = {
    isOnline: navigator.onLine,
    isSlowConnection: false,
    lastChecked: Date.now(),
  };

  private listeners: ((status: NetworkStatus) => void)[] = [];

  constructor() {
    // Listen for online/offline events
    window.addEventListener("online", () => this.updateStatus({ isOnline: true }));
    window.addEventListener("offline", () => this.updateStatus({ isOnline: false }));

    // Monitor connection speed if available
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const updateConnectionStatus = () => {
          this.updateStatus({
            isSlowConnection: connection.effectiveType === "slow-2g" || connection.effectiveType === "2g",
          });
        };

        connection.addEventListener("change", updateConnectionStatus);
        updateConnectionStatus();
      }
    }
  }

  private updateStatus(updates: Partial<NetworkStatus>) {
    this.status = {
      ...this.status,
      ...updates,
      lastChecked: Date.now(),
    };

    this.listeners.forEach((listener) => listener(this.status));
  }

  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

// Global network monitor instance
export const networkMonitor = new NetworkMonitor();

/**
 * Enhanced error parsing with retry analysis
 */
export const parseError = (error: ApiError, context?: string): ParsedError => {
  let userMessage = "An unexpected error occurred";
  let technicalDetails = "Unknown error";
  let statusCode: number | null = null;
  let isRetryable = false;
  let suggestedAction: string | undefined;

  // Handle network errors
  if (error.name === "NetworkError" || error.request) {
    userMessage = "Unable to connect to the server. Please check your internet connection and try again.";
    technicalDetails = `Network Error: ${error.message || "Connection failed"}`;
    isRetryable = true;
    suggestedAction = "Check your internet connection and try again";
  }
  // Handle timeout errors
  else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    userMessage = "The request timed out. Please try again.";
    technicalDetails = `Timeout Error: ${error.message}`;
    isRetryable = true;
    suggestedAction = "Try again - the server may be temporarily slow";
  }
  // Handle JSON parsing errors
  else if (error.name === "SyntaxError" && error.message?.includes("JSON")) {
    userMessage = "Invalid server response. Please try again.";
    technicalDetails = `JSON Parse Error: ${error.message}`;
    isRetryable = true;
    suggestedAction = "Try again - there may be a temporary server issue";
  }
  // Handle API errors with response
  else if (error.response) {
    statusCode = error.response.status;
    isRetryable = DEFAULT_RETRY_CONFIG.retryableStatuses.includes(statusCode);

    switch (statusCode) {
      case 400:
        userMessage = "Bad request. Please check your input and try again.";
        suggestedAction = "Check your input data";
        break;
      case 401:
        userMessage = "Authentication required. Please log in and try again.";
        suggestedAction = "Please sign in again";
        break;
      case 403:
        userMessage = "You don't have permission to access this content.";
        suggestedAction = "Contact support if you believe this is an error";
        break;
      case 404:
        userMessage = "The requested item was not found.";
        suggestedAction = "The content may have been moved or deleted";
        break;
      case 408:
        userMessage = "Request timeout. Please try again.";
        suggestedAction = "Try again - the server response was slow";
        break;
      case 429:
        userMessage = "Too many requests. Please wait a moment and try again.";
        suggestedAction = "Wait a few seconds before trying again";
        break;
      case 500:
        userMessage = "A server error occurred. Please try again later.";
        suggestedAction = "Try again in a few moments";
        break;
      case 502:
        userMessage = "Bad gateway. The server is temporarily unavailable.";
        suggestedAction = "Try again - the server may be restarting";
        break;
      case 503:
        userMessage = "Service unavailable. Please try again later.";
        suggestedAction = "The service is temporarily down - try again later";
        break;
      case 504:
        userMessage = "Gateway timeout. Please try again.";
        suggestedAction = "Try again - the server response was slow";
        break;
      default:
        userMessage = `Server error (${statusCode}). Please try again later.`;
        suggestedAction = "Try again later";
    }

    technicalDetails = `HTTP ${statusCode}: ${error.response.statusText || "Server Error"}`;
  }
  // Handle generic errors
  else {
    userMessage = "An unexpected error occurred. Please try again.";
    technicalDetails = error.message || "Unknown error occurred";
    isRetryable = true;
    suggestedAction = "Try refreshing the page";
  }

  // Add context to user message if provided
  if (context) {
    userMessage = `Error ${context}: ${userMessage}`;
  }

  return {
    userMessage,
    technicalDetails,
    statusCode,
    originalError: error,
    isRetryable,
    suggestedAction,
  };
};

/**
 * Enhanced logging with retry information
 */
export const logError = (parsedError: ParsedError, componentName: string = "Unknown"): void => {
  const { statusCode, originalError, isRetryable } = parsedError;
  const logPrefix = `[${componentName}] Error:`;
  const retryInfo = isRetryable ? "(Retryable)" : "(Not Retryable)";

  // Log user errors (4xx) as warnings
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    console.warn(`${logPrefix} ${retryInfo}`, originalError);
  } else {
    // Log server errors and unknown errors as errors
    console.error(`${logPrefix} ${retryInfo}`, originalError);
  }
};

/**
 * Enhanced retry operation with circuit breaker and advanced backoff
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: ApiError = new Error("Operation failed") as ApiError;

  // Check network status first
  const networkStatus = networkMonitor.getStatus();
  if (!networkStatus.isOnline) {
    throw new Error("No internet connection. Please check your network and try again.");
  }

  // Use circuit breaker for the operation
  try {
    return await circuitBreaker.call(async () => {
      for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
        try {
          const result = await operation();

          // Success callback
          if (attempt > 0 && finalConfig.onRetry) {
            console.info(`Operation succeeded after ${attempt + 1} attempts`);
          }

          return result;
        } catch (error) {
          lastError = error as ApiError;
          const parsedError = parseError(lastError);

          // Don't retry if error is not retryable
          if (!parsedError.isRetryable) {
            throw lastError;
          }

          // If this was the last attempt, throw the error
          if (attempt === finalConfig.maxRetries - 1) {
            if (finalConfig.onFinalFailure) {
              finalConfig.onFinalFailure(lastError);
            }
            throw lastError;
          }

          // Calculate delay with exponential backoff and jitter
          const baseDelay = Math.min(
            finalConfig.baseDelayMs * Math.pow(finalConfig.exponentialBase, attempt),
            finalConfig.maxDelayMs
          );

          const delay = finalConfig.jitter ? baseDelay + Math.random() * 1000 : baseDelay;

          // Retry callback
          if (finalConfig.onRetry) {
            finalConfig.onRetry(attempt + 1, lastError);
          }

          console.info(
            `Retrying operation in ${Math.round(delay)}ms (attempt ${attempt + 1}/${finalConfig.maxRetries})`
          );

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    });
  } catch (error) {
    // If circuit breaker is open, provide specific message
    if (error instanceof Error && error.message.includes("Circuit breaker is OPEN")) {
      throw new Error(
        "Service temporarily unavailable due to repeated failures. Please try again in a few minutes."
      );
    }
    throw error;
  }
};

/**
 * Create a retry-enabled operation wrapper
 */
export const createRetryableOperation = <T>(operation: () => Promise<T>, config?: Partial<RetryConfig>) => {
  return () => retryOperation(operation, config);
};

/**
 * Enhanced error handler with retry support
 */
export const createErrorHandler = (componentName: string, setError: (message: string) => void) => {
  return (error: ApiError, context?: string): ParsedError => {
    const parsedError = parseError(error, context);
    logError(parsedError, componentName);
    setError(parsedError.userMessage);
    return parsedError;
  };
};

/**
 * Validate response data structure
 */
export const validateResponseData = (data: any, structure: ValidationStructure): boolean => {
  if (data === null || data === undefined) {
    throw new Error("Response data is null or undefined");
  }

  for (const [field, validation] of Object.entries(structure)) {
    const value = data[field];

    switch (validation) {
      case "required":
        if (value === undefined || value === null) {
          throw new Error(`Missing required field: ${field}`);
        }
        break;

      case "string":
        if (typeof value !== "string") {
          throw new Error(`Invalid field type for ${field}: expected string, got ${typeof value}`);
        }
        break;

      case "number":
        if (typeof value !== "number") {
          throw new Error(`Invalid field type for ${field}: expected number, got ${typeof value}`);
        }
        break;

      case "boolean":
        if (typeof value !== "boolean") {
          throw new Error(`Invalid field type for ${field}: expected boolean, got ${typeof value}`);
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          throw new Error(`Invalid field type for ${field}: expected array, got ${typeof value}`);
        }
        break;

      case "object":
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          throw new Error(`Invalid field type for ${field}: expected object, got ${typeof value}`);
        }
        break;

      case "any":
        // Any type is valid
        break;

      default:
        throw new Error(`Unknown validation type: ${validation}`);
    }
  }

  return true;
};

/**
 * Utility to check if an error should trigger a retry
 */
export const shouldRetry = (error: ApiError): boolean => {
  const parsed = parseError(error);
  return parsed.isRetryable;
};

/**
 * Get human-readable retry delay
 */
export const getRetryDelay = (attempt: number, baseDelay: number = 1000): number => {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
};

/**
 * Format retry message for users
 */
export const formatRetryMessage = (attempt: number, maxAttempts: number, nextDelay?: number): string => {
  if (nextDelay) {
    const seconds = Math.ceil(nextDelay / 1000);
    return `Attempt ${attempt} of ${maxAttempts} failed. Retrying in ${seconds} second${
      seconds !== 1 ? "s" : ""
    }...`;
  }
  return `Attempt ${attempt} of ${maxAttempts} failed. Retrying...`;
};
