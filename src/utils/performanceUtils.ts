import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Deep comparison function
export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
    return a === b;
  }

  if (a.prototype !== b.prototype) return false;

  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;

  return keys.every(k => deepEqual(a[k], b[k]));
};

// Shallow comparison function
export const shallowEqual = (a: any, b: any): boolean => {
  if (a === b) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => a[key] === b[key]);
};

// Enhanced memo component factory
export const createMemoComponent = <P extends object>(
    Component: React.ComponentType<P>,
    areEqual?: (prevProps: P, nextProps: P) => boolean,
    debugName?: string
) => {
  const MemoComponent = memo(Component, areEqual);

  if (process.env.NODE_ENV === 'development' && debugName) {
    MemoComponent.displayName = `Memo(${debugName})`;
  }

  return MemoComponent;
};

// Performance monitoring HOC
export const withPerformanceMonitoring = <P extends object>(
    Component: React.ComponentType<P>,
    componentName?: string
) => {
  const PerformanceMonitoredComponent: React.FC<P> = props => {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(Date.now());

    useEffect(() => {
      renderCount.current += 1;
      const now = Date.now();
      const timeSinceLastRender = now - lastRenderTime.current;

      if (process.env.NODE_ENV === 'development') {
        console.log(
            `🔄 [${componentName || Component.name}] Render #${renderCount.current} (${timeSinceLastRender}ms since last)`
        );

        if (timeSinceLastRender < 16 && renderCount.current > 1) {
          console.warn(
              `⚠️ [${componentName || Component.name}] Fast re-render detected (${timeSinceLastRender}ms)`
          );
        }
      }

      lastRenderTime.current = now;
    });

    return React.createElement(Component, props);
  };

  if (process.env.NODE_ENV === 'development') {
    PerformanceMonitoredComponent.displayName = `PerformanceMonitored(${componentName || Component.name})`;
  }

  return PerformanceMonitoredComponent;
};

// Lazy loading Hook
export const useLazyLoad = (threshold = 0.1) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasBeenIntersecting, setHasBeenIntersecting] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
        ([entry]) => {
          const intersecting = entry.isIntersecting;
          setIsIntersecting(intersecting);

          if (intersecting && !hasBeenIntersecting) {
            setHasBeenIntersecting(true);
          }
        },
        { threshold }
    );

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, hasBeenIntersecting]);

  return {
    targetRef,
    isIntersecting,
    hasBeenIntersecting,
  };
};

// Debounce Hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle Hook
export const useThrottle = <T>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(
        () => {
          if (Date.now() - lastRan.current >= limit) {
            setThrottledValue(value);
            lastRan.current = Date.now();
          }
        },
        limit - (Date.now() - lastRan.current)
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

// Performance monitoring Hook
export const useRenderPerformance = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    const timeSinceMount = now - mountTime.current;

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [${componentName}] Performance:`, {
        renderCount: renderCount.current,
        timeSinceLastRender,
        timeSinceMount,
        averageRenderTime: timeSinceMount / renderCount.current,
      });
    }

    lastRenderTime.current = now;
  });

  return {
    renderCount: renderCount.current,
    timeSinceMount: Date.now() - mountTime.current,
  };
};

// Optimized event handler Hook
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList
): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, deps);
};

// Optimized computed value Hook
export const useOptimizedMemo = <T>(
    factory: () => T,
    deps: React.DependencyList,
    isEqual?: (a: T, b: T) => boolean
): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  const ref = useRef<{ value: T; deps: React.DependencyList }>({
    value: memoized,
    deps,
  });

  if (isEqual && !isEqual(ref.current.value, memoized)) {
    ref.current = { value: memoized, deps };
  } else if (!isEqual && !shallowEqual(ref.current.deps, deps)) {
    ref.current = { value: memoized, deps };
  }

  return ref.current.value;
};

// Batch state update Hook
export const useBatchedUpdates = () => {
  const [updates, setUpdates] = useState<Array<() => void>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const addUpdate = useCallback((update: () => void) => {
    setUpdates(prev => [...prev, update]);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setUpdates(currentUpdates => {
        currentUpdates.forEach(updateFn => updateFn());
        return [];
      });
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { addUpdate };
};

// Component cache utilities
export const createComponentCache = () => {
  const cache = new Map<string, React.ComponentType<any>>();

  return {
    get: (key: string) => cache.get(key),
    set: (key: string, component: React.ComponentType<any>) => {
      cache.set(key, component);
      return component;
    },
    has: (key: string) => cache.has(key),
    clear: () => cache.clear(),
    size: () => cache.size,
  };
};

// Render optimization utilities
export const optimizeRenders = {
  // Skip unnecessary renders
  skipRender: <P extends object>(
      Component: React.ComponentType<P>,
      shouldSkip: (props: P) => boolean
  ) => {
    return memo(Component, (prevProps, nextProps) => {
      return shouldSkip(nextProps) || shallowEqual(prevProps, nextProps);
    });
  },

  // Conditional render optimization
  conditionalRender: <P extends object>(
      Component: React.ComponentType<P>,
      condition: (props: P) => boolean,
      fallback?: React.ComponentType<P>
  ) => {
    return memo((props: P) => {
      if (condition(props)) {
        return React.createElement(Component, props);
      }
      return fallback ? React.createElement(fallback, props) : null;
    });
  },
};

// Performance analysis utilities
export const performanceAnalyzer = {
  measureRenderTime: <P extends object>(Component: React.ComponentType<P>, name?: string) => {
    return (props: P) => {
      const startTime = performance.now();

      useEffect(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        if (process.env.NODE_ENV === 'development') {
          console.log(`🕐 [${name || Component.name}] Render time: ${renderTime.toFixed(2)}ms`);

          if (renderTime > 50) {
            console.warn(
                `⚠️ [${name || Component.name}] Slow render detected: ${renderTime.toFixed(2)}ms`
            );
          }
        }
      });

      return React.createElement(Component, props);
    };
  },

  trackReRenders: <P extends object>(Component: React.ComponentType<P>, name?: string) => {
    return (props: P) => {
      const renderCount = useRef(0);
      const propsRef = useRef<P>(props);

      if (!shallowEqual(propsRef.current, props)) {
        renderCount.current += 1;
        propsRef.current = props;

        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 [${name || Component.name}] Re-render #${renderCount.current}`, {
            prevProps: propsRef.current,
            nextProps: props,
          });
        }
      }

      return React.createElement(Component, props);
    };
  },
};
