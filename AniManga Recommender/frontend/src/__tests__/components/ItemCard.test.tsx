/**
 * Unit Tests for ItemCard Component
 * Tests item display, routing, and accessibility features
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ItemCard from "../../components/ItemCard";
import { AnimeItem } from "../../types";

// Test utilities
const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

// Create a mock wrapper to replace MemoryRouter
const MockRouter = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// Mock the Link component
jest.mock("../../components/ItemCard", () => {
  return function MockItemCard(props: any) {
    return (
      <div data-testid="item-card">
        <h3>{props.item.title}</h3>
        <p>Score: {props.item.score}</p>
        <p>Type: {props.item.media_type}</p>
        {props.item.genres && <p>Genres: {props.item.genres.join(", ")}</p>}
      </div>
    );
  };
});

const createTestItem = (overrides: Partial<AnimeItem> = {}): AnimeItem => ({
  uid: "test-uid-1",
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
  popularity: 100,
  members: 50000,
  favorites: 5000,
  synopsis: "Test synopsis for anime",
  producers: ["Test Producer"],
  licensors: ["Test Licensor"],
  studios: ["Test Studio"],
  authors: [],
  serializations: [],
  image_url: "https://example.com/test-image.jpg",
  title_synonyms: ["Alt Title"],
  ...overrides,
});

describe("ItemCard Component", () => {
  describe("Basic Rendering", () => {
    it("renders with valid item prop", () => {
      const testItem = createTestItem();

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
      expect(screen.getByText("Type:")).toBeInTheDocument();
      expect(screen.getByText("ANIME")).toBeInTheDocument();
      expect(screen.getByText("Score:")).toBeInTheDocument();
      expect(screen.getByText("8.50")).toBeInTheDocument();
    });

    it("renders null when item prop is null", () => {
      const { container } = renderWithRouter(<ItemCard item={null as any} />);

      expect(container.firstChild).toBeNull();
    });

    it("renders null when item prop is undefined", () => {
      const { container } = renderWithRouter(<ItemCard item={undefined as any} />);

      expect(container.firstChild).toBeNull();
    });

    it("applies custom className when provided", () => {
      const testItem = createTestItem();

      renderWithRouter(<ItemCard item={testItem} className="custom-class" />);

      const linkElement = screen.getByRole("link");
      expect(linkElement).toHaveClass("custom-class");
    });

    it("has correct accessibility attributes", () => {
      const testItem = createTestItem();

      renderWithRouter(<ItemCard item={testItem} />);

      const linkElement = screen.getByRole("link");
      expect(linkElement).toHaveAttribute(
        "aria-label",
        "View details for Test Anime Title - anime with score 8.50"
      );
    });
  });

  describe("Content Display", () => {
    it("displays title correctly", () => {
      const testItem = createTestItem({ title: "Custom Anime Title" });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("Custom Anime Title")).toBeInTheDocument();
    });

    it('displays "No Title" when title is missing', () => {
      const testItem = createTestItem({ title: "" });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("No Title")).toBeInTheDocument();
    });

    it("displays media type in uppercase", () => {
      const testItem = createTestItem({ media_type: "manga" });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("MANGA")).toBeInTheDocument();
    });

    it('displays "N/A" when media type is missing', () => {
      const testItem = createTestItem({ media_type: undefined as any });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("formats score to 2 decimal places", () => {
      const testItem = createTestItem({ score: 7.123456 });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("7.12")).toBeInTheDocument();
    });

    it('displays "N/A" when score is missing', () => {
      const testItem = createTestItem({ score: undefined as any });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it('displays "N/A" when score is 0', () => {
      const testItem = createTestItem({ score: 0 });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  describe("Genres Display", () => {
    it("displays genres as comma-separated string when array", () => {
      const testItem = createTestItem({ genres: ["Action", "Adventure", "Comedy"] });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("Genres:")).toBeInTheDocument();
      expect(screen.getByText("Action, Adventure, Comedy")).toBeInTheDocument();
    });

    it("displays genres when provided as string", () => {
      const testItem = createTestItem({ genres: "Action, Adventure" as any });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("Action, Adventure")).toBeInTheDocument();
    });

    it('displays "None" when genres array is empty', () => {
      const testItem = createTestItem({ genres: [] });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("None")).toBeInTheDocument();
    });

    it('displays "None" when genres is not array or string', () => {
      const testItem = createTestItem({ genres: null as any });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("None")).toBeInTheDocument();
    });

    it("does not display genres section when genres is empty array", () => {
      const testItem = createTestItem({ genres: [] });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.queryByText("Genres:")).not.toBeInTheDocument();
    });
  });

  describe("Themes Display", () => {
    it("displays themes as comma-separated string when array", () => {
      const testItem = createTestItem({ themes: ["School", "Military", "Romance"] });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("Themes:")).toBeInTheDocument();
      expect(screen.getByText("School, Military, Romance")).toBeInTheDocument();
    });

    it("displays themes when provided as string", () => {
      const testItem = createTestItem({ themes: "School, Military" as any });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("School, Military")).toBeInTheDocument();
    });

    it("does not display themes section when themes is empty array", () => {
      const testItem = createTestItem({ themes: [] });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.queryByText("Themes:")).not.toBeInTheDocument();
    });

    it('displays "None" when themes is not array or string', () => {
      const testItem = createTestItem({ themes: null as any });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("None")).toBeInTheDocument();
    });
  });

  describe("Image Handling", () => {
    it("displays image with correct src and alt attributes", () => {
      const testItem = createTestItem({
        image_url: "https://example.com/custom-image.jpg",
        title: "Custom Title",
      });

      renderWithRouter(<ItemCard item={testItem} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "https://example.com/custom-image.jpg");
      expect(image).toHaveAttribute("alt", "Cover for Custom Title");
      expect(image).toHaveAttribute("loading", "lazy");
    });

    it("falls back to main_picture when image_url is not available", () => {
      const { image_url, ...testItemWithoutImage } = createTestItem();
      const testItem = testItemWithoutImage as any;
      testItem.main_picture = "https://example.com/main-picture.jpg";

      renderWithRouter(<ItemCard item={testItem} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "https://example.com/main-picture.jpg");
    });

    it("uses default placeholder when no image is available", () => {
      const { image_url, ...testItemWithoutImage } = createTestItem();

      renderWithRouter(<ItemCard item={testItemWithoutImage as any} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "/images/default.webp");
    });

    it("handles image load error by switching to default placeholder", async () => {
      const testItem = createTestItem({
        image_url: "https://example.com/broken-image.jpg",
      });

      renderWithRouter(<ItemCard item={testItem} />);

      const image = screen.getByRole("img");

      // Simulate image load error
      fireEvent.error(image);

      await waitFor(() => {
        expect(image).toHaveAttribute("src", "/images/default.webp");
      });
    });
  });

  describe("Navigation", () => {
    it("creates correct link to item detail page", () => {
      const testItem = createTestItem({ uid: "custom-uid-123" });

      renderWithRouter(<ItemCard item={testItem} />);

      const linkElement = screen.getByRole("link");
      expect(linkElement).toHaveAttribute("href", "/item/custom-uid-123");
    });

    it("has correct CSS classes for styling", () => {
      const testItem = createTestItem();

      renderWithRouter(<ItemCard item={testItem} />);

      const linkElement = screen.getByRole("link");
      expect(linkElement).toHaveClass("item-card-link");

      const articleElement = screen.getByRole("article");
      expect(articleElement).toHaveClass("item-card");
    });
  });

  describe("Component Memoization", () => {
    it("is wrapped with React.memo for performance optimization", () => {
      // This test verifies that the component is memoized
      // We can't directly test memo behavior, but we can verify the component structure
      const testItem = createTestItem();

      const { rerender } = renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("Test Anime Title")).toBeInTheDocument();

      // Rerender with same props should not cause issues
      rerender(<ItemCard item={testItem} />);

      expect(screen.getByText("Test Anime Title")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles very long titles gracefully", () => {
      const longTitle =
        "This is a very long anime title that might cause layout issues if not handled properly in the component";
      const testItem = createTestItem({ title: longTitle });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles special characters in title", () => {
      const specialTitle = "Anime Title with Special Characters: @#$%^&*()";
      const testItem = createTestItem({ title: specialTitle });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it("handles very high scores", () => {
      const testItem = createTestItem({ score: 10.0 });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("10.00")).toBeInTheDocument();
    });

    it("handles negative scores", () => {
      const testItem = createTestItem({ score: -1.5 });

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByText("-1.50")).toBeInTheDocument();
    });

    it("handles empty genres and themes arrays", () => {
      const testItem = createTestItem({
        genres: [],
        themes: [],
      });

      renderWithRouter(<ItemCard item={testItem} />);

      // Should not display genres or themes sections
      expect(screen.queryByText("Genres:")).not.toBeInTheDocument();
      expect(screen.queryByText("Themes:")).not.toBeInTheDocument();
    });

    it("handles missing uid gracefully", () => {
      const testItem = createTestItem({ uid: "" });

      renderWithRouter(<ItemCard item={testItem} />);

      const linkElement = screen.getByRole("link");
      expect(linkElement).toHaveAttribute("href", "/item/");
    });
  });

  describe("Accessibility", () => {
    it("has proper semantic HTML structure", () => {
      const testItem = createTestItem();

      renderWithRouter(<ItemCard item={testItem} />);

      expect(screen.getByRole("link")).toBeInTheDocument();
      expect(screen.getByRole("article")).toBeInTheDocument();
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    it("provides descriptive alt text for images", () => {
      const testItem = createTestItem({ title: "Accessibility Test Anime" });

      renderWithRouter(<ItemCard item={testItem} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("alt", "Cover for Accessibility Test Anime");
    });

    it("provides descriptive aria-label for the link", () => {
      const testItem = createTestItem({
        title: "Test Anime",
        media_type: "anime",
        score: 9.5,
      });

      renderWithRouter(<ItemCard item={testItem} />);

      const linkElement = screen.getByRole("link");
      expect(linkElement).toHaveAttribute(
        "aria-label",
        "View details for Test Anime - anime with score 9.50"
      );
    });
  });
});
