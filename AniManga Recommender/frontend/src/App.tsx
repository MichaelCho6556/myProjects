import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import ItemDetailPage from "./pages/ItemDetailPage";
import DashboardPage from "./pages/DashboardPage";
import UserListsPage from "./pages/lists/UserListsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

/**
 * Main App Component - TypeScript version
 * Handles routing and global error boundary
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/item/:uid" element={<ItemDetailPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/lists" element={<UserListsPage />} />
              <Route path="/profile" element={<UserListsPage />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
