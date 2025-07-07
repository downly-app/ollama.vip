import { describe, expect, it } from 'vitest';

import { DebugTools, DevEnvironmentChecker, PerformanceMonitor } from '../devTools';

describe('Development Tools Tests', () => {
  describe('DevEnvironmentChecker', () => {
    it('should be able to detect development environment', () => {
      const isDevMode = DevEnvironmentChecker.isDevMode();
      expect(typeof isDevMode).toBe('boolean');
    });

    it('should be able to get environment information', () => {
      const envInfo = DevEnvironmentChecker.getEnvironmentInfo();
      expect(envInfo).toHaveProperty('nodeEnv');
      expect(envInfo).toHaveProperty('userAgent');
      expect(envInfo).toHaveProperty('viewport');
      expect(envInfo.viewport).toHaveProperty('width');
      expect(envInfo.viewport).toHaveProperty('height');
    });
  });

  describe('DebugTools', () => {
    it('should be able to record logs', () => {
      DebugTools.clearLogBuffer();
      DebugTools.log('test log', { test: true });

      const logs = DebugTools.getLogBuffer();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('test log');
      expect(logs[0].level).toBe('log');
      expect(logs[0].data).toEqual({ test: true });
    });

    it('should be able to export logs', () => {
      DebugTools.clearLogBuffer();
      DebugTools.log('test message');
      DebugTools.warn('warning message');

      const exported = DebugTools.exportLogs();
      expect(typeof exported).toBe('string');
      expect(exported).toContain('test message');
      expect(exported).toContain('warning message');
    });
  });

  describe('PerformanceMonitor', () => {
    it('should be able to create instance', () => {
      const monitor = PerformanceMonitor.getInstance();
      expect(monitor).toBeInstanceOf(PerformanceMonitor);

      // Ensure it's a singleton
      const monitor2 = PerformanceMonitor.getInstance();
      expect(monitor).toBe(monitor2);
    });

    it('should be able to record performance metrics', () => {
      const monitor = PerformanceMonitor.getInstance();
      monitor.recordMetric('test-metric', 100);
      monitor.recordMetric('test-metric', 200);

      const stats = monitor.getMetricStats('test-metric');
      expect(stats).toBeTruthy();
      expect(stats?.count).toBe(2);
      expect(stats?.avg).toBe(150);
      expect(stats?.min).toBe(100);
      expect(stats?.max).toBe(200);
    });

    it('should be able to time operations', () => {
      const monitor = PerformanceMonitor.getInstance();
      monitor.startTimer('test-timer');

      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.random();
      }

      const duration = monitor.endTimer('test-timer');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
