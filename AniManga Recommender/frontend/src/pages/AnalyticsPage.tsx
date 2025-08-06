// ABOUTME: Dedicated analytics page for comprehensive data visualization
// ABOUTME: Showcases the full analytics dashboard with navigation and context

import React from "react";
import { useAuth } from "../context/AuthContext";
import { ListAnalyticsDashboard } from "../components/analytics/ListAnalyticsDashboard";
import useDocumentTitle from "../hooks/useDocumentTitle";
import EmptyState from "../components/EmptyState";

import "./AnalyticsPage.css";

// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url: string) => {
  if (!url) return '';
  
  // Decode URL to catch encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }
  
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // Dangerous schemes to block
  const dangerousSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:',
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return 'about:blank';
    }
  }
  
  // Additional check for encoded attempts
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return 'about:blank';
  }
  
  return url;
};

/**
 * Dedicated analytics page component
 *
 * Provides a full-screen analytics experience with comprehensive data visualization,
 * time range controls, and export functionality.
 */
const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();

  useDocumentTitle("Analytics Dashboard");

  // Render authentication required state
  if (!user) {
    return (
      <div className="analytics-page">
        <EmptyState
          type="new-user"
          title="Analytics Dashboard"
          description="Sign in to view detailed analytics about your anime and manga viewing patterns, ratings, and progress."
          actionButton={{
            text: "Sign In",
            onClick: () => {
              window.location.href = "/auth";
            },
            variant: "primary",
          }}
          secondaryAction={{
            text: "Go to Dashboard",
            href: "/dashboard",
          }}
        />
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-container">
        <header className="analytics-header">
          <nav className="breadcrumb">
            <a href="/dashboard">Dashboard</a>
            <span className="separator">›</span>
            <span className="current">Analytics</span>
          </nav>
          <div className="page-title">
            <h1>Analytics Dashboard</h1>
            <p>Comprehensive insights into your anime and manga activity</p>
          </div>
        </header>

        <div className="analytics-content">
          <ListAnalyticsDashboard />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
