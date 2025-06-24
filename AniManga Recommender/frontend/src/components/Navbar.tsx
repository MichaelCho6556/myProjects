import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./Auth/AuthModal";
import { useRealTimeNotifications } from "../hooks/useRealTimeNotifications";
import { csrfUtils, sanitizeInput, sanitizeSearchInput } from "../utils/security"; // ✅ NEW: Import security utilities
import EnhancedSearch from "./EnhancedSearch";
import "./Navbar.css";

/**
 * Enhanced Navigation Bar Component with integrated search and authentication.
 *
 * This component provides the main navigation interface for the AniManga Recommender,
 * featuring secure search functionality, user authentication controls, and responsive
 * design. It serves as the primary navigation hub accessible from all pages.
 *
 * Key Features:
 * - Integrated search bar with CSRF protection and input sanitization
 * - Dynamic authentication state display (Sign In/Sign Out)
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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Real-time notifications
  const {
    notifications,
    unreadCount,
    isConnected,
    error: notificationError,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useRealTimeNotifications();

  // Note: Search functionality is handled by EnhancedSearch component

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showUserDropdown || showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserDropdown, showNotifications]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.warn("Sign out error occurred"); // ✅ UPDATED: Remove sensitive error details
    }
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

          {/* Enhanced Search Component */}
          <div className="navbar-search-container">
            <EnhancedSearch className="navbar-enhanced-search" />
          </div>

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

            {/* Notifications - only show when user is signed in */}
            {user && (
              <li className="nav-item" role="none">
                <div className="notification-section" ref={notificationRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="notification-bell-btn"
                    aria-haspopup="true"
                    aria-expanded={showNotifications}
                    aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="notification-dropdown">
                      <div className="notification-header">
                        <h3>Notifications</h3>
                        <div className="notification-controls">
                          <div className={`connection-status ${isConnected ? "connected" : "disconnected"}`}>
                            <div className="status-indicator"></div>
                            <span>{isConnected ? "Live" : "Offline"}</span>
                          </div>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="mark-all-read-btn">
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>

                      {notificationError && (
                        <div className="notification-error">
                          <span>⚠️ {notificationError}</span>
                          <button onClick={refreshNotifications} className="retry-btn">
                            Retry
                          </button>
                        </div>
                      )}

                      <div className="notification-list">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`notification-item ${!notification.read ? "unread" : ""}`}
                              onClick={() => !notification.read && markAsRead(notification.id)}
                            >
                              <div className="notification-content">
                                <h4 className="notification-title">{notification.title}</h4>
                                <p className="notification-message">{notification.message}</p>
                                <span className="notification-time">
                                  {new Date(notification.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {!notification.read && <div className="notification-dot"></div>}
                            </div>
                          ))
                        ) : (
                          <div className="notification-empty">
                            <svg
                              width="40"
                              height="40"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="empty-icon"
                            >
                              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                            <p>No notifications yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            )}

            {/* Authentication Section */}
            <li className="nav-item" role="none">
              {loading ? (
                <span className="nav-links loading-text">Loading...</span>
              ) : user ? (
                <div className="user-section" ref={dropdownRef}>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="user-dropdown-trigger"
                    aria-haspopup="true"
                    aria-expanded={showUserDropdown}
                  >
                    <span className="welcome-text">
                      Welcome, <span className="username">{getDisplayName()}</span>
                    </span>
                    <svg
                      className={`dropdown-arrow ${showUserDropdown ? "rotated" : ""}`}
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M8 11L3 6h10l-5 5z" />
                    </svg>
                  </button>

                  {showUserDropdown && (
                    <div className="user-dropdown-menu">
                      <Link
                        to={`/users/${user.user_metadata?.username || user.email?.split("@")[0]}`}
                        className="dropdown-item"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM8 9a5 5 0 00-5 5 1 1 0 001 1h8a1 1 0 001-1 5 5 0 00-5-5z" />
                        </svg>
                        My Profile
                      </Link>
                      <Link to="/lists" className="dropdown-item" onClick={() => setShowUserDropdown(false)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                          <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
                        </svg>
                        My Lists
                      </Link>
                      <Link
                        to="/my-lists"
                        className="dropdown-item"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2" />
                        </svg>
                        Custom Lists
                      </Link>
                      <Link
                        to="/settings/privacy"
                        className="dropdown-item"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z" />
                        </svg>
                        Privacy Settings
                      </Link>
                      <hr className="dropdown-divider" />
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          handleSignOut();
                        }}
                        className="dropdown-item sign-out-item"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0v2z" />
                          <path d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3z" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  )}
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
