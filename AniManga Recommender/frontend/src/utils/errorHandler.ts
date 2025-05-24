/**
 * Error Handling Utilities
 * Provides consistent error parsing and user-friendly messages with full TypeScript support
 */

import { ApiError, ParsedError, ErrorHandler, ValidationStructure, ApiOperation } from "../types";

/**
 * HTTP Status Code Messages
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request - please check your input",
  401: "Authentication required",
  403: "Access denied",
  404: "The requested resource was not found",
  408: "Request timeout - please try again",
  429: "Too many requests - please wait a moment before trying again",
  500: "Internal server error - please try again later",
  502: "Bad gateway - server is temporarily unavailable",
  503: "Service unavailable - please try again later",
  504: "Gateway timeout - the server took too long to respond",
};

/**
 * Network Error Types
 */
const NETWORK_ERRORS = {
  TIMEOUT: "Request timed out. Please check your connection and try again.",
  NETWORK: "Network error. Please check your internet connection.",
  CORS: "Cross-origin request blocked. Please contact support if this persists.",
  PARSE: "Invalid server response. Please try again or contact support.",
} as const;

/**
 * Parse axios error and return user-friendly message with technical details
 *
 * @param error - The error object from axios or other source
 * @param context - Context where the error occurred (e.g., "fetching items")
 * @returns Parsed error with userMessage and technicalDetails
 */
export function parseError(error: ApiError, context: string = "performing this action"): ParsedError {
  let userMessage = `Failed ${context}`;
  let technicalDetails = error.message || "Unknown error";
  let statusCode: number | null = null;

  // Handle axios errors
  if (error.response) {
    // Server responded with error status
    statusCode = error.response.status;
    const serverMessage = error.response.data?.message || error.response.data?.error;

    userMessage =
      HTTP_STATUS_MESSAGES[statusCode] || `Server error (${statusCode}) occurred while ${context}`;

    if (serverMessage) {
      userMessage += `: ${serverMessage}`;
    }

    technicalDetails = `HTTP ${statusCode}: ${JSON.stringify(error.response.data, null, 2)}`;
  } else if (error.request) {
    // Request made but no response received
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      userMessage = NETWORK_ERRORS.TIMEOUT;
    } else if (error.message.includes("Network Error")) {
      userMessage = NETWORK_ERRORS.NETWORK;
    } else {
      userMessage = `No response received while ${context}. Please check your connection.`;
    }

    technicalDetails = `Request failed: ${error.message}`;
  } else if (error.name === "SyntaxError" && error.message.includes("JSON")) {
    // JSON parsing error
    userMessage = NETWORK_ERRORS.PARSE;
    technicalDetails = `JSON Parse Error: ${error.message}`;
  } else {
    // Other errors (network, CORS, etc.)
    if (error.message.includes("CORS")) {
      userMessage = NETWORK_ERRORS.CORS;
    } else if (error.message.includes("NetworkError")) {
      userMessage = NETWORK_ERRORS.NETWORK;
    } else {
      userMessage = `An unexpected error occurred while ${context}`;
    }

    technicalDetails = error.stack || error.message || "Unknown error";
  }

  return {
    userMessage,
    technicalDetails,
    statusCode,
    originalError: error,
  };
}

/**
 * Log error with appropriate level based on severity
 *
 * @param parsedError - Error object from parseError()
 * @param component - Component name where error occurred
 */
export function logError(parsedError: ParsedError, component: string = "Unknown"): void {
  const { statusCode, technicalDetails, originalError } = parsedError;

  // Determine log level based on error type
  const isUserError = statusCode !== null && statusCode >= 400 && statusCode < 500;
  const isServerError = statusCode !== null && statusCode >= 500;

  const logMessage = `[${component}] ${technicalDetails}`;

  if (isUserError) {
    console.warn(logMessage, originalError);
  } else if (isServerError || !statusCode) {
    console.error(logMessage, originalError);
  } else {
    console.info(logMessage);
  }
}

/**
 * Create a standardized error handler for components
 *
 * @param component - Component name
 * @param setError - Error state setter
 * @returns Error handler function
 */
export function createErrorHandler(component: string, setError: (error: string) => void): ErrorHandler {
  return (error: Error, context?: string): ParsedError => {
    const parsedError = parseError(error as ApiError, context);
    logError(parsedError, component);
    setError(parsedError.userMessage);
    return parsedError;
  };
}

/**
 * Retry logic for failed operations
 *
 * @param operation - Async operation to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param delay - Delay between retries in milliseconds
 * @returns Result of the operation
 */
export async function retryOperation<T>(
  operation: ApiOperation<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<{ data: T }> {
  let lastError: Error;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const apiError = error as ApiError;

      // Don't retry on client errors (4xx) except 408 (timeout)
      if (
        apiError.response?.status &&
        apiError.response.status >= 400 &&
        apiError.response.status < 500 &&
        apiError.response.status !== 408
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        console.warn(`Operation failed, retrying in ${currentDelay}ms (attempt ${attempt}/${maxRetries})`);
        // eslint-disable-next-line no-loop-func
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= 1.5; // Exponential backoff
      }
    }
  }

  throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError!.message}`);
}

/**
 * Validate response data structure
 *
 * @param data - Response data to validate
 * @param expectedStructure - Expected structure definition
 * @returns True if valid
 * @throws Error if validation fails
 */
export function validateResponseData(data: any, expectedStructure: ValidationStructure): boolean {
  if (!data) {
    throw new Error("Response data is null or undefined");
  }

  for (const [key, type] of Object.entries(expectedStructure)) {
    if (type === "required" && !(key in data)) {
      throw new Error(`Missing required field: ${key}`);
    }

    if (key in data) {
      const actualType = Array.isArray(data[key]) ? "array" : typeof data[key];
      if (type !== "any" && actualType !== type) {
        throw new Error(`Invalid field type for ${key}: expected ${type}, got ${actualType}`);
      }
    }
  }

  return true;
}
