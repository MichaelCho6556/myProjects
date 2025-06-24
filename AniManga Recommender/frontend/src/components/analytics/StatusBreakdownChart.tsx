// ABOUTME: Pie chart component for visualizing the distribution of item statuses
// ABOUTME: Shows proportional breakdown with interactive legends and tooltips

import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { BaseChart } from "./BaseChart";
import { getChartTheme, statusColors } from "./ChartTheme";

interface StatusBreakdownProps {
  data: {
    status: "plan_to_watch" | "watching" | "completed" | "on_hold" | "dropped";
    count: number;
    percentage: number;
    color: string;
  }[];
  isLoading?: boolean | undefined;
  error?: string | undefined;
}

export const StatusBreakdownChart: React.FC<StatusBreakdownProps> = ({ data, isLoading = false, error }) => {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = getChartTheme(isDark);

  const formatStatusLabel = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const chartData = data.map((item) => ({
    ...item,
    name: formatStatusLabel(item.status),
    fill: statusColors[item.status],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
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
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-entry">
            {data.count} items ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="chart-legend" style={{ color: theme.text }}>
        {payload.map((entry: any, index: number) => (
          <li key={index} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: entry.color }} />
            <span className="legend-label">{entry.value}</span>
            <span className="legend-value">
              {chartData[index]?.count} ({chartData[index]?.percentage.toFixed(1)}%)
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <BaseChart
      title="Status Breakdown"
      subtitle="Distribution of items by watching status"
      height={400}
      isLoading={isLoading}
      error={error}
      className="status-breakdown-chart"
    >
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={120}
          paddingAngle={2}
          dataKey="count"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </BaseChart>
  );
};
