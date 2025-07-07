import { ApiError, ID, LogEntry, LogLevel, Timestamp } from '../types/common';

// Error type enumeration
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  TIMEOUT = 'TIMEOUT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  MAINTENANCE = 'MAINTENANCE',
  UNKNOWN = 'UNKNOWN',
}

// Error severity
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Error category
export enum ErrorCategory {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  BUSINESS = 'BUSINESS',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE',
}

// Enhanced error interface
export interface EnhancedError extends Error {
  id: ID;
  type: ErrorType;
  severity: ErrorSeverity;
  category: ErrorCategory;
  code: string;
  statusCode?: number;
  timestamp: Timestamp;
  userId?: ID;
  sessionId?: ID;
  userAgent?: string;
  url?: string;
  details?: any;
  stackTrace?: string;
  context?: Record<string, any>;
  recoverable?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

// Error handler configuration
export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  enableRetry: boolean;
  enableUserFeedback: boolean;
  maxRetries: number;
  retryDelays: number[];
  logLevel: LogLevel;
  reportingEndpoint?: string;
  enableStackTrace: boolean;
  enableSourceMap: boolean;
  filterSensitiveData: boolean;
  notificationHandler?: (error: EnhancedError) => void;
}

// Error recovery strategy
export interface RecoveryStrategy {
  canRecover: (error: EnhancedError) => boolean;
  recover: (error: EnhancedError, context?: any) => Promise<any>;
  description: string;
}

// Error report interface
export interface ErrorReport {
  id: ID;
  error: EnhancedError;
  environment: {
    userAgent: string;
    url: string;
    timestamp: Timestamp;
    userId?: ID;
    sessionId?: ID;
  };
  breadcrumbs: Array<{
    timestamp: Timestamp;
    message: string;
    category: string;
    level: LogLevel;
    data?: any;
  }>;
  performance: {
    memory: any;
    timing: any;
  };
}

// Error handler class
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private recoveryStrategies: Map<ErrorType, RecoveryStrategy> = new Map();
  private errorQueue: EnhancedError[] = [];
  private breadcrumbs: Array<{
    timestamp: Timestamp;
    message: string;
    category: string;
    level: LogLevel;
    data?: any;
  }> = [];

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableReporting: true,
      enableRetry: true,
      enableUserFeedback: true,
      maxRetries: 3,
      retryDelays: [1000, 2000, 4000],
      logLevel: 'error',
      enableStackTrace: true,
      enableSourceMap: false,
      filterSensitiveData: true,
      ...config,
    };

    this.setupDefaultRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  // Setup default recovery strategies
  private setupDefaultRecoveryStrategies(): void {
    // Network error recovery
    this.registerRecoveryStrategy(ErrorType.NETWORK, {
      canRecover: error => error.retryCount! < this.config.maxRetries,
      recover: async (error, context) => {
        const delay = this.config.retryDelays[error.retryCount! - 1] || 5000;
        await this.delay(delay);
        return context?.retry?.();
      },
      description: 'Network error retry',
    });

    // Timeout error recovery
    this.registerRecoveryStrategy(ErrorType.TIMEOUT, {
      canRecover: error => error.retryCount! < this.config.maxRetries,
      recover: async (error, context) => {
        const delay = this.config.retryDelays[error.retryCount! - 1] || 3000;
        await this.delay(delay);
        return context?.retry?.();
      },
      description: 'Timeout error retry',
    });

    // Authorization error recovery
    this.registerRecoveryStrategy(ErrorType.AUTHORIZATION, {
      canRecover: error => error.statusCode === 401,
      recover: async (error, context) => {
        // Try to refresh token
        if (context?.refreshToken) {
          try {
            await context.refreshToken();
            return context?.retry?.();
          } catch (refreshError) {
            // Refresh failed, redirect to login page
            if (context?.redirectToLogin) {
              context.redirectToLogin();
            }
            throw refreshError;
          }
        }
        throw error;
      },
      description: 'Authorization error recovery',
    });

    // Server error recovery
    this.registerRecoveryStrategy(ErrorType.SERVER_ERROR, {
      canRecover: error => error.statusCode! >= 500 && error.retryCount! < 2,
      recover: async (error, context) => {
        const delay = 5000 + Math.random() * 5000; // 5-10 seconds random delay
        await this.delay(delay);
        return context?.retry?.();
      },
      description: 'Server error retry',
    });
  }

  // Setup global error handlers
  private setupGlobalErrorHandlers(): void {
    // Capture unhandled Promise errors
    window.addEventListener('unhandledrejection', event => {
      const error = this.createEnhancedError(event.reason, {
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        code: 'UNHANDLED_PROMISE_REJECTION',
      });
      this.handleError(error);
    });

    // Capture global JavaScript errors
    window.addEventListener('error', event => {
      const error = this.createEnhancedError(event.error || new Error(event.message), {
        type: ErrorType.CLIENT_ERROR,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        code: 'GLOBAL_ERROR',
        url: event.filename,
        details: {
          lineno: event.lineno,
          colno: event.colno,
        },
      });
      this.handleError(error);
    });
  }

  // Create enhanced error object
  createEnhancedError(
    error: Error | string | any,
    options: Partial<EnhancedError> = {}
  ): EnhancedError {
    const timestamp = Date.now();
    const id = this.generateErrorId();

    let baseError: Error;
    if (error instanceof Error) {
      baseError = error;
    } else if (typeof error === 'string') {
      baseError = new Error(error);
    } else {
      baseError = new Error('Unknown error');
    }

    return {
      ...baseError,
      id,
      type: options.type || ErrorType.UNKNOWN,
      severity: options.severity || ErrorSeverity.MEDIUM,
      category: options.category || ErrorCategory.SYSTEM,
      code: options.code || 'UNKNOWN_ERROR',
      statusCode: options.statusCode,
      timestamp,
      userId: options.userId,
      sessionId: options.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      details: options.details,
      stackTrace: this.config.enableStackTrace ? baseError.stack : undefined,
      context: options.context,
      recoverable: options.recoverable ?? true,
      retryCount: options.retryCount || 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
    };
  }

  // Create enhanced error from API error
  createFromApiError(apiError: ApiError): EnhancedError {
    const type = this.mapStatusCodeToErrorType(apiError.statusCode);
    const severity = this.mapStatusCodeToSeverity(apiError.statusCode);
    const category = this.mapStatusCodeToCategory(apiError.statusCode);

    return this.createEnhancedError(new Error(apiError.message), {
      type,
      severity,
      category,
      code: apiError.code,
      statusCode: apiError.statusCode,
      details: apiError.details,
      timestamp: apiError.timestamp,
    });
  }

  // Status code mapping
  private mapStatusCodeToErrorType(statusCode: number): ErrorType {
    if (statusCode >= 400 && statusCode < 500) {
      switch (statusCode) {
        case 401:
        case 403:
          return ErrorType.AUTHORIZATION;
        case 404:
          return ErrorType.NOT_FOUND;
        case 408:
          return ErrorType.TIMEOUT;
        case 422:
          return ErrorType.VALIDATION;
        case 429:
          return ErrorType.QUOTA_EXCEEDED;
        default:
          return ErrorType.CLIENT_ERROR;
      }
    } else if (statusCode >= 500) {
      switch (statusCode) {
        case 502:
        case 503:
        case 504:
          return ErrorType.SERVER_ERROR;
        default:
          return ErrorType.SERVER_ERROR;
      }
    }
    return ErrorType.UNKNOWN;
  }

  private mapStatusCodeToSeverity(statusCode: number): ErrorSeverity {
    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  private mapStatusCodeToCategory(statusCode: number): ErrorCategory {
    if (statusCode === 401 || statusCode === 403) return ErrorCategory.SECURITY;
    if (statusCode === 422) return ErrorCategory.BUSINESS;
    if (statusCode >= 500) return ErrorCategory.SYSTEM;
    return ErrorCategory.USER;
  }

  // Handle error
  async handleError(error: EnhancedError, context?: any): Promise<any> {
    try {
      // Record breadcrumb
      this.addBreadcrumb({
        timestamp: Date.now(),
        message: `Error handled: ${error.message}`,
        category: 'error',
        level: 'error',
        data: { errorId: error.id, type: error.type },
      });

      // Log recording
      if (this.config.enableLogging) {
        this.logError(error);
      }

      // Add to error queue
      this.errorQueue.push(error);
      if (this.errorQueue.length > 100) {
        this.errorQueue.shift();
      }

      // Attempt recovery
      if (this.config.enableRetry && error.recoverable) {
        const recoveryResult = await this.attemptRecovery(error, context);
        if (recoveryResult) {
          return recoveryResult;
        }
      }

      // Error reporting
      if (this.config.enableReporting) {
        await this.reportError(error);
      }

      // User feedback
      if (this.config.enableUserFeedback && this.config.notificationHandler) {
        this.config.notificationHandler(error);
      }

      throw error;
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
      throw error;
    }
  }

  // Attempt recovery
  private async attemptRecovery(error: EnhancedError, context?: any): Promise<any> {
    const strategy = this.recoveryStrategies.get(error.type);
    if (!strategy || !strategy.canRecover(error)) {
      return null;
    }

    try {
      error.retryCount = (error.retryCount || 0) + 1;
      const result = await strategy.recover(error, context);

      // Record successful recovery
      this.addBreadcrumb({
        timestamp: Date.now(),
        message: `Error recovered: ${error.message}`,
        category: 'recovery',
        level: 'info',
        data: { errorId: error.id, strategy: strategy.description },
      });

      return result;
    } catch (recoveryError) {
      // Record recovery failure
      this.addBreadcrumb({
        timestamp: Date.now(),
        message: `Error recovery failed: ${error.message}`,
        category: 'recovery',
        level: 'warn',
        data: { errorId: error.id, recoveryError: recoveryError.message },
      });

      return null;
    }
  }

  // Register recovery strategy
  registerRecoveryStrategy(type: ErrorType, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(type, strategy);
  }

  // Record error log
  private logError(error: EnhancedError): void {
    const logEntry: LogEntry = {
      level: this.mapSeverityToLogLevel(error.severity),
      message: error.message,
      timestamp: error.timestamp,
      data: this.filterSensitiveData(error),
      source: 'ErrorHandler',
      userId: error.userId,
    };

    console.error(`[${error.severity}] ${error.type}: ${error.message}`, logEntry);
  }

  // Report error
  private async reportError(error: EnhancedError): Promise<void> {
    if (!this.config.reportingEndpoint) return;

    try {
      const report: ErrorReport = {
        id: this.generateErrorId(),
        error: this.filterSensitiveData(error),
        environment: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now(),
          userId: error.userId,
          sessionId: error.sessionId,
        },
        breadcrumbs: this.breadcrumbs.slice(-20), // Last 20 breadcrumbs
        performance: {
          memory: (performance as any).memory,
          timing: performance.timing,
        },
      };

      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  // Filter sensitive data
  private filterSensitiveData(error: EnhancedError): EnhancedError {
    if (!this.config.filterSensitiveData) return error;

    const filtered = { ...error };

    // Filter sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];

    if (filtered.details) {
      filtered.details = this.deepFilterSensitiveData(filtered.details, sensitiveFields);
    }

    if (filtered.context) {
      filtered.context = this.deepFilterSensitiveData(filtered.context, sensitiveFields);
    }

    return filtered;
  }

  // Deep filter sensitive data
  private deepFilterSensitiveData(obj: any, sensitiveFields: string[]): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    const filtered = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => keyLower.includes(field));

      if (isSensitive) {
        filtered[key] = '***FILTERED***';
      } else if (typeof value === 'object' && value !== null) {
        filtered[key] = this.deepFilterSensitiveData(value, sensitiveFields);
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  // Add breadcrumb
  addBreadcrumb(breadcrumb: {
    timestamp: Timestamp;
    message: string;
    category: string;
    level: LogLevel;
    data?: any;
  }): void {
    this.breadcrumbs.push(breadcrumb);
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs.shift();
    }
  }

  // Generate error ID
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Map severity to log level
  private mapSeverityToLogLevel(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'error';
    }
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    errorsByCategory: Record<ErrorCategory, number>;
  } {
    const stats = {
      totalErrors: this.errorQueue.length,
      errorsByType: {} as Record<ErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByCategory: {} as Record<ErrorCategory, number>,
    };

    this.errorQueue.forEach(error => {
      stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
      stats.errorsByCategory[error.category] = (stats.errorsByCategory[error.category] || 0) + 1;
    });

    return stats;
  }

  // Clear error queue
  clearErrorQueue(): void {
    this.errorQueue = [];
    this.breadcrumbs = [];
  }

  // Update configuration
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get configuration
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }
}

// Create default error handler instance
export const defaultErrorHandler = new ErrorHandler();

// Convenience functions
export const handleError = (error: Error | string | any, context?: any) => {
  const enhancedError = defaultErrorHandler.createEnhancedError(error);
  return defaultErrorHandler.handleError(enhancedError, context);
};

export const handleApiError = (apiError: ApiError, context?: any) => {
  const enhancedError = defaultErrorHandler.createFromApiError(apiError);
  return defaultErrorHandler.handleError(enhancedError, context);
};

export const addBreadcrumb = (message: string, category: string = 'info', data?: any) => {
  defaultErrorHandler.addBreadcrumb({
    timestamp: Date.now(),
    message,
    category,
    level: 'info',
    data,
  });
};
