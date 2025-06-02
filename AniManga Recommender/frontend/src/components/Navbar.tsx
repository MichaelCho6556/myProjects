import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./Auth/AuthModal";
import "./Navbar.css";

/**
 * Navbar Component - Application navigation with TypeScript support
 *
 * @returns JSX.Element
 */
const Navbar: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
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
          <Link to="/" className="navbar-logo" aria-label="AniManga Recommender - Go to homepage">
            AniMangaRecommender
          </Link>
          <ul className="nav-menu" role="menubar">
            <li className="nav-item" role="none">
              <Link to="/" className="nav-links" role="menuitem" aria-current="page">
                Home
              </Link>
            </li>

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
