// ABOUTME: Sortable list container with drag-and-drop functionality for reordering custom list items
// ABOUTME: Provides DragDropContext wrapper and handles item reordering with optimistic updates

import React, { useState } from "react";
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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { SortableListItem } from "./SortableListItem";
import { ListItem } from "../../types/social";

interface SortableListProps {
  items: ListItem[];
  onReorder: (items: ListItem[]) => Promise<void>;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: ListItem) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export const SortableList: React.FC<SortableListProps> = ({
  items,
  onReorder,
  onRemoveItem,
  onEditItem,
  isLoading = false,
  emptyMessage = "No items in this list yet.",
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

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
    setActiveId(active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

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
        console.error("Failed to reorder items:", error);
        // The parent component should handle error states and reverting
      }
    }
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="animate-pulse flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
          >
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="w-12 h-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
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
      <div className="text-center py-8">
        <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Empty List</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto text-center leading-relaxed">{emptyMessage}</p>
      </div>
    );
  }

  return (
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
              onEdit={onEditItem || (() => {})}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <div className="opacity-80">
            <SortableListItem
              item={activeItem}
              index={items.findIndex((item) => item.id === activeItem.id)}
              onRemove={onRemoveItem || (() => {})}
              onEdit={onEditItem || (() => {})}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
