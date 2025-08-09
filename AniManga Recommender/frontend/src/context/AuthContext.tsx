/**
 * Authentication Context Module for AniManga Recommender
 *
 * This module provides a comprehensive authentication system using Supabase,
 * managing user sessions, authentication state, and providing authentication
 * methods throughout the React application.
 *
 * Key Features:
 * - Centralized authentication state management
 * - Real-time authentication state synchronization
 * - User session persistence across browser sessions
 * - Authentication method abstractions (sign up, sign in, sign out)
 * - Loading state management during authentication operations
 * - Error handling for authentication failures
 *
 * Architecture:
 * - Uses React Context API for global state management
 * - Integrates with Supabase authentication service
 * - Provides custom hook for easy context consumption
 * - Implements proper TypeScript interfaces for type safety
 *
 * @fileoverview Authentication context and provider for user management
 * @author Michael Cho
 * @since 1.0.0
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, AuthError } from "@supabase/supabase-js";
import { authApi, supabase } from "../lib/supabase";

/**
 * Authentication context interface defining all available authentication methods and state.
 *
 * This interface provides a complete API for authentication operations,
 * including user state, loading indicators, and authentication methods.
 *
 * @interface AuthContextType
 *
 * @property {User | null} user - Current authenticated user object or null if not authenticated
 * @property {boolean} loading - Loading state indicator for authentication operations
 * @property {Function} signUp - Method to create new user accounts
 * @property {Function} signIn - Method to authenticate existing users
 * @property {Function} signOut - Method to sign out current user
 *
 * @example
 * ```typescript
 * const { user, loading, signIn, signOut } = useAuth();
 *
 * if (loading) return <LoadingSpinner />;
 * if (!user) return <SignInForm onSignIn={signIn} />;
 * return <Dashboard user={user} onSignOut={signOut} />;
 * ```
 */
interface AuthContextType {
  /** Current authenticated user object or null if not authenticated */
  user: User | null;
  /** Loading state indicator for authentication operations and initial session loading */
  loading: boolean;
  /**
   * Create new user account with email and password
   * @param email - User email address
   * @param password - User password
   * @param metadata - Optional user metadata (display name, etc.)
   * @returns Promise with error object if signup fails
   */
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: AuthError | null }>;
  /**
   * Authenticate existing user with email and password
   * @param email - User email address
   * @param password - User password
   * @returns Promise with error object if signin fails
   */
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  /**
   * Sign out current authenticated user
   * @returns Promise with error object if signout fails
   */
  signOut: () => Promise<{ error: AuthError | null }>;
}

/**
 * Authentication context instance.
 *
 * This context provides authentication state and methods to all child components.
 * Should not be used directly - use the useAuth hook instead.
 *
 * @private
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider component props interface.
 *
 * @interface AuthProviderProps
 * @property {React.ReactNode} children - Child components to provide authentication context to
 */
interface AuthProviderProps {
  /** Child components that need access to authentication context */
  children: React.ReactNode;
}

/**
 * Authentication provider component that manages global authentication state.
 *
 * This component provides authentication context to all child components,
 * managing user sessions, authentication state changes, and providing
 * authentication methods. It handles initial session loading, real-time
 * authentication state synchronization, and error management.
 *
 * Key Responsibilities:
 * - Load initial user session on application start
 * - Listen for authentication state changes (login/logout)
 * - Provide authentication methods to child components
 * - Manage loading states during authentication operations
 * - Handle authentication errors gracefully
 *
 * Session Management:
 * - Automatically loads saved user session on app initialization
 * - Synchronizes authentication state across browser tabs
 * - Persists user sessions across browser restarts
 * - Handles session expiration and refresh
 *
 * @component
 * @param props - Component props containing children to provide context to
 * @returns JSX.Element with authentication context provider
 *
 * @example
 * ```tsx
 * // Wrap your app with AuthProvider to enable authentication
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <Router>
 *         <Routes>
 *           <Route path="/dashboard" element={<DashboardPage />} />
 *           <Route path="/login" element={<LoginPage />} />
 *         </Routes>
 *       </Router>
 *     </AuthProvider>
 *   );
 * }
 * ```
 *
 * @see {@link useAuth} for consuming authentication context
 * @see {@link authApi} for underlying Supabase authentication integration
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize authentication state and set up real-time listeners
  useEffect(() => {
    // Get initial session with token validation from Supabase
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.access_token) {
          setUser(null);
        } else {
          setUser(session.user);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for authentication state changes (login/logout across tabs)
    const {
      data: { subscription },
    } = authApi.onAuthStateChange((_event: any, session: any) => {
      // Only set user if session has valid access token
      if (session?.access_token) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  /**
   * Create new user account with email and password.
   *
   * This method handles user registration with optional metadata such as
   * display name. It integrates with Supabase authentication and provides
   * error handling for common registration issues. After successful signup,
   * it also creates the user profile in the backend.
   *
   * @async
   * @function signUp
   * @param {string} email - User's email address (must be valid email format)
   * @param {string} password - User's password (must meet security requirements)
   * @param {any} [metadata] - Optional user metadata object containing:
   *   - display_name: User's display name
   *   - avatar_url: User's avatar image URL
   *   - preferences: User preference settings
   * @returns {Promise<{ error: AuthError | null }>} Promise resolving to error object or null
   *
   * @example
   * ```typescript
   * const { signUp } = useAuth();
   *
   * const handleSignUp = async () => {
   *   const { error } = await signUp(
   *     "user@example.com",
   *     "securePassword123",
   *     { display_name: "John Doe" }
   *   );
   *
   *   if (error) {
   *     console.error("Sign up failed:", error.message);
   *   } else {
   *     console.log("User created successfully!");
   *   }
   * };
   * ```
   */
  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await authApi.signUp(email, password, metadata);
    
    if (!error && data?.user) {
      // After successful signup, create the user profile in our backend
      try {
        // Get the session to have the auth token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          // Call the backend to complete profile creation
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/complete-signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              username: metadata?.display_name?.toLowerCase().replace(/\s+/g, '_') || email.split('@')[0],
              display_name: metadata?.display_name || email.split('@')[0]
            })
          });

          if (!response.ok) {
            console.warn('Could not create user profile, but signup was successful');
            // Don't return an error here as the auth signup was successful
            // The user can still use the app, and profile will be created on first access
          }
        }
      } catch (profileError) {
        console.warn('Error creating user profile:', profileError);
        // Don't fail the signup if profile creation fails
        // The backend will auto-create it when needed
      }
    }
    
    return { error };
  };

  /**
   * Authenticate existing user with email and password.
   *
   * This method handles user authentication, session creation, and automatic
   * user state updates. It provides comprehensive error handling for various
   * authentication failure scenarios.
   *
   * @async
   * @function signIn
   * @param {string} email - User's registered email address
   * @param {string} password - User's password
   * @returns {Promise<{ error: AuthError | null }>} Promise resolving to error object or null
   *
   * @example
   * ```typescript
   * const { signIn } = useAuth();
   *
   * const handleSignIn = async () => {
   *   const { error } = await signIn("user@example.com", "password123");
   *
   *   if (error) {
   *     console.error("Sign in failed:", error.message);
   *   } else {
   *     console.log("User authenticated successfully!");
   *     // User state will be automatically updated via auth state listener
   *   }
   * };
   * ```
   */
  const signIn = async (email: string, password: string) => {
    const { error } = await authApi.signIn(email, password);
    return { error };
  };

  /**
   * Sign out current authenticated user.
   *
   * This method handles user session termination, state cleanup, and
   * automatic redirection to unauthenticated state. It ensures complete
   * session cleanup across all browser tabs.
   *
   * @async
   * @function signOut
   * @returns {Promise<{ error: AuthError | null }>} Promise resolving to error object or null
   *
   * @example
   * ```typescript
   * const { signOut } = useAuth();
   *
   * const handleSignOut = async () => {
   *   const { error } = await signOut();
   *
   *   if (error) {
   *     console.error("Sign out failed:", error.message);
   *   } else {
   *     console.log("User signed out successfully!");
   *     // User state will be automatically updated to null
   *   }
   * };
   * ```
   */
  const signOut = async () => {
    const { error } = await authApi.signOut();
    return { error };
  };

  // Create context value object with all authentication state and methods
  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook for consuming authentication context.
 *
 * This hook provides a convenient way to access authentication state and methods
 * from any component within the AuthProvider tree. It includes runtime validation
 * to ensure proper usage and helpful error messages for debugging.
 *
 * Features:
 * - Type-safe access to authentication context
 * - Runtime validation of proper provider usage
 * - Helpful error messages for debugging
 * - Simplified API for authentication operations
 *
 * @hook
 * @returns {AuthContextType} Authentication context containing user state and methods
 *
 * @throws {Error} When used outside of AuthProvider component tree
 *
 * @example
 * ```typescript
 * // Basic usage in a component
 * function ProfileComponent() {
 *   const { user, loading, signOut } = useAuth();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Please sign in</div>;
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user.email}!</h1>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using authentication methods
 * function LoginForm() {
 *   const { signIn, loading } = useAuth();
 *   const [email, setEmail] = useState("");
 *   const [password, setPassword] = useState("");
 *
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault();
 *     const { error } = await signIn(email, password);
 *     if (error) {
 *       alert(`Login failed: ${error.message}`);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
 *       <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
 *       <button type="submit" disabled={loading}>
 *         {loading ? "Signing in..." : "Sign In"}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @see {@link AuthProvider} for providing authentication context
 * @see {@link AuthContextType} for complete context interface
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
