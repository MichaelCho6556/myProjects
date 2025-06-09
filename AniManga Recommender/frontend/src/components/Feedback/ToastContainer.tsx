import React, { useEffect, useState } from "react";
import { ToastMessage } from "./ToastProvider";
import "./Feedback.css";

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

/**
 * Toast Container Component
 * Displays and manages individual toast notifications
 */
const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

/**
 * Individual Toast Component
 */
const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Match animation duration
  };

  const getIcon = (type: ToastMessage["type"]): string => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "ℹ";
    }
  };

  const getAriaLabel = (type: ToastMessage["type"]): string => {
    switch (type) {
      case "success":
        return "Success notification";
      case "error":
        return "Error notification";
      case "warning":
        return "Warning notification";
      case "info":
        return "Information notification";
      default:
        return "Notification";
    }
  };

  return (
    <div
      className={`toast toast-${toast.type} ${isVisible ? "toast-visible" : ""} ${
        isExiting ? "toast-exiting" : ""
      }`}
      role="alert"
      aria-label={getAriaLabel(toast.type)}
    >
      <div className="toast-content">
        <div className="toast-icon" aria-hidden="true">
          {getIcon(toast.type)}
        </div>

        <div className="toast-body">
          <div className="toast-title">{toast.title}</div>
          <div className="toast-message">{toast.message}</div>

          {toast.action && (
            <button className="toast-action" onClick={toast.action.onClick} aria-label={toast.action.label}>
              {toast.action.label}
            </button>
          )}
        </div>

        <button className="toast-close" onClick={handleClose} aria-label="Close notification" type="button">
          ×
        </button>
      </div>

      {toast.duration && toast.duration > 0 && (
        <div
          className="toast-progress"
          style={{
            animationDuration: `${toast.duration}ms`,
          }}
        />
      )}
    </div>
  );
};

export default ToastContainer;
