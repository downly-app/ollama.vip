import { describe, it, expect } from 'vitest';

// Basic data processing function tests
describe('Data Utils Tests', () => {
  // Test deep clone functionality
  describe('Deep Clone', () => {
    const deepClone = <T>(obj: T): T => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime()) as T;
      if (obj instanceof Array) return obj.map(item => deepClone(item)) as T;
      if (typeof obj === 'object') {
        const cloned = {} as T;
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
          }
        }
        return cloned;
      }
      return obj;
    };

    it('should correctly clone simple objects', () => {
      const original = { name: 'test', value: 123 };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should correctly clone nested objects', () => {
      const original = {
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'dark', lang: 'zh' }
      };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned.user).not.toBe(original.user);
    });

    it('should correctly clone arrays', () => {
      const original = [1, 2, { name: 'test' }];
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[2]).not.toBe(original[2]);
    });
  });

  // Test data validation
  describe('Data Validation', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    it('should correctly validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should correctly validate URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(true);
    });
  });

  // Test array utility functions
  describe('Array Utility Functions', () => {
    const removeDuplicates = <T>(array: T[]): T[] => {
      return [...new Set(array)];
    };

    const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
      return array.reduce((groups, item) => {
        const groupKey = String(item[key]);
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
      }, {} as Record<string, T[]>);
    };

    it('should correctly remove array duplicates', () => {
      expect(removeDuplicates([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(removeDuplicates(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should correctly group by key', () => {
      const data = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 }
      ];
      
      const grouped = groupBy(data, 'category');
      
      expect(grouped['A']).toHaveLength(2);
      expect(grouped['B']).toHaveLength(1);
      expect(grouped['A'][0].value).toBe(1);
      expect(grouped['A'][1].value).toBe(3);
    });
  });
});