import React from "react";
import { Link } from "react-router-dom";
import "./EmptyState.css";

interface EmptyStateProps {
  type: "new-user" | "no-recommendations" | "no-activity" | "no-lists" | "search-results" | "error";
  title: string;
  description: string;
  icon?: string;
  actionButton?: {
    text: string;
    onClick?: () => void;
    href?: string;
    variant?: "primary" | "secondary";
  };
  secondaryAction?: {
    text: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

/**
 * EmptyState Component - Comprehensive empty states for different user scenarios
 * 
 * Provides contextual empty states with helpful guidance, actions, and visual cues
 * to help users understand what to do next in various scenarios.
 * 
 * @param type - Type of empty state to determine styling and default icon
 * @param title - Main heading text
 * @param description - Descriptive text explaining the situation
 * @param icon - Custom icon/emoji (overrides type default)
 * @param actionButton - Primary action button configuration
 * @param secondaryAction - Optional secondary action
 * @param className - Additional CSS classes
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  icon,
  actionButton,
  secondaryAction,
  className = "",
}) => {
  // Default icons for different types
  const getDefaultIcon = () => {
    switch (type) {
      case "new-user":
        return "👋";
      case "no-recommendations":
        return "🎯";
      case "no-activity":
        return "📋";
      case "no-lists":
        return "📚";
      case "search-results":
        return "🔍";
      case "error":
        return "⚠️";
      default:
        return "📄";
    }
  };

  const displayIcon = icon || getDefaultIcon();

  const renderActionButton = () => {
    if (!actionButton) return null;

    const buttonClass = `empty-state-button ${actionButton.variant || "primary"}`;

    if (actionButton.href) {
      return (
        <Link to={actionButton.href} className={buttonClass}>
          {actionButton.text}
        </Link>
      );
    }

    return (
      <button onClick={actionButton.onClick} className={buttonClass}>
        {actionButton.text}
      </button>
    );
  };

  const renderSecondaryAction = () => {
    if (!secondaryAction) return null;

    if (secondaryAction.href) {
      return (
        <Link to={secondaryAction.href} className="empty-state-secondary-link">
          {secondaryAction.text}
        </Link>
      );
    }

    return (
      <button onClick={secondaryAction.onClick} className="empty-state-secondary-button">
        {secondaryAction.text}
      </button>
    );
  };

  return (
    <div className={`empty-state ${type} ${className}`}>
      <div className="empty-state-content">
        <div className="empty-state-icon">
          {displayIcon}
        </div>
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-description">{description}</p>
        
        {(actionButton || secondaryAction) && (
          <div className="empty-state-actions">
            {renderActionButton()}
            {renderSecondaryAction()}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;