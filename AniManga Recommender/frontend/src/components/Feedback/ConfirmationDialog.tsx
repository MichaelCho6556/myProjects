import React, { useEffect, useRef } from "react";
import "./Feedback.css";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
  className?: string;
}

/**
 * Confirmation Dialog Component
 * Prevents accidental destructive actions with user confirmation
 */
const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "warning",
  className = "",
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onCancel();
          break;
        case "Enter":
          event.preventDefault();
          onConfirm();
          break;
        case "Tab":
          // Trap focus within dialog
          if (dialogRef.current) {
            const focusableElements = dialogRef.current.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (event.shiftKey && document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const getIcon = (variant: string): string => {
    switch (variant) {
      case "danger":
        return "⚠️";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "⚠️";
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="confirmation-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
    >
      <div
        ref={dialogRef}
        className={`confirmation-dialog confirmation-${variant} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirmation-header">
          <div className="confirmation-icon" aria-hidden="true">
            {getIcon(variant)}
          </div>
          <h3 id="confirmation-title" className="confirmation-title">
            {title}
          </h3>
        </div>

        <div className="confirmation-body">
          <p id="confirmation-message" className="confirmation-message">
            {message}
          </p>
        </div>

        <div className="confirmation-actions">
          <button className="btn btn-secondary" onClick={onCancel} type="button">
            {cancelText}
          </button>

          <button ref={confirmButtonRef} className={`btn btn-${variant}`} onClick={onConfirm} type="button">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
