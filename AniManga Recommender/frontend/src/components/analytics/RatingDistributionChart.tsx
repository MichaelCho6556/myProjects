// ABOUTME: Bar chart component for displaying rating distribution across user's completed items
// ABOUTME: Shows frequency of each rating with percentage breakdown

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { BaseChart } from "./BaseChart";
import { getChartTheme, ratingColors } from "./ChartTheme";

interface RatingDistributionProps {
  data: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  isLoading?: boolean | undefined;
  error?: string | undefined;
}

export const RatingDistributionChart: React.FC<RatingDistributionProps> = ({
  data,
  isLoading = false,
  error,
}) => {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = getChartTheme(isDark);

  const getBarColor = (rating: number) => {
    if (rating >= 9) return ratingColors.excellent;
    if (rating >= 7) return ratingColors.high;
    if (rating >= 5) return ratingColors.medium;
    if (rating >= 1) return ratingColors.low;
    return ratingColors.unrated;
  };

  // Prepare data with colors
  const dataWithColors = data.map((item) => ({
    ...item,
    fill: getBarColor(item.rating),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="chart-tooltip"
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            color: theme.text,
          }}
        >
          <p className="tooltip-label">Rating: {label}/10</p>
          <p className="tooltip-entry">
            Count: {data.count} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <BaseChart
      title="Rating Distribution"
      subtitle="How you rate your completed items"
      height={300}
      isLoading={isLoading}
      error={error || undefined}
      className="rating-distribution-chart"
    >
      <BarChart data={dataWithColors}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey="rating" stroke={theme.textSecondary} fontSize={12} />
        <YAxis stroke={theme.textSecondary} fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
      </BarChart>
    </BaseChart>
  );
};
