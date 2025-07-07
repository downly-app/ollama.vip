import { describe, it, expect } from 'vitest';
import { deepEqual, shallowEqual } from '../performanceUtils';

describe('Performance Utils Tests', () => {
  describe('deepEqual deep comparison', () => {
    it('should correctly compare primitive values', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('hello', 'hello')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
      
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual('hello', 'world')).toBe(false);
      expect(deepEqual(true, false)).toBe(false);
      expect(deepEqual(null, undefined)).toBe(false);
    });

    it('should correctly compare simple objects', () => {
      const obj1 = { name: 'Alice', age: 30 };
      const obj2 = { name: 'Alice', age: 30 };
      const obj3 = { name: 'Bob', age: 30 };
      
      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
    });

    it('should correctly compare nested objects', () => {
      const obj1 = { user: { name: 'Alice', profile: { age: 30 } } };
      const obj2 = { user: { name: 'Alice', profile: { age: 30 } } };
      const obj3 = { user: { name: 'Alice', profile: { age: 31 } } };
      
      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
    });

    it('should correctly compare arrays', () => {
      const arr1 = [1, 2, { name: 'test' }];
      const arr2 = [1, 2, { name: 'test' }];
      const arr3 = [1, 2, { name: 'different' }];
      
      expect(deepEqual(arr1, arr2)).toBe(true);
      expect(deepEqual(arr1, arr3)).toBe(false);
    });

    it('should handle comparison of different types', () => {
      expect(deepEqual({}, [])).toBe(false);
      expect(deepEqual('123', 123)).toBe(false);
      expect(deepEqual(null, {})).toBe(false);
    });
  });

  describe('shallowEqual shallow comparison', () => {
    it('should correctly compare primitive values', () => {
      expect(shallowEqual(1, 1)).toBe(true);
      expect(shallowEqual('hello', 'hello')).toBe(true);
      expect(shallowEqual(1, 2)).toBe(false);
    });

    it('should correctly perform shallow comparison of objects', () => {
      const obj1 = { name: 'Alice', age: 30 };
      const obj2 = { name: 'Alice', age: 30 };
      const obj3 = { name: 'Bob', age: 30 };
      
      expect(shallowEqual(obj1, obj2)).toBe(true);
      expect(shallowEqual(obj1, obj3)).toBe(false);
    });

    it('should only perform shallow comparison for nested objects', () => {
      const nested = { value: 42 };
      const obj1 = { user: nested };
      const obj2 = { user: nested };
      const obj3 = { user: { value: 42 } };
      
      expect(shallowEqual(obj1, obj2)).toBe(true);
      expect(shallowEqual(obj1, obj3)).toBe(false); // Different references
    });

    it('should compare the number of object keys', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1 };
      
      expect(shallowEqual(obj1, obj2)).toBe(false);
    });
  });

  describe('Performance helper functions', () => {
    it('should be able to measure function execution time', () => {
      const measureTime = (fn: () => void): number => {
        const start = performance.now();
        fn();
        return performance.now() - start;
      };

      const fastFunction = () => {
        // Fast function
        return 1 + 1;
      };

      const time = measureTime(fastFunction);
      expect(time).toBeGreaterThanOrEqual(0);
      expect(typeof time).toBe('number');
    });

    it('should be able to create performance counter', () => {
      let counter = 0;
      const createCounter = () => ({
        increment: () => ++counter,
        getValue: () => counter,
        reset: () => { counter = 0; }
      });

      const perfCounter = createCounter();
      
      expect(perfCounter.getValue()).toBe(0);
      perfCounter.increment();
      expect(perfCounter.getValue()).toBe(1);
      perfCounter.increment();
      expect(perfCounter.getValue()).toBe(2);
      perfCounter.reset();
      expect(perfCounter.getValue()).toBe(0);
    });
  });
});