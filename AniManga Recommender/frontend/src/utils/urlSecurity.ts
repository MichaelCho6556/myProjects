/**
 * URL Security Utilities
 * 
 * Shared utilities for URL sanitization and validation
 * to prevent XSS and other security vulnerabilities
 */

/**
 * Sanitizes URLs to prevent XSS attacks
 * Blocks dangerous schemes like javascript:, data:, etc.
 * @param url - The URL to sanitize
 * @returns Sanitized URL or 'about:blank' if dangerous
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return 'about:blank';
  
  // Decode URL to catch encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    // If decoding fails, URL might be malformed
    return 'about:blank';
  }
  
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // Dangerous schemes to block
  const dangerousSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:',
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return 'about:blank';
    }
  }
  
  // Additional check for encoded attempts
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return 'about:blank';
  }
  
  return url;
};