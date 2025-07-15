// ABOUTME: User's custom lists management page for creating, viewing, and managing personal curated lists
// ABOUTME: Provides interface for list creation, editing, and organization with drag-and-drop functionality

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { CreateCustomListModal } from "../../components/lists/CreateCustomListModal";
import LoadingBanner from "../../components/Loading/LoadingBanner";
import ErrorFallback from "../../components/Error/ErrorFallback";
import { CustomList } from "../../types/social";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export const MyCustomListsPage: React.FC = () => {
  const { user } = useAuth();
  const { get, delete: deleteMethod, post } = useAuthenticatedApi();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);

  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState<"all" | "public" | "private" | "friends">("all");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "items">("recent");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useDocumentTitle("My Custom Lists");

  const fetchMyLists = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await get("/api/auth/lists/my-lists");
      const listsData = response.data || response.lists || response || [];
      setLists(listsData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load your lists. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user, get]);

  useEffect(() => {
    fetchMyLists();
  }, [fetchMyLists]);

  // Handle click outside dropdown to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isDropdownButton = target.closest("[data-dropdown-button]");

      if (isDropdownButton) {
        return;
      }

      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 10);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }

    // Return empty cleanup function when no dropdown is open
    return () => {};
  }, [openDropdownId]);

  const handleListCreated = (newList: CustomList) => {
    setLists((prev) => [newList, ...prev]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm("Are you sure you want to delete this list? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMethod(`/api/auth/lists/${listId}`);
      setLists((prev) => prev.filter((list) => list.id !== listId));
      setOpenDropdownId(null);
    } catch (error: any) {
      alert("Failed to delete list. Please try again.");
    }
  };

  const handleDuplicateList = async (list: CustomList) => {
    try {
      const response = await post(`/api/auth/lists/${list.id}/duplicate`, {});

      if (response) {
        setLists((prev) => [response, ...prev]);

        const toast = document.createElement("div");
        toast.textContent = `List "${response.title}" duplicated successfully!`;
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--accent-primary);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          font-weight: 500;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      }

      setOpenDropdownId(null);
    } catch (error) {
      console.error("Error duplicating list:", error);

      const toast = document.createElement("div");
      toast.textContent = "Failed to duplicate list. Please try again.";
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-weight: 500;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);

      setOpenDropdownId(null);
    }
  };

  const handleShareList = async (list: CustomList) => {
    const shareUrl = `${window.location.origin}/lists/${list.id}`;

    try {
      // Check if the Web Share API is available (mobile/modern browsers)
      if (navigator.share) {
        await navigator.share({
          title: `Check out my list: ${list.title}`,
          text: `I'd like to share this anime/manga list with you: ${list.title}`,
          url: shareUrl,
        });
      } else if (navigator.clipboard && window.isSecureContext) {
        // Use modern Clipboard API for HTTPS contexts
        await navigator.clipboard.writeText(shareUrl);

        // Create a temporary toast notification instead of alert
        const toast = document.createElement("div");
        toast.textContent = "List URL copied to clipboard!";
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--accent-primary);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          font-weight: 500;
        `;
        document.body.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        throw new Error("Clipboard not available");
      }
    } catch (err) {
      console.error("Failed to share:", err);
      // Final fallback: show the URL in a prompt for manual copying
      const userCopied = prompt("Copy this URL to share your list:", shareUrl);
      if (userCopied !== null) {
        // User clicked OK (even if they didn't actually copy)
        const toast = document.createElement("div");
        toast.textContent = "URL ready to share!";
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--accent-primary);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          font-weight: 500;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      }
    }

    setOpenDropdownId(null);
  };

  const filteredLists = lists.filter((list) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "public") return list.privacy === "public";
    if (selectedFilter === "private") return list.privacy === "private";
    if (selectedFilter === "friends") return list.privacy === "friends_only";
    return true;
  });

  const sortedLists = [...filteredLists].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "title":
        return a.title.localeCompare(b.title);
      case "items":
        return b.itemCount - a.itemCount;
      default:
        return 0;
    }
  });

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-deep-dark)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            textAlign: "center",
            background: "var(--bg-overlay)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "3rem 2rem",
            maxWidth: "500px",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              background: "var(--bg-dark)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 2rem auto",
              border: "2px solid var(--border-color)",
            }}
          >
            <svg
              style={{ width: "40px", height: "40px", color: "var(--accent-primary)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: "600",
              color: "var(--text-primary)",
              margin: "0 0 1rem 0",
            }}
          >
            Please Sign In
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              margin: "0 0 2rem 0",
              fontSize: "1rem",
              lineHeight: "1.5",
            }}
          >
            You need to be signed in to view and manage your custom lists.
          </p>
          <Link
            to="/"
            style={{
              display: "inline-block",
              padding: "1rem 2rem",
              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              color: "white",
              textDecoration: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "500",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(20, 184, 166, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-deep-dark)",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem 1rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "2rem",
            gap: "2rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "300px" }}>
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "700",
                color: "var(--text-primary)",
                margin: "0 0 0.5rem 0",
                lineHeight: "1.2",
              }}
            >
              My Custom Lists
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "1.1rem",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Create and manage your curated anime and manga lists
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/discover/lists"
              style={{
                padding: "0.75rem 1.5rem",
                background: "var(--bg-overlay)",
                color: "var(--text-primary)",
                textDecoration: "none",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: "500",
                transition: "all 0.2s ease",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-dark)";
                e.currentTarget.style.borderColor = "var(--accent-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-overlay)";
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              Discover Lists
            </Link>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                padding: "0.75rem 1.5rem",
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(20, 184, 166, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <svg
                style={{ width: "18px", height: "18px" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create New List
            </button>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div
          style={{
            background: "var(--bg-overlay)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            {/* Privacy Filters */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { value: "all", label: "All Lists" },
                { value: "public", label: "Public" },
                { value: "friends", label: "Friends Only" },
                { value: "private", label: "Private" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedFilter(filter.value as any)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    background: selectedFilter === filter.value ? "var(--accent-primary)" : "var(--bg-dark)",
                    color: selectedFilter === filter.value ? "white" : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFilter !== filter.value) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.borderColor = "var(--accent-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFilter !== filter.value) {
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.borderColor = "var(--border-color)";
                    }
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Sorting */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  fontWeight: "500",
                }}
              >
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  background: "var(--bg-dark)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                <option value="recent">Recently Updated</option>
                <option value="title">Title (A-Z)</option>
                <option value="items">Most Items</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "4rem 0",
              background: "var(--bg-overlay)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
            }}
          >
            <LoadingBanner message="Loading your custom lists..." isVisible={true} />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div
            style={{
              background: "var(--bg-overlay)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "2rem",
              marginBottom: "2rem",
            }}
          >
            <ErrorFallback error={new Error(error)} />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && sortedLists.length === 0 && (
          <div
            style={{
              background: "var(--bg-overlay)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              padding: "4rem 2rem",
              textAlign: "center",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                background: "var(--bg-dark)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 2rem auto",
                border: "2px solid var(--border-color)",
              }}
            >
              <svg
                style={{ width: "40px", height: "40px", color: "var(--accent-primary)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>

            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: "var(--text-primary)",
                margin: "0 0 1rem 0",
                lineHeight: "1.3",
              }}
            >
              {selectedFilter === "all"
                ? "No Custom Lists Yet"
                : `No ${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Lists`}
            </h3>

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "1rem",
                lineHeight: "1.6",
                margin: "0 0 2rem 0",
                maxWidth: "400px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {selectedFilter === "all"
                ? "Create your first custom list to organize and share your favorite anime and manga with the community!"
                : `You don't have any ${selectedFilter} lists yet. Create one or change the filter to see other lists.`}
            </p>

            {selectedFilter === "all" ? (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  padding: "1rem 2rem",
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 25px rgba(20, 184, 166, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Create Your First List
              </button>
            ) : (
              <button
                onClick={() => setSelectedFilter("all")}
                style={{
                  padding: "1rem 2rem",
                  background: "transparent",
                  color: "var(--accent-primary)",
                  border: "2px solid var(--accent-primary)",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent-primary)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--accent-primary)";
                }}
              >
                Show All Lists
              </button>
            )}
          </div>
        )}

        {/* Enhanced Lists Grid */}
        {!isLoading && !error && sortedLists.length > 0 && (
          <section
            style={{
              background: "var(--bg-secondary)",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              overflow: "visible",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div className="section-header">
              <div className="section-title">
                <svg
                  className="section-icon"
                  style={{ width: "20px", height: "20px", color: "var(--accent-primary)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <h2>Your Lists ({sortedLists.length})</h2>
              </div>
            </div>
            <div className="section-content" style={{ padding: "2rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {sortedLists.map((list) => (
                  <div
                    key={list.id}
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                      overflow: "visible",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%", // Make all cards same height
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.15)";
                      e.currentTarget.style.borderColor = "var(--accent-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
                      e.currentTarget.style.borderColor = "var(--border-color)";
                    }}
                  >
                    {/* List Header */}
                    <div
                      style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-color)", flex: "1" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          marginBottom: "1rem",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <h3
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: "600",
                              color: "var(--text-primary)",
                              marginBottom: "0.5rem",
                              lineHeight: "1.3",
                            }}
                          >
                            {list.title}
                          </h3>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              fontSize: "0.9rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <svg
                                style={{ width: "16px", height: "16px", color: "var(--text-muted)" }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <strong style={{ color: "var(--accent-primary)" }}>{list.itemCount}</strong>{" "}
                              items
                            </span>
                            <span>•</span>
                            <span
                              style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "20px",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                background:
                                  list.privacy === "public"
                                    ? "rgba(34, 197, 94, 0.1)"
                                    : list.privacy === "friends_only"
                                    ? "rgba(59, 130, 246, 0.1)"
                                    : "rgba(107, 114, 128, 0.1)",
                                color:
                                  list.privacy === "public"
                                    ? "#059669"
                                    : list.privacy === "friends_only"
                                    ? "#2563eb"
                                    : "#6b7280",
                                border: "1px solid",
                                borderColor:
                                  list.privacy === "public"
                                    ? "rgba(34, 197, 94, 0.2)"
                                    : list.privacy === "friends_only"
                                    ? "rgba(59, 130, 246, 0.2)"
                                    : "rgba(107, 114, 128, 0.2)",
                              }}
                            >
                              {list.privacy === "public" ? (
                                <svg
                                  style={{ width: "12px", height: "12px" }}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              ) : list.privacy === "friends_only" ? (
                                <svg
                                  style={{ width: "12px", height: "12px" }}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  style={{ width: "12px", height: "12px" }}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                              )}{" "}
                              {list.privacy}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {list.description && (
                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.95rem",
                            lineHeight: "1.5",
                            marginBottom: "1rem",
                          }}
                        >
                          {list.description.length > 120
                            ? `${list.description.substring(0, 120)}...`
                            : list.description}
                        </p>
                      )}

                      {/* Tags */}
                      {list.tags && list.tags.length > 0 && (
                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}
                        >
                          {list.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              style={{
                                padding: "0.25rem 0.75rem",
                                background: "var(--bg-secondary)",
                                color: "var(--text-secondary)",
                                borderRadius: "12px",
                                fontSize: "0.8rem",
                                fontWeight: "500",
                                border: "1px solid var(--border-color)",
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                          {list.tags.length > 3 && (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--text-tertiary)",
                                alignSelf: "center",
                              }}
                            >
                              +{list.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <svg
                            style={{ width: "16px", height: "16px", color: "var(--text-muted)" }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Updated {new Date(list.updatedAt).toLocaleDateString()}
                        </span>
                        {list.followersCount > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <svg
                              style={{ width: "16px", height: "16px", color: "var(--text-muted)" }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                              />
                            </svg>
                            <strong style={{ color: "var(--accent-primary)" }}>{list.followersCount}</strong>{" "}
                            followers
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ padding: "1rem", display: "flex", gap: "0.75rem" }}>
                      <Link
                        to={`/lists/${list.id}`}
                        style={{
                          flex: 1,
                          padding: "0.75rem 1rem",
                          textAlign: "center",
                          background:
                            "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "8px",
                          fontWeight: "500",
                          fontSize: "0.9rem",
                          transition: "all 0.2s ease",
                          border: "none",
                        }}
                      >
                        <svg
                          style={{ width: "16px", height: "16px", marginRight: "8px" }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        View & Edit
                      </Link>
                      <div
                        style={{ position: "relative" }}
                        ref={openDropdownId === list.id ? dropdownRef : null}
                      >
                        <button
                          data-dropdown-button
                          style={{
                            padding: "0.75rem",
                            background:
                              openDropdownId === list.id ? "var(--accent-primary)" : "var(--bg-secondary)",
                            border: `1px solid ${
                              openDropdownId === list.id ? "var(--accent-primary)" : "var(--border-color)"
                            }`,
                            borderRadius: "8px",
                            color: openDropdownId === list.id ? "white" : "var(--text-secondary)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            fontSize: "1rem",
                          }}
                          title="More options"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // Prevent double-click processing
                            const now = Date.now();
                            if (now - lastClickTimeRef.current < 200) {
                              console.log("Ignoring rapid click");
                              return;
                            }
                            lastClickTimeRef.current = now;

                            const newDropdownId = openDropdownId === list.id ? null : list.id;
                            setOpenDropdownId(newDropdownId);
                          }}
                        >
                          <svg
                            style={{ width: "16px", height: "16px" }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            />
                          </svg>
                        </button>

                        {openDropdownId === list.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: 0,
                              marginTop: "0.5rem",
                              background: "var(--bg-overlay)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "8px",
                              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                              zIndex: 50,
                              minWidth: "180px",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareList(list);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                width: "100%",
                                padding: "0.75rem 1rem",
                                background: "none",
                                border: "none",
                                textAlign: "left",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                borderRadius: "8px 8px 0 0",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-dark)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                              <svg
                                style={{ width: "16px", height: "16px" }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                                />
                              </svg>
                              Share List
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateList(list);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                width: "100%",
                                padding: "0.75rem 1rem",
                                background: "none",
                                border: "none",
                                textAlign: "left",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-dark)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                              <svg
                                style={{ width: "16px", height: "16px" }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                              Duplicate
                            </button>
                            <hr
                              style={{
                                margin: 0,
                                border: "none",
                                borderTop: "1px solid var(--border-color)",
                              }}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteList(list.id);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                width: "100%",
                                padding: "0.75rem 1rem",
                                background: "none",
                                border: "none",
                                textAlign: "left",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                borderRadius: "0 0 8px 8px",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")
                              }
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                              <svg
                                style={{ width: "16px", height: "16px" }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Create List Modal */}
        <CreateCustomListModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreateList={handleListCreated}
        />
      </div>
    </div>
  );
};
