// ABOUTME: Custom list detail page for viewing and editing individual user-created lists with drag-and-drop reordering
// ABOUTME: Provides comprehensive list management including item reordering, editing, and sharing functionality

import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";

import { EditListModal } from "../../components/lists/EditListModal";
import { AddItemsModal } from "../../components/lists/AddItemsModal";
import { AdvancedFilterBar, FilterConfig } from "../../components/lists/AdvancedFilterBar";
import { BatchOperationsProvider } from "../../context/BatchOperationsProvider";
import { BatchOperationsToolbar } from "../../components/lists/BatchOperationsToolbar";
import { ViewModeSelector, ViewSettings } from "../../components/lists/ViewModeSelector";
import { GroupableList } from "../../components/lists/GroupableList";

import LoadingBanner from "../../components/Loading/LoadingBanner";
import { CustomList, ListItem } from "../../types/social";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "./CustomListDetailPage.css";

export const CustomListDetailPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const { get, post, put, delete: deleteMethod } = useAuthenticatedApi();

  const [list, setList] = useState<CustomList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [userLists, setUserLists] = useState<Array<{ id: string; name: string; itemCount: number }>>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Advanced filtering state
  const [filters, setFilters] = useState<FilterConfig>({
    status: { values: [], operator: "includes" },
    rating: { min: 0, max: 10, includeUnrated: true },
    tags: { values: [], operator: "any" },
    dateRange: { field: "addedAt", start: null, end: null },
    mediaType: { values: [] },
    rewatchCount: { min: 0, max: 50 },
    search: "",
  });

  // Visual organization state with localStorage persistence
  const [viewSettings, setViewSettings] = useState<ViewSettings>(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem("animanga_view_settings");
    const defaultSettings = {
      viewMode: "compact" as const,
      groupBy: "none" as const,
      sortBy: "position" as const,
      sortDirection: "asc" as const,
      showEmptyGroups: false,
      compactDensity: "cozy" as const,
    };

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return { ...defaultSettings, ...parsed };
      } catch (error) {
        return defaultSettings;
      }
    }

    return defaultSettings;
  });

  // Save view settings to localStorage whenever they change
  const updateViewSettings = (newSettings: ViewSettings) => {
    setViewSettings(newSettings);
    localStorage.setItem("animanga_view_settings", JSON.stringify(newSettings));
  };

  useDocumentTitle(list ? `${list.title} - Custom List` : "Custom List");

  // Filtered and sorted items based on current filters
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Apply status filter
    if (filters.status.values.length > 0) {
      filtered = filtered.filter((item) => {
        const itemStatus = item.watchStatus || "plan_to_watch";
        const isIncluded = filters.status.values.includes(itemStatus);
        return filters.status.operator === "includes" ? isIncluded : !isIncluded;
      });
    }

    // Apply rating filter
    if (!filters.rating.includeUnrated || filters.rating.min > 0 || filters.rating.max < 10) {
      filtered = filtered.filter((item) => {
        const rating = item.personalRating || 0;
        if (rating === 0 && !filters.rating.includeUnrated) return false;
        return rating >= filters.rating.min && rating <= filters.rating.max;
      });
    }

    // Apply tags filter
    if (filters.tags.values.length > 0) {
      filtered = filtered.filter((item) => {
        const itemTags = item.customTags || [];
        const hasAnyTag = filters.tags.values.some((tag) => itemTags.includes(tag));
        const hasAllTags = filters.tags.values.every((tag) => itemTags.includes(tag));
        const hasNoTags = !filters.tags.values.some((tag) => itemTags.includes(tag));

        switch (filters.tags.operator) {
          case "any":
            return hasAnyTag;
          case "all":
            return hasAllTags;
          case "none":
            return hasNoTags;
          default:
            return true;
        }
      });
    }

    // Apply date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter((item) => {
        let dateToCheck: Date | null = null;

        switch (filters.dateRange.field) {
          case "addedAt":
            dateToCheck = item.addedAt ? new Date(item.addedAt) : null;
            break;
          case "dateStarted":
            dateToCheck = item.dateStarted ? new Date(item.dateStarted) : null;
            break;
          case "dateCompleted":
            dateToCheck = item.dateCompleted ? new Date(item.dateCompleted) : null;
            break;
        }

        if (!dateToCheck) return false;

        if (filters.dateRange.start && dateToCheck < filters.dateRange.start) return false;
        if (filters.dateRange.end && dateToCheck > filters.dateRange.end) return false;

        return true;
      });
    }

    // Apply media type filter
    if (filters.mediaType.values.length > 0) {
      filtered = filtered.filter((item) => filters.mediaType.values.includes(item.mediaType || "anime"));
    }

    // Apply rewatch count filter
    if (filters.rewatchCount.min > 0 || filters.rewatchCount.max < 50) {
      filtered = filtered.filter((item) => {
        const rewatchCount = item.rewatchCount || 0;
        return rewatchCount >= filters.rewatchCount.min && rewatchCount <= filters.rewatchCount.max;
      });
    }

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchTerm) ||
          (item.notes && item.notes.toLowerCase().includes(searchTerm)) ||
          (item.customTags && item.customTags.some((tag) => tag.toLowerCase().includes(searchTerm)))
      );
    }

    return filtered;
  }, [items, filters]);

  // Extract available tags from all items
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach((item) => {
      if (item.customTags) {
        item.customTags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [items]);

  const fetchListDetails = async () => {
    if (!listId || !user) return;

    try {
      setIsLoading(true);
      setError(null);

      const [listResponse, itemsResponse] = await Promise.all([
        get(`/api/auth/lists/${listId}`),
        get(`/api/auth/lists/${listId}/items`),
      ]);

      const listData = listResponse.data || listResponse;
      const itemsData = itemsResponse.data || itemsResponse || [];

      // Update itemCount to match actual items
      const updatedListData = {
        ...listData,
        itemCount: itemsData.length,
      };

      setList(updatedListData);

      // Find localStorage keys for user

      // Merge localStorage personal data with fetched items
      const itemsWithPersonalData = itemsData.map((item: ListItem) => {
        // Use the same key pattern as the save handlers: enhanced_${itemUid}
        const enhancedKey = `enhanced_${item.itemUid}`;
        let storedData = localStorage.getItem(enhancedKey);

        // Fallback to old pattern if needed
        if (!storedData) {
          const oldKey = `animanga_personal_${user?.id}_${item.id}`;
          storedData = localStorage.getItem(oldKey);
        }

        if (storedData) {
          try {
            const personalData = JSON.parse(storedData);
            const mergedItem = {
              ...item,
              personalRating: personalData.personalRating || item.personalRating,
              watchStatus:
                personalData.watchStatus ||
                ((item.watchStatus as any) !== "undefined" ? item.watchStatus : undefined),
              customTags: personalData.customTags || item.customTags,
              dateStarted: personalData.dateStarted || item.dateStarted,
              dateCompleted: personalData.dateCompleted || item.dateCompleted,
              rewatchCount: personalData.rewatchCount || item.rewatchCount,
              notes: personalData.notes || item.notes,
            };

            return mergedItem;
          } catch (error) {
            return item;
          }
        }

        // Handle case where API returns string "undefined" instead of actual undefined
        return {
          ...item,
          watchStatus: (item.watchStatus as any) !== "undefined" ? item.watchStatus : undefined,
        };
      });

      setItems(itemsWithPersonalData);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("List not found or you do not have permission to view it.");
      } else {
        setError(
          err.response?.data?.message || err.message || "Failed to load list details. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (listId && user) {
      fetchListDetails();
    }
  }, [listId, user?.id]); // Only depend on user.id to prevent unnecessary refetches

  // Load user's other lists for context menu "Copy to List" functionality
  useEffect(() => {
    const fetchUserLists = async () => {
      if (!user?.id) return;

      try {
        const response = await get("/api/auth/lists");

        // Handle different response formats - the API returns a paginated response
        let allLists;
        if (response.data && response.data.lists && Array.isArray(response.data.lists)) {
          allLists = response.data.lists;
        } else if (response.lists && Array.isArray(response.lists)) {
          allLists = response.lists;
        } else if (response.data && Array.isArray(response.data)) {
          allLists = response.data;
        } else if (Array.isArray(response)) {
          allLists = response;
        } else {
          allLists = [];
        }

        // Filter out current list and map to simplified format
        const otherLists = allLists
          .filter((l: any) => l.id !== parseInt(listId || "0"))
          .filter((l: any) => l.name !== "tests" && l.name !== "erer") // Filter out the unwanted lists
          .slice(0, 5) // Limit to 5 lists for context menu
          .map((l: any) => ({
            id: l.id,
            name: l.title,
            itemCount: l.itemCount || 0,
          }));

        setUserLists(otherLists);
      } catch (error) {
        setUserLists([]);
      }
    };

    if (user?.id && listId) {
      fetchUserLists();
    }
  }, [user?.id, listId]); // Remove 'get' dependency to prevent unnecessary refetches

  const handleReorderItems = async (newItems: ListItem[]) => {
    if (!listId || isReordering) return;

    setIsReordering(true);

    // Optimistic update
    const previousItems = [...items];
    setItems(newItems);

    try {
      const reorderData = {
        items: newItems.map((item, index) => ({
          item_id: parseInt(item.id), // Backend expects integer item_id
          position: index,
        })),
        // Include last_updated timestamp for conflict detection
        last_updated: list?.updatedAt || new Date().toISOString(),
      };

      const response = await post(`/api/auth/lists/${listId}/reorder`, reorderData);

      // Update the list's updated_at timestamp from the response
      if (response.updated_at && list) {
        setList((prev) => (prev ? { ...prev, updatedAt: response.updated_at } : null));
      }
    } catch (error: any) {
      // Revert optimistic update
      setItems(previousItems);

      // Handle conflict error (409)
      if (error.response?.status === 409 && error.response?.data?.conflict) {
        const conflictData = error.response.data;

        // Show conflict notification
        if (
          window.confirm(
            `${conflictData.message}\n\nWould you like to refresh the list to see the latest changes?`
          )
        ) {
          // Refresh the list data
          fetchListDetails();
        }
      } else {
        // Show generic error notification
        const errorMessage = error.response?.data?.error || "Failed to reorder items. Please try again.";

        // You could replace this with a proper toast notification system
        alert(errorMessage);
      }
    } finally {
      setIsReordering(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await deleteMethod(`/api/auth/lists/${listId}/items/${itemId}`);
      setItems((prev) => prev.filter((item) => item.id !== itemId));

      // Update list item count
      if (list) {
        setList((prev) => (prev ? { ...prev, itemCount: prev.itemCount - 1 } : null));
      }
    } catch (error) {
      // Show error notification
    }
  };

  const handleEditItem = (item: ListItem) => {
    setEditingItemId(item.id);
  };

  const handleSaveItemEdit = async (itemId: string, updatedData: Partial<ListItem>) => {
    if (!listId) return;

    try {
      // Separate list-specific data from personal tracking data
      const listSpecificData: any = {};
      const personalTrackingData: any = {};

      // Only notes and position can be saved to the list API
      if ("notes" in updatedData) {
        listSpecificData.notes = updatedData.notes;
      }
      if ("position" in updatedData) {
        listSpecificData.position = updatedData.position;
      }

      // Personal tracking data goes to localStorage
      const personalFields = [
        "personalRating",
        "watchStatus",
        "customTags",
        "dateStarted",
        "dateCompleted",
        "rewatchCount",
      ];
      personalFields.forEach((field) => {
        if (field in updatedData) {
          personalTrackingData[field] = updatedData[field as keyof ListItem];
        }
      });

      // Save list-specific data to backend if there's any
      if (Object.keys(listSpecificData).length > 0) {
        await put(`/api/auth/lists/${listId}/items/${itemId}`, listSpecificData);
      }

      // Save personal tracking data to localStorage if there's any
      if (Object.keys(personalTrackingData).length > 0) {
        const currentItem = items.find((item) => item.id === itemId);
        if (currentItem) {
          const storageKey = `enhanced_${currentItem.itemUid}`;
          const existingData = JSON.parse(localStorage.getItem(storageKey) || "{}");
          const mergedData = {
            ...existingData,
            ...personalTrackingData,
            lastUpdated: new Date().toISOString(),
          };
          localStorage.setItem(storageKey, JSON.stringify(mergedData));
        }
      }

      // Update the local state with all changes
      setItems((prevItems) =>
        prevItems.map((item) => (item.id === itemId ? { ...item, ...updatedData } : item))
      );

      // Clear editing state
      setEditingItemId(null);
    } catch (error) {
      throw error; // Let the inline editor handle the error
    }
  };

  const handleEditList = () => {
    setIsEditModalOpen(true);
  };

  const handleAddItems = () => {
    setIsAddItemsModalOpen(true);
  };

  const handleUpdateList = async (updatedData: Partial<CustomList>) => {
    if (!listId) return;

    try {
      await put(`/api/auth/lists/${listId}`, updatedData);
      setList((prev) => (prev ? { ...prev, ...updatedData } : null));
    } catch (error) {
      throw error;
    }
  };

  const handleItemsAdded = async () => {
    // Only refresh items, don't refetch the entire list to preserve local edits
    try {
      const itemsResponse = await get(`/api/auth/lists/${listId}/items`);
      const itemsData = itemsResponse.data || itemsResponse || [];

      setItems(itemsData);

      // Update item count without refetching the whole list
      if (list) {
        setList((prev) => (prev ? { ...prev, itemCount: itemsData.length } : null));
      }
    } catch (error) {
      fetchListDetails();
    }
  };

  const isOwner = user && list && list.userId === user.id;

  if (!user) {
    return (
      <div className="custom-list-detail-page">
        <div className="custom-list-container">
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="text-center max-w-md mx-auto p-8 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="mb-6">
                <svg
                  className="mx-auto mb-4 text-gray-400 dark:text-gray-500"
                  style={{ width: "32px", height: "32px" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Authentication Required
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                This list is private and requires you to be signed in to view its contents.
              </p>
              <div className="space-y-3">
                <Link to="/" className="action-button primary w-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Go to Homepage
                </Link>
                <Link to="/my-lists" className="action-button secondary w-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                  Browse Other Lists
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="custom-list-detail-page">
        <div className="custom-list-container">
          <div className="list-header animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-6"></div>
            <div className="flex gap-4">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
            </div>
          </div>
          <LoadingBanner message="Loading list details..." isVisible={true} />
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="custom-list-detail-page">
        <div className="custom-list-container">
          <Link to="/my-lists" className="back-navigation">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Lists
          </Link>
          <div className="list-header">
            <div className="text-center">
              <div className="error-icon-container mb-6">
                <svg
                  className="error-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="error-title">Oops! Something went wrong</h2>
              <p className="error-message">
                {error
                  ? `We couldn't load this custom list: ${error}`
                  : "The custom list you're looking for couldn't be found or may have been removed."}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={fetchListDetails}
                  className="action-button secondary px-6 py-3 min-w-32 inline-flex items-center justify-center gap-2"
                  aria-label="Retry loading the custom list"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Try Again
                </button>
                <Link
                  to="/my-lists"
                  className="action-button primary px-6 py-3 min-w-32 inline-flex items-center justify-center gap-2"
                  aria-label="Return to your custom lists"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to My Lists
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-list-detail-page">
      <div className="custom-list-container">
        <Link to="/my-lists" className="back-navigation">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lists
        </Link>

        {/* Header */}
        <div className="list-header">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="list-title">{list.title}</h1>

              {list.description && list.description.trim() && list.description.trim() !== "testss" ? (
                <p className="list-description">{list.description}</p>
              ) : (
                <p className="list-description text-gray-500 italic">
                  No description provided for this list.
                </p>
              )}

              <div className="list-meta">
                <div className="list-meta-item">
                  <span>📝</span>
                  {list.itemCount} items
                </div>
                <span
                  className={`privacy-badge ${
                    list.privacy === "public"
                      ? "public"
                      : list.privacy === "friends_only"
                      ? "friends-only"
                      : "private"
                  }`}
                >
                  {list.privacy === 'public' ? 'PUBLIC' : 
                   list.privacy === 'friends_only' ? 'FRIENDS ONLY' : 'PRIVATE'}
                </span>
                <div className="list-meta-item">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Updated {new Date(list.updatedAt).toLocaleDateString()}
                </div>
                {list.followersCount > 0 && (
                  <div className="list-meta-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {list.followersCount} followers
                  </div>
                )}
              </div>

              {/* Tags */}
              {list.tags && list.tags.length > 0 && (
                <div className="list-tags">
                  {list.tags.map((tag) => (
                    <span key={tag} className="list-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isOwner && (
              <div className="list-actions">
                <button className="action-button secondary" onClick={handleEditList}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit List
                </button>
                <button className="action-button primary" onClick={handleAddItems}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add Items
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reordering Status */}
        {isReordering && (
          <div className="reordering-status">
            <div className="reordering-content">
              <div className="reordering-spinner"></div>
              <span className="reordering-text">Saving new order...</span>
            </div>
          </div>
        )}

        {/* Instructions for drag-and-drop */}
        {isOwner && items.length > 1 && (
          <div className="instructions-banner">
            <div className="instructions-content">
              <svg className="instructions-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="instructions-text">
                <h3 className="instructions-title">Drag to reorder items</h3>
                <p className="instructions-description">
                  Click and drag the grip icon (≡) to reorder items in your list. Changes are saved
                  automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Filter Bar */}
        {isOwner && items.length > 0 && listId && (
          <AdvancedFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            availableTags={availableTags}
            itemCount={items.length}
            filteredCount={filteredItems.length}
          />
        )}

        {/* Visual Organization Controls */}
        {items.length > 0 && (
          <ViewModeSelector
            settings={viewSettings}
            onSettingsChange={updateViewSettings}
            itemCount={filteredItems.length}
          />
        )}

        {/* List Items */}
        <div className="list-content">
          {listId && (
            <BatchOperationsProvider listId={listId} onOperationComplete={fetchListDetails}>
              <BatchOperationsToolbar
                items={filteredItems}
                userLists={userLists}
                onRefresh={fetchListDetails}
              />
              <GroupableList
                viewSettings={viewSettings}
                items={filteredItems}
                onReorder={handleReorderItems}
                onRemoveItem={isOwner ? handleRemoveItem : () => {}}
                onEditItem={isOwner ? handleEditItem : () => {}}
                onSaveItemEdit={isOwner ? handleSaveItemEdit : () => Promise.resolve()}
                editingItemId={editingItemId}
                onCancelEdit={() => setEditingItemId(null)}
                isLoading={false}
                emptyMessage={
                  isOwner
                    ? "Your list is ready for some awesome anime and manga! Click 'Add Items' above to start building your collection."
                    : "This list is empty, but great things are coming soon!"
                }
                userLists={userLists}
                onQuickRate={async (itemId: string, rating: number) => {
                  // Handle quick rating - save to localStorage for personal tracking
                  const currentItem = items.find((item) => item.id === itemId);
                  if (!currentItem) return;

                  const storageKey = `enhanced_${currentItem.itemUid}`;
                  const existingData = JSON.parse(localStorage.getItem(storageKey) || "{}");
                  const personalData = {
                    ...existingData,
                    personalRating: rating,
                    lastUpdated: new Date().toISOString(),
                  };
                  localStorage.setItem(storageKey, JSON.stringify(personalData));

                  // Update local state for immediate UI feedback
                  setItems((prev) =>
                    prev.map((item) => (item.id === itemId ? { ...item, personalRating: rating } : item))
                  );
                }}
                onUpdateStatus={async (itemId: string, status: string) => {
                  // Handle status update - save to localStorage for personal tracking
                  const currentItem = items.find((item) => item.id === itemId);
                  if (!currentItem) return;

                  const storageKey = `enhanced_${currentItem.itemUid}`;
                  const existingData = JSON.parse(localStorage.getItem(storageKey) || "{}");
                  const personalData = {
                    ...existingData,
                    watchStatus: status,
                    lastUpdated: new Date().toISOString(),
                  };
                  localStorage.setItem(storageKey, JSON.stringify(personalData));

                  // Update local state for immediate UI feedback
                  setItems((prev) =>
                    prev.map((item) => (item.id === itemId ? { ...item, watchStatus: status as any } : item))
                  );
                }}
                onAddTag={async (itemId: string, tag: string) => {
                  // Handle tag addition - save to localStorage for personal tracking
                  const currentItem = items.find((item) => item.id === itemId);
                  if (!currentItem) return;

                  const currentTags = currentItem.customTags || [];
                  const trimmedTag = tag.trim().toLowerCase();

                  if (currentTags.includes(trimmedTag) || currentTags.length >= 10) {
                    return; // Tag exists or too many tags
                  }

                  const newTags = [...currentTags, trimmedTag];
                  const storageKey = `enhanced_${currentItem.itemUid}`;
                  const existingData = JSON.parse(localStorage.getItem(storageKey) || "{}");
                  const personalData = {
                    ...existingData,
                    customTags: newTags,
                    lastUpdated: new Date().toISOString(),
                  };
                  localStorage.setItem(storageKey, JSON.stringify(personalData));

                  // Update local state for immediate UI feedback
                  setItems((prev) =>
                    prev.map((item) => (item.id === itemId ? { ...item, customTags: newTags } : item))
                  );
                }}
                onCopyToList={async () => {
                  // TODO: Implement actual copy functionality when backend supports it
                }}
              />
            </BatchOperationsProvider>
          )}
        </div>

        {/* Modals */}
        {list && (
          <>
            <EditListModal
              list={list}
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onUpdate={handleUpdateList}
            />
            <AddItemsModal
              listId={listId!}
              isOpen={isAddItemsModalOpen}
              onClose={() => setIsAddItemsModalOpen(false)}
              onItemsAdded={handleItemsAdded}
            />
          </>
        )}
      </div>
    </div>
  );
};
