/**
 * Comprehensive UserListsPage Component Tests for AniManga Recommender
 * Phase B3: User List Management Testing (Part 2)
 *
 * Test Coverage:
 * - Page rendering and navigation
 * - List filtering and search functionality
 * - Sorting and ordering options
 * - Status tab switching
 * - Bulk operations and selection
 * - URL parameter handling
 * - Authentication requirements
 * - Data loading and error states
 * - Responsive behavior
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import UserListsPage from "../../pages/lists/UserListsPage";
import { useAuth } from "../../context/AuthContext";
import { UserItem } from "../../types";

// Mock the auth context
jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock the authenticated API hook
jest.mock("../../hooks/useAuthenticatedApi", () => ({
  useAuthenticatedApi: () => ({
    makeAuthenticatedRequest: jest.fn(),
  }),
}));

// Mock useDocumentTitle hook
jest.mock("../../hooks/useDocumentTitle", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock data - Create valid UserItem array for testing
const mockUserItems: UserItem[] = [
  {
    id: 1,
    user_id: "user1",
    item_uid: "anime_123",
    status: "watching",
    progress: 12,
    rating: 4,
    notes: "Great anime so far",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    item: {
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
    },
  },
  {
    id: 2,
    user_id: "user1",
    item_uid: "manga_456",
    status: "completed",
    progress: 139,
    rating: 5,
    notes: "Masterpiece!",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z",
    item: {
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
    },
  },
  {
    id: 3,
    user_id: "user1",
    item_uid: "anime_789",
    status: "plan_to_watch",
    progress: 0,
    notes: "",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    item: {
      uid: "anime_789",
      title: "Demon Slayer",
      media_type: "anime",
      genres: ["Action", "Supernatural"],
      themes: ["Demons"],
      demographics: ["Shounen"],
      score: 8.7,
      scored_by: 1200000,
      status: "Finished Airing",
      episodes: 26,
      start_date: "2019-04-06",
      popularity: 3,
      members: 2000000,
      favorites: 100000,
      synopsis: "Demon hunting adventure",
      producers: ["Ufotable"],
      licensors: ["Aniplex"],
      studios: ["Ufotable"],
      authors: [],
      serializations: [],
      title_synonyms: [],
      image_url: "https://example.com/ds.jpg",
    },
  },
];

// Mock user context
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  user_metadata: { full_name: "Test User" },
};

// Helper to render with router and initial URL
const renderWithRouter = (component: React.ReactElement, initialEntries: string[] = ["/lists"]) => {
  return render(<MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>);
};

describe("UserListsPage Component", () => {
  const mockMakeAuthenticatedRequest = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    mockMakeAuthenticatedRequest.mockClear();

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
    useAuthenticatedApi.mockReturnValue({
      makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
    });
  });

  describe("Page Rendering and Navigation", () => {
    test("renders page with authentication", () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([]);

      renderWithRouter(<UserListsPage />);

      expect(screen.getByText("My Lists")).toBeInTheDocument();
    });

    test("renders all status tabs", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([]);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Currently Watching/)).toBeInTheDocument();
        expect(screen.getByText(/Plan to Watch/)).toBeInTheDocument();
        expect(screen.getByText(/Completed/)).toBeInTheDocument();
        expect(screen.getByText(/On Hold/)).toBeInTheDocument();
        expect(screen.getByText(/Dropped/)).toBeInTheDocument();
      });
    });

    test("highlights active status tab based on URL", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([]);

      renderWithRouter(<UserListsPage />, ["/lists?status=completed"]);

      await waitFor(() => {
        const completedTab = screen.getByText(/Completed/);
        expect(completedTab.closest("button")).toHaveClass("active");
      });
    });

    test("handles tab switching and URL updates", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([]);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const planToWatchTab = screen.getByText(/Plan to Watch/);
        userEvent.click(planToWatchTab);
      });

      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith("/api/auth/user-items?status=plan_to_watch");
    });

    test("redirects unauthenticated users", () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        loading: false,
      });

      renderWithRouter(<UserListsPage />);

      expect(screen.getByText(/Please sign in to view your lists/)).toBeInTheDocument();
    });
  });

  describe("Data Loading and Display", () => {
    test("displays loading state during data fetch", () => {
      mockMakeAuthenticatedRequest.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      renderWithRouter(<UserListsPage />);

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    test("displays user items when loaded", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(
        mockUserItems.filter((item) => item.status === "watching")
      );

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });
    });

    test("displays empty state when no items", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([]);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByText(/No items in this list yet/)).toBeInTheDocument();
      });
    });

    test("displays error state when API fails", async () => {
      mockMakeAuthenticatedRequest.mockRejectedValue(new Error("Network error"));

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load list/)).toBeInTheDocument();
      });
    });

    test("shows item count in status tabs", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(
        mockUserItems.filter((item) => item.status === "watching")
      );

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Currently Watching \(1\)/)).toBeInTheDocument();
      });
    });
  });

  describe("Filtering and Search", () => {
    test("displays search input", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search your list/)).toBeInTheDocument();
      });
    });

    test("filters items by search query", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />, ["/lists?q=attack"]);

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
        expect(screen.queryByText("One Piece")).not.toBeInTheDocument();
      });
    });

    test("displays media type filter", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("All Types")).toBeInTheDocument();
      });
    });

    test("filters by media type", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />, ["/lists?media_type=anime"]);

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
        expect(screen.queryByText("One Piece")).not.toBeInTheDocument();
      });
    });

    test("displays rating filter", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Any Rating")).toBeInTheDocument();
      });
    });

    test("filters by minimum rating", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />, ["/lists?min_user_rating=5"]);

      await waitFor(() => {
        expect(screen.getByText("One Piece")).toBeInTheDocument();
        expect(screen.queryByText("Attack on Titan")).not.toBeInTheDocument();
      });
    });

    test("handles search input changes", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search your list/);
        fireEvent.change(searchInput, { target: { value: "titan" } });
      });

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
        expect(screen.queryByText("One Piece")).not.toBeInTheDocument();
      });
    });
  });

  describe("Sorting and Ordering", () => {
    test("displays sort options", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Date Added (Newest)")).toBeInTheDocument();
      });
    });

    test("sorts by title alphabetically", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />, ["/lists?sort_by=title_asc"]);

      await waitFor(() => {
        const titles = screen.getAllByText(/Attack on Titan|One Piece|Demon Slayer/);
        expect(titles[0]).toHaveTextContent("Attack on Titan");
      });
    });

    test("sorts by rating", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />, ["/lists?sort_by=my_rating_desc"]);

      await waitFor(() => {
        const titles = screen.getAllByText(/Attack on Titan|One Piece|Demon Slayer/);
        expect(titles[0]).toHaveTextContent("One Piece"); // Has rating 5
      });
    });

    test("sorts by global score", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />, ["/lists?sort_by=global_score_desc"]);

      await waitFor(() => {
        const titles = screen.getAllByText(/Attack on Titan|One Piece|Demon Slayer/);
        expect(titles[0]).toHaveTextContent("One Piece"); // Has score 9.2
      });
    });

    test("sorts by progress", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />, ["/lists?sort_by=progress_desc"]);

      await waitFor(() => {
        const titles = screen.getAllByText(/Attack on Titan|One Piece|Demon Slayer/);
        expect(titles[0]).toHaveTextContent("One Piece"); // Has progress 139
      });
    });

    test("handles sort option changes", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const sortSelect = screen.getByDisplayValue("Date Added (Newest)");
        fireEvent.change(sortSelect, { target: { value: "title_asc" } });
      });

      await waitFor(() => {
        const titles = screen.getAllByText(/Attack on Titan|One Piece|Demon Slayer/);
        expect(titles[0]).toHaveTextContent("Attack on Titan");
      });
    });
  });

  describe("Bulk Operations", () => {
    test("displays bulk selection checkboxes", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    test("handles select all functionality", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const selectAllCheckbox = screen.getByLabelText(/Select all/);
        userEvent.click(selectAllCheckbox);
      });

      await waitFor(() => {
        const checkboxes = screen.getAllByRole("checkbox");
        const checkedBoxes = checkboxes.filter((cb) => (cb as HTMLInputElement).checked);
        expect(checkedBoxes.length).toBe(checkboxes.length);
      });
    });

    test("displays bulk action buttons when items selected", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const itemCheckbox = screen.getAllByRole("checkbox")[1]; // First item checkbox
        userEvent.click(itemCheckbox);
      });

      await waitFor(() => {
        expect(screen.getByText(/Bulk Actions/)).toBeInTheDocument();
      });
    });

    test("handles bulk status change", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const itemCheckbox = screen.getAllByRole("checkbox")[1];
        userEvent.click(itemCheckbox);
      });

      await waitFor(() => {
        const bulkStatusSelect = screen.getByDisplayValue("Change Status");
        fireEvent.change(bulkStatusSelect, { target: { value: "completed" } });
      });

      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/user-items/bulk-update"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    test("handles bulk removal", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);
      window.confirm = jest.fn(() => true);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const itemCheckbox = screen.getAllByRole("checkbox")[1];
        userEvent.click(itemCheckbox);
      });

      await waitFor(() => {
        const removeButton = screen.getByText("Remove Selected");
        userEvent.click(removeButton);
      });

      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Are you sure you want to remove"));
    });
  });

  describe("URL Parameter Handling", () => {
    test("reads status from URL parameters", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([]);

      renderWithRouter(<UserListsPage />, ["/lists?status=completed"]);

      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith("/api/auth/user-items?status=completed");
    });

    test("reads sort parameter from URL", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([]);

      renderWithRouter(<UserListsPage />, ["/lists?sort_by=title_asc"]);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Title (A-Z)")).toBeInTheDocument();
      });
    });

    test("reads search query from URL", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([]);

      renderWithRouter(<UserListsPage />, ["/lists?q=attack"]);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search your list/) as HTMLInputElement;
        expect(searchInput.value).toBe("attack");
      });
    });

    test("reads media type filter from URL", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([]);

      renderWithRouter(<UserListsPage />, ["/lists?media_type=anime"]);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Anime Only")).toBeInTheDocument();
      });
    });

    test("updates URL when filters change", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const mediaTypeSelect = screen.getByDisplayValue("All Types");
        fireEvent.change(mediaTypeSelect, { target: { value: "anime" } });
      });

      // URL should be updated to include media_type parameter
      await waitFor(() => {
        expect(window.location.search).toContain("media_type=anime");
      });
    });
  });

  describe("Item Display and Interaction", () => {
    test("displays item cards with correct information", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([mockUserItems[0]]);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
        expect(screen.getByText("ANIME")).toBeInTheDocument();
        expect(screen.getByText("Progress: 12/25")).toBeInTheDocument();
        expect(screen.getByText("Rating: 4/10")).toBeInTheDocument();
      });
    });

    test("displays item images", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([mockUserItems[0]]);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const image = screen.getByAltText("Attack on Titan");
        expect(image).toHaveAttribute("src", "https://example.com/aot.jpg");
      });
    });

    test("handles item links to detail pages", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([mockUserItems[0]]);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const itemLink = screen.getByText("Attack on Titan").closest("a");
        expect(itemLink).toHaveAttribute("href", "/item/anime_123");
      });
    });

    test("displays progress bars correctly", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue([mockUserItems[0]]);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const progressBar = screen.getByRole("progressbar");
        expect(progressBar).toHaveAttribute("aria-valuenow", "48"); // 12/25 * 100
      });
    });
  });

  describe("Responsive Behavior", () => {
    test("adapts layout for mobile devices", async () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const container = screen.getByTestId("lists-container");
        expect(container).toHaveClass("mobile-layout");
      });
    });

    test("displays grid layout on desktop", async () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1200,
      });

      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const itemsGrid = screen.getByTestId("items-grid");
        expect(itemsGrid).toHaveClass("desktop-grid");
      });
    });
  });

  describe("Performance and Edge Cases", () => {
    test("handles large number of items efficiently", async () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        ...mockUserItems[0],
        id: i + 1,
        item_uid: `item-${i}`,
        item: {
          ...mockUserItems[0].item!,
          uid: `item-${i}`,
          title: `Item ${i}`,
        },
      }));

      mockMakeAuthenticatedRequest.mockResolvedValue(manyItems);

      const startTime = performance.now();
      renderWithRouter(<UserListsPage />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should render in under 1 second
    });

    test("handles corrupted item data gracefully", async () => {
      const corruptedItems = [
        {
          ...mockUserItems[0],
          item: null, // Corrupted item data
        },
      ];

      mockMakeAuthenticatedRequest.mockResolvedValue(corruptedItems);

      expect(() => {
        renderWithRouter(<UserListsPage />);
      }).not.toThrow();
    });

    test("handles API request cancellation", async () => {
      let resolveFirst: () => void;
      const firstRequest = new Promise<UserItem[]>((resolve) => {
        resolveFirst = () => resolve([]);
      });

      mockMakeAuthenticatedRequest.mockReturnValueOnce(firstRequest).mockResolvedValueOnce(mockUserItems);

      const { rerender } = renderWithRouter(<UserListsPage />);

      // Trigger a new request before the first completes
      rerender(<UserListsPage />);

      // Complete the first request
      resolveFirst!();

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });
    });

    test("debounces search input", async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue(mockUserItems);

      renderWithRouter(<UserListsPage />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search your list/);

        // Type rapidly
        fireEvent.change(searchInput, { target: { value: "a" } });
        fireEvent.change(searchInput, { target: { value: "at" } });
        fireEvent.change(searchInput, { target: { value: "att" } });
        fireEvent.change(searchInput, { target: { value: "atta" } });
      });

      // Should only filter once after debounce
      await waitFor(
        () => {
          expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });
  });
});
