import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./Auth/AuthModal";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
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
interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

const Navbar: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const api = useAuthenticatedApi();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

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

  // Fetch notifications when user is authenticated
  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Set up polling for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
    return;
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setNotificationsLoading(true);
      const response = await api.get("/api/auth/notifications?limit=10");
      setNotifications(response.notifications || []);
      setUnreadCount(response.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await api.patch(`/api/auth/notifications/${notificationId}/read`);
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.patch("/api/auth/notifications/read-all");
      // Update local state
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

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
                        {unreadCount > 0 && (
                          <button onClick={markAllNotificationsAsRead} className="mark-all-read-btn">
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="notification-list">
                        {notificationsLoading ? (
                          <div className="notification-loading">
                            <div className="spinner"></div>
                            <span>Loading notifications...</span>
                          </div>
                        ) : notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`notification-item ${!notification.read ? "unread" : ""}`}
                              onClick={() => !notification.read && markNotificationAsRead(notification.id)}
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
                          <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zM3 7v4a4 4 0 0 0 8 0V7a1 1 0 0 1 1 1v4a6 6 0 0 1-12 0V8a1 1 0 0 1 1-1z" />
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
