import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./Auth/AuthModal";
import { csrfUtils, sanitizeInput, sanitizeSearchInput } from "../utils/security"; // ✅ NEW: Import security utilities
import ConnectionIndicator from "./Feedback/ConnectionIndicator";
import "./Navbar.css";

/**
 * Enhanced Navigation Bar Component with integrated search and authentication.
 *
 * This component provides the main navigation interface for the AniManga Recommender,
 * featuring secure search functionality, user authentication controls, connection
 * monitoring, and responsive design. It serves as the primary navigation hub
 * accessible from all pages.
 *
 * Key Features:
 * - Integrated search bar with CSRF protection and input sanitization
 * - Dynamic authentication state display (Sign In/Sign Out)
 * - Real-time connection status indicator
 * - User profile display with welcome message
 * - Responsive navigation menu with accessibility support
 * - URL synchronization for search parameters
 *
 * Security Features:
 * - CSRF token validation for search submissions
 * - Input sanitization to prevent XSS attacks
 * - Controlled input length limits
 * - Secure display name handling
 *
 * Authentication Integration:
 * - Uses AuthContext for user state management
 * - Displays user welcome message with sanitized display name
 * - Handles sign-out functionality with error handling
 * - Shows/hides navigation items based on authentication status
 *
 * Search Functionality:
 * - Synchronized with URL search parameters
 * - Submits searches to home page with preserved filters
 * - Real-time input validation and sanitization
 * - Accessibility-compliant form structure
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage - automatically integrates with routing and auth
 * <Navbar />
 *
 * // The component handles all state management internally
 * // No props required as it uses context providers
 * ```
 *
 * @see {@link useAuth} for authentication context integration
 * @see {@link ConnectionIndicator} for network status monitoring
 * @see {@link AuthModal} for authentication modal functionality
 * @see {@link csrfUtils} for CSRF token management
 * @see {@link sanitizeInput} for input security utilities
 * @see {@link sanitizeSearchInput} for search-specific sanitization
 *
 * @returns {JSX.Element} The complete navigation bar with all features
 *
 * @since 1.0.0
 * @author AniManga Recommender Team
 */
const Navbar: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [navSearchValue, setNavSearchValue] = useState<string>(searchParams.get("q") || "");
  const [csrfToken, setCsrfToken] = useState(""); // ✅ NEW: CSRF token for search

  // ✅ NEW: Generate CSRF token on component mount
  useEffect(() => {
    const token = csrfUtils.generateToken();
    setCsrfToken(token);
  }, []);

  // Sync navbar search input with URL parameters
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    setNavSearchValue(urlQuery);
  }, [searchParams]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.warn("Sign out error occurred"); // ✅ UPDATED: Remove sensitive error details
    }
  };

  // ✅ UPDATED: Handle search from navbar with security
  const handleNavSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // ✅ NEW: CSRF validation
    if (!csrfUtils.validateToken(csrfToken)) {
      console.warn("Invalid CSRF token in search");
      return;
    }

    // ✅ FIXED: Apply the same sanitization for form submission
    const sanitizedSearchValue = navSearchValue
      .replace(/[<>]/g, "") // Remove < and > to prevent basic XSS
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers like onclick=
      .replace(/\.\.\//g, "") // Block path traversal attacks
      .replace(/\{\{.*?\}\}/g, "") // Block template injection
      .replace(/\$\{.*?\}/g, "") // Block expression injection
      .replace(/;\s*(echo|cat|ls|rm|curl|wget|nc|bash|sh)/gi, "") // Block command injection
      .replace(/(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)\s+(TABLE|DATABASE)/gi, ""); // Block SQL injection

    if (sanitizedSearchValue.trim()) {
      // Navigate to homepage with search term
      const newParams = new URLSearchParams(searchParams);
      newParams.set("q", sanitizedSearchValue.trim());
      newParams.set("page", "1");
      navigate(`/?${newParams.toString()}`);
    }
  };

  const handleNavSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // ✅ FIXED: Apply sanitization that preserves spaces for search
    const rawValue = event.target.value;

    // ✅ ENHANCED: More careful sanitization that preserves search functionality
    const sanitizedValue = rawValue
      .replace(/[<>]/g, "") // Remove < and > to prevent basic XSS
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers like onclick=
      .replace(/\.\.\//g, "") // Block path traversal attacks
      .replace(/\{\{.*?\}\}/g, "") // Block template injection
      .replace(/\$\{.*?\}/g, "") // Block expression injection
      .replace(/;\s*(echo|cat|ls|rm|curl|wget|nc|bash|sh)/gi, "") // Block command injection
      .replace(/(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)\s+(TABLE|DATABASE)/gi, ""); // Block SQL injection
    // Note: Removed the space normalization that might have been causing issues

    setNavSearchValue(sanitizedValue);
  };

  // Get display name from user metadata or fallback to email
  const getDisplayName = () => {
    if (!user) return "";

    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.displayName ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0];

    // ✅ UPDATED: Use regular sanitizeInput for display names (keep strict)
    return sanitizeInput(displayName || "");
  };

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-container">
          {/* Logo */}
          <Link to="/" className="navbar-logo" aria-label="AniManga Recommender - Go to homepage">
            AniMangaRecommender
          </Link>

          {/* ✅ UPDATED: Search bar with CSRF protection */}
          <form onSubmit={handleNavSearchSubmit} className="navbar-search-form">
            {/* ✅ NEW: CSRF token hidden field */}
            <input type="hidden" name="csrf_token" value={csrfToken} />

            <label htmlFor="navbar-search-input" className="sr-only">
              Search anime and manga titles from navigation
            </label>
            <input
              id="navbar-search-input"
              type="text"
              placeholder="Search titles..."
              value={navSearchValue}
              onChange={handleNavSearchChange}
              className="navbar-search-input"
              aria-describedby="navbar-search-help"
              maxLength={100} // ✅ NEW: Input length limit
            />
            <span id="navbar-search-help" className="sr-only">
              Enter keywords to search for anime and manga titles
            </span>
            <button type="submit" className="navbar-search-btn" aria-label="Submit search">
              🔍
            </button>
          </form>

          {/* Connection Indicator */}
          <ConnectionIndicator position="top-right" showText={false} showOnlyWhenPoor={true} />

          {/* Navigation Menu */}
          <ul className="nav-menu" role="menubar">
            <li className="nav-item" role="none">
              <Link to="/" className="nav-links" role="menuitem">
                Home
              </Link>
            </li>

            {/* Dashboard link - only show when user is signed in */}
            {user && (
              <li className="nav-item" role="none">
                <Link to="/dashboard" className="nav-links" role="menuitem">
                  Dashboard
                </Link>
              </li>
            )}

            {/* Authentication Section */}
            <li className="nav-item" role="none">
              {loading ? (
                <span className="nav-links loading-text">Loading...</span>
              ) : user ? (
                <div className="user-section">
                  <span className="welcome-text">
                    Welcome, <span className="username">{getDisplayName()}</span>
                  </span>
                  <button onClick={handleSignOut} className="nav-links auth-btn sign-out-btn">
                    Sign Out
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)} className="nav-links auth-btn sign-in-btn">
                  Sign In
                </button>
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* Authentication Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

export default Navbar;
