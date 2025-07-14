/**
 * CacheStatusIndicator Component
 * 
 * Displays cache status information for dashboard data including:
 * - Whether data came from cache or was freshly calculated
 * - Last update timestamp
 * - Update in progress indicator
 * 
 * @component
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import './CacheStatusIndicator.css';

interface CacheStatusIndicatorProps {
  cacheHit?: boolean | undefined;
  lastUpdated?: string | undefined;
  updating?: boolean | undefined;
  onRefresh?: (() => void) | undefined;
}

const CacheStatusIndicator: React.FC<CacheStatusIndicatorProps> = ({
  cacheHit = false,
  lastUpdated,
  updating = false,
  onRefresh
}) => {
  // Don't render if no cache metadata is available
  if (cacheHit === undefined && !lastUpdated && !updating) {
    return null;
  }

  const getLastUpdatedText = () => {
    if (!lastUpdated) return 'Never';
    
    try {
      const date = new Date(lastUpdated);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const getCacheStatusIcon = () => {
    if (updating) return '🔄';
    if (cacheHit) return '💾';
    return '⚡';
  };

  const getCacheStatusText = () => {
    if (updating) return 'Updating...';
    if (cacheHit) return 'Cached';
    return 'Fresh';
  };

  const getCacheStatusClass = () => {
    if (updating) return 'updating';
    if (cacheHit) return 'cached';
    return 'fresh';
  };

  return (
    <div className={`cache-status-indicator ${getCacheStatusClass()}`}>
      <div className="cache-status-content">
        <span className="cache-status-icon">{getCacheStatusIcon()}</span>
        <div className="cache-status-info">
          <span className="cache-status-label">{getCacheStatusText()}</span>
          {lastUpdated && (
            <span className="cache-status-time">
              Updated {getLastUpdatedText()}
            </span>
          )}
        </div>
      </div>
      
      {onRefresh && !updating && (
        <button
          className="cache-refresh-button"
          onClick={onRefresh}
          title="Refresh statistics"
          aria-label="Refresh statistics"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default CacheStatusIndicator;