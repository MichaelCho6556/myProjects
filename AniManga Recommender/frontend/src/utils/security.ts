import CryptoJS from "crypto-js";

/**
 * Security utilities for the application
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

// Input Sanitization - Enhanced for Advanced Attacks
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, "") // Remove < and > to prevent basic XSS
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers like onclick=
    .replace(/\.\.\//g, "") // ✅ NEW: Block path traversal attacks
    .replace(/\{\{.*?\}\}/g, "") // ✅ NEW: Block template injection {{ }}
    .replace(/\$\{.*?\}/g, "") // ✅ NEW: Block expression injection ${ }
    .replace(/\(\)\s*\{.*?\}/g, "") // ✅ NEW: Block shell function injection
    .replace(/;\s*echo\s+/gi, "") // ✅ NEW: Block echo commands
    .replace(/;\s*cat\s+/gi, "") // ✅ NEW: Block cat commands
    .replace(/;\s*ls\s+/gi, "") // ✅ NEW: Block ls commands
    .replace(/;\s*rm\s+/gi, "") // ✅ NEW: Block rm commands
    .replace(/DROP\s+TABLE/gi, "") // ✅ NEW: Block SQL DROP TABLE (backup)
    .trim();
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

// Secure localStorage with encryption
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || "default-encryption-key";

export const secureStorage = {
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

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
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
