// ABOUTME: Custom list detail page for viewing and editing individual user-created lists with drag-and-drop reordering
// ABOUTME: Provides comprehensive list management including item reordering, editing, and sharing functionality

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { SortableList } from "../../components/lists/SortableList";
import LoadingBanner from "../../components/Loading/LoadingBanner";
import ErrorFallback from "../../components/Error/ErrorFallback";
import { CustomList, ListItem } from "../../types/social";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export const CustomListDetailPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const { get, post, delete: deleteMethod } = useAuthenticatedApi();

  const [list, setList] = useState<CustomList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle(list ? `${list.title} - Custom List` : "Custom List");

  const fetchListDetails = async () => {
    if (!listId || !user) return;

    try {
      setIsLoading(true);
      setError(null);

      const [listResponse, itemsResponse] = await Promise.all([
        get(`/api/auth/lists/${listId}`),
        get(`/api/auth/lists/${listId}/items`),
      ]);

      setList(listResponse.data);
      setItems(itemsResponse.data || []);
    } catch (err: any) {
      console.error("Failed to fetch list details:", err);
      if (err.response?.status === 404) {
        setError("List not found or you do not have permission to view it.");
      } else {
        setError(err.response?.data?.message || "Failed to load list details. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListDetails();
  }, [listId, user]);

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
      if (response.data.updated_at && list) {
        setList((prev) => (prev ? { ...prev, updatedAt: response.data.updated_at } : null));
      }
    } catch (error: any) {
      console.error("Failed to reorder items:", error);
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
    if (!window.confirm("Are you sure you want to remove this item from the list?")) {
      return;
    }

    try {
      await deleteMethod(`/api/auth/lists/${listId}/items/${itemId}`);
      setItems((prev) => prev.filter((item) => item.id !== itemId));

      // Update list item count
      if (list) {
        setList((prev) => (prev ? { ...prev, itemCount: prev.itemCount - 1 } : null));
      }
    } catch (error) {
      console.error("Failed to remove item:", error);
      // Show error notification
    }
  };

  const handleEditItem = (item: ListItem) => {
    // TODO: Open edit modal for item notes
    console.log("Edit item:", item);
  };

  const isOwner = user && list && list.userId === user.id;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Please Sign In</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You need to be signed in to view this list.</p>
          <Link
            to="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingBanner message="Loading list details..." isVisible={true} />
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorFallback error={new Error(error || "List not found")} />
          <div className="mt-6">
            <Link
              to="/my-lists"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to My Lists
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Link
                  to="/my-lists"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{list.title}</h1>
              </div>

              {list.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-3xl">{list.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  {list.itemCount} items
                </span>
                <span>•</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    list.privacy === "Public"
                      ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                      : list.privacy === "Friends Only"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {list.privacy}
                </span>
                <span>•</span>
                <span>Updated {new Date(list.updatedAt).toLocaleDateString()}</span>
                {list.followersCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      {list.followersCount} followers
                    </span>
                  </>
                )}
              </div>
            </div>

            {isOwner && (
              <div className="flex gap-2">
                <button className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Edit List
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Add Items
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          {list.tags && list.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {list.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Reordering Status */}
        {isReordering && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm font-medium">Saving new order...</span>
            </div>
          </div>
        )}

        {/* Instructions for drag-and-drop */}
        {isOwner && items.length > 1 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Drag to reorder items
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Click and drag the grip icon (≡) to reorder items in your list. Changes are saved
                  automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* List Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <SortableList
            items={items}
            onReorder={handleReorderItems}
            onRemoveItem={isOwner ? handleRemoveItem : () => {}}
            onEditItem={isOwner ? handleEditItem : () => {}}
            isLoading={false}
            emptyMessage={
              isOwner ? "No items in this list yet. Add some items to get started!" : "This list is empty."
            }
          />
        </div>
      </div>
    </div>
  );
};
