/**
 * ColdStartLoader Component - Specialized loading indicator for backend cold starts
 * 
 * This component provides an enhanced loading experience specifically designed for
 * handling backend cold starts on serverless platforms (e.g., Render free tier).
 * It shows progressive messages, connection status, and offline options to keep
 * users informed and engaged during potentially long initial load times.
 * 
 * Features:
 * - Progressive messaging based on elapsed time
 * - Network status awareness with slow connection warnings
 * - Offline mode detection with cached data options
 * - Animated progress indication
 * - Accessibility compliant with ARIA labels
 * - Mobile-responsive design
 * 
 * @component
 * @since 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import './ColdStartLoader.css';

interface ColdStartLoaderProps {
  /**
   * Whether the cold start loader is visible
   */
  isVisible: boolean;
  
  /**
   * Optional callback when user chooses to browse offline
   */
  onBrowseOffline?: () => void;
  
  /**
   * Whether cached data is available for offline browsing
   */
  hasCachedData?: boolean;
  
  /**
   * Optional custom messages to override defaults
   */
  customMessages?: {
    initial?: string;
    extended?: string;
    prolonged?: string;
  };
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Time-based message progression for cold starts
 */
const DEFAULT_MESSAGES = {
  initial: "Starting up the server...",
  extended: "Almost there! The server is waking up...",
  prolonged: "This is taking longer than usual. Thank you for your patience!",
  offline: "You appear to be offline",
  slowConnection: "Slow connection detected - this may take a moment"
};

/**
 * Message timing thresholds (in milliseconds)
 */
const MESSAGE_TIMINGS = {
  initial: 0,
  extended: 5000,
  prolonged: 15000
};

/**
 * ColdStartLoader Component Implementation
 */
const ColdStartLoader: React.FC<ColdStartLoaderProps> = ({
  isVisible,
  onBrowseOffline,
  hasCachedData = false,
  customMessages = {},
  className = ''
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(DEFAULT_MESSAGES.initial);
  const { isOnline, shouldWarnSlowConnection } = useNetworkStatus();
  
  // Merge custom messages with defaults
  const messages = {
    ...DEFAULT_MESSAGES,
    ...customMessages
  };
  
  // Update message based on elapsed time and network status
  useEffect(() => {
    if (!isVisible) {
      setElapsedTime(0);
      setCurrentMessage(messages.initial);
      return;
    }
    
    // Set up interval to track elapsed time
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
      
      // Update message based on conditions
      if (!isOnline) {
        setCurrentMessage(messages.offline);
      } else if (shouldWarnSlowConnection) {
        setCurrentMessage(messages.slowConnection);
      } else if (elapsed >= MESSAGE_TIMINGS.prolonged) {
        setCurrentMessage(messages.prolonged);
      } else if (elapsed >= MESSAGE_TIMINGS.extended) {
        setCurrentMessage(messages.extended);
      } else {
        setCurrentMessage(messages.initial);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isVisible, isOnline, shouldWarnSlowConnection, messages]);
  
  // Calculate progress percentage (caps at 90% to avoid false completion)
  const calculateProgress = useCallback(() => {
    if (!isVisible) return 0;
    
    // Logarithmic progression that slows down over time
    const maxProgress = 90;
    const timeInSeconds = elapsedTime / 1000;
    const progress = Math.min(
      maxProgress,
      Math.log(timeInSeconds + 1) * 25
    );
    
    return Math.round(progress);
  }, [elapsedTime, isVisible]);
  
  if (!isVisible) return null;
  
  const progress = calculateProgress();
  const showOfflineOptions = !isOnline && hasCachedData && onBrowseOffline;
  
  const loaderClasses = [
    'cold-start-loader',
    !isOnline ? 'cold-start-loader--offline' : '',
    shouldWarnSlowConnection ? 'cold-start-loader--slow' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div
      className={loaderClasses}
      role="status"
      aria-live="polite"
      aria-label={currentMessage}
    >
      <div className="cold-start-content">
        {/* Animated logo or spinner */}
        <div className="cold-start-animation">
          <div className="cold-start-spinner">
            <div className="spinner-ring spinner-ring--1"></div>
            <div className="spinner-ring spinner-ring--2"></div>
            <div className="spinner-ring spinner-ring--3"></div>
          </div>
          {/* Show flame icon for cold start */}
          <div className="cold-start-icon" aria-hidden="true">
            🔥
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="cold-start-progress">
          <div 
            className="cold-start-progress-bar"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        
        {/* Message display */}
        <div className="cold-start-message">
          <h3 className="cold-start-title">
            {currentMessage}
          </h3>
          
          {/* Additional context for long waits */}
          {elapsedTime >= MESSAGE_TIMINGS.prolonged && isOnline && (
            <p className="cold-start-subtitle">
              First visits can take 30-60 seconds as our free-tier server starts up.
              Future visits will be much faster!
            </p>
          )}
          
          {/* Offline options */}
          {showOfflineOptions && (
            <div className="cold-start-offline-options">
              <p className="cold-start-offline-text">
                You can browse your cached data while offline
              </p>
              <button
                className="cold-start-offline-button"
                onClick={onBrowseOffline}
                aria-label="Browse offline with cached data"
              >
                Browse Offline
              </button>
            </div>
          )}
          
          {/* Connection status indicators */}
          <div className="cold-start-status">
            {!isOnline && (
              <span className="status-indicator status-indicator--offline">
                <span className="status-icon">📵</span>
                Offline
              </span>
            )}
            {shouldWarnSlowConnection && isOnline && (
              <span className="status-indicator status-indicator--slow">
                <span className="status-icon">🐌</span>
                Slow Connection
              </span>
            )}
            {isOnline && !shouldWarnSlowConnection && elapsedTime > 0 && (
              <span className="status-indicator status-indicator--time">
                <span className="status-icon">⏱️</span>
                {Math.floor(elapsedTime / 1000)}s
              </span>
            )}
          </div>
        </div>
        
        {/* Tips for long waits */}
        {elapsedTime >= MESSAGE_TIMINGS.extended && isOnline && (
          <div className="cold-start-tips">
            <p className="cold-start-tip">
              💡 <strong>Tip:</strong> This only happens on the first visit after 
              the server has been idle. Your next visit will load instantly!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColdStartLoader;