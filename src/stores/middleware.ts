import { StateCreator } from 'zustand';
import { PersistOptions, persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// Simplified logger middleware
export const createLogger = <T>(name?: string) => {
  return (config: StateCreator<T>) => (set: any, get: any, api: any) => {
    const loggedSet = (args: any) => {
      if (process.env.NODE_ENV === 'development') {
        const prevState = get();
        set(args);
        const nextState = get();
        console.group(`🏪 [${name || 'Store'}] State Update`);
        console.log('Previous State:', prevState);
        console.log('Next State:', nextState);
        console.groupEnd();
      } else {
        set(args);
      }
    };

    return config(loggedSet, get, api);
  };
};

// Error handling wrapper
export const withErrorHandling = <T extends Record<string, any>>(
  actions: T,
  storeName?: string
): T => {
  const wrappedActions = {} as T;

  Object.keys(actions).forEach(key => {
    const action = actions[key];

    if (typeof action === 'function') {
      wrappedActions[key] = ((...args: any[]) => {
        try {
          return action(...args);
        } catch (error) {
          console.error(`❌ [${storeName || 'Store'}] Error in action '${key}':`, error);

          if (process.env.NODE_ENV === 'production') {
            // Error reporting in production environment
            // errorReportingService.captureException(error);
          }

          throw error;
        }
      }) as any;
    } else {
      wrappedActions[key] = action;
    }
  });

  return wrappedActions;
};

// Performance monitoring wrapper
export const withPerformanceMonitoring = <T extends Record<string, any>>(
  actions: T,
  storeName?: string
): T => {
  if (process.env.NODE_ENV !== 'development') {
    return actions;
  }

  const wrappedActions = {} as T;

  Object.keys(actions).forEach(key => {
    const action = actions[key];

    if (typeof action === 'function') {
      wrappedActions[key] = ((...args: any[]) => {
        const startTime = performance.now();
        const result = action(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (duration > 10) {
          console.warn(
            `⚠️ [${storeName || 'Store'}] Slow action '${key}': ${duration.toFixed(2)}ms`
          );
        }

        return result;
      }) as any;
    } else {
      wrappedActions[key] = action;
    }
  });

  return wrappedActions;
};

// Store factory function
export const createEnhancedStore = <T>(
  storeCreator: StateCreator<T>,
  options: {
    name?: string;
    persistOptions?: PersistOptions<T>;
    enableDevtools?: boolean;
    enableLogger?: boolean;
  } = {}
) => {
  const {
    name = 'Store',
    persistOptions,
    enableDevtools = process.env.NODE_ENV === 'development',
    enableLogger = process.env.NODE_ENV === 'development',
  } = options;

  let enhancedCreator = storeCreator;

  // Apply logger
  if (enableLogger) {
    enhancedCreator = createLogger(name)(enhancedCreator) as StateCreator<T>;
  }

  // Apply devtools
  if (enableDevtools) {
    enhancedCreator = devtools(enhancedCreator, { name }) as StateCreator<T>;
  }

  // Apply persistence
  if (persistOptions) {
    enhancedCreator = persist(enhancedCreator, persistOptions) as StateCreator<T>;
  }

  return enhancedCreator;
};

// State selector optimization
export const createSelector = <T, R>(
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
) => {
  let lastResult: R;
  let lastState: T;
  let hasInitialized = false;

  return (state: T): R => {
    if (!hasInitialized || state !== lastState) {
      const result = selector(state);

      if (!hasInitialized || !equalityFn || !equalityFn(result, lastResult)) {
        lastResult = result;
        lastState = state;
        hasInitialized = true;
      }
    }

    return lastResult;
  };
};

// Async action wrapper
export const createAsyncAction = <Args extends any[], Return>(
  actionName: string,
  asyncFn: (...args: Args) => Promise<Return>,
  options: {
    onStart?: (args: Args) => void;
    onSuccess?: (result: Return, args: Args) => void;
    onError?: (error: Error, args: Args) => void;
    onFinally?: (args: Args) => void;
  } = {}
) => {
  return async (...args: Args): Promise<Return> => {
    const { onStart, onSuccess, onError, onFinally } = options;

    try {
      onStart?.(args);

      const result = await asyncFn(...args);

      onSuccess?.(result, args);
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      console.error(`❌ [${actionName}] Async action failed:`, errorObj);
      onError?.(errorObj, args);

      throw errorObj;
    } finally {
      onFinally?.(args);
    }
  };
};

// Shallow comparison utility function
export const shallowEqual = <T>(a: T, b: T): boolean => {
  if (a === b) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => (a as any)[key] === (b as any)[key]);
};
