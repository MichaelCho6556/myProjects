// ABOUTME: Barrel export file for moderation system components
// ABOUTME: Provides centralized exports for all moderation-related components and utilities

export { ModerationDashboard } from './ModerationDashboard';
export { ReportQueue } from './ReportQueue';
export { ReportDetail } from './ReportDetail';

// Re-export types for convenience
export type {
  ModerationReport,
  CommentReport,
  ReviewReport,
  ModerationReportsResponse,
  UpdateReportRequest,
  UpdateReportResponse,
  ModerationAuditEntry,
  ModerationAuditResponse,
  ModerationFilters,
  ModerationDashboardProps,
  ReportQueueProps,
  ReportDetailProps,
  ModerationActionButtonProps
} from '../../../types/moderation';

// Re-export hooks for convenience
export { useModerationReports, useModerationAudit } from '../../../hooks/useModeration';
export type { UseModerationReportsResult, UseModerationAuditResult } from '../../../hooks/useModeration';