/**
 * Comprehensive AuthModal Component Tests for AniManga Recommender
 * Phase B1: Authentication Components Testing
 *
 * Test Coverage:
 * - Modal visibility and interaction
 * - Form submission (login/signup)
 * - Input validation and error handling
 * - Mode switching between login/signup
 * - Loading states and UI feedback
 * - Accessibility and keyboard navigation
 * - Integration with AuthContext
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthModal } from "../../../components/Auth/AuthModal";
import { AuthProvider } from "../../../context/AuthContext";
import { authApi } from "../../../lib/supabase";

// Mock the auth API
jest.mock("../../../lib/supabase", () => ({
  authApi: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    getCurrentUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

// Test wrapper with AuthProvider
const renderWithAuth = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe("AuthModal Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful auth state - user can be null in the response
    mockAuthApi.getCurrentUser.mockResolvedValue({
      data: { user: null as any },
      error: null,
    });
  });

  describe("Modal Visibility and Basic Rendering", () => {
    it("renders modal when isOpen is true", () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("does not render modal when isOpen is false", () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={false} onClose={onClose} />);

      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });

    it("renders with initial login mode by default", () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText("Sign In")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument();
    });

    it("renders with initial signup mode when specified", () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="signup" />);

      expect(screen.getByText("Sign Up")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    });

    it("renders close button", () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByText("×");
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe("Form Elements and Input Validation", () => {
    it("renders all required form fields for login mode", () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="login" />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument();
    });

    it("renders all required form fields for signup mode", () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="signup" />);

      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it("has proper input types and attributes", () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="signup" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const displayNameInput = screen.getByLabelText(/display name/i);

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("minLength", "6");
      expect(displayNameInput).toHaveAttribute("type", "text");
      expect(displayNameInput).toHaveAttribute("required");
    });

    it("validates email format", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await userEvent.type(emailInput, "invalid-email");
      await userEvent.click(submitButton);

      // HTML5 validation should prevent submission
      expect(emailInput).toBeInvalid();
    });

    it("validates password minimum length", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await userEvent.type(passwordInput, "123");
      await userEvent.click(submitButton);

      // HTML5 validation should prevent submission due to minLength
      expect(passwordInput).toBeInvalid();
    });
  });

  describe("Mode Switching", () => {
    it("switches from login to signup mode", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="login" />);

      // Initially in login mode
      expect(screen.getByText("Sign In")).toBeInTheDocument();
      expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument();

      // Click switch to signup
      const switchButton = screen.getByRole("button", { name: /sign up/i });
      await userEvent.click(switchButton);

      // Should now be in signup mode
      expect(screen.getByText("Sign Up")).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    });

    it("switches from signup to login mode", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="signup" />);

      // Initially in signup mode
      expect(screen.getByText("Sign Up")).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();

      // Click switch to login
      const switchButton = screen.getByRole("button", { name: /sign in/i });
      await userEvent.click(switchButton);

      // Should now be in login mode
      expect(screen.getByText("Sign In")).toBeInTheDocument();
      expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument();
    });

    it("preserves form data when switching modes", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="login" />);

      // Fill in email and password
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      // Switch to signup mode
      await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

      // Email and password should be preserved
      expect(screen.getByLabelText(/email/i)).toHaveValue("test@example.com");
      expect(screen.getByLabelText(/password/i)).toHaveValue("password123");
    });
  });

  describe("Form Submission - Login", () => {
    it("submits login form with valid credentials", async () => {
      const onClose = jest.fn();
      mockAuthApi.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="login" />);

      // Fill in form
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      // Submit form
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      // Verify API call
      await waitFor(() => {
        expect(mockAuthApi.signIn).toHaveBeenCalledWith("test@example.com", "password123");
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("displays loading state during login submission", async () => {
      const onClose = jest.fn();

      // Mock delayed response
      mockAuthApi.signIn.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { user: null, session: null },
                  error: null,
                }),
              100
            )
          )
      );

      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      // Fill in form
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      // Submit form
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      // Check loading state
      expect(screen.getByRole("button", { name: /loading/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("handles login error", async () => {
      const onClose = jest.fn();
      const errorMessage = "Invalid credentials";
      mockAuthApi.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: errorMessage } as any,
      });

      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      // Fill in form
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "wrongpassword");

      // Submit form
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      // Check error display
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
      });
    });
  });

  describe("Form Submission - Signup", () => {
    it("submits signup form with valid data", async () => {
      const onClose = jest.fn();
      mockAuthApi.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="signup" />);

      // Fill in form
      await userEvent.type(screen.getByLabelText(/display name/i), "Test User");
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      // Submit form
      await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

      // Verify API call
      await waitFor(() => {
        expect(mockAuthApi.signUp).toHaveBeenCalledWith("test@example.com", "password123", {
          display_name: "Test User",
        });
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("displays loading state during signup submission", async () => {
      const onClose = jest.fn();

      // Mock delayed response
      mockAuthApi.signUp.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { user: null, session: null },
                  error: null,
                }),
              100
            )
          )
      );

      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="signup" />);

      // Fill in form
      await userEvent.type(screen.getByLabelText(/display name/i), "Test User");
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      // Submit form
      await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

      // Check loading state
      expect(screen.getByRole("button", { name: /loading/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("handles signup error", async () => {
      const onClose = jest.fn();
      const errorMessage = "Email already registered";
      mockAuthApi.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: errorMessage } as any,
      });

      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="signup" />);

      // Fill in form
      await userEvent.type(screen.getByLabelText(/display name/i), "Test User");
      await userEvent.type(screen.getByLabelText(/email/i), "existing@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      // Submit form
      await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

      // Check error display
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
      });
    });
  });

  describe("Modal Interaction and Closing", () => {
    it("closes modal when close button is clicked", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByText("×");
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("closes modal when overlay is clicked", async () => {
      const onClose = jest.fn();
      const { container } = renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      const overlay = container.querySelector(".auth-modal-overlay");

      if (overlay) {
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it("does not close modal when modal content is clicked", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      const modalContent = screen.getByText("Sign In").closest(".auth-modal");

      if (modalContent) {
        await userEvent.click(modalContent);
        expect(onClose).not.toHaveBeenCalled();
      }
    });
  });

  describe("Accessibility", () => {
    it("has proper labels and descriptions", () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="signup" />);

      // All form fields should have proper labels
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it("focuses on first input when opened", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(document.activeElement).toBe(emailInput);
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles network errors gracefully", async () => {
      const onClose = jest.fn();

      // Mock network error
      mockAuthApi.signIn.mockRejectedValue(new Error("Network error"));

      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      // Fill in form
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      // Submit form
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      // Check error handling
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
      });
    });

    it("prevents form submission when loading", async () => {
      const onClose = jest.fn();

      // Mock delayed response
      mockAuthApi.signIn.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { user: null, session: null },
                  error: null,
                }),
              1000
            )
          )
      );

      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      // Fill in form
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      // Submit form
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      // Button should be disabled during loading
      const loadingButton = screen.getByRole("button", { name: /loading/i });
      expect(loadingButton).toBeDisabled();

      // Clicking again should not trigger another submission
      await userEvent.click(loadingButton);
      expect(mockAuthApi.signIn).toHaveBeenCalledTimes(1);
    });

    it("handles empty form submission", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} />);

      // Try to submit empty form
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      // HTML5 validation should prevent submission
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInvalid();
      expect(mockAuthApi.signIn).not.toHaveBeenCalled();
    });
  });

  describe("Component State Management", () => {
    it("resets form state when mode changes", async () => {
      const onClose = jest.fn();
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="login" />);

      // Fill in form
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      // Switch to signup mode
      await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

      // Display name should be empty (not pre-filled)
      expect(screen.getByLabelText(/display name/i)).toHaveValue("");
    });

    it("maintains separate loading states for different operations", async () => {
      const onClose = jest.fn();

      // Test that switching modes doesn't affect loading state management
      renderWithAuth(<AuthModal isOpen={true} onClose={onClose} initialMode="login" />);

      // Switch to signup and back to login
      await userEvent.click(screen.getByRole("button", { name: /sign up/i }));
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      // Should still be able to submit normally
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      expect(submitButton).not.toBeDisabled();
    });
  });
});
