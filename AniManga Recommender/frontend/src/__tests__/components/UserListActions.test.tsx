/**
 * Comprehensive UserListActions Component Tests for AniManga Recommender
 * Phase B3: User List Management Testing
 *
 * Test Coverage:
 * - Component rendering and initial state
 * - Status selection and updates
 * - Progress tracking and validation
 * - Rating system functionality
 * - Notes and additional data handling
 * - User authentication requirements
 * - API interaction and error handling
 * - Bulk operations and edge cases
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserListActions from "../../components/UserListActions";
import { useAuth } from "../../context/AuthContext";
import { AnimeItem } from "../../types";

// Mock the auth context
jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock the authenticated API hook
jest.mock("../../hooks/useAuthenticatedApi", () => ({
  useAuthenticatedApi: jest.fn(),
}));

// Mock data - Create valid AnimeItem for testing
const mockAnimeItem: AnimeItem = {
  uid: "anime_123",
  title: "Attack on Titan",
  media_type: "anime",
  genres: ["Action", "Drama"],
  themes: ["Military"],
  demographics: ["Shounen"],
  score: 9.0,
  scored_by: 1500000,
  status: "Finished Airing",
  episodes: 25,
  start_date: "2013-04-07",
  popularity: 1,
  members: 3000000,
  favorites: 200000,
  synopsis: "Epic anime about titans",
  producers: ["Studio WIT"],
  licensors: ["Funimation"],
  studios: ["Studio WIT"],
  authors: [],
  serializations: [],
  title_synonyms: [],
  image_url: "https://example.com/aot.jpg",
};

const mockMangaItem: AnimeItem = {
  uid: "manga_456",
  title: "One Piece",
  media_type: "manga",
  genres: ["Adventure", "Comedy"],
  themes: ["Pirates"],
  demographics: ["Shounen"],
  score: 9.2,
  scored_by: 800000,
  status: "Publishing",
  chapters: 1000,
  start_date: "1997-07-22",
  popularity: 2,
  members: 1500000,
  favorites: 150000,
  synopsis: "Pirates adventure manga",
  producers: [],
  licensors: [],
  studios: [],
  authors: ["Eiichiro Oda"],
  serializations: ["Weekly Shounen Jump"],
  title_synonyms: [],
  image_url: "https://example.com/op.jpg",
};

// Mock user context
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  user_metadata: { full_name: "Test User" },
};

describe("UserListActions Component", () => {
  const mockOnStatusUpdate = jest.fn();
  const mockGetUserItems = jest.fn();
  const mockUpdateUserItemStatus = jest.fn();
  const mockRemoveUserItem = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    mockOnStatusUpdate.mockClear();
    mockGetUserItems.mockClear();
    mockUpdateUserItemStatus.mockClear();
    mockRemoveUserItem.mockClear();

    // Mock the auth context
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      loading: false,
    });

    // Mock the authenticated API hook
    const { useAuthenticatedApi } = require("../../hooks/useAuthenticatedApi");
    (useAuthenticatedApi as jest.Mock).mockReturnValue({
      getUserItems: mockGetUserItems,
      updateUserItemStatus: mockUpdateUserItemStatus,
      removeUserItem: mockRemoveUserItem,
    });
  });

  describe("Rendering and Initial State", () => {
    test("renders component for authenticated user", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Add to List")).toBeInTheDocument();
      });
    });

    test("renders login prompt for unauthenticated user", () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        loading: false,
      });

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      expect(screen.getByText("Sign in to add this to your list")).toBeInTheDocument();
    });

    test("displays loading state during initialization", async () => {
      mockGetUserItems.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 100)));

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      // Should show loading initially
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    test("loads existing user item data", async () => {
      const existingUserItem = {
        item_uid: "anime_123",
        status: "watching",
        progress: 12,
        rating: 4,
        notes: "Great anime!",
      };

      mockGetUserItems.mockResolvedValue([existingUserItem]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        // Component shows display mode by default, not edit mode
        expect(screen.getByText("Watching")).toBeInTheDocument();
        expect(screen.getByText("12 / 25 episodes")).toBeInTheDocument();
        expect(screen.getByText("⭐ 4.0/10")).toBeInTheDocument();
        expect(screen.getByText("Edit")).toBeInTheDocument();
      });
    });
  });

  describe("Status Selection and Updates", () => {
    test("displays all status options", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Plan to Watch")).toBeInTheDocument();
        expect(screen.getByText("Watching")).toBeInTheDocument();
        expect(screen.getByText("Completed")).toBeInTheDocument();
        expect(screen.getByText("On Hold")).toBeInTheDocument();
        expect(screen.getByText("Dropped")).toBeInTheDocument();
      });
    });

    test("handles status change selection", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const statusSelect = screen.getByRole("combobox");
        fireEvent.change(statusSelect, { target: { value: "watching" } });
        expect(statusSelect).toHaveValue("watching");
      });
    });

    test("auto-sets progress to max when status is completed", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const statusSelect = screen.getByRole("combobox");
        fireEvent.change(statusSelect, { target: { value: "completed" } });

        // Should auto-set progress to episodes count (25)
        const progressInput = screen.getByLabelText(/Episodes watched/);
        expect(progressInput).toHaveValue(25);
      });
    });

    test("calls API and updates status successfully", async () => {
      mockGetUserItems.mockResolvedValue([]);
      mockUpdateUserItemStatus.mockResolvedValue({ success: true });

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const statusSelect = screen.getByRole("combobox");
        fireEvent.change(statusSelect, { target: { value: "watching" } });
      });

      const updateButton = screen.getByText("Add to List");
      await userEvent.click(updateButton);

      expect(mockUpdateUserItemStatus).toHaveBeenCalledWith("anime_123", {
        status: "watching",
        progress: 0,
      });
    });
  });

  describe("Progress Tracking", () => {
    test("displays correct progress label for anime", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Episodes watched/)).toBeInTheDocument();
      });
    });

    test("displays correct progress label for manga", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockMangaItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Chapters read/)).toBeInTheDocument();
      });
    });

    test("validates progress input within limits", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const progressInput = screen.getByLabelText(/Episodes watched/);

        // Try to set progress above max episodes
        fireEvent.change(progressInput, { target: { value: "30" } });
        expect(progressInput).toHaveValue(25); // Should be clamped to max episodes
      });
    });

    test("handles negative progress gracefully", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const progressInput = screen.getByLabelText(/Episodes watched/);
        fireEvent.change(progressInput, { target: { value: "-5" } });
        expect(progressInput).toHaveValue(0); // Should be clamped to 0
      });
    });

    test("updates progress correctly", async () => {
      mockGetUserItems.mockResolvedValue([]);
      mockUpdateUserItemStatus.mockResolvedValue({ success: true });

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const progressInput = screen.getByLabelText(/Episodes watched/);
        fireEvent.change(progressInput, { target: { value: "12" } });
      });

      const updateButton = screen.getByText("Add to List");
      await userEvent.click(updateButton);

      expect(mockUpdateUserItemStatus).toHaveBeenCalledWith("anime_123", {
        status: "plan_to_watch",
        progress: 12,
      });
    });
  });

  describe("Rating System", () => {
    test("displays rating input", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Rating \(0\.0 - 10\.0, optional\)/)).toBeInTheDocument();
      });
    });

    test("validates rating within 0-10 range", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByLabelText(/Rating \(0\.0 - 10\.0, optional\)/)).toBeInTheDocument();
      });

      const ratingInput = screen.getByLabelText(/Rating \(0\.0 - 10\.0, optional\)/) as HTMLInputElement;

      // Test invalid high rating - should be rejected
      fireEvent.change(ratingInput, { target: { value: "15" } });
      expect(ratingInput.value).toBe(""); // Should remain empty since 15 > 10

      // Test valid rating - should be accepted
      fireEvent.change(ratingInput, { target: { value: "8.5" } });
      expect(ratingInput.value).toBe("8.5");
    });

    test("handles decimal ratings correctly", async () => {
      mockGetUserItems.mockResolvedValue([]);
      mockUpdateUserItemStatus.mockResolvedValue({ success: true });

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const ratingInput = screen.getByLabelText(/Rating \(0\.0 - 10\.0, optional\)/);
        fireEvent.change(ratingInput, { target: { value: "8.7" } });
      });

      const updateButton = screen.getByText("Add to List");
      await userEvent.click(updateButton);

      expect(mockUpdateUserItemStatus).toHaveBeenCalledWith("anime_123", {
        status: "plan_to_watch",
        progress: 0,
        rating: 8.7,
      });
    });

    test("handles empty rating (optional)", async () => {
      mockGetUserItems.mockResolvedValue([]);
      mockUpdateUserItemStatus.mockResolvedValue({ success: true });

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const ratingInput = screen.getByLabelText(/Rating \(0\.0 - 10\.0, optional\)/);
        fireEvent.change(ratingInput, { target: { value: "" } });
      });

      const updateButton = screen.getByText("Add to List");
      await userEvent.click(updateButton);

      expect(mockUpdateUserItemStatus).toHaveBeenCalledWith("anime_123", {
        status: "plan_to_watch",
        progress: 0,
      });
    });
  });

  describe("Notes and Additional Data", () => {
    test("displays notes textarea", async () => {
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
      });
    });

    test("handles notes input and update", async () => {
      mockGetUserItems.mockResolvedValue([]);
      mockUpdateUserItemStatus.mockResolvedValue({ success: true });

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const notesInput = screen.getByLabelText(/Notes/);
        fireEvent.change(notesInput, { target: { value: "This anime is amazing!" } });
      });

      const updateButton = screen.getByText("Add to List");
      await userEvent.click(updateButton);

      expect(mockUpdateUserItemStatus).toHaveBeenCalledWith("anime_123", {
        status: "plan_to_watch",
        progress: 0,
        notes: "This anime is amazing!",
      });
    });

    test("includes completion date for completed status", async () => {
      mockGetUserItems.mockResolvedValue([]);
      mockUpdateUserItemStatus.mockResolvedValue({ success: true });

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const statusSelect = screen.getByRole("combobox");
        fireEvent.change(statusSelect, { target: { value: "completed" } });
      });

      const updateButton = screen.getByText("Add to List");
      await userEvent.click(updateButton);

      expect(mockUpdateUserItemStatus).toHaveBeenCalledWith(
        "anime_123",
        expect.objectContaining({
          status: "completed",
          completion_date: expect.any(String),
        })
      );
    });
  });

  describe("Remove from List Functionality", () => {
    test("shows remove button for items in list", async () => {
      const existingUserItem = {
        item_uid: "anime_123",
        status: "watching",
        progress: 12,
      };

      mockGetUserItems.mockResolvedValue([existingUserItem]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Remove")).toBeInTheDocument();
      });
    });

    test("handles remove confirmation dialog", async () => {
      const existingUserItem = {
        item_uid: "anime_123",
        status: "watching",
      };

      mockGetUserItems.mockResolvedValue([existingUserItem]);

      // Mock window.confirm
      window.confirm = jest.fn(() => false);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const removeButton = screen.getByText("Remove");
        userEvent.click(removeButton);
      });

      expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to remove this from your list?");
    });

    test("removes item when confirmed", async () => {
      const existingUserItem = {
        item_uid: "anime_123",
        status: "watching",
      };

      mockGetUserItems.mockResolvedValue([existingUserItem]);
      mockRemoveUserItem.mockResolvedValue({ success: true });

      window.confirm = jest.fn(() => true);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const removeButton = screen.getByText("Remove");
        userEvent.click(removeButton);
      });

      expect(mockRemoveUserItem).toHaveBeenCalledWith("anime_123");
    });
  });

  describe("Error Handling", () => {
    test("displays error when API call fails", async () => {
      mockGetUserItems.mockRejectedValue(new Error("Network error"));

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load your list status/)).toBeInTheDocument();
      });
    });

    test("displays error when update fails", async () => {
      mockGetUserItems.mockResolvedValue([]);
      mockUpdateUserItemStatus.mockRejectedValue(new Error("Update failed"));

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const updateButton = screen.getByText("Add to List");
        userEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Update failed")).toBeInTheDocument();
      });
    });

    test("handles missing item data gracefully", async () => {
      const { episodes, ...itemWithoutEpisodes } = mockAnimeItem; // Remove episodes property completely
      mockGetUserItems.mockResolvedValue([]);

      render(<UserListActions item={itemWithoutEpisodes as AnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByText("Add to List")).toBeInTheDocument();
      });
    });
  });

  describe("Dashboard Refresh Integration", () => {
    test("triggers dashboard refresh on successful update", async () => {
      mockGetUserItems.mockResolvedValue([]);
      mockUpdateUserItemStatus.mockResolvedValue({ success: true });

      const storageSpy = jest.spyOn(Storage.prototype, "setItem");
      const eventSpy = jest.spyOn(window, "dispatchEvent");

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const updateButton = screen.getByText("Add to List");
        userEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(storageSpy).toHaveBeenCalledWith("animanga_list_updated", expect.any(String));
        expect(eventSpy).toHaveBeenCalledWith(expect.any(StorageEvent));
      });

      storageSpy.mockRestore();
      eventSpy.mockRestore();
    });

    test("calls onStatusUpdate callback after successful update", async () => {
      mockGetUserItems.mockResolvedValue([]);
      mockUpdateUserItemStatus.mockResolvedValue({ success: true });

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const updateButton = screen.getByText("Add to List");
        userEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(mockOnStatusUpdate).toHaveBeenCalled();
      });
    });
  });

  describe("Edit Mode Toggle", () => {
    test("toggles between view and edit modes", async () => {
      const existingUserItem = {
        item_uid: "anime_123",
        status: "watching",
        progress: 12,
      };

      mockGetUserItems.mockResolvedValue([existingUserItem]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const editButton = screen.getByText("Edit");
        userEvent.click(editButton);

        // Should show form inputs in edit mode
        expect(screen.getByRole("combobox")).toBeInTheDocument();
        expect(screen.getByText("Update")).toBeInTheDocument();
      });
    });

    test("cancels edit mode without saving changes", async () => {
      const existingUserItem = {
        item_uid: "anime_123",
        status: "watching",
        progress: 12,
      };

      mockGetUserItems.mockResolvedValue([existingUserItem]);

      render(<UserListActions item={mockAnimeItem} onStatusUpdate={mockOnStatusUpdate} />);

      await waitFor(() => {
        const editButton = screen.getByText("Edit");
        userEvent.click(editButton);

        const cancelButton = screen.getByText("Cancel");
        userEvent.click(cancelButton);

        // Should return to view mode
        expect(screen.getByText("Edit")).toBeInTheDocument();
      });
    });
  });
});
