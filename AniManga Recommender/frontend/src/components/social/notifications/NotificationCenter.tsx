// ABOUTME: Dropdown notification center component for displaying user notifications
// ABOUTME: Features real-time notifications, mark as read functionality, and notification management

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationCenterProps, UserNotification } from '../../../types/reputation';
import { useNotifications } from '../../../hooks/useReputation';
import './NotificationCenter.css';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNotificationClick
}) => {
  const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    error, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    refetch 
  } = useNotifications({ limit: 50 });
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const handleNotificationClick = async (notification: UserNotification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Call custom click handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      navigate(notification.action_url);
    }

    onClose();
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'new_appeal': return '⚖️';
      case 'appeal_resolved': return '✅';
      case 'content_removed': return '🗑️';
      case 'warning_issued': return '⚠️';
      case 'review_reply': return '💬';
      case 'comment_reply': return '💭';
      case 'mention': return '📢';
      case 'moderation': return '🛡️';
      case 'system': return '🔧';
      default: return '📋';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'normal': return 'priority-normal';
      case 'low': return 'priority-low';
      default: return 'priority-normal';
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="notification-center-overlay">
      <div className="notification-center" ref={dropdownRef}>
        <div className="notification-header">
          <h3>Notifications</h3>
          <div className="notification-header-actions">
            {unreadCount > 0 && (
              <button
                className="mark-all-read-button"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
            <button
              className="close-button"
              onClick={onClose}
              title="Close notifications"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="notification-content">
          {loading ? (
            <div className="notification-loading">
              <div className="loading-spinner"></div>
              <span>Loading notifications...</span>
            </div>
          ) : error ? (
            <div className="notification-error">
              <span className="error-icon">⚠️</span>
              <span>Failed to load notifications</span>
              <button onClick={() => refetch()} className="retry-button">
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <span className="empty-icon">🔔</span>
              <h4>No notifications</h4>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''} ${getPriorityColor(notification.priority)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  
                  <div className="notification-body">
                    <div className="notification-title">
                      {notification.title}
                      {!notification.is_read && (
                        <span className="unread-indicator"></span>
                      )}
                    </div>
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-time">
                      {formatRelativeTime(notification.created_at)}
                    </div>
                  </div>

                  {notification.priority === 'urgent' && (
                    <div className="urgent-indicator">
                      🔥
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="notification-footer">
            <button
              className="view-all-button"
              onClick={() => {
                navigate('/notifications');
                onClose();
              }}
            >
              View all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Badge component for showing unread count
export const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;

  return (
    <span className="notification-badge">
      {count > 99 ? '99+' : count}
    </span>
  );
};