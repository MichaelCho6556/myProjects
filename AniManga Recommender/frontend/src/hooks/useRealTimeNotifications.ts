// ABOUTME: Production-ready hook for real-time notifications using Server-Sent Events
// ABOUTME: Handles automatic reconnection, error recovery, and efficient state management

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

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
    } catch (error: any) {
      logger.error("Failed to fetch initial notifications", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "useRealTimeNotifications",
        operation: "fetchInitialNotifications",
        userId: user?.id
      });
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
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: NotificationEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
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
              logger.error("Notification stream error", {
                error: data.message || "Connection error",
                context: "useRealTimeNotifications",
                operation: "handleNotificationEvent",
                userId: user?.id
              });
              setError(data.message || 'Connection error');
              break;
          }
        } catch (parseError: any) {
          logger.error("Failed to parse notification event", {
            error: parseError?.message || "Unknown error",
            context: "useRealTimeNotifications",
            operation: "parseNotificationEvent",
            userId: user?.id
          });
        }
      };

      eventSource.onerror = (error: any) => {
        logger.error("EventSource error", {
          error: error instanceof Error ? error.message : "Unknown error" || "EventSource connection error",
          context: "useRealTimeNotifications",
          operation: "eventSourceError",
          userId: user?.id
        });
        setIsConnected(false);
        setError('Connection lost');
        
        eventSource.close();
        eventSourceRef.current = null;
        
        // Implement exponential backoff for reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = calculateReconnectDelay(reconnectAttempts.current);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectToNotificationStream();
          }, delay);
        } else {
          logger.error("Max reconnection attempts reached. Manual refresh required.", {
            context: "useRealTimeNotifications",
            operation: "maxReconnectionAttemptsReached",
            userId: user?.id,
            attempts: reconnectAttempts
          });
          setError('Connection failed. Please refresh the page.');
        }
      };

      eventSourceRef.current = eventSource;
      
    } catch (error: any) {
      logger.error("Failed to establish notification stream", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "useRealTimeNotifications",
        operation: "connectToNotificationStream",
        userId: user?.id
      });
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
    } catch (error: any) {
      logger.error("Failed to mark notification as read", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "useRealTimeNotifications",
        operation: "markAsRead",
        userId: user?.id,
        notificationId: notificationId
      });
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
    } catch (error: any) {
      logger.error("Failed to mark all notifications as read", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "useRealTimeNotifications",
        operation: "markAllAsRead",
        userId: user?.id
      });
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