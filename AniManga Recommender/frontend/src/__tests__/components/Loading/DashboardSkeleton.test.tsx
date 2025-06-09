/**
 * Unit Tests for DashboardSkeleton Component
 * Tests dashboard skeleton loading layout and structure
 */

import { render, screen } from "@testing-library/react";
import DashboardSkeleton from "../../../components/Loading/DashboardSkeleton";

describe("DashboardSkeleton Component", () => {
  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      render(<DashboardSkeleton />);

      const skeleton = screen.getByTestId("dashboard-skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("dashboard-skeleton");
    });

    it("has proper loading state attributes", () => {
      render(<DashboardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Stats Grid Structure", () => {
    it("renders stats grid skeleton", () => {
      render(<DashboardSkeleton />);

      const statsGrid = screen.getByTestId("skeleton-stats-grid");
      expect(statsGrid).toBeInTheDocument();
      expect(statsGrid).toHaveClass("skeleton-stats-grid");
    });

    it("renders correct number of stat cards", () => {
      render(<DashboardSkeleton />);

      const statCards = screen.getAllByTestId(/skeleton-stat-card-/);
      expect(statCards).toHaveLength(4);

      statCards.forEach((card, index) => {
        expect(card).toHaveClass("skeleton-stat-card");
        expect(card).toHaveAttribute("data-testid", `skeleton-stat-card-${index}`);
      });
    });

    it("stat cards have proper structure", () => {
      render(<DashboardSkeleton />);

      const statCards = screen.getAllByTestId(/skeleton-stat-card-/);

      statCards.forEach((card) => {
        expect(card.querySelector(".skeleton-stat-value")).toBeInTheDocument();
        expect(card.querySelector(".skeleton-stat-label")).toBeInTheDocument();
        expect(card.querySelector(".skeleton-stat-icon")).toBeInTheDocument();
      });
    });
  });

  describe("Activity Feed Structure", () => {
    it("renders activity feed skeleton", () => {
      render(<DashboardSkeleton />);

      const activityFeed = screen.getByTestId("skeleton-activity-feed");
      expect(activityFeed).toBeInTheDocument();
      expect(activityFeed).toHaveClass("skeleton-activity-feed");
    });

    it("renders correct number of activity items", () => {
      render(<DashboardSkeleton />);

      const activityItems = screen.getAllByTestId(/skeleton-activity-item-/);
      expect(activityItems).toHaveLength(5);

      activityItems.forEach((item, index) => {
        expect(item).toHaveClass("skeleton-activity-item");
        expect(item).toHaveAttribute("data-testid", `skeleton-activity-item-${index}`);
      });
    });

    it("activity items have proper structure", () => {
      render(<DashboardSkeleton />);

      const activityItems = screen.getAllByTestId(/skeleton-activity-item-/);

      activityItems.forEach((item) => {
        expect(item.querySelector(".skeleton-activity-avatar")).toBeInTheDocument();
        expect(item.querySelector(".skeleton-activity-content")).toBeInTheDocument();
        expect(item.querySelector(".skeleton-activity-timestamp")).toBeInTheDocument();
      });
    });
  });

  describe("Charts Section Structure", () => {
    it("renders charts section skeleton", () => {
      render(<DashboardSkeleton />);

      const chartsSection = screen.getByTestId("skeleton-charts-section");
      expect(chartsSection).toBeInTheDocument();
      expect(chartsSection).toHaveClass("skeleton-charts-section");
    });

    it("renders chart placeholders", () => {
      render(<DashboardSkeleton />);

      const chartPlaceholders = screen.getAllByTestId(/skeleton-chart-/);
      expect(chartPlaceholders.length).toBeGreaterThan(0);

      chartPlaceholders.forEach((chart) => {
        expect(chart).toHaveClass("skeleton-chart-placeholder");
      });
    });
  });

  describe("Animation and Styling", () => {
    it("applies shimmer animation to all skeleton elements", () => {
      render(<DashboardSkeleton />);

      const skeletonElements = [
        ...screen.getAllByTestId(/skeleton-stat-card-/),
        ...screen.getAllByTestId(/skeleton-activity-item-/),
        ...screen.getAllByTestId(/skeleton-chart-/),
      ];

      skeletonElements.forEach((element) => {
        expect(element).toHaveClass("skeleton-shimmer");
      });
    });

    it("has pulse animation class", () => {
      render(<DashboardSkeleton />);

      const skeleton = screen.getByTestId("dashboard-skeleton");
      expect(skeleton).toHaveClass("skeleton-pulse");
    });

    it("maintains responsive layout classes", () => {
      render(<DashboardSkeleton />);

      const statsGrid = screen.getByTestId("skeleton-stats-grid");
      expect(statsGrid).toHaveClass("responsive-grid");

      const activityFeed = screen.getByTestId("skeleton-activity-feed");
      expect(activityFeed).toHaveClass("responsive-feed");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(<DashboardSkeleton />);

      const skeleton = screen.getByLabelText(/loading dashboard/i);
      expect(skeleton).toBeInTheDocument();
    });

    it("announces loading state to screen readers", () => {
      render(<DashboardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toBeInTheDocument();
    });

    it("has proper landmark roles", () => {
      render(<DashboardSkeleton />);

      const statsSection = screen.getByTestId("skeleton-stats-grid");
      expect(statsSection).toHaveAttribute("role", "region");
      expect(statsSection).toHaveAttribute("aria-label", "Loading statistics");

      const activitySection = screen.getByTestId("skeleton-activity-feed");
      expect(activitySection).toHaveAttribute("role", "region");
      expect(activitySection).toHaveAttribute("aria-label", "Loading activity feed");
    });
  });

  describe("Layout Matching", () => {
    it("matches actual dashboard layout structure", () => {
      render(<DashboardSkeleton />);

      // Check that skeleton structure matches expected dashboard layout
      const skeleton = screen.getByTestId("dashboard-skeleton");

      // Should have header area
      expect(skeleton.querySelector(".skeleton-dashboard-header")).toBeInTheDocument();

      // Should have main content area
      expect(skeleton.querySelector(".skeleton-dashboard-main")).toBeInTheDocument();

      // Should have sidebar area
      expect(skeleton.querySelector(".skeleton-dashboard-sidebar")).toBeInTheDocument();
    });

    it("preserves aspect ratios for chart areas", () => {
      render(<DashboardSkeleton />);

      const chartPlaceholders = screen.getAllByTestId(/skeleton-chart-/);

      chartPlaceholders.forEach((chart) => {
        expect(chart).toHaveClass("aspect-ratio-preserved");
      });
    });
  });
});
