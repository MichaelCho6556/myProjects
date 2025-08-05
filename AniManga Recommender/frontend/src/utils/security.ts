import CryptoJS from "crypto-js";
import { CustomList } from "../types/social";

/**
 * Security Utilities Module - Comprehensive security functions for the AniManga Recommender application
 *
 * This module provides a complete suite of security utilities designed to protect the AniManga
 * Recommender application from various security threats including XSS attacks, CSRF vulnerabilities,
 * SQL injection attempts, command injection, path traversal attacks, and other malicious activities.
 * Built with defense-in-depth principles, input validation, encryption, and rate limiting capabilities.
 *
 * @module SecurityUtils
 * @author Michael Cho
 * @since v1.0.0
 * @updated v1.2.0 - Added advanced attack pattern detection and secure storage encryption
 *
 * @security_features
 * - **CSRF Protection**: Token generation, validation, and management
 * - **Input Sanitization**: Multi-layer XSS and injection attack prevention
 * - **Input Validation**: Strict pattern detection and rejection of malicious content
 * - **Secure Storage**: Encrypted localStorage with AES encryption and fallback mechanisms
 * - **Password Security**: Comprehensive strength validation with detailed feedback
 * - **Rate Limiting**: Configurable rate limiting for brute force attack prevention
 *
 * @threat_protection
 * - **XSS Attacks**: Script injection prevention through input sanitization
 * - **CSRF Attacks**: Token-based request validation system
 * - **SQL Injection**: Pattern detection for SQL manipulation attempts
 * - **Command Injection**: Shell command detection and blocking
 * - **Path Traversal**: Directory traversal attack prevention
 * - **Template Injection**: Template engine exploit protection
 * - **Brute Force**: Rate limiting for authentication and sensitive operations
 *
 * @performance_considerations
 * - **Efficient Pattern Matching**: Optimized regex patterns for security checks
 * - **Memory Management**: Map-based storage for rate limiting with automatic cleanup
 * - **Encryption Overhead**: AES encryption with graceful fallback for performance
 * - **Session Storage**: Lightweight CSRF token storage using sessionStorage
 * - **Cache-Friendly**: Security functions designed for repeated calls with minimal overhead
 *
 * @dependencies
 * - crypto-js: AES encryption library for secure storage and token generation
 * - Browser APIs: sessionStorage, localStorage for secure data persistence
 * - Environment Variables: REACT_APP_ENCRYPTION_KEY for secure storage encryption
 */

// CSRF Token Management
const CSRF_TOKEN_KEY = "csrf_token";

export const csrfUtils = {
  generateToken(): string {
    const token = CryptoJS.lib.WordArray.random(32).toString();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    return token;
  },

  getToken(): string | null {
    return sessionStorage.getItem(CSRF_TOKEN_KEY);
  },

  validateToken(token: string): boolean {
    const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    return storedToken === token && token.length === 64;
  },

  removeToken(): void {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
  },
};

// Input Sanitization - Enhanced for Advanced Attacks with Complete Multi-Character Replacement
export const sanitizeInput = (input: string): string => {
  let sanitized = input;
  let previousValue: string;
  
  // Apply sanitization in a loop until no more changes occur
  // This ensures complete removal of patterns like "<<>>" which would become "<>" after one pass
  do {
    previousValue = sanitized;
    sanitized = sanitized
      .replace(/[<>]/g, "") // Remove < and > to prevent basic XSS
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers like onclick=
      .replace(/\.\.\//g, "") // Block path traversal attacks
      .replace(/\{\{.*?\}\}/g, "") // Block template injection {{ }}
      .replace(/\$\{.*?\}/g, "") // Block expression injection ${ }
      .replace(/\(\)\s*\{.*?\}/g, "") // Block shell function injection
      .replace(/;\s*echo\s+/gi, "") // Block echo commands
      .replace(/;\s*cat\s+/gi, "") // Block cat commands
      .replace(/;\s*ls\s+/gi, "") // Block ls commands
      .replace(/;\s*rm\s+/gi, "") // Block rm commands
      .replace(/DROP\s+TABLE/gi, ""); // Block SQL DROP TABLE (backup)
  } while (sanitized !== previousValue);
  
  return sanitized.trim();
};

// ✅ NEW: Search-specific sanitization function that preserves spaces and normal search terms
export const sanitizeSearchInput = (input: string): string => {
  // For search queries, we want to be less aggressive to allow legitimate search terms
  // while still protecting against dangerous patterns
  let sanitized = input;
  let previousValue: string;
  
  // Apply sanitization in a loop until no more changes occur
  do {
    previousValue = sanitized;
    sanitized = sanitized
      .replace(/[<>]/g, "") // Remove < and > to prevent basic XSS
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers like onclick=
      .replace(/\.\.\//g, "") // Block path traversal attacks
      .replace(/\{\{.*?\}\}/g, "") // Block template injection {{ }}
      .replace(/\$\{.*?\}/g, "") // Block expression injection ${ }
      .replace(/;\s*(echo|cat|ls|rm|curl|wget|nc|bash|sh)/gi, "") // Block command injection
      .replace(/(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)\s+(TABLE|DATABASE)/gi, ""); // Block SQL injection
  } while (sanitized !== previousValue);
  
  // Preserve spaces and normal punctuation for search
  return sanitized
    .replace(/^\s+|\s+$/g, "") // Only trim leading/trailing spaces
    .replace(/\s+/g, " "); // Normalize multiple spaces to single space
};

// ✅ NEW: Advanced Input Validation - Strict Rejection
export const validateInput = (
  input: string,
  maxLength: number = 100
): { isValid: boolean; sanitized: string } => {
  // Length validation
  if (input.length > maxLength) {
    return { isValid: false, sanitized: "" };
  }

  // Dangerous pattern detection - REJECT if found
  const dangerousPatterns = [
    /\.\.\//, // Path traversal
    /\{\{.*?\}\}/, // Template injection {{ }}
    /\$\{.*?\}/, // Expression injection ${ }
    /\(\)\s*\{.*?\}/, // Shell function injection
    /;\s*(echo|cat|ls|rm|curl|wget|nc|bash|sh)/gi, // Command injection
    /[<>'"&]/, // Potential XSS characters
    /(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)\s+(TABLE|DATABASE)/gi, // SQL injection
  ];

  const hasDangerousPattern = dangerousPatterns.some((pattern) => pattern.test(input));

  if (hasDangerousPattern) {
    return { isValid: false, sanitized: "" };
  }

  // If passes validation, sanitize and return
  const sanitized = sanitizeInput(input);
  return { isValid: true, sanitized };
};

// ✅ NEW: List-specific sanitization function for CustomList data
export const sanitizeListData = (data: Partial<CustomList>): Partial<CustomList> => {
  return {
    ...data,
    title: data.title ? sanitizeInput(data.title) : '',
    description: data.description ? sanitizeInput(data.description) : '',
    tags: data.tags?.map(tag => sanitizeInput(tag)) || []
  };
};

/**
 * Encryption key for secure storage operations
 * Uses environment variable for production security, fallback for development
 */
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || "default-encryption-key";

/**
 * SecureStorage - Encrypted localStorage wrapper with AES encryption and fallback mechanisms
 *
 * Provides a secure alternative to standard localStorage by implementing AES encryption
 * for sensitive data storage. Includes comprehensive error handling with graceful fallback
 * to unencrypted storage when encryption fails, ensuring application stability while
 * maintaining security when possible.
 *
 * @namespace secureStorage
 * @example
 * ```typescript
 * // Store sensitive user preferences securely
 * secureStorage.setItem('userPreferences', JSON.stringify({
 *   theme: 'dark',
 *   notifications: true,
 *   apiKey: 'sensitive-api-key'
 * }));
 *
 * // Retrieve and decrypt sensitive data
 * const preferences = secureStorage.getItem('userPreferences');
 * if (preferences) {
 *   const parsedPrefs = JSON.parse(preferences);
 *   console.log('Secure preferences:', parsedPrefs);
 * }
 *
 * // Clean up sensitive data
 * secureStorage.removeItem('userPreferences');
 *
 * // Secure session token storage
 * const sessionToken = 'jwt-token-here';
 * secureStorage.setItem('authToken', sessionToken);
 * ```
 *
 * @security_features
 * - **AES Encryption**: Military-grade AES encryption for data protection
 * - **Fallback Mechanism**: Graceful degradation to regular localStorage on encryption failure
 * - **Error Handling**: Comprehensive error catching with warning logging
 * - **Environment Security**: Uses environment variables for production encryption keys
 * - **Data Integrity**: Ensures data can be retrieved even if encryption fails
 *
 * @encryption_details
 * - **Algorithm**: AES (Advanced Encryption Standard) encryption
 * - **Key Source**: Environment variable REACT_APP_ENCRYPTION_KEY
 * - **Fallback Key**: Default development key for local testing
 * - **Format**: Base64-encoded encrypted strings for localStorage compatibility
 * - **Decryption**: UTF-8 string conversion with error recovery
 *
 * @performance_impact
 * - **Encryption Overhead**: Minimal performance impact for small data
 * - **Memory Usage**: Temporary encryption/decryption buffers
 * - **Storage Size**: Encrypted data is slightly larger than plain text
 * - **Fallback Performance**: Regular localStorage speed when encryption fails
 */
export const secureStorage = {
  /**
   * Securely stores data in localStorage with AES encryption
   *
   * Encrypts the provided value using AES encryption before storing in localStorage.
   * Implements fallback mechanism to store unencrypted data if encryption fails,
   * ensuring application functionality while attempting to maintain security.
   *
   * @method setItem
   * @param {string} key - The storage key for the data
   * @param {string} value - The value to encrypt and store
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Store user authentication token
   * secureStorage.setItem('authToken', 'jwt-token-string');
   *
   * // Store sensitive user data
   * const userData = JSON.stringify({ id: 123, email: 'user@example.com' });
   * secureStorage.setItem('userData', userData);
   *
   * // Store API keys securely
   * secureStorage.setItem('apiKey', process.env.REACT_APP_API_KEY);
   * ```
   *
   * @error_handling
   * - Catches encryption errors and logs warnings
   * - Falls back to unencrypted storage on encryption failure
   * - Maintains application functionality regardless of encryption status
   *
   * @security_considerations
   * - Encryption key should be properly configured in production
   * - Fallback provides availability over confidentiality
   * - Consider data sensitivity when choosing to use this method
   */
  setItem(key: string, value: string): void {
    try {
      const encrypted = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.warn("Failed to encrypt and store data:", error);
      // Fallback to regular localStorage
      localStorage.setItem(key, value);
    }
  },

  /**
   * Retrieves and decrypts data from localStorage
   *
   * Attempts to decrypt stored data using AES decryption. If decryption fails,
   * returns the raw stored value as fallback. Handles various error scenarios
   * including missing data, decryption failures, and storage access issues.
   *
   * @method getItem
   * @param {string} key - The storage key to retrieve
   * @returns {string | null} Decrypted value, fallback value, or null if not found
   *
   * @example
   * ```typescript
   * // Retrieve encrypted authentication token
   * const authToken = secureStorage.getItem('authToken');
   * if (authToken) {
   *   console.log('Retrieved token:', authToken);
   * }
   *
   * // Retrieve and parse encrypted user data
   * const userDataString = secureStorage.getItem('userData');
   * if (userDataString) {
   *   const userData = JSON.parse(userDataString);
   *   console.log('User data:', userData);
   * }
   *
   * // Check if sensitive data exists
   * const apiKey = secureStorage.getItem('apiKey');
   * if (!apiKey) {
   *   console.warn('API key not found in secure storage');
   * }
   * ```
   *
   * @error_handling
   * - Returns null for missing keys
   * - Falls back to raw encrypted data if decryption fails
   * - Logs warnings for decryption errors
   * - Handles CryptoJS decryption exceptions gracefully
   *
   * @return_values
   * - Decrypted string: Successful decryption of stored data
   * - Encrypted string: Fallback when decryption fails but data exists
   * - null: No data found for the specified key
   */
  getItem(key: string): string | null {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;

      const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      return decrypted || encrypted; // Fallback if decryption fails
    } catch (error) {
      console.warn("Failed to decrypt stored data:", error);
      return localStorage.getItem(key); // Fallback to regular localStorage
    }
  },

  /**
   * Removes data from localStorage
   *
   * Deletes the specified key and its associated data from localStorage.
   * Works regardless of whether the data was encrypted or stored as fallback.
   *
   * @method removeItem
   * @param {string} key - The storage key to remove
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Remove authentication token on logout
   * secureStorage.removeItem('authToken');
   *
   * // Clean up user session data
   * secureStorage.removeItem('userData');
   * secureStorage.removeItem('userPreferences');
   *
   * // Remove sensitive API keys
   * secureStorage.removeItem('apiKey');
   * ```
   *
   * @security_note
   * - Always remove sensitive data when no longer needed
   * - Consider clearing all related data during logout processes
   * - Removal is immediate and cannot be undone
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
};

// URL Sanitization - Comprehensive scheme validation
export const sanitizeUrl = (url: string): string => {
  if (!url) return "";
  
  // Decode URL to handle encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    // If decoding fails, use original URL
    decodedUrl = url;
  }
  
  // Convert to lowercase for case-insensitive comparison
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // List of dangerous URL schemes
  const dangerousSchemes = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'chrome:',
    'chrome-extension:',
    'ms-appx:',
    'ms-appx-web:',
    'ms-local-stream:',
    'res:',
    'ie.http:',
    'mk:',
    'mhtml:',
    'view-source:',
    'ws:',
    'wss:',
    'ftp:',
    'intent:',
    'web+app:',
    'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return "about:blank"; // Safe fallback URL
    }
  }
  
  // Additional validation for relative URLs that might be malicious
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return "about:blank";
  }
  
  // If no dangerous patterns found, return the original URL
  return url;
};

// URL Validation - Check if URL is safe to use
export const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  
  const sanitized = sanitizeUrl(url);
  
  // If URL was sanitized to about:blank, it's not valid
  if (sanitized === "about:blank" && url !== "about:blank") {
    return false;
  }
  
  // Additional validation for proper URL format
  try {
    // For relative URLs, prepend a base URL for validation
    const urlToValidate = url.startsWith('http') || url.startsWith('//') 
      ? url 
      : `https://example.com${url.startsWith('/') ? '' : '/'}${url}`;
      
    new URL(urlToValidate);
    return true;
  } catch {
    // If URL constructor throws, it's not a valid URL format
    return false;
  }
};

// Password strength validation
export const passwordUtils = {
  validateStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Rate limiting utility
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const validAttempts = attempts.filter((time) => now - time < this.windowMs);

    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);

    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
