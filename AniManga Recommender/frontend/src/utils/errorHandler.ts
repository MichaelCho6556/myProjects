/**
 * Error Handler Utility
 * Provides error parsing, logging, and user-friendly message generation
 */

import { ApiError, ValidationStructure } from "../types";

export interface ParsedError {
  userMessage: string;
  technicalDetails: string;
  statusCode: number | null;
  originalError: ApiError;
}

/**
 * Parse different types of errors into a standardized format
 */
export const parseError = (error: ApiError, context?: string): ParsedError => {
  let userMessage = "An unexpected error occurred";
  let technicalDetails = "Unknown error";
  let statusCode: number | null = null;

  // Handle network errors
  if (error.name === "NetworkError" || error.request) {
    userMessage = "Unable to connect to the server. Please check your internet connection and try again.";
    technicalDetails = `Network Error: ${error.message || "Connection failed"}`;
  }
  // Handle timeout errors
  else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    userMessage = "The request timed out. Please try again.";
    technicalDetails = `Timeout Error: ${error.message}`;
  }
  // Handle JSON parsing errors
  else if (error.name === "SyntaxError" && error.message?.includes("JSON")) {
    userMessage = "Invalid server response. Please try again.";
    technicalDetails = `JSON Parse Error: ${error.message}`;
  }
  // Handle API errors with response
  else if (error.response) {
    statusCode = error.response.status;

    switch (statusCode) {
      case 400:
        userMessage = "Bad request. Please check your input and try again.";
        break;
      case 401:
        userMessage = "Authentication required. Please log in and try again.";
        break;
      case 404:
        userMessage = "The requested item was not found.";
        break;
      case 408:
        userMessage = "Request timeout. Please try again.";
        break;
      case 500:
        userMessage = "A server error occurred. Please try again later.";
        break;
      default:
        userMessage = `Server error (${statusCode}). Please try again later.`;
    }

    technicalDetails = `HTTP ${statusCode}: ${error.response.statusText || "Server Error"}`;
  }
  // Handle generic errors
  else {
    userMessage = "An unexpected error occurred. Please try again.";
    technicalDetails = error.message || "Unknown error occurred";
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
  };
};

/**
 * Log errors with appropriate severity levels
 */
export const logError = (parsedError: ParsedError, componentName: string = "Unknown"): void => {
  const { statusCode, originalError } = parsedError;
  const logPrefix = `[${componentName}] Error:`;

  // Log user errors (4xx) as warnings
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    console.warn(logPrefix, originalError);
  } else {
    // Log server errors and unknown errors as errors
    console.error(logPrefix, originalError);
  }
};

/**
 * Create an error handler function that sets error state
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
 * Retry operation with exponential backoff
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: ApiError = new Error("Operation failed") as ApiError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as ApiError;

      // Don't retry on 4xx client errors (except 408 timeout)
      if (
        lastError.response?.status &&
        lastError.response.status >= 400 &&
        lastError.response.status < 500 &&
        lastError.response.status !== 408
      ) {
        throw lastError || new Error("Unknown error occurred");
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw lastError || new Error("Unknown error occurred");
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
    }
  }

  throw lastError || new Error("Unknown error occurred");
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
