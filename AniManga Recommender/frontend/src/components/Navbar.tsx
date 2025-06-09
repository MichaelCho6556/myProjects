import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./Auth/AuthModal";
import { csrfUtils, sanitizeInput } from "../utils/security"; // ✅ NEW: Import security utilities
import "./Navbar.css";

/**
 * Enhanced Navbar Component with integrated search functionality and security
 *
 * @returns JSX.Element
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

    // ✅ NEW: Input sanitization
    const sanitizedSearchValue = sanitizeInput(navSearchValue);

    if (sanitizedSearchValue.trim()) {
      // Navigate to homepage with search term
      const newParams = new URLSearchParams(searchParams);
      newParams.set("q", sanitizedSearchValue.trim());
      newParams.set("page", "1");
      navigate(`/?${newParams.toString()}`);
    }
  };

  const handleNavSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // ✅ NEW: Input sanitization on change
    const sanitizedValue = sanitizeInput(event.target.value);
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

    // ✅ NEW: Sanitize display name
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
