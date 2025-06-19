/**
 * Test Setup Configuration
 * Phase 5: Testing & Documentation
 *
 * Global test configuration for comprehensive testing suite including:
 * - Jest configuration
 * - Testing Library setup
 * - Mock configurations
 * - Performance monitoring
 * - Accessibility testing setup
 */

// Basic test to verify setup works
describe("Test Setup Configuration", () => {
  it("should have all required global mocks configured", () => {
    expect(global.IntersectionObserver).toBeDefined();
    expect(global.ResizeObserver).toBeDefined();
    expect(global.performance).toBeDefined();
    expect(global.requestAnimationFrame).toBeDefined();
    expect(global.cancelAnimationFrame).toBeDefined();
    expect(window.matchMedia).toBeDefined();
    expect(Element.prototype.scrollIntoView).toBeDefined();
    expect(Element.prototype.getBoundingClientRect).toBeDefined();
  });

  it("should have test utilities available", () => {
    expect(testUtils.createMockUser).toBeDefined();
    expect(testUtils.createMockAuthContext).toBeDefined();
    expect(testUtils.createMockRecommendationItem).toBeDefined();
    expect(testUtils.waitForPerformance).toBeDefined();
    expect(testUtils.TestPerformanceMonitor).toBeDefined();
  });

  it("should create mock user with correct structure", () => {
    const mockUser = testUtils.createMockUser();
    expect(mockUser).toHaveProperty("id");
    expect(mockUser).toHaveProperty("email");
    expect(mockUser).toHaveProperty("access_token");
  });

  it("should create mock auth context with correct structure", () => {
    const mockAuthContext = testUtils.createMockAuthContext();
    expect(mockAuthContext).toHaveProperty("user");
    expect(mockAuthContext).toHaveProperty("loading");
    expect(mockAuthContext).toHaveProperty("signOut");
  });

  it("should create mock recommendation item with correct structure", () => {
    const mockItem = testUtils.createMockRecommendationItem();
    expect(mockItem).toHaveProperty("item");
    expect(mockItem).toHaveProperty("recommendation_score");
    expect(mockItem).toHaveProperty("reasoning");
    expect(mockItem).toHaveProperty("predicted_rating");
    expect(mockItem.item).toHaveProperty("uid");
    expect(mockItem.item).toHaveProperty("title");
    expect(mockItem.item).toHaveProperty("mediaType");
  });
});

import "@testing-library/jest-dom";

// Mock IntersectionObserver for virtual scrolling tests
global.IntersectionObserver = class IntersectionObserver {
  constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {}

  observe() {
    // Mock implementation
  }

  unobserve() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
};

// Mock ResizeObserver for responsive components
global.ResizeObserver = class ResizeObserver {
  constructor(public callback: ResizeObserverCallback) {}

  observe() {
    // Mock implementation
  }

  unobserve() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
};

// Mock performance API
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    clearMarks: () => {},
    clearMeasures: () => {},
  } as any;
}

// Mock requestAnimationFrame for animation tests
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16);
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Mock window.matchMedia for responsive and accessibility tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock HTMLElement.scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 320,
  height: 200,
  top: 0,
  left: 0,
  bottom: 200,
  right: 320,
  x: 0,
  y: 0,
  toJSON: () => {},
}));

// Setup for React Testing Library
import { configure } from "@testing-library/react";

configure({
  // Increase timeout for performance tests
  asyncUtilTimeout: 5000,
  // Configure test ID attribute
  testIdAttribute: "data-testid",
});

// Performance testing utilities
export const waitForPerformance = (callback: () => void, timeout = 100) => {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        callback();
        resolve();
      }, timeout);
    });
  });
};

// Accessibility testing helpers
export const axeConfig = {
  rules: {
    // Configure axe rules for WCAG 2.1 AA compliance
    "color-contrast": { enabled: true },
    "keyboard-navigation": { enabled: true },
    "focus-management": { enabled: true },
    "aria-labels": { enabled: true },
    "semantic-markup": { enabled: true },
  },
  tags: ["wcag2a", "wcag2aa", "wcag21aa"],
};

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Reset console mocks
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
export const createMockUser = (overrides = {}) => ({
  id: "test-user-123",
  email: "test@example.com",
  access_token: "mock-jwt-token",
  ...overrides,
});

export const createMockAuthContext = (userOverrides = {}) => ({
  user: createMockUser(userOverrides),
  loading: false,
  signOut: jest.fn(),
});

export const createMockRecommendationItem = (overrides = {}) => ({
  item: {
    uid: "test-item-001",
    title: "Test Anime",
    mediaType: "anime",
    score: 8.5,
    genres: ["Action", "Adventure"],
    imageUrl: "https://example.com/test.jpg",
    synopsis: "A test anime for testing purposes",
    ...overrides.item,
  },
  recommendation_score: 0.85,
  reasoning: "Test recommendation reasoning",
  predicted_rating: 8.3,
  ...overrides,
});

// Performance monitoring for tests
export class TestPerformanceMonitor {
  private metrics: Map<string, number> = new Map();

  startTimer(name: string): void {
    this.metrics.set(name, performance.now());
  }

  endTimer(name: string): number {
    const start = this.metrics.get(name);
    if (!start) {
      throw new Error(`Timer ${name} was not started`);
    }
    const duration = performance.now() - start;
    this.metrics.delete(name);
    return duration;
  }

  expectPerformance(name: string, maxDuration: number): void {
    const duration = this.endTimer(name);
    expect(duration).toBeLessThan(maxDuration);
  }
}

// Export test utilities
export const testUtils = {
  createMockUser,
  createMockAuthContext,
  createMockRecommendationItem,
  waitForPerformance,
  TestPerformanceMonitor,
};
