// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock console.warn to reduce noise in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("React Router Future Flag Warning") ||
        args[0].includes("componentWillReceiveProps") ||
        args[0].includes("componentWillUpdate") ||
        args[0].includes("Warning: An update to") ||
        args[0].includes("act(...)"))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  // Suppress specific React warnings that are expected in tests
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      ((args[0].includes("An update to") && args[0].includes("was not wrapped in act(...)")) ||
        args[0].includes("Warning: ReactDOM.render is no longer supported"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Mock scrollIntoView (not available in JSDOM)
Element.prototype.scrollIntoView = jest.fn();

// Mock IntersectionObserver for any components that might use it
global.IntersectionObserver = jest.fn().mockImplementation((callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => {
  return {
    observe: jest.fn((target: Element) => {
      // Simulate immediate intersection to trigger lazy loading
      setTimeout(() => {
        callback([
          {
            target,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now(),
          } as IntersectionObserverEntry,
        ], {
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        } as any);
      }, 0);
    }),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: options?.root || null,
    rootMargin: options?.rootMargin || "",
    thresholds: options ? (Array.isArray(options.threshold) ? options.threshold : [options.threshold || 0]) : [0],
    takeRecords: jest.fn(() => []),
  };
});

// Also set it on window for components that check for window.IntersectionObserver
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: global.IntersectionObserver,
});

// Mock ResizeObserver with proper callback support
global.ResizeObserver = class ResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe(element: Element) {
    // Mock implementation - trigger callback immediately with a mock entry
    const mockEntry = {
      target: element,
      contentRect: {
        width: 320,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 320,
        x: 0,
        y: 0,
        toJSON: () => ({})
      },
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: []
    } as ResizeObserverEntry;
    
    setTimeout(() => {
      this.callback([mockEntry], this);
    }, 0);
  }
  
  unobserve() {
    // Mock implementation
  }
  
  disconnect() {
    // Mock implementation
  }
};

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: global.ResizeObserver,
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

// Mock document.visibilityState for Supabase Auth
Object.defineProperty(document, "visibilityState", {
  writable: true,
  value: "visible",
});

Object.defineProperty(document, "hidden", {
  writable: true,
  value: false,
});

// Mock document.addEventListener for visibility change events
const originalAddEventListener = document.addEventListener;
document.addEventListener = jest.fn((event, handler, options) => {
  if (event === "visibilitychange") {
    // Don't actually add the listener to avoid Supabase errors
    return;
  }
  return originalAddEventListener.call(document, event, handler, options);
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

// Mock URL for tests
Object.defineProperty(window, "location", {
  writable: true,
  value: {
    pathname: "/",
    search: "",
    hash: "",
    href: "http://localhost/",
    origin: "http://localhost",
    hostname: "localhost",
    port: "",
    protocol: "http:",
    host: "localhost",
    reload: jest.fn(),
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
    length: 1,
    state: null,
  },
});

// React-Select test utilities
global.findReactSelectOption = async (container: HTMLElement, optionText: string) => {
  const { findByText } = await import("@testing-library/react");

  // Look for the option in React-Select menu that might be rendered in a portal
  const option = await findByText(container, optionText);
  return option;
};

global.openReactSelectDropdown = async (selectElement: HTMLElement) => {
  const userEvent = (await import("@testing-library/user-event")).default;

  // Click the select control to open dropdown
  const control = selectElement.querySelector(".react-select__control") || selectElement;
  await userEvent.click(control);

  // Wait a bit for the dropdown to open
  await new Promise((resolve) => setTimeout(resolve, 100));
};

global.selectReactSelectOption = async (selectElement: HTMLElement, optionText: string) => {
  const userEvent = (await import("@testing-library/user-event")).default;
  const { screen } = await import("@testing-library/react");

  // Open dropdown first
  await global.openReactSelectDropdown(selectElement);

  let optionToClick: HTMLElement | null = null;

  try {
    // For React-Select, we need to look for the option by text content
    // React-Select often renders options as divs with specific role and text
    const allOptions = screen.getAllByText(optionText);

    // Find the option that's actually clickable (inside the menu)
    optionToClick =
      allOptions.find((option) => {
        const parent = option.closest('[class*="react-select__option"]') || option.closest('[role="option"]');
        return parent !== null;
      }) || allOptions[0];

    if (!optionToClick) {
      // Fallback: try to find by partial text match
      const partialMatches = screen.getAllByText(new RegExp(optionText, "i"));
      optionToClick =
        partialMatches.find((option) => {
          const parent =
            option.closest('[class*="react-select__option"]') || option.closest('[role="option"]');
          return parent !== null;
        }) || null;
    }
  } catch (error) {
    console.warn(
      `Could not find React-Select option "${optionText}". Available options:`,
      document.querySelectorAll('[class*="react-select__option"]')
    );
  }

  if (optionToClick) {
    await userEvent.click(optionToClick);
  } else {
    // If we still can't find the option, just close the dropdown to avoid hanging
    const control = selectElement.querySelector(".react-select__control");
    if (control) {
      await userEvent.click(control);
    }
    throw new Error(`Option "${optionText}" could not be found or clicked in React-Select dropdown.`);
  }

  // Wait for selection to complete and potential state updates/URL changes
  await new Promise((resolve) => setTimeout(resolve, 100));
};

// Add TypeScript declaration for global utilities
declare global {
  function createMockItem(overrides?: any): any;
  function createMockApiResponse(items?: any[], overrides?: any): any;
  function createMockDistinctValues(overrides?: any): any;
  function findReactSelectOption(container: HTMLElement, optionText: string): Promise<HTMLElement>;
  function openReactSelectDropdown(selectElement: HTMLElement): Promise<void>;
  function selectReactSelectOption(selectElement: HTMLElement, optionText: string): Promise<void>;

  namespace jest {
    interface Matchers<R> {
      toHaveLoadingState(): R;
    }
  }
}
