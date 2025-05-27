/**
 * Integration Tests for Navigation Flows
 * Tests routing between pages and parameter passing
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import HomePage from "../../pages/HomePage";
import ItemDetailPage from "../../pages/ItemDetailPage";
import {
  mockAxios,
  mockItemsResponse,
  mockItemDetailResponse,
  mockRecommendationsResponse,
} from "../../__mocks__/axios";

const App = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/search" element={<HomePage />} />
    <Route path="/item/:uid" element={<ItemDetailPage />} />
  </Routes>
);

const renderWithRouter = (initialEntries = ["/"], component = <App />) => {
  return render(<MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>);
};

describe("Navigation Flow Tests", () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  describe("HomePage to ItemDetail Navigation", () => {
    it("navigates to item detail when clicking item card", async () => {
      const testItem = createMockItem({
        uid: "test-anime-123",
        title: "Test Anime",
      });

      // Mock HomePage API calls
      mockItemsResponse([testItem], 1);
      mockAxios.setMockResponse("/api/distinct-values", {
        data: createMockDistinctValues(),
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      // Mock ItemDetail API calls
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      renderWithRouter();

      // Wait for HomePage to load
      await waitFor(() => {
        expect(screen.getByText("Test Anime")).toBeInTheDocument();
      });

      // Click on the item card
      const itemLink = screen.getByRole("link", { name: /view details for test anime/i });
      await userEvent.click(itemLink);

      // Should navigate to item detail page
      await waitFor(() => {
        expect(window.location.pathname).toBe("/item/test-anime-123");
      });

      // Should show item detail content
      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Test Anime");
      });
    });
  });

  describe("ItemDetail to HomePage Navigation", () => {
    it("navigates back to homepage with genre filter when clicking genre tag", async () => {
      const testItem = createMockItem({
        uid: "test-anime-123",
        title: "Test Anime",
        genres: ["Action", "Adventure"],
      });

      // Mock ItemDetail API calls
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      // Mock HomePage API calls for return navigation
      mockItemsResponse([testItem], 1);
      mockAxios.setMockResponse("/api/distinct-values", {
        data: createMockDistinctValues(),
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      // Start on item detail page
      renderWithRouter(["/item/test-anime-123"]);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Test Anime");
      });

      // Click on genre tag
      const genreTag = screen.getByRole("button", { name: /action/i });
      await userEvent.click(genreTag);

      // Should navigate to homepage with genre filter
      await waitFor(() => {
        expect(window.location.pathname).toBe("/search");
        expect(window.location.search).toContain("genre=Action");
      });

      // Should apply the filter on homepage
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("genre=Action"));
      });
    });

    it("navigates back to homepage with media type filter when clicking media type tag", async () => {
      const testItem = createMockItem({
        uid: "test-manga-123",
        title: "Test Manga",
        media_type: "manga",
      });

      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);
      mockItemsResponse([testItem], 1);
      mockAxios.setMockResponse("/api/distinct-values", {
        data: createMockDistinctValues(),
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      renderWithRouter(["/item/test-manga-123"]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Test Manga");
      });

      // Click on media type tag
      const mediaTypeTag = screen.getByRole("button", { name: /manga/i });
      await userEvent.click(mediaTypeTag);

      await waitFor(() => {
        expect(window.location.pathname).toBe("/search");
        expect(window.location.search).toContain("media_type=manga");
      });
    });
  });

  describe("Navigation State Preservation", () => {
    it("preserves search and filter state when navigating back from item detail", async () => {
      const testItem = createMockItem({ uid: "test-123" });

      // Setup mocks
      mockItemsResponse([testItem], 1);
      mockAxios.setMockResponse("/api/distinct-values", {
        data: createMockDistinctValues(),
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });
      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      // Start with filtered homepage
      renderWithRouter(["/search?genre=Action&search=test&page=2"]);

      await waitFor(() => {
        expect(screen.getByText("Test Anime 1")).toBeInTheDocument();
      });

      // Navigate to item detail
      const itemLink = screen.getByRole("link");
      await userEvent.click(itemLink);

      await waitFor(() => {
        expect(window.location.pathname).toBe("/item/test-123");
      });

      // Navigate back (simulate browser back button)
      window.history.back();

      await waitFor(() => {
        expect(window.location.pathname).toBe("/search");
        expect(window.location.search).toContain("genre=Action");
        expect(window.location.search).toContain("search=test");
        expect(window.location.search).toContain("page=2");
      });
    });
  });

  describe("Direct URL Access", () => {
    it("loads item detail page correctly when accessing URL directly", async () => {
      const testItem = createMockItem({
        uid: "direct-access-123",
        title: "Direct Access Item",
      });

      mockItemDetailResponse(testItem);
      mockRecommendationsResponse([]);

      renderWithRouter(["/item/direct-access-123"]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Direct Access Item");
      });

      // Verify correct API call was made
      expect(mockAxios.get).toHaveBeenCalledWith("/api/items/direct-access-123");
    });

    it("loads homepage with filters when accessing filtered URL directly", async () => {
      mockItemsResponse([], 1);
      mockAxios.setMockResponse("/api/distinct-values", {
        data: createMockDistinctValues(),
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      renderWithRouter(["/search?genre=Action&media_type=anime&search=naruto"]);

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringMatching(/genre=Action.*media_type=anime.*search=naruto/)
        );
      });
    });
  });

  describe("Error Navigation Scenarios", () => {
    it("shows 404 error for non-existent item", async () => {
      mockAxios.mockRejectedValue({
        response: {
          status: 404,
          data: { error: "Item not found" },
        },
      });

      renderWithRouter(["/item/non-existent-123"]);

      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });
    });

    it("provides navigation back to homepage from error states", async () => {
      mockAxios.mockRejectedValue({
        response: {
          status: 404,
          data: { error: "Item not found" },
        },
      });

      renderWithRouter(["/item/non-existent-123"]);

      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });

      // Should have link back to homepage
      const homeLink = screen.getByRole("link", { name: /go to homepage/i });
      expect(homeLink).toHaveAttribute("href", "/");
    });
  });
});
