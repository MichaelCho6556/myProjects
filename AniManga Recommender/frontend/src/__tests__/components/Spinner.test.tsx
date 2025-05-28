/**
 * Unit Tests for Spinner Component
 * Tests rendering, props handling, styling, accessibility, and edge cases
 */

import { render, screen } from "@testing-library/react";
import Spinner from "../../components/Spinner";

describe("Spinner Component", () => {
  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      render(<Spinner />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("has correct default CSS class", () => {
      render(<Spinner />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("loading-spinner");
    });

    it("has correct accessibility attributes", () => {
      render(<Spinner />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("role", "status");
      expect(spinner).toHaveAttribute("aria-label", "Loading");
    });
  });

  describe("Size Prop", () => {
    it("applies default size when no size prop is provided", () => {
      render(<Spinner />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "50px",
        height: "50px",
      });
    });

    it("applies custom size as string", () => {
      render(<Spinner size="100px" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "100px",
        height: "100px",
      });
    });

    it("converts number size to px string", () => {
      render(<Spinner size={75} />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "75px",
        height: "75px",
      });
    });

    it("handles different size units", () => {
      render(<Spinner size="2rem" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "2rem",
        height: "2rem",
      });
    });

    it("handles percentage sizes", () => {
      render(<Spinner size="50%" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "50%",
        height: "50%",
      });
    });

    it("handles very small sizes", () => {
      render(<Spinner size="10px" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "10px",
        height: "10px",
      });
    });

    it("handles very large sizes", () => {
      render(<Spinner size="200px" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "200px",
        height: "200px",
      });
    });
  });

  describe("Color Prop", () => {
    it("applies default color when no color prop is provided", () => {
      render(<Spinner />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        borderTopColor: "var(--accent-primary)",
        borderRightColor: "var(--accent-primary)",
        borderBottomColor: "var(--accent-primary)",
        borderLeftColor: "transparent",
      });
    });

    it("applies custom color", () => {
      render(<Spinner color="#ff0000" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        borderTopColor: "#ff0000",
        borderRightColor: "#ff0000",
        borderBottomColor: "#ff0000",
        borderLeftColor: "transparent",
      });
    });

    it("applies CSS color names", () => {
      render(<Spinner color="blue" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        borderTopColor: "blue",
        borderRightColor: "blue",
        borderBottomColor: "blue",
        borderLeftColor: "transparent",
      });
    });

    it("applies RGB color values", () => {
      render(<Spinner color="rgb(255, 0, 0)" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        borderTopColor: "rgb(255, 0, 0)",
        borderRightColor: "rgb(255, 0, 0)",
        borderBottomColor: "rgb(255, 0, 0)",
        borderLeftColor: "transparent",
      });
    });

    it("applies RGBA color values", () => {
      render(<Spinner color="rgba(255, 0, 0, 0.5)" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        borderTopColor: "rgba(255, 0, 0, 0.5)",
        borderRightColor: "rgba(255, 0, 0, 0.5)",
        borderBottomColor: "rgba(255, 0, 0, 0.5)",
        borderLeftColor: "transparent",
      });
    });

    it("applies HSL color values", () => {
      render(<Spinner color="hsl(0, 100%, 50%)" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        borderTopColor: "hsl(0, 100%, 50%)",
        borderRightColor: "hsl(0, 100%, 50%)",
        borderBottomColor: "hsl(0, 100%, 50%)",
        borderLeftColor: "transparent",
      });
    });

    it("always keeps left border transparent for spin effect", () => {
      render(<Spinner color="#ff0000" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        borderLeftColor: "transparent",
      });
    });
  });

  describe("ClassName Prop", () => {
    it("applies default className when no className prop is provided", () => {
      render(<Spinner />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("loading-spinner");
      expect(spinner.className).toBe("loading-spinner ");
    });

    it("applies custom className in addition to default", () => {
      render(<Spinner className="custom-spinner" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("loading-spinner");
      expect(spinner).toHaveClass("custom-spinner");
    });

    it("applies multiple custom classes", () => {
      render(<Spinner className="custom-spinner large-spinner" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("loading-spinner");
      expect(spinner).toHaveClass("custom-spinner");
      expect(spinner).toHaveClass("large-spinner");
    });

    it("handles empty className gracefully", () => {
      render(<Spinner className="" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("loading-spinner");
    });
  });

  describe("Combined Props", () => {
    it("applies all props together correctly", () => {
      render(<Spinner size="80px" color="#00ff00" className="test-spinner" />);

      const spinner = screen.getByRole("status");

      // Check size
      expect(spinner).toHaveStyle({
        width: "80px",
        height: "80px",
      });

      // Check color
      expect(spinner).toHaveStyle({
        borderTopColor: "#00ff00",
        borderRightColor: "#00ff00",
        borderBottomColor: "#00ff00",
        borderLeftColor: "transparent",
      });

      // Check classes
      expect(spinner).toHaveClass("loading-spinner");
      expect(spinner).toHaveClass("test-spinner");
    });

    it("handles all props with number size", () => {
      render(<Spinner size={120} color="purple" className="large-purple-spinner" />);

      const spinner = screen.getByRole("status");

      expect(spinner).toHaveStyle({
        width: "120px",
        height: "120px",
        borderTopColor: "purple",
        borderRightColor: "purple",
        borderBottomColor: "purple",
        borderLeftColor: "transparent",
      });

      expect(spinner).toHaveClass("loading-spinner");
      expect(spinner).toHaveClass("large-purple-spinner");
    });
  });

  describe("Edge Cases", () => {
    it("handles zero size", () => {
      render(<Spinner size={0} />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "0px",
        height: "0px",
      });
    });

    it("handles negative size (though not practical)", () => {
      render(<Spinner size={-10} />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "-10px",
        height: "-10px",
      });
    });

    it("handles empty string size", () => {
      render(<Spinner size="" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "",
        height: "",
      });
    });

    it("handles invalid color gracefully", () => {
      render(<Spinner color="invalid-color" />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        borderTopColor: "invalid-color",
        borderRightColor: "invalid-color",
        borderBottomColor: "invalid-color",
        borderLeftColor: "transparent",
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA role for screen readers", () => {
      render(<Spinner />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("role", "status");
    });

    it("has descriptive aria-label", () => {
      render(<Spinner />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("aria-label", "Loading");
    });

    it("is discoverable by screen readers", () => {
      render(<Spinner />);

      expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    });
  });

  describe("TypeScript Props Interface", () => {
    it("accepts SpinnerProps interface correctly", () => {
      // This test verifies that the component accepts the correct prop types
      // If TypeScript compilation succeeds, the interface is working correctly

      const validProps = {
        size: "60px" as string,
        color: "#123456",
        className: "test-class",
      };

      render(<Spinner {...validProps} />);

      const spinner = screen.getByRole("status");
      expect(spinner).toBeInTheDocument();
    });

    it("accepts number size prop correctly", () => {
      const validProps = {
        size: 60 as number,
        color: "#123456",
        className: "test-class",
      };

      render(<Spinner {...validProps} />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveStyle({
        width: "60px",
        height: "60px",
      });
    });
  });

  describe("Component Structure", () => {
    it("renders as a single div element", () => {
      const { container } = render(<Spinner />);

      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
      expect(container.children).toHaveLength(1);
    });

    it("has no child elements", () => {
      const { container } = render(<Spinner />);

      const spinner = container.firstChild as HTMLElement;
      expect(spinner.children).toHaveLength(0);
    });

    it("maintains consistent structure with different props", () => {
      const { container, rerender } = render(<Spinner />);

      expect(container.children).toHaveLength(1);

      rerender(<Spinner size="100px" color="red" className="test" />);

      expect(container.children).toHaveLength(1);
      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    });
  });
});
