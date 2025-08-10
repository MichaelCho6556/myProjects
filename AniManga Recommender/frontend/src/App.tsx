import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AuthProvider } from "./context/AuthContext";
import { LoadingProvider, useLoading } from "./context/LoadingContext";
import { ToastProvider } from "./components/Feedback/ToastProvider";
import { queryClient, persister } from "./config/queryClient";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkStatus from "./components/Feedback/NetworkStatus";
import LoadingSpinner from "./components/common/LoadingSpinner";
import "./App.css";

// Lazy load all pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"));
const ItemDetailPage = lazy(() => import("./pages/ItemDetailPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const UserListsPage = lazy(() => import("./pages/lists/UserListsPage"));
const MyCustomListsPage = lazy(() => import("./pages/lists/MyCustomListsPage").then(module => ({ default: module.MyCustomListsPage })));
const CustomListDetailPage = lazy(() => import("./pages/lists/CustomListDetailPage").then(module => ({ default: module.CustomListDetailPage })));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage").then(module => ({ default: module.UserProfilePage })));
const UserFollowersPage = lazy(() => import("./pages/UserFollowersPage").then(module => ({ default: module.UserFollowersPage })));
const UserFollowingPage = lazy(() => import("./pages/UserFollowingPage").then(module => ({ default: module.UserFollowingPage })));
const UserSearchPage = lazy(() => import("./pages/UserSearchPage").then(module => ({ default: module.UserSearchPage })));
const PrivacySettingsPage = lazy(() => import("./pages/PrivacySettingsPage"));
const ListDiscoveryPage = lazy(() => import("./pages/ListDiscoveryPage").then(module => ({ default: module.ListDiscoveryPage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));

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
      <Suspense fallback={<LoadingSpinner fullPage={true} message="Loading page..." size="large" />}>
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
      </Suspense>
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
      <PersistQueryClientProvider 
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          buster: process.env.REACT_APP_VERSION || '1.0.0', // Cache busting on app version change
        }}
      >
        <ToastProvider>
          <LoadingProvider>
            <AuthProvider>
              <Router>
                <AppContent />
              </Router>
            </AuthProvider>
          </LoadingProvider>
        </ToastProvider>
        {/* React Query Devtools only in development */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
