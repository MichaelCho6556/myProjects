// ABOUTME: Main analytics dashboard component integrating all chart visualizations
// ABOUTME: Provides comprehensive analytics view with time range filtering and export capabilities

import React, { useState, useEffect, useMemo } from "react";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { ListAnalyticsData, AnalyticsFilter, AnalyticsTimeRange } from "../../types/analytics";
import { TimelineChart } from "./TimelineChart";
import { RatingDistributionChart } from "./RatingDistributionChart";
import { StatusBreakdownChart } from "./StatusBreakdownChart";
import { AnalyticsTimeRangePicker } from "./AnalyticsTimeRangePicker";
import { AnalyticsExportButton } from "./AnalyticsExportButton";
import { subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import { logger } from "../../utils/logger";
import "./ListAnalyticsDashboard.css";

interface ListAnalyticsDashboardProps {
  listId?: number;
  userId?: string;
  className?: string;
}

export const ListAnalyticsDashboard: React.FC<ListAnalyticsDashboardProps> = ({
  listId,
  userId,
  className = "",
}) => {
  const { get } = useAuthenticatedApi();
  const [analyticsData, setAnalyticsData] = useState<ListAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to last 12 months
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>({
    start: subMonths(new Date(), 12),
    end: new Date(),
    granularity: "month",
  });

  const [filters, setFilters] = useState<AnalyticsFilter>({
    timeRange,
    includeDropped: true,
    minimumRating: 0,
  });

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const baseEndpoint = listId
          ? `/api/auth/lists/${listId}/analytics`
          : `/api/auth/users/${userId || "me"}/analytics`;

        const params = new URLSearchParams({
          start_date: filters.timeRange.start.toISOString(),
          end_date: filters.timeRange.end.toISOString(),
          granularity: filters.timeRange.granularity,
          include_dropped: (filters.includeDropped ?? true).toString(),
          minimum_rating: (filters.minimumRating ?? 0).toString(),
        });

        const endpoint = `${baseEndpoint}?${params.toString()}`;
        const response = await get(endpoint);

        setAnalyticsData(response.data);
      } catch (err: any) {
        logger.error("Failed to fetch analytics", {
          error: err?.message || "Unknown error",
          context: "ListAnalyticsDashboard",
          operation: "fetchAnalytics",
          listId: listId,
          userId: userId
        });
        setError(err.response?.data?.message || "Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [get, listId, userId, filters]);

  // Update filters when time range changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, timeRange }));
  }, [timeRange]);

  // Quick time range presets
  const timeRangePresets = [
    { label: "Last 7 Days", days: 7, granularity: "day" as const },
    { label: "Last 30 Days", days: 30, granularity: "day" as const },
    { label: "Last 3 Months", months: 3, granularity: "week" as const },
    { label: "Last 6 Months", months: 6, granularity: "month" as const },
    { label: "Last Year", years: 1, granularity: "month" as const },
    { label: "All Time", allTime: true, granularity: "month" as const },
  ];

  const handleTimeRangePreset = (preset: (typeof timeRangePresets)[0]) => {
    let start: Date;

    if (preset.allTime) {
      // Get user's earliest activity date or default to 2 years ago
      start = subYears(new Date(), 2);
    } else if (preset.days) {
      start = startOfDay(subDays(new Date(), preset.days));
    } else if (preset.months) {
      start = startOfDay(subMonths(new Date(), preset.months));
    } else if (preset.years) {
      start = startOfDay(subYears(new Date(), preset.years));
    } else {
      start = startOfDay(subMonths(new Date(), 12));
    }

    setTimeRange({
      start,
      end: endOfDay(new Date()),
      granularity: preset.granularity,
    });
  };

  // Overview metrics
  const overviewMetrics = useMemo(() => {
    if (!analyticsData) return [];

    const { overview, comparativeAnalysis } = analyticsData;

    return [
      {
        label: "Total Items",
        value: overview.totalItems,
        change: comparativeAnalysis.percentageChanges.completions,
        format: "number",
      },
      {
        label: "Completed",
        value: overview.completedItems,
        change: comparativeAnalysis.percentageChanges.completions,
        format: "number",
      },
      {
        label: "Completion Rate",
        value: overview.completionRate,
        format: "percentage",
      },
      {
        label: "Average Rating",
        value: overview.averageRating,
        change: comparativeAnalysis.percentageChanges.averageRating,
        format: "rating",
      },
      {
        label: "Hours Watched",
        value: overview.totalHoursWatched,
        format: "hours",
      },
      {
        label: "Current Streak",
        value: overview.activeStreak,
        format: "days",
      },
    ];
  }, [analyticsData]);

  if (error) {
    return (
      <div className={`analytics-dashboard error ${className}`}>
        <div className="error-state">
          <h3>Unable to Load Analytics</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-dashboard ${className}`}>
      {/* Dashboard Header */}
      <div className="analytics-header">
        <div className="header-title">
          <h2>{listId ? "List Analytics" : "My Analytics"}</h2>
          <p>Insights into your anime and manga viewing patterns</p>
        </div>

        <div className="header-controls">
          <AnalyticsExportButton analyticsData={analyticsData} timeRange={timeRange} isLoading={isLoading} />
        </div>
      </div>

      {/* Time Range Controls */}
      <div className="time-range-controls">
        <div className="preset-buttons">
          {timeRangePresets.map((preset, index) => (
            <button key={index} onClick={() => handleTimeRangePreset(preset)} className="preset-btn">
              {preset.label}
            </button>
          ))}
        </div>

        <AnalyticsTimeRangePicker timeRange={timeRange} onChange={setTimeRange} />
      </div>

      {/* Overview Metrics */}
      <div className="overview-metrics">
        {overviewMetrics.map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="metric-value">{formatMetricValue(metric.value, metric.format)}</div>
            <div className="metric-label">{metric.label}</div>
            {metric.change !== undefined && (
              <div className={`metric-change ${metric.change >= 0 ? "positive" : "negative"}`}>
                {metric.change >= 0 ? "+" : ""}
                {metric.change.toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Timeline Charts */}
        <div className="chart-row">
          <div className="chart-container-half">
            <TimelineChart
              title="Completion Timeline"
              data={analyticsData?.completionTimeline || []}
              secondaryData={analyticsData?.additionTimeline || []}
              timeRange={timeRange}
              primaryLabel="Completed"
              secondaryLabel="Added"
              isLoading={isLoading}
              error={error || undefined}
            />
          </div>

          <div className="chart-container-half">
            <TimelineChart
              title="Rating Trends"
              data={analyticsData?.ratingTrends || []}
              timeRange={timeRange}
              primaryLabel="Average Rating"
              isLoading={isLoading}
              error={error || undefined}
            />
          </div>
        </div>

        {/* Distribution Charts */}
        <div className="chart-row">
          <div className="chart-container-half">
            <RatingDistributionChart
              data={analyticsData?.ratingDistribution || []}
              isLoading={isLoading}
              error={error || undefined}
            />
          </div>

          <div className="chart-container-half">
            <StatusBreakdownChart
              data={analyticsData?.statusBreakdown || []}
              isLoading={isLoading}
              error={error || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to format metric values
const formatMetricValue = (value: number, format: string): string => {
  switch (format) {
    case "percentage":
      return `${(value * 100).toFixed(1)}%`;
    case "rating":
      return `${value.toFixed(1)}/10`;
    case "hours":
      return `${value.toFixed(0)}h`;
    case "days":
      return `${value} days`;
    default:
      return value.toString();
  }
};
