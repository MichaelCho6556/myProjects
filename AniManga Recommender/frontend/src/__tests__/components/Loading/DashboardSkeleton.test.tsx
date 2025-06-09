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

      const skeleton = screen.getByLabelText("Loading dashboard content");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("dashboard-skeleton");
    });

    it("has proper loading state attributes", () => {
      render(<DashboardSkeleton />);

      const skeleton = screen.getByLabelText("Loading dashboard content");
      expect(skeleton).toHaveAttribute("aria-label", "Loading dashboard content");
    });
  });

  describe("Stats Grid Structure", () => {
    it("renders stats grid skeleton", () => {
      render(<DashboardSkeleton />);

      const statsGrid = document.querySelector(".skeleton-stats-grid");
      expect(statsGrid).toBeInTheDocument();
      expect(statsGrid).toHaveClass("skeleton-stats-grid");
    });

    it("renders correct number of stat cards", () => {
      render(<DashboardSkeleton />);

      const statCards = document.querySelectorAll(".skeleton-stat-card");
      expect(statCards).toHaveLength(4);

      statCards.forEach((card) => {
        expect(card).toHaveClass("skeleton-stat-card");
      });
    });

    it("stat cards have proper structure", () => {
      render(<DashboardSkeleton />);

      const statCards = document.querySelectorAll(".skeleton-stat-card");

      statCards.forEach((card) => {
        expect(card.querySelector(".skeleton-stat-number")).toBeInTheDocument();
        expect(card.querySelector(".skeleton-stat-label")).toBeInTheDocument();
        expect(card.querySelector(".skeleton-stat-icon")).toBeInTheDocument();
      });
    });
  });

  describe("Activity Feed Structure", () => {
    it("renders activity feed skeleton", () => {
      render(<DashboardSkeleton />);

      const activityFeed = document.querySelector(".skeleton-activity-feed");
      expect(activityFeed).toBeInTheDocument();
      expect(activityFeed).toHaveClass("skeleton-activity-feed");
    });

    it("renders correct number of activity items", () => {
      render(<DashboardSkeleton />);

      const activityItems = document.querySelectorAll(".skeleton-activity-item");
      expect(activityItems).toHaveLength(5);

      activityItems.forEach((item) => {
        expect(item).toHaveClass("skeleton-activity-item");
      });
    });

    it("activity items have proper structure", () => {
      render(<DashboardSkeleton />);

      const activityItems = document.querySelectorAll(".skeleton-activity-item");

      activityItems.forEach((item) => {
        expect(item.querySelector(".skeleton-activity-content")).toBeInTheDocument();
        expect(item.querySelector(".skeleton-activity-time")).toBeInTheDocument();
        expect(item.querySelector(".skeleton-activity-title")).toBeInTheDocument();
        expect(item.querySelector(".skeleton-activity-description")).toBeInTheDocument();
      });
    });
  });

  describe("Quick Actions Structure", () => {
    it("renders quick actions skeleton", () => {
      render(<DashboardSkeleton />);

      const quickActions = document.querySelector(".skeleton-quick-actions");
      expect(quickActions).toBeInTheDocument();
      expect(quickActions).toHaveClass("skeleton-quick-actions");
    });

    it("renders action buttons", () => {
      render(<DashboardSkeleton />);

      const actionButtons = document.querySelectorAll(".skeleton-action-button");
      expect(actionButtons).toHaveLength(4);

      actionButtons.forEach((button) => {
        expect(button).toHaveClass("skeleton-action-button");
        expect(button.querySelector(".skeleton-action-icon")).toBeInTheDocument();
        expect(button.querySelector(".skeleton-action-text")).toBeInTheDocument();
      });
    });
  });

  describe("Animation and Styling", () => {
    it("renders all skeleton elements with proper classes", () => {
      render(<DashboardSkeleton />);

      const statCards = document.querySelectorAll(".skeleton-stat-card");
      const activityItems = document.querySelectorAll(".skeleton-activity-item");
      const actionButtons = document.querySelectorAll(".skeleton-action-button");

      expect(statCards.length).toBeGreaterThan(0);
      expect(activityItems.length).toBeGreaterThan(0);
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it("has dashboard skeleton structure", () => {
      render(<DashboardSkeleton />);

      const skeleton = screen.getByLabelText("Loading dashboard content");
      expect(skeleton).toHaveClass("dashboard-skeleton");
    });

    it("maintains responsive layout structure", () => {
      render(<DashboardSkeleton />);

      const statsGrid = document.querySelector(".skeleton-stats-grid");
      expect(statsGrid).toHaveClass("skeleton-stats-grid");

      const activityFeed = document.querySelector(".skeleton-activity-feed");
      expect(activityFeed).toHaveClass("skeleton-activity-feed");

      const dashboardGrid = document.querySelector(".skeleton-dashboard-grid");
      expect(dashboardGrid).toHaveClass("skeleton-dashboard-grid");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(<DashboardSkeleton />);

      const skeleton = screen.getByLabelText(/loading dashboard/i);
      expect(skeleton).toBeInTheDocument();
    });

    it("provides semantic structure for screen readers", () => {
      render(<DashboardSkeleton />);

      const skeleton = screen.getByLabelText("Loading dashboard content");
      expect(skeleton).toHaveAttribute("aria-label", "Loading dashboard content");
    });

    it("has proper semantic structure", () => {
      render(<DashboardSkeleton />);

      // Check that main structural elements exist
      const statsGrid = document.querySelector(".skeleton-stats-grid");
      expect(statsGrid).toBeInTheDocument();

      const activityFeed = document.querySelector(".skeleton-activity-feed");
      expect(activityFeed).toBeInTheDocument();

      const dashboardMain = document.querySelector(".skeleton-dashboard-main");
      expect(dashboardMain).toBeInTheDocument();
    });
  });

  describe("Layout Matching", () => {
    it("matches actual dashboard layout structure", () => {
      render(<DashboardSkeleton />);

      // Check that skeleton structure matches expected dashboard layout
      const skeleton = screen.getByLabelText("Loading dashboard content");

      // Should have header area
      expect(skeleton.querySelector(".skeleton-header")).toBeInTheDocument();

      // Should have main content area
      expect(skeleton.querySelector(".skeleton-dashboard-main")).toBeInTheDocument();

      // Should have stats grid
      expect(skeleton.querySelector(".skeleton-stats-grid")).toBeInTheDocument();

      // Should have activity feed
      expect(skeleton.querySelector(".skeleton-activity-feed")).toBeInTheDocument();
    });

    it("has proper item structure for loading states", () => {
      render(<DashboardSkeleton />);

      // Check item lists structure
      const itemLists = document.querySelector(".skeleton-item-lists");
      expect(itemLists).toBeInTheDocument();

      const itemCards = document.querySelectorAll(".skeleton-item-card");
      expect(itemCards.length).toBeGreaterThan(0);

      // Check tabs structure
      const tabs = document.querySelectorAll(".skeleton-tab");
      expect(tabs).toHaveLength(4);
    });
  });
});
