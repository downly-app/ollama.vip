import { safeToDate } from './dateUtils';

/**
 * Data conversion utility class
 * Handles localStorage serialization/deserialization, type conversion, etc.
 */

/**
 * Deep convert date strings to Date objects in an object
 * @param obj - Object to convert
 * @param dateFields - Array of date field names to convert
 * @returns Converted object
 */
export function convertDatesToObjects<T>(obj: unknown, dateFields: string[] = []): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesToObjects(item, dateFields)) as T;
  }

  const converted = { ...obj };

  // Auto-detect common date fields
  const commonDateFields = [
    'timestamp', 'createdAt', 'updatedAt', 'date', 'time',
    'startTime', 'endTime', 'lastModified', 'publishedAt'
  ];

  const fieldsToConvert = [...new Set([...dateFields, ...commonDateFields])];

  for (const [key, value] of Object.entries(converted)) {
    if (fieldsToConvert.includes(key) && value) {
      // Convert date fields
      converted[key] = safeToDate(value);
    } else if (value && typeof value === 'object') {
      // Recursively convert nested objects
      converted[key] = convertDatesToObjects(value, dateFields);
    }
  }

  return converted as T;
}

/**
 * Safely get data from localStorage
 * @param key - Storage key
 * @param defaultValue - Default value
 * @returns Parsed data or default value
 */
export function safeGetFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Failed to get item from localStorage with key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Safely store data to localStorage
 * @param key - Storage key
 * @param value - Value to store
 */
export function safeSetToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to set item to localStorage with key "${key}":`, error);
  }
}

/**
 * Clean invalid values from object
 * @param obj - Object to clean
 * @returns Cleaned object
 */
export function cleanObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.filter(item => item != null).map(cleanObject) as T;
  }

  const cleaned = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (value != null) {
      if (typeof value === 'object') {
        const cleanedValue = cleanObject(value);
        if (Array.isArray(cleanedValue) ? cleanedValue.length > 0 : Object.keys(cleanedValue).length > 0) {
          (cleaned as Record<string, unknown>)[key] = cleanedValue;
        }
      } else {
        (cleaned as Record<string, unknown>)[key] = value;
      }
    }
  }

  return cleaned;
}

/**
 * Deep clone object
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone) as T;
  }

  const cloned = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    (cloned as Record<string, unknown>)[key] = deepClone(value);
  }

  return cloned;
}

/**
 * Safely get nested object property
 * @param obj - Object
 * @param path - Property path, e.g. 'user.profile.name'
 * @param defaultValue - Default value
 * @returns Property value or default value
 */
export function safeGet<T>(obj: unknown, path: string, defaultValue: T): T {
  try {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }

    return current != null ? current : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Generate unique ID
 * @param prefix - Prefix
 * @returns Unique ID string
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}