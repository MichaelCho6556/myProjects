/**
 * Integration Tests for ItemDetailPage Component
 * Tests item detail display, recommendations, navigation, and error handling
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ItemDetailPage from "../../pages/ItemDetailPage";
import { AuthProvider } from "../../context/AuthContext";
import { mockAxios, mockItemDetailResponse, mockRecommendationsResponse } from "../../__mocks__/axios";

// Helper function to create mock items
const createMockItem = (overrides = {}) => {
  return {
    uid: "test-123",
    title: "Test Anime Title",
    media_type: "anime",
    genres: ["Action", "Adventure"],
    themes: ["School", "Military"],
    demographics: ["Shounen"],
    score: 8.5,
    scored_by: 10000,
    status: "Finished Airing",
    episodes: 24,
    start_date: "2020-01-01",
    rating: "PG-13",
    synopsis: "This is a test synopsis for the anime.",
    producers: ["Test Producer"],
    studios: ["Test Studio"],
    image_url: "https://example.com/test-image.jpg",
    ...overrides,
  };
};

// Test utilities
const renderWithRouter = (initialEntries = ["/item/test-123"], component = <ItemDetailPage />) => {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/item/:uid" element={component} />
          <Route path="/search" element={<div>Search Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

const createTestItem = (overrides = {}) => {
  return createMockItem({
    uid: "test-123",
    title: "Test Anime Title",
    media_type: "anime",
    genres: ["Action", "Adventure"],
    themes: ["School", "Military"],
    demographics: ["Shounen"],
    score: 8.5,
    scored_by: 10000,
    status: "Finished Airing",
    episodes: 24,
    start_date: "2020-01-01",
    rating: "PG-13",
    synopsis: "This is a test synopsis for the anime.",
    producers: ["Test Producer"],
    studios: ["Test Studio"],
    image_url: "https://example.com/test-image.jpg",
    ...overrides,
  });
};

describe("ItemDetailPage Component", () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  describe("Initial Loading", () => {
    it("shows loading state initially", () => {
      renderWithRouter();

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    });

    it("loads item details on mount", async () => {
      const testItem = createTestItem();
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Anime Title");
      });

      expect(mockAxios.get).toHaveBeenCalledWith("http://localhost:5000/api/items/test-123");
    });

    it("loads recommendations alongside item details", async () => {
      const testItem = createTestItem();
      const recommendations = [createTestItem({ uid: "rec-1", title: "Recommended Item 1" })];

      mockItemDetailResponse(testItem);
      mockRecommendationsResponse(recommendations);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      expect(mockAxios.get).toHaveBeenCalledWith("http://localhost:5000/api/recommendations/test-123?n=10");
    });
  });

  describe("Item Information Display", () => {
    beforeEach(async () => {
      const testItem = createTestItem();
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });
    });

    it("displays item title as main heading", () => {
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Anime Title");
    });

    it("displays item image with correct alt text", () => {
      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "https://example.com/test-image.jpg");
      expect(image).toHaveAttribute("alt", "Cover for Test Anime Title");
    });

    it("displays score information", () => {
      expect(screen.getByText(/8\.50/)).toBeInTheDocument();
      expect(screen.getByText(/\(10,000 users\)/)).toBeInTheDocument(); // scored_by formatted with users text
    });

    it("displays media type", () => {
      expect(screen.getByText("ANIME")).toBeInTheDocument();
    });

    it("displays status information", () => {
      expect(screen.getByText("Finished Airing")).toBeInTheDocument();
    });

    it("displays episode count for anime", () => {
      expect(screen.getByText("24")).toBeInTheDocument();
    });

    it("displays start date", () => {
      expect(screen.getByText("2020-01-01")).toBeInTheDocument();
    });

    it("displays rating", () => {
      expect(screen.getByText("PG-13")).toBeInTheDocument();
    });

    it("displays synopsis", () => {
      expect(screen.getByText("This is a test synopsis for the anime.")).toBeInTheDocument();
    });

    it("displays genres as clickable tags", () => {
      const actionTag = screen.getByRole("link", { name: /action/i });
      const adventureTag = screen.getByRole("link", { name: /adventure/i });

      expect(actionTag).toBeInTheDocument();
      expect(adventureTag).toBeInTheDocument();
    });

    it("displays themes when available", () => {
      expect(screen.getByText("School")).toBeInTheDocument();
      expect(screen.getByText("Military")).toBeInTheDocument();
    });

    it("displays demographics", () => {
      expect(screen.getByText("Shounen")).toBeInTheDocument();
    });

    it("displays producers", () => {
      expect(screen.getByText("Test Producer")).toBeInTheDocument();
    });

    it("displays studios", () => {
      expect(screen.getByText("Test Studio")).toBeInTheDocument();
    });
  });

  describe("Navigation Functionality", () => {
    beforeEach(async () => {
      const testItem = createTestItem();
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });
    });

    it("navigates to homepage with genre filter when genre tag is clicked", async () => {
      const actionTag = screen.getByRole("link", { name: /action/i });

      await userEvent.click(actionTag);

      await waitFor(() => {
        expect(screen.getByText("Home Page")).toBeInTheDocument();
      });
    });

    it("navigates to homepage with media type filter when media type is clicked", async () => {
      const mediaTypeTag = screen.getByRole("link", { name: /anime/i });

      await userEvent.click(mediaTypeTag);

      await waitFor(() => {
        expect(screen.getByText("Home Page")).toBeInTheDocument();
      });
    });

    it("has back button that navigates to previous page", () => {
      const backButton = screen.getByRole("link", { name: /back/i });
      expect(backButton).toBeInTheDocument();
    });
  });

  describe("Recommendations Section", () => {
    it("displays recommendations when available", async () => {
      const testItem = createTestItem();
      const recommendations = [
        createTestItem({ uid: "rec-1", title: "Recommended Item 1" }),
        createTestItem({ uid: "rec-2", title: "Recommended Item 2" }),
      ];

      mockItemDetailResponse(testItem);
      mockRecommendationsResponse(recommendations);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText("Recommended Item 1")).toBeInTheDocument();
        expect(screen.getByText("Recommended Item 2")).toBeInTheDocument();
      });
    });

    it("shows recommendations heading", async () => {
      const testItem = createTestItem();
      const recommendations = [createTestItem({ uid: "rec-1", title: "Recommended Item 1" })];

      mockItemDetailResponse(testItem);
      mockRecommendationsResponse(recommendations);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      expect(screen.getByRole("heading", { name: /recommendations/i })).toBeInTheDocument();
    });

    it("handles empty recommendations gracefully", async () => {
      const testItem = createTestItem();
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      // Should not show recommendations section when empty
      expect(screen.queryByRole("heading", { name: /recommendations/i })).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("displays error message when item is not found", async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: "Item not found" },
        },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });
    });

    it("displays error message for server errors", async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 500,
          data: { error: "Server Error" },
        },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it("provides link to homepage in error state", async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: "Item not found" },
        },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });

      const homeLink = screen.getByRole("link", { name: /go to homepage/i });
      expect(homeLink).toHaveAttribute("href", "/");
    });

    it("handles recommendations loading error gracefully", async () => {
      const testItem = createTestItem();
      mockItemDetailResponse(testItem);

      // Mock recommendations to fail
      mockAxios.get.mockImplementation((url) => {
        if (url.includes("/recommendations")) {
          return Promise.reject(new Error("Failed to load recommendations"));
        }
        if (url.includes("/api/items/test-123")) {
          return Promise.resolve({ data: testItem });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      // Should still show item details even if recommendations fail
      expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
    });
  });

  describe("Edge Cases and Data Handling", () => {
    it("handles missing image gracefully", async () => {
      const testItem = createTestItem({ image_url: null });
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "/images/default.webp");
    });

    it("handles missing synopsis gracefully", async () => {
      const testItem = createTestItem({ synopsis: null });
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      // Should not show synopsis section when synopsis is missing
      expect(screen.queryByText(/synopsis/i)).not.toBeInTheDocument();
    });

    it("handles missing score gracefully", async () => {
      const testItem = createTestItem({ score: null, scored_by: null });
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("handles empty genres array", async () => {
      const testItem = createTestItem({ genres: [] });
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      // Should not show genres section when genres array is empty
      expect(screen.queryByText(/genres/i)).not.toBeInTheDocument();
    });

    it("displays different content for manga", async () => {
      const testManga = createTestItem({
        media_type: "manga",
        episodes: null,
        chapters: 150,
        volumes: 20,
      });
      mockItemDetailResponse(testManga);
      mockRecommendationsResponse([]);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });

      expect(screen.getByText("MANGA")).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument(); // chapters
      expect(screen.getByText("20")).toBeInTheDocument(); // volumes
    });
  });

  describe("Accessibility", () => {
    beforeEach(async () => {
      const testItem = createTestItem();
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      });
    });

    it("has proper heading hierarchy", () => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it("has proper alt text for images", () => {
      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("alt", "Cover for Test Anime Title");
    });

    it("has accessible navigation buttons", () => {
      const genreLinks = screen.getAllByRole("link");
      expect(genreLinks.length).toBeGreaterThan(0);
      // Check that genre links have proper href attributes
      const actionLink = screen.getByRole("link", { name: /action/i });
      expect(actionLink).toHaveAttribute("href", "/?genre=Action");
    });

    it("provides screen reader friendly content", () => {
      // Check for proper alt text and aria labels
      expect(screen.getByAltText(/cover for test anime title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/go back to previous page/i)).toBeInTheDocument();
    });
  });

  describe("URL Parameter Handling", () => {
    it("loads correct item based on URL parameter", async () => {
      const testItem = createTestItem({ uid: "custom-123", title: "Custom Item" });
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      renderWithRouter(["/item/custom-123"]);

      await waitFor(() => {
        expect(screen.getByText("Custom Item")).toBeInTheDocument();
      });

      expect(mockAxios.get).toHaveBeenCalledWith("http://localhost:5000/api/items/custom-123");
    });

    it("handles invalid URL parameters", async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: "Item not found" },
        },
      });

      renderWithRouter(["/item/invalid-id"]);

      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });
    });
  });
});
