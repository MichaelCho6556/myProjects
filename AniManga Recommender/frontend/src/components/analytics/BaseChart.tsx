// ABOUTME: Base chart component providing consistent styling and responsive behavior
// ABOUTME: Wraps Recharts with theme integration and accessibility features

import React from "react";
import { ResponsiveContainer } from "recharts";
import { getChartTheme } from "./ChartTheme";

interface BaseChartProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
  isLoading?: boolean | undefined;
  error?: string | undefined;
  actions?: React.ReactNode;
  className?: string;
}

export const BaseChart: React.FC<BaseChartProps> = ({
  title,
  subtitle,
  children,
  height = 300,
  isLoading,
  error,
  actions,
  className = "",
}) => {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = getChartTheme(isDark);

  if (error) {
    return (
      <div className={`chart-container error ${className}`}>
        <div className="chart-header">
          <h3 className="chart-title">{title}</h3>
        </div>
        <div className="chart-error">
          <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p>Unable to load chart data</p>
          <span className="error-detail">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`chart-container ${className}`} style={{ backgroundColor: theme.surface }}>
      <div className="chart-header">
        <div className="chart-title-group">
          <h3 className="chart-title" style={{ color: theme.text }}>
            {title}
          </h3>
          {subtitle && (
            <p className="chart-subtitle" style={{ color: theme.textSecondary }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="chart-actions">{actions}</div>}
      </div>

      <div className="chart-content" style={{ height }}>
        {isLoading ? (
          <div className="chart-loading">
            <div className="loading-spinner" />
            <p style={{ color: theme.textSecondary }}>Loading chart data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
