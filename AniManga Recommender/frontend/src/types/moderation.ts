// ABOUTME: TypeScript interfaces for the moderation system
// ABOUTME: Defines types for reports, audit logs, and moderation actions

export interface ModerationReport {
  id: number;
  type: 'comment' | 'review';
  status: 'pending' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high';
  report_reason: 'spam' | 'harassment' | 'inappropriate' | 'offensive' | 'other';
  additional_context: string;
  created_at: string;
  anonymous: boolean;
  reporter: {
    username: string;
    display_name: string;
  } | null;
  content: CommentReport | ReviewReport;
}

export interface CommentReport {
  id: number;
  text: string;
  created_at: string;
  parent_type: string;
  parent_id: string;
  author: {
    username: string;
    display_name: string;
    avatar_url: string;
  } | null;
}

export interface ReviewReport {
  id: number;
  title: string;
  text: string;
  rating: number;
  created_at: string;
  item_uid: string;
  author: {
    username: string;
    display_name: string;
    avatar_url: string;
  } | null;
}

export interface ModerationReportsResponse {
  reports: ModerationReport[];
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface UpdateReportRequest {
  status: 'pending' | 'resolved' | 'dismissed';
  resolution_action: 'remove_content' | 'warn_user' | 'no_action' | 'temp_ban' | 'permanent_ban';
  resolution_notes?: string;
}

export interface UpdateReportResponse {
  message: string;
  report_id: number;
  status: string;
  resolution_action: string;
}

export interface ModerationAuditEntry {
  id: number;
  moderator_id: string;
  action_type: string;
  target_type: 'comment' | 'review' | 'user';
  target_id: number;
  report_id: number | null;
  action_details: Record<string, any>;
  created_at: string;
  moderator: {
    username: string;
    display_name: string;
  } | null;
}

export interface ModerationAuditResponse {
  audit_log: ModerationAuditEntry[];
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ModerationFilters {
  status?: 'pending' | 'resolved' | 'dismissed' | 'all';
  type?: 'comment' | 'review';
  priority?: 'low' | 'medium' | 'high';
  sort?: 'newest' | 'oldest' | 'priority';
}

export interface ModerationDashboardProps {
  className?: string;
}

export interface ReportQueueProps {
  reports: ModerationReport[];
  selectedReport: ModerationReport | null;
  onSelectReport: (report: ModerationReport) => void;
  loading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
}

export interface ReportDetailProps {
  report: ModerationReport | null;
  onResolveReport: (reportId: number, action: UpdateReportRequest) => Promise<void>;
  onDismissReport: (reportId: number, notes?: string) => Promise<void>;
  loading: boolean;
}

export interface ModerationActionButtonProps {
  action: 'remove_content' | 'warn_user' | 'no_action' | 'temp_ban' | 'permanent_ban';
  label: string;
  variant: 'danger' | 'warning' | 'primary' | 'secondary';
  onClick: () => void;
  disabled?: boolean;
}