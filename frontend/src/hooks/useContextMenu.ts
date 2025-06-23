import React, { useState, useCallback, useEffect, useRef } from "react";

export interface ContextMenuPosition {
  x: number;
  y: number;
  keyboard?: boolean;
  itemRect?: DOMRect;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: ContextMenuPosition | null;
  activeItemId: string | null;
}

export interface UseContextMenuReturn {
  isContextMenuOpen: boolean;
  contextMenuPosition: ContextMenuPosition | null;
  activeItemId: string | null;
  openContextMenu: (position: ContextMenuPosition, itemId?: string) => void;
  closeContextMenu: () => void;
  handleContextMenu: (e: React.MouseEvent, itemId?: string) => void;
  handleKeyboardMenu: (e: React.KeyboardEvent, itemId?: string) => void;
}

export const useContextMenu = (): UseContextMenuReturn => {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    isOpen: false,
    position: null,
    activeItemId: null,
  });

  const timeoutRef = useRef<number | null>(null);

  const calculatePosition = useCallback(
    (
      clickX: number,
      clickY: number,
      menuWidth: number = 280,
      menuHeight: number = 400
    ): { x: number; y: number } => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      let x = clickX;
      let y = clickY;

      // Adjust for right edge overflow
      if (x + menuWidth > viewportWidth) {
        x = Math.max(10, viewportWidth - menuWidth - 10);
      }

      // Adjust for bottom edge overflow
      if (y + menuHeight > viewportHeight) {
        y = Math.max(10, viewportHeight - menuHeight - 10);
      }

      // Ensure minimum distance from edges
      x = Math.max(10, Math.min(x, viewportWidth - menuWidth - 10));
      y = Math.max(10, Math.min(y, viewportHeight - menuHeight - 10));

      return { x: x + scrollX, y: y + scrollY };
    },
    []
  );

  const openContextMenu = useCallback(
    (position: ContextMenuPosition, itemId?: string) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const calculatedPosition = position.keyboard ? position : calculatePosition(position.x, position.y);

      setMenuState({
        isOpen: true,
        position: { ...position, ...calculatedPosition },
        activeItemId: itemId || null,
      });
    },
    [calculatePosition]
  );

  const closeContextMenu = useCallback(() => {
    setMenuState({
      isOpen: false,
      position: null,
      activeItemId: null,
    });

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, itemId?: string) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      openContextMenu(
        {
          x: e.clientX,
          y: e.clientY,
          itemRect: rect,
        },
        itemId
      );
    },
    [openContextMenu]
  );

  const handleKeyboardMenu = useCallback(
    (e: React.KeyboardEvent, itemId?: string) => {
      if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        openContextMenu(
          {
            x: centerX,
            y: centerY,
            keyboard: true,
            itemRect: rect,
          },
          itemId
        );
      }
    },
    [openContextMenu]
  );

  // Close context menu on outside click, escape key, or scroll
  useEffect(() => {
    if (!menuState.isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Don't close if clicking within the context menu
      if (target.closest(".context-menu")) {
        return;
      }

      closeContextMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    const handleScroll = () => {
      closeContextMenu();
    };

    const handleResize = () => {
      closeContextMenu();
    };

    // Small delay to prevent immediate closing when menu opens
    timeoutRef.current = window.setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
    }, 10);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [menuState.isOpen, closeContextMenu]);

  return {
    isContextMenuOpen: menuState.isOpen,
    contextMenuPosition: menuState.position,
    activeItemId: menuState.activeItemId,
    openContextMenu,
    closeContextMenu,
    handleContextMenu,
    handleKeyboardMenu,
  };
};
