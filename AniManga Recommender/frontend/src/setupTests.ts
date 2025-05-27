// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock console.warn to reduce noise in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("React Router Future Flag Warning") ||
        args[0].includes("componentWillReceiveProps") ||
        args[0].includes("componentWillUpdate"))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

// Mock scrollIntoView (not available in JSDOM)
Element.prototype.scrollIntoView = jest.fn();

// Mock IntersectionObserver for any components that might use it
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: "",
    thresholds: [],
    takeRecords: jest.fn(() => []),
  })),
});

// Mock ResizeObserver
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, "scrollTo", {
  value: jest.fn(),
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock HTMLFormElement.prototype.submit to fix form submission tests
Object.defineProperty(HTMLFormElement.prototype, "submit", {
  writable: true,
  value: jest.fn(),
});

// Extend expect with custom matchers
expect.extend({
  toHaveLoadingState(received: HTMLElement) {
    const hasSpinner = received.querySelector(".spinner") !== null;
    const hasSkeletonLoading = received.querySelector(".skeleton-loading") !== null;
    const hasLoadingText = received.textContent?.includes("Loading") || false;
    const hasStatusRole = received.querySelector('[role="status"]') !== null;

    const pass = hasSpinner || hasSkeletonLoading || hasLoadingText || hasStatusRole;

    return {
      message: () =>
        pass
          ? `Expected element not to have loading state`
          : `Expected element to have loading state (spinner, skeleton, loading text, or status role)`,
      pass,
    };
  },
});

// Global test utilities
global.createMockItem = (overrides = {}) => ({
  uid: "test-uid-1",
  title: "Test Anime Title",
  media_type: "anime" as const,
  genres: ["Action", "Adventure"],
  themes: ["School", "Military"],
  demographics: ["Shounen"],
  score: 8.5,
  scored_by: 10000,
  status: "Finished Airing" as const,
  episodes: 24,
  start_date: "2020-01-01",
  rating: "PG-13",
  popularity: 100,
  members: 50000,
  favorites: 5000,
  synopsis: "Test synopsis for anime",
  producers: ["Test Producer"],
  licensors: ["Test Licensor"],
  studios: ["Test Studio"],
  authors: [],
  serializations: [],
  image_url: "https://example.com/test-image.jpg",
  title_synonyms: ["Alt Title"],
  ...overrides,
});

global.createMockApiResponse = (items = [], overrides = {}) => ({
  items,
  total_items: items.length,
  total_pages: Math.ceil(items.length / 30),
  current_page: 1,
  items_per_page: 30,
  ...overrides,
});

global.createMockDistinctValues = (overrides = {}) => ({
  media_types: ["anime", "manga"],
  genres: ["Action", "Adventure", "Comedy", "Drama"],
  themes: ["School", "Military", "Romance", "Historical"],
  demographics: ["Shounen", "Shoujo", "Seinen", "Josei"],
  statuses: ["Finished Airing", "Currently Airing", "Publishing"],
  studios: ["Studio A", "Studio B", "Studio C"],
  authors: ["Author X", "Author Y", "Author Z"],
  sources: ["Manga", "Light Novel", "Original"],
  ratings: ["G", "PG", "PG-13", "R"],
  ...overrides,
});

// Add TypeScript declaration for global utilities
declare global {
  function createMockItem(overrides?: any): any;
  function createMockApiResponse(items?: any[], overrides?: any): any;
  function createMockDistinctValues(overrides?: any): any;

  namespace jest {
    interface Matchers<R> {
      toHaveLoadingState(): R;
    }
  }
}

// Mock URL for tests
Object.defineProperty(window, "location", {
  writable: true,
  value: {
    pathname: "/",
    search: "",
    hash: "",
    href: "http://localhost/",
  },
});

// Mock history API
Object.defineProperty(window, "history", {
  writable: true,
  value: {
    back: jest.fn(),
    forward: jest.fn(),
    go: jest.fn(),
    pushState: jest.fn(),
    replaceState: jest.fn(),
  },
});
