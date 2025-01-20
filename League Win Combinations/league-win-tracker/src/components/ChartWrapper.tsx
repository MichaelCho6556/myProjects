// ChartWrapper.tsx
"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface ChartData {
  combination: string;
  winRate: number;
}

interface ChartWrapperProps {
  data: ChartData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ data }) => {
  const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-medium mb-1">{label}</p>
          <p className="text-blue-300 font-bold">
            {payload[0].value}% Win Rate
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: 400 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#374151"
          />
          <XAxis
            dataKey="combination"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={100}
            label={{
              value: "Team Compositions",
              position: "bottom",
              offset: 50,
              fill: "#D1D5DB",
            }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: "#9CA3AF" }}
            label={{
              value: "Win Rate %",
              angle: -90,
              position: "center",
              offset: -10,
              fill: "#D1D5DB",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="winRate"
            fill="#3B82F6"
            radius={[6, 6, 0, 0]}
            maxBarSize={60}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartWrapper;
