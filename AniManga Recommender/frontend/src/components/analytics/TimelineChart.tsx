// ABOUTME: Timeline chart component for displaying completion and addition trends over time
// ABOUTME: Supports multiple data series with customizable time granularity

import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { BaseChart } from "./BaseChart";
import { TimeSeriesDataPoint, AnalyticsTimeRange } from "../../types/analytics";
import { chartColors, getChartTheme } from "./ChartTheme";
import { format, parseISO } from "date-fns";

interface TimelineChartProps {
  title: string;
  data: TimeSeriesDataPoint[];
  secondaryData?: TimeSeriesDataPoint[];
  timeRange: AnalyticsTimeRange;
  primaryLabel?: string;
  secondaryLabel?: string;
  isLoading?: boolean;
  error?: string | undefined;
  height?: number;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
  title,
  data,
  secondaryData,
  timeRange,
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  isLoading,
  error,
  height = 350,
}) => {
  const isDark = (() => {
    try {
      return typeof window !== 'undefined' && 
             window.matchMedia && 
             typeof window.matchMedia === 'function'
        ? window.matchMedia("(prefers-color-scheme: dark)")?.matches || false
        : false;
    } catch {
      return false;
    }
  })();
  const theme = getChartTheme(isDark);

  // Merge primary and secondary data
  const chartData = useMemo(() => {
    const merged = new Map();

    // Add primary data
    data.forEach((point) => {
      merged.set(point.date, {
        date: point.date,
        primary: point.value,
        formattedDate: formatDate(point.date, timeRange.granularity),
      });
    });

    // Add secondary data
    secondaryData?.forEach((point) => {
      const existing = merged.get(point.date) || { date: point.date };
      merged.set(point.date, {
        ...existing,
        secondary: point.value,
        formattedDate: formatDate(point.date, timeRange.granularity),
      });
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data, secondaryData, timeRange.granularity]);

  const formatDate = (dateString: string, granularity: string) => {
    const date = parseISO(dateString);
    switch (granularity) {
      case "day":
        return format(date, "MMM dd");
      case "week":
        return format(date, "MMM dd");
      case "month":
        return format(date, "MMM yyyy");
      case "quarter":
        return format(date, "QQQ yyyy");
      case "year":
        return format(date, "yyyy");
      default:
        return format(date, "MMM dd");
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="chart-tooltip"
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            color: theme.text,
          }}
        >
          <p className="tooltip-label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="tooltip-entry" style={{ color: entry.color }}>
              {entry.dataKey === "primary" ? primaryLabel : secondaryLabel}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <BaseChart title={title} height={height} isLoading={isLoading} error={error} className="timeline-chart">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey="formattedDate" stroke={theme.textSecondary} fontSize={12} />
        <YAxis stroke={theme.textSecondary} fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: theme.text }} />
        <Line
          type="monotone"
          dataKey="primary"
          stroke={chartColors.primary}
          strokeWidth={2}
          dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: chartColors.primary, strokeWidth: 2 }}
          name={primaryLabel}
        />
        {secondaryData && (
          <Line
            type="monotone"
            dataKey="secondary"
            stroke={chartColors.secondary}
            strokeWidth={2}
            dot={{ fill: chartColors.secondary, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: chartColors.secondary, strokeWidth: 2 }}
            name={secondaryLabel}
          />
        )}
      </LineChart>
    </BaseChart>
  );
};
