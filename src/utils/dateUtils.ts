/**
 * Date utility class
 * Handles time formatting, conversion, and other operations
 */

/**
 * Safely convert any value to Date object
 * @param value - Value that might be Date, string, or number
 * @returns Date object, returns current time if conversion fails
 */
export function safeToDate(value: unknown): Date {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  return new Date();
}

/**
 * Format time as local time string
 * @param timestamp - Timestamp (Date, string, or number)
 * @param options - Formatting options
 * @returns Formatted time string
 */
export function formatTime(
  timestamp: Date | string | number,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  const date = safeToDate(timestamp);

  try {
    return date.toLocaleTimeString(undefined, options);
  } catch (error) {
    console.warn('Time formatting failed:', error);
    return date.toTimeString().slice(0, 5); // Fallback to simple format HH:MM
  }
}

/**
 * Format relative time (e.g.: just now, 5 minutes ago, yesterday, etc.)
 * Note: This function returns English text. For proper i18n, use the i18n time functions instead.
 * @param timestamp - Timestamp
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: Date | string | number): string {
  const date = safeToDate(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;

  try {
    return date.toLocaleDateString(undefined, {
      month: 'numeric',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Relative time formatting failed:', error);
    return 'Long time ago';
  }
}

/**
 * Format relative time with i18n support
 * @param timestamp - Timestamp
 * @param t - Translation function from react-i18next
 * @returns Internationalized relative time string
 */
export function formatRelativeTimeI18n(
  timestamp: Date | string | number,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const date = safeToDate(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  if (days < 7) return t('time.daysAgo', { count: days });

  try {
    return date.toLocaleDateString(undefined, {
      month: 'numeric',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Relative time formatting failed:', error);
    return t('time.longTimeAgo');
  }
}

/**
 * Format complete date and time
 * @param timestamp - Timestamp
 * @returns Complete date and time string
 */
export function formatDateTime(timestamp: Date | string | number): string {
  const date = safeToDate(timestamp);

  try {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.warn('Date time formatting failed:', error);
    return date.toString();
  }
}

/**
 * Check if date is valid
 * @param date - Date to check
 * @returns Whether it's a valid date
 */
export function isValidDate(date: unknown): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Get start of today (00:00:00)
 * @returns Date object for start of today
 */
export function getStartOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get end of today (23:59:59)
 * @returns Date object for end of today
 */
export function getEndOfToday(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

