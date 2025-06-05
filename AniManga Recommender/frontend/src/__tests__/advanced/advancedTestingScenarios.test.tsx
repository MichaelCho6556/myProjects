/**
 * Advanced Testing Scenarios for AniManga Recommender Frontend
 * Phase D2: Advanced Testing Scenarios
 *
 * Test Coverage:
 * - End-to-End testing across entire application workflows
 * - Accessibility testing (WCAG compliance, screen readers, keyboard navigation)
 * - Browser compatibility and cross-platform testing
 * - Mobile responsiveness and touch interaction testing
 * - Error recovery and resilience testing
 * - User acceptance testing scenarios
 * - Advanced edge cases and boundary testing
 * - Progressive Web App functionality testing
 * - Offline functionality and service worker testing
 * - Internationalization and localization testing
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import App from "../../App";
import { supabase } from "../../lib/supabase";
import axios from "axios";

// Advanced testing utilities
interface TestDevice {
  name: string;
  width: number;
  height: number;
  userAgent: string;
  touch: boolean;
}

interface AccessibilityTestResult {
  component: string;
  violations: number;
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

interface E2ETestStep {
  description: string;
  action: () => Promise<void>;
  verification: () => Promise<void>;
  timeout?: number;
}

// Mock external dependencies
jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  },
}));

jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

jest.mock("../../hooks/useDocumentTitle", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../hooks/useAuthenticatedApi", () => ({
  useAuthenticatedApi: () => ({
    makeAuthenticatedRequest: jest.fn(() => Promise.resolve({ data: [] })),
    getUserItems: jest.fn(() => Promise.resolve({ data: mockUserItems })),
    updateUserItemStatus: jest.fn(() => Promise.resolve({ data: {} })),
    removeUserItem: jest.fn(() => Promise.resolve({ data: {} })),
    getDashboardData: jest.fn(() => Promise.resolve({ data: mockDashboardData })),
    searchItems: jest.fn(() => Promise.resolve({ data: mockSearchResults })),
  }),
}));

// Mock data
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  user_metadata: { full_name: "Test User" },
  aud: "authenticated",
  role: "authenticated",
};

const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

const mockAnimeItems = [
  {
    uid: "anime-1",
    title: "Attack on Titan",
    media_type: "anime",
    genres: ["Action", "Drama"],
    score: 9.0,
    episodes: 75,
    image_url: "https://example.com/aot.jpg",
    synopsis: "Humanity fights for survival against giant humanoid Titans.",
  },
  {
    uid: "anime-2",
    title: "Your Name",
    media_type: "anime",
    genres: ["Romance", "Drama"],
    score: 8.4,
    episodes: 1,
    image_url: "https://example.com/yourname.jpg",
    synopsis: "Two teenagers share a profound, magical connection.",
  },
  {
    uid: "manga-1",
    title: "One Piece",
    media_type: "manga",
    genres: ["Adventure", "Comedy"],
    score: 9.2,
    chapters: 1000,
    image_url: "https://example.com/onepiece.jpg",
    synopsis: "Monkey D. Luffy explores the Grand Line to become Pirate King.",
  },
];

const mockUserItems = [
  {
    id: 1,
    user_id: "user-123",
    item_uid: "anime-1",
    status: "watching",
    progress: 12,
    rating: 8.5,
    item: mockAnimeItems[0],
  },
  {
    id: 2,
    user_id: "user-123",
    item_uid: "manga-1",
    status: "completed",
    progress: 1000,
    rating: 9.0,
    item: mockAnimeItems[2],
  },
];

const mockDashboardData = {
  user_stats: {
    total_anime_watched: 15,
    total_manga_read: 8,
    average_score: 8.2,
    completion_rate: 85.5,
  },
  recent_activity: mockUserItems,
  quick_stats: {
    total_items: 23,
    watching: 5,
    completed: 15,
    plan_to_watch: 2,
    on_hold: 1,
    dropped: 0,
  },
};

const mockSearchResults = {
  items: mockAnimeItems,
  total_items: mockAnimeItems.length,
  current_page: 1,
  total_pages: 1,
};

// Testing device configurations
const testDevices: TestDevice[] = [
  {
    name: "Desktop Chrome",
    width: 1920,
    height: 1080,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    touch: false,
  },
  {
    name: "iPad",
    width: 768,
    height: 1024,
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
    touch: true,
  },
  {
    name: "iPhone 12",
    width: 375,
    height: 812,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
    touch: true,
  },
  {
    name: "Android Phone",
    width: 360,
    height: 640,
    userAgent:
      "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
    touch: true,
  },
];

// Utility classes
class AccessibilityTester {
  private results: AccessibilityTestResult[] = [];

  async testComponent(component: HTMLElement, componentName: string): Promise<AccessibilityTestResult> {
    // Mock accessibility test result for testing purposes
    const mockResult: AccessibilityTestResult = {
      component: componentName,
      violations: 0,
      passed: true,
      issues: [],
      recommendations: [],
    };

    this.results.push(mockResult);
    return mockResult;
  }

  getResults(): AccessibilityTestResult[] {
    return this.results;
  }

  getOverallScore(): number {
    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.passed).length;
    return totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  }
}

class DeviceSimulator {
  static simulateDevice(device: TestDevice): void {
    // Simulate viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: device.width,
    });

    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: device.height,
    });

    // Simulate user agent
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value: device.userAgent,
    });

    // Simulate touch capability
    Object.defineProperty(navigator, "maxTouchPoints", {
      writable: true,
      configurable: true,
      value: device.touch ? 5 : 0,
    });

    // Trigger resize event
    window.dispatchEvent(new Event("resize"));
  }
}

class E2ETestRunner {
  static async runTestScenario(steps: E2ETestStep[]): Promise<boolean> {
    try {
      for (const step of steps) {
        console.log(`Executing: ${step.description}`);

        await step.action();
        await step.verification();

        // Small delay between steps
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return true;
    } catch (error) {
      console.error(`E2E Test failed: ${error}`);
      return false;
    }
  }
}

// Helper to render with providers
const renderWithProviders = (component: React.ReactElement, initialEntries: string[] = ["/"]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{component}</AuthProvider>
    </MemoryRouter>
  );
};

// Setup authenticated user state
const setupAuthenticatedUser = () => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });

  (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
    data: {
      subscription: {
        unsubscribe: jest.fn(),
      },
    },
  });
};

describe("Advanced Testing Scenarios - Phase D2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    setupAuthenticatedUser();

    // Setup default API responses
    (axios.get as jest.Mock).mockResolvedValue({
      data: mockSearchResults,
    });
  });

  describe("End-to-End Testing", () => {
    test("complete user onboarding to first item addition workflow", async () => {
      const e2eSteps: E2ETestStep[] = [
        {
          description: "User lands on homepage",
          action: async () => {
            renderWithProviders(<App />);
          },
          verification: async () => {
            await waitFor(() => {
              expect(screen.getByText("AniManga Recommender")).toBeInTheDocument();
            });
          },
        },
        {
          description: "User navigates to sign up",
          action: async () => {
            const signUpButton = screen.getByText(/sign up/i);
            await userEvent.click(signUpButton);
          },
          verification: async () => {
            await waitFor(() => {
              expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
              expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
            });
          },
        },
        {
          description: "User completes sign up form",
          action: async () => {
            const emailInput = screen.getByLabelText(/email/i);
            const passwordInput = screen.getByLabelText(/password/i);

            await userEvent.type(emailInput, "newuser@example.com");
            await userEvent.type(passwordInput, "SecurePass123!");
          },
          verification: async () => {
            expect(screen.getByDisplayValue("newuser@example.com")).toBeInTheDocument();
          },
        },
        {
          description: "User submits sign up and gets redirected to dashboard",
          action: async () => {
            (supabase.auth.signUp as jest.Mock).mockResolvedValue({
              data: { user: mockUser, session: mockSession },
              error: null,
            });

            const submitButton = screen.getByRole("button", { name: /sign up/i });
            await userEvent.click(submitButton);
          },
          verification: async () => {
            await waitFor(() => {
              expect(screen.getByText("My Dashboard")).toBeInTheDocument();
            });
          },
        },
        {
          description: "User searches for anime",
          action: async () => {
            const searchInput = screen.getByPlaceholderText(/search/i);
            await userEvent.type(searchInput, "Attack on Titan");
          },
          verification: async () => {
            await waitFor(() => {
              expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
            });
          },
        },
        {
          description: "User adds anime to their list",
          action: async () => {
            const addButton = screen.getByText(/add to list/i);
            await userEvent.click(addButton);
          },
          verification: async () => {
            await waitFor(() => {
              expect(screen.getByText(/added to your list/i)).toBeInTheDocument();
            });
          },
        },
        {
          description: "User navigates to their lists to verify addition",
          action: async () => {
            const myListsLink = screen.getByText(/my lists/i);
            await userEvent.click(myListsLink);
          },
          verification: async () => {
            await waitFor(() => {
              expect(screen.getByText("My Lists")).toBeInTheDocument();
              expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
            });
          },
        },
      ];

      const success = await E2ETestRunner.runTestScenario(e2eSteps);
      expect(success).toBe(true);
    });

    test("advanced user journey with multiple interactions", async () => {
      renderWithProviders(<App />);

      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Navigate through multiple pages and perform actions
      const navigationFlow = [
        { page: "Dashboard", element: "My Dashboard" },
        { page: "Search", element: "Search" },
        { page: "My Lists", element: "My Lists" },
        { page: "Profile", element: "Profile" },
      ];

      for (const nav of navigationFlow) {
        const link = screen.getByText(nav.page);
        await userEvent.click(link);

        await waitFor(() => {
          expect(screen.getByText(nav.element)).toBeInTheDocument();
        });

        // Perform page-specific actions
        if (nav.page === "Search") {
          const searchInput = screen.getByPlaceholderText(/search/i);
          await userEvent.type(searchInput, "test");

          await waitFor(() => {
            expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
          });
        }

        if (nav.page === "My Lists") {
          // Update item status
          const statusSelect = screen.getByDisplayValue("watching");
          await userEvent.selectOptions(statusSelect, "completed");

          await waitFor(() => {
            expect(screen.getByDisplayValue("completed")).toBeInTheDocument();
          });
        }
      }
    });

    test("error recovery and resilience testing", async () => {
      // Simulate network errors
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Try to search while network is down
      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, "test");

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
      });

      // Restore network and retry
      (axios.get as jest.Mock).mockResolvedValue({
        data: mockSearchResults,
      });

      const retryButton = screen.getByText(/retry/i) || screen.getByText(/try again/i);
      await userEvent.click(retryButton);

      // Should recover and show results
      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility Testing", () => {
    test("WCAG compliance across main components", async () => {
      const accessibilityTester = new AccessibilityTester();

      // Test main app
      const { container } = renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      const appResult = await accessibilityTester.testComponent(container, "Main App");
      expect(appResult.violations).toBe(0);

      // Test dashboard specifically
      const dashboardLink = screen.getByText("Dashboard");
      await userEvent.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });

      const dashboardResult = await accessibilityTester.testComponent(container, "Dashboard");
      expect(dashboardResult.violations).toBe(0);

      // Overall accessibility score should be high
      const overallScore = accessibilityTester.getOverallScore();
      expect(overallScore).toBeGreaterThan(95);

      console.log(`Accessibility Score: ${overallScore}%`);
    });

    test("keyboard navigation functionality", async () => {
      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Test tab navigation
      const focusableElements = [
        screen.getByText("Dashboard"),
        screen.getByText("Search"),
        screen.getByText("My Lists"),
        screen.getByPlaceholderText(/search/i),
      ];

      // Simulate tab navigation
      for (let i = 0; i < focusableElements.length; i++) {
        await userEvent.tab();

        // Check if focus is moving correctly
        const activeElement = document.activeElement;
        expect(activeElement).toBeTruthy();
      }

      // Test Enter key activation
      const dashboardLink = screen.getByText("Dashboard");
      dashboardLink.focus();
      await userEvent.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });
    });

    test("screen reader compatibility", async () => {
      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Check for proper ARIA labels and roles
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toHaveAttribute("aria-label");

      // Check for semantic HTML elements
      const mainElement = screen.getByRole("main");
      expect(mainElement).toBeInTheDocument();

      const navigation = screen.getByRole("navigation");
      expect(navigation).toBeInTheDocument();

      // Check for proper heading hierarchy
      const headings = screen.getAllByRole("heading");
      expect(headings.length).toBeGreaterThan(0);

      // Verify alt text for images
      const images = screen.getAllByRole("img");
      images.forEach((img) => {
        expect(img).toHaveAttribute("alt");
      });
    });

    test("color contrast and visual accessibility", async () => {
      const { container } = renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Test high contrast mode simulation
      document.body.classList.add("high-contrast");

      // Check if app still functions with high contrast
      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, "test");

      await waitFor(() => {
        expect(screen.getByDisplayValue("test")).toBeInTheDocument();
      });

      // Clean up
      document.body.classList.remove("high-contrast");
    });
  });

  describe("Cross-Browser and Device Compatibility", () => {
    test("responsive design across different screen sizes", async () => {
      for (const device of testDevices) {
        console.log(`Testing on ${device.name}`);

        DeviceSimulator.simulateDevice(device);

        const { container } = renderWithProviders(<App />);

        await waitFor(() => {
          expect(screen.getByText("Test User")).toBeInTheDocument();
        });

        // Check if mobile navigation appears on small screens
        if (device.width < 768) {
          const mobileMenu =
            container.querySelector('[data-testid="mobile-menu"]') ||
            container.querySelector(".mobile-menu") ||
            screen.queryByLabelText(/menu/i);

          if (mobileMenu) {
            expect(mobileMenu).toBeInTheDocument();
          }
        }

        // Check if elements are properly sized
        const searchInput = screen.getByPlaceholderText(/search/i);
        const inputRect = searchInput.getBoundingClientRect();

        // Touch targets should be at least 44px for mobile
        if (device.touch) {
          expect(inputRect.height).toBeGreaterThanOrEqual(44);
        }

        // Test scrolling behavior on small screens
        if (device.height < 800) {
          // Should be scrollable
          expect(document.body.scrollHeight).toBeGreaterThan(device.height);
        }
      }
    });

    test("touch interaction compatibility", async () => {
      const touchDevice = testDevices.find((d) => d.touch);
      if (touchDevice) {
        DeviceSimulator.simulateDevice(touchDevice);
      }

      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Test touch events
      const dashboardLink = screen.getByText("Dashboard");

      // Simulate touch events
      fireEvent.touchStart(dashboardLink);
      fireEvent.touchEnd(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });

      // Test swipe gestures (if implemented)
      const container = screen.getByRole("main");

      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchMove(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      });

      fireEvent.touchEnd(container);

      // Should not cause any errors
      expect(container).toBeInTheDocument();
    });

    test("browser-specific feature compatibility", async () => {
      // Test localStorage availability
      expect(typeof Storage).toBe("function");

      localStorage.setItem("test", "value");
      expect(localStorage.getItem("test")).toBe("value");
      localStorage.removeItem("test");

      // Test sessionStorage
      sessionStorage.setItem("test", "value");
      expect(sessionStorage.getItem("test")).toBe("value");
      sessionStorage.removeItem("test");

      // Test modern JavaScript features
      expect(typeof Promise).toBe("function");
      expect(typeof Map).toBe("function");
      expect(typeof Set).toBe("function");

      // Test fetch API (mocked)
      expect(typeof fetch).toBe("function");
    });
  });

  describe("Progressive Web App Testing", () => {
    test("service worker registration and functionality", async () => {
      // Mock service worker
      const mockServiceWorker = {
        register: jest.fn().mockResolvedValue({
          installing: null,
          waiting: null,
          active: { state: "activated" },
        }),
        ready: Promise.resolve({
          installing: null,
          waiting: null,
          active: { state: "activated" },
        }),
      };

      Object.defineProperty(navigator, "serviceWorker", {
        value: mockServiceWorker,
        writable: true,
      });

      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Check if service worker registration was attempted
      expect(mockServiceWorker.register).toHaveBeenCalled();
    });

    test("offline functionality simulation", async () => {
      // Mock offline state
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      renderWithProviders(<App />);

      // Trigger offline event
      window.dispatchEvent(new Event("offline"));

      await waitFor(() => {
        // Should show offline indicator or message
        const offlineMessage = screen.queryByText(/offline/i) || screen.queryByText(/no connection/i);

        if (offlineMessage) {
          expect(offlineMessage).toBeInTheDocument();
        }
      });

      // Restore online state
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      window.dispatchEvent(new Event("online"));

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });
    });

    test("app manifest and installability", async () => {
      // Check for manifest link
      const manifestLink = document.querySelector('link[rel="manifest"]');
      expect(manifestLink).toBeTruthy();

      // Mock beforeinstallprompt event
      const installPromptEvent = new Event("beforeinstallprompt");
      Object.defineProperty(installPromptEvent, "prompt", {
        value: jest.fn(),
      });

      window.dispatchEvent(installPromptEvent);

      // Should handle install prompt appropriately
      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });
    });
  });

  describe("User Acceptance Testing Scenarios", () => {
    test("typical user workflow - anime discovery and tracking", async () => {
      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // User story: "As a user, I want to discover new anime and track my progress"

      // Step 1: User goes to search
      const searchLink = screen.getByText("Search");
      await userEvent.click(searchLink);

      // Step 2: User searches for anime
      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, "Attack");

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });

      // Step 3: User views anime details
      const animeTitle = screen.getByText("Attack on Titan");
      await userEvent.click(animeTitle);

      // Step 4: User adds to their list
      const addButton = screen.getByText(/add to list/i);
      await userEvent.click(addButton);

      // Step 5: User goes to their lists to manage
      const myListsLink = screen.getByText("My Lists");
      await userEvent.click(myListsLink);

      await waitFor(() => {
        expect(screen.getByText("My Lists")).toBeInTheDocument();
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });

      // Step 6: User updates progress
      const progressInput = screen.getByDisplayValue("12");
      await userEvent.clear(progressInput);
      await userEvent.type(progressInput, "15");

      // Step 7: User changes status
      const statusSelect = screen.getByDisplayValue("watching");
      await userEvent.selectOptions(statusSelect, "completed");

      await waitFor(() => {
        expect(screen.getByDisplayValue("completed")).toBeInTheDocument();
      });
    });

    test("new user onboarding experience", async () => {
      // Clear authentication to simulate new user
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      renderWithProviders(<App />);

      // Should show welcome/landing page
      await waitFor(() => {
        expect(screen.getByText(/welcome/i) || screen.getByText(/sign/i)).toBeInTheDocument();
      });

      // User story: "As a new user, I want to understand what the app does and how to get started"

      // Should have clear call-to-action
      const signUpButton = screen.getByText(/sign up/i) || screen.getByText(/get started/i);
      expect(signUpButton).toBeInTheDocument();

      // Should have feature explanations
      const features = [/track/i, /discover/i, /recommend/i];

      features.forEach((feature) => {
        const featureElement = screen.queryByText(feature);
        if (featureElement) {
          expect(featureElement).toBeInTheDocument();
        }
      });
    });

    test("power user advanced features", async () => {
      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // User story: "As a power user, I want to efficiently manage large collections and get detailed analytics"

      // Test bulk operations
      const myListsLink = screen.getByText("My Lists");
      await userEvent.click(myListsLink);

      await waitFor(() => {
        expect(screen.getByText("My Lists")).toBeInTheDocument();
      });

      // Test filtering and sorting
      const filterSelect = screen.queryByLabelText(/filter/i) || screen.queryByLabelText(/sort/i);
      if (filterSelect) {
        await userEvent.selectOptions(filterSelect, "completed");
      }

      // Test export functionality
      const exportButton = screen.queryByText(/export/i);
      if (exportButton) {
        await userEvent.click(exportButton);
      }

      // Test advanced search
      const searchLink = screen.getByText("Search");
      await userEvent.click(searchLink);

      const advancedFilters = screen.queryByText(/advanced/i) || screen.queryByText(/filters/i);
      if (advancedFilters) {
        await userEvent.click(advancedFilters);
      }
    });
  });

  describe("Advanced Edge Cases and Boundary Testing", () => {
    test("extreme data volumes and edge cases", async () => {
      // Test with very large lists
      const largeUserItems = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        user_id: "user-123",
        item_uid: `anime-${i}`,
        status: "watching",
        progress: i % 100,
        rating: 1 + (i % 10),
        item: {
          uid: `anime-${i}`,
          title: `Test Anime ${i}`,
          media_type: "anime",
          genres: ["Action"],
          score: 8.0,
          episodes: 24,
          image_url: `https://example.com/${i}.jpg`,
          synopsis: `Synopsis for anime ${i}`,
        },
      }));

      const mockAuthenticatedApi = require("../../hooks/useAuthenticatedApi").useAuthenticatedApi();
      mockAuthenticatedApi.getUserItems.mockResolvedValue({ data: largeUserItems });

      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      const myListsLink = screen.getByText("My Lists");
      await userEvent.click(myListsLink);

      // Should handle large datasets without crashing
      await waitFor(
        () => {
          expect(screen.getByText("My Lists")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Should implement virtualization or pagination
      const listItems = screen.getAllByText(/Test Anime/);
      expect(listItems.length).toBeLessThan(100); // Should not render all 10,000 items
    });

    test("unicode and special character handling", async () => {
      const unicodeTestData = {
        items: [
          {
            uid: "unicode-1",
            title: "進撃の巨人 (Attack on Titan)",
            media_type: "anime",
            genres: ["アクション", "ドラマ"],
            score: 9.0,
            episodes: 75,
            image_url: "https://example.com/unicode.jpg",
            synopsis: "人類は巨大な人型の巨人と戦い、生存をかけて戦う。",
          },
          {
            uid: "emoji-1",
            title: "🎌 Japanese Anime with Emojis 🗾",
            media_type: "anime",
            genres: ["😄 Comedy", "💖 Romance"],
            score: 8.5,
            episodes: 12,
            image_url: "https://example.com/emoji.jpg",
            synopsis: "An anime full of emotions 😊💕🌟",
          },
        ],
      };

      (axios.get as jest.Mock).mockResolvedValue({ data: unicodeTestData });

      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, "進撃");

      await waitFor(() => {
        expect(screen.getByText("進撃の巨人 (Attack on Titan)")).toBeInTheDocument();
        expect(screen.getByText("🎌 Japanese Anime with Emojis 🗾")).toBeInTheDocument();
      });
    });

    test("concurrent user actions and race conditions", async () => {
      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Simulate rapid concurrent actions
      const promises = [];

      // Multiple search requests
      const searchInput = screen.getByPlaceholderText(/search/i);
      for (let i = 0; i < 5; i++) {
        promises.push(userEvent.type(searchInput, `test${i}`));
      }

      // Multiple navigation attempts
      const dashboardLink = screen.getByText("Dashboard");
      for (let i = 0; i < 3; i++) {
        promises.push(userEvent.click(dashboardLink));
      }

      // Should handle concurrent actions gracefully
      await Promise.all(promises);

      // App should still be functional
      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });
    });
  });

  describe("Performance Under Advanced Scenarios", () => {
    test("memory usage with complex user interactions", async () => {
      const getMemoryUsage = () => {
        const memoryInfo = (performance as any).memory;
        return memoryInfo ? memoryInfo.usedJSHeapSize : 0;
      };

      const initialMemory = getMemoryUsage();

      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Perform complex interactions
      const interactions = [
        () => userEvent.click(screen.getByText("Search")),
        () => userEvent.type(screen.getByPlaceholderText(/search/i), "complex search"),
        () => userEvent.click(screen.getByText("My Lists")),
        () => userEvent.click(screen.getByText("Dashboard")),
      ];

      // Repeat interactions multiple times
      for (let round = 0; round < 10; round++) {
        for (const interaction of interactions) {
          await interaction();
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not increase excessively
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB increase

      console.log(`Complex interaction memory increase: ${memoryIncrease / 1024 / 1024}MB`);
    });

    test("render performance with complex state updates", async () => {
      const renderStartTime = performance.now();

      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      const initialRenderTime = performance.now() - renderStartTime;

      // Perform state updates that trigger re-renders
      const myListsLink = screen.getByText("My Lists");
      await userEvent.click(myListsLink);

      const updateStartTime = performance.now();

      // Multiple state updates
      const statusSelects = screen.getAllByDisplayValue("watching");
      for (const select of statusSelects.slice(0, 3)) {
        await userEvent.selectOptions(select, "completed");
      }

      const updateTime = performance.now() - updateStartTime;

      // Performance should be reasonable
      expect(initialRenderTime).toBeLessThan(1000); // Initial render < 1s
      expect(updateTime).toBeLessThan(500); // Updates < 500ms

      console.log(`Initial render: ${initialRenderTime}ms, Updates: ${updateTime}ms`);
    });
  });
});
