// ABOUTME: Chart theme configuration for consistent styling across all analytics visualizations
// ABOUTME: Provides dark/light mode support and accessible color palettes

export const chartColors = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  purple: "#8b5cf6",
  pink: "#ec4899",
  indigo: "#6366f1",
  teal: "#14b8a6",
};

export const statusColors = {
  plan_to_watch: "#3b82f6", // Blue
  watching: "#10b981", // Green
  completed: "#8b5cf6", // Purple
  on_hold: "#f59e0b", // Orange
  dropped: "#ef4444", // Red
};

export const ratingColors = {
  excellent: "#10b981", // 9-10
  high: "#8b5cf6", // 7-8
  medium: "#f59e0b", // 5-6
  low: "#ef4444", // 1-4
  unrated: "#6b7280", // 0
};

export const chartTheme = {
  light: {
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#1e293b",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    grid: "#f1f5f9",
  },
  dark: {
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    border: "#334155",
    grid: "#293344",
  },
};

export const getChartTheme = (isDark: boolean) => (isDark ? chartTheme.dark : chartTheme.light);
