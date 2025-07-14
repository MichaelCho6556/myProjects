// ABOUTME: Analytics components for the moderation dashboard
// ABOUTME: Displays toxicity trends, report statistics, and cache performance using Recharts

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ModerationStats } from '../../../hooks/useModerationStats';
import './ModerationAnalytics.css';

interface ModerationAnalyticsProps {
  stats: ModerationStats;
  onTimeframeChange: (timeframe: string) => void;
  onGranularityChange: (granularity: string) => void;
}

export const ModerationAnalytics: React.FC<ModerationAnalyticsProps> = ({
  stats,
  onTimeframeChange,
  onGranularityChange
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'toxicity' | 'overview'>('overview');

  const formatTooltipValue = (value: any, name: string) => {
    if (name === 'avg_toxicity' || name === 'max_toxicity') {
      return [`${(value * 100).toFixed(1)}%`, name.replace('_', ' ')];
    }
    return [value, name.replace('_', ' ')];
  };

  const formatTooltipLabel = (label: string) => {
    return new Date(label).toLocaleDateString();
  };

  const pieColors = {
    clean: '#10b981',
    low_toxicity: '#f59e0b',
    medium_toxicity: '#ef4444',
    high_toxicity: '#7c2d12'
  };

  const reportStatusColors = {
    pending: '#f59e0b',
    resolved: '#10b981',
    dismissed: '#6b7280'
  };

  // Prepare data for charts
  const contentCategoryData = Object.entries(stats.trends.content_categories).map(([key, value]) => ({
    name: key.replace('_', ' '),
    value,
    color: pieColors[key as keyof typeof pieColors] || '#6b7280'
  }));

  const reportStatusData = [
    { name: 'Pending', value: stats.summary.pending_reports, color: reportStatusColors.pending },
    { name: 'Resolved', value: stats.summary.resolved_reports, color: reportStatusColors.resolved },
    { name: 'Dismissed', value: stats.summary.dismissed_reports, color: reportStatusColors.dismissed }
  ];

  const renderOverviewTab = () => (
    <div className="analytics-overview">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.summary.total_reports}</div>
            <div className="stat-label">Total Reports</div>
            {stats.cache_hit && <div className="cache-indicator">📋 Cached</div>}
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.summary.pending_reports}</div>
            <div className="stat-label">Pending Reports</div>
          </div>
        </div>

        <div className="stat-card analyzed">
          <div className="stat-icon">🔍</div>
          <div className="stat-content">
            <div className="stat-value">{stats.summary.total_content_analyzed}</div>
            <div className="stat-label">Content Analyzed</div>
          </div>
        </div>

        <div className="stat-card high-toxicity">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.summary.high_toxicity_content}</div>
            <div className="stat-label">High Toxicity</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Report Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={reportStatusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              >
                {reportStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Content Categories</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={contentCategoryData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              >
                {contentCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderReportsTab = () => (
    <div className="analytics-reports">
      <div className="chart-container full-width">
        <h3>Reports Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.trends.reports_by_day}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatTooltipLabel} />
            <YAxis />
            <Tooltip labelFormatter={formatTooltipLabel} />
            <Bar dataKey="count" fill="#3b82f6" name="Reports" />
            <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="5 5" label="High Activity" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="priority-breakdown">
        <h3>Priority Distribution</h3>
        <div className="priority-stats">
          <div className="priority-item high">
            <span className="priority-label">High Priority</span>
            <span className="priority-value">{stats.summary.high_priority_reports}</span>
          </div>
          <div className="priority-item">
            <span className="priority-label">Auto-flagged</span>
            <span className="priority-value">{stats.summary.auto_flagged_content}</span>
          </div>
          <div className="priority-item">
            <span className="priority-label">Manual Actions</span>
            <span className="priority-value">{stats.summary.manual_actions}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderToxicityTab = () => (
    <div className="analytics-toxicity">
      <div className="chart-container full-width">
        <h3>Toxicity Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.trends.toxicity_by_day}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatTooltipLabel} />
            <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
            <Tooltip 
              labelFormatter={formatTooltipLabel}
              formatter={formatTooltipValue}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avg_toxicity"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Average Toxicity"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="max_toxicity"
              stroke="#ef4444"
              strokeWidth={2}
              name="Peak Toxicity"
              dot={{ r: 4 }}
            />
            <ReferenceLine y={0.7} stroke="#ef4444" strokeDasharray="5 5" label="High Risk Threshold" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="toxicity-metrics">
        <h3>Toxicity Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-label">Clean Content</div>
            <div className="metric-value clean">{stats.trends.content_categories.clean}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Low Toxicity</div>
            <div className="metric-value low">{stats.trends.content_categories.low_toxicity}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Medium Toxicity</div>
            <div className="metric-value medium">{stats.trends.content_categories.medium_toxicity}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">High Toxicity</div>
            <div className="metric-value high">{stats.trends.content_categories.high_toxicity}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="moderation-analytics">
      <div className="analytics-header">
        <div className="analytics-controls">
          <div className="control-group">
            <label htmlFor="timeframe-select">Timeframe:</label>
            <select
              id="timeframe-select"
              value={stats.timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="control-select"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="granularity-select">Granularity:</label>
            <select
              id="granularity-select"
              value={stats.granularity}
              onChange={(e) => onGranularityChange(e.target.value)}
              className="control-select"
            >
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
            </select>
          </div>

          <div className="cache-status">
            {stats.cache_hit ? (
              <span className="cache-hit">📋 Data from cache</span>
            ) : (
              <span className="cache-miss">🔄 Fresh data</span>
            )}
          </div>
        </div>

        <div className="analytics-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
          <button
            className={`tab-button ${activeTab === 'toxicity' ? 'active' : ''}`}
            onClick={() => setActiveTab('toxicity')}
          >
            Toxicity
          </button>
        </div>
      </div>

      <div className="analytics-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'reports' && renderReportsTab()}
        {activeTab === 'toxicity' && renderToxicityTab()}
      </div>
    </div>
  );
};