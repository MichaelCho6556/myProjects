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

      const skeleton = screen.getByRole("status");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("skeleton-item-card");
    });

    it("has proper loading attributes", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
      expect(skeleton).toHaveAttribute("aria-label", "Loading item");
    });

    it("applies custom className when provided", () => {
      render(<ItemCardSkeleton className="custom-skeleton" />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("skeleton-item-card", "custom-skeleton");
    });
  });

  describe("Card Structure", () => {
    it("contains skeleton image area", () => {
      render(<ItemCardSkeleton />);

      const imageArea = document.querySelector(".skeleton-item-image");
      expect(imageArea).toBeInTheDocument();
      expect(imageArea).toHaveClass("skeleton-item-image", "skeleton-shimmer");
    });

    it("contains skeleton content section", () => {
      render(<ItemCardSkeleton />);

      const contentArea = document.querySelector(".skeleton-item-content");
      expect(contentArea).toBeInTheDocument();
      expect(contentArea).toHaveClass("skeleton-item-content");
    });

    it("contains skeleton title area", () => {
      render(<ItemCardSkeleton />);

      const titleArea = document.querySelector(".skeleton-item-title");
      expect(titleArea).toBeInTheDocument();
      expect(titleArea).toHaveClass("skeleton-item-title", "skeleton-shimmer");
    });

    it("contains skeleton metadata areas", () => {
      render(<ItemCardSkeleton />);

      const metaAreas = document.querySelectorAll(".skeleton-item-meta");
      expect(metaAreas.length).toBe(2);
      metaAreas.forEach((area) => {
        expect(area).toHaveClass("skeleton-item-meta", "skeleton-shimmer");
      });
    });

    it("contains skeleton tags area", () => {
      render(<ItemCardSkeleton />);

      const tagsArea = document.querySelector(".skeleton-item-tags");
      expect(tagsArea).toBeInTheDocument();
      expect(tagsArea).toHaveClass("skeleton-item-tags");
    });

    it("contains skeleton score area", () => {
      render(<ItemCardSkeleton />);

      const scoreArea = document.querySelector(".skeleton-item-score");
      expect(scoreArea).toBeInTheDocument();
      expect(scoreArea).toHaveClass("skeleton-item-score", "skeleton-shimmer");
    });
  });

  describe("Enhanced Features", () => {
    it("contains skeleton details section", () => {
      render(<ItemCardSkeleton />);

      const detailsSection = document.querySelector(".skeleton-item-details");
      expect(detailsSection).toBeInTheDocument();
      expect(detailsSection).toHaveClass("skeleton-item-details");
    });

    it("has multiple skeleton tag elements", () => {
      render(<ItemCardSkeleton />);

      const tagElements = document.querySelectorAll(".skeleton-tag");
      expect(tagElements.length).toBe(3);

      tagElements.forEach((tag) => {
        expect(tag).toHaveClass("skeleton-tag", "skeleton-shimmer");
      });
    });

    it("has different sized skeleton elements", () => {
      render(<ItemCardSkeleton />);

      const shortElements = document.querySelectorAll(".short");
      expect(shortElements.length).toBeGreaterThan(0);

      shortElements.forEach((element) => {
        expect(element).toHaveClass("short");
      });
    });
  });

  describe("Animation and Visual Effects", () => {
    it("applies shimmer animation to appropriate elements", () => {
      render(<ItemCardSkeleton />);

      const shimmerElements = document.querySelectorAll(".skeleton-shimmer");
      expect(shimmerElements.length).toBeGreaterThan(0);

      shimmerElements.forEach((element) => {
        expect(element).toHaveClass("skeleton-shimmer");
      });
    });

    it("has proper skeleton structure for visual loading", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("skeleton-item-card");
    });

    it("contains all necessary visual elements", () => {
      render(<ItemCardSkeleton />);

      const imageElement = document.querySelector(".skeleton-item-image");
      const titleElement = document.querySelector(".skeleton-item-title");
      const scoreElement = document.querySelector(".skeleton-item-score");

      expect(imageElement).toBeInTheDocument();
      expect(titleElement).toBeInTheDocument();
      expect(scoreElement).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("maintains proper card structure", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("skeleton-item-card");
    });

    it("has image area with proper styling", () => {
      render(<ItemCardSkeleton />);

      const imageArea = document.querySelector(".skeleton-item-image");
      expect(imageArea).toHaveClass("skeleton-item-image");
    });

    it("has content layout structure", () => {
      render(<ItemCardSkeleton />);

      const contentArea = document.querySelector(".skeleton-item-content");
      expect(contentArea).toHaveClass("skeleton-item-content");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByLabelText(/loading item/i);
      expect(skeleton).toBeInTheDocument();
    });

    it("is announced to screen readers", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });

    it("has semantic structure for assistive technology", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveAttribute("role", "status");
      expect(skeleton).toHaveAttribute("aria-label", "Loading item");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
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

      const skeletons = screen.getAllByRole("status");
      expect(skeletons).toHaveLength(3);

      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveClass("skeleton-item-card");
      });
    });

    it("supports count prop for multiple skeletons", () => {
      render(<ItemCardSkeleton count={3} />);

      const skeletons = screen.getAllByRole("status");
      expect(skeletons).toHaveLength(3);

      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveClass("skeleton-item-card");
      });
    });
  });

  describe("Performance Considerations", () => {
    it("renders efficiently with minimal DOM nodes", () => {
      const { container } = render(<ItemCardSkeleton />);

      // Count DOM nodes to ensure skeleton is lightweight
      const nodeCount = container.querySelectorAll("*").length;
      expect(nodeCount).toBeLessThan(15); // Keep skeleton lightweight
    });

    it("uses appropriate structure for loading state", () => {
      render(<ItemCardSkeleton />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("skeleton-item-card");

      // Check that it has the expected number of child elements
      const shimmerElements = document.querySelectorAll(".skeleton-shimmer");
      expect(shimmerElements.length).toBeGreaterThan(0);
    });
  });
});
