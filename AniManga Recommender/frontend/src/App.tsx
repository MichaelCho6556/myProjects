import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Feedback/ToastProvider";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import ItemDetailPage from "./pages/ItemDetailPage";
import DashboardPage from "./pages/DashboardPage";
import UserListsPage from "./pages/lists/UserListsPage";
import { MyCustomListsPage } from "./pages/lists/MyCustomListsPage";
import { CustomListDetailPage } from "./pages/lists/CustomListDetailPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { PrivacySettingsPage } from "./pages/PrivacySettingsPage";
import { ListDiscoveryPage } from "./pages/ListDiscoveryPage";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkStatus from "./components/Feedback/NetworkStatus";
import "./App.css";

/**
 * Main App Component - TypeScript version
 * Handles routing and global error boundary
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <div className="App">
              <NetworkStatus position="top" />
              <Navbar />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/item/:uid" element={<ItemDetailPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/lists" element={<UserListsPage />} />
                <Route path="/profile" element={<UserListsPage />} />
                <Route path="/my-lists" element={<MyCustomListsPage />} />
                <Route path="/lists/:listId" element={<CustomListDetailPage />} />
                <Route path="/user/:username" element={<UserProfilePage />} />
                <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
                <Route path="/discover/lists" element={<ListDiscoveryPage />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
