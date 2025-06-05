/**
 * Comprehensive AuthContext Tests for AniManga Recommender
 * Phase B1: Authentication Context Testing
 *
 * Test Coverage:
 * - Context provider initialization
 * - Authentication state management
 * - Sign up, sign in, sign out operations
 * - Auth state change listeners
 * - Error handling and edge cases
 * - Hook usage validation
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../../context/AuthContext";
import { authApi } from "../../../lib/supabase";
import { User } from "@supabase/supabase-js";

// Mock the auth API
jest.mock("../../../lib/supabase", () => ({
  authApi: {
    getCurrentUser: jest.fn(),
    onAuthStateChange: jest.fn(),
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

// Test component to access auth context
const TestComponent: React.FC = () => {
  const { user, loading, signUp, signIn, signOut } = useAuth();

  return (
    <div>
      <div data-testid="user-status">{loading ? "Loading" : user ? `User: ${user.email}` : "No user"}</div>
      <div data-testid="user-id">{user?.id || "No ID"}</div>
      <button onClick={() => signUp("test@example.com", "password", { display_name: "Test" })}>
        Sign Up
      </button>
      <button onClick={() => signIn("test@example.com", "password")}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
};

describe("AuthContext", () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUnsubscribe = jest.fn();

    // Default mock setup - user can be null
    mockAuthApi.getCurrentUser.mockResolvedValue({
      data: { user: null as any },
      error: null,
    });

    mockAuthApi.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    } as any);
  });

  describe("Provider Initialization", () => {
    it("initializes with loading state", () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId("user-status")).toHaveTextContent("Loading");
    });

    it("fetches current user on mount", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(mockAuthApi.getCurrentUser).toHaveBeenCalled();
    });

    it("sets up auth state change listener", () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(mockAuthApi.onAuthStateChange).toHaveBeenCalled();
    });

    it("cleans up auth listener on unmount", () => {
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("User State Management", () => {
    it("sets user state when current user is fetched", async () => {
      const mockUser: Partial<User> = {
        id: "user-123",
        email: "test@example.com",
        user_metadata: { display_name: "Test User" },
      };

      mockAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser as User },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("User: test@example.com");
        expect(screen.getByTestId("user-id")).toHaveTextContent("user-123");
      });
    });

    it("handles no initial user", async () => {
      mockAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: null as any },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("No user");
        expect(screen.getByTestId("user-id")).toHaveTextContent("No ID");
      });
    });

    it("updates user state on auth state change", async () => {
      let authStateCallback: (event: any, session: any) => void;

      mockAuthApi.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        } as any;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initially no user
      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("No user");
      });

      // Simulate auth state change with new user
      const mockUser: Partial<User> = {
        id: "user-456",
        email: "new@example.com",
      };

      act(() => {
        authStateCallback("SIGNED_IN", { user: mockUser });
      });

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("User: new@example.com");
        expect(screen.getByTestId("user-id")).toHaveTextContent("user-456");
      });
    });

    it("clears user state on sign out", async () => {
      let authStateCallback: (event: any, session: any) => void;

      mockAuthApi.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        } as any;
      });

      // Start with a user
      const mockUser: Partial<User> = {
        id: "user-123",
        email: "test@example.com",
      };

      mockAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser as User },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("User: test@example.com");
      });

      // Simulate sign out
      act(() => {
        authStateCallback("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("No user");
        expect(screen.getByTestId("user-id")).toHaveTextContent("No ID");
      });
    });
  });

  describe("Authentication Operations", () => {
    it("calls signUp with correct parameters", async () => {
      mockAuthApi.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).not.toHaveTextContent("Loading");
      });

      const signUpButton = screen.getByText("Sign Up");
      signUpButton.click();

      await waitFor(() => {
        expect(mockAuthApi.signUp).toHaveBeenCalledWith("test@example.com", "password", {
          display_name: "Test",
        });
      });
    });

    it("calls signIn with correct parameters", async () => {
      mockAuthApi.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).not.toHaveTextContent("Loading");
      });

      const signInButton = screen.getByText("Sign In");
      signInButton.click();

      await waitFor(() => {
        expect(mockAuthApi.signIn).toHaveBeenCalledWith("test@example.com", "password");
      });
    });

    it("calls signOut", async () => {
      mockAuthApi.signOut.mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).not.toHaveTextContent("Loading");
      });

      const signOutButton = screen.getByText("Sign Out");
      signOutButton.click();

      await waitFor(() => {
        expect(mockAuthApi.signOut).toHaveBeenCalled();
      });
    });

    it("returns error from signUp operation", async () => {
      const TestErrorComponent: React.FC = () => {
        const { signUp } = useAuth();
        const [error, setError] = React.useState<string | null>(null);

        const handleSignUp = async () => {
          const result = await signUp("test@example.com", "password");
          if (result.error) {
            setError(result.error.message);
          }
        };

        return (
          <div>
            <button onClick={handleSignUp}>Sign Up</button>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      const mockError = { message: "Email already in use" };
      mockAuthApi.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError as any,
      });

      render(
        <AuthProvider>
          <TestErrorComponent />
        </AuthProvider>
      );

      const signUpButton = screen.getByText("Sign Up");
      signUpButton.click();

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent("Email already in use");
      });
    });

    it("returns error from signIn operation", async () => {
      const TestErrorComponent: React.FC = () => {
        const { signIn } = useAuth();
        const [error, setError] = React.useState<string | null>(null);

        const handleSignIn = async () => {
          const result = await signIn("test@example.com", "wrongpassword");
          if (result.error) {
            setError(result.error.message);
          }
        };

        return (
          <div>
            <button onClick={handleSignIn}>Sign In</button>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      const mockError = { message: "Invalid credentials" };
      mockAuthApi.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError as any,
      });

      render(
        <AuthProvider>
          <TestErrorComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText("Sign In");
      signInButton.click();

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent("Invalid credentials");
      });
    });
  });

  describe("Hook Usage Validation", () => {
    it("throws error when useAuth is used outside AuthProvider", () => {
      const TestComponentOutsideProvider: React.FC = () => {
        useAuth(); // This should throw
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });

    it("provides all required context values", () => {
      const TestContextValues: React.FC = () => {
        const context = useAuth();

        return (
          <div>
            <div data-testid="has-user">{typeof context.user}</div>
            <div data-testid="has-loading">{typeof context.loading}</div>
            <div data-testid="has-signup">{typeof context.signUp}</div>
            <div data-testid="has-signin">{typeof context.signIn}</div>
            <div data-testid="has-signout">{typeof context.signOut}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestContextValues />
        </AuthProvider>
      );

      expect(screen.getByTestId("has-user")).toHaveTextContent("object");
      expect(screen.getByTestId("has-loading")).toHaveTextContent("boolean");
      expect(screen.getByTestId("has-signup")).toHaveTextContent("function");
      expect(screen.getByTestId("has-signin")).toHaveTextContent("function");
      expect(screen.getByTestId("has-signout")).toHaveTextContent("function");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("handles getCurrentUser error gracefully", async () => {
      mockAuthApi.getCurrentUser.mockRejectedValue(new Error("Network error"));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should not crash and should set loading to false
      await waitFor(() => {
        expect(screen.getByTestId("user-status")).not.toHaveTextContent("Loading");
      });
    });

    it("handles auth state change with null session", async () => {
      let authStateCallback: (event: any, session: any) => void;

      mockAuthApi.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        } as any;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Simulate auth state change with null session
      act(() => {
        authStateCallback("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("No user");
      });
    });

    it("handles auth state change with session but no user", async () => {
      let authStateCallback: (event: any, session: any) => void;

      mockAuthApi.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        } as any;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Simulate auth state change with session but no user
      act(() => {
        authStateCallback("TOKEN_REFRESHED", { user: null });
      });

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("No user");
      });
    });

    it("maintains state consistency during rapid auth changes", async () => {
      let authStateCallback: (event: any, session: any) => void;

      mockAuthApi.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        } as any;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const mockUser1: Partial<User> = { id: "user-1", email: "user1@example.com" };
      const mockUser2: Partial<User> = { id: "user-2", email: "user2@example.com" };

      // Rapid auth state changes
      act(() => {
        authStateCallback("SIGNED_IN", { user: mockUser1 });
        authStateCallback("SIGNED_OUT", null);
        authStateCallback("SIGNED_IN", { user: mockUser2 });
      });

      // Should end up with the final state
      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("User: user2@example.com");
        expect(screen.getByTestId("user-id")).toHaveTextContent("user-2");
      });
    });
  });

  describe("Loading State Management", () => {
    it("sets loading to false after initial user fetch", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should start with loading
      expect(screen.getByTestId("user-status")).toHaveTextContent("Loading");

      // Should finish loading
      await waitFor(() => {
        expect(screen.getByTestId("user-status")).not.toHaveTextContent("Loading");
      });
    });

    it("sets loading to false on auth state change", async () => {
      let authStateCallback: (event: any, session: any) => void;

      // Make getCurrentUser take a long time
      mockAuthApi.getCurrentUser.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { user: null as any }, error: null }), 1000)
          )
      );

      mockAuthApi.onAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        } as any;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should be loading initially
      expect(screen.getByTestId("user-status")).toHaveTextContent("Loading");

      // Trigger auth state change before getCurrentUser resolves
      act(() => {
        authStateCallback("SIGNED_IN", { user: null });
      });

      // Should no longer be loading
      await waitFor(() => {
        expect(screen.getByTestId("user-status")).not.toHaveTextContent("Loading");
      });
    });
  });
});
