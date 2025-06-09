/**
 * Unit Tests for ItemCardSkeleton Component
 * Tests item card skeleton with proper structure matching
 */

import { render, screen } from "@testing-library/react";
import ItemCardSkeleton from "../../../components/Loading/ItemCardSkeleton";

describe("ItemCardSkeleton Component", () => {
  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByTestId("item-card-skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("skeleton-item-card");
    });

    it("has proper loading attributes", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });

    it("applies custom className when provided", () => {
      render(<ItemCardSkeleton className="custom-skeleton" />);

      const skeleton = screen.getByTestId("item-card-skeleton");
      expect(skeleton).toHaveClass("skeleton-item-card", "custom-skeleton");
    });
  });

  describe("Card Structure", () => {
    it("contains skeleton image area", () => {
      render(<ItemCardSkeleton />);

      const imageArea = screen.getByTestId("skeleton-image");
      expect(imageArea).toBeInTheDocument();
      expect(imageArea).toHaveClass("skeleton-image");
    });

    it("contains skeleton content section", () => {
      render(<ItemCardSkeleton />);

      const contentArea = screen.getByTestId("skeleton-content");
      expect(contentArea).toBeInTheDocument();
      expect(contentArea).toHaveClass("skeleton-content");
    });

    it("contains skeleton title area", () => {
      render(<ItemCardSkeleton />);

      const titleArea = screen.getByTestId("skeleton-title");
      expect(titleArea).toBeInTheDocument();
      expect(titleArea).toHaveClass("skeleton-title");
    });

    it("contains skeleton metadata areas", () => {
      render(<ItemCardSkeleton />);

      const metaArea = screen.getByTestId("skeleton-meta");
      expect(metaArea).toBeInTheDocument();
      expect(metaArea).toHaveClass("skeleton-meta");
    });

    it("contains skeleton tags area", () => {
      render(<ItemCardSkeleton />);

      const tagsArea = screen.getByTestId("skeleton-tags");
      expect(tagsArea).toBeInTheDocument();
      expect(tagsArea).toHaveClass("skeleton-tags");
    });

    it("contains skeleton score area", () => {
      render(<ItemCardSkeleton />);

      const scoreArea = screen.getByTestId("skeleton-score");
      expect(scoreArea).toBeInTheDocument();
      expect(scoreArea).toHaveClass("skeleton-score");
    });
  });

  describe("Enhanced Features", () => {
    it("contains skeleton synopsis lines", () => {
      render(<ItemCardSkeleton />);

      const synopsisLines = screen.getAllByTestId(/skeleton-synopsis-line-/);
      expect(synopsisLines.length).toBeGreaterThanOrEqual(2);
      expect(synopsisLines.length).toBeLessThanOrEqual(4);

      synopsisLines.forEach((line) => {
        expect(line).toHaveClass("skeleton-synopsis-line");
      });
    });

    it("contains skeleton action buttons area", () => {
      render(<ItemCardSkeleton />);

      const actionsArea = screen.getByTestId("skeleton-actions");
      expect(actionsArea).toBeInTheDocument();
      expect(actionsArea).toHaveClass("skeleton-actions");
    });

    it("has skeleton tag pills", () => {
      render(<ItemCardSkeleton />);

      const tagPills = screen.getAllByTestId(/skeleton-tag-/);
      expect(tagPills.length).toBeGreaterThan(0);

      tagPills.forEach((pill) => {
        expect(pill).toHaveClass("skeleton-tag-pill");
      });
    });
  });

  describe("Animation and Visual Effects", () => {
    it("applies shimmer animation to all elements", () => {
      render(<ItemCardSkeleton />);

      const animatedElements = [
        screen.getByTestId("skeleton-image"),
        screen.getByTestId("skeleton-title"),
        screen.getByTestId("skeleton-meta"),
        screen.getByTestId("skeleton-tags"),
        screen.getByTestId("skeleton-score"),
      ];

      animatedElements.forEach((element) => {
        expect(element).toHaveClass("skeleton-shimmer");
      });
    });

    it("has gradient loading animation", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByTestId("item-card-skeleton");
      expect(skeleton).toHaveClass("skeleton-gradient-loading");
    });

    it("applies different animation delays for staggered effect", () => {
      render(<ItemCardSkeleton />);

      const titleArea = screen.getByTestId("skeleton-title");
      const metaArea = screen.getByTestId("skeleton-meta");
      const tagsArea = screen.getByTestId("skeleton-tags");

      expect(titleArea).toHaveStyle("animation-delay: 0.1s");
      expect(metaArea).toHaveStyle("animation-delay: 0.2s");
      expect(tagsArea).toHaveStyle("animation-delay: 0.3s");
    });
  });

  describe("Responsive Design", () => {
    it("maintains card aspect ratio", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByTestId("item-card-skeleton");
      expect(skeleton).toHaveClass("aspect-ratio-card");
    });

    it("has responsive image area", () => {
      render(<ItemCardSkeleton />);

      const imageArea = screen.getByTestId("skeleton-image");
      expect(imageArea).toHaveClass("responsive-image");
    });

    it("adapts content layout for different screen sizes", () => {
      render(<ItemCardSkeleton />);

      const contentArea = screen.getByTestId("skeleton-content");
      expect(contentArea).toHaveClass("responsive-content");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByLabelText(/loading item card/i);
      expect(skeleton).toBeInTheDocument();
    });

    it("is announced to screen readers", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });

    it("has semantic structure for assistive technology", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByTestId("item-card-skeleton");
      expect(skeleton).toHaveAttribute("role", "status");
      expect(skeleton).toHaveAttribute("aria-label", "Loading item card");
    });
  });

  describe("Grid Layout Compatibility", () => {
    it("renders consistently in grid layout", () => {
      render(
        <div className="item-grid">
          <ItemCardSkeleton />
          <ItemCardSkeleton />
          <ItemCardSkeleton />
        </div>
      );

      const skeletons = screen.getAllByTestId("item-card-skeleton");
      expect(skeletons).toHaveLength(3);

      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveClass("grid-item");
      });
    });

    it("maintains consistent spacing in grid", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByTestId("item-card-skeleton");
      expect(skeleton).toHaveClass("grid-spacing");
    });
  });

  describe("Performance Considerations", () => {
    it("renders efficiently with minimal DOM nodes", () => {
      const { container } = render(<ItemCardSkeleton />);

      // Count DOM nodes to ensure skeleton is lightweight
      const nodeCount = container.querySelectorAll("*").length;
      expect(nodeCount).toBeLessThan(15); // Keep skeleton lightweight
    });

    it("uses CSS-only animations for performance", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByTestId("item-card-skeleton");
      expect(skeleton).toHaveClass("css-only-animation");
    });
  });
});
