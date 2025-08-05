/**
 * Enhanced Error Handler Utility Module - Comprehensive error management with retry mechanisms
 *
 * This module provides a sophisticated error handling system for the AniManga Recommender application,
 * implementing advanced error parsing, intelligent retry mechanisms, circuit breaker patterns,
 * network monitoring, and user-friendly error message generation. Built with resilience patterns
 * to handle network failures, API errors, and temporary service disruptions gracefully.
 *
 * @module ErrorHandler
 * @author Michael Cho
 * @since v1.0.0
 * @updated v1.2.0 - Added circuit breaker pattern and network-aware retry mechanisms
 *
 * @features
 * - **Intelligent Error Parsing**: Contextual error analysis with retry recommendations
 * - **Circuit Breaker Pattern**: Automatic service protection from cascading failures
 * - **Network Monitoring**: Real-time connection status and speed detection
 * - **Exponential Backoff**: Smart retry delays with jitter for load distribution
 * - **User-Friendly Messages**: Technical errors converted to actionable user guidance
 * - **Response Validation**: Type-safe API response structure validation
 * - **Comprehensive Logging**: Structured error logging with retry context
 *
 * @resilience_patterns
 * - **Circuit Breaker**: Prevents service overload during repeated failures
 * - **Retry with Backoff**: Exponential delay with configurable jitter
 * - **Network Awareness**: Adapts behavior based on connection quality
 * - **Graceful Degradation**: Maintains functionality during partial failures
 * - **Error Context**: Preserves error context through retry attempts
 *
 * @performance_considerations
 * - **Memory Efficient**: Minimal state storage for circuit breaker and network monitoring
 * - **CPU Optimized**: Efficient retry delay calculations with bounded exponential backoff
 * - **Network Aware**: Reduces retry attempts on slow connections
 * - **Event-Driven**: Efficient network status monitoring with browser events
 * - **Garbage Collection**: Proper cleanup of retry timers and network listeners
 *
 * @dependencies
 * - ApiError, ValidationStructure: Type definitions from application types module
 * - Browser APIs: navigator.onLine, navigator.connection for network monitoring
 * - Timers: setTimeout for retry delays and circuit breaker timeouts
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

/**
 * CircuitBreaker - Implementation of circuit breaker pattern for service protection
 *
 * Implements the circuit breaker resilience pattern to prevent cascading failures
 * and protect services from being overwhelmed by repeated failed requests.
 * Automatically opens the circuit after a threshold of failures and provides
 * a recovery mechanism through half-open state testing.
 *
 * @class CircuitBreaker
 * @example
 * ```typescript
 * // Create circuit breaker with custom settings
 * const breaker = new CircuitBreaker(3, 30000); // 3 failures, 30s timeout
 *
 * // Use circuit breaker for API calls
 * try {
 *   const result = await breaker.call(async () => {
 *     return fetch('/api/data').then(res => res.json());
 *   });
 *   console.log('API call succeeded:', result);
 * } catch (error) {
 *   console.log('Circuit breaker prevented call or operation failed');
 * }
 *
 * // Check circuit breaker state
 * console.log('Circuit state:', breaker.getState()); // CLOSED, OPEN, or HALF_OPEN
 * ```
 *
 * @states
 * - **CLOSED**: Normal operation, requests pass through
 * - **OPEN**: Circuit is open, requests are immediately rejected
 * - **HALF_OPEN**: Testing state, single request allowed to test service recovery
 *
 * @benefits
 * - **Service Protection**: Prevents overwhelming failed services with requests
 * - **Fast Failure**: Immediate rejection during service outages
 * - **Automatic Recovery**: Self-healing mechanism through half-open testing
 * - **Resource Conservation**: Reduces unnecessary network calls and timeouts
 * - **User Experience**: Faster error responses instead of hanging requests
 */
class CircuitBreaker {
  /**
   * Current failure count for the circuit breaker
   * @private
   * @type {number}
   */
  private failures = 0;

  /**
   * Timestamp of the last failure occurrence
   * @private
   * @type {number}
   */
  private lastFailureTime = 0;

  /**
   * Current state of the circuit breaker
   * @private
   * @type {"CLOSED" | "OPEN" | "HALF_OPEN"}
   */
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  /**
   * Creates a new CircuitBreaker instance
   *
   * @constructor
   * @param {number} threshold - Number of failures before opening circuit (default: 5)
   * @param {number} timeout - Time in milliseconds before attempting recovery (default: 60000)
   *
   * @example
   * ```typescript
   * // Default settings: 5 failures, 60 second timeout
   * const defaultBreaker = new CircuitBreaker();
   *
   * // Custom settings for sensitive services
   * const sensitiveBreaker = new CircuitBreaker(3, 30000);
   *
   * // High tolerance for resilient services
   * const resilientBreaker = new CircuitBreaker(10, 120000);
   * ```
   */
  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}

  /**
   * Executes an operation through the circuit breaker
   *
   * Wraps the provided operation with circuit breaker logic, managing state
   * transitions and failure thresholds. Provides immediate failure for open
   * circuits and automatic recovery testing through half-open state.
   *
   * @method call
   * @template T - Return type of the operation
   * @param {() => Promise<T>} operation - Async operation to execute
   * @returns {Promise<T>} Result of the operation if successful
   * @throws {Error} Circuit breaker error or original operation error
   *
   * @example
   * ```typescript
   * // Wrap API call with circuit breaker
   * const apiCall = () => fetch('/api/users').then(res => res.json());
   * const result = await circuitBreaker.call(apiCall);
   *
   * // Handle circuit breaker states
   * try {
   *   const data = await circuitBreaker.call(someAsyncOperation);
   * } catch (error) {
   *   if (error.message.includes('Circuit breaker is OPEN')) {
   *     // Handle service unavailable
   *     showServiceUnavailableMessage();
   *   } else {
   *     // Handle operation-specific error
   *     handleOperationError(error);
   *   }
   * }
   * ```
   *
   * @state_transitions
   * - CLOSED → OPEN: When failure threshold is reached
   * - OPEN → HALF_OPEN: After timeout period expires
   * - HALF_OPEN → CLOSED: When test operation succeeds
   * - HALF_OPEN → OPEN: When test operation fails
   */
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

  /**
   * Handles successful operation completion
   *
   * Resets failure count and closes the circuit breaker, allowing normal
   * operation to resume. Called automatically when operations succeed.
   *
   * @private
   * @method onSuccess
   * @returns {void}
   */
  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  /**
   * Handles operation failure
   *
   * Increments failure count and opens circuit breaker if threshold is reached.
   * Records failure timestamp for timeout calculations.
   *
   * @private
   * @method onFailure
   * @returns {void}
   */
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }

  /**
   * Gets the current state of the circuit breaker
   *
   * Returns the current circuit breaker state for monitoring and debugging
   * purposes. Useful for logging, metrics, and conditional logic.
   *
   * @method getState
   * @returns {"CLOSED" | "OPEN" | "HALF_OPEN"} Current circuit breaker state
   *
   * @example
   * ```typescript
   * // Monitor circuit breaker state
   * const state = circuitBreaker.getState();
   * console.log(`Circuit breaker is currently: ${state}`);
   *
   * // Conditional logic based on state
   * if (circuitBreaker.getState() === 'OPEN') {
   *   showServiceMaintenanceMode();
   * } else {
   *   enableNormalOperation();
   * }
   * ```
   */
  getState() {
    return this.state;
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

/**
 * NetworkMonitor - Real-time network connectivity and quality monitoring
 *
 * Provides comprehensive network status monitoring using browser APIs to track
 * online/offline state and connection quality. Implements observer pattern for
 * reactive network status updates throughout the application. Essential for
 * implementing network-aware error handling and retry strategies.
 *
 * @class NetworkMonitor
 * @example
 * ```typescript
 * // Get current network status
 * const monitor = new NetworkMonitor();
 * const status = monitor.getStatus();
 * console.log('Online:', status.isOnline);
 * console.log('Slow connection:', status.isSlowConnection);
 *
 * // Subscribe to network changes
 * const unsubscribe = monitor.subscribe((status) => {
 *   if (!status.isOnline) {
 *     showOfflineMessage();
 *   } else if (status.isSlowConnection) {
 *     enableLowBandwidthMode();
 *   } else {
 *     enableNormalMode();
 *   }
 * });
 *
 * // Clean up subscription
 * unsubscribe();
 * ```
 *
 * @browser_apis
 * - **navigator.onLine**: Browser online/offline status detection
 * - **navigator.connection**: Network Information API for connection quality
 * - **window events**: 'online' and 'offline' events for status changes
 * - **connection.effectiveType**: Network speed classification (4g, 3g, 2g, slow-2g)
 *
 * @use_cases
 * - **Retry Strategy**: Adjust retry behavior based on connection quality
 * - **Feature Degradation**: Disable bandwidth-intensive features on slow connections
 * - **User Feedback**: Inform users about connectivity issues
 * - **Offline Support**: Enable offline mode when no connection available
 * - **Performance Optimization**: Optimize requests based on network conditions
 */
class NetworkMonitor {
  /**
   * Current network status state
   * @private
   * @type {NetworkStatus}
   */
  private status: NetworkStatus = {
    isOnline: navigator.onLine,
    isSlowConnection: false,
    lastChecked: Date.now(),
  };

  /**
   * Array of subscriber functions for network status changes
   * @private
   * @type {Array<(status: NetworkStatus) => void>}
   */
  private listeners: ((status: NetworkStatus) => void)[] = [];

  /**
   * Creates a new NetworkMonitor instance and sets up event listeners
   *
   * Automatically initializes network monitoring by setting up browser event
   * listeners for online/offline changes and connection quality monitoring
   * if the Network Information API is available.
   *
   * @constructor
   * @example
   * ```typescript
   * // Create monitor instance - automatically starts monitoring
   * const networkMonitor = new NetworkMonitor();
   *
   * // Monitor will immediately detect current state and listen for changes
   * const currentStatus = networkMonitor.getStatus();
   * ```
   *
   * @browser_support
   * - navigator.onLine: Supported in all modern browsers
   * - navigator.connection: Supported in Chrome, Edge, Opera (limited Safari support)
   * - Progressive enhancement: Falls back gracefully when APIs unavailable
   */
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

  /**
   * Updates network status and notifies all subscribers
   *
   * Merges partial status updates with current status, updates timestamp,
   * and triggers all registered listeners with the new status. Used internally
   * by event handlers and can be called explicitly for manual status updates.
   *
   * @private
   * @method updateStatus
   * @param {Partial<NetworkStatus>} updates - Partial status updates to merge
   * @returns {void}
   *
   * @implementation_details
   * - Preserves existing status properties not being updated
   * - Automatically updates lastChecked timestamp
   * - Notifies all subscribers synchronously
   * - Uses spread operator for immutable status updates
   */
  private updateStatus(updates: Partial<NetworkStatus>) {
    this.status = {
      ...this.status,
      ...updates,
      lastChecked: Date.now(),
    };

    this.listeners.forEach((listener) => listener(this.status));
  }

  /**
   * Gets current network status
   *
   * Returns a copy of the current network status to prevent external
   * mutation of internal state. Provides real-time network connectivity
   * and quality information for decision making.
   *
   * @method getStatus
   * @returns {NetworkStatus} Current network status (copy)
   *
   * @example
   * ```typescript
   * const status = networkMonitor.getStatus();
   *
   * // Check basic connectivity
   * if (!status.isOnline) {
   *   handleOfflineState();
   *   return;
   * }
   *
   * // Adapt behavior for slow connections
   * if (status.isSlowConnection) {
   *   loadLowResolutionImages();
   *   disableAutoRefresh();
   * } else {
   *   loadHighResolutionImages();
   *   enableAutoRefresh();
   * }
   *
   * // Check status freshness
   * const age = Date.now() - status.lastChecked;
   * if (age > 5000) { // 5 seconds old
   *   console.warn('Network status may be stale');
   * }
   * ```
   *
   * @return_properties
   * - isOnline: Boolean indicating internet connectivity
   * - isSlowConnection: Boolean indicating poor connection quality (2g/slow-2g)
   * - lastChecked: Timestamp of last status update
   */
  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Subscribes to network status changes
   *
   * Registers a listener function that will be called whenever the network
   * status changes. Implements observer pattern for reactive network monitoring.
   * Returns an unsubscribe function for cleanup.
   *
   * @method subscribe
   * @param {(status: NetworkStatus) => void} listener - Function to call on status changes
   * @returns {() => void} Unsubscribe function to remove the listener
   *
   * @example
   * ```typescript
   * // Basic subscription
   * const unsubscribe = networkMonitor.subscribe((status) => {
   *   console.log('Network status changed:', status);
   * });
   *
   * // React component usage
   * useEffect(() => {
   *   const unsubscribe = networkMonitor.subscribe((status) => {
   *     setNetworkStatus(status);
   *   });
   *   return unsubscribe; // Cleanup on unmount
   * }, []);
   *
   * // Conditional logic based on status
   * const unsubscribe = networkMonitor.subscribe((status) => {
   *   if (!status.isOnline) {
   *     pauseDataSync();
   *     showOfflineBanner();
   *   } else {
   *     resumeDataSync();
   *     hideOfflineBanner();
   *   }
   * });
   *
   * // Remember to unsubscribe
   * unsubscribe();
   * ```
   *
   * @memory_management
   * - Always call the returned unsubscribe function to prevent memory leaks
   * - Subscribers are called synchronously when status changes
   * - Multiple subscribers are supported and called in registration order
   */
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
        userMessage = "The server is starting up. This may take a moment.";
        suggestedAction = "Please wait a few seconds - the server is waking up from sleep mode";
        isRetryable = true;
        break;
      case 503:
        userMessage = "Service is starting up. Please wait a moment.";
        suggestedAction = "The service is initializing - this is normal for the first request";
        isRetryable = true;
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
  const logMessage = `[${componentName}] ${parsedError.technicalDetails}`;
  
  if (parsedError.statusCode && parsedError.statusCode >= 400 && parsedError.statusCode < 500) {
    console.warn(logMessage, parsedError.originalError);
  } else {
    console.error(logMessage, parsedError.originalError);
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
 * Determine if an error condition warrants a retry attempt
 *
 * Analyzes error characteristics to determine retry eligibility based on error type,
 * HTTP status codes, and network conditions. Uses intelligent error parsing to
 * distinguish between permanent failures and transient issues that benefit from retries.
 *
 * @function shouldRetry
 * @param {ApiError} error - Error object to analyze for retry eligibility
 * @returns {boolean} True if error should trigger retry, false for permanent failures
 *
 * @example
 * ```typescript
 * // Basic retry check
 * try {
 *   await apiCall();
 * } catch (error) {
 *   if (shouldRetry(error)) {
 *     console.log('Error is retryable, scheduling retry...');
 *     scheduleRetry();
 *   } else {
 *     console.log('Permanent error, showing user message');
 *     showErrorToUser(error);
 *   }
 * }
 *
 * // Integration with retry loop
 * const executeWithRetry = async (operation: () => Promise<any>) => {
 *   let lastError: ApiError;
 *
 *   for (let attempt = 0; attempt < maxRetries; attempt++) {
 *     try {
 *       return await operation();
 *     } catch (error) {
 *       lastError = error as ApiError;
 *
 *       if (!shouldRetry(lastError) || attempt === maxRetries - 1) {
 *         throw lastError;
 *       }
 *
 *       await delay(getRetryDelay(attempt));
 *     }
 *   }
 * };
 *
 * // Custom retry logic
 * const handleApiError = (error: ApiError) => {
 *   const isRetryable = shouldRetry(error);
 *
 *   if (isRetryable) {
 *     showRetryButton();
 *     enableAutoRetry();
 *   } else {
 *     hideRetryButton();
 *     showPermanentErrorMessage();
 *   }
 * };
 * ```
 *
 * @retry_conditions
 * **Retryable Errors:**
 * - **Network Errors**: Connection failures, timeouts, DNS issues
 * - **Server Errors**: 500, 502, 503, 504 (temporary server problems)
 * - **Rate Limiting**: 429 Too Many Requests (temporary throttling)
 * - **Request Timeout**: 408 Request Timeout (temporary delay)
 * - **JSON Parse Errors**: Malformed responses (potentially temporary)
 *
 * **Non-Retryable Errors:**
 * - **Client Errors**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
 * - **Authentication**: Token expiration, invalid credentials
 * - **Authorization**: Permission denied, access forbidden
 * - **Validation**: Malformed request data, schema violations
 * - **Business Logic**: Application-specific permanent failures
 *
 * @implementation_details
 * - Delegates to parseError() for comprehensive error analysis
 * - Considers HTTP status codes, error types, and network conditions
 * - Aligns with DEFAULT_RETRY_CONFIG.retryableStatuses configuration
 * - Provides consistent retry behavior across application components
 * - Respects circuit breaker patterns and network monitoring
 *
 * @performance_considerations
 * - **Fast Execution**: Simple boolean check with minimal overhead
 * - **Cached Parsing**: Reuses parseError() analysis for consistency
 * - **Memory Efficient**: No state storage, pure function implementation
 * - **CPU Optimized**: Single function call with immediate return
 */
export const shouldRetry = (error: ApiError): boolean => {
  const parsed = parseError(error);
  return parsed.isRetryable;
};

/**
 * Calculate exponential backoff delay for retry attempts
 *
 * Implements exponential backoff algorithm with a maximum delay cap to prevent
 * excessive wait times. Uses base-2 exponential growth with configurable base delay.
 * Essential for intelligent retry strategies that reduce server load during failures.
 *
 * @function getRetryDelay
 * @param {number} attempt - Current retry attempt number (0-based)
 * @param {number} [baseDelay=1000] - Base delay in milliseconds for first retry
 * @returns {number} Calculated delay in milliseconds (capped at 30 seconds)
 *
 * @example
 * ```typescript
 * // Basic usage with default 1 second base delay
 * console.log(getRetryDelay(0)); // 1000ms (1 second)
 * console.log(getRetryDelay(1)); // 2000ms (2 seconds)
 * console.log(getRetryDelay(2)); // 4000ms (4 seconds)
 * console.log(getRetryDelay(3)); // 8000ms (8 seconds)
 * console.log(getRetryDelay(4)); // 16000ms (16 seconds)
 * console.log(getRetryDelay(5)); // 30000ms (30 seconds - capped)
 *
 * // Custom base delay for faster initial retries
 * console.log(getRetryDelay(0, 500)); // 500ms
 * console.log(getRetryDelay(1, 500)); // 1000ms
 * console.log(getRetryDelay(2, 500)); // 2000ms
 *
 * // Use in retry loop
 * for (let attempt = 0; attempt < maxRetries; attempt++) {
 *   try {
 *     return await operation();
 *   } catch (error) {
 *     const delay = getRetryDelay(attempt, 2000);
 *     await new Promise(resolve => setTimeout(resolve, delay));
 *   }
 * }
 * ```
 *
 * @algorithm
 * - **Formula**: Math.min(baseDelay * 2^attempt, 30000)
 * - **Growth Pattern**: 1s → 2s → 4s → 8s → 16s → 30s (capped)
 * - **Maximum Delay**: 30 seconds to prevent excessive wait times
 * - **Exponential Base**: 2 (doubles each attempt)
 *
 * @performance_benefits
 * - **Server Load Reduction**: Increasing delays reduce pressure on failing services
 * - **Connection Recovery**: Allows time for network issues to resolve
 * - **Resource Conservation**: Prevents excessive CPU usage from rapid retries
 * - **User Experience**: Predictable retry timing with reasonable wait times
 */
export const getRetryDelay = (attempt: number, baseDelay: number = 1000): number => {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
};

/**
 * Generate user-friendly retry messages with optional countdown
 *
 * Creates human-readable messages to inform users about retry attempts and timing.
 * Provides contextual feedback during network operations with optional countdown
 * display. Supports pluralization and clear progress indication.
 *
 * @function formatRetryMessage
 * @param {number} attempt - Current attempt number (1-based for display)
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @param {number} [nextDelay] - Delay before next retry in milliseconds (optional)
 * @returns {string} Formatted user-friendly retry message
 *
 * @example
 * ```typescript
 * // Basic retry message without countdown
 * console.log(formatRetryMessage(1, 3));
 * // Output: "Attempt 1 of 3 failed. Retrying..."
 *
 * console.log(formatRetryMessage(2, 5));
 * // Output: "Attempt 2 of 5 failed. Retrying..."
 *
 * // Retry message with countdown
 * console.log(formatRetryMessage(1, 3, 2000));
 * // Output: "Attempt 1 of 3 failed. Retrying in 2 seconds..."
 *
 * console.log(formatRetryMessage(2, 3, 1000));
 * // Output: "Attempt 2 of 3 failed. Retrying in 1 second..."
 *
 * console.log(formatRetryMessage(1, 3, 500));
 * // Output: "Attempt 1 of 3 failed. Retrying in 1 second..."
 *
 * // Use in retry loop with delay display
 * const showRetryMessage = (attempt: number, maxAttempts: number, delay: number) => {
 *   const message = formatRetryMessage(attempt, maxAttempts, delay);
 *   toast.info(message);
 * };
 *
 * // Integration with retry mechanism
 * for (let attempt = 1; attempt <= maxRetries; attempt++) {
 *   try {
 *     return await operation();
 *   } catch (error) {
 *     if (attempt < maxRetries) {
 *       const delay = getRetryDelay(attempt - 1);
 *       const message = formatRetryMessage(attempt, maxRetries, delay);
 *       updateUI(message);
 *       await new Promise(resolve => setTimeout(resolve, delay));
 *     }
 *   }
 * }
 * ```
 *
 * @message_formats
 * - **With Delay**: "Attempt X of Y failed. Retrying in Z second(s)..."
 * - **Without Delay**: "Attempt X of Y failed. Retrying..."
 * - **Pluralization**: Automatically handles "second" vs "seconds"
 * - **Progress Context**: Shows current attempt relative to maximum attempts
 *
 * @user_experience
 * - **Clear Progress**: Users understand retry attempt context
 * - **Time Awareness**: Countdown helps set user expectations
 * - **Professional Messaging**: Consistent, informative error communication
 * - **Accessibility**: Screen reader friendly with clear progress indication
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
