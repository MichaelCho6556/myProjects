import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { useToastActions } from "../components/Feedback/ToastProvider";
import {
  BatchOperationsContextType,
  BatchOperationType,
  BatchOperationData,
  BatchOperationResult,
  SelectionStats,
} from "../types/batchOperations";

const BatchOperationsContext = createContext<BatchOperationsContextType | undefined>(undefined);

interface BatchOperationsProviderProps {
  children: ReactNode;
  listId?: string;
  onOperationComplete?: (operation: BatchOperationType, result: BatchOperationResult) => void;
}

export const BatchOperationsProvider: React.FC<BatchOperationsProviderProps> = ({
  children,
  listId,
  onOperationComplete,
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);

  const { makeAuthenticatedRequest } = useAuthenticatedApi();
  const { success: showSuccess, error: showError, info: showInfo } = useToastActions();

  const selectItem = useCallback(
    (itemId: string, index?: number) => {
      setSelectedItems((prev) => new Set([...Array.from(prev), itemId]));
      if (index !== undefined) {
        setLastSelectedIndex(index);
        if (selectionAnchor === null) {
          setSelectionAnchor(index);
        }
      }
    },
    [selectionAnchor]
  );

  const deselectItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const selectRange = useCallback((startIndex: number, endIndex: number, items: any[]) => {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);

    const rangeItems = new Set<string>();
    for (let i = start; i <= end; i++) {
      if (items[i]) {
        rangeItems.add(items[i].id);
      }
    }

    setSelectedItems((prev) => new Set([...Array.from(prev), ...Array.from(rangeItems)]));
    setLastSelectedIndex(endIndex);
  }, []);

  const selectAll = useCallback((items: any[]) => {
    const allItemIds = new Set(items.map((item) => item.id));
    setSelectedItems(allItemIds);
    setLastSelectedIndex(items.length - 1);
    setSelectionAnchor(0);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setLastSelectedIndex(null);
    setSelectionAnchor(null);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    if (isSelectionMode) {
      clearSelection();
    }
  }, [isSelectionMode, clearSelection]);

  const toggleItem = useCallback(
    (itemId: string, index?: number, isShiftClick = false, items: any[] = []) => {
      if (isShiftClick && lastSelectedIndex !== null && index !== undefined) {
        // Range selection with Shift+click
        selectRange(lastSelectedIndex, index, items);
      } else {
        // Single item toggle
        if (selectedItems.has(itemId)) {
          deselectItem(itemId);
        } else {
          selectItem(itemId, index);
        }
      }
    },
    [selectedItems, lastSelectedIndex, selectItem, deselectItem, selectRange]
  );

  const performBatchOperation = useCallback(
    async (operation: BatchOperationType, data?: BatchOperationData): Promise<BatchOperationResult> => {
      if (!listId || selectedItems.size === 0) {
        return {
          success: false,
          affectedCount: 0,
          message: "No items selected or list ID missing",
        };
      }

      const itemIds = Array.from(selectedItems);

      try {
        showInfo("Processing...", `Performing ${operation} on ${itemIds.length} items`);

        const response = await makeAuthenticatedRequest(`/api/auth/lists/${listId}/batch-operations`, {
          method: "POST",
          body: JSON.stringify({
            operation_type: operation,
            item_ids: itemIds,
            operation_data: data || {},
          }),
        });

        const result: BatchOperationResult = {
          success: true,
          affectedCount: response.affected_count || itemIds.length,
          message: response.message || "Operation completed successfully",
        };

        showSuccess("Success!", result.message);

        // Clear selection after successful operation
        clearSelection();

        // Notify parent component
        onOperationComplete?.(operation, result);

        return result;
      } catch (error: any) {
        console.error("Batch operation failed:", error);

        const result: BatchOperationResult = {
          success: false,
          affectedCount: 0,
          errors: [error.message || "Unknown error occurred"],
          message: `Failed to perform ${operation}`,
        };

        showError("Operation Failed", result.message);
        return result;
      }
    },
    [
      listId,
      selectedItems,
      makeAuthenticatedRequest,
      showInfo,
      showSuccess,
      showError,
      clearSelection,
      onOperationComplete,
    ]
  );

  const contextValue: BatchOperationsContextType = {
    selectedItems,
    isSelectionMode,
    lastSelectedIndex,
    selectionAnchor,
    selectItem,
    deselectItem,
    selectRange,
    selectAll,
    clearSelection,
    toggleSelectionMode,
    toggleItem,
    performBatchOperation,
  };

  return <BatchOperationsContext.Provider value={contextValue}>{children}</BatchOperationsContext.Provider>;
};

export const useBatchOperations = (): BatchOperationsContextType => {
  const context = useContext(BatchOperationsContext);
  if (!context) {
    throw new Error("useBatchOperations must be used within a BatchOperationsProvider");
  }
  return context;
};

export const useSelectionStats = (totalItems: number): SelectionStats => {
  const { selectedItems } = useBatchOperations();

  return {
    selectedCount: selectedItems.size,
    totalCount: totalItems,
    hasSelection: selectedItems.size > 0,
    isAllSelected: selectedItems.size === totalItems && totalItems > 0,
  };
};
