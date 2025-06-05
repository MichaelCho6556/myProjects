/**
 * Comprehensive Authentication Flow Integration Tests for AniManga Recommender
 * Phase C1: Authentication Flow Testing
 *
 * Test Coverage:
 * - Complete signup and signin flow
 * - Authentication state persistence across page refreshes
 * - Token expiration and renewal handling
 * - Route protection and redirection logic
 * - Cross-component authentication state updates
 * - Logout flow and cleanup
 * - Error handling in authentication processes
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import App from "../../App";
import { supabase } from "../../lib/supabase";

// Mock Supabase
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
    })),
  },
}));

// Mock axios for API calls
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

// Mock authenticated API hook
jest.mock("../../hooks/useAuthenticatedApi", () => ({
  useAuthenticatedApi: () => ({
    makeAuthenticatedRequest: jest.fn(() => Promise.resolve([])),
  }),
}));

// Mock document title hook
jest.mock("../../hooks/useDocumentTitle", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Test component that uses auth context
const AuthTestComponent: React.FC = () => {
  const { user, signIn, signUp, signOut, loading } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {loading ? "Loading..." : user ? `Authenticated: ${user.email}` : "Not authenticated"}
      </div>
      <button data-testid="signin-btn" onClick={() => signIn("test@example.com", "password123")}>
        Sign In
      </button>
      <button data-testid="signup-btn" onClick={() => signUp("test@example.com", "password123", "Test User")}>
        Sign Up
      </button>
      <button data-testid="signout-btn" onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
};

// Helper to render with auth provider and router
const renderWithProviders = (component: React.ReactElement, initialEntries: string[] = ["/"]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{component}</AuthProvider>
    </MemoryRouter>
  );
};

describe("Authentication Flow Integration Tests", () => {
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

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset local storage
    localStorage.clear();

    // Mock default auth state
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
  });

  describe("Complete Signup Flow", () => {
    test("executes full signup process successfully", async () => {
      const user = userEvent.setup();

      // Mock successful signup
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      renderWithProviders(<AuthTestComponent />);

      // Verify initial unauthenticated state
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");

      // Click signup button
      await user.click(screen.getByTestId("signup-btn"));

      // Wait for signup completion
      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
          options: {
            data: {
              full_name: "Test User",
            },
          },
        });
      });

      // Verify authentication state update
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });
    });

    test("handles signup errors gracefully", async () => {
      const user = userEvent.setup();

      // Mock signup error
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Email already registered" },
      });

      renderWithProviders(<AuthTestComponent />);

      await user.click(screen.getByTestId("signup-btn"));

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalled();
      });

      // Should remain unauthenticated
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
    });

    test("handles network errors during signup", async () => {
      const user = userEvent.setup();

      // Mock network error
      (supabase.auth.signUp as jest.Mock).mockRejectedValue(new Error("Network error"));

      renderWithProviders(<AuthTestComponent />);

      await user.click(screen.getByTestId("signup-btn"));

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalled();
      });

      // Should remain unauthenticated
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
    });
  });

  describe("Complete Signin Flow", () => {
    test("executes full signin process successfully", async () => {
      const user = userEvent.setup();

      // Mock successful signin
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      renderWithProviders(<AuthTestComponent />);

      // Verify initial state
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");

      // Click signin button
      await user.click(screen.getByTestId("signin-btn"));

      // Wait for signin completion
      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });

      // Verify authentication state update
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });
    });

    test("handles invalid credentials gracefully", async () => {
      const user = userEvent.setup();

      // Mock invalid credentials error
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      renderWithProviders(<AuthTestComponent />);

      await user.click(screen.getByTestId("signin-btn"));

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
      });

      // Should remain unauthenticated
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
    });

    test("handles rate limiting during signin", async () => {
      const user = userEvent.setup();

      // Mock rate limiting error
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Too many requests" },
      });

      renderWithProviders(<AuthTestComponent />);

      await user.click(screen.getByTestId("signin-btn"));

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
      });

      expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
    });
  });

  describe("Authentication State Persistence", () => {
    test("maintains authentication state across page refreshes", async () => {
      // Mock existing session on page load
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      renderWithProviders(<AuthTestComponent />);

      // Should show loading initially
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Loading...");

      // Wait for session to load
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });

      expect(supabase.auth.getSession).toHaveBeenCalled();
    });

    test("handles corrupted session data gracefully", async () => {
      // Mock corrupted session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: null, access_token: null } },
        error: null,
      });

      renderWithProviders(<AuthTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
      });
    });

    test("handles session retrieval errors", async () => {
      // Mock session error
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error("Session error"));

      renderWithProviders(<AuthTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
      });
    });
  });

  describe("Token Expiration and Renewal", () => {
    test("handles token expiration gracefully", async () => {
      // Mock initial session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock auth state change for token expiration
      const mockUnsubscribe = jest.fn();
      let authStateCallback: (event: string, session: any) => void;

      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };
      });

      renderWithProviders(<AuthTestComponent />);

      // Wait for initial authentication
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });

      // Simulate token expiration
      act(() => {
        authStateCallback!("TOKEN_REFRESHED", null);
      });

      // Should handle expiration gracefully
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
      });
    });

    test("automatically refreshes expired tokens", async () => {
      const refreshedSession = {
        ...mockSession,
        access_token: "new-access-token",
      };

      // Mock initial session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock auth state change for token refresh
      let authStateCallback: (event: string, session: any) => void;

      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      });

      renderWithProviders(<AuthTestComponent />);

      // Wait for initial authentication
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });

      // Simulate token refresh
      act(() => {
        authStateCallback!("TOKEN_REFRESHED", refreshedSession);
      });

      // Should maintain authentication with new token
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });
    });
  });

  describe("Route Protection and Redirection", () => {
    test("redirects unauthenticated users from protected routes", async () => {
      renderWithProviders(<App />, ["/dashboard"]);

      // Should redirect to home page or show auth prompt
      await waitFor(() => {
        expect(screen.queryByText("My Dashboard")).not.toBeInTheDocument();
      });
    });

    test("allows authenticated users to access protected routes", async () => {
      // Mock authenticated session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      renderWithProviders(<App />, ["/dashboard"]);

      // Should access dashboard
      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });
    });

    test("redirects to originally requested route after authentication", async () => {
      // Start with unauthenticated user trying to access dashboard
      renderWithProviders(<App />, ["/dashboard"]);

      // Mock successful signin
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Perform authentication
      // This would typically involve filling out a sign-in form
      // For simplicity, we'll simulate the auth state change
      let authStateCallback: (event: string, session: any) => void;

      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      });

      // Simulate authentication
      act(() => {
        authStateCallback!("SIGNED_IN", mockSession);
      });

      // Should redirect to dashboard after authentication
      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });
    });
  });

  describe("Cross-Component Authentication Updates", () => {
    test("updates all components when authentication state changes", async () => {
      let authStateCallback: (event: string, session: any) => void;

      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      });

      renderWithProviders(<App />);

      // Initially unauthenticated
      await waitFor(() => {
        expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
      });

      // Simulate sign in
      act(() => {
        authStateCallback!("SIGNED_IN", mockSession);
      });

      // All components should update with user info
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });
    });

    test("clears user data from all components on signout", async () => {
      // Start with authenticated state
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      let authStateCallback: (event: string, session: any) => void;

      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      });

      renderWithProviders(<App />);

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Simulate sign out
      act(() => {
        authStateCallback!("SIGNED_OUT", null);
      });

      // All user data should be cleared
      await waitFor(() => {
        expect(screen.queryByText("Test User")).not.toBeInTheDocument();
      });
    });
  });

  describe("Complete Logout Flow", () => {
    test("executes full logout process with cleanup", async () => {
      const user = userEvent.setup();

      // Start with authenticated state
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock successful signout
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      renderWithProviders(<AuthTestComponent />);

      // Wait for initial authentication
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });

      // Click signout button
      await user.click(screen.getByTestId("signout-btn"));

      // Wait for signout completion
      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
      });

      // Verify authentication state cleared
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
      });
    });

    test("handles signout errors gracefully", async () => {
      const user = userEvent.setup();

      // Start with authenticated state
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock signout error
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: "Signout failed" },
      });

      renderWithProviders(<AuthTestComponent />);

      // Wait for initial authentication
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });

      // Click signout button
      await user.click(screen.getByTestId("signout-btn"));

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
      });

      // Should handle error gracefully and still clear local state
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
      });
    });

    test("clears all local storage and cached data on logout", async () => {
      const user = userEvent.setup();

      // Set some local storage data
      localStorage.setItem("animanga_user_preferences", JSON.stringify({ theme: "dark" }));
      localStorage.setItem("animanga_list_cache", JSON.stringify({ items: [] }));

      // Start with authenticated state
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      renderWithProviders(<AuthTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });

      // Click signout
      await user.click(screen.getByTestId("signout-btn"));

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
      });

      // Local storage should be cleared
      expect(localStorage.getItem("animanga_user_preferences")).toBeNull();
      expect(localStorage.getItem("animanga_list_cache")).toBeNull();
    });
  });

  describe("Authentication Error Recovery", () => {
    test("recovers from temporary network failures", async () => {
      const user = userEvent.setup();

      // Mock initial network failure
      (supabase.auth.signInWithPassword as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          data: { user: mockUser, session: mockSession },
          error: null,
        });

      renderWithProviders(<AuthTestComponent />);

      // First attempt should fail
      await user.click(screen.getByTestId("signin-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Not authenticated");
      });

      // Second attempt should succeed
      await user.click(screen.getByTestId("signin-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });
    });

    test("handles concurrent authentication attempts", async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: { user: mockUser, session: mockSession },
              error: null,
            });
          }, 100);
        });
      });

      renderWithProviders(<AuthTestComponent />);

      // Click signin button multiple times rapidly
      await user.click(screen.getByTestId("signin-btn"));
      await user.click(screen.getByTestId("signin-btn"));
      await user.click(screen.getByTestId("signin-btn"));

      // Should handle concurrent requests gracefully
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated: test@example.com");
      });

      // Should not have called signin more times than necessary
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    });
  });
});
