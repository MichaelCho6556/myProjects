import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import ToastContainer from "../Feedback/ToastContainer";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

/**
 * Toast Provider Component
 * Manages toast notifications throughout the application
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  defaultDuration = 4000,
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));

    // Clear timeout if exists
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const duration = toast.duration ?? defaultDuration;

      const newToast: ToastMessage = {
        ...toast,
        id,
        duration,
      };

      setToasts((prev) => {
        // Remove oldest toast if at max capacity
        const updatedToasts = prev.length >= maxToasts ? prev.slice(1) : prev;
        return [...updatedToasts, newToast];
      });

      // Auto-remove toast after duration (if not persistent)
      if (duration > 0) {
        const timeout = setTimeout(() => {
          removeToast(id);
        }, duration);

        timeoutRefs.current.set(id, timeout);
      }
    },
    [defaultDuration, maxToasts, removeToast]
  );

  const clearAllToasts = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    timeoutRefs.current.clear();

    // Clear all toasts
    setToasts([]);
  }, []);

  const contextValue: ToastContextValue = {
    addToast,
    removeToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * Hook to use toast notifications
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};

/**
 * Convenience hook with pre-configured toast methods
 */
export const useToastActions = () => {
  const { addToast } = useToast();

  return {
    success: (title: string, message: string, action?: ToastMessage["action"]) => {
      const toast: Omit<ToastMessage, "id"> = { type: "success", title, message };
      if (action) toast.action = action;
      addToast(toast);
    },

    error: (title: string, message: string, action?: ToastMessage["action"]) => {
      const toast: Omit<ToastMessage, "id"> = { type: "error", title, message, duration: 6000 };
      if (action) toast.action = action;
      addToast(toast);
    },

    warning: (title: string, message: string, action?: ToastMessage["action"]) => {
      const toast: Omit<ToastMessage, "id"> = { type: "warning", title, message, duration: 5000 };
      if (action) toast.action = action;
      addToast(toast);
    },

    info: (title: string, message: string, action?: ToastMessage["action"]) => {
      const toast: Omit<ToastMessage, "id"> = { type: "info", title, message };
      if (action) toast.action = action;
      addToast(toast);
    },
  };
};
