/**
 * Comprehensive User Journey Integration Tests for AniManga Recommender
 * Phase C2: User Journey Testing
 *
 * Test Coverage:
 * - New user signup to first item addition complete journey
 * - Search, filtering, and adding items to lists workflow
 * - Item status updates and dashboard reflection workflow
 * - Recommendation generation and interaction flow
 * - Multi-list management and status transitions
 * - Cross-page navigation and state persistence
 * - Error recovery during multi-step workflows
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import App from "../../App";
import { supabase } from "../../lib/supabase";
import axios from "axios";

// Mock Supabase
jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  },
}));

// Mock axios
jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

// Mock document title hook
jest.mock("../../hooks/useDocumentTitle", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock useAuthenticatedApi hook
jest.mock("../../hooks/useAuthenticatedApi", () => ({
  useAuthenticatedApi: () => ({
    makeAuthenticatedRequest: jest.fn(() => Promise.resolve({ data: [] })),
    getUserItems: jest.fn(() => Promise.resolve({ data: [] })),
    updateUserItemStatus: jest.fn(() => Promise.resolve({ data: {} })),
    removeUserItem: jest.fn(() => Promise.resolve({ data: {} })),
    getDashboardData: jest.fn(() => Promise.resolve({ data: mockDashboardData })),
  }),
}));

// Mock data
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  user_metadata: { full_name: "Test User" },
  aud: "authenticated",
  role: "authenticated",
};

const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

const mockAnimeItems = [
  {
    uid: "anime-1",
    title: "Attack on Titan",
    media_type: "anime",
    genres: ["Action", "Drama"],
    themes: ["Military", "Survival"],
    demographics: ["Shounen"],
    score: 9.0,
    scored_by: 1000000,
    status: "Finished Airing",
    episodes: 75,
    start_date: "2013-04-07",
    rating: "R",
    popularity: 1,
    members: 2000000,
    favorites: 100000,
    synopsis: "Humanity fights for survival against giant humanoid Titans.",
    studios: ["Studio Pierrot"],
    authors: ["Hajime Isayama"],
    serializations: ["Bessatsu Shounen Magazine"],
    image_url: "https://example.com/aot.jpg",
    trailer_url: "https://youtube.com/watch?v=test",
  },
  {
    uid: "manga-1",
    title: "One Piece",
    media_type: "manga",
    genres: ["Adventure", "Comedy"],
    themes: ["Pirates"],
    demographics: ["Shounen"],
    score: 9.2,
    scored_by: 500000,
    status: "Publishing",
    chapters: 1000,
    start_date: "1997-07-22",
    popularity: 2,
    members: 1500000,
    favorites: 80000,
    synopsis: "Monkey D. Luffy explores the Grand Line to become Pirate King.",
    authors: ["Eiichiro Oda"],
    serializations: ["Weekly Shounen Jump"],
    image_url: "https://example.com/onepiece.jpg",
  },
];

const mockDashboardData = {
  user_stats: {
    user_id: "user-123",
    total_anime_watched: 15,
    total_manga_read: 8,
    total_hours_watched: 150,
    total_chapters_read: 500,
    average_score: 8.2,
    favorite_genres: ["Action", "Adventure"],
    current_streak_days: 7,
    longest_streak_days: 30,
    completion_rate: 85.5,
    updated_at: "2024-01-15T10:00:00Z",
  },
  recent_activity: [
    {
      id: 1,
      user_id: "user-123",
      activity_type: "status_update",
      item_uid: "anime-1",
      activity_data: { old_status: "watching", new_status: "completed" },
      created_at: "2024-01-15T09:00:00Z",
      item: mockAnimeItems[0],
    },
  ],
  in_progress: [],
  completed_recently: [],
  plan_to_watch: [],
  on_hold: [],
  quick_stats: {
    total_items: 23,
    watching: 5,
    completed: 15,
    plan_to_watch: 2,
    on_hold: 1,
    dropped: 0,
  },
};

const mockUserItems = [
  {
    id: 1,
    user_id: "user-123",
    item_uid: "anime-1",
    status: "watching",
    progress: 12,
    rating: 8.5,
    start_date: "2024-01-01",
    notes: "Great anime so far!",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    item: mockAnimeItems[0],
  },
];

// Helper to render app with providers
const renderApp = (initialEntries: string[] = ["/"]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
};

// Helper to setup authenticated state
const setupAuthenticatedUser = () => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });

  (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
    data: {
      subscription: {
        unsubscribe: jest.fn(),
      },
    },
  });
};

// Helper to setup unauthenticated state
const setupUnauthenticatedUser = () => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: null,
  });

  (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
    data: {
      subscription: {
        unsubscribe: jest.fn(),
      },
    },
  });
};

describe("Complete User Journey Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Mock API responses
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        items: mockAnimeItems,
        total_items: mockAnimeItems.length,
        total_pages: 1,
        current_page: 1,
        items_per_page: 20,
      },
    });
  });

  describe("New User Complete Journey", () => {
    test("completes full signup to first item addition workflow", async () => {
      // Start with unauthenticated user
      setupUnauthenticatedUser();

      // Mock successful signup
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      renderApp();

      // 1. User starts on homepage and sees signup option
      await waitFor(() => {
        expect(screen.getByText("Sign Up")).toBeInTheDocument();
      });

      // 2. User clicks sign up
      await userEvent.click(screen.getByText("Sign Up"));

      // Wait for auth modal to appear
      await waitFor(() => {
        expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
      });

      // 3. User fills out signup form
      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      await userEvent.type(screen.getByLabelText(/display name/i), "Test User");

      // 4. User submits signup form
      await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

      // Wait for successful signup
      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
          options: {
            data: {
              full_name: "Test User",
            },
          },
        });
      });

      // 5. After signup, user should see authenticated state
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // 6. User searches for an anime
      const searchInput = screen.getByPlaceholderText(/search anime/i);
      await userEvent.type(searchInput, "Attack on Titan");
      await userEvent.click(screen.getByRole("button", { name: /search/i }));

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });

      // 7. User clicks on an anime to view details
      await userEvent.click(screen.getByText("Attack on Titan"));

      // Wait for item detail page
      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
        expect(screen.getByText(/humanity fights for survival/i)).toBeInTheDocument();
      });

      // 8. User adds item to their list
      await userEvent.click(screen.getByRole("button", { name: /add to list/i }));

      // Select status
      await userEvent.selectOptions(screen.getByRole("combobox"), "watching");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      // 9. Verify item was added successfully
      await waitFor(() => {
        expect(screen.getByText(/added to your list/i)).toBeInTheDocument();
      });

      // 10. User navigates to dashboard to see their new item
      await userEvent.click(screen.getByText("Dashboard"));

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Currently Watching")).toBeInTheDocument();
      });
    });

    test("handles errors gracefully during signup journey", async () => {
      setupUnauthenticatedUser();

      // Mock signup error
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Email already registered" },
      });

      renderApp();

      // User attempts signup
      await userEvent.click(screen.getByText("Sign Up"));

      await waitFor(() => {
        expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/email/i), "existing@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      await userEvent.type(screen.getByLabelText(/display name/i), "Test User");

      await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
      });

      // User should still be able to retry or switch to login
      expect(screen.getByText("Already have an account?")).toBeInTheDocument();
    });
  });

  describe("Search, Filter, and Add Items Workflow", () => {
    test("completes comprehensive search and filter workflow", async () => {
      setupAuthenticatedUser();

      // Mock filter options API response
      (axios.get as jest.Mock).mockImplementation((url) => {
        if (url.includes("distinct-values")) {
          return Promise.resolve({
            data: {
              media_types: ["anime", "manga"],
              genres: ["Action", "Adventure", "Comedy", "Drama"],
              themes: ["Military", "Pirates", "Survival"],
              demographics: ["Shounen", "Seinen"],
              statuses: ["Finished Airing", "Currently Airing", "Publishing"],
              studios: ["Studio Pierrot", "Toei Animation"],
              authors: ["Hajime Isayama", "Eiichiro Oda"],
            },
          });
        }
        return Promise.resolve({
          data: {
            items: mockAnimeItems,
            total_items: mockAnimeItems.length,
            total_pages: 1,
            current_page: 1,
            items_per_page: 20,
          },
        });
      });

      renderApp();

      // Wait for app to load with authenticated user
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // 1. User opens filter options
      await userEvent.click(screen.getByText(/show filters/i));

      await waitFor(() => {
        expect(screen.getByLabelText(/media type/i)).toBeInTheDocument();
      });

      // 2. User applies multiple filters
      // Select media type
      await userEvent.selectOptions(screen.getByLabelText(/media type/i), "anime");

      // Select genre (multi-select)
      const genreSelect = screen.getByLabelText(/genres/i);
      await userEvent.click(genreSelect);
      await userEvent.click(screen.getByText("Action"));

      // Select theme
      const themeSelect = screen.getByLabelText(/themes/i);
      await userEvent.click(themeSelect);
      await userEvent.click(screen.getByText("Military"));

      // Set minimum score
      await userEvent.type(screen.getByLabelText(/minimum score/i), "8.5");

      // 3. User performs search with filters
      await userEvent.type(screen.getByPlaceholderText(/search/i), "Attack");
      await userEvent.click(screen.getByRole("button", { name: /search/i }));

      // Wait for filtered results
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("q=Attack"), expect.any(Object));
      });

      // 4. User sorts results
      await userEvent.selectOptions(screen.getByLabelText(/sort by/i), "score_desc");

      // Wait for re-sorted results
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("sort_by=score_desc"),
          expect.any(Object)
        );
      });

      // 5. User changes items per page
      await userEvent.selectOptions(screen.getByLabelText(/items per page/i), "50");

      // 6. User adds filtered item to list
      await userEvent.click(screen.getByText("Attack on Titan"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add to list/i })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: /add to list/i }));
      await userEvent.selectOptions(screen.getByRole("combobox"), "plan_to_watch");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      // 7. User clears filters to see all results
      await userEvent.click(screen.getByRole("button", { name: /reset filters/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue("")).toBeInTheDocument();
      });
    });

    test("handles search errors and empty results gracefully", async () => {
      setupAuthenticatedUser();

      // Mock API error
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // User performs search that fails
      await userEvent.type(screen.getByPlaceholderText(/search/i), "NonexistentAnime");
      await userEvent.click(screen.getByRole("button", { name: /search/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument();
      });

      // User can retry
      await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    });
  });

  describe("Item Status Updates and Dashboard Reflection", () => {
    test("completes item status update workflow with dashboard updates", async () => {
      setupAuthenticatedUser();

      // Mock API responses for user items and dashboard
      const mockAuthenticatedApi = require("../../hooks/useAuthenticatedApi").useAuthenticatedApi();
      mockAuthenticatedApi.getUserItems.mockResolvedValue({ data: mockUserItems });
      mockAuthenticatedApi.getDashboardData.mockResolvedValue({ data: mockDashboardData });
      mockAuthenticatedApi.updateUserItemStatus.mockResolvedValue({
        data: { ...mockUserItems[0], status: "completed", progress: 75 },
      });

      renderApp(["/lists"]);

      // Wait for lists page to load
      await waitFor(() => {
        expect(screen.getByText("My Lists")).toBeInTheDocument();
      });

      // 1. User views their current watching list
      await userEvent.click(screen.getByText("Watching"));

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });

      // 2. User updates progress
      const progressInput = screen.getByDisplayValue("12");
      await userEvent.clear(progressInput);
      await userEvent.type(progressInput, "24");

      // 3. User changes status to completed
      await userEvent.selectOptions(screen.getByDisplayValue("watching"), "completed");

      // 4. User adds rating
      const ratingInput = screen.getByLabelText(/rating/i);
      await userEvent.clear(ratingInput);
      await userEvent.type(ratingInput, "9.0");

      // 5. User adds notes
      const notesTextarea = screen.getByLabelText(/notes/i);
      await userEvent.type(notesTextarea, "Absolutely amazing series! Highly recommend.");

      // 6. User saves changes
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      // Wait for update to complete
      await waitFor(() => {
        expect(mockAuthenticatedApi.updateUserItemStatus).toHaveBeenCalledWith(
          "anime-1",
          expect.objectContaining({
            status: "completed",
            progress: 24,
            rating: 9.0,
            notes: "Absolutely amazing series! Highly recommend.",
          })
        );
      });

      // 7. User navigates to dashboard to see updated stats
      await userEvent.click(screen.getByText("Dashboard"));

      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });

      // 8. Verify dashboard reflects the changes
      await waitFor(() => {
        expect(screen.getByText("15")).toBeInTheDocument(); // Completed count
        expect(screen.getByText("8.2")).toBeInTheDocument(); // Average score
      });

      // 9. Check recent activity shows the update
      expect(screen.getByText(/completed.*Attack on Titan/i)).toBeInTheDocument();
    });

    test("handles bulk status updates workflow", async () => {
      setupAuthenticatedUser();

      const multipleUserItems = [
        { ...mockUserItems[0], item_uid: "anime-1", status: "watching" },
        { ...mockUserItems[0], id: 2, item_uid: "anime-2", status: "watching", item: mockAnimeItems[1] },
        { ...mockUserItems[0], id: 3, item_uid: "anime-3", status: "watching" },
      ];

      const mockAuthenticatedApi = require("../../hooks/useAuthenticatedApi").useAuthenticatedApi();
      mockAuthenticatedApi.getUserItems.mockResolvedValue({ data: multipleUserItems });

      renderApp(["/lists"]);

      await waitFor(() => {
        expect(screen.getByText("My Lists")).toBeInTheDocument();
      });

      // 1. User selects multiple items
      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[0]); // Select first item
      await userEvent.click(checkboxes[1]); // Select second item

      // 2. User performs bulk action
      await userEvent.selectOptions(screen.getByLabelText(/bulk action/i), "completed");
      await userEvent.click(screen.getByRole("button", { name: /apply to selected/i }));

      // 3. Confirm bulk update
      await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Wait for bulk update to complete
      await waitFor(() => {
        expect(mockAuthenticatedApi.updateUserItemStatus).toHaveBeenCalledTimes(2);
      });

      // 4. Verify success message
      expect(screen.getByText(/2 items updated successfully/i)).toBeInTheDocument();
    });
  });

  describe("Recommendation Generation and Interaction Flow", () => {
    test("completes recommendation workflow based on user preferences", async () => {
      setupAuthenticatedUser();

      const mockRecommendations = [
        {
          ...mockAnimeItems[0],
          uid: "rec-1",
          title: "Demon Slayer",
          recommendation_score: 95,
          reason: "Similar action themes and high ratings",
        },
        {
          ...mockAnimeItems[1],
          uid: "rec-2",
          title: "My Hero Academia",
          recommendation_score: 88,
          reason: "Popular among users with similar preferences",
        },
      ];

      // Mock recommendations API
      (axios.get as jest.Mock).mockImplementation((url) => {
        if (url.includes("recommendations")) {
          return Promise.resolve({ data: { items: mockRecommendations } });
        }
        return Promise.resolve({
          data: {
            items: mockAnimeItems,
            total_items: mockAnimeItems.length,
            total_pages: 1,
            current_page: 1,
            items_per_page: 20,
          },
        });
      });

      renderApp(["/dashboard"]);

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });

      // 1. User clicks on recommendations section
      await userEvent.click(screen.getByText("Get Recommendations"));

      // Wait for recommendations to load
      await waitFor(() => {
        expect(screen.getByText("Recommended for You")).toBeInTheDocument();
        expect(screen.getByText("Demon Slayer")).toBeInTheDocument();
      });

      // 2. User views recommendation details
      await userEvent.click(screen.getByText("Demon Slayer"));

      await waitFor(() => {
        expect(screen.getByText(/similar action themes/i)).toBeInTheDocument();
      });

      // 3. User adds recommended item to list
      await userEvent.click(screen.getByRole("button", { name: /add to list/i }));
      await userEvent.selectOptions(screen.getByRole("combobox"), "plan_to_watch");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      // 4. User provides feedback on recommendation
      await userEvent.click(screen.getByRole("button", { name: /helpful/i }));

      // 5. User requests more recommendations
      await userEvent.click(screen.getByRole("button", { name: /more recommendations/i }));

      // Wait for new recommendations
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("recommendations"),
          expect.any(Object)
        );
      });
    });
  });

  describe("Multi-List Management and Status Transitions", () => {
    test("completes complex list management workflow", async () => {
      setupAuthenticatedUser();

      const complexUserItems = [
        { ...mockUserItems[0], status: "watching" },
        { ...mockUserItems[0], id: 2, status: "plan_to_watch" },
        { ...mockUserItems[0], id: 3, status: "completed" },
        { ...mockUserItems[0], id: 4, status: "on_hold" },
      ];

      const mockAuthenticatedApi = require("../../hooks/useAuthenticatedApi").useAuthenticatedApi();
      mockAuthenticatedApi.getUserItems.mockResolvedValue({ data: complexUserItems });

      renderApp(["/lists"]);

      await waitFor(() => {
        expect(screen.getByText("My Lists")).toBeInTheDocument();
      });

      // 1. User views different status tabs
      const statusTabs = ["Watching", "Plan to Watch", "Completed", "On Hold"];

      for (const tab of statusTabs) {
        await userEvent.click(screen.getByText(tab));

        await waitFor(() => {
          expect(screen.getByText(tab)).toHaveClass("active");
        });
      }

      // 2. User moves item between lists
      await userEvent.click(screen.getByText("Plan to Watch"));

      // Select an item and change its status
      const statusSelect = screen.getByDisplayValue("plan_to_watch");
      await userEvent.selectOptions(statusSelect, "watching");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      // 3. User creates custom list organization
      await userEvent.click(screen.getByRole("button", { name: /create custom list/i }));

      await userEvent.type(screen.getByLabelText(/list name/i), "Favorites");
      await userEvent.click(screen.getByRole("button", { name: /create/i }));

      // 4. User adds items to custom list
      await userEvent.click(screen.getByText("Completed"));

      const addToListButton = screen.getByRole("button", { name: /add to custom list/i });
      await userEvent.click(addToListButton);

      await userEvent.selectOptions(screen.getByLabelText(/select list/i), "Favorites");
      await userEvent.click(screen.getByRole("button", { name: /add/i }));

      // 5. User exports list data
      await userEvent.click(screen.getByRole("button", { name: /export lists/i }));

      await userEvent.selectOptions(screen.getByLabelText(/format/i), "csv");
      await userEvent.click(screen.getByRole("button", { name: /download/i }));

      // Verify export was triggered
      expect(screen.getByText(/export started/i)).toBeInTheDocument();
    });
  });

  describe("Cross-Page Navigation and State Persistence", () => {
    test("maintains state consistency across page navigation", async () => {
      setupAuthenticatedUser();

      renderApp();

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // 1. User performs search on homepage
      await userEvent.type(screen.getByPlaceholderText(/search/i), "Attack on Titan");
      await userEvent.click(screen.getByRole("button", { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });

      // 2. User navigates to item detail
      await userEvent.click(screen.getByText("Attack on Titan"));

      await waitFor(() => {
        expect(window.location.pathname).toContain("/item/");
      });

      // 3. User navigates to dashboard
      await userEvent.click(screen.getByText("Dashboard"));

      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });

      // 4. User navigates to lists
      await userEvent.click(screen.getByText("My Lists"));

      await waitFor(() => {
        expect(screen.getByText("My Lists")).toBeInTheDocument();
      });

      // 5. User navigates back to homepage
      await userEvent.click(screen.getByText("AniManga Recommender"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      // Verify search state is maintained
      expect(screen.getByDisplayValue("Attack on Titan")).toBeInTheDocument();
    });

    test("handles browser back/forward navigation correctly", async () => {
      setupAuthenticatedUser();

      renderApp();

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Navigate through pages
      await userEvent.click(screen.getByText("Dashboard"));
      await userEvent.click(screen.getByText("My Lists"));

      // Use browser back
      act(() => {
        window.history.back();
      });

      await waitFor(() => {
        expect(screen.getByText("My Dashboard")).toBeInTheDocument();
      });

      // Use browser forward
      act(() => {
        window.history.forward();
      });

      await waitFor(() => {
        expect(screen.getByText("My Lists")).toBeInTheDocument();
      });
    });
  });

  describe("Error Recovery During Multi-Step Workflows", () => {
    test("recovers gracefully from network errors during complex workflows", async () => {
      setupAuthenticatedUser();

      renderApp();

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // 1. Start a workflow that will encounter an error
      await userEvent.type(screen.getByPlaceholderText(/search/i), "Test Anime");

      // Mock network error
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error("Network timeout"));

      await userEvent.click(screen.getByRole("button", { name: /search/i }));

      // 2. User sees error message
      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument();
      });

      // 3. User retries the operation
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          items: mockAnimeItems,
          total_items: mockAnimeItems.length,
          total_pages: 1,
          current_page: 1,
          items_per_page: 20,
        },
      });

      await userEvent.click(screen.getByRole("button", { name: /retry/i }));

      // 4. Operation succeeds on retry
      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });

      // 5. User can continue with their workflow
      await userEvent.click(screen.getByText("Attack on Titan"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add to list/i })).toBeInTheDocument();
      });
    });

    test("handles authentication expiry during multi-step workflow", async () => {
      setupAuthenticatedUser();

      let authStateCallback: (event: string, session: any) => void;

      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // 1. User starts a workflow
      await userEvent.type(screen.getByPlaceholderText(/search/i), "Attack on Titan");
      await userEvent.click(screen.getByRole("button", { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      });

      // 2. Authentication expires during workflow
      act(() => {
        authStateCallback!("SIGNED_OUT", null);
      });

      // 3. User is prompted to re-authenticate
      await waitFor(() => {
        expect(screen.getByText("Sign In")).toBeInTheDocument();
      });

      // 4. User re-authenticates
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await userEvent.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      // 5. User is returned to their previous state
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Attack on Titan")).toBeInTheDocument();
      });
    });
  });
});
