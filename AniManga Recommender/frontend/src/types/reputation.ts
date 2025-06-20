// ABOUTME: TypeScript type definitions for reputation system
// ABOUTME: Provides comprehensive types for reputation scores, appeals, and notifications

export interface UserReputation {
  id?: number;
  user_id: string;
  reputation_score: number;
  reputation_title: string;
  total_reviews: number;
  total_comments: number;
  helpful_votes_received: number;
  helpful_votes_given: number;
  warnings_received: number;
  content_removed: number;
  temp_bans: number;
  days_active: number;
  consecutive_days_active: number;
  review_reputation: number;
  comment_reputation: number;
  community_reputation: number;
  moderation_penalty: number;
  last_activity_date?: string;
  last_calculated?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReputationBreakdown {
  review_points: number;
  comment_points: number;
  community_points: number;
  penalty_points: number;
  total_score: number;
}

export interface ModerationAppeal {
  id: number;
  user_id: string;
  content_type: 'comment' | 'review' | 'profile';
  content_id: number;
  original_action: string;
  appeal_reason: string;
  user_statement?: string;
  report_id?: number;
  moderator_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolved_by?: string;
  resolution_reason?: string;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
  additional_context?: Record<string, any>;
}

export interface CreateAppealRequest {
  content_type: 'comment' | 'review' | 'profile';
  content_id: number;
  original_action: string;
  appeal_reason: string;
  user_statement?: string;
  report_id?: number;
}

export interface UpdateAppealRequest {
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  resolution_reason?: string;
  resolution_notes?: string;
}

export interface AppealResponse {
  message: string;
  appeal: ModerationAppeal;
}

export interface AppealsListResponse {
  appeals: ModerationAppeal[];
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface UserNotification {
  id: number;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  related_type?: string;
  related_id?: number;
  created_at: string;
  read_at?: string;
  expires_at?: string;
  additional_data?: Record<string, any>;
}

export interface NotificationPreferences {
  id?: number;
  user_id: string;
  // Email preferences
  email_reviews: boolean;
  email_comments: boolean;
  email_mentions: boolean;
  email_appeals: boolean;
  email_moderation: boolean;
  email_system: boolean;
  // In-app preferences
  inapp_reviews: boolean;
  inapp_comments: boolean;
  inapp_mentions: boolean;
  inapp_appeals: boolean;
  inapp_moderation: boolean;
  inapp_system: boolean;
  // Email frequency
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  digest_day_of_week: number;
  digest_hour: number;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationsResponse {
  notifications: UserNotification[];
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface NotificationPreferencesResponse {
  message: string;
  preferences: NotificationPreferences;
}

// Component prop types
export interface ReputationDisplayProps {
  userId: string;
  showBreakdown?: boolean;
  className?: string;
}

export interface AppealSubmissionProps {
  contentType: 'comment' | 'review' | 'profile';
  contentId: number;
  originalAction: string;
  reportId?: number;
  onSubmitted?: (appeal: ModerationAppeal) => void;
  onCancel?: () => void;
}

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: UserNotification) => void;
}

export interface NotificationPreferencesProps {
  userId: string;
  onSaved?: (preferences: NotificationPreferences) => void;
}

// Hook return types
export interface UseReputationResult {
  reputation: UserReputation | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  recalculate: () => Promise<boolean>;
}

export interface UseAppealsResult {
  appeals: ModerationAppeal[];
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
  createAppeal: (data: CreateAppealRequest) => Promise<ModerationAppeal | null>;
  updateAppeal: (id: number, data: UpdateAppealRequest) => Promise<ModerationAppeal | null>;
  refetch: (filters?: { status?: string; page?: number; limit?: number }) => Promise<void>;
}

export interface UseNotificationsResult {
  notifications: UserNotification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  } | null;
  markAsRead: (id: number) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  refetch: (filters?: { unread_only?: boolean; page?: number; limit?: number }) => Promise<void>;
}

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (data: Partial<NotificationPreferences>) => Promise<boolean>;
  refetch: () => Promise<void>;
}