// ABOUTME: Sortable list item component with drag-and-drop functionality for reordering list items
// ABOUTME: Provides touch support and accessibility features for custom list management

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ListItem } from '../../types/social';

interface SortableListItemProps {
  item: ListItem;
  index: number;
  onRemove?: (itemId: string) => void;
  onEdit?: (item: ListItem) => void;
}

export const SortableListItem: React.FC<SortableListItemProps> = ({ 
  item, 
  index, 
  onRemove,
  onEdit 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
        ${isDragging ? 'shadow-lg z-50 opacity-90' : 'hover:shadow-md'} 
        transition-shadow
      `}
    >
      {/* Drag Handle */}
      <button
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${item.title}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* Item Image */}
      <div className="flex-shrink-0 w-12 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.title} 
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/default.webp';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {index + 1}
            </span>
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
            {item.mediaType}
          </span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Position #{index + 1}
          </span>
        </div>
        {item.notes && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {item.notes}
          </p>
        )}
        <div className="text-xs text-gray-400 mt-1">
          Added {new Date(item.addedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Edit item"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Remove from list"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};