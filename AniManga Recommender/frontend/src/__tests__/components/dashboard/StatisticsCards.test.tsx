/**
 * Comprehensive StatisticsCards Component Tests for AniManga Recommender
 * Phase B2: Dashboard Components Testing
 *
 * Test Coverage:
 * - Statistics display and formatting
 * - Data rendering accuracy
 * - Number formatting and calculations
 * - Visual elements and styling
 * - Props validation
 * - Edge cases with zero/null data
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import StatisticsCards from "../../../components/dashboard/StatisticsCards";
import { UserStatistics, QuickStats } from "../../../types";

describe("StatisticsCards Component", () => {
  const mockUserStats: UserStatistics = {
    user_id: "user-123",
    total_anime_watched: 45,
    total_manga_read: 28,
    total_hours_watched: 1247.5,
    total_chapters_read: 834,
    average_score: 7.8,
    favorite_genres: ["Action", "Adventure", "Comedy"],
    current_streak_days: 12,
    longest_streak_days: 45,
    completion_rate: 87,
    updated_at: "2024-01-15T10:30:00Z",
  };

  const mockQuickStats: QuickStats = {
    total_items: 150,
    watching: 15,
    completed: 73,
    plan_to_watch: 42,
    on_hold: 8,
    dropped: 12,
  };

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      expect(screen.getByText("Anime Watched")).toBeInTheDocument();
      expect(screen.getByText("Manga Read")).toBeInTheDocument();
      expect(screen.getByText("Currently Watching")).toBeInTheDocument();
      expect(screen.getByText("Completion Rate")).toBeInTheDocument();
    });

    it("has proper structure with statistics grid", () => {
      const { container } = render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      const statisticsGrid = container.querySelector(".statistics-grid");
      expect(statisticsGrid).toBeInTheDocument();

      const statCards = container.querySelectorAll(".stat-card");
      expect(statCards).toHaveLength(4);
    });

    it("renders all card types with correct classes", () => {
      const { container } = render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      expect(container.querySelector(".stat-card.anime")).toBeInTheDocument();
      expect(container.querySelector(".stat-card.manga")).toBeInTheDocument();
      expect(container.querySelector(".stat-card.watching")).toBeInTheDocument();
      expect(container.querySelector(".stat-card.completion")).toBeInTheDocument();
    });
  });

  describe("Data Display and Formatting", () => {
    it("displays anime statistics correctly", () => {
      render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      expect(screen.getByText("45")).toBeInTheDocument(); // total_anime_watched
      expect(screen.getByText("1247.5 hours")).toBeInTheDocument(); // formatted hours
    });

    it("displays manga statistics correctly", () => {
      render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      expect(screen.getByText("28")).toBeInTheDocument(); // total_manga_read
      expect(screen.getByText("834 chapters")).toBeInTheDocument(); // total_chapters_read
    });

    it("displays currently watching count correctly", () => {
      render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      expect(screen.getByText("15")).toBeInTheDocument(); // watching count
      expect(screen.getByText("In progress")).toBeInTheDocument();
    });

    it("displays completion rate correctly", () => {
      render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      expect(screen.getByText("87%")).toBeInTheDocument(); // completion_rate
      expect(screen.getByText("Of started items")).toBeInTheDocument();
    });

    it("formats hours with one decimal place", () => {
      const statsWithDecimal = {
        ...mockUserStats,
        total_hours_watched: 123.456,
      };

      render(<StatisticsCards userStats={statsWithDecimal} quickStats={mockQuickStats} />);

      expect(screen.getByText("123.5 hours")).toBeInTheDocument();
    });
  });

  describe("Icons and Visual Elements", () => {
    it("displays correct icons for each statistic", () => {
      render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      expect(screen.getByText("📺")).toBeInTheDocument(); // anime icon
      expect(screen.getByText("📚")).toBeInTheDocument(); // manga icon
      expect(screen.getByText("▶️")).toBeInTheDocument(); // watching icon
      expect(screen.getByText("✅")).toBeInTheDocument(); // completion icon
    });

    it("has correct structure for each stat card", () => {
      const { container } = render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      const animeCard = container.querySelector(".stat-card.anime");
      expect(animeCard?.querySelector(".stat-icon")).toBeInTheDocument();
      expect(animeCard?.querySelector(".stat-content")).toBeInTheDocument();
      expect(animeCard?.querySelector(".stat-number")).toBeInTheDocument();
      expect(animeCard?.querySelector(".stat-subtitle")).toBeInTheDocument();
    });
  });

  describe("Edge Cases and Zero Values", () => {
    it("handles zero values correctly", () => {
      const zeroStats: UserStatistics = {
        ...mockUserStats,
        total_anime_watched: 0,
        total_manga_read: 0,
        total_hours_watched: 0,
        total_chapters_read: 0,
        completion_rate: 0,
      };

      const zeroQuickStats: QuickStats = {
        ...mockQuickStats,
        watching: 0,
      };

      render(<StatisticsCards userStats={zeroStats} quickStats={zeroQuickStats} />);

      expect(screen.getByText("0")).toBeInTheDocument(); // Should appear multiple times
      expect(screen.getByText("0.0 hours")).toBeInTheDocument();
      expect(screen.getByText("0 chapters")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("handles very large numbers correctly", () => {
      const largeStats: UserStatistics = {
        ...mockUserStats,
        total_anime_watched: 9999,
        total_manga_read: 8888,
        total_hours_watched: 99999.9,
        total_chapters_read: 88888,
        completion_rate: 100,
      };

      const largeQuickStats: QuickStats = {
        ...mockQuickStats,
        watching: 999,
      };

      render(<StatisticsCards userStats={largeStats} quickStats={largeQuickStats} />);

      expect(screen.getByText("9999")).toBeInTheDocument();
      expect(screen.getByText("8888")).toBeInTheDocument();
      expect(screen.getByText("99999.9 hours")).toBeInTheDocument();
      expect(screen.getByText("88888 chapters")).toBeInTheDocument();
      expect(screen.getByText("999")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("handles decimal hours correctly", () => {
      const decimalStats: UserStatistics = {
        ...mockUserStats,
        total_hours_watched: 1234.0, // Should display as 1234.0
      };

      render(<StatisticsCards userStats={decimalStats} quickStats={mockQuickStats} />);

      expect(screen.getByText("1234.0 hours")).toBeInTheDocument();
    });

    it("handles missing or undefined data gracefully", () => {
      const partialStats = {
        ...mockUserStats,
        total_hours_watched: undefined as any,
        total_chapters_read: undefined as any,
      };

      const partialQuickStats = {
        ...mockQuickStats,
        watching: undefined as any,
      };

      // Should not crash
      render(<StatisticsCards userStats={partialStats} quickStats={partialQuickStats} />);

      // Component should still render other valid data
      expect(screen.getByText("Anime Watched")).toBeInTheDocument();
      expect(screen.getByText("Manga Read")).toBeInTheDocument();
    });
  });

  describe("Component Structure and Accessibility", () => {
    it("uses semantic HTML structure", () => {
      const { container } = render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      // Check for proper heading structure
      const headings = container.querySelectorAll("h3");
      expect(headings).toHaveLength(4);

      // Verify heading content
      expect(screen.getByRole("heading", { name: "Anime Watched" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Manga Read" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Currently Watching" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Completion Rate" })).toBeInTheDocument();
    });

    it("maintains consistent structure across all cards", () => {
      const { container } = render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      const statCards = container.querySelectorAll(".stat-card");

      statCards.forEach((card) => {
        expect(card.querySelector(".stat-icon")).toBeInTheDocument();
        expect(card.querySelector(".stat-content")).toBeInTheDocument();
        expect(card.querySelector(".stat-number")).toBeInTheDocument();
        expect(card.querySelector(".stat-subtitle")).toBeInTheDocument();
      });
    });

    it("has distinguishable content for screen readers", () => {
      render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      // Each statistic should have unique, descriptive text
      expect(screen.getByText("Anime Watched")).toBeInTheDocument();
      expect(screen.getByText("1247.5 hours")).toBeInTheDocument();
      expect(screen.getByText("Manga Read")).toBeInTheDocument();
      expect(screen.getByText("834 chapters")).toBeInTheDocument();
      expect(screen.getByText("Currently Watching")).toBeInTheDocument();
      expect(screen.getByText("In progress")).toBeInTheDocument();
      expect(screen.getByText("Completion Rate")).toBeInTheDocument();
      expect(screen.getByText("Of started items")).toBeInTheDocument();
    });
  });

  describe("Props Validation and Types", () => {
    it("accepts valid UserStatistics props", () => {
      const validStats: UserStatistics = {
        user_id: "test-user",
        total_anime_watched: 10,
        total_manga_read: 5,
        total_hours_watched: 100.5,
        total_chapters_read: 200,
        average_score: 8.5,
        favorite_genres: ["Action"],
        current_streak_days: 5,
        longest_streak_days: 10,
        completion_rate: 75,
        updated_at: "2024-01-01T00:00:00Z",
      };

      const validQuickStats: QuickStats = {
        total_items: 50,
        watching: 10,
        completed: 30,
        plan_to_watch: 5,
        on_hold: 3,
        dropped: 2,
      };

      // Should render without errors
      render(<StatisticsCards userStats={validStats} quickStats={validQuickStats} />);

      expect(screen.getByText("10")).toBeInTheDocument(); // total_anime_watched
      expect(screen.getByText("5")).toBeInTheDocument(); // total_manga_read from UserStatistics
      expect(screen.getByText("10")).toBeInTheDocument(); // watching from QuickStats
      expect(screen.getByText("75%")).toBeInTheDocument(); // completion_rate
    });

    it("renders correctly with minimum required props", () => {
      const minimalStats: UserStatistics = {
        user_id: "test",
        total_anime_watched: 0,
        total_manga_read: 0,
        total_hours_watched: 0,
        total_chapters_read: 0,
        average_score: 0,
        favorite_genres: [],
        current_streak_days: 0,
        longest_streak_days: 0,
        completion_rate: 0,
        updated_at: "2024-01-01T00:00:00Z",
      };

      const minimalQuickStats: QuickStats = {
        total_items: 0,
        watching: 0,
        completed: 0,
        plan_to_watch: 0,
        on_hold: 0,
        dropped: 0,
      };

      render(<StatisticsCards userStats={minimalStats} quickStats={minimalQuickStats} />);

      // Should render with all zero values
      expect(screen.getByText("Anime Watched")).toBeInTheDocument();
      expect(screen.getByText("Manga Read")).toBeInTheDocument();
      expect(screen.getByText("Currently Watching")).toBeInTheDocument();
      expect(screen.getByText("Completion Rate")).toBeInTheDocument();
    });
  });

  describe("Responsive Design Considerations", () => {
    it("maintains grid structure for different screen sizes", () => {
      const { container } = render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      const grid = container.querySelector(".statistics-grid");
      expect(grid).toBeInTheDocument();

      // Should have 4 cards regardless of screen size
      const cards = container.querySelectorAll(".stat-card");
      expect(cards).toHaveLength(4);
    });

    it("maintains readable text content", () => {
      render(<StatisticsCards userStats={mockUserStats} quickStats={mockQuickStats} />);

      // All text should be present and readable
      expect(screen.getByText("45")).toBeInTheDocument();
      expect(screen.getByText("28")).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument();
      expect(screen.getByText("87%")).toBeInTheDocument();
    });
  });
});
