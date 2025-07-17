import React, { useState, useEffect } from "react";
import "./CollapsibleSection.css";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * CollapsibleSection Component - Reusable collapsible container with localStorage persistence
 * 
 * Features:
 * - Collapse/expand with smooth animations
 * - localStorage persistence per section ID
 * - Optional refresh functionality
 * - Loading states with spinner
 * - Customizable styling
 * 
 * @param id - Unique identifier for localStorage persistence
 * @param title - Section header title
 * @param icon - Optional emoji/icon for header
 * @param children - Section content
 * @param defaultCollapsed - Initial collapse state if no localStorage value
 * @param showRefreshButton - Show refresh button in header
 * @param onRefresh - Callback for refresh button click
 * @param isLoading - Loading state for refresh button
 * @param className - Additional CSS classes
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  icon,
  children,
  defaultCollapsed = false,
  showRefreshButton = false,
  onRefresh,
  isLoading = false,
  className = "",
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load saved state from localStorage
    const saved = localStorage.getItem(`collapsible_${id}`);
    return saved !== null ? JSON.parse(saved) : defaultCollapsed;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`collapsible_${id}`, JSON.stringify(isCollapsed));
  }, [id, isCollapsed]);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering collapse toggle
    if (onRefresh && !isLoading) {
      onRefresh();
    }
  };

  return (
    <div className={`collapsible-section ${className} ${isCollapsed ? "collapsed" : "expanded"}`}>
      <div className="collapsible-header" onClick={toggleCollapsed}>
        <div className="header-left">
          {icon && <span className="section-icon">{icon}</span>}
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="header-right">
          {showRefreshButton && (
            <button
              className={`refresh-btn ${isLoading ? "loading" : ""}`}
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh section"
            >
              {isLoading ? "⟳" : "🔄"}
            </button>
          )}
          <button className="collapse-btn" title={isCollapsed ? "Expand section" : "Collapse section"}>
            <span className={`chevron ${isCollapsed ? "down" : "up"}`}>▼</span>
          </button>
        </div>
      </div>
      
      <div className={`collapsible-content ${isCollapsed ? "collapsed" : "expanded"}`}>
        <div className="content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;