/**
 * Feature Flag Configuration
 * 
 * This module manages feature toggles for gradual rollout and A/B testing.
 * Features can be toggled on/off without code deployment.
 */

/**
 * Feature flag definitions
 */
export interface FeatureFlags {
  // Cache and Performance
  SHOW_CACHED_STATS: boolean;
  ENABLE_CACHE_INDICATORS: boolean;
  SHOW_LAST_UPDATED_TIME: boolean;
  ENABLE_MANUAL_REFRESH: boolean;
  
  // Content Moderation
  SHOW_TOXICITY_SCORES: boolean;
  ENABLE_MODERATION_BADGES: boolean;
  SHOW_FLAGGED_CONTENT_WARNING: boolean;
  ENABLE_MODERATION_DASHBOARD: boolean;
  
  // Analytics and Statistics
  ENABLE_ADVANCED_STATS: boolean;
  SHOW_GENRE_CHARTS: boolean;
  ENABLE_ANALYTICS_EXPORT: boolean;
  SHOW_PLATFORM_STATS: boolean;
  
  // Social Features
  ENABLE_ACTIVITY_FEEDS: boolean;
  SHOW_TRENDING_CONTENT: boolean;
  ENABLE_ACHIEVEMENTS: boolean;
  
  // Performance Optimizations
  USE_CACHED_RECOMMENDATIONS: boolean;
  ENABLE_VIRTUAL_SCROLLING: boolean;
  PRELOAD_USER_DATA: boolean;
  
  // Developer Tools
  SHOW_CACHE_DEBUG_INFO: boolean;
  ENABLE_PERFORMANCE_METRICS: boolean;
  LOG_API_TIMINGS: boolean;
}

/**
 * Get feature flag value from environment or default
 */
const getFeatureFlag = (envKey: string, defaultValue: boolean): boolean => {
  const envValue = process.env[`REACT_APP_FEATURE_${envKey}`];
  if (envValue === undefined) return defaultValue;
  return envValue.toLowerCase() === 'true';
};

/**
 * Feature flag configuration
 * 
 * In production, these would be fetched from a feature flag service
 * For now, they're controlled by environment variables with defaults
 */
export const FEATURES: FeatureFlags = {
  // Cache and Performance - Phase 1
  SHOW_CACHED_STATS: getFeatureFlag('SHOW_CACHED_STATS', true),
  ENABLE_CACHE_INDICATORS: getFeatureFlag('ENABLE_CACHE_INDICATORS', true),
  SHOW_LAST_UPDATED_TIME: getFeatureFlag('SHOW_LAST_UPDATED_TIME', true),
  ENABLE_MANUAL_REFRESH: getFeatureFlag('ENABLE_MANUAL_REFRESH', true),
  
  // Content Moderation - Phase 2
  SHOW_TOXICITY_SCORES: getFeatureFlag('SHOW_TOXICITY_SCORES', false),
  ENABLE_MODERATION_BADGES: getFeatureFlag('ENABLE_MODERATION_BADGES', false),
  SHOW_FLAGGED_CONTENT_WARNING: getFeatureFlag('SHOW_FLAGGED_CONTENT_WARNING', false),
  ENABLE_MODERATION_DASHBOARD: getFeatureFlag('ENABLE_MODERATION_DASHBOARD', false),
  
  // Analytics and Statistics - Phase 1
  ENABLE_ADVANCED_STATS: getFeatureFlag('ENABLE_ADVANCED_STATS', true),
  SHOW_GENRE_CHARTS: getFeatureFlag('SHOW_GENRE_CHARTS', true),
  ENABLE_ANALYTICS_EXPORT: getFeatureFlag('ENABLE_ANALYTICS_EXPORT', false),
  SHOW_PLATFORM_STATS: getFeatureFlag('SHOW_PLATFORM_STATS', false),
  
  // Social Features - Phase 3
  ENABLE_ACTIVITY_FEEDS: getFeatureFlag('ENABLE_ACTIVITY_FEEDS', false),
  SHOW_TRENDING_CONTENT: getFeatureFlag('SHOW_TRENDING_CONTENT', false),
  ENABLE_ACHIEVEMENTS: getFeatureFlag('ENABLE_ACHIEVEMENTS', false),
  
  // Performance Optimizations - Phase 1
  USE_CACHED_RECOMMENDATIONS: getFeatureFlag('USE_CACHED_RECOMMENDATIONS', true),
  ENABLE_VIRTUAL_SCROLLING: getFeatureFlag('ENABLE_VIRTUAL_SCROLLING', false),
  PRELOAD_USER_DATA: getFeatureFlag('PRELOAD_USER_DATA', true),
  
  // Developer Tools
  SHOW_CACHE_DEBUG_INFO: getFeatureFlag('SHOW_CACHE_DEBUG_INFO', process.env.NODE_ENV === 'development'),
  ENABLE_PERFORMANCE_METRICS: getFeatureFlag('ENABLE_PERFORMANCE_METRICS', process.env.NODE_ENV === 'development'),
  LOG_API_TIMINGS: getFeatureFlag('LOG_API_TIMINGS', process.env.NODE_ENV === 'development'),
};

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return FEATURES[feature] ?? false;
};

/**
 * Get all enabled features (for debugging)
 */
export const getEnabledFeatures = (): string[] => {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
};

/**
 * Feature flag groups for UI organization
 */
export const FEATURE_GROUPS = {
  cache: ['SHOW_CACHED_STATS', 'ENABLE_CACHE_INDICATORS', 'SHOW_LAST_UPDATED_TIME', 'ENABLE_MANUAL_REFRESH'],
  moderation: ['SHOW_TOXICITY_SCORES', 'ENABLE_MODERATION_BADGES', 'SHOW_FLAGGED_CONTENT_WARNING', 'ENABLE_MODERATION_DASHBOARD'],
  analytics: ['ENABLE_ADVANCED_STATS', 'SHOW_GENRE_CHARTS', 'ENABLE_ANALYTICS_EXPORT', 'SHOW_PLATFORM_STATS'],
  social: ['ENABLE_ACTIVITY_FEEDS', 'SHOW_TRENDING_CONTENT', 'ENABLE_ACHIEVEMENTS'],
  performance: ['USE_CACHED_RECOMMENDATIONS', 'ENABLE_VIRTUAL_SCROLLING', 'PRELOAD_USER_DATA'],
  dev: ['SHOW_CACHE_DEBUG_INFO', 'ENABLE_PERFORMANCE_METRICS', 'LOG_API_TIMINGS'],
} as const;

/**
 * Hook for using feature flags in React components
 * 
 * @example
 * const showCachedStats = useFeatureFlag('SHOW_CACHED_STATS');
 */
export const useFeatureFlag = (feature: keyof FeatureFlags): boolean => {
  return isFeatureEnabled(feature);
};

// Export type for use in components
export type FeatureFlagKey = keyof FeatureFlags;