import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { UserItem } from "../../types";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { sanitizeSearchInput } from "../../utils/security"; // ✅ NEW: Import search sanitization
import { logger } from "../../utils/logger";
import Spinner from "../../components/Spinner";
import "./UserListsPage.css";

interface UserListsPageProps {}

interface ListData {
  items: UserItem[];
  total: number;
  loading: boolean;
  error: string | null;
}

const UserListsPage: React.FC<UserListsPageProps> = () => {
  const { user } = useAuth();
  const { makeAuthenticatedRequest } = useAuthenticatedApi();
  const [searchParams, setSearchParams] = useSearchParams();

  // Prevent duplicate requests
  const requestInProgress = useRef(false);
  const abortController = useRef<AbortController | null>(null);

  // URL parameters
  const currentStatus = searchParams.get("status") || "watching";
  const sortBy = searchParams.get("sort_by") || "date_added_desc";
  const searchQuery = searchParams.get("q") || "";
  const selectedMediaType = searchParams.get("media_type") || "all";
  const minUserRating = searchParams.get("min_user_rating") || "";

  // State
  const [listData, setListData] = useState<ListData>({
    items: [],
    total: 0,
    loading: true,
    error: null,
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  // Status options for navigation
  const statusOptions = useMemo(
    () => [
      { value: "watching", label: "Currently Watching", icon: "👁️" },
      { value: "plan_to_watch", label: "Plan to Watch", icon: "📋" },
      { value: "completed", label: "Completed", icon: "✅" },
      { value: "on_hold", label: "On Hold", icon: "⏸️" },
      { value: "dropped", label: "Dropped", icon: "❌" },
    ],
    []
  );

  // Sorting options
  const sortOptions = useMemo(
    () => [
      { value: "date_added_desc", label: "Date Added (Newest)" },
      { value: "date_added_asc", label: "Date Added (Oldest)" },
      { value: "title_asc", label: "Title (A-Z)" },
      { value: "title_desc", label: "Title (Z-A)" },
      { value: "my_rating_desc", label: "My Rating (Highest)" },
      { value: "my_rating_asc", label: "My Rating (Lowest)" },
      { value: "global_score_desc", label: "Global Score (Highest)" },
      { value: "global_score_asc", label: "Global Score (Lowest)" },
      { value: "progress_desc", label: "Progress (Most)" },
      { value: "progress_asc", label: "Progress (Least)" },
    ],
    []
  );

  // Media type options
  const mediaTypeOptions = useMemo(
    () => [
      { value: "all", label: "All Types" },
      { value: "anime", label: "Anime Only" },
      { value: "manga", label: "Manga Only" },
    ],
    []
  );

  // Add rating filter options
  const ratingFilterOptions = useMemo(
    () => [
      { value: "", label: "Any Rating" },
      { value: "9", label: "9+ Stars" },
      { value: "8", label: "8+ Stars" },
      { value: "7", label: "7+ Stars" },
      { value: "6", label: "6+ Stars" },
      { value: "5", label: "5+ Stars" },
    ],
    []
  );

  useDocumentTitle(`${statusOptions.find((s) => s.value === currentStatus)?.label || "Lists"} | My Lists`);

  // ✅ FIXED: Enhanced fetch function with better error handling and data validation
  const fetchListData = useCallback(async () => {
    if (!user) {
      setListData({
        items: [],
        total: 0,
        loading: false,
        error: "User not authenticated",
      });
      return;
    }

    // Prevent duplicate requests
    if (requestInProgress.current) {
      console.log("🚫 Request already in progress, skipping...");
      return;
    }

    // Cancel any existing request
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    requestInProgress.current = true;

    try {
      setListData((prev) => ({ ...prev, loading: true, error: null }));

      console.log(`🔍 Fetching items for status: ${currentStatus}`);

      // Use the enhanced API endpoint that includes item details
      const response = await makeAuthenticatedRequest(`/api/auth/user-items?status=${currentStatus}`);

      console.log(`📊 Raw API response:`, response);

      // ✅ FIXED: Better data validation and structure checking
      let items: UserItem[] = [];
      if (Array.isArray(response)) {
        items = response.filter((item): item is UserItem => {
          // More thorough validation
          const isValid =
            item &&
            typeof item === "object" &&
            typeof item.item_uid === "string" &&
            item.item_uid.length > 0 &&
            item.item && // ✅ Ensure item details exist
            typeof item.item === "object";

          return isValid;
        });
      } else if (response && Array.isArray(response.items)) {
        items = response.items.filter((item: any): item is UserItem => {
          const isValid =
            item &&
            typeof item === "object" &&
            typeof item.item_uid === "string" &&
            item.item_uid.length > 0 &&
            item.item &&
            typeof item.item === "object";
          return isValid;
        });
      }

      setListData({
        items: items,
        total: items.length,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      // Only set error if request wasn't aborted
      if (error.name !== "AbortError") {
        setListData((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to load list",
        }));
      }
    } finally {
      requestInProgress.current = false;
    }
  }, [user?.id, currentStatus, makeAuthenticatedRequest]);

  // ✅ FIXED: Better filtering logic
  const filteredItems = useMemo(() => {
    let filtered = [...listData.items];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((userItem) => {
        const item = userItem.item;
        if (!item) return false;

        const titleMatch = item.title?.toLowerCase().includes(query) || false;
        const englishTitleMatch = item.title_english?.toLowerCase().includes(query) || false;
        const genreMatch = item.genres?.some((genre) => genre.toLowerCase().includes(query)) || false;
        const themeMatch = item.themes?.some((theme) => theme.toLowerCase().includes(query)) || false;

        return titleMatch || englishTitleMatch || genreMatch || themeMatch;
      });
    }

    // ✅ FIXED: More robust media type filtering
    if (selectedMediaType !== "all") {
      filtered = filtered.filter((userItem) => {
        const itemMediaType = userItem.item?.media_type;

        // Handle variations in media type format
        if (!itemMediaType) return false;

        const normalizedItemType = itemMediaType.toLowerCase().trim();
        const normalizedSelectedType = selectedMediaType.toLowerCase().trim();

        return normalizedItemType === normalizedSelectedType;
      });
    }

    // Filter by minimum user rating
    if (minUserRating) {
      const minRating = parseFloat(minUserRating);
      filtered = filtered.filter((userItem) => {
        const userRating = userItem.rating || 0;
        return userRating >= minRating;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date_added_desc":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "date_added_asc":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "title_asc":
          return (a.item?.title || "").localeCompare(b.item?.title || "");
        case "title_desc":
          return (b.item?.title || "").localeCompare(a.item?.title || "");

        // ✅ NEW: User's personal rating sorting
        case "my_rating_desc":
          const aUserRating = a.rating || 0;
          const bUserRating = b.rating || 0;
          // Items with ratings come first, then by rating value
          if (aUserRating === 0 && bUserRating === 0) return 0;
          if (aUserRating === 0) return 1; // No rating goes to end
          if (bUserRating === 0) return -1; // No rating goes to end
          return bUserRating - aUserRating;
        case "my_rating_asc":
          const aUserRatingAsc = a.rating || 0;
          const bUserRatingAsc = b.rating || 0;
          // Items with ratings come first, then by rating value
          if (aUserRatingAsc === 0 && bUserRatingAsc === 0) return 0;
          if (aUserRatingAsc === 0) return 1; // No rating goes to end
          if (bUserRatingAsc === 0) return -1; // No rating goes to end
          return aUserRatingAsc - bUserRatingAsc;

        // ✅ RENAMED: Global score sorting (what was previously "score")
        case "global_score_desc":
          return (b.item?.score || 0) - (a.item?.score || 0);
        case "global_score_asc":
          return (a.item?.score || 0) - (b.item?.score || 0);

        case "progress_desc":
          return (b.progress || 0) - (a.progress || 0);
        case "progress_asc":
          return (a.progress || 0) - (b.progress || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [listData.items, searchQuery, selectedMediaType, sortBy, minUserRating]);

  // ✅ FIXED: Separate effect for initial load and status changes
  useEffect(() => {
    if (user) {
      fetchListData();
    }

    // Cleanup function to abort requests when component unmounts or user changes
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      requestInProgress.current = false;
    };
  }, [user?.id, currentStatus]); // ✅ FIXED: Only depend on user.id and currentStatus

  // Update URL parameters
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  // Handle status change
  const handleStatusChange = useCallback(
    (newStatus: string) => {
      updateParams({ status: newStatus });
    },
    [updateParams]
  );

  // Handle sorting
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateParams({ sort_by: e.target.value });
    },
    [updateParams]
  );

  // Handle search
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const query = formData.get("search") as string | null;
      // ✅ FIXED: Use search-specific sanitization that preserves spaces
      const sanitizedQuery = query ? sanitizeSearchInput(query) : "";
      updateParams({ q: sanitizedQuery.trim() });
    },
    [updateParams]
  );

  // Handle individual item status update
  const handleItemStatusUpdate = useCallback(
    async (itemUid: string, newStatus: string) => {
      try {
        await makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
          method: "POST",
          body: JSON.stringify({ status: newStatus }),
        });

        // ✅ FIXED: Only refresh if not already loading
        if (!requestInProgress.current) {
          await fetchListData();
        }
      } catch (error: any) {
        logger.error("Error updating item status", {
          error: error?.message || "Unknown error",
          context: "UserListsPage",
          operation: "updateItemStatus",
          userId: user?.id,
          itemUid: itemUid,
          newStatus: newStatus
        });
      }
    },
    [fetchListData, makeAuthenticatedRequest]
  );

  // Handle item selection for bulk actions
  const handleItemSelect = useCallback((itemUid: string, selected: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemUid);
      } else {
        newSet.delete(itemUid);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.item_uid)));
    }
  }, [selectedItems.size, filteredItems]);

  // Handle bulk status update
  const handleBulkStatusUpdate = useCallback(
    async (newStatus: string) => {
      if (selectedItems.size === 0) return;

      try {
        setIsUpdatingBulk(true);

        const updatePromises = Array.from(selectedItems).map((itemUid) =>
          makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
            method: "POST",
            body: JSON.stringify({ status: newStatus }),
          })
        );

        await Promise.all(updatePromises);
        setSelectedItems(new Set());

        // ✅ FIXED: Only refresh if not already loading
        if (!requestInProgress.current) {
          await fetchListData();
        }
      } catch (error: any) {
        logger.error("Error updating items in bulk", {
          error: error?.message || "Unknown error",
          context: "UserListsPage",
          operation: "updateItemsInBulk",
          userId: user?.id,
          itemCount: selectedItems.length,
          newStatus: newStatus
        });
      } finally {
        setIsUpdatingBulk(false);
      }
    },
    [selectedItems, fetchListData, makeAuthenticatedRequest]
  );

  // Handle bulk remove
  const handleBulkRemove = useCallback(async () => {
    if (selectedItems.size === 0) return;
    if (!window.confirm(`Remove ${selectedItems.size} items from your list?`)) return;

    try {
      setIsUpdatingBulk(true);

      const removePromises = Array.from(selectedItems).map((itemUid) =>
        makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}`, {
          method: "DELETE",
        })
      );

      await Promise.all(removePromises);
      setSelectedItems(new Set());

      // ✅ FIXED: Only refresh if not already loading
      if (!requestInProgress.current) {
        await fetchListData();
      }
    } catch (error: any) {
      logger.error("Error removing items in bulk", {
        error: error?.message || "Unknown error",
        context: "UserListsPage",
        operation: "removeItemsInBulk",
        userId: user?.id,
        itemCount: selectedItems.length
      });
    } finally {
      setIsUpdatingBulk(false);
    }
  }, [selectedItems, fetchListData, makeAuthenticatedRequest]);

  // Authentication check
  if (!user) {
    return (
      <div className="user-lists-page">
        <div className="auth-required">
          <h2>Please Sign In</h2>
          <p>You need to be signed in to view your lists.</p>
          <Link to="/" className="btn-primary">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusConfig = statusOptions.find((s) => s.value === currentStatus);

  return (
    <div className="user-lists-page">
      <div className="user-lists-container" data-testid="lists-container">
        {/* Header */}
        <header className="lists-header">
          <div className="header-content">
            <h1>
              {currentStatusConfig?.icon} {currentStatusConfig?.label}
            </h1>
            <p>
              {filteredItems.length === 0
                ? "No items found"
                : `${filteredItems.length} ${filteredItems.length === 1 ? "item" : "items"}`}
              {filteredItems.length !== listData.total && ` (filtered from ${listData.total})`}
            </p>
          </div>
          <Link to="/dashboard" className="back-to-dashboard">
            ← Back to Dashboard
          </Link>
        </header>

        {/* Status Navigation */}
        <nav className="status-nav">
          {statusOptions.map((status) => (
            <button
              key={status.value}
              className={`status-nav-button ${currentStatus === status.value ? "active" : ""}`}
              onClick={() => handleStatusChange(status.value)}
              disabled={listData.loading} // ✅ FIXED: Disable while loading
            >
              <span className="status-icon">{status.icon}</span>
              <span className="status-label">{status.label}</span>
            </button>
          ))}
        </nav>

        {/* Controls Bar */}
        <div className="controls-bar">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              name="search"
              placeholder="Search your list..."
              defaultValue={searchQuery}
              className="search-input"
              disabled={listData.loading} // ✅ FIXED: Disable while loading
            />
            <button type="submit" className="search-button" disabled={listData.loading}>
              🔍
            </button>
          </form>

          {/* Filters */}
          <div className="filters-row">
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="filter-select"
              disabled={listData.loading} // ✅ FIXED: Disable while loading
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedMediaType}
              onChange={(e) => updateParams({ media_type: e.target.value })}
              className="filter-select"
              disabled={listData.loading} // ✅ FIXED: Disable while loading
            >
              {mediaTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={minUserRating}
              onChange={(e) => updateParams({ min_user_rating: e.target.value })}
              className="filter-select"
              disabled={listData.loading}
            >
              {ratingFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="bulk-actions">
              <span className="selection-count">{selectedItems.size} selected</span>

              <select
                onChange={(e) => {
                  if (e.target.value && e.target.value !== currentStatus) {
                    handleBulkStatusUpdate(e.target.value);
                  }
                  e.target.value = "";
                }}
                className="bulk-select"
                disabled={isUpdatingBulk || listData.loading}
              >
                <option value="">Move to...</option>
                {statusOptions
                  .filter((s) => s.value !== currentStatus)
                  .map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
              </select>

              <button
                onClick={handleBulkRemove}
                className="bulk-remove-btn"
                disabled={isUpdatingBulk || listData.loading}
              >
                Remove
              </button>

              <button
                onClick={() => setSelectedItems(new Set())}
                className="bulk-clear-btn"
                disabled={isUpdatingBulk || listData.loading}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {listData.loading && (
          <div className="loading-state">
            <Spinner size="40px" data-testid="loading-spinner" />
            <p>Loading your {currentStatusConfig?.label.toLowerCase()}...</p>
          </div>
        )}

        {/* Error State */}
        {listData.error && (
          <div className="error-state">
            <h3>Error Loading List</h3>
            <p>{listData.error}</p>
            <button onClick={fetchListData} className="retry-button" disabled={listData.loading}>
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!listData.loading && !listData.error && filteredItems.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">{currentStatusConfig?.icon}</div>
            <h3>
              {listData.total === 0 ? `No ${currentStatusConfig?.label} Yet` : "No Items Match Your Filters"}
            </h3>
            <p>
              {listData.total === 0
                ? currentStatus === "watching"
                  ? "Start watching some anime or reading manga to see them here!"
                  : currentStatus === "plan_to_watch"
                  ? "Add items to your plan to watch list to keep track of what you want to watch next."
                  : currentStatus === "completed"
                  ? "Mark items as completed to build your accomplishment list!"
                  : currentStatus === "on_hold"
                  ? "Items you've temporarily paused will appear here."
                  : "Items you've dropped will appear here."
                : "Try adjusting your search or filter criteria."}
            </p>
            {listData.total === 0 ? (
              <Link to="/" className="browse-button">
                Browse Anime & Manga
              </Link>
            ) : (
              <button onClick={() => updateParams({ q: null, media_type: null })} className="browse-button">
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Items Grid */}
        {!listData.loading && !listData.error && filteredItems.length > 0 && (
          <>
            {/* Select All Controls */}
            <div className="select-all-controls">
              <label className="select-all-label">
                <input
                  type="checkbox"
                  checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                  onChange={handleSelectAll}
                />
                Select All ({filteredItems.length})
              </label>
            </div>

            {/* Items Grid - Using Dashboard Style */}
            <div className="items-grid" data-testid="items-grid">
              {filteredItems.map((userItem) => {
                // ✅ FIXED: Enhanced validation before rendering
                if (!userItem || !userItem.item_uid || !userItem.item) {
                  console.warn("⚠️ Skipping invalid item:", userItem);
                  return null;
                }

                return (
                  <div key={userItem.item_uid} className="list-item-wrapper">
                    <label className="item-select-label">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(userItem.item_uid)}
                        onChange={(e) => handleItemSelect(userItem.item_uid, e.target.checked)}
                        className="item-select-checkbox"
                      />
                    </label>

                    <div className="dashboard-item-card">
                      <div className="item-image-container">
                        <Link to={`/item/${userItem.item_uid}`}>
                          <img
                            src={userItem.item.image_url || "/images/default.webp"}
                            alt={userItem.item.title || "Unknown"}
                            className="item-thumbnail"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/default.webp";
                            }}
                          />
                        </Link>
                      </div>

                      <div className="item-info">
                        <h4 className="item-title">
                          <Link to={`/item/${userItem.item_uid}`}>
                            {userItem.item.title || "Unknown Title"}
                          </Link>
                        </h4>

                        <div className="item-meta">
                          <span className="item-type">
                            {userItem.item.media_type?.toUpperCase() || "UNKNOWN"}
                          </span>
                          {userItem.item.score && <span className="item-score">★ {userItem.item.score}</span>}
                        </div>

                        {(currentStatus === "watching" || currentStatus === "plan_to_watch") && (
                          <div className="progress-info">
                            <span>Progress: {userItem.progress || 0}</span>
                            {userItem.item.episodes && <span>/ {userItem.item.episodes}</span>}
                            {userItem.item.chapters && <span>/ {userItem.item.chapters} chapters</span>}
                          </div>
                        )}

                        {userItem.start_date && (
                          <div className="date-info">
                            <span>Started: {new Date(userItem.start_date).toLocaleDateString()}</span>
                          </div>
                        )}

                        {userItem.completion_date && (
                          <div className="date-info">
                            <span>Completed: {new Date(userItem.completion_date).toLocaleDateString()}</span>
                          </div>
                        )}

                        {/* ✅ ENHANCED: Display user rating with proper decimal formatting */}
                        {userItem.rating && userItem.rating > 0 && (
                          <div className="user-rating">
                            <span className="user-rating-label">My Rating:</span>
                            <span className="user-rating-value">{userItem.rating.toFixed(1)}/10</span>
                            <span className="rating-stars">
                              {"★".repeat(Math.ceil(userItem.rating / 2))}
                              {"☆".repeat(5 - Math.ceil(userItem.rating / 2))}
                            </span>
                          </div>
                        )}

                        {/* ✅ FIXED: Display user notes if available */}
                        {userItem.notes && userItem.notes.trim() && (
                          <div className="user-notes">
                            <span className="user-notes-label">Notes:</span>
                            <p className="user-notes-text">{userItem.notes}</p>
                          </div>
                        )}

                        <div className="quick-actions">
                          <select
                            value={userItem.status}
                            onChange={(e) => handleItemStatusUpdate(userItem.item_uid, e.target.value)}
                            className="status-select"
                            disabled={listData.loading}
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserListsPage;
