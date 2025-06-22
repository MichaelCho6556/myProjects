// ABOUTME: React hooks for moderation system API integration
// ABOUTME: Provides hooks for fetching reports, updating reports, and audit log management

import { useState, useEffect, useCallback } from "react";
import { useAuthenticatedApi } from "./useAuthenticatedApi";
import { ModerationReport, UpdateReportRequest, ModerationFilters } from "../types/moderation";

export interface UseModerationReportsResult {
  reports: ModerationReport[];
  loading: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  } | null;
  fetchReports: (filters?: ModerationFilters & { page?: number; limit?: number }) => Promise<void>;
  updateReport: (reportId: number, updateData: UpdateReportRequest) => Promise<boolean>;
  refreshReports: () => Promise<void>;
  loadMoreReports: () => Promise<void>;
}

export function useModerationReports(initialFilters: ModerationFilters = {}): UseModerationReportsResult {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseModerationReportsResult["pagination"]>(null);
  const [currentFilters, setCurrentFilters] = useState<ModerationFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);

  const { get, put } = useAuthenticatedApi();

  const fetchReports = useCallback(
    async (filters: ModerationFilters & { page?: number; limit?: number } = {}) => {
      setLoading(true);
      setError(null);

      try {
        const page = filters.page || 1;
        const mergedFilters = { ...currentFilters, ...filters };

        // Build query parameters
        const params = new URLSearchParams();
        if (mergedFilters.status && mergedFilters.status !== "all")
          params.append("status", mergedFilters.status);
        if (mergedFilters.type) params.append("type", mergedFilters.type);
        if (mergedFilters.priority) params.append("priority", mergedFilters.priority);
        if (mergedFilters.sort) params.append("sort", mergedFilters.sort);
        params.append("page", page.toString());
        params.append("limit", (filters.limit || 20).toString());

        const response = await get(`/api/moderation/reports?${params.toString()}`);

        if (page === 1) {
          setReports(response.reports);
        } else {
          setReports((prev) => [...prev, ...response.reports]);
        }

        setPagination(response.pagination);
        setCurrentFilters(mergedFilters);
        setCurrentPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch reports");
      } finally {
        setLoading(false);
      }
    },
    [get, currentFilters]
  );

  const updateReport = useCallback(
    async (reportId: number, updateData: UpdateReportRequest): Promise<boolean> => {
      try {
        setError(null);
        await put(`/api/moderation/reports/${reportId}`, updateData);

        // Update the report in the local state
        setReports((prev) =>
          prev.map((report) => (report.id === reportId ? { ...report, status: updateData.status } : report))
        );

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update report");
        console.error("Error updating report:", err);
        return false;
      }
    },
    [put]
  );

  const refreshReports = useCallback(async () => {
    setCurrentPage(1);
    await fetchReports({ ...currentFilters, page: 1 });
  }, [fetchReports, currentFilters]);

  const loadMoreReports = useCallback(async () => {
    if (pagination && pagination.has_next && !loading) {
      await fetchReports({ ...currentFilters, page: currentPage + 1 });
    }
  }, [fetchReports, currentFilters, pagination, currentPage, loading]);

  // Initial fetch
  useEffect(() => {
    fetchReports();
  }, []); // Only run once on mount

  return {
    reports,
    loading,
    error,
    pagination,
    fetchReports,
    updateReport,
    refreshReports,
    loadMoreReports,
  };
}

export interface UseModerationAuditResult {
  auditLog: any[];
  loading: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  } | null;
  fetchAuditLog: (filters?: {
    moderator_id?: string;
    action_type?: string;
    target_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  refreshAuditLog: () => Promise<void>;
}

export function useModerationAudit(): UseModerationAuditResult {
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseModerationAuditResult["pagination"]>(null);
  const [currentFilters, setCurrentFilters] = useState<any>({});

  const { get } = useAuthenticatedApi();

  const fetchAuditLog = useCallback(
    async (filters: any = {}) => {
      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (filters.moderator_id) params.append("moderator_id", filters.moderator_id);
        if (filters.action_type) params.append("action_type", filters.action_type);
        if (filters.target_type) params.append("target_type", filters.target_type);
        if (filters.start_date) params.append("start_date", filters.start_date);
        if (filters.end_date) params.append("end_date", filters.end_date);
        params.append("page", (filters.page || 1).toString());
        params.append("limit", (filters.limit || 50).toString());

        const response = await get(`/api/moderation/audit-log?${params.toString()}`);

        setAuditLog(response.audit_log);
        setPagination(response.pagination);
        setCurrentFilters(filters);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch audit log");
      } finally {
        setLoading(false);
      }
    },
    [get]
  );

  const refreshAuditLog = useCallback(async () => {
    await fetchAuditLog(currentFilters);
  }, [fetchAuditLog, currentFilters]);

  return {
    auditLog,
    loading,
    error,
    pagination,
    fetchAuditLog,
    refreshAuditLog,
  };
}
