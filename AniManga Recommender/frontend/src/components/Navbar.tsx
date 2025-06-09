import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./Auth/AuthModal";
import "./Navbar.css";

/**
 * Enhanced Navbar Component with integrated search functionality
 *
 * @returns JSX.Element
 */
const Navbar: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ✅ NEW: Search state for navbar
  const [navSearchValue, setNavSearchValue] = useState<string>(searchParams.get("q") || "");

  // Sync navbar search input with URL parameters
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    setNavSearchValue(urlQuery);
  }, [searchParams]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // ✅ NEW: Handle search from navbar
  const handleNavSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (navSearchValue.trim()) {
      // Navigate to homepage with search term
      const newParams = new URLSearchParams(searchParams);
      newParams.set("q", navSearchValue.trim());
      newParams.set("page", "1"); // Reset to first page
      navigate(`/?${newParams.toString()}`);
    }
  };

  const handleNavSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNavSearchValue(event.target.value);
  };

  // Get display name from user metadata or fallback to email
  const getDisplayName = () => {
    if (!user) return "";

    // Try to get display name from user metadata
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.displayName ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0]; // Fallback to email username part

    return displayName;
  };

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-container">
          {/* Logo */}
          <Link to="/" className="navbar-logo" aria-label="AniManga Recommender - Go to homepage">
            AniMangaRecommender
          </Link>

          {/* ✅ NEW: Search bar in navbar */}
          <form onSubmit={handleNavSearchSubmit} className="navbar-search-form">
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
