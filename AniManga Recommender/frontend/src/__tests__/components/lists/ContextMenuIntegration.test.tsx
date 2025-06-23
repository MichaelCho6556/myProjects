import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SortableListItem } from "../../../components/lists/SortableListItem";
import { ToastProvider } from "../../../components/Feedback/ToastProvider";
import { ListItem } from "../../../types/social";
import { BrowserRouter } from "react-router-dom";

// Test data
const mockItem: ListItem = {
  id: "test-item-1",
  itemUid: "anime-123",
  title: "Attack on Titan",
  mediaType: "Anime",
  imageUrl: "https://example.com/image.jpg",
  order: 1,
  addedAt: new Date().toISOString(),
  notes: "Great anime series",
  personalRating: 9,
  watchStatus: "completed",
  customTags: ["action", "drama"],
};

const mockUserLists = [
  { id: "list1", name: "My Favorites", itemCount: 15 },
  { id: "list2", name: "Watch Later", itemCount: 8 },
];

// Test wrapper with all necessary providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ToastProvider>{children}</ToastProvider>
  </BrowserRouter>
);

describe("Context Menu Integration", () => {
  let mockHandlers: {
    onRemove: jest.Mock;
    onEdit: jest.Mock;
    onSave: jest.Mock;
    onCancelEdit: jest.Mock;
    onQuickRate: jest.Mock;
    onUpdateStatus: jest.Mock;
    onAddTag: jest.Mock;
    onCopyToList: jest.Mock;
  };

  beforeEach(() => {
    mockHandlers = {
      onRemove: jest.fn(),
      onEdit: jest.fn(),
      onSave: jest.fn().mockResolvedValue(undefined),
      onCancelEdit: jest.fn(),
      onQuickRate: jest.fn().mockResolvedValue(undefined),
      onUpdateStatus: jest.fn().mockResolvedValue(undefined),
      onAddTag: jest.fn().mockResolvedValue(undefined),
      onCopyToList: jest.fn().mockResolvedValue(undefined),
    };
  });

  const renderComponent = () =>
    render(
      <TestWrapper>
        <SortableListItem item={mockItem} index={0} {...mockHandlers} userLists={mockUserLists} />
      </TestWrapper>
    );

  it("opens context menu on right-click", async () => {
    renderComponent();
    const listItem = screen.getByRole("listitem");

    // Right-click to open context menu
    fireEvent.contextMenu(listItem);

    // Check if context menu actions are visible
    await waitFor(() => {
      expect(screen.getByText("Edit Notes & Rating")).toBeInTheDocument();
      expect(screen.getByText("Quick Rate")).toBeInTheDocument();
      expect(screen.getByText("Update Status")).toBeInTheDocument();
      expect(screen.getByText("Quick Add Tag")).toBeInTheDocument();
      expect(screen.getByText("View Item Details")).toBeInTheDocument();
      expect(screen.getByText("Share Item")).toBeInTheDocument();
      expect(screen.getByText("Remove from List")).toBeInTheDocument();
    });
  });

  it("calls edit handler when Edit action is clicked", async () => {
    renderComponent();
    const listItem = screen.getByRole("listitem");

    fireEvent.contextMenu(listItem);

    await waitFor(() => {
      const editAction = screen.getByText("Edit Notes & Rating");
      fireEvent.click(editAction);
    });

    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockItem);
  });

  it("handles quick rating functionality", async () => {
    renderComponent();
    const listItem = screen.getByRole("listitem");

    fireEvent.contextMenu(listItem);

    await waitFor(() => {
      const quickRateAction = screen.getByText("Quick Rate");
      fireEvent.click(quickRateAction);
    });

    // Should expand to show star rating options
    await waitFor(() => {
      const stars = screen.getAllByTitle(/Rate \d\/10/);
      expect(stars).toHaveLength(10);
    });

    // Click on a star rating
    const ratingStar = screen.getByTitle("Rate 8/10");
    fireEvent.click(ratingStar);

    expect(mockHandlers.onQuickRate).toHaveBeenCalledWith("test-item-1", 8);
  });

  it("handles tag addition functionality", async () => {
    renderComponent();
    const listItem = screen.getByRole("listitem");

    fireEvent.contextMenu(listItem);

    await waitFor(() => {
      const addTagAction = screen.getByText("Quick Add Tag");
      fireEvent.click(addTagAction);
    });

    // Should show tag input
    await waitFor(() => {
      const tagInput = screen.getByPlaceholderText(/add tag/i);
      expect(tagInput).toBeInTheDocument();
    });

    // Type a tag and submit
    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await userEvent.type(tagInput, "test-tag{enter}");

    expect(mockHandlers.onAddTag).toHaveBeenCalledWith("test-item-1", "test-tag");
  });

  it("shows copy to list options when user lists are provided", async () => {
    renderComponent();
    const listItem = screen.getByRole("listitem");

    fireEvent.contextMenu(listItem);

    await waitFor(() => {
      // Should show first 3 lists as separate options with "items" label
      expect(screen.getByText('Copy to "My Favorites" (15 items)')).toBeInTheDocument();
      expect(screen.getByText('Copy to "Watch Later" (8 items)')).toBeInTheDocument();
    });

    // Click on first list option
    const copyAction = screen.getByText('Copy to "My Favorites" (15 items)');
    fireEvent.click(copyAction);

    expect(mockHandlers.onCopyToList).toHaveBeenCalledWith("test-item-1", "list1");
  });

  it("does not show copy to list options when no user lists provided", async () => {
    render(
      <TestWrapper>
        <SortableListItem item={mockItem} index={0} {...mockHandlers} userLists={[]} />
      </TestWrapper>
    );

    const listItem = screen.getByRole("listitem");

    fireEvent.contextMenu(listItem);

    await waitFor(() => {
      // Should not show any copy to list options
      expect(screen.queryByText(/Copy to/)).not.toBeInTheDocument();
      // Should still show other context menu options
      expect(screen.getByText("Edit Notes & Rating")).toBeInTheDocument();
      expect(screen.getByText("View Item Details")).toBeInTheDocument();
    });
  });

  it("handles keyboard navigation", async () => {
    renderComponent();
    const listItem = screen.getByRole("listitem");

    // Focus the item and open context menu with keyboard
    listItem.focus();
    fireEvent.keyDown(listItem, { key: "ContextMenu" });

    await waitFor(() => {
      expect(screen.getByText("Edit Notes & Rating")).toBeInTheDocument();
    });

    // Navigate with arrow keys
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "Enter" });

    // Should trigger the focused action
    expect(mockHandlers.onEdit).toHaveBeenCalled();
  });

  it("closes context menu on escape key", async () => {
    renderComponent();
    const listItem = screen.getByRole("listitem");

    fireEvent.contextMenu(listItem);

    await waitFor(() => {
      expect(screen.getByText("Edit Notes & Rating")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("Edit Notes & Rating")).not.toBeInTheDocument();
    });
  });

  it("shows confirmation dialog for remove action", async () => {
    renderComponent();
    const listItem = screen.getByRole("listitem");

    fireEvent.contextMenu(listItem);

    await waitFor(() => {
      const removeAction = screen.getByText("Remove from List");
      fireEvent.click(removeAction);
    });

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText("Remove Item")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to remove/)).toBeInTheDocument();
    });

    // Confirm removal
    const confirmButton = screen.getByText("Remove");
    fireEvent.click(confirmButton);

    expect(mockHandlers.onRemove).toHaveBeenCalledWith("test-item-1");
  });
});
