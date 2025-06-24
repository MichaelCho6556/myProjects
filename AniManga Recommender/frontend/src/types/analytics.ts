// ABOUTME: Type definitions for analytics data structures and chart configurations
// ABOUTME: Provides comprehensive interfaces for all analytics visualization components

export interface TimeSeriesDataPoint {
  date: string; // ISO date string
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  granularity: "day" | "week" | "month" | "quarter" | "year";
}

export interface ListAnalyticsData {
  overview: {
    totalItems: number;
    completedItems: number;
    averageRating: number;
    totalHoursWatched: number;
    completionRate: number;
    activeStreak: number;
    longestStreak: number;
  };

  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];

  statusBreakdown: {
    status: "plan_to_watch" | "watching" | "completed" | "on_hold" | "dropped";
    count: number;
    percentage: number;
    color: string;
  }[];

  completionTimeline: TimeSeriesDataPoint[];

  additionTimeline: TimeSeriesDataPoint[];

  ratingTrends: TimeSeriesDataPoint[];

  genreDistribution: {
    genre: string;
    count: number;
    percentage: number;
    averageRating: number;
  }[];

  tagCloud: {
    tag: string;
    count: number;
    weight: number; // 0-1 for visualization sizing
  }[];

  monthlyStats: {
    month: string;
    itemsAdded: number;
    itemsCompleted: number;
    hoursWatched: number;
    averageRating: number;
  }[];

  streakAnalysis: {
    currentStreak: number;
    longestStreak: number;
    streakHistory: TimeSeriesDataPoint[];
  };

  comparativeAnalysis: {
    previousPeriod: {
      completions: number;
      additions: number;
      averageRating: number;
    };
    percentageChanges: {
      completions: number;
      additions: number;
      averageRating: number;
    };
  };
}

export interface ChartConfig {
  title: string;
  type: "line" | "bar" | "pie" | "area" | "scatter" | "radar";
  dataKey: string;
  color?: string;
  gradientColors?: string[];
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  height?: number;
  responsive?: boolean;
}

export interface AnalyticsFilter {
  timeRange: AnalyticsTimeRange;
  listIds?: number[];
  mediaTypes?: string[];
  includeDropped?: boolean;
  minimumRating?: number;
}
