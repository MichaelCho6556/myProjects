// ABOUTME: Production-ready hook for real-time notifications using Server-Sent Events
// ABOUTME: Handles automatic reconnection, error recovery, and efficient state management

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

interface NotificationEvent {
  type: 'notification' | 'connected' | 'heartbeat' | 'error';
  id?: number;
  title?: string;
  message?: string;
  read?: boolean;
  created_at?: string;
  data?: any;
  timestamp?: string;
}

interface UseRealTimeNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  error: string | null;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
}

export const useRealTimeNotifications = (): UseRealTimeNotificationsReturn => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second

  const calculateReconnectDelay = (attempts: number): number => {
    // Exponential backoff with jitter: base * 2^attempts + random(0-1000)ms
    return Math.min(baseReconnectDelay * Math.pow(2, attempts) + Math.random() * 1000, 30000);
  };

  const fetchInitialNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('supabase_token');
      if (!token) return;

      const response = await fetch('/api/auth/notifications?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch initial notifications:', error);
    }
  }, [user]);

  const connectToNotificationStream = useCallback(() => {
    if (!user || eventSourceRef.current) return;

    const token = localStorage.getItem('supabase_token');
    if (!token) return;

    setError(null);
    
    try {
      const eventSource = new EventSource(
        `/api/auth/notifications/stream?auth=${encodeURIComponent(token)}`
      );

      eventSource.onopen = () => {
        console.log('Real-time notification connection established');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: NotificationEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              console.log('Notification stream connected at:', data.timestamp);
              break;
              
            case 'heartbeat':
              // Connection is alive, no action needed
              break;
              
            case 'notification':
              if (data.id && data.title && data.message) {
                const newNotification: Notification = {
                  id: data.id,
                  type: data.type,
                  title: data.title,
                  message: data.message,
                  read: data.read || false,
                  created_at: data.created_at || new Date().toISOString(),
                  data: data.data
                };
                
                setNotifications(prev => {
                  // Avoid duplicates
                  if (prev.some(n => n.id === newNotification.id)) {
                    return prev;
                  }
                  return [newNotification, ...prev.slice(0, 9)]; // Keep only 10 latest
                });
                
                if (!newNotification.read) {
                  setUnreadCount(prev => prev + 1);
                }
              }
              break;
              
            case 'error':
              console.error('Notification stream error:', data.message);
              setError(data.message || 'Connection error');
              break;
          }
        } catch (parseError) {
          console.error('Failed to parse notification event:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setIsConnected(false);
        setError('Connection lost');
        
        eventSource.close();
        eventSourceRef.current = null;
        
        // Implement exponential backoff for reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = calculateReconnectDelay(reconnectAttempts.current);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectToNotificationStream();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached. Manual refresh required.');
          setError('Connection failed. Please refresh the page.');
        }
      };

      eventSourceRef.current = eventSource;
      
    } catch (error) {
      console.error('Failed to establish notification stream:', error);
      setError('Failed to connect to notification service');
    }
  }, [user]);

  const disconnectFromNotificationStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const token = localStorage.getItem('supabase_token');
      if (!token) return;

      const response = await fetch(`/api/auth/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      if (!token) return;

      const response = await fetch('/api/auth/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    fetchInitialNotifications();
  }, [fetchInitialNotifications]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (user) {
      fetchInitialNotifications();
      connectToNotificationStream();
    } else {
      disconnectFromNotificationStream();
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      disconnectFromNotificationStream();
    };
  }, [user, fetchInitialNotifications, connectToNotificationStream, disconnectFromNotificationStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromNotificationStream();
    };
  }, [disconnectFromNotificationStream]);

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  };
};