// ABOUTME: Custom React hook for managing user reputation data and API interactions
// ABOUTME: Provides reputation fetching, caching, and recalculation functionality

import { useState, useEffect, useCallback } from 'react';
import { 
  UserReputation, 
  UseReputationResult,
  UseAppealsResult,
  ModerationAppeal,
  CreateAppealRequest,
  UpdateAppealRequest,
  UseNotificationsResult,
  UserNotification,
  UseNotificationPreferencesResult,
  NotificationPreferences
} from '../types/reputation';
import { useAuthenticatedApi } from './useAuthenticatedApi';

export function useReputation(userId: string): UseReputationResult {
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { get, post } = useAuthenticatedApi();

  const fetchReputation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await get(`/api/users/${userId}/reputation`);
      
      if (response.ok) {
        const data = await response.json();
        setReputation(data);
      } else if (response.status === 403) {
        setError('Access denied');
      } else {
        throw new Error('Failed to fetch reputation');
      }
    } catch (err) {
      console.error('Error fetching reputation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, get]);

  const recalculate = useCallback(async (): Promise<boolean> => {
    try {
      const response = await post(`/api/users/${userId}/reputation/recalculate`, {});
      
      if (response.ok) {
        const data = await response.json();
        if (data.reputation) {
          setReputation(data.reputation);
        }
        return true;
      } else {
        console.error('Failed to recalculate reputation');
        return false;
      }
    } catch (err) {
      console.error('Error recalculating reputation:', err);
      return false;
    }
  }, [userId, post]);

  useEffect(() => {
    if (userId) {
      fetchReputation();
    }
  }, [userId, fetchReputation]);

  return {
    reputation,
    loading,
    error,
    refetch: fetchReputation,
    recalculate
  };
}

export function useAppeals(filters: { status?: string; page?: number; limit?: number } = {}): UseAppealsResult {
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseAppealsResult['pagination']>(null);
  const { get, post, put } = useAuthenticatedApi();

  const fetchAppeals = useCallback(async (newFilters: typeof filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      const mergedFilters = { ...filters, ...newFilters };
      
      if (mergedFilters.status) params.append('status', mergedFilters.status);
      if (mergedFilters.page) params.append('page', mergedFilters.page.toString());
      if (mergedFilters.limit) params.append('limit', mergedFilters.limit.toString());

      const response = await get(`/api/appeals${params.toString() ? `?${params.toString()}` : ''}`);
      
      if (response.ok) {
        const data = await response.json();
        setAppeals(data.appeals || []);
        setPagination(data.pagination || null);
      } else {
        throw new Error('Failed to fetch appeals');
      }
    } catch (err) {
      console.error('Error fetching appeals:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [get, filters]);

  const createAppeal = useCallback(async (data: CreateAppealRequest): Promise<ModerationAppeal | null> => {
    try {
      const response = await post('/api/appeals', data);
      
      if (response.ok) {
        const result = await response.json();
        // Refresh appeals list
        await fetchAppeals();
        return result.appeal;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create appeal');
      }
    } catch (err) {
      console.error('Error creating appeal:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [post, fetchAppeals]);

  const updateAppeal = useCallback(async (id: number, data: UpdateAppealRequest): Promise<ModerationAppeal | null> => {
    try {
      const response = await put(`/api/appeals/${id}`, data);
      
      if (response.ok) {
        const result = await response.json();
        // Refresh appeals list
        await fetchAppeals();
        return result.appeal;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update appeal');
      }
    } catch (err) {
      console.error('Error updating appeal:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [put, fetchAppeals]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  return {
    appeals,
    loading,
    error,
    pagination,
    createAppeal,
    updateAppeal,
    refetch: fetchAppeals
  };
}

export function useNotifications(filters: { unread_only?: boolean; page?: number; limit?: number } = {}): UseNotificationsResult {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseNotificationsResult['pagination']>(null);
  const { get, put } = useAuthenticatedApi();

  const fetchNotifications = useCallback(async (newFilters: typeof filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      const mergedFilters = { ...filters, ...newFilters };
      
      if (mergedFilters.unread_only) params.append('unread_only', 'true');
      if (mergedFilters.page) params.append('page', mergedFilters.page.toString());
      if (mergedFilters.limit) params.append('limit', mergedFilters.limit.toString());

      const response = await get(`/api/notifications${params.toString() ? `?${params.toString()}` : ''}`);
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setPagination(data.pagination || null);
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [get, filters]);

  const markAsRead = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await put(`/api/notifications/${id}/read`, {});
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification
          )
        );
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, [put]);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const response = await put('/api/notifications/read-all', {});
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ 
            ...notification, 
            is_read: true, 
            read_at: new Date().toISOString() 
          }))
        );
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return false;
    }
  }, [put]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    pagination,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}

export function useNotificationPreferences(userId: string): UseNotificationPreferencesResult {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { get, put } = useAuthenticatedApi();

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await get(`/api/users/${userId}/notification-preferences`);
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      } else if (response.status === 403) {
        setError('Access denied');
      } else {
        throw new Error('Failed to fetch notification preferences');
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, get]);

  const updatePreferences = useCallback(async (data: Partial<NotificationPreferences>): Promise<boolean> => {
    try {
      const response = await put(`/api/users/${userId}/notification-preferences`, data);
      
      if (response.ok) {
        const result = await response.json();
        if (result.preferences) {
          setPreferences(result.preferences);
        }
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update preferences');
      }
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [userId, put]);

  useEffect(() => {
    if (userId) {
      fetchPreferences();
    }
  }, [userId, fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refetch: fetchPreferences
  };
}