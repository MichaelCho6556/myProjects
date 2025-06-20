// ABOUTME: Main moderation dashboard page accessible only to moderators
// ABOUTME: Provides interface for managing reported content and moderation actions

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { ModerationDashboard } from "../components/social/moderation/ModerationDashboard";
import Spinner from "../components/Spinner";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./ModerationDashboardPage.css";

export const ModerationDashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { get } = useAuthenticatedApi();
  const [canModerate, setCanModerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle("Moderation Dashboard - AniManga Recommender");

  useEffect(() => {
    const checkModerationPermissions = async () => {
      if (!user) {
        setCanModerate(false);
        setLoading(false);
        return;
      }

      try {
        const response = await get("/api/user/profile");
        if (response.ok) {
          const profile = await response.json();
          setCanModerate(profile.role === "admin" || profile.role === "moderator");
        } else {
          setError("Failed to check permissions");
        }
      } catch (err) {
        console.error("Error checking moderation permissions:", err);
        setError("Failed to check permissions");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkModerationPermissions();
    }
  }, [user, authLoading, get]);

  if (loading) {
    return (
      <div className="moderation-dashboard-page">
        <div className="loading-container">
          <Spinner />
          <p>Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="moderation-dashboard-page">
        <div className="error-container">
          <div className="error-icon">🚫</div>
          <h2>Access Denied</h2>
          <p>{error || "Authentication required"}</p>
          <button onClick={() => window.history.back()} className="back-button">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!canModerate) {
    return (
      <div className="moderation-dashboard-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Insufficient Privileges</h2>
          <p>You need moderator or admin privileges to access this page.</p>
          <button onClick={() => window.history.back()} className="back-button">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="moderation-dashboard-page">
      <div className="moderation-header">
        <div className="header-content">
          <h1>Moderation Dashboard</h1>
          <div className="header-stats">
            <div className="stat">
              <span className="stat-label">Role:</span>
              <span className="stat-value">{canModerate ? "Moderator/Admin" : "User"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="moderation-content">
        <ModerationDashboard />
      </div>
    </div>
  );
};
