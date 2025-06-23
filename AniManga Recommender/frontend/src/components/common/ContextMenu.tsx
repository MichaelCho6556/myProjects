import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ContextMenuPosition } from "../../hooks/useContextMenu";
import "./ContextMenu.css";

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: string;
  action: (...args: any[]) => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
  component?: "StarRating" | "StatusSelector" | "TagInput";
  currentValue?: any;
  options?: Array<{ value: string; label: string; color?: string }>;
}

export interface ContextMenuSeparator {
  type: "separator";
}

export type ContextMenuItem = ContextMenuAction | ContextMenuSeparator;

export interface ContextMenuProps {
  isOpen: boolean;
  position: ContextMenuPosition | null;
  actions: ContextMenuItem[];
  onClose: () => void;
  itemId?: string;
  className?: string;
}

const isAction = (item: ContextMenuItem): item is ContextMenuAction => {
  return (item as ContextMenuSeparator).type !== "separator";
};

const isSeparator = (item: ContextMenuItem): item is ContextMenuSeparator => {
  return (item as ContextMenuSeparator).type === "separator";
};

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  actions,
  onClose,
  itemId: _itemId,
  className = "",
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());

  // Get valid action indices (skip separators)
  const getActionIndices = useCallback(() => {
    return actions
      .map((action, index) => ({ action, index }))
      .filter(({ action }) => isAction(action) && !action.disabled)
      .map(({ index }) => index);
  }, [actions]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const actionIndices = getActionIndices();

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prevIndex) => {
            const currentPos = actionIndices.indexOf(prevIndex);
            const nextPos = currentPos + 1;
            return nextPos < actionIndices.length ? actionIndices[nextPos] : actionIndices[0];
          });
          break;

        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prevIndex) => {
            const currentPos = actionIndices.indexOf(prevIndex);
            const prevPos = currentPos - 1;
            return prevPos >= 0 ? actionIndices[prevPos] : actionIndices[actionIndices.length - 1];
          });
          break;

        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < actions.length) {
            const item = actions[focusedIndex];
            if (isAction(item) && !item.disabled) {
              if (item.component) {
                // Toggle component expansion
                setExpandedComponents((prev) => {
                  const newSet = new Set(prev);
                  if (newSet.has(item.id)) {
                    newSet.delete(item.id);
                  } else {
                    newSet.add(item.id);
                  }
                  return newSet;
                });
              } else {
                item.action();
                onClose();
              }
            }
          }
          break;

        case "Escape":
          e.preventDefault();
          onClose();
          break;

        default:
          // Don't handle shortcuts if typing in an input field
          const target = e.target as HTMLElement;
          if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
            break;
          }

          // Handle shortcut keys
          const shortcutAction = actions.find(
            (item) =>
              isAction(item) &&
              item.shortcut &&
              item.shortcut.toLowerCase() === e.key.toLowerCase() &&
              !item.disabled
          ) as ContextMenuAction | undefined;

          if (shortcutAction) {
            e.preventDefault();
            shortcutAction.action();
            onClose();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex, actions, onClose, getActionIndices]);

  // Focus first available action when menu opens
  useEffect(() => {
    if (isOpen) {
      const actionIndices = getActionIndices();
      if (actionIndices.length > 0) {
        setFocusedIndex(actionIndices[0]);
      }
    } else {
      setFocusedIndex(-1);
      setExpandedComponents(new Set());
    }
  }, [isOpen, getActionIndices]);

  const handleActionClick = (action: ContextMenuAction) => {
    if (action.disabled) return;

    if (action.component) {
      // Toggle component expansion
      setExpandedComponents((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(action.id)) {
          newSet.delete(action.id);
        } else {
          newSet.add(action.id);
        }
        return newSet;
      });
    } else {
      action.action();
      onClose();
    }
  };

  const StarRating: React.FC<{ action: ContextMenuAction }> = ({ action }) => (
    <div className="context-menu-star-rating">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
        <button
          key={rating}
          className={`star-btn ${action.currentValue === rating ? "active" : ""}`}
          onClick={() => {
            action.action(rating);
            onClose();
          }}
          title={`Rate ${rating}/10`}
        >
          ⭐
        </button>
      ))}
    </div>
  );

  const StatusSelector: React.FC<{ action: ContextMenuAction }> = ({ action }) => (
    <div className="context-menu-status-selector">
      {action.options?.map((option) => (
        <button
          key={option.value}
          className={`status-btn ${action.currentValue === option.value ? "active" : ""}`}
          style={{ borderColor: option.color }}
          onClick={() => {
            action.action(option.value);
            onClose();
          }}
          title={option.label}
        >
          <span className="status-indicator" style={{ backgroundColor: option.color }} />
          {option.label}
        </button>
      ))}
    </div>
  );

  const TagInput: React.FC<{ action: ContextMenuAction }> = ({ action }) => {
    const [tagValue, setTagValue] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (tagValue.trim()) {
        action.action(tagValue.trim());
        setTagValue("");
        onClose();
      }
    };

    return (
      <div className="context-menu-tag-input">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            placeholder="Enter tag..."
            autoFocus
            maxLength={20}
          />
          <button type="submit" disabled={!tagValue.trim()}>
            Add
          </button>
        </form>
      </div>
    );
  };

  const renderComponent = (action: ContextMenuAction) => {
    switch (action.component) {
      case "StarRating":
        return <StarRating action={action} />;
      case "StatusSelector":
        return <StatusSelector action={action} />;
      case "TagInput":
        return <TagInput action={action} />;
      default:
        return null;
    }
  };

  if (!isOpen || !position) return null;

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: 99999,
  };

  const menuContent = (
    <div
      ref={menuRef}
      className={`context-menu ${className}`}
      style={menuStyle}
      role="menu"
      aria-label="Context menu"
      onClick={(e) => e.stopPropagation()}
    >
      {actions.map((item, index) => {
        if (isSeparator(item)) {
          return <div key={`separator-${index}`} className="context-menu-separator" role="separator" />;
        }

        const action = item as ContextMenuAction;
        const isExpanded = expandedComponents.has(action.id);
        const isFocused = focusedIndex === index;

        return (
          <div key={action.id} className="context-menu-item-wrapper">
            <button
              className={`context-menu-item ${action.destructive ? "destructive" : ""} ${
                action.disabled ? "disabled" : ""
              } ${isFocused ? "focused" : ""}`}
              onClick={() => handleActionClick(action)}
              disabled={action.disabled}
              role="menuitem"
              aria-expanded={action.component ? isExpanded : undefined}
            >
              <span className="menu-item-icon">{action.icon}</span>
              <span className="menu-item-label">{action.label}</span>
              {action.shortcut && <span className="menu-item-shortcut">{action.shortcut}</span>}
              {action.component && (
                <span className={`menu-item-expand ${isExpanded ? "expanded" : ""}`}>▶</span>
              )}
            </button>

            {action.component && isExpanded && (
              <div className="context-menu-component">{renderComponent(action)}</div>
            )}
          </div>
        );
      })}
    </div>
  );

  return createPortal(menuContent, document.body);
};
