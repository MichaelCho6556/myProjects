import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { useToastActions } from "../Feedback/ToastProvider";
import "./AdvancedFilterBar.css";

export interface FilterConfig {
  status: {
    values: string[];
    operator: "includes" | "excludes";
  };
  rating: {
    min: number;
    max: number;
    includeUnrated: boolean;
  };
  tags: {
    values: string[];
    operator: "any" | "all" | "none";
  };
  dateRange: {
    field: "addedAt" | "dateStarted" | "dateCompleted";
    start: Date | null;
    end: Date | null;
  };
  mediaType: {
    values: string[];
  };
  rewatchCount: {
    min: number;
    max: number;
  };
  search: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: FilterConfig;
  isDefault: boolean;
  isPublic: boolean;
  usageCount: number;
}

interface AdvancedFilterBarProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  availableTags: string[];
  itemCount: number;
  filteredCount: number;
}

const defaultFilters: FilterConfig = {
  status: { values: [], operator: "includes" },
  rating: { min: 0, max: 10, includeUnrated: true },
  tags: { values: [], operator: "any" },
  dateRange: { field: "addedAt", start: null, end: null },
  mediaType: { values: [] },
  rewatchCount: { min: 0, max: 100 },
  search: "",
};

export const AdvancedFilterBar: React.FC<AdvancedFilterBarProps> = ({
  filters,
  onFiltersChange,
  availableTags,
  itemCount,
  filteredCount,
}) => {
  const { makeAuthenticatedRequest } = useAuthenticatedApi();
  const { success: showSuccess, error: showError } = useToastActions();

  const [isExpanded, setIsExpanded] = useState(false);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");

  // Status options
  const statusOptions = [
    { value: "plan_to_watch", label: "Plan to Watch" },
    { value: "watching", label: "Watching" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
    { value: "dropped", label: "Dropped" },
  ];

  // Load filter presets
  useEffect(() => {
    const loadFilterPresets = async () => {
      try {
        const response = await makeAuthenticatedRequest("/api/auth/filter-presets");
        const presets = response.data || response;
        setFilterPresets(presets);
      } catch (error) {
        // Silently fail - filter presets are not critical
      }
    };

    loadFilterPresets();
  }, [makeAuthenticatedRequest]);

  // Quick filter buttons with toggle functionality
  const quickFilters = [
    {
      id: "completed",
      label: "Completed",
      description: "Items you've finished",
      icon: "✓",
      color: "success",
      action: () => {
        const isCurrentlyActive =
          filters.status.values.includes("completed") && filters.status.operator === "includes";
        if (isCurrentlyActive) {
          // Toggle off: clear status filter
          updateFilters({ status: { values: [], operator: "includes" } });
        } else {
          // Toggle on: set completed filter
          updateFilters({ status: { values: ["completed"], operator: "includes" } });
        }
      },
      isActive: () => filters.status.values.includes("completed") && filters.status.operator === "includes",
    },
    {
      id: "highly-rated",
      label: "Highly Rated",
      description: "8.0+ rating",
      icon: "⭐",
      color: "warning",
      action: () => {
        const isCurrentlyActive = filters.rating.min >= 8 && !filters.rating.includeUnrated;
        if (isCurrentlyActive) {
          // Toggle off: reset rating to defaults
          updateFilters({ rating: { min: 0, max: 10, includeUnrated: true } });
        } else {
          // Toggle on: set high rating filter
          updateFilters({ rating: { min: 8, max: 10, includeUnrated: false } });
        }
      },
      isActive: () => filters.rating.min >= 8 && !filters.rating.includeUnrated,
    },
    {
      id: "recently-added",
      label: "Recently Added",
      description: "Added this week",
      icon: "📅",
      color: "info",
      action: () => {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const isCurrentlyActive = filters.dateRange.start && filters.dateRange.start >= lastWeek;

        if (isCurrentlyActive) {
          // Toggle off: clear date range
          updateFilters({ dateRange: { field: "addedAt", start: null, end: null } });
        } else {
          // Toggle on: set recent date filter
          updateFilters({ dateRange: { field: "addedAt", start: lastWeek, end: new Date() } });
        }
      },
      isActive: () => {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        return filters.dateRange.start && filters.dateRange.start >= lastWeek;
      },
    },
    {
      id: "rewatched",
      label: "Rewatched",
      description: "Seen multiple times",
      icon: "🔄",
      color: "accent",
      action: () => {
        const isCurrentlyActive = filters.rewatchCount.min >= 1;
        if (isCurrentlyActive) {
          // Toggle off: reset rewatch count
          updateFilters({ rewatchCount: { min: 0, max: 100 } });
        } else {
          // Toggle on: set rewatched filter
          updateFilters({ rewatchCount: { min: 1, max: 100 } });
        }
      },
      isActive: () => filters.rewatchCount.min >= 1,
    },
    {
      id: "unrated",
      label: "Unrated",
      description: "Not yet rated",
      icon: "❓",
      color: "muted",
      action: () => {
        const isCurrentlyActive = !filters.rating.includeUnrated;
        if (isCurrentlyActive) {
          // Toggle off: include unrated again
          updateFilters({ rating: { ...filters.rating, includeUnrated: true } });
        } else {
          // Toggle on: exclude unrated items
          updateFilters({ rating: { ...filters.rating, includeUnrated: false } });
        }
      },
      isActive: () => !filters.rating.includeUnrated,
    },
  ];

  const updateFilters = useCallback(
    (partialFilters: Partial<FilterConfig>) => {
      const newFilters = { ...filters, ...partialFilters };
      onFiltersChange(newFilters);
      setSelectedPreset(null); // Clear preset selection when manually changing filters
    },
    [filters, onFiltersChange]
  );

  const clearAllFilters = useCallback(() => {
    onFiltersChange(defaultFilters);
    setSelectedPreset(null);
  }, [onFiltersChange]);

  const saveFilterPreset = async () => {
    if (!presetName.trim()) {
      showError("Error", "Please enter a preset name");
      return;
    }

    try {
      const presetData = {
        name: presetName.trim(),
        description: presetDescription.trim() || null,
        filters,
        isPublic: false,
      };

      const response = await makeAuthenticatedRequest("/api/auth/filter-presets", {
        method: "POST",
        body: JSON.stringify(presetData),
      });

      const newPreset: FilterPreset = response.data || response;
      setFilterPresets((prev) => [...prev, newPreset]);
      setSelectedPreset(String(newPreset.id));

      setPresetName("");
      setPresetDescription("");
      setShowSavePreset(false);

      showSuccess("Success", "Filter preset saved!");
    } catch (error: any) {
      showError("Error", error.message || "Failed to save filter preset");
    }
  };

  const loadFilterPreset = async (presetId: string) => {
    // Handle both string and number IDs from the API
    const preset = filterPresets.find((p) => String(p.id) === String(presetId));
    if (!preset) {
      showError("Error", "Preset not found");
      return;
    }

    try {
      // Apply the preset filters
      onFiltersChange(preset.filters);
      setSelectedPreset(presetId);

      // Show success message
      showSuccess("Success", `Applied preset: ${preset.name}`);

      // Update usage count (non-blocking)
      makeAuthenticatedRequest(`/api/auth/filter-presets/${presetId}/use`, {
        method: "POST",
      })
        .then(() => {
          setFilterPresets((prev) =>
            prev.map((p) => (p.id === presetId ? { ...p, usageCount: p.usageCount + 1 } : p))
          );
        })
        .catch(() => {
          // Silently fail - usage tracking is not critical
        });
    } catch (error: any) {
      showError("Error", error.message || "Failed to apply preset");
    }
  };

  const deleteFilterPreset = async (presetId: string) => {
    if (!window.confirm("Are you sure you want to delete this filter preset?")) return;

    try {
      await makeAuthenticatedRequest(`/api/auth/filter-presets/${presetId}`, {
        method: "DELETE",
      });

      setFilterPresets((prev) => prev.filter((p) => String(p.id) !== String(presetId)));
      if (String(selectedPreset) === String(presetId)) {
        setSelectedPreset(null);
      }

      showSuccess("Success", "Filter preset deleted!");
    } catch (error: any) {
      showError("Error", error.message || "Failed to delete filter preset");
    }
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search ||
      filters.status.values.length > 0 ||
      filters.rating.min > 0 ||
      filters.rating.max < 10 ||
      !filters.rating.includeUnrated ||
      filters.tags.values.length > 0 ||
      filters.dateRange.start ||
      filters.dateRange.end ||
      filters.mediaType.values.length > 0 ||
      filters.rewatchCount.min > 0 ||
      filters.rewatchCount.max < 100
    );
  }, [filters]);

  return (
    <div className="advanced-filter-bar">
      {/* Filter Summary */}
      <div className="filter-summary">
        <div className="filter-results">
          <span className="results-count">
            <strong>{filteredCount}</strong> of {itemCount} items
          </span>
          {hasActiveFilters && (
            <span className="active-filters-indicator">
              {Object.values(filters).flat().filter(Boolean).length} active
            </span>
          )}
        </div>

        <div className="filter-controls">
          <button className="expand-toggle" onClick={() => setIsExpanded(!isExpanded)}>
            <span>{isExpanded ? "Hide Filters" : "Show Filters"}</span>
            <span className={`arrow ${isExpanded ? "up" : "down"}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 10.5L3.5 6h9L8 10.5z" />
              </svg>
            </span>
          </button>

          {hasActiveFilters && (
            <button className="clear-filters" onClick={clearAllFilters}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 7.293l2.146-2.147a.5.5 0 11.708.708L8.707 8l2.147 2.146a.5.5 0 01-.708.708L8 8.707l-2.146 2.147a.5.5 0 01-.708-.708L7.293 8 5.146 5.854a.5.5 0 01.708-.708L8 7.293z" />
              </svg>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters - Always Visible */}
      <div className="quick-filters-section">
        <div className="quick-filters-grid">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              className={`quick-filter-card ${filter.isActive() ? "active" : ""} ${filter.color}`}
              onClick={filter.action}
              title={filter.description}
            >
              <span className="filter-icon">{filter.icon}</span>
              <div className="filter-content">
                <span className="filter-label">{filter.label}</span>
                <span className="filter-description">{filter.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="filter-panel">
          {/* Search Section */}
          <div className="search-section">
            <div className="search-input-wrapper">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                placeholder="Search titles, notes, tags..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="search-input-field"
              />
              {filters.search && (
                <button
                  className="clear-search"
                  onClick={() => updateFilters({ search: "" })}
                  title="Clear search"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 7.293l2.146-2.147a.5.5 0 11.708.708L8.707 8l2.147 2.146a.5.5 0 01-.708.708L8 8.707l-2.146 2.147a.5.5 0 01-.708-.708L7.293 8 5.146 5.854a.5.5 0 01.708-.708L8 7.293z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters Grid */}
          <div className="advanced-filters-grid">
            {/* Status Filter */}
            <div className="filter-card">
              <div className="filter-card-header">
                <h3>Watch Status</h3>
                <span className="filter-count">
                  {filters.status.values.length > 0 ? `${filters.status.values.length} selected` : "All"}
                </span>
              </div>
              <div className="filter-card-content">
                <div className="status-options">
                  {statusOptions.map((option) => (
                    <label key={option.value} className="status-option">
                      <input
                        type="checkbox"
                        checked={filters.status.values.includes(option.value)}
                        onChange={(e) => {
                          const values = e.target.checked
                            ? [...filters.status.values, option.value]
                            : filters.status.values.filter((v) => v !== option.value);
                          updateFilters({ status: { ...filters.status, values } });
                        }}
                      />
                      <span className="checkmark"></span>
                      <span className="option-label">{option.label}</span>
                    </label>
                  ))}
                </div>
                <div className="operator-toggle">
                  <button
                    className={`operator-btn ${filters.status.operator === "includes" ? "active" : ""}`}
                    onClick={() => updateFilters({ status: { ...filters.status, operator: "includes" } })}
                  >
                    Include
                  </button>
                  <button
                    className={`operator-btn ${filters.status.operator === "excludes" ? "active" : ""}`}
                    onClick={() => updateFilters({ status: { ...filters.status, operator: "excludes" } })}
                  >
                    Exclude
                  </button>
                </div>
              </div>
            </div>

            {/* Rating Filter */}
            <div className="filter-card">
              <div className="filter-card-header">
                <h3>Rating Range</h3>
                <span className="filter-count">
                  {filters.rating.min === 0 && filters.rating.max === 10
                    ? "All"
                    : `${filters.rating.min} - ${filters.rating.max}`}
                </span>
              </div>
              <div className="filter-card-content">
                <div className="rating-controls">
                  <div className="rating-range">
                    <div className="range-group">
                      <label>Min: {filters.rating.min}</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={filters.rating.min}
                        onChange={(e) =>
                          updateFilters({
                            rating: { ...filters.rating, min: parseFloat(e.target.value) },
                          })
                        }
                        className="range-slider"
                      />
                    </div>
                    <div className="range-group">
                      <label>Max: {filters.rating.max}</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={filters.rating.max}
                        onChange={(e) =>
                          updateFilters({
                            rating: { ...filters.rating, max: parseFloat(e.target.value) },
                          })
                        }
                        className="range-slider"
                      />
                    </div>
                  </div>
                  <label className="include-unrated-option">
                    <input
                      type="checkbox"
                      checked={filters.rating.includeUnrated}
                      onChange={(e) =>
                        updateFilters({
                          rating: { ...filters.rating, includeUnrated: e.target.checked },
                        })
                      }
                    />
                    <span className="checkmark"></span>
                    <span>Include unrated items</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="filter-card">
                <div className="filter-card-header">
                  <h3>Tags</h3>
                  <span className="filter-count">
                    {filters.tags.values.length > 0 ? `${filters.tags.values.length} selected` : "All"}
                  </span>
                </div>
                <div className="filter-card-content">
                  <div className="tags-dropdown">
                    <select
                      multiple
                      value={filters.tags.values}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, (option) => option.value);
                        updateFilters({ tags: { ...filters.tags, values } });
                      }}
                      className="tags-select"
                    >
                      {availableTags.map((tag) => (
                        <option key={tag} value={tag}>
                          #{tag}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="operator-toggle">
                    <button
                      className={`operator-btn ${filters.tags.operator === "any" ? "active" : ""}`}
                      onClick={() => updateFilters({ tags: { ...filters.tags, operator: "any" } })}
                      title="Match items with any selected tag"
                    >
                      Any
                    </button>
                    <button
                      className={`operator-btn ${filters.tags.operator === "all" ? "active" : ""}`}
                      onClick={() => updateFilters({ tags: { ...filters.tags, operator: "all" } })}
                      title="Match items with all selected tags"
                    >
                      All
                    </button>
                    <button
                      className={`operator-btn ${filters.tags.operator === "none" ? "active" : ""}`}
                      onClick={() => updateFilters({ tags: { ...filters.tags, operator: "none" } })}
                      title="Match items with none of the selected tags"
                    >
                      None
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filter Presets */}
          <div className="filter-presets">
            <div className="preset-controls">
              <label>Presets:</label>
              <select
                value={selectedPreset || ""}
                onChange={(e) => {
                  const presetId = e.target.value;
                  if (presetId) {
                    loadFilterPreset(presetId);
                  } else {
                    // Reset to no preset selected
                    setSelectedPreset(null);
                  }
                }}
                className="preset-select"
              >
                <option value="">Select a preset...</option>
                {filterPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({preset.usageCount} uses)
                  </option>
                ))}
              </select>

              <button
                className="save-preset-btn"
                onClick={() => setShowSavePreset(true)}
                disabled={!hasActiveFilters}
              >
                Save Preset
              </button>

              {selectedPreset && (
                <button className="delete-preset-btn" onClick={() => deleteFilterPreset(selectedPreset)}>
                  Delete
                </button>
              )}
            </div>

            {/* Save Preset Modal */}
            {showSavePreset && (
              <div className="save-preset-modal">
                <input
                  type="text"
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="preset-name-input"
                />
                <input
                  type="text"
                  placeholder="Description (optional)..."
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="preset-description-input"
                />
                <div className="modal-actions">
                  <button onClick={saveFilterPreset} className="save-btn">
                    Save
                  </button>
                  <button onClick={() => setShowSavePreset(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
