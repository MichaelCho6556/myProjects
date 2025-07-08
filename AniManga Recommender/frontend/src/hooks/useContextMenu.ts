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
  menuRef: React.RefObject<HTMLElement>;
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
  const menuRef = useRef<HTMLElement>(null);

  const calculatePosition = useCallback((clickX: number, clickY: number): { x: number; y: number } => {
    // Use actual menu dimensions if available, otherwise use reasonable defaults
    const menuWidth = menuRef.current?.offsetWidth || 280;
    const menuHeight = menuRef.current?.offsetHeight || 400;
    const EDGE_MARGIN = 10;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = clickX;
    let y = clickY;

    // Adjust for right edge overflow
    if (x + menuWidth > viewportWidth) {
      x = Math.max(EDGE_MARGIN, viewportWidth - menuWidth - EDGE_MARGIN);
    }

    // Smart vertical positioning - prefer showing menu above cursor if not enough space below
    const spaceBelow = viewportHeight - clickY;
    const spaceAbove = clickY;

    if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
      // Show menu above the cursor
      y = Math.max(EDGE_MARGIN, clickY - menuHeight);
    } else if (y + menuHeight > viewportHeight) {
      // Not enough space above either, position at bottom with margin
      y = Math.max(EDGE_MARGIN, viewportHeight - menuHeight - EDGE_MARGIN);
    }

    // Ensure minimum distance from edges
    x = Math.max(EDGE_MARGIN, Math.min(x, viewportWidth - menuWidth - EDGE_MARGIN));
    y = Math.max(EDGE_MARGIN, Math.min(y, viewportHeight - menuHeight - EDGE_MARGIN));

    const finalPosition = { x: x, y: y };

    return finalPosition;
  }, []);

  const openContextMenu = useCallback(
    (position: ContextMenuPosition, itemId?: string) => {
      // Always close any existing menu first to ensure only one menu is open at a time
      if (menuState.isOpen) {
        setMenuState({
          isOpen: false,
          position: null,
          activeItemId: null,
        });
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const calculatedPosition = position.keyboard ? position : calculatePosition(position.x, position.y);

      // Use a small delay to ensure the previous menu is fully closed before opening the new one
      timeoutRef.current = window.setTimeout(() => {
        setMenuState({
          isOpen: true,
          position: { ...position, ...calculatedPosition },
          activeItemId: itemId || null,
        });
      }, 10);
    },
    [calculatePosition, menuState.isOpen]
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
      const position = {
        x: e.clientX,
        y: e.clientY,
        itemRect: rect,
      };

      openContextMenu(position, itemId);
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
      // Ignore right-click events (button 2) - they should only open context menus, not close them
      if (event.button === 2) {
        return;
      }

      const target = event.target as Node;

      // Don't close if clicking within the context menu
      if (menuRef.current && menuRef.current.contains(target)) {
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
    menuRef,
    openContextMenu,
    closeContextMenu,
    handleContextMenu,
    handleKeyboardMenu,
  };
};
