import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

/**
 * Main App Component - TypeScript version
 * Handles routing and global error boundary
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
