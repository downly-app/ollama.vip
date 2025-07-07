// Common type definitions

// Basic types
export type ID = string | number;
export type Timestamp = number;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = Array<JSONValue>;

// State types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// API response types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  statusCode: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Timestamp;
  statusCode: number;
}

// Async state types
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
  lastUpdated: Timestamp | null;
}

// Factory function to create async state
export const createAsyncState = <T>(): AsyncState<T> => ({
  data: null,
  loading: false,
  error: null,
  success: false,
  lastUpdated: null,
});

// Event types
export interface CustomEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Timestamp;
  id: ID;
}

// Form types
export interface FormField<T = any> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
}

export interface FormState<T extends Record<string, any>> {
  fields: { [K in keyof T]: FormField<T[K]> };
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  submitCount: number;
}

// Search and filter types
export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface FilterOption {
  label: string;
  value: any;
  count?: number;
}

// Performance monitoring types
export interface PerformanceMetrics {
  renderTime: number;
  mountTime: number;
  renderCount: number;
  lastRenderTime: Timestamp;
  averageRenderTime: number;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'auto' | 'high-contrast';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  spacing: 'compact' | 'normal' | 'comfortable';
  animations: boolean;
}

// Permission types
export type Permission = string;
export type Role = string;

export interface UserPermissions {
  roles: Role[];
  permissions: Permission[];
}

// Configuration types
export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  features: Record<string, boolean>;
  limits: {
    maxFileSize: number;
    maxMessageLength: number;
    maxHistoryItems: number;
  };
}

// Storage types
export interface StorageItem<T = any> {
  value: T;
  timestamp: Timestamp;
  ttl?: number;
}

export interface StorageConfig {
  prefix: string;
  enableEncryption: boolean;
  defaultTtl: number;
}

// Queue types
export interface QueueItem<T = any> {
  id: ID;
  data: T;
  priority: number;
  createdAt: Timestamp;
  attempts: number;
  maxAttempts: number;
  retryDelay: number;
}

// Cache types
export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: Timestamp;
  ttl: number;
  hits: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  enableStats: boolean;
}

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: ID;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
  timestamp: Timestamp;
}

// Shortcut key types
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: string;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type Nullable<T> = T | null;
export type Maybe<T> = T | null | undefined;

// Function types
export type AnyFunction = (...args: any[]) => any;
export type VoidFunction = () => void;
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

// Event handler types
export type EventHandler<T = any> = (event: T) => void;
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

// Component types
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
  children?: React.ReactNode;
}

export interface ComponentWithLoading extends BaseComponentProps {
  loading?: boolean;
  skeleton?: React.ReactNode;
}

export interface ComponentWithError extends BaseComponentProps {
  error?: string | null;
  onRetry?: () => void;
  fallback?: React.ReactNode;
}

// Route types
export interface Route {
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
  protected?: boolean;
  roles?: Role[];
  permissions?: Permission[];
  meta?: {
    title?: string;
    description?: string;
    keywords?: string[];
    [key: string]: any;
  };
}

// Layout types
export interface LayoutConfig {
  sidebar: {
    width: number;
    collapsible: boolean;
    position: 'left' | 'right';
  };
  header: {
    height: number;
    fixed: boolean;
  };
  footer: {
    height: number;
    visible: boolean;
  };
}

// Validation types
export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Log types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Timestamp;
  data?: any;
  source?: string;
  userId?: ID;
}

// Analytics types
export interface AnalyticsEvent {
  name: string;
  category: string;
  properties?: Record<string, any>;
  timestamp: Timestamp;
  userId?: ID;
  sessionId?: ID;
}

// Experiment types
export interface ExperimentConfig {
  name: string;
  enabled: boolean;
  variants: Array<{
    name: string;
    weight: number;
    config: Record<string, any>;
  }>;
  targeting?: {
    userIds?: ID[];
    roles?: Role[];
    percentage?: number;
  };
}

// Feature flag types
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  targeting?: {
    userIds?: ID[];
    roles?: Role[];
    environment?: string[];
  };
}

// Monitoring types
export interface MonitoringMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  network: {
    latency: number;
    bandwidth: number;
  };
  errors: {
    count: number;
    rate: number;
  };
  performance: {
    renderTime: number;
    loadTime: number;
    interactionTime: number;
  };
}

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RecursiveRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? RecursiveRequired<T[P]> : T[P];
};

export type ValueOf<T> = T[keyof T];

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type NonEmptyArray<T> = [T, ...T[]];

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// Type guards
export const isString = (value: any): value is string => typeof value === 'string';
export const isNumber = (value: any): value is number => typeof value === 'number';
export const isBoolean = (value: any): value is boolean => typeof value === 'boolean';
export const isObject = (value: any): value is object =>
  typeof value === 'object' && value !== null;
export const isArray = (value: any): value is any[] => Array.isArray(value);
export const isFunction = (value: any): value is (...args: any[]) => any => typeof value === 'function';
export const isPromise = (value: any): value is Promise<any> => value instanceof Promise;
export const isNull = (value: any): value is null => value === null;
export const isUndefined = (value: any): value is undefined => value === undefined;
export const isNullOrUndefined = (value: any): value is null | undefined => value == null;

// Utility functions
export const createId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const formatTimestamp = (timestamp: Timestamp): string => {
  return new Date(timestamp).toISOString();
};

export const parseTimestamp = (dateString: string): Timestamp => {
  return new Date(dateString).getTime();
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};
