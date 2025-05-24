/**
 * Error Handling Utilities
 * Provides consistent error parsing and user-friendly messages
 */

/**
 * HTTP Status Code Messages
 */
const HTTP_STATUS_MESSAGES = {
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
};

/**
 * Parse axios error and return user-friendly message with technical details
 *
 * @param {Error} error - The error object from axios or other source
 * @param {string} context - Context where the error occurred (e.g., "fetching items")
 * @returns {Object} Parsed error with userMessage and technicalDetails
 */
export function parseError(error, context = "performing this action") {
  let userMessage = `Failed ${context}`;
  let technicalDetails = error.message || "Unknown error";
  let statusCode = null;

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
 * @param {Object} parsedError - Error object from parseError()
 * @param {string} component - Component name where error occurred
 */
export function logError(parsedError, component = "Unknown") {
  const { statusCode, technicalDetails, originalError } = parsedError;

  // Determine log level based on error type
  const isUserError = statusCode >= 400 && statusCode < 500;
  const isServerError = statusCode >= 500;

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
 * @param {string} component - Component name
 * @param {Function} setError - Error state setter
 * @returns {Function} Error handler function
 */
export function createErrorHandler(component, setError) {
  return (error, context) => {
    const parsedError = parseError(error, context);
    logError(parsedError, component);
    setError(parsedError.userMessage);
    return parsedError;
  };
}

/**
 * Retry logic for failed operations
 *
 * @param {Function} operation - Async operation to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise} Result of the operation
 */
export async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) except 408 (timeout)
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 408) {
        throw error;
      }

      if (attempt < maxRetries) {
        console.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
  }

  throw lastError;
}

/**
 * Validate response data structure
 *
 * @param {any} data - Response data to validate
 * @param {Object} expectedStructure - Expected structure definition
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateResponseData(data, expectedStructure) {
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
