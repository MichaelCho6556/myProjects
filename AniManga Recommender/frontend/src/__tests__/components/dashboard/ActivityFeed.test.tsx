/**
 * Comprehensive ActivityFeed Component Tests for AniManga Recommender
 * Phase B2: Dashboard Components Testing
 *
 * Test Coverage:
 * - Activity list rendering and display
 * - Activity type handling and text generation
 * - Time formatting and calculations
 * - Empty state handling
 * - Link navigation
 * - Data formatting edge cases
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ActivityFeed from "../../../components/dashboard/ActivityFeed";
import { UserActivity } from "../../../types";

// Test wrapper with Router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("ActivityFeed Component", () => {
  const mockActivities: UserActivity[] = [
    {
      id: 1,
      user_id: "user-123",
      activity_type: "completed",
      item_uid: "anime_123",
      activity_data: {},
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      item: {
        uid: "anime_123",
        title: "Attack on Titan",
        media_type: "anime" as const,
        genres: ["Action", "Drama"],
        themes: ["Military"],
        demographics: ["Shounen"],
        score: 9.0,
        scored_by: 1500000,
        status: "Finished Airing",
        episodes: 75,
        start_date: "2013-04-07",
        rating: "R - 17+ (violence & profanity)",
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
      },
    },
    {
      id: 2,
      user_id: "user-123",
      activity_type: "status_changed",
      item_uid: "manga_456",
      activity_data: { new_status: "watching" },
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago (1 day)
      item: {
        uid: "manga_456",
        title: "One Piece",
        media_type: "manga" as const,
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
      },
    },
    {
      id: 3,
      user_id: "user-123",
      activity_type: "added",
      item_uid: "anime_789",
      activity_data: {},
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago (2 days)
      item: {
        uid: "anime_789",
        title: "Demon Slayer",
        media_type: "anime" as const,
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
        synopsis: "Demon slaying anime",
        producers: ["Ufotable"],
        licensors: ["Aniplex"],
        studios: ["Ufotable"],
        authors: [],
        serializations: [],
        title_synonyms: [],
      },
    },
  ];

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      renderWithRouter(<ActivityFeed activities={mockActivities} />);

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    it("renders activity feed with correct structure", () => {
      const { container } = renderWithRouter(<ActivityFeed activities={mockActivities} />);

      expect(container.querySelector(".activity-feed")).toBeInTheDocument();
      expect(container.querySelector(".activity-list")).toBeInTheDocument();
      expect(container.querySelectorAll(".activity-item")).toHaveLength(3);
    });

    it("renders all activity items", () => {
      renderWithRouter(<ActivityFeed activities={mockActivities} />);

      expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      expect(screen.getByText("One Piece")).toBeInTheDocument();
      expect(screen.getByText("Demon Slayer")).toBeInTheDocument();
    });
  });

  describe("Activity Type Handling", () => {
    it("displays completed activity correctly", () => {
      const completedActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "completed",
          item_uid: "anime_123",
          activity_data: {},
          created_at: new Date().toISOString(),
          item: {
            uid: "anime_123",
            title: "Test Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={completedActivity} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("displays status_changed activity correctly", () => {
      const statusChangedActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "status_changed",
          item_uid: "anime_123",
          activity_data: { new_status: "on_hold" },
          created_at: new Date().toISOString(),
          item: {
            uid: "anime_123",
            title: "Test Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={statusChangedActivity} />);

      expect(screen.getByText('Changed status to "on_hold"')).toBeInTheDocument();
    });

    it("displays added activity correctly", () => {
      const addedActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "added",
          item_uid: "anime_123",
          activity_data: {},
          created_at: new Date().toISOString(),
          item: {
            uid: "anime_123",
            title: "Test Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={addedActivity} />);

      expect(screen.getByText("Added to list")).toBeInTheDocument();
    });

    it("displays unknown activity type correctly", () => {
      const unknownActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "unknown_type",
          item_uid: "anime_123",
          activity_data: {},
          created_at: new Date().toISOString(),
          item: {
            uid: "anime_123",
            title: "Test Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={unknownActivity} />);

      expect(screen.getByText("unknown_type")).toBeInTheDocument();
    });
  });

  describe("Time Formatting", () => {
    it('displays "Just now" for very recent activities', () => {
      const recentActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "completed",
          item_uid: "anime_123",
          activity_data: {},
          created_at: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
          item: {
            uid: "anime_123",
            title: "Recent Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={recentActivity} />);

      expect(screen.getByText("Just now")).toBeInTheDocument();
    });

    it("displays hours correctly", () => {
      const hourOldActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "completed",
          item_uid: "anime_123",
          activity_data: {},
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          item: {
            uid: "anime_123",
            title: "Hour Old Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={hourOldActivity} />);

      expect(screen.getByText("3 hours ago")).toBeInTheDocument();
    });

    it("displays single hour correctly", () => {
      const oneHourActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "completed",
          item_uid: "anime_123",
          activity_data: {},
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          item: {
            uid: "anime_123",
            title: "One Hour Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={oneHourActivity} />);

      expect(screen.getByText("1 hour ago")).toBeInTheDocument();
    });

    it("displays days correctly", () => {
      const dayOldActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "completed",
          item_uid: "anime_123",
          activity_data: {},
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          item: {
            uid: "anime_123",
            title: "Day Old Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={dayOldActivity} />);

      expect(screen.getByText("3 days ago")).toBeInTheDocument();
    });

    it("displays single day correctly", () => {
      const oneDayActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "completed",
          item_uid: "anime_123",
          activity_data: {},
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          item: {
            uid: "anime_123",
            title: "One Day Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={oneDayActivity} />);

      expect(screen.getByText("1 day ago")).toBeInTheDocument();
    });
  });

  describe("Empty State Handling", () => {
    it("displays empty state when no activities", () => {
      renderWithRouter(<ActivityFeed activities={[]} />);

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(
        screen.getByText("No recent activity. Start watching or reading something!")
      ).toBeInTheDocument();
    });

    it("has correct empty state structure", () => {
      const { container } = renderWithRouter(<ActivityFeed activities={[]} />);

      expect(container.querySelector(".activity-feed")).toBeInTheDocument();
      expect(container.querySelector(".no-activity")).toBeInTheDocument();
      expect(container.querySelector(".activity-list")).not.toBeInTheDocument();
    });

    it("encourages user action in empty state", () => {
      renderWithRouter(<ActivityFeed activities={[]} />);

      const encouragementText = screen.getByText("No recent activity. Start watching or reading something!");
      expect(encouragementText).toBeInTheDocument();
    });
  });

  describe("Link Navigation", () => {
    it("creates correct links to item detail pages", () => {
      renderWithRouter(<ActivityFeed activities={mockActivities} />);

      const links = screen.getAllByRole("link");

      // Should have links for each activity item
      expect(links.length).toBeGreaterThan(0);

      // Check specific link paths
      const attackOnTitanLink = screen.getByRole("link", { name: "Attack on Titan" });
      expect(attackOnTitanLink).toHaveAttribute("href", "/item/anime_123");

      const onePieceLink = screen.getByRole("link", { name: "One Piece" });
      expect(onePieceLink).toHaveAttribute("href", "/item/manga_456");

      const demonSlayerLink = screen.getByRole("link", { name: "Demon Slayer" });
      expect(demonSlayerLink).toHaveAttribute("href", "/item/anime_789");
    });

    it("handles links for activities with missing item data", () => {
      const activityWithoutItem: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "completed",
          item_uid: "missing_item",
          activity_data: {},
          created_at: new Date().toISOString(),
        },
      ];

      renderWithRouter(<ActivityFeed activities={activityWithoutItem} />);

      expect(screen.getByText("Unknown Item")).toBeInTheDocument();

      const unknownLink = screen.getByRole("link", { name: "Unknown Item" });
      expect(unknownLink).toHaveAttribute("href", "/item/missing_item");
    });
  });

  describe("Activity Structure and Content", () => {
    it("displays activity header correctly", () => {
      renderWithRouter(<ActivityFeed activities={[mockActivities[0]]} />);

      // Should have activity header with title and time
      expect(screen.getByText("Attack on Titan")).toBeInTheDocument();
      expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    });

    it("displays activity description correctly", () => {
      renderWithRouter(<ActivityFeed activities={[mockActivities[0]]} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("has correct activity item structure", () => {
      const { container } = renderWithRouter(<ActivityFeed activities={[mockActivities[0]]} />);

      const activityItem = container.querySelector(".activity-item");
      expect(activityItem).toBeInTheDocument();

      expect(activityItem?.querySelector(".activity-content")).toBeInTheDocument();
      expect(activityItem?.querySelector(".activity-header")).toBeInTheDocument();
      expect(activityItem?.querySelector(".activity-title")).toBeInTheDocument();
      expect(activityItem?.querySelector(".activity-time")).toBeInTheDocument();
      expect(activityItem?.querySelector(".activity-description")).toBeInTheDocument();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles invalid date strings gracefully", () => {
      const invalidDateActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "completed",
          item_uid: "anime_123",
          activity_data: {},
          created_at: "invalid-date-string",
          item: {
            uid: "anime_123",
            title: "Test Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      // Should not crash
      renderWithRouter(<ActivityFeed activities={invalidDateActivity} />);

      expect(screen.getByText("Test Anime")).toBeInTheDocument();
    });

    it("handles missing activity_data gracefully", () => {
      const missingDataActivity: UserActivity[] = [
        {
          id: 1,
          user_id: "user-123",
          activity_type: "status_changed",
          item_uid: "anime_123",
          activity_data: {},
          created_at: new Date().toISOString(),
          item: {
            uid: "anime_123",
            title: "Test Anime",
            media_type: "anime" as const,
            genres: [],
            themes: [],
            demographics: [],
            score: 8.0,
            scored_by: 1000,
            status: "Finished Airing",
            start_date: "2020-01-01",
            popularity: 100,
            members: 10000,
            favorites: 1000,
            synopsis: "Test synopsis",
            producers: [],
            licensors: [],
            studios: [],
            authors: [],
            serializations: [],
            title_synonyms: [],
          },
        },
      ];

      renderWithRouter(<ActivityFeed activities={missingDataActivity} />);

      // Should display the activity type when new_status is missing
      expect(screen.getByText('Changed status to "undefined"')).toBeInTheDocument();
    });

    it("handles very large activity lists", () => {
      const manyActivities: UserActivity[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        user_id: "user-123",
        activity_type: "completed",
        item_uid: `anime_${i}`,
        activity_data: {},
        created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        item: {
          uid: `anime_${i}`,
          title: `Anime ${i}`,
          media_type: "anime" as const,
          genres: [],
          themes: [],
          demographics: [],
          score: 8.0,
          scored_by: 1000,
          status: "Finished Airing",
          start_date: "2020-01-01",
          popularity: 100,
          members: 10000,
          favorites: 1000,
          synopsis: "Test synopsis",
          producers: [],
          licensors: [],
          studios: [],
          authors: [],
          serializations: [],
          title_synonyms: [],
        },
      }));

      renderWithRouter(<ActivityFeed activities={manyActivities} />);

      // Should render all activities
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(screen.getByText("Anime 0")).toBeInTheDocument();
      expect(screen.getByText("Anime 99")).toBeInTheDocument();
    });
  });
});
