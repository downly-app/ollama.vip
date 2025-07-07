/**
 * Development Tools Collection
 * Utility functions for development environment only
 */
import React from 'react';

// Performance monitoring tools
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private timers: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development';
    if (this.isEnabled) {
      this.initializeObservers();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      // Monitor navigation performance
      const navObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric(
              'navigation.loadTime',
              navEntry.loadEventEnd - navEntry.loadEventStart
            );
            this.recordMetric(
              'navigation.domContentLoaded',
              navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart
            );
            this.recordMetric('navigation.firstPaint', navEntry.loadEventEnd - navEntry.fetchStart);
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Monitor resource loading performance
      const resourceObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric(
              `resource.${resourceEntry.initiatorType}`,
              resourceEntry.responseEnd - resourceEntry.requestStart
            );
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Monitor user interaction performance
      const measureObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure') {
            this.recordMetric(`measure.${entry.name}`, entry.duration);
          }
        });
      });
      measureObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(measureObserver);
    }
  }

  // Start timer
  startTimer(name: string): void {
    if (!this.isEnabled) return;
    this.timers.set(name, performance.now());
  }

  // End timer
  endTimer(name: string): number {
    if (!this.isEnabled) return 0;
    const start = this.timers.get(name);
    if (!start) return 0;

    const duration = performance.now() - start;
    this.timers.delete(name);
    this.recordMetric(`timer.${name}`, duration);
    return duration;
  }

  // Record metric
  recordMetric(name: string, value: number): void {
    if (!this.isEnabled) return;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep the latest 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  // Get metric statistics
  getMetricStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    latest: number;
  } | null {
    if (!this.isEnabled) return null;

    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
    };
  }

  // Get all metrics
  getAllMetrics(): Record<
    string,
    {
      count: number;
      avg: number;
      min: number;
      max: number;
      latest: number;
    }
  > {
    if (!this.isEnabled) return {};

    const result: Record<string, any> = {};
    this.metrics.forEach((values, name) => {
      result[name] = this.getMetricStats(name);
    });
    return result;
  }

  // Clear all data
  clear(): void {
    if (!this.isEnabled) return;
    this.metrics.clear();
    this.timers.clear();
  }

  // Destroy monitor
  destroy(): void {
    if (!this.isEnabled) return;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clear();
  }
}

// React component performance monitoring
export class ReactPerformanceMonitor {
  private static renderTimes: Map<string, number[]> = new Map();
  private static isEnabled = process.env.NODE_ENV === 'development';

  static measureRender(componentName: string, renderFn: () => void): void {
    if (!this.isEnabled) {
      renderFn();
      return;
    }

    const start = performance.now();
    renderFn();
    const duration = performance.now() - start;

    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, []);
    }

    const times = this.renderTimes.get(componentName)!;
    times.push(duration);

    // Keep the latest 50 render records
    if (times.length > 50) {
      times.shift();
    }

    // Warn if render time is too long
    if (duration > 16.67) {
      // 60fps threshold
      console.warn(
        `[Performance] Component ${componentName} took ${duration.toFixed(2)}ms to render`
      );
    }
  }

  static getComponentStats(componentName: string): {
    avgRenderTime: number;
    maxRenderTime: number;
    minRenderTime: number;
    totalRenders: number;
  } | null {
    if (!this.isEnabled) return null;

    const times = this.renderTimes.get(componentName);
    if (!times || times.length === 0) return null;

    const sum = times.reduce((a, b) => a + b, 0);
    return {
      avgRenderTime: sum / times.length,
      maxRenderTime: Math.max(...times),
      minRenderTime: Math.min(...times),
      totalRenders: times.length,
    };
  }

  static getAllComponentStats(): Record<
    string,
    {
      avgRenderTime: number;
      maxRenderTime: number;
      minRenderTime: number;
      totalRenders: number;
    }
  > {
    if (!this.isEnabled) return {};

    const result: Record<string, any> = {};
    this.renderTimes.forEach((times, componentName) => {
      result[componentName] = this.getComponentStats(componentName);
    });
    return result;
  }

  static clear(): void {
    if (!this.isEnabled) return;
    this.renderTimes.clear();
  }
}

// Memory monitoring tools
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private isEnabled: boolean;
  private interval: NodeJS.Timeout | null = null;
  private memorySnapshots: Array<{
    timestamp: number;
    used: number;
    total: number;
  }> = [];

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  start(intervalMs: number = 5000): void {
    if (!this.isEnabled) return;

    this.interval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.memorySnapshots.push({
          timestamp: Date.now(),
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
        });

        // Keep the latest 100 snapshots
        if (this.memorySnapshots.length > 100) {
          this.memorySnapshots.shift();
        }
      }
    }, intervalMs);
  }

  stop(): void {
    if (!this.isEnabled) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getMemoryStats(): {
    current: { used: number; total: number } | null;
    trend: 'increasing' | 'decreasing' | 'stable';
    snapshots: Array<{ timestamp: number; used: number; total: number }>;
  } {
    if (!this.isEnabled) {
      return { current: null, trend: 'stable', snapshots: [] };
    }

    const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
    const current = latest ? { used: latest.used, total: latest.total } : null;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    if (this.memorySnapshots.length > 10) {
      const recent = this.memorySnapshots.slice(-10);
      const oldAvg = recent.slice(0, 5).reduce((sum, snap) => sum + snap.used, 0) / 5;
      const newAvg = recent.slice(5).reduce((sum, snap) => sum + snap.used, 0) / 5;

      if (newAvg > oldAvg * 1.1) {
        trend = 'increasing';
      } else if (newAvg < oldAvg * 0.9) {
        trend = 'decreasing';
      }
    }

    return {
      current,
      trend,
      snapshots: [...this.memorySnapshots],
    };
  }

  clear(): void {
    if (!this.isEnabled) return;
    this.memorySnapshots = [];
  }
}

// Development environment detection tools
export class DevEnvironmentChecker {
  static isDevMode(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  static isTauriDev(): boolean {
    return this.isDevMode() && window.__TAURI_IPC__ !== undefined;
  }

  static isWebDev(): boolean {
    return this.isDevMode() && window.__TAURI_IPC__ === undefined;
  }

  static getEnvironmentInfo(): {
    nodeEnv: string;
    isTauri: boolean;
    isWeb: boolean;
    userAgent: string;
    viewport: { width: number; height: number };
    colorScheme: 'light' | 'dark';
  } {
    return {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      isTauri: window.__TAURI_IPC__ !== undefined,
      isWeb: window.__TAURI_IPC__ === undefined,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    };
  }
}

// Debug tools
export class DebugTools {
  private static logBuffer: Array<{
    timestamp: number;
    level: 'log' | 'warn' | 'error' | 'info';
    message: string;
    data?: any;
  }> = [];

  static log(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'development') return;

    console.log(`[DEBUG] ${message}`, data);
    this.logBuffer.push({
      timestamp: Date.now(),
      level: 'log',
      message,
      data,
    });

    this.trimLogBuffer();
  }

  static warn(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'development') return;

    console.warn(`[DEBUG] ${message}`, data);
    this.logBuffer.push({
      timestamp: Date.now(),
      level: 'warn',
      message,
      data,
    });

    this.trimLogBuffer();
  }

  static error(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'development') return;

    console.error(`[DEBUG] ${message}`, data);
    this.logBuffer.push({
      timestamp: Date.now(),
      level: 'error',
      message,
      data,
    });

    this.trimLogBuffer();
  }

  static info(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'development') return;

    console.info(`[DEBUG] ${message}`, data);
    this.logBuffer.push({
      timestamp: Date.now(),
      level: 'info',
      message,
      data,
    });

    this.trimLogBuffer();
  }

  private static trimLogBuffer(): void {
    if (this.logBuffer.length > 500) {
      this.logBuffer = this.logBuffer.slice(-400);
    }
  }

  static getLogBuffer(): Array<{
    timestamp: number;
    level: 'log' | 'warn' | 'error' | 'info';
    message: string;
    data?: any;
  }> {
    return [...this.logBuffer];
  }

  static clearLogBuffer(): void {
    this.logBuffer = [];
  }

  static exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

// Global development tools interface
export interface GlobalDevTools {
  performance: PerformanceMonitor;
  reactPerformance: typeof ReactPerformanceMonitor;
  memory: MemoryMonitor;
  environment: typeof DevEnvironmentChecker;
  debug: typeof DebugTools;
}

// Expose to global in development environment
if (process.env.NODE_ENV === 'development') {
  (window as any).__DEV_TOOLS__ = {
    performance: PerformanceMonitor.getInstance(),
    reactPerformance: ReactPerformanceMonitor,
    memory: MemoryMonitor.getInstance(),
    environment: DevEnvironmentChecker,
    debug: DebugTools,
  } as GlobalDevTools;
}

// Export all tools (classes are already exported separately)

// Convenient performance monitoring decorator
export function measurePerformance(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  if (process.env.NODE_ENV !== 'development') return descriptor;

  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const monitor = PerformanceMonitor.getInstance();
    const timerName = `${target.constructor.name}.${propertyKey}`;

    monitor.startTimer(timerName);
    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } finally {
      monitor.endTimer(timerName);
    }
  };

  return descriptor;
}

// React Hook performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  const isDevMode = process.env.NODE_ENV === 'development';

  React.useEffect(() => {
    if (!isDevMode) return;
    
    monitor.startTimer(`${componentName}.mount`);
    return () => {
      monitor.endTimer(`${componentName}.mount`);
    };
  }, [componentName, monitor, isDevMode]);

  const measureRender = React.useCallback(() => {
    if (!isDevMode) return () => {};
    
    monitor.startTimer(`${componentName}.render`);
    return () => monitor.endTimer(`${componentName}.render`);
  }, [componentName, monitor, isDevMode]);

  return { measureRender };
}

// Auto initialization
if (process.env.NODE_ENV === 'development') {
  // Start memory monitoring
  MemoryMonitor.getInstance().start();

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    PerformanceMonitor.getInstance().destroy();
    MemoryMonitor.getInstance().stop();
  });
}
