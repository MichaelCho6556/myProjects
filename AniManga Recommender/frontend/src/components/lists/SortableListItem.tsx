// ABOUTME: Sortable list item component with drag-and-drop functionality for reordering list items
// ABOUTME: Provides touch support and accessibility features for custom list management
// ABOUTME: Includes right-click context menu with 8 actions: Edit, Quick Rate, Update Status, Add Tag, View Details, Share, Copy to List, Remove

import React, { useState, useCallback, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { ListItem } from "../../types/social";
import { InlineEditPanel } from "./InlineEditPanel";
import { ContextMenu, ContextMenuItem, ContextMenuAction } from "../common/ContextMenu";
import { useContextMenu } from "../../hooks/useContextMenu";
import { useToastActions } from "../Feedback/ToastProvider";
import "./SortableListItem.css";

interface SortableListItemProps {
  item: ListItem;
  index: number;
  onRemove?: (itemId: string) => void;
  onEdit?: (item: ListItem) => void;
  onSave?: (itemId: string, updatedData: Partial<ListItem>) => Promise<void>;
  onCancelEdit?: () => void;
  isEditing?: boolean;
  userLists?: Array<{ id: string; name: string; itemCount: number }>;
  onCopyToList?: (itemId: string, targetListId: string) => Promise<void>;
  onQuickRate?: (itemId: string, rating: number) => Promise<void>;
  onUpdateStatus?: (itemId: string, status: string) => Promise<void>;
  onAddTag?: (itemId: string, tag: string) => Promise<void>;
}

export const SortableListItem: React.FC<SortableListItemProps> = ({
  item,
  index,
  onRemove,
  onEdit,
  onSave,
  onCancelEdit,
  isEditing = false,
  userLists = [],
  onCopyToList,
  onQuickRate,
  onUpdateStatus,
  onAddTag,
}) => {
  const navigate = useNavigate();
  const { success: showSuccessToast, error: showErrorToast } = useToastActions();
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const {
    isContextMenuOpen,
    contextMenuPosition,
    activeItemId,
    closeContextMenu,
    handleContextMenu,
    handleKeyboardMenu,
  } = useContextMenu();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: item.id,
  });

  // Load personal tracking data from localStorage
  const getEnhancedItem = (): ListItem => {
    const storageKey = `user-item-tracking-${item.itemUid || item.id}`;
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      try {
        const personalData = JSON.parse(storedData);
        return {
          ...item,
          personalRating: personalData.personalRating || item.personalRating,
          watchStatus: personalData.watchStatus || item.watchStatus,
          customTags: personalData.customTags || item.customTags,
          dateStarted: personalData.dateStarted || item.dateStarted,
          dateCompleted: personalData.dateCompleted || item.dateCompleted,
          rewatchCount: personalData.rewatchCount || item.rewatchCount,
        };
      } catch (error) {
        console.error("Error parsing stored personal tracking data:", error);
      }
    }

    return item;
  };

  const enhancedItem = getEnhancedItem();

  // Save enhanced data to localStorage
  const saveEnhancedData = useCallback(
    (updatedData: Partial<ListItem>) => {
      const storageKey = `user-item-tracking-${item.itemUid || item.id}`;
      const existingData = localStorage.getItem(storageKey);
      const currentData = existingData ? JSON.parse(existingData) : {};

      const newData = { ...currentData, ...updatedData };
      localStorage.setItem(storageKey, JSON.stringify(newData));
    },
    [item.itemUid, item.id]
  );

  // Context menu actions
  const contextMenuActions: ContextMenuItem[] = [
    // 1. Edit Notes & Rating
    {
      id: "edit",
      label: "Edit Notes & Rating",
      icon: "✏️",
      action: () => onEdit?.(item),
      disabled: !onEdit,
      shortcut: "E",
    },

    // 2. Quick Rate
    {
      id: "quick-rate",
      label: "Quick Rate",
      icon: "⭐",
      component: "StarRating",
      currentValue: enhancedItem.personalRating,
      action: async (rating: number) => {
        try {
          // Optimistic update
          saveEnhancedData({ personalRating: rating });

          // Call parent handler if available
          if (onQuickRate) {
            await onQuickRate(item.id, rating);
          }

          showSuccessToast("Rating Updated", `Rated ${enhancedItem.title} ${rating}/10`);
        } catch (error) {
          console.error("Error updating rating:", error);
          showErrorToast("Rating Error", "Failed to update rating");
        }
      },
      shortcut: "R",
    },

    // 3. Update Status
    {
      id: "update-status",
      label: "Update Status",
      icon: "📊",
      component: "StatusSelector",
      currentValue: enhancedItem.watchStatus,
      options: [
        { value: "plan_to_watch", label: "Plan to Watch", color: "#3b82f6" },
        { value: "watching", label: "Watching", color: "#10b981" },
        { value: "completed", label: "Completed", color: "#8b5cf6" },
        { value: "dropped", label: "Dropped", color: "#ef4444" },
        { value: "on_hold", label: "On Hold", color: "#f59e0b" },
      ],
      action: async (status: string) => {
        try {
          // Type assertion to ensure status is valid
          const validStatus = status as "plan_to_watch" | "watching" | "completed" | "on_hold" | "dropped";

          // Optimistic update
          saveEnhancedData({ watchStatus: validStatus });

          // Call parent handler if available
          if (onUpdateStatus) {
            await onUpdateStatus(item.id, status);
          }

          const statusLabel = status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
          showSuccessToast("Status Updated", `Updated status to ${statusLabel}`);
        } catch (error) {
          console.error("Error updating status:", error);
          showErrorToast("Status Error", "Failed to update status");
        }
      },
      shortcut: "S",
    },

    // 4. Quick Add Tag
    {
      id: "add-tag",
      label: "Quick Add Tag",
      icon: "🏷️",
      component: "TagInput",
      action: async (tag: string) => {
        try {
          const currentTags = enhancedItem.customTags || [];
          const trimmedTag = tag.trim().toLowerCase();

          // Validation
          if (!trimmedTag) {
            showErrorToast("Invalid Tag", "Tag cannot be empty");
            return;
          }

          if (currentTags.includes(trimmedTag)) {
            showErrorToast("Duplicate Tag", "Tag already exists");
            return;
          }

          if (currentTags.length >= 10) {
            showErrorToast("Tag Limit", "Maximum 10 tags allowed");
            return;
          }

          const newTags = [...currentTags, trimmedTag];

          // Optimistic update
          saveEnhancedData({ customTags: newTags });

          // Call parent handler if available
          if (onAddTag) {
            await onAddTag(item.id, trimmedTag);
          }

          showSuccessToast("Tag Added", `Added tag "${trimmedTag}"`);
        } catch (error) {
          console.error("Error adding tag:", error);
          showErrorToast("Tag Error", "Failed to add tag");
        }
      },
      disabled: (enhancedItem.customTags?.length || 0) >= 10,
      shortcut: "T",
    },

    { type: "separator" },

    // 5. View Item Details
    {
      id: "view-details",
      label: "View Item Details",
      icon: "🔗",
      action: () => {
        // Use the correct route format: /item/:uid
        navigate(`/item/${enhancedItem.itemUid || enhancedItem.id}`);
      },
      shortcut: "V",
    },

    // 6. Share Item
    {
      id: "share",
      label: "Share Item",
      icon: "📤",
      action: async () => {
        try {
          // Create the correct item detail URL
          const url = `${window.location.origin}/item/${enhancedItem.itemUid || enhancedItem.id}`;

          if (navigator.share) {
            await navigator.share({
              title: enhancedItem.title,
              text: `Check out "${enhancedItem.title}" on AniManga Recommender`,
              url,
            });
          } else {
            await navigator.clipboard.writeText(url);
            showSuccessToast("Link Copied", "Item link copied to clipboard");
          }
        } catch (error) {
          console.error("Error sharing item:", error);
          showErrorToast("Share Error", "Failed to share item");
        }
      },
      shortcut: "H",
    },

    // 7. Copy to List (show first 3 lists as separate options, excluding "tests" and "erer")
    ...(userLists.length > 0
      ? (userLists
          .filter((list) => list.name !== "tests" && list.name !== "erer")
          .slice(0, 3)
          .map((list, index) => {
            const action: ContextMenuAction = {
              id: `copy-to-list-${list.id}`,
              label: `Copy to "${list.name}" (${list.itemCount} items)`,
              icon: "📋",
              action: async () => {
                if (onCopyToList) {
                  try {
                    await onCopyToList(item.id, list.id);
                    showSuccessToast("Item Copied", `Copied to "${list.name}"`);
                  } catch (error) {
                    showErrorToast("Copy Error", "Failed to copy to list");
                  }
                }
              },
            };

            if (index === 0) {
              action.shortcut = "C";
            }

            return action;
          }) as ContextMenuItem[])
      : []),

    // Only show separator if there are copy-to-list options (excluding "tests" and "erer")
    ...(userLists.filter((list) => list.name !== "tests" && list.name !== "erer").length > 0
      ? [{ type: "separator" } as ContextMenuItem]
      : []),

    // 8. Remove from List
    {
      id: "remove",
      label: "Remove from List",
      icon: "🗑️",
      action: () => {
        setIsConfirmingRemove(true);
      },
      destructive: true,
      shortcut: "Delete",
    } as ContextMenuItem,
  ];

  // Handle remove confirmation
  const handleConfirmRemove = () => {
    onRemove?.(item.id);
    setIsConfirmingRemove(false);
  };

  const handleCancelRemove = () => {
    setIsConfirmingRemove(false);
  };

  // Handle right-click context menu
  const handleItemContextMenu = (e: React.MouseEvent) => {
    // Always prevent default context menu, even if we can't show our custom one
    e.preventDefault();
    e.stopPropagation();

    // Don't show context menu during drag or while editing
    if (isDragging || isEditing) {
      return;
    }

    // Don't show context menu on drag handle area
    if (e.target instanceof Element && e.target.closest(".drag-handle")) {
      return;
    }

    handleContextMenu(e, item.id);
  };

  // Handle keyboard context menu
  const handleItemKeyDown = (e: React.KeyboardEvent) => {
    // Don't show context menu during drag or while editing
    if (isDragging || isEditing) {
      return;
    }

    // Handle delete key shortcut for removal
    if (e.key === "Delete" && !isContextMenuOpen) {
      e.preventDefault();
      setIsConfirmingRemove(true);
      return;
    }

    handleKeyboardMenu(e, item.id);
  };

  // Handle long-press for mobile context menu
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't trigger during drag or edit
    if (isDragging || isEditing) {
      return;
    }

    // Don't trigger on drag handle
    if (e.target instanceof Element && e.target.closest(".drag-handle")) {
      return;
    }

    const timer = setTimeout(() => {
      const touch = e.touches[0];
      if (touch) {
        handleContextMenu(
          {
            preventDefault: () => {},
            stopPropagation: () => {},
            currentTarget: e.currentTarget,
            clientX: touch.clientX,
            clientY: touch.clientY,
          } as React.MouseEvent,
          item.id
        );

        // Provide haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 500);

    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchMove = () => {
    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Cleanup long-press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`sortable-list-item ${isDragging ? "dragging" : ""} ${isEditing ? "being-edited" : ""} ${
          isOver ? "drop-zone" : ""
        }`}
        data-item-id={item.id}
        onContextMenu={handleItemContextMenu}
        onKeyDown={handleItemKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        tabIndex={0}
        role="listitem"
        aria-label={`${enhancedItem.title}, position ${
          index + 1
        }. Right-click or long-press for more options`}
      >
        {/* Drag Handle */}
        <button
          className="drag-handle"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${enhancedItem.title}`}
          title="Drag to reorder"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {/* Item Image */}
        <div className="item-image-wrapper">
          {enhancedItem.imageUrl ? (
            <img
              src={enhancedItem.imageUrl}
              alt={enhancedItem.title}
              className="item-image"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/default.webp";
              }}
            />
          ) : (
            <div className="item-placeholder">
              <span className="item-position">{index + 1}</span>
            </div>
          )}
        </div>

        {/* Left Side Metadata - Compact */}
        <div className="item-left-metadata">
          {/* Status and Rating */}
          {(enhancedItem.watchStatus || enhancedItem.personalRating) && (
            <div className="item-status-rating-row">
              {enhancedItem.watchStatus && (
                <div className="item-status">
                  <span className={`status-badge ${enhancedItem.watchStatus.replace(/_/g, "-")}`}>
                    {enhancedItem.watchStatus.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>
              )}
              {enhancedItem.personalRating && (
                <span className="item-rating">★ {enhancedItem.personalRating}/10</span>
              )}
            </div>
          )}

          {/* Custom Tags */}
          {enhancedItem.customTags && enhancedItem.customTags.length > 0 && (
            <div className="item-tags">
              {enhancedItem.customTags.slice(0, 4).map((tag, index) => (
                <span key={index} className="item-tag">
                  #{tag}
                </span>
              ))}
              {enhancedItem.customTags.length > 4 && (
                <span className="item-tag-more">+{enhancedItem.customTags.length - 4}</span>
              )}
            </div>
          )}

          {/* Compact Details */}
          {(enhancedItem.dateStarted ||
            enhancedItem.dateCompleted ||
            (enhancedItem.rewatchCount && enhancedItem.rewatchCount > 0)) && (
            <div className="item-details-row">
              {enhancedItem.dateStarted && (
                <span className="item-detail">
                  Started: {new Date(enhancedItem.dateStarted).toLocaleDateString()}
                </span>
              )}
              {enhancedItem.dateCompleted && (
                <span className="item-detail">
                  Completed: {new Date(enhancedItem.dateCompleted).toLocaleDateString()}
                </span>
              )}
              {enhancedItem.rewatchCount && enhancedItem.rewatchCount > 0 && (
                <span className="item-detail">Rewatched: {enhancedItem.rewatchCount}x</span>
              )}
            </div>
          )}
        </div>

        {/* Item Content */}
        <div className="item-content">
          <h4 className="item-title">{enhancedItem.title}</h4>

          <div className="item-meta">
            <span className="item-type">{enhancedItem.mediaType}</span>
            <span className="item-position-badge">Position #{index + 1}</span>
          </div>

          {/* Center: Notes Description - Full Width */}
          {enhancedItem.notes && <div className="item-notes">{enhancedItem.notes}</div>}

          {/* Bottom Centered Date */}
          <div className="item-bottom-date">Added {new Date(enhancedItem.addedAt).toLocaleDateString()}</div>
        </div>

        {/* Action Buttons */}
        <div className="item-actions">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="action-btn edit"
              title="Edit notes, rating, and personal details"
              aria-label={`Edit ${enhancedItem.title}`}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span className="action-btn-label">Edit</span>
            </button>
          )}

          {onRemove && (
            <button
              onClick={() => onRemove(item.id)}
              className="action-btn remove"
              title="Remove this item from the list"
              aria-label={`Remove ${enhancedItem.title} from list`}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="action-btn-label">Remove</span>
            </button>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {isContextMenuOpen && activeItemId === item.id && (
        <ContextMenu
          isOpen={isContextMenuOpen}
          position={contextMenuPosition}
          actions={contextMenuActions}
          onClose={closeContextMenu}
          itemId={item.id}
        />
      )}

      {/* Remove Confirmation Dialog */}
      {isConfirmingRemove && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h3>Remove Item</h3>
            <p>Are you sure you want to remove "{enhancedItem.title}" from this list?</p>
            <div className="confirmation-actions">
              <button onClick={handleCancelRemove} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleConfirmRemove} className="btn-destructive">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Edit Panel */}
      {isEditing && onSave && onCancelEdit && (
        <InlineEditPanel item={enhancedItem} onSave={onSave} onCancel={onCancelEdit} isVisible={isEditing} />
      )}
    </>
  );
};
