import React, { useState, useRef } from "react";
import { useBatchOperations, useSelectionStats } from "../../context/BatchOperationsProvider";
import { BatchOperationType, BatchOperationData, BatchOperation } from "../../types/batchOperations";
import { ListItem } from "../../types/social";
import { logger } from "../../utils/logger";
import "./BatchOperationsToolbar.css";

interface BatchOperationsToolbarProps {
  items: ListItem[];
  userLists?: Array<{ id: string; name: string; itemCount: number }>;
  onRefresh?: () => void;
}

interface BatchComponentProps {
  onSubmit: (data: BatchOperationData) => void;
  onCancel: () => void;
  selectedCount: number;
  mode?: "add" | "remove";
}

// Status Selector Component
const StatusSelector: React.FC<BatchComponentProps> = ({ onSubmit, onCancel, selectedCount }) => {
  const [selectedStatus, setSelectedStatus] = useState("");

  const statusOptions = [
    { value: "plan_to_watch", label: "Plan to Watch", color: "#3b82f6" },
    { value: "watching", label: "Watching", color: "#10b981" },
    { value: "completed", label: "Completed", color: "#8b5cf6" },
    { value: "on_hold", label: "On Hold", color: "#f59e0b" },
    { value: "dropped", label: "Dropped", color: "#ef4444" },
  ];

  const handleSubmit = () => {
    if (selectedStatus) {
      onSubmit({ status: selectedStatus });
    }
  };

  return (
    <div className="batch-component">
      <h4>Update Status for {selectedCount} items</h4>
      <div className="status-options">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            className={`status-option ${selectedStatus === option.value ? "selected" : ""}`}
            style={{ "--status-color": option.color } as React.CSSProperties}
            onClick={() => setSelectedStatus(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="batch-component-actions">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={handleSubmit} className="btn-primary" disabled={!selectedStatus}>
          Update Status
        </button>
      </div>
    </div>
  );
};

// Rating Input Component
const RatingInput: React.FC<BatchComponentProps> = ({ onSubmit, onCancel, selectedCount }) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit({ rating });
    }
  };

  return (
    <div className="batch-component">
      <h4>Rate {selectedCount} items</h4>
      <div className="rating-input">
        <div className="star-rating">
          {[...Array(10)].map((_, i) => {
            const starValue = i + 1;
            return (
              <button
                key={i}
                className={`star ${starValue <= (hoverRating || rating) ? "filled" : ""}`}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(starValue)}
              >
                ⭐
              </button>
            );
          })}
        </div>
        <span className="rating-value">{hoverRating || rating}/10</span>
      </div>
      <div className="batch-component-actions">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={handleSubmit} className="btn-primary" disabled={rating === 0}>
          Set Rating
        </button>
      </div>
    </div>
  );
};

// Tag Input Component
const TagInput: React.FC<BatchComponentProps> = ({ onSubmit, onCancel, selectedCount, mode = "add" }) => {
  const [tags, setTags] = useState<string>("");
  const [tagMode, setTagMode] = useState<"add" | "remove">(mode);

  const handleSubmit = () => {
    const tagList = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    if (tagList.length > 0) {
      onSubmit({ tags: tagList });
    }
  };

  return (
    <div className="batch-component">
      <h4>
        {tagMode === "add" ? "Add" : "Remove"} tags for {selectedCount} items
      </h4>
      <div className="tag-input-controls">
        {!mode && (
          <div className="mode-selector">
            <button className={tagMode === "add" ? "active" : ""} onClick={() => setTagMode("add")}>
              Add Tags
            </button>
            <button className={tagMode === "remove" ? "active" : ""} onClick={() => setTagMode("remove")}>
              Remove Tags
            </button>
          </div>
        )}
        <input
          type="text"
          placeholder="Enter tags separated by commas"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="tag-input"
        />
      </div>
      <div className="batch-component-actions">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={handleSubmit} className="btn-primary" disabled={!tags.trim()}>
          {tagMode === "add" ? "Add" : "Remove"} Tags
        </button>
      </div>
    </div>
  );
};

// List Selector Component
const ListSelector: React.FC<
  BatchComponentProps & { userLists: Array<{ id: string; name: string; itemCount: number }> }
> = ({ onSubmit, onCancel, selectedCount, userLists }) => {
  const [selectedListId, setSelectedListId] = useState("");

  const handleSubmit = () => {
    if (selectedListId) {
      onSubmit({ targetListId: selectedListId });
    }
  };

  return (
    <div className="batch-component">
      <h4>Copy {selectedCount} items to list</h4>
      <div className="list-options">
        {userLists.map((list) => (
          <button
            key={list.id}
            className={`list-option ${selectedListId === list.id ? "selected" : ""}`}
            onClick={() => setSelectedListId(list.id)}
          >
            <span className="list-name">{list.name}</span>
            <span className="list-count">{list.itemCount} items</span>
          </button>
        ))}
      </div>
      <div className="batch-component-actions">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={handleSubmit} className="btn-primary" disabled={!selectedListId}>
          Copy to List
        </button>
      </div>
    </div>
  );
};

// Position Input Component
const PositionInput: React.FC<BatchComponentProps> = ({ onSubmit, onCancel, selectedCount }) => {
  const [position, setPosition] = useState<number>(0);
  const [mode, setMode] = useState<"beginning" | "end" | "specific">("beginning");

  const handleSubmit = () => {
    let targetPosition = position;
    if (mode === "beginning") targetPosition = 0;
    if (mode === "end") targetPosition = -1; // Backend will handle this

    onSubmit({ position: targetPosition });
  };

  return (
    <div className="batch-component">
      <h4>Move {selectedCount} items</h4>
      <div className="position-input-controls">
        <div className="position-mode-selector">
          <button className={mode === "beginning" ? "active" : ""} onClick={() => setMode("beginning")}>
            To Beginning
          </button>
          <button className={mode === "end" ? "active" : ""} onClick={() => setMode("end")}>
            To End
          </button>
          <button className={mode === "specific" ? "active" : ""} onClick={() => setMode("specific")}>
            Specific Position
          </button>
        </div>
        {mode === "specific" && (
          <input
            type="number"
            min="1"
            value={position}
            onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
            placeholder="Position (1-based)"
            className="position-input"
          />
        )}
      </div>
      <div className="batch-component-actions">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={handleSubmit} className="btn-primary">
          Move Items
        </button>
      </div>
    </div>
  );
};

export const BatchOperationsToolbar: React.FC<BatchOperationsToolbarProps> = ({
  items,
  userLists = [],
  onRefresh,
}) => {
  const { isSelectionMode, toggleSelectionMode, selectAll, performBatchOperation } = useBatchOperations();

  const selectionStats = useSelectionStats(items.length);
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<BatchOperationType | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Don't render if not in selection mode or no items selected
  if (!isSelectionMode || !selectionStats.hasSelection) {
    return null;
  }

  const batchOperations: BatchOperation[] = [
    {
      id: "bulk_status_update",
      label: "Update Status",
      icon: "📊",
      component: "StatusSelector",
    },
    {
      id: "bulk_rating_update",
      label: "Set Rating",
      icon: "⭐",
      component: "RatingInput",
    },
    {
      id: "bulk_add_tags",
      label: "Add Tags",
      icon: "🏷️",
      component: "TagInput",
    },
    {
      id: "bulk_remove_tags",
      label: "Remove Tags",
      icon: "🏷️❌",
      component: "TagInput",
    },
    {
      id: "bulk_copy_to_list",
      label: "Copy to List",
      icon: "📋",
      component: "ListSelector",
      disabled: () => userLists.length === 0,
    },
    {
      id: "bulk_move_to_position",
      label: "Move to Position",
      icon: "↕️",
      component: "PositionInput",
    },
    {
      id: "bulk_remove",
      label: "Remove Selected",
      icon: "🗑️",
      destructive: true,
      requiresConfirmation: true,
      confirmationMessage: "Are you sure you want to remove {count} items from this list?",
    },
  ];

  const handleBatchOperation = async (operationType: BatchOperationType, data?: BatchOperationData) => {
    try {
      const result = await performBatchOperation(operationType, data);
      if (result.success && onRefresh) {
        onRefresh();
      }
      setActiveComponent(null);
    } catch (error: any) {
      logger.error("Batch operation failed", {
        error: error?.message || "Unknown error",
        context: "BatchOperationsToolbar",
        operation: "handleComponentSubmit",
        selectedCount: selectionStats.selectedCount,
        operationType: activeComponent
      });
    }
  };

  const handleOperationClick = (operation: BatchOperation) => {
    if (operation.disabled?.(selectionStats.selectedCount)) {
      return;
    }

    if (operation.requiresConfirmation) {
      setShowConfirmDialog(operation.id as BatchOperationType);
    } else if (operation.component) {
      setActiveComponent(operation.id);
    } else {
      handleBatchOperation(operation.id as BatchOperationType);
    }
  };

  const handleConfirmedOperation = async () => {
    if (showConfirmDialog) {
      await handleBatchOperation(showConfirmDialog);
      setShowConfirmDialog(null);
    }
  };

  const renderActiveComponent = () => {
    if (!activeComponent) return null;

    const props = {
      onSubmit: (data: BatchOperationData) =>
        handleBatchOperation(activeComponent as BatchOperationType, data),
      onCancel: () => setActiveComponent(null),
      selectedCount: selectionStats.selectedCount,
    };

    switch (activeComponent) {
      case "bulk_status_update":
        return <StatusSelector {...props} />;
      case "bulk_rating_update":
        return <RatingInput {...props} />;
      case "bulk_add_tags":
        return <TagInput {...props} />;
      case "bulk_remove_tags":
        return <TagInput {...props} mode="remove" />;
      case "bulk_copy_to_list":
        return <ListSelector {...props} userLists={userLists} />;
      case "bulk_move_to_position":
        return <PositionInput {...props} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div ref={toolbarRef} className="batch-operations-toolbar">
        <div className="toolbar-content">
          {/* Selection Info */}
          <div className="selection-info">
            <span className="selected-count">
              {selectionStats.selectedCount} of {selectionStats.totalCount} selected
            </span>
            <button
              onClick={() => selectAll(items)}
              className="select-all-btn"
              disabled={selectionStats.isAllSelected}
            >
              Select All
            </button>
          </div>

          {/* Batch Operations */}
          <div className="batch-operations">
            {batchOperations.map((operation) => (
              <button
                key={operation.id}
                onClick={() => handleOperationClick(operation)}
                className={`batch-operation-btn ${operation.destructive ? "destructive" : ""}`}
                disabled={operation.disabled?.(selectionStats.selectedCount)}
                title={operation.label}
              >
                <span className="operation-icon">{operation.icon}</span>
                <span className="operation-label">{operation.label}</span>
              </button>
            ))}
          </div>

          {/* Close Button */}
          <button onClick={toggleSelectionMode} className="close-selection-btn" title="Exit selection mode">
            ✕
          </button>
        </div>
      </div>

      {/* Active Component Overlay */}
      {activeComponent && (
        <div className="batch-component-overlay">
          <div className="batch-component-container">{renderActiveComponent()}</div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="batch-confirmation-overlay">
          <div className="batch-confirmation-dialog">
            <h3>Confirm Action</h3>
            <p>
              {batchOperations
                .find((op) => op.id === showConfirmDialog)
                ?.confirmationMessage?.replace("{count}", selectionStats.selectedCount.toString())}
            </p>
            <div className="confirmation-actions">
              <button onClick={() => setShowConfirmDialog(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleConfirmedOperation} className="btn-destructive">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
