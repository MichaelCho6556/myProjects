/**
 * Cold Start Detection Hook
 * 
 * This hook provides real-time cold start detection for the application,
 * allowing components to show appropriate loading states when the backend
 * is starting up from a cold state (common on free-tier hosting).
 * 
 * @module useColdStart
 * @since 1.0.0
 */

import { useState, useEffect } from 'react';
import { coldStartDetector, ColdStartEvent } from '../services/api';
import { localStorage } from '../utils/localStorage';

interface ColdStartState {
  /**
   * Whether a cold start is currently in progress
   */
  isInColdStart: boolean;
  
  /**
   * Duration of the cold start in milliseconds (once resolved)
   */
  coldStartDuration?: number;
  
  /**
   * Whether cached data is available for offline browsing
   */
  hasCachedData: boolean;
  
  /**
   * Timestamp of when cold start was detected
   */
  detectedAt?: number;
}

/**
 * Hook for monitoring cold start status
 * 
 * @returns {ColdStartState} Current cold start state
 * 
 * @example
 * ```tsx
 * const { isInColdStart, hasCachedData } = useColdStart();
 * 
 * if (isInColdStart) {
 *   return <ColdStartLoader hasCachedData={hasCachedData} />;
 * }
 * ```
 */
export const useColdStart = (): ColdStartState => {
  const [state, setState] = useState<ColdStartState>({
    isInColdStart: coldStartDetector.isInColdStart(),
    hasCachedData: checkCachedData()
  });

  useEffect(() => {
    // Subscribe to cold start events
    const unsubscribe = coldStartDetector.subscribe((event: ColdStartEvent) => {
      if (event.type === 'cold-start-detected') {
        setState({
          isInColdStart: true,
          detectedAt: event.timestamp,
          hasCachedData: checkCachedData()
        });
      } else if (event.type === 'cold-start-resolved') {
        setState(prev => ({
          ...prev,
          isInColdStart: false,
          ...(event.duration !== undefined && { coldStartDuration: event.duration })
        }));
        
        // Store cold start duration for analytics
        if (event.duration) {
          storeColdStartMetrics(event.duration);
        }
      }
    });

    return unsubscribe;
  }, []);

  return state;
};

/**
 * Check if cached data is available
 */
function checkCachedData(): boolean {
  try {
    // Check for cached query data
    const cachedQueries = localStorage.getItem<any>('tanstack-query-cache');
    if (!cachedQueries) return false;
    
    // Check if we have any items or recommendations cached
    const hasItems = localStorage.hasItem('items_fallback');
    const hasRecommendations = localStorage.getAllKeys()
      .some(key => key.startsWith('recommendations_'));
    
    return hasItems || hasRecommendations || Object.keys(cachedQueries).length > 0;
  } catch {
    return false;
  }
}

/**
 * Store cold start metrics for analytics
 */
function storeColdStartMetrics(duration: number): void {
  try {
    const metrics = localStorage.getItem<any[]>('cold_start_metrics') || [];
    metrics.push({
      duration,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });
    
    // Keep only last 10 metrics
    if (metrics.length > 10) {
      metrics.shift();
    }
    
    localStorage.setItem('cold_start_metrics', metrics, {
      ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  } catch (error) {
    console.warn('Failed to store cold start metrics:', error);
  }
}

/**
 * Get average cold start duration from stored metrics
 */
export function getAverageColdStartDuration(): number | null {
  try {
    const metrics = localStorage.getItem<any[]>('cold_start_metrics');
    if (!metrics || metrics.length === 0) return null;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return Math.round(total / metrics.length);
  } catch {
    return null;
  }
}