import React from "react";
import "./ViewModeSelector.css";

export type ViewMode = "compact" | "grid";
export type GroupBy = "none" | "status" | "rating" | "mediaType" | "tags" | "dateAdded";
export type SortBy = "position" | "title" | "rating" | "dateAdded" | "dateCompleted";

export interface ViewSettings {
  viewMode: ViewMode;
  groupBy: GroupBy;
  sortBy: SortBy;
  sortDirection: "asc" | "desc";
  showEmptyGroups: boolean;
  compactDensity: "comfortable" | "cozy" | "compact";
}

interface ViewModeSelectorProps {
  settings: ViewSettings;
  onSettingsChange: (settings: ViewSettings) => void;
  itemCount: number;
  groupCounts?: Record<string, number>;
}

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  settings,
  onSettingsChange,
  itemCount,
  groupCounts = {},
}) => {
  const updateSetting = <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const viewModeOptions = [
    {
      value: "compact" as ViewMode,
      label: "List View",
      description: "Clean list layout with adjustable density",
    },
    {
      value: "grid" as ViewMode,
      label: "Grid View",
      description: "Card-based grid layout",
    },
  ];

  const groupByOptions = [
    { value: "none" as GroupBy, label: "No Grouping" },
    { value: "status" as GroupBy, label: "Watch Status" },
    { value: "rating" as GroupBy, label: "Rating" },
    { value: "mediaType" as GroupBy, label: "Media Type" },
    { value: "tags" as GroupBy, label: "Custom Tags" },
    { value: "dateAdded" as GroupBy, label: "Date Added" },
  ];

  const sortByOptions = [
    { value: "position" as SortBy, label: "Custom Order" },
    { value: "title" as SortBy, label: "Title" },
    { value: "rating" as SortBy, label: "Rating" },
    { value: "dateAdded" as SortBy, label: "Date Added" },
    { value: "dateCompleted" as SortBy, label: "Date Completed" },
  ];

  const densityOptions = [
    { value: "comfortable" as const, label: "Comfort", description: "More spacing - Comfortable layout" },
    { value: "cozy" as const, label: "Cozy", description: "Balanced spacing" },
    { value: "compact" as const, label: "Compact", description: "Minimal spacing" },
  ];

  return (
    <div className="view-mode-selector">
      <div className="view-controls">
        {/* View Mode Toggle */}
        <div className="control-group">
          <label className="control-label">View Mode</label>
          <div className="view-mode-buttons">
            {viewModeOptions.map((option) => (
              <button
                key={option.value}
                className={`view-mode-btn ${settings.viewMode === option.value ? "active" : ""}`}
                onClick={() => updateSetting("viewMode", option.value)}
                title={option.description}
              >
                <span className="view-mode-label">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Group By Selector */}
        <div className="control-group">
          <label className="control-label">Group By</label>
          <select
            className="group-by-select"
            value={settings.groupBy}
            onChange={(e) => updateSetting("groupBy", e.target.value as GroupBy)}
          >
            {groupByOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By Controls */}
        <div className="control-group">
          <label className="control-label">Sort By</label>
          <div className="sort-controls">
            <select
              className="sort-by-select"
              value={settings.sortBy}
              onChange={(e) => updateSetting("sortBy", e.target.value as SortBy)}
            >
              {sortByOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className={`sort-direction-btn ${settings.sortDirection === "desc" ? "desc" : "asc"}`}
              onClick={() =>
                updateSetting("sortDirection", settings.sortDirection === "asc" ? "desc" : "asc")
              }
              title={`Sort ${settings.sortDirection === "asc" ? "Ascending" : "Descending"}`}
            >
              {settings.sortDirection === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Density Control (only for list/compact view) */}
        {settings.viewMode === "compact" && (
          <div className="control-group">
            <label className="control-label">Density</label>
            <div className="density-controls">
              {densityOptions.map((option) => (
                <button
                  key={option.value}
                  className={`density-btn ${settings.compactDensity === option.value ? "active" : ""}`}
                  onClick={() => updateSetting("compactDensity", option.value)}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Additional Options */}
        {settings.groupBy !== "none" && (
          <div className="control-group">
            <label className="control-checkbox">
              <input
                type="checkbox"
                checked={settings.showEmptyGroups}
                onChange={(e) => updateSetting("showEmptyGroups", e.target.checked)}
              />
              <span className="checkbox-label">Show Empty Groups</span>
            </label>
          </div>
        )}
      </div>

      {/* Item Count Summary */}
      <div className="view-summary">
        <span className="item-count">{itemCount} items</span>
        {settings.groupBy !== "none" && Object.keys(groupCounts).length > 0 && (
          <span className="group-count">in {Object.keys(groupCounts).length} groups</span>
        )}
      </div>
    </div>
  );
};
