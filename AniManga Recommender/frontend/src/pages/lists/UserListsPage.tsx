import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { UserItem } from "../../types";
import useDocumentTitle from "../../hooks/useDocumentTitle";
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
      { value: "score_desc", label: "Score (Highest)" },
      { value: "score_asc", label: "Score (Lowest)" },
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

  useDocumentTitle(`${statusOptions.find((s) => s.value === currentStatus)?.label || "Lists"} | My Lists`);

  // Fetch user list data with proper error handling and request deduplication
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

      // Try the user-items endpoint first
      let response;
      try {
        response = await makeAuthenticatedRequest(`/api/auth/user-items?status=${currentStatus}`);
      } catch (userItemsError) {
        console.warn("User-items endpoint failed, trying dashboard endpoint:", userItemsError);

        // Fallback: get data from dashboard endpoint and filter
        const dashboardResponse = await makeAuthenticatedRequest("/api/auth/dashboard");

        // Map dashboard data to the current status
        switch (currentStatus) {
          case "watching":
            response = dashboardResponse.in_progress || [];
            break;
          case "plan_to_watch":
            response = dashboardResponse.plan_to_watch || [];
            break;
          case "completed":
            response = dashboardResponse.completed_recently || [];
            break;
          case "on_hold":
            response = dashboardResponse.on_hold || [];
            break;
          case "dropped":
            // Dashboard might not have dropped items, return empty
            response = [];
            break;
          default:
            response = [];
        }
      }

      // Ensure response is an array
      let items: UserItem[] = [];
      if (Array.isArray(response)) {
        items = response;
      } else if (response && Array.isArray(response.items)) {
        items = response.items;
      } else if (response && response.data && Array.isArray(response.data)) {
        items = response.data;
      }

      // Filter out invalid items
      const validItems = items.filter((item): item is UserItem => {
        return (
          item && typeof item === "object" && typeof item.item_uid === "string" && item.item_uid.length > 0
        );
      });

      console.log(`📊 Fetched ${validItems.length} valid items for ${currentStatus}`);

      setListData({
        items: validItems,
        total: validItems.length,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      // Only set error if request wasn't aborted
      if (error.name !== "AbortError") {
        console.error("❌ Error fetching user list:", error);
        setListData((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to load list",
        }));
      }
    } finally {
      requestInProgress.current = false;
    }
  }, [user?.id, currentStatus]); // ✅ FIXED: Only depend on user.id and currentStatus

  // Apply client-side filtering and sorting with memoization
  const filteredItems = useMemo(() => {
    let filtered = [...listData.items];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (userItem) =>
          userItem.item?.title?.toLowerCase().includes(query) ||
          userItem.item?.title_english?.toLowerCase().includes(query) ||
          userItem.item?.genres?.some((genre) => genre.toLowerCase().includes(query)) ||
          userItem.item?.themes?.some((theme) => theme.toLowerCase().includes(query))
      );
    }

    // Filter by media type
    if (selectedMediaType !== "all") {
      filtered = filtered.filter((userItem) => userItem.item?.media_type === selectedMediaType);
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
        case "score_desc":
          return (b.item?.score || 0) - (a.item?.score || 0);
        case "score_asc":
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
  }, [listData.items, searchQuery, selectedMediaType, sortBy]);

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
      const query = formData.get("search") as string;
      updateParams({ q: query.trim() });
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
        console.error("Error updating item status:", error);
      }
    },
    [fetchListData]
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
        console.error("Error updating items in bulk:", error);
      } finally {
        setIsUpdatingBulk(false);
      }
    },
    [selectedItems, fetchListData]
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
      console.error("Error removing items in bulk:", error);
    } finally {
      setIsUpdatingBulk(false);
    }
  }, [selectedItems, fetchListData]);

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
      <div className="user-lists-container">
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
            <Spinner size="40px" />
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
            <div className="items-grid">
              {filteredItems.map((userItem) => {
                // Ensure userItem has required data before rendering
                if (!userItem || !userItem.item_uid || !userItem.item) {
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
