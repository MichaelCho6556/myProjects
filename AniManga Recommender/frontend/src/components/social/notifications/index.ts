// ABOUTME: Barrel export file for notification system components
// ABOUTME: Provides centralized exports for notification center, preferences, and utilities

export { NotificationCenter, NotificationBadge } from './NotificationCenter';
export { NotificationPreferencesComponent as NotificationPreferences } from './NotificationPreferences';

// Re-export types for convenience
export type {
  UserNotification,
  NotificationPreferences as NotificationPreferencesType,
  NotificationsResponse,
  NotificationCenterProps,
  NotificationPreferencesProps,
  UseNotificationsResult,
  UseNotificationPreferencesResult
} from '../../../types/reputation';