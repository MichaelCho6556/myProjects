/**
 * Unit Tests for SkeletonCard Component
 * Tests loading skeleton display and accessibility
 */

import { render, screen } from "@testing-library/react";
import SkeletonCard from "../../components/SkeletonCard";

describe("SkeletonCard Component", () => {
  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toBeInTheDocument();
    });

    it("applies default skeleton card class", () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("skeleton-card");
    });

    it("applies custom className when provided", () => {
      render(<SkeletonCard className="custom-skeleton" />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("skeleton-card", "custom-skeleton");
    });
  });

  describe("Structure", () => {
    it("contains skeleton image placeholder", () => {
      render(<SkeletonCard />);

      const imageArea = screen.getByTestId("skeleton-image");
      expect(imageArea).toBeInTheDocument();
      expect(imageArea).toHaveClass("skeleton-image");
    });

    it("contains skeleton content area", () => {
      render(<SkeletonCard />);

      const contentArea = screen.getByTestId("skeleton-content");
      expect(contentArea).toBeInTheDocument();
      expect(contentArea).toHaveClass("skeleton-content");
    });

    it("contains skeleton title placeholder", () => {
      render(<SkeletonCard />);

      const titleArea = screen.getByTestId("skeleton-title");
      expect(titleArea).toBeInTheDocument();
      expect(titleArea).toHaveClass("skeleton-title");
    });

    it("contains skeleton text lines", () => {
      render(<SkeletonCard />);

      const textLines = screen.getAllByTestId(/skeleton-text-/);
      expect(textLines.length).toBeGreaterThan(0);

      textLines.forEach((line) => {
        expect(line).toHaveClass("skeleton-text");
      });
    });

    it("contains skeleton score area", () => {
      render(<SkeletonCard />);

      const scoreArea = screen.getByTestId("skeleton-score");
      expect(scoreArea).toBeInTheDocument();
      expect(scoreArea).toHaveClass("skeleton-score");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA label for loading state", () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByLabelText(/loading/i);
      expect(skeleton).toBeInTheDocument();
    });

    it("has proper role for accessibility", () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toBeInTheDocument();
    });

    it("has aria-busy attribute", () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
    });

    it("has aria-live attribute for screen readers", () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Animation", () => {
    it("has shimmer animation class", () => {
      render(<SkeletonCard />);

      // Check specific elements that should have shimmer animation
      const imageElement = screen.getByTestId("skeleton-image");
      const titleElement = screen.getByTestId("skeleton-title");
      const textElements = [
        screen.getByTestId("skeleton-text-1"),
        screen.getByTestId("skeleton-text-2"),
        screen.getByTestId("skeleton-text-3"),
      ];
      const scoreElement = screen.getByTestId("skeleton-score");

      expect(imageElement).toHaveClass("skeleton-shimmer");
      expect(titleElement).toHaveClass("skeleton-shimmer");
      expect(scoreElement).toHaveClass("skeleton-shimmer");
      textElements.forEach((element) => {
        expect(element).toHaveClass("skeleton-shimmer");
      });
    });

    it("applies pulse animation to skeleton elements", () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("skeleton-pulse");
    });
  });

  describe("Layout", () => {
    it("maintains card-like structure", () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("card-layout");
    });

    it("preserves aspect ratio for image area", () => {
      render(<SkeletonCard />);

      const imageArea = screen.getByTestId("skeleton-image");
      expect(imageArea).toHaveClass("aspect-ratio-preserved");
    });

    it("has proper content spacing", () => {
      render(<SkeletonCard />);

      const contentArea = screen.getByTestId("skeleton-content");
      expect(contentArea).toHaveClass("content-spacing");
    });
  });

  describe("Multiple Skeletons", () => {
    it("renders multiple skeleton cards consistently", () => {
      render(
        <div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      );

      const skeletons = screen.getAllByTestId("skeleton-card");
      expect(skeletons).toHaveLength(3);

      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveClass("skeleton-card");
      });
    });

    it("maintains consistent structure across multiple instances", () => {
      render(
        <div>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      );

      const skeletons = screen.getAllByTestId("skeleton-card");

      skeletons.forEach((skeleton) => {
        expect(skeleton.querySelector("[data-testid='skeleton-image']")).toBeInTheDocument();
        expect(skeleton.querySelector("[data-testid='skeleton-content']")).toBeInTheDocument();
        expect(skeleton.querySelector("[data-testid='skeleton-title']")).toBeInTheDocument();
      });
    });
  });

  describe("Performance", () => {
    it("renders efficiently with minimal DOM nodes", () => {
      const { container } = render(<SkeletonCard />);

      // Should not have excessive DOM nodes
      const allNodes = container.querySelectorAll("*");
      expect(allNodes.length).toBeLessThan(15);
    });

    it("does not cause memory leaks on unmount", () => {
      const { unmount } = render(<SkeletonCard />);

      expect(() => unmount()).not.toThrow();
    });

    it("handles rapid mount/unmount cycles", () => {
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<SkeletonCard />);
        unmount();
      }

      // Should not throw any errors
      expect(true).toBe(true);
    });
  });

  describe("Responsive Design", () => {
    it("adapts to different container sizes", () => {
      render(<SkeletonCard className="responsive-skeleton" />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("responsive-skeleton");
    });

    it("maintains proportions on mobile", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 480,
      });

      render(<SkeletonCard />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("skeleton-card");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty className", () => {
      render(<SkeletonCard className="" />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("skeleton-card");
    });

    it("handles null className", () => {
      render(<SkeletonCard className={null as any} />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("skeleton-card");
    });

    it("handles missing className prop", () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("skeleton-card");
    });
  });

  describe("Theming", () => {
    it("supports dark theme", () => {
      render(<SkeletonCard className="dark-theme" />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("dark-theme");
    });

    it("supports light theme", () => {
      render(<SkeletonCard className="light-theme" />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("light-theme");
    });

    it("applies custom color schemes", () => {
      render(<SkeletonCard className="custom-colors" />);

      const skeleton = screen.getByTestId("skeleton-card");
      expect(skeleton).toHaveClass("custom-colors");
    });
  });

  describe("Integration", () => {
    it("works within grid layouts", () => {
      render(
        <div className="grid-layout">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      );

      const skeletons = screen.getAllByTestId("skeleton-card");
      expect(skeletons).toHaveLength(3);
    });

    it("works within flex layouts", () => {
      render(
        <div className="flex-layout">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      );

      const skeletons = screen.getAllByTestId("skeleton-card");
      expect(skeletons).toHaveLength(2);
    });

    it("integrates with loading state management", () => {
      const LoadingComponent = ({ loading }: { loading: boolean }) => (
        <div>{loading ? <SkeletonCard /> : <div>Content loaded</div>}</div>
      );

      const { rerender } = render(<LoadingComponent loading={true} />);
      expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();

      rerender(<LoadingComponent loading={false} />);
      expect(screen.getByText("Content loaded")).toBeInTheDocument();
      expect(screen.queryByTestId("skeleton-card")).not.toBeInTheDocument();
    });
  });

  describe("Content Structure", () => {
    it("simulates actual card content layout", () => {
      render(<SkeletonCard />);

      // Should have elements that mirror real card structure
      expect(screen.getByTestId("skeleton-image")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton-title")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton-score")).toBeInTheDocument();

      const textLines = screen.getAllByTestId(/skeleton-text-/);
      expect(textLines.length).toBeGreaterThanOrEqual(2);
    });

    it("has appropriate dimensions for text placeholders", () => {
      render(<SkeletonCard />);

      const title = screen.getByTestId("skeleton-title");
      const textLines = screen.getAllByTestId(/skeleton-text-/);

      expect(title).toHaveClass("skeleton-title");
      textLines.forEach((line) => {
        expect(line).toHaveClass("skeleton-text");
      });
    });
  });
});
