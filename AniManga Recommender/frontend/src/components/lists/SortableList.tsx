// ABOUTME: Sortable list container with drag-and-drop functionality for reordering custom list items
// ABOUTME: Provides DragDropContext wrapper and handles item reordering with optimistic updates

import React, { useState } from "react";

// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  // Decode URL to catch encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }
  
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // Dangerous schemes to block
  const dangerousSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:',
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return 'about:blank';
    }
  }
  
  // Additional check for encoded attempts
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return 'about:blank';
  }
  
  return url;
};

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { logger } from "../../utils/logger";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { SortableListItem } from "./SortableListItem";
import { BatchOperationsProvider, useBatchOperations } from "../../context/BatchOperationsProvider";
import { BatchOperationsToolbar } from "./BatchOperationsToolbar";
import { ListItem } from "../../types/social";

interface SortableListProps {
  items: ListItem[];
  onReorder: (items: ListItem[]) => Promise<void>;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: ListItem) => void;
  onSaveItemEdit?: (itemId: string, updatedData: Partial<ListItem>) => Promise<void>;
  isLoading?: boolean;
  emptyMessage?: string;
  // Context menu props
  userLists?: Array<{ id: string; name: string; itemCount: number }>;
  onCopyToList?: (itemId: string, targetListId: string) => Promise<void>;
  onQuickRate?: (itemId: string, rating: number) => Promise<void>;
  onUpdateStatus?: (itemId: string, status: string) => Promise<void>;
  onAddTag?: (itemId: string, tag: string) => Promise<void>;
  // Batch operations props
  listId?: string | undefined;
  onBatchOperationComplete?: () => void;
}

// Internal component that uses the batch operations context
const SortableListInner: React.FC<SortableListProps> = ({
  items,
  onReorder,
  onRemoveItem,
  onEditItem,
  onSaveItemEdit,
  isLoading = false,
  emptyMessage = "No items in this list yet.",
  userLists = [],
  onCopyToList,
  onQuickRate,
  onUpdateStatus,
  onAddTag,
  listId,
  onBatchOperationComplete,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Batch operations context
  const { isSelectionMode, toggleSelectionMode } = useBatchOperations();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    // Don't allow dragging during selection mode
    if (isSelectionMode) {
      return;
    }

    setActiveId(active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Don't handle drag end during selection mode
    if (isSelectionMode) {
      return;
    }

    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Create the new ordered array
      const newItems = arrayMove(items, oldIndex, newIndex);

      // Update the order property for each item
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        order: index,
      }));

      try {
        // Call the reorder function (which should handle API call and optimistic updates)
        await onReorder(updatedItems);
      } catch (error) {
        logger.error("Failed to reorder items", {
          error: error instanceof Error ? error.message : "Unknown error",
          context: "SortableList",
          operation: "handleDragEnd",
          fromIndex: oldIndex,
          toIndex: newIndex
        });
        // The parent component should handle error states and reverting
      }
    }
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  const handleEditItem = (item: ListItem) => {
    setEditingItemId(item.id);
    if (onEditItem) {
      onEditItem(item);
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleSaveEdit = async (itemId: string, updatedData: Partial<ListItem>) => {
    if (onSaveItemEdit) {
      await onSaveItemEdit(itemId, updatedData);
    }
    setEditingItemId(null);
  };

  // Default handlers to prevent errors if not provided
  const handleQuickRate =
    onQuickRate ||
    (async (_itemId: string, _rating: number) => {
      // This would normally call your API
    });

  const handleUpdateStatus =
    onUpdateStatus ||
    (async (_itemId: string, _status: string) => {
      // This would normally call your API
    });

  const handleAddTag =
    onAddTag ||
    (async (_itemId: string, _tag: string) => {
      // This would normally call your API
    });

  const handleCopyToList =
    onCopyToList ||
    (async (_itemId: string, _targetListId: string) => {
      // This would normally call your API
    });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="animate-pulse flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
          >
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="w-8 h-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem 2rem",
          backgroundColor: "var(--bg-overlay)",
          borderRadius: "12px",
          border: "2px dashed var(--border-color)",
          color: "var(--text-secondary)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "64px",
            height: "64px",
            backgroundColor: "var(--bg-dark)",
            borderRadius: "50%",
            marginBottom: "1.5rem",
            border: "1px solid var(--border-color)",
          }}
        >
          <svg
            style={{ width: "28px", height: "28px", color: "var(--text-tertiary)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2"
            />
          </svg>
        </div>
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            color: "var(--text-primary)",
            marginBottom: "0.75rem",
            margin: "0 0 0.75rem 0",
          }}
        >
          Empty List
        </h3>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.95rem",
            lineHeight: "1.5",
            maxWidth: "400px",
            margin: "0 auto",
          }}
        >
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Multi-Select Header */}
      {items.length > 0 && (
        <div className="list-header">
          <div className="list-header-left">
            <span className="items-count">{items.length} items</span>
          </div>
          <div className="list-header-right">
            <button
              onClick={toggleSelectionMode}
              className={`multi-select-btn ${isSelectionMode ? "active" : ""}`}
              title={isSelectionMode ? "Exit selection mode" : "Enter selection mode"}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{isSelectionMode ? "Cancel" : "Select"}</span>
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      >
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableListItem
                key={item.id}
                item={item}
                index={index}
                onRemove={onRemoveItem || (() => {})}
                onEdit={handleEditItem}
                onSave={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                isEditing={editingItemId === item.id}
                // New context menu props
                userLists={userLists}
                onQuickRate={handleQuickRate}
                onUpdateStatus={handleUpdateStatus}
                onAddTag={handleAddTag}
                onCopyToList={handleCopyToList}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            <div className="sortable-list-item drag-overlay">
              {/* Simplified drag preview - just the essential elements */}

              {/* Drag Handle */}
              <div className="drag-handle">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>

              {/* Item Image */}
              <div className="item-image-wrapper">
                {activeItem.imageUrl ? (
                  <img src={sanitizeUrl(activeItem.imageUrl)} alt={activeItem.title} className="item-image" />
                ) : (
                  <div className="item-placeholder">
                    <span className="item-position">
                      {items.findIndex((item) => item.id === activeItem.id) + 1}
                    </span>
                  </div>
                )}
              </div>

              {/* Simplified Item Content */}
              <div className="item-content">
                <h4 className="item-title">{activeItem.title}</h4>
                <div className="item-meta">
                  <span className="item-type">{activeItem.mediaType}</span>
                  <span className="item-position-badge">
                    Position #{items.findIndex((item) => item.id === activeItem.id) + 1}
                  </span>
                </div>
              </div>

              {/* Drag indicator instead of action buttons */}
              <div className="item-actions">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "var(--accent-primary)",
                    color: "white",
                  }}
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ width: "18px", height: "18px" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Batch Operations Toolbar */}
      {listId && (
        <BatchOperationsToolbar
          items={items}
          userLists={userLists}
          onRefresh={onBatchOperationComplete || (() => {})}
        />
      )}
    </>
  );
};

// Main component that provides the batch operations context
export const SortableList: React.FC<SortableListProps> = (props) => {
  const { listId, onBatchOperationComplete } = props;

  // Only provide batch operations context if listId is provided
  if (!listId) {
    return <SortableListInner {...props} />;
  }

  return (
    <BatchOperationsProvider
      listId={listId}
      onOperationComplete={() => {
        if (onBatchOperationComplete) {
          onBatchOperationComplete();
        }
      }}
    >
      <SortableListInner {...props} />
    </BatchOperationsProvider>
  );
};
