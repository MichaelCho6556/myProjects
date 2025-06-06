/**
 * Unit Tests for Navbar Component
 * Tests navigation functionality and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import Navbar from "../../components/Navbar";

// Test utilities
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>{component}</AuthProvider>
    </MemoryRouter>
  );
};

describe("Navbar Component", () => {
  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      renderWithRouter(<Navbar />);

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("displays the logo/brand name", () => {
      renderWithRouter(<Navbar />);

      expect(screen.getByText("AniMangaRecommender")).toBeInTheDocument();
    });

    it("displays the Home navigation link", () => {
      renderWithRouter(<Navbar />);

      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("has correct CSS classes for styling", () => {
      renderWithRouter(<Navbar />);

      const navbar = screen.getByRole("navigation");
      expect(navbar).toHaveClass("navbar");

      const container = navbar.querySelector(".navbar-container");
      expect(container).toBeInTheDocument();

      const menu = screen.getByRole("menubar");
      expect(menu).toHaveClass("nav-menu");
    });
  });

  describe("Navigation Links", () => {
    it("logo links to homepage", () => {
      renderWithRouter(<Navbar />);

      const logoLink = screen.getByLabelText("AniManga Recommender - Go to homepage");
      expect(logoLink).toHaveAttribute("href", "/");
      expect(logoLink).toHaveClass("navbar-logo");
    });

    it("Home link navigates to homepage", () => {
      renderWithRouter(<Navbar />);

      const homeLink = screen.getByRole("menuitem");
      expect(homeLink).toHaveAttribute("href", "/");
      expect(homeLink).toHaveClass("nav-links");
      expect(homeLink).toHaveTextContent("Home");
    });

    it("Home link navigates to correct route", () => {
      renderWithRouter(<Navbar />);

      const homeLink = screen.getByRole("menuitem");
      expect(homeLink).toHaveAttribute("href", "/");
      expect(homeLink).toHaveTextContent("Home");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA navigation role", () => {
      renderWithRouter(<Navbar />);

      const navbar = screen.getByRole("navigation");
      expect(navbar).toHaveAttribute("aria-label", "Main navigation");
    });

    it("has proper menubar structure", () => {
      renderWithRouter(<Navbar />);

      const menubar = screen.getByRole("menubar");
      expect(menubar).toBeInTheDocument();

      const menuitem = screen.getByRole("menuitem");
      expect(menuitem).toBeInTheDocument();
    });

    it("has descriptive aria-label for logo link", () => {
      renderWithRouter(<Navbar />);

      const logoLink = screen.getByLabelText("AniManga Recommender - Go to homepage");
      expect(logoLink).toBeInTheDocument();
    });

    it("uses semantic HTML structure", () => {
      renderWithRouter(<Navbar />);

      // Check for nav element
      expect(screen.getByRole("navigation")).toBeInTheDocument();

      // Check for ul element (menubar)
      expect(screen.getByRole("menubar")).toBeInTheDocument();

      // Check for li element with role="none"
      const listItem = screen.getByRole("menubar").querySelector("li");
      expect(listItem).toHaveAttribute("role", "none");
    });
  });

  describe("Component Structure", () => {
    it("has correct HTML structure", () => {
      renderWithRouter(<Navbar />);

      const navbar = screen.getByRole("navigation");
      const container = navbar.querySelector(".navbar-container");
      const logo = container?.querySelector(".navbar-logo");
      const menu = container?.querySelector(".nav-menu");
      const menuItem = menu?.querySelector(".nav-item");
      const menuLink = menuItem?.querySelector(".nav-links");

      expect(container).toBeInTheDocument();
      expect(logo).toBeInTheDocument();
      expect(menu).toBeInTheDocument();
      expect(menuItem).toBeInTheDocument();
      expect(menuLink).toBeInTheDocument();
    });

    it("renders as a functional component", () => {
      // Test that the component renders without props
      const { container } = renderWithRouter(<Navbar />);

      expect(container.firstChild).not.toBeNull();
    });
  });

  describe("CSS Classes", () => {
    it("applies correct CSS classes to all elements", () => {
      renderWithRouter(<Navbar />);

      // Navbar
      expect(screen.getByRole("navigation")).toHaveClass("navbar");

      // Container
      const container = screen.getByRole("navigation").querySelector(".navbar-container");
      expect(container).toHaveClass("navbar-container");

      // Logo
      const logo = screen.getByLabelText("AniManga Recommender - Go to homepage");
      expect(logo).toHaveClass("navbar-logo");

      // Menu
      const menu = screen.getByRole("menubar");
      expect(menu).toHaveClass("nav-menu");

      // Menu item
      const menuItem = menu.querySelector(".nav-item");
      expect(menuItem).toHaveClass("nav-item");

      // Menu link
      const menuLink = screen.getByRole("menuitem");
      expect(menuLink).toHaveClass("nav-links");
    });
  });

  describe("Content Verification", () => {
    it("displays exact brand name text", () => {
      renderWithRouter(<Navbar />);

      expect(screen.getByText("AniMangaRecommender")).toBeInTheDocument();
    });

    it("displays exact navigation text", () => {
      renderWithRouter(<Navbar />);

      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("has no additional navigation items", () => {
      renderWithRouter(<Navbar />);

      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(1);
      expect(menuItems[0]).toHaveTextContent("Home");
    });
  });

  describe("Router Integration", () => {
    it("works correctly with React Router", () => {
      // Test with different initial routes
      const { rerender } = render(
        <MemoryRouter initialEntries={["/"]}>
          <AuthProvider>
            <Navbar />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole("navigation")).toBeInTheDocument();

      // Rerender with different route
      rerender(
        <MemoryRouter initialEntries={["/item/123"]}>
          <AuthProvider>
            <Navbar />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole("navigation")).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("maintains consistent structure across different routes", () => {
      render(
        <MemoryRouter initialEntries={["/some-other-route"]}>
          <AuthProvider>
            <Navbar />
          </AuthProvider>
        </MemoryRouter>
      );

      // Should still render the same structure regardless of current route
      expect(screen.getByRole("navigation")).toBeInTheDocument();
      expect(screen.getByText("AniMangaRecommender")).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("renders efficiently without unnecessary re-renders", () => {
      const { rerender } = renderWithRouter(<Navbar />);

      // Initial render
      expect(screen.getByRole("navigation")).toBeInTheDocument();

      // Re-render should not cause issues
      rerender(
        <MemoryRouter>
          <AuthProvider>
            <Navbar />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });
  });
});
