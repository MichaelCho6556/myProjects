import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

/**
 * Navbar Component - Application navigation with TypeScript support
 *
 * @returns JSX.Element
 */
const Navbar: React.FC = () => {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" aria-label="AniManga Recommender - Go to homepage">
          AniMangaRecommender
        </Link>
        <ul className="nav-menu" role="menubar">
          <li className="nav-item" role="none">
            <Link to="/" className="nav-links" role="menuitem" aria-current="page">
              Home
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
