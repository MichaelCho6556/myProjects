/**
 * Unit Tests for errorHandler Utility
 * Tests error parsing, handling, and user message generation
 */

import {
  parseError,
  logError,
  createErrorHandler,
  retryOperation,
  validateResponseData,
} from "../../utils/errorHandler";
import { ApiError, ValidationStructure } from "../../types";

// Mock console methods to prevent test output noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe("errorHandler Utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseError Function", () => {
    it("parses network errors correctly", () => {
      const networkError = new Error("Network Error") as ApiError;
      networkError.name = "NetworkError";

      const result = parseError(networkError);

      expect(result.userMessage).toContain("network");
      expect(result.statusCode).toBeNull();
      expect(result.technicalDetails).toContain("Network Error");
      expect(result.originalError).toBe(networkError);
    });

    it("parses timeout errors correctly", () => {
      const timeoutError = new Error("Request timeout") as ApiError;
      timeoutError.code = "ECONNABORTED";

      const result = parseError(timeoutError);

      expect(result.userMessage).toContain("timeout");
      expect(result.statusCode).toBeNull();
      expect(result.technicalDetails).toContain("Request timeout");
    });

    it("parses API errors with status codes", () => {
      const apiError = new Error("API Error") as ApiError;
      apiError.response = {
        status: 404,
        data: { message: "Not found" },
        statusText: "Not Found",
      };

      const result = parseError(apiError);

      expect(result.statusCode).toBe(404);
      expect(result.userMessage).toContain("not found");
      expect(result.technicalDetails).toContain("404");
    });

    it("handles 400 Bad Request errors", () => {
      const badRequestError = new Error("Bad Request") as ApiError;
      badRequestError.response = {
        status: 400,
        data: { error: "Invalid parameters" },
        statusText: "Bad Request",
      };

      const result = parseError(badRequestError);

      expect(result.statusCode).toBe(400);
      expect(result.userMessage).toContain("Bad request");
      expect(result.technicalDetails).toContain("400");
    });

    it("handles 401 Unauthorized errors", () => {
      const unauthorizedError = new Error("Unauthorized") as ApiError;
      unauthorizedError.response = {
        status: 401,
        data: { error: "Authentication required" },
        statusText: "Unauthorized",
      };

      const result = parseError(unauthorizedError);

      expect(result.statusCode).toBe(401);
      expect(result.userMessage).toContain("Authentication required");
      expect(result.technicalDetails).toContain("401");
    });

    it("handles 500 Internal Server errors", () => {
      const serverError = new Error("Internal Server Error") as ApiError;
      serverError.response = {
        status: 500,
        data: { error: "Server error" },
        statusText: "Internal Server Error",
      };

      const result = parseError(serverError);

      expect(result.statusCode).toBe(500);
      expect(result.userMessage).toContain("server error");
      expect(result.technicalDetails).toContain("500");
    });

    it("handles errors without response object", () => {
      const genericError = new Error("Generic error message") as ApiError;

      const result = parseError(genericError);

      expect(result.statusCode).toBeNull();
      expect(result.userMessage).toContain("unexpected");
      expect(result.technicalDetails).toContain("Generic error message");
      expect(result.originalError).toBe(genericError);
    });

    it("handles request timeout errors", () => {
      const timeoutError = new Error("timeout of 5000ms exceeded") as ApiError;
      timeoutError.request = {};

      const result = parseError(timeoutError);

      expect(result.userMessage).toContain("timeout");
      expect(result.statusCode).toBeNull();
    });

    it("handles JSON parsing errors", () => {
      const jsonError = new Error("Unexpected token") as ApiError;
      jsonError.name = "SyntaxError";
      jsonError.message = "Unexpected token in JSON";

      const result = parseError(jsonError);

      expect(result.userMessage).toContain("Invalid server response");
      expect(result.technicalDetails).toContain("JSON Parse Error");
    });

    it("uses custom context in error messages", () => {
      const error = new Error("Test error") as ApiError;
      const context = "loading user data";

      const result = parseError(error, context);

      expect(result.userMessage).toContain("loading user data");
    });
  });

  describe("logError Function", () => {
    it("logs user errors as warnings", () => {
      const parsedError = {
        userMessage: "Bad request",
        technicalDetails: "HTTP 400: Bad Request",
        statusCode: 400,
        originalError: new Error("Bad Request"),
      };

      logError(parsedError, "TestComponent");

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("[TestComponent]"),
        parsedError.originalError
      );
    });

    it("logs server errors as errors", () => {
      const parsedError = {
        userMessage: "Server error",
        technicalDetails: "HTTP 500: Internal Server Error",
        statusCode: 500,
        originalError: new Error("Server Error"),
      };

      logError(parsedError, "TestComponent");

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[TestComponent]"),
        parsedError.originalError
      );
    });

    it("logs unknown errors as errors", () => {
      const parsedError = {
        userMessage: "Unknown error",
        technicalDetails: "Unknown error occurred",
        statusCode: null,
        originalError: new Error("Unknown"),
      };

      logError(parsedError, "TestComponent");

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[TestComponent]"),
        parsedError.originalError
      );
    });

    it("uses default component name when not provided", () => {
      const parsedError = {
        userMessage: "Test error",
        technicalDetails: "Test details",
        statusCode: null,
        originalError: new Error("Test"),
      };

      logError(parsedError);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[Unknown]"),
        parsedError.originalError
      );
    });
  });

  describe("createErrorHandler Function", () => {
    it("creates error handler that sets error state", () => {
      const setError = jest.fn();
      const handler = createErrorHandler("TestComponent", setError);
      const error = new Error("Test error");

      const result = handler(error, "test context");

      expect(setError).toHaveBeenCalledWith(result.userMessage);
      expect(result.originalError).toBe(error);
    });

    it("logs errors through the created handler", () => {
      const setError = jest.fn();
      const handler = createErrorHandler("TestComponent", setError);
      const error = new Error("Test error");

      handler(error);

      expect(console.error).toHaveBeenCalled();
    });

    it("handles context in created error handler", () => {
      const setError = jest.fn();
      const handler = createErrorHandler("TestComponent", setError);
      const error = new Error("Test error");
      const context = "custom operation";

      const result = handler(error, context);

      expect(result.userMessage).toContain(context);
    });
  });

  describe("retryOperation Function", () => {
    it("succeeds on first attempt", async () => {
      const operation = jest.fn().mockResolvedValue({ data: "success" });

      const result = await retryOperation(operation);

      expect(result.data).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("retries on failure and eventually succeeds", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValue({ data: "success" });

      const result = await retryOperation(operation, 3, 10);

      expect(result.data).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("fails after max retries", async () => {
      const operation = jest.fn().mockRejectedValue(new Error("Persistent failure"));

      await expect(retryOperation(operation, 2, 10)).rejects.toThrow("Persistent failure");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("does not retry on 4xx client errors", async () => {
      const clientError = new Error("Client error") as ApiError;
      clientError.response = { status: 400, data: {}, statusText: "Bad Request" };
      const operation = jest.fn().mockRejectedValue(clientError);

      await expect(retryOperation(operation, 3, 10)).rejects.toThrow("Client error");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("retries on 408 timeout errors", async () => {
      const timeoutError = new Error("Timeout") as ApiError;
      timeoutError.response = { status: 408, data: {}, statusText: "Timeout" };
      const operation = jest.fn().mockRejectedValueOnce(timeoutError).mockResolvedValue({ data: "success" });

      const result = await retryOperation(operation, 2, 10);

      expect(result.data).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe("validateResponseData Function", () => {
    it("validates correct data structure", () => {
      const data = { name: "John", age: 30, active: true };
      const structure: ValidationStructure = {
        name: "required",
        age: "number",
        active: "boolean",
      };

      const result = validateResponseData(data, structure);

      expect(result).toBe(true);
    });

    it("throws error for missing required fields", () => {
      const data = { age: 30 };
      const structure: ValidationStructure = {
        name: "required",
        age: "number",
      };

      expect(() => validateResponseData(data, structure)).toThrow("Missing required field: name");
    });

    it("throws error for wrong field types", () => {
      const data = { name: 123, age: "thirty" };
      const structure: ValidationStructure = {
        name: "string",
        age: "number",
      };

      expect(() => validateResponseData(data, structure)).toThrow("Invalid field type");
    });

    it("validates array fields correctly", () => {
      const data = { items: ["a", "b", "c"] };
      const structure: ValidationStructure = {
        items: "array",
      };

      const result = validateResponseData(data, structure);

      expect(result).toBe(true);
    });

    it("accepts any type for 'any' validation", () => {
      const data = { field: "anything" };
      const structure: ValidationStructure = {
        field: "any",
      };

      const result = validateResponseData(data, structure);

      expect(result).toBe(true);
    });

    it("throws error for null/undefined data", () => {
      const structure: ValidationStructure = { name: "string" };
      expect(() => validateResponseData(null, structure)).toThrow("null or undefined");
      expect(() => validateResponseData(undefined, structure)).toThrow("null or undefined");
    });

    it("validates object fields correctly", () => {
      const data = { config: { setting: "value" } };
      const structure: ValidationStructure = {
        config: "object",
      };

      const result = validateResponseData(data, structure);

      expect(result).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    it("works with full error handling workflow", () => {
      const setError = jest.fn();
      const handler = createErrorHandler("IntegrationTest", setError);
      const apiError = new Error("API failed") as ApiError;
      apiError.response = {
        status: 500,
        data: { error: "Internal server error" },
        statusText: "Internal Server Error",
      };

      const result = handler(apiError, "fetching data");

      expect(setError).toHaveBeenCalledWith(result.userMessage);
      expect(result.statusCode).toBe(500);
      expect(result.userMessage).toContain("server");
      expect(console.error).toHaveBeenCalled();
    });

    it("handles complex validation scenarios", () => {
      const complexData = {
        id: 1,
        user: { name: "John", email: "john@example.com" },
        settings: ["theme", "notifications"],
        metadata: { created: "2023-01-01" },
      };

      const structure: ValidationStructure = {
        id: "required",
        user: "object",
        settings: "array",
        metadata: "object",
      };

      const result = validateResponseData(complexData, structure);

      expect(result).toBe(true);
    });
  });

  describe("Error Message Quality", () => {
    it("provides user-friendly messages for common errors", () => {
      const networkError = new Error("Network Error") as ApiError;
      networkError.request = {};

      const result = parseError(networkError, "loading page");

      expect(result.userMessage).toMatch(/connection|network/i);
      expect(result.userMessage).not.toContain("stacktrace");
      expect(result.userMessage).not.toContain("undefined");
    });

    it("includes helpful context in error messages", () => {
      const error = new Error("Failed") as ApiError;
      const contexts = ["saving data", "loading user profile", "updating settings"];

      contexts.forEach((context) => {
        const result = parseError(error, context);
        expect(result.userMessage.toLowerCase()).toContain(context.toLowerCase());
      });
    });

    it("handles edge cases gracefully", () => {
      const edgeCases = [
        new Error("") as ApiError,
        { message: "No stack trace" } as ApiError,
        { name: "CustomError", message: "Custom message" } as ApiError,
      ];

      edgeCases.forEach((error) => {
        expect(() => parseError(error)).not.toThrow();
        const result = parseError(error);
        expect(result.userMessage).toBeDefined();
        expect(result.technicalDetails).toBeDefined();
      });
    });
  });
});
