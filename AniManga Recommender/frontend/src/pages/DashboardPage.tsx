import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { DashboardData } from "../types";
import useDocumentTitle from "../hooks/useDocumentTitle";
import StatisticsCards from "../components/dashboard/StatisticsCards";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import ItemLists from "../components/dashboard/ItemLists";
import QuickActions from "../components/dashboard/QuickActions";
import "./DashboardPage.css";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { makeAuthenticatedRequest } = useAuthenticatedApi();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle("Dashboard");

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await makeAuthenticatedRequest("/api/auth/dashboard");
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (itemUid: string, newStatus: string, additionalData?: any) => {
    try {
      const updateData = {
        status: newStatus,
        ...additionalData,
      };

      await makeAuthenticatedRequest(`/api/auth/user-items/${itemUid}/status`, {
        method: "POST",
        body: JSON.stringify(updateData),
      });

      await fetchDashboardData();
    } catch (err: any) {
      console.error("Status update error:", err);
      setError("Failed to update item status");
    }
  };

  if (!user) {
    return (
      <div className="dashboard-page">
        <div className="auth-required">
          <h2>Please Sign In</h2>
          <p>You need to be signed in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="error-state">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-page">
        <div className="no-data">
          <h2>No Data Available</h2>
          <p>Start adding anime and manga to your lists to see your dashboard!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Welcome back, {user.user_metadata?.display_name || "User"}!</h1>
          <p>Here's your anime and manga activity overview</p>
        </header>

        <StatisticsCards userStats={dashboardData.user_stats} quickStats={dashboardData.quick_stats} />

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <ItemLists
              inProgress={dashboardData.in_progress}
              planToWatch={dashboardData.plan_to_watch}
              onHold={dashboardData.on_hold}
              completedRecently={dashboardData.completed_recently}
              onStatusUpdate={handleStatusUpdate}
            />

            <QuickActions onRefresh={fetchDashboardData} />
          </div>

          <div className="dashboard-sidebar">
            <ActivityFeed activities={dashboardData.recent_activity} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
