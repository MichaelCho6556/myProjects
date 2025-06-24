export enum BatchOperationType {
  BULK_STATUS_UPDATE = "bulk_status_update",
  BULK_ADD_TAGS = "bulk_add_tags",
  BULK_REMOVE_TAGS = "bulk_remove_tags",
  BULK_RATING_UPDATE = "bulk_rating_update",
  BULK_REMOVE = "bulk_remove",
  BULK_COPY_TO_LIST = "bulk_copy_to_list",
  BULK_MOVE_TO_POSITION = "bulk_move_to_position",
}

export interface BatchOperation {
  id: string;
  label: string;
  icon: string;
  component?: "StatusSelector" | "RatingInput" | "TagInput" | "ListSelector" | "PositionInput";
  destructive?: boolean;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  disabled?: (selectedCount: number) => boolean;
}

export interface BatchOperationData {
  status?: string;
  rating?: number;
  tags?: string[];
  targetListId?: string;
  position?: number;
}

export interface BatchOperationResult {
  success: boolean;
  affectedCount: number;
  errors?: string[];
  message: string;
}

export interface BatchOperationsContextType {
  selectedItems: Set<string>;
  isSelectionMode: boolean;
  lastSelectedIndex: number | null;
  selectionAnchor: number | null;
  selectItem: (itemId: string, index?: number) => void;
  deselectItem: (itemId: string) => void;
  selectRange: (startIndex: number, endIndex: number, items: any[]) => void;
  selectAll: (items: any[]) => void;
  clearSelection: () => void;
  toggleSelectionMode: () => void;
  toggleItem: (itemId: string, index?: number, isShiftClick?: boolean, items?: any[]) => void;
  performBatchOperation: (
    operation: BatchOperationType,
    data?: BatchOperationData
  ) => Promise<BatchOperationResult>;
}

export interface SelectionStats {
  selectedCount: number;
  totalCount: number;
  hasSelection: boolean;
  isAllSelected: boolean;
}
