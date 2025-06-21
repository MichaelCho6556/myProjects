// ABOUTME: Custom list detail page for viewing and editing individual user-created lists with drag-and-drop reordering
// ABOUTME: Provides comprehensive list management including item reordering, editing, and sharing functionality

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { SortableList } from "../../components/lists/SortableList";
import { EditListModal } from "../../components/lists/EditListModal";
import { AddItemsModal } from "../../components/lists/AddItemsModal";
import LoadingBanner from "../../components/Loading/LoadingBanner";
import { CustomList, ListItem } from "../../types/social";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "./CustomListDetailPage.css";

export const CustomListDetailPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const { get, post, delete: deleteMethod } = useAuthenticatedApi();

  const [list, setList] = useState<CustomList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);

  useDocumentTitle(list ? `${list.title} - Custom List` : "Custom List");

  const fetchListDetails = async () => {
    if (!listId || !user) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching list details for listId:', listId);

      const [listResponse, itemsResponse] = await Promise.all([
        get(`/api/auth/lists/${listId}`),
        get(`/api/auth/lists/${listId}/items`),
      ]);

      console.log('List response:', listResponse);
      console.log('Items response:', itemsResponse);

      setList(listResponse.data || listResponse);
      setItems(itemsResponse.data || itemsResponse || []);
    } catch (err: any) {
      console.error("Failed to fetch list details:", err);
      console.error("Error response:", err.response);
      if (err.response?.status === 404) {
        setError("List not found or you do not have permission to view it.");
      } else {
        setError(err.response?.data?.message || err.message || "Failed to load list details. Please try again.");
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

  const handleEditList = () => {
    setIsEditModalOpen(true);
  };

  const handleAddItems = () => {
    setIsAddItemsModalOpen(true);
  };

  const handleUpdateList = async (updatedData: Partial<CustomList>) => {
    if (!listId) return;

    try {
      await post(`/api/auth/lists/${listId}`, updatedData);
      setList(prev => prev ? { ...prev, ...updatedData } : null);
    } catch (error) {
      console.error('Failed to update list:', error);
      throw error;
    }
  };

  const handleItemsAdded = () => {
    // Refresh the list to show new items
    fetchListDetails();
  };

  const isOwner = user && list && list.userId === user.id;

  if (!user) {
    return (
      <div className="custom-list-detail-page">
        <div className="custom-list-container">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Please Sign In</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">You need to be signed in to view this list.</p>
              <Link
                to="/"
                className="action-button primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go to Homepage
              </Link>
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
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading List</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error || "List not found"}</p>
              <button
                onClick={fetchListDetails}
                className="action-button secondary mr-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              <Link
                to="/my-lists"
                className="action-button primary"
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

              {list.description && (
                <p className="list-description">{list.description}</p>
              )}

              <div className="list-meta">
                <div className="list-meta-item">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  {list.itemCount} items
                </div>
                <span
                  className={`privacy-badge ${
                    list.privacy === "Public"
                      ? "public"
                      : list.privacy === "Friends Only"
                      ? "friends-only"
                      : "private"
                  }`}
                >
                  {list.privacy}
                </span>
                <div className="list-meta-item">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0v10a2 2 0 002 2h4a2 2 0 002-2V7m-6 0h6"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit List
                </button>
                <button className="action-button primary" onClick={handleAddItems}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
              <svg
                className="instructions-icon"
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
              <div className="instructions-text">
                <h3 className="instructions-title">
                  Drag to reorder items
                </h3>
                <p className="instructions-description">
                  Click and drag the grip icon (≡) to reorder items in your list. Changes are saved
                  automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* List Items */}
        <div className="list-content">
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
