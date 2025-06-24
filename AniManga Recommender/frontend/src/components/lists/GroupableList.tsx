import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { ListItem } from "../../types/social";
import { ViewSettings, GroupBy } from "./ViewModeSelector";
import { GroupSection } from "./GroupSection";
import { SortableListItem } from "./SortableListItem";
import "./GroupableList.css";

interface GroupableListProps {
  items: ListItem[];
  viewSettings: ViewSettings;
  onReorder: (newItems: ListItem[]) => void;
  onRemoveItem: (itemId: string) => void;
  onEditItem: (item: ListItem) => void;
  onSaveItemEdit: (itemId: string, updatedData: Partial<ListItem>) => Promise<void>;
  editingItemId?: string | null;
  onCancelEdit?: () => void;
  userLists: Array<{ id: string; name: string; itemCount: number }>;
  onQuickRate: (itemId: string, rating: number) => Promise<void>;
  onUpdateStatus: (itemId: string, status: string) => Promise<void>;
  onAddTag: (itemId: string, tag: string) => Promise<void>;
  onCopyToList: (itemId: string, targetListId: string) => Promise<void>;
  isLoading?: boolean;
  emptyMessage?: string;
}

interface ItemGroup {
  id: string;
  title: string;
  items: ListItem[];
  color?: string;
  icon?: string;
  count: number;
  isCollapsed?: boolean;
}

export const GroupableList: React.FC<GroupableListProps> = ({
  items,
  viewSettings,
  onReorder,
  onRemoveItem,
  onEditItem,
  onSaveItemEdit,
  editingItemId = null,
  onCancelEdit = () => {},
  userLists,
  onQuickRate,
  onUpdateStatus,
  onAddTag,
  onCopyToList,
  isLoading = false,
  emptyMessage = "No items to display",
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group items based on current groupBy setting
  const groupedItems = useMemo(() => {
    const groups: ItemGroup[] = [];

    if (viewSettings.groupBy === "none") {
      // No grouping - return all items in a single group
      const sortedItems = sortItems(items, viewSettings.sortBy, viewSettings.sortDirection);
      return [
        {
          id: "all",
          title: "All Items",
          items: sortedItems,
          count: sortedItems.length,
          isCollapsed: false,
        },
      ];
    }

    // Group items by the specified field
    const groupMap = new Map<string, ListItem[]>();

    items.forEach((item) => {
      const groupKey = getGroupKey(item, viewSettings.groupBy);
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(item);
    });

    // Convert map to sorted groups
    const sortedGroupKeys = Array.from(groupMap.keys()).sort();

    sortedGroupKeys.forEach((groupKey) => {
      const groupItems = groupMap.get(groupKey)!;
      const sortedGroupItems = sortItems(groupItems, viewSettings.sortBy, viewSettings.sortDirection);

      groups.push({
        id: groupKey,
        title: getGroupTitle(groupKey, viewSettings.groupBy),
        items: sortedGroupItems,
        color: getGroupColor(groupKey, viewSettings.groupBy),
        icon: getGroupIcon(groupKey, viewSettings.groupBy),
        count: sortedGroupItems.length,
        isCollapsed: collapsedGroups.has(groupKey),
      });
    });

    // Add empty groups if requested
    if (viewSettings.showEmptyGroups) {
      const expectedGroups = getExpectedGroups(viewSettings.groupBy);
      expectedGroups.forEach((expectedGroup) => {
        if (!groups.find((g) => g.id === expectedGroup.id)) {
          groups.push({
            id: expectedGroup.id || "unknown",
            title: expectedGroup.title || "Unknown",
            color: expectedGroup.color || "#6b7280",
            icon: expectedGroup.icon || "📝",
            items: [],
            count: 0,
            isCollapsed: false,
          });
        }
      });
    }

    return groups.sort((a, b) => getGroupSortOrder(a.id, b.id, viewSettings.groupBy));
  }, [items, viewSettings, collapsedGroups]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    // Find the source and destination groups
    let sourceGroup: ItemGroup | null = null;
    let destGroup: ItemGroup | null = null;
    let sourceIndex = -1;
    let destIndex = -1;

    for (const group of groupedItems) {
      const activeIndex = group.items.findIndex((item) => item.id === active.id);
      if (activeIndex !== -1) {
        sourceGroup = group;
        sourceIndex = activeIndex;
      }

      const overIndex = group.items.findIndex((item) => item.id === over.id);
      if (overIndex !== -1) {
        destGroup = group;
        destIndex = overIndex;
      }
    }

    if (!sourceGroup || !destGroup) return;

    // Calculate new order
    const newItems = [...items];
    const activeItem = sourceGroup.items[sourceIndex];

    if (sourceGroup === destGroup) {
      // Reordering within the same group
      const reorderedGroup = arrayMove(sourceGroup.items, sourceIndex, destIndex);
      const startIndex = newItems.findIndex((item) => item.id === reorderedGroup[0].id);
      reorderedGroup.forEach((item, index) => {
        const globalIndex = newItems.findIndex((i) => i.id === item.id);
        if (globalIndex !== -1) {
          newItems[globalIndex] = { ...item, order: startIndex + index };
        }
      });
    } else {
      // Moving between groups - this might require updating item properties
      // For now, just update the order
      const destItem = destGroup.items[destIndex];
      const activeIndex = newItems.findIndex((item) => item.id === activeItem.id);
      const destGlobalIndex = newItems.findIndex((item) => item.id === destItem.id);

      if (activeIndex !== -1 && destGlobalIndex !== -1) {
        const movedItem = newItems[activeIndex];
        newItems.splice(activeIndex, 1);
        newItems.splice(destGlobalIndex, 0, movedItem);

        // Update order values
        newItems.forEach((item, index) => {
          item.order = index;
        });
      }
    }

    onReorder(newItems);
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="groupable-list loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="groupable-list empty">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <div className="empty-message">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`groupable-list view-mode-${viewSettings.viewMode} density-${viewSettings.compactDensity}`}
      >
        {groupedItems.map((group) => (
          <GroupSection
            key={group.id}
            group={group}
            viewMode={viewSettings.viewMode}
            onToggleCollapse={() => toggleGroupCollapse(group.id)}
            onRemoveItem={onRemoveItem}
            onEditItem={onEditItem}
            onSaveItemEdit={onSaveItemEdit}
            editingItemId={editingItemId}
            onCancelEdit={onCancelEdit}
            userLists={userLists}
            onQuickRate={onQuickRate}
            onUpdateStatus={onUpdateStatus}
            onAddTag={onAddTag}
            onCopyToList={onCopyToList}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem && (
          <div className="drag-overlay">
            <SortableListItem
              item={activeItem}
              index={0}
              onRemove={() => {}}
              onEdit={() => {}}
              onSave={() => Promise.resolve()}
              userLists={userLists}
              onQuickRate={() => Promise.resolve()}
              onUpdateStatus={() => Promise.resolve()}
              onAddTag={() => Promise.resolve()}
              onCopyToList={() => Promise.resolve()}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

// Helper functions for grouping logic
function getGroupKey(item: ListItem, groupBy: GroupBy): string {
  switch (groupBy) {
    case "status":
      // Don't default to plan_to_watch if watchStatus is explicitly null/undefined
      // Only use plan_to_watch for items that truly have no status set
      const status = item.watchStatus;
      if (!status) {
        return "plan_to_watch";
      }
      return status;
    case "rating":
      const rating = item.personalRating || 0;
      if (rating === 0) return "unrated";
      if (rating <= 3) return "low-rating";
      if (rating <= 6) return "medium-rating";
      if (rating <= 8) return "high-rating";
      return "excellent-rating";
    case "mediaType":
      return item.mediaType || "unknown";
    case "tags":
      const tags = item.customTags || [];
      return tags.length > 0 ? tags[0] : "no-tags";
    case "dateAdded":
      const addedDate = new Date(item.addedAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - addedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) return "this-week";
      if (diffDays <= 30) return "this-month";
      if (diffDays <= 90) return "this-quarter";
      return "older";
    default:
      return "ungrouped";
  }
}

function getGroupTitle(groupKey: string, groupBy: GroupBy): string {
  switch (groupBy) {
    case "status":
      const statusMap: Record<string, string> = {
        plan_to_watch: "Plan to Watch",
        watching: "Currently Watching",
        completed: "Completed",
        on_hold: "On Hold",
        dropped: "Dropped",
      };
      return statusMap[groupKey] || groupKey;
    case "rating":
      const ratingMap: Record<string, string> = {
        unrated: "Unrated",
        "low-rating": "Low Rating (1-3)",
        "medium-rating": "Medium Rating (4-6)",
        "high-rating": "High Rating (7-8)",
        "excellent-rating": "Excellent Rating (9-10)",
      };
      return ratingMap[groupKey] || groupKey;
    case "mediaType":
      return groupKey === "anime" ? "Anime" : groupKey === "manga" ? "Manga" : "Unknown";
    case "tags":
      return groupKey === "no-tags" ? "No Tags" : `#${groupKey}`;
    case "dateAdded":
      const dateMap: Record<string, string> = {
        "this-week": "Added This Week",
        "this-month": "Added This Month",
        "this-quarter": "Added This Quarter",
        older: "Older Items",
      };
      return dateMap[groupKey] || groupKey;
    default:
      return groupKey;
  }
}

function getGroupColor(groupKey: string, groupBy: GroupBy): string {
  switch (groupBy) {
    case "status":
      const statusColors: Record<string, string> = {
        plan_to_watch: "#3b82f6",
        watching: "#10b981",
        completed: "#8b5cf6",
        on_hold: "#f59e0b",
        dropped: "#ef4444",
      };
      return statusColors[groupKey] || "#6b7280";
    case "rating":
      const ratingColors: Record<string, string> = {
        unrated: "#6b7280",
        "low-rating": "#ef4444",
        "medium-rating": "#f59e0b",
        "high-rating": "#10b981",
        "excellent-rating": "#8b5cf6",
      };
      return ratingColors[groupKey] || "#6b7280";
    case "mediaType":
      return groupKey === "anime" ? "#3b82f6" : "#10b981";
    default:
      return "#6b7280";
  }
}

function getGroupIcon(groupKey: string, groupBy: GroupBy): string {
  switch (groupBy) {
    case "status":
      const statusIcons: Record<string, string> = {
        plan_to_watch: "📋",
        watching: "▶️",
        completed: "✅",
        on_hold: "⏸️",
        dropped: "❌",
      };
      return statusIcons[groupKey] || "📝";
    case "rating":
      const ratingIcons: Record<string, string> = {
        unrated: "⭐",
        "low-rating": "1️⃣",
        "medium-rating": "5️⃣",
        "high-rating": "8️⃣",
        "excellent-rating": "🏆",
      };
      return ratingIcons[groupKey] || "⭐";
    case "mediaType":
      return groupKey === "anime" ? "📺" : "📚";
    case "tags":
      return "🏷️";
    case "dateAdded":
      return "📅";
    default:
      return "📝";
  }
}

function sortItems(items: ListItem[], sortBy: string, direction: "asc" | "desc"): ListItem[] {
  const sorted = [...items].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "rating":
        comparison = (a.personalRating || 0) - (b.personalRating || 0);
        break;
      case "dateAdded":
        comparison = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        break;
      case "dateCompleted":
        const aCompleted = a.dateCompleted ? new Date(a.dateCompleted).getTime() : 0;
        const bCompleted = b.dateCompleted ? new Date(b.dateCompleted).getTime() : 0;
        comparison = aCompleted - bCompleted;
        break;
      case "position":
      default:
        comparison = a.order - b.order;
        break;
    }

    return direction === "desc" ? -comparison : comparison;
  });

  return sorted;
}

function getExpectedGroups(groupBy: GroupBy): Partial<ItemGroup>[] {
  switch (groupBy) {
    case "status":
      return [
        { id: "plan_to_watch", title: "Plan to Watch" },
        { id: "watching", title: "Currently Watching" },
        { id: "completed", title: "Completed" },
        { id: "on_hold", title: "On Hold" },
        { id: "dropped", title: "Dropped" },
      ];
    case "rating":
      return [
        { id: "excellent-rating", title: "Excellent Rating (9-10)" },
        { id: "high-rating", title: "High Rating (7-8)" },
        { id: "medium-rating", title: "Medium Rating (4-6)" },
        { id: "low-rating", title: "Low Rating (1-3)" },
        { id: "unrated", title: "Unrated" },
      ];
    default:
      return [];
  }
}

function getGroupSortOrder(a: string, b: string, groupBy: GroupBy): number {
  if (groupBy === "status") {
    const statusOrder = ["plan_to_watch", "watching", "on_hold", "completed", "dropped"];
    return statusOrder.indexOf(a) - statusOrder.indexOf(b);
  }

  if (groupBy === "rating") {
    const ratingOrder = ["excellent-rating", "high-rating", "medium-rating", "low-rating", "unrated"];
    return ratingOrder.indexOf(a) - ratingOrder.indexOf(b);
  }

  return a.localeCompare(b);
}
