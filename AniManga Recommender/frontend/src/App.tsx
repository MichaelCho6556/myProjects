import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LoadingProvider, useLoading } from "./context/LoadingContext";
import { ToastProvider } from "./components/Feedback/ToastProvider";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import ItemDetailPage from "./pages/ItemDetailPage";
import DashboardPage from "./pages/DashboardPage";
import UserListsPage from "./pages/lists/UserListsPage";
import { MyCustomListsPage } from "./pages/lists/MyCustomListsPage";
import { CustomListDetailPage } from "./pages/lists/CustomListDetailPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { UserFollowersPage } from "./pages/UserFollowersPage";
import { UserFollowingPage } from "./pages/UserFollowingPage";
import { UserSearchPage } from "./pages/UserSearchPage";
import PrivacySettingsPage from "./pages/PrivacySettingsPage";

import { ListDiscoveryPage } from "./pages/ListDiscoveryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkStatus from "./components/Feedback/NetworkStatus";
import LoadingSpinner from "./components/common/LoadingSpinner";
import "./App.css";

/**
 * App Content Component - Separated to use loading context
 */
const AppContent: React.FC = () => {
  const { isLoading, loadingMessage } = useLoading();

  return (
    <div className="App">
      {/* Global loading overlay */}
      {isLoading && (
        <LoadingSpinner 
          fullPage={true} 
          message={loadingMessage}
          size="large"
        />
      )}
      
      <NetworkStatus position="top" />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/item/:uid" element={<ItemDetailPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/lists" element={<UserListsPage />} />
        <Route path="/profile" element={<UserListsPage />} />
        <Route path="/my-lists" element={<MyCustomListsPage />} />
        <Route path="/lists/:listId" element={<CustomListDetailPage />} />
        <Route path="/users/:username" element={<UserProfilePage />} />
        <Route path="/users/:username/followers" element={<UserFollowersPage />} />
        <Route path="/users/:username/following" element={<UserFollowingPage />} />
        <Route path="/search/users" element={<UserSearchPage />} />
        <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
        <Route path="/discover/lists" element={<ListDiscoveryPage />} />
      </Routes>
    </div>
  );
};

/**
 * Main App Component - TypeScript version
 * Handles routing and global error boundary
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <LoadingProvider>
          <AuthProvider>
            <Router>
              <AppContent />
            </Router>
          </AuthProvider>
        </LoadingProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
