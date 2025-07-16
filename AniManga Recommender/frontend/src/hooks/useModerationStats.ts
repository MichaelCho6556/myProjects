// ABOUTME: Hook for fetching moderation statistics for dashboard analytics
// ABOUTME: Provides real-time cache-aware moderation metrics and trends

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { logger } from '../utils/logger';

export interface ModerationStats {
  timeframe: string;
  granularity: string;
  start_time: string;
  end_time: string;
  cache_hit: boolean;
  summary: {
    total_reports: number;
    pending_reports: number;
    resolved_reports: number;
    dismissed_reports: number;
    high_priority_reports: number;
    total_content_analyzed: number;
    high_toxicity_content: number;
    auto_flagged_content: number;
    manual_actions: number;
  };
  trends: {
    reports_by_day: Array<{
      date: string;
      count: number;
    }>;
    toxicity_by_day: Array<{
      date: string;
      avg_toxicity: number;
      max_toxicity: number;
      count: number;
    }>;
    resolution_times: Array<any>;
    content_categories: {
      clean: number;
      low_toxicity: number;
      medium_toxicity: number;
      high_toxicity: number;
    };
  };
  top_issues: {
    most_reported_reasons: Array<any>;
    highest_toxicity_items: Array<any>;
    repeat_offenders: Array<any>;
  };
}

interface UseModerationStatsReturn {
  stats: ModerationStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateTimeframe: (timeframe: string) => void;
  updateGranularity: (granularity: string) => void;
}

export const useModerationStats = (
  initialTimeframe: string = '7d',
  initialGranularity: string = 'day'
): UseModerationStatsReturn => {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [granularity, setGranularity] = useState(initialGranularity);
  
  const { get } = useAuthenticatedApi();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        timeframe,
        granularity
      });
      
      const response = await get(`/api/moderation/stats?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch moderation statistics');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error("Error fetching moderation stats", {
        error: err?.message || "Unknown error",
        context: "useModerationStats",
        operation: "fetchModerationStats",
        timeframe: timeframe,
        granularity: granularity
      });
    } finally {
      setLoading(false);
    }
  }, [get, timeframe, granularity]);

  const updateTimeframe = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  const updateGranularity = useCallback((newGranularity: string) => {
    setGranularity(newGranularity);
  }, []);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Fetch stats when timeframe or granularity changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 5 minutes for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchStats();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchStats, loading]);

  return {
    stats,
    loading,
    error,
    refetch,
    updateTimeframe,
    updateGranularity
  };
};