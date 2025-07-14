// ABOUTME: Real-time monitoring dashboard for system metrics and performance
// ABOUTME: Displays cache hit rates, API response times, error rates, and system health with alerts

import React, { useState, useEffect, useCallback } from 'react';
import './MonitoringDashboard.css';

// Types for monitoring data
interface MetricValue {
  value: number;
  timestamp: string;
  type: string;
  tags?: Record<string, string>;
}

interface MetricSummary {
  count: number;
  latest: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  metric_type: string;
}

interface Alert {
  name: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  last_triggered: string | null;
}

interface MonitoringData {
  timestamp: string;
  metrics: Record<string, MetricValue>;
  summary: Record<string, MetricSummary>;
  derived_metrics: Record<string, number>;
  cache_status: {
    connected: boolean;
    hit_rate?: number;
    used_memory_human?: string;
    connected_clients?: number;
  };
  alerts: Alert[];
}

interface MonitoringDashboardProps {
  refreshInterval?: number; // in milliseconds
  adminToken?: string;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  refreshInterval = 10000, // 10 seconds default
  adminToken = ''
}) => {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/metrics', {
        headers: {
          'Authorization': `Bearer admin-${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metricsData: MonitoringData = await response.json();
      setData(metricsData);
      setIsConnected(true);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  const formatNumber = (value: number | null | undefined, decimals: number = 1): string => {
    if (value === null || value === undefined) return 'N/A';
    
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(decimals)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(decimals)}K`;
    }
    return value.toFixed(decimals);
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDuration = (milliseconds: number | null | undefined): string => {
    if (milliseconds === null || milliseconds === undefined) return 'N/A';
    
    if (milliseconds >= 1000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    }
    return `${milliseconds.toFixed(0)}ms`;
  };

  const getMetricColor = (metricName: string, value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'var(--color-gray)';

    switch (metricName) {
      case 'cache_hit_rate':
        if (value >= 0.9) return 'var(--color-success)';
        if (value >= 0.8) return 'var(--color-warning)';
        return 'var(--color-error)';
      
      case 'error_rate':
        if (value <= 0.01) return 'var(--color-success)';
        if (value <= 0.05) return 'var(--color-warning)';
        return 'var(--color-error)';
      
      case 'avg_response_time':
        if (value <= 500) return 'var(--color-success)';
        if (value <= 1000) return 'var(--color-warning)';
        return 'var(--color-error)';
      
      default:
        return 'var(--color-primary)';
    }
  };

  const getAlertColor = (level: string): string => {
    switch (level) {
      case 'critical': return 'var(--color-critical)';
      case 'error': return 'var(--color-error)';
      case 'warning': return 'var(--color-warning)';
      case 'info': return 'var(--color-info)';
      default: return 'var(--color-gray)';
    }
  };

  const renderMetricCard = (
    title: string,
    value: number | null | undefined,
    formatter: (val: number | null | undefined) => string,
    subtitle?: string,
    metricName?: string
  ) => (
    <div className="metric-card">
      <div className="metric-title">{title}</div>
      <div 
        className="metric-value"
        style={{ color: metricName ? getMetricColor(metricName, value) : undefined }}
      >
        {formatter(value)}
      </div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );

  if (loading && !data) {
    return (
      <div className="monitoring-dashboard">
        <div className="dashboard-header">
          <h1>System Monitoring</h1>
          <div className="loading-indicator">Loading metrics...</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="monitoring-dashboard">
        <div className="dashboard-header">
          <h1>System Monitoring</h1>
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>Error loading metrics: {error}</span>
            <button onClick={fetchMetrics} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cacheHitRate = data?.derived_metrics?.cache_hit_rate || data?.metrics?.cache_hit_rate?.value;
  const errorRate = data?.derived_metrics?.error_rate;
  const avgResponseTime = data?.derived_metrics?.avg_response_time;
  const queueLength = data?.metrics?.queue_length?.value;

  const activeAlerts = data?.alerts?.filter(alert => 
    alert.enabled && alert.last_triggered && 
    new Date(alert.last_triggered) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
  ) || [];

  return (
    <div className="monitoring-dashboard">
      <div className="dashboard-header">
        <h1>System Monitoring Dashboard</h1>
        <div className="dashboard-status">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          {lastUpdate && (
            <div className="last-update">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <button onClick={fetchMetrics} className="refresh-button" disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {activeAlerts.length > 0 && (
        <div className="alerts-section">
          <h2>Active Alerts</h2>
          <div className="alerts-list">
            {activeAlerts.map((alert) => (
              <div 
                key={alert.name} 
                className={`alert alert-${alert.level}`}
                style={{ borderLeftColor: getAlertColor(alert.level) }}
              >
                <div className="alert-level">{alert.level.toUpperCase()}</div>
                <div className="alert-name">{alert.name}</div>
                <div className="alert-time">
                  {alert.last_triggered && new Date(alert.last_triggered).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <div className="metrics-section">
          <h2>Performance Metrics</h2>
          <div className="metrics-cards">
            {renderMetricCard(
              'Cache Hit Rate',
              cacheHitRate,
              formatPercentage,
              'Target: >90%',
              'cache_hit_rate'
            )}
            {renderMetricCard(
              'Error Rate',
              errorRate,
              formatPercentage,
              'Target: <5%',
              'error_rate'
            )}
            {renderMetricCard(
              'Avg Response Time',
              avgResponseTime,
              formatDuration,
              'Target: <1s',
              'avg_response_time'
            )}
            {renderMetricCard(
              'Queue Length',
              queueLength,
              (val) => formatNumber(val, 0),
              'Background tasks'
            )}
          </div>
        </div>

        {/* Cache Status */}
        <div className="cache-section">
          <h2>Cache Status</h2>
          <div className="cache-info">
            <div className={`cache-connection ${data?.cache_status?.connected ? 'connected' : 'disconnected'}`}>
              <span className="cache-icon">💾</span>
              <span>{data?.cache_status?.connected ? 'Redis Connected' : 'Redis Disconnected'}</span>
            </div>
            {data?.cache_status?.used_memory_human && (
              <div className="cache-stat">
                Memory Usage: {data.cache_status.used_memory_human}
              </div>
            )}
            {data?.cache_status?.connected_clients !== undefined && (
              <div className="cache-stat">
                Connected Clients: {data.cache_status.connected_clients}
              </div>
            )}
            {data?.cache_status?.hit_rate !== undefined && (
              <div className="cache-stat">
                Hit Rate: {formatPercentage(data.cache_status.hit_rate)}
              </div>
            )}
          </div>
        </div>

        {/* API Metrics */}
        <div className="api-section">
          <h2>API Metrics</h2>
          <div className="api-stats">
            {data?.summary?.api_requests_total && (
              <div className="api-stat">
                Total Requests: {formatNumber(data.summary.api_requests_total.latest, 0)}
              </div>
            )}
            {data?.summary?.api_requests_success && (
              <div className="api-stat">
                Successful: {formatNumber(data.summary.api_requests_success.latest, 0)}
              </div>
            )}
            {data?.summary?.api_requests_error && (
              <div className="api-stat">
                Errors: {formatNumber(data.summary.api_requests_error.latest, 0)}
              </div>
            )}
            {data?.summary?.api_response_time && (
              <div className="api-stat">
                Avg Response: {formatDuration(data.summary.api_response_time.avg)}
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="system-section">
          <h2>System Health</h2>
          <div className="system-stats">
            {data?.metrics?.system_cpu_percent && (
              <div className="system-stat">
                <span className="stat-label">CPU:</span>
                <span className="stat-value">{formatPercentage(data.metrics.system_cpu_percent.value / 100)}</span>
              </div>
            )}
            {data?.metrics?.system_memory_percent && (
              <div className="system-stat">
                <span className="stat-label">Memory:</span>
                <span className="stat-value">{formatPercentage(data.metrics.system_memory_percent.value / 100)}</span>
              </div>
            )}
            {data?.metrics?.system_disk_percent && (
              <div className="system-stat">
                <span className="stat-label">Disk:</span>
                <span className="stat-value">{formatPercentage(data.metrics.system_disk_percent.value / 100)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className="export-section">
        <h2>Data Export</h2>
        <div className="export-buttons">
          <a
            href={`/api/admin/metrics/export?format=json&auth=${adminToken}`}
            download="metrics.json"
            className="export-button"
          >
            📄 Export JSON
          </a>
          <a
            href={`/api/admin/metrics/export?format=prometheus&auth=${adminToken}`}
            download="metrics.txt"
            className="export-button"
          >
            📊 Export Prometheus
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="footer-info">
          <span>Monitoring Dashboard v1.0</span>
          <span>Auto-refresh: {refreshInterval / 1000}s</span>
          {data?.timestamp && (
            <span>Server Time: {new Date(data.timestamp).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};