/**
 * RecommendationSectionComponent
 *
 * Individual recommendation section component that displays a collapsible section
 * containing recommendation cards. Handles section-specific interactions and state.
 *
 * Features:
 * - Collapsible section with smooth animations
 * - Grid layout for recommendation cards
 * - Section-specific feedback handling
 * - Responsive design
 *
 * @component
 */

import React from "react";
import { RecommendationSection, RecommendationFeedback } from "../../types";
import RecommendationCard from "./RecommendationCard";

interface RecommendationSectionComponentProps {
  section: RecommendationSection;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFeedback: (feedback: RecommendationFeedback) => Promise<void>;
  onAddToList: (itemUid: string, status: string, sectionType: string) => Promise<void>;
}

const RecommendationSectionComponent: React.FC<RecommendationSectionComponentProps> = ({
  section,
  isCollapsed,
  onToggleCollapse,
  onFeedback,
  onAddToList,
}) => {
  // Don't render if no items
  if (!section.items || section.items.length === 0) {
    return null;
  }

  const sectionIcons = {
    based_on_completed: "🎯",
    trending_genres: "📈",
    hidden_gems: "💎",
  };

  const icon = sectionIcons[section.section_type] || "🎯";

  return (
    <div className="recommendation-section">
      <div className="recommendation-header">
        <button
          className="section-toggle-btn"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${section.title}`}
        >
          <span className="section-icon">{icon}</span>
          <div className="section-title-group">
            <h3 className="section-title">{section.title}</h3>
            <p className="section-subtitle">{section.subtitle}</p>
          </div>
          <span className={`collapse-indicator ${isCollapsed ? "collapsed" : "expanded"}`}>
            {isCollapsed ? "▼" : "▲"}
          </span>
        </button>
      </div>

      {section.reasoning && !isCollapsed && (
        <div className="recommendation-reasoning">
          <p>{section.reasoning}</p>
        </div>
      )}

      <div className={`recommendation-content ${isCollapsed ? "collapsed" : "expanded"}`}>
        {!isCollapsed && (
          <div className="recommendation-grid">
            {section.items.map((item) => (
              <RecommendationCard
                key={item.uid}
                item={item}
                sectionType={section.section_type}
                onFeedback={onFeedback}
                onAddToList={onAddToList}
              />
            ))}
          </div>
        )}
      </div>

      <div className="section-stats">
        <p className="items-count">
          {section.items.length} recommendation{section.items.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};

export default React.memo(RecommendationSectionComponent);
