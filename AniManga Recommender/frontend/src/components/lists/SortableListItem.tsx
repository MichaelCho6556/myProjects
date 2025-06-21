// ABOUTME: Sortable list item component with drag-and-drop functionality for reordering list items
// ABOUTME: Provides touch support and accessibility features for custom list management

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ListItem } from '../../types/social';
import './SortableListItem.css';

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
      className={`sortable-list-item ${isDragging ? 'dragging' : ''}`}
    >
      {/* Drag Handle */}
      <button
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${item.title}`}
        title="Drag to reorder"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* Item Image */}
      <div className="item-image-wrapper">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.title} 
            className="item-image"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/default.webp';
            }}
          />
        ) : (
          <div className="item-placeholder">
            <span className="item-position">
              {index + 1}
            </span>
          </div>
        )}
      </div>

      {/* Item Content */}
      <div className="item-content">
        <h4 className="item-title">{item.title}</h4>
        
        <div className="item-meta">
          <span className="item-type">{item.mediaType}</span>
          <span className="item-position-badge">Position #{index + 1}</span>
        </div>
        
        {item.notes && (
          <p className="item-notes">{item.notes}</p>
        )}
        
        <div className="item-date">
          Added {new Date(item.addedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="item-actions">
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="action-btn edit"
            title="Edit item notes"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="action-btn remove"
            title="Remove from list"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};