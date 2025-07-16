// ABOUTME: Production-ready error logging utility with environment-based configuration
// ABOUTME: Centralized logging service to replace console.error statements throughout the app

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
}

class Logger {
  private readonly isDevelopment: boolean;
  private readonly isProduction: boolean;
  private readonly logBuffer: LogEntry[] = [];
  private readonly maxBufferSize = 100;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    if (context) {
      entry.context = context;
    }

    const userId = this.getCurrentUserId();
    if (userId) {
      entry.userId = userId;
    }

    if (error?.stack) {
      entry.stack = error.stack;
    }

    return entry;
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from various sources
    try {
      const authData = localStorage.getItem('auth_data');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch {
      // Silently fail if auth data is malformed
    }
    return undefined;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private async sendToService(entry: LogEntry): Promise<void> {
    if (!this.isProduction) return;

    // In production, integrate with error tracking service (Sentry, LogRocket, etc.)
    try {
      // Example integration - replace with actual service
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Fallback to console in case of logging service failure
      console.error('Failed to send log to service:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // In production, only log errors and warnings
    return level === 'error' || level === 'warn';
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    const entry = this.createLogEntry('error', message, context, error);
    this.addToBuffer(entry);

    if (this.shouldLog('error')) {
      if (this.isDevelopment) {
        console.error(`[ERROR] ${message}`, { context, error });
      } else {
        // In production, send to service but don't expose in console
        this.sendToService(entry);
      }
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, context);
    this.addToBuffer(entry);

    if (this.shouldLog('warn')) {
      if (this.isDevelopment) {
        console.warn(`[WARN] ${message}`, { context });
      } else {
        this.sendToService(entry);
      }
    }
  }

  info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, context);
    this.addToBuffer(entry);

    if (this.shouldLog('info')) {
      if (this.isDevelopment) {
        console.info(`[INFO] ${message}`, { context });
      }
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('debug', message, context);
    this.addToBuffer(entry);

    if (this.shouldLog('debug')) {
      if (this.isDevelopment) {
        console.debug(`[DEBUG] ${message}`, { context });
      }
    }
  }

  // Get recent logs for debugging
  getRecentLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Clear the log buffer
  clearLogs(): void {
    this.logBuffer.length = 0;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogEntry, LogLevel };