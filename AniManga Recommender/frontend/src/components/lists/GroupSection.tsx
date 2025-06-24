import React from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListItem } from "../../types/social";
import { SortableListItem } from "./SortableListItem";
import { ViewMode } from "./ViewModeSelector";
import "./GroupSection.css";

interface ItemGroup {
  id: string;
  title: string;
  items: ListItem[];
  color?: string;
  icon?: string;
  count: number;
  isCollapsed?: boolean;
}

interface GroupSectionProps {
  group: ItemGroup;
  viewMode: ViewMode;
  onToggleCollapse: () => void;
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
}

export const GroupSection: React.FC<GroupSectionProps> = ({
  group,
  viewMode,
  onToggleCollapse,
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
}) => {
  const itemIds = group.items.map((item) => item.id);

  return (
    <div className={`group-section ${group.isCollapsed ? "collapsed" : "expanded"}`}>
      {/* Group Header */}
      <div className="group-header" onClick={onToggleCollapse}>
        <div className="group-info">
          <div className="group-icon-wrapper">
            {group.icon && (
              <span className="group-icon" style={{ color: group.color }}>
                {group.icon}
              </span>
            )}
            <div className="group-color-indicator" style={{ backgroundColor: group.color }} />
          </div>
          <h3 className="group-title">{group.title}</h3>
          <span className="group-count">({group.count})</span>
        </div>

        <div className="group-controls">
          <button
            className={`collapse-toggle ${group.isCollapsed ? "collapsed" : "expanded"}`}
            title={group.isCollapsed ? "Expand group" : "Collapse group"}
          >
            {group.isCollapsed ? "▶" : "▼"}
          </button>
        </div>
      </div>

      {/* Group Content */}
      {!group.isCollapsed && (
        <div className={`group-content view-mode-${viewMode}`}>
          {group.items.length === 0 ? (
            <div className="group-empty">
              <div className="empty-group-message">
                <span className="empty-icon">📭</span>
                <span>No items in this group</span>
              </div>
            </div>
          ) : (
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div className={`group-items ${viewMode}-layout`}>
                {group.items.map((item) => (
                  <SortableListItem
                    key={item.id}
                    item={item}
                    index={group.items.indexOf(item)}
                    onRemove={onRemoveItem}
                    onEdit={onEditItem}
                    onSave={onSaveItemEdit}
                    onCancelEdit={onCancelEdit}
                    isEditing={editingItemId === item.id}
                    userLists={userLists}
                    onQuickRate={onQuickRate}
                    onUpdateStatus={onUpdateStatus}
                    onAddTag={onAddTag}
                    onCopyToList={onCopyToList}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
};
