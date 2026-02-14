import type { RNG } from '../rng';

/**
 * Parse a date input that can be either a Date object or a string.
 * Validates that the parsed date is valid.
 *
 * @param input - Date object or string to parse
 * @returns Parsed Date object
 * @throws Error if the date is invalid
 */
export function parseDate(input: Date | string): Date {
  if (input instanceof Date) {
    return input;
  }

  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${input}`);
  }

  return parsed;
}

/**
 * Get default date range (last year to now)
 */
function getDefaultDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  return { start: oneYearAgo, end: now };
}

/**
 * Generate a random date within a specified range using deterministic RNG.
 * Defaults to last year to current date.
 *
 * @param rng - Random number generator
 * @param start - Start date (optional, defaults to 1 year ago)
 * @param end - End date (optional, defaults to now)
 * @returns Random date within range
 * @throws Error if start >= end
 */
export function date(
  rng: RNG,
  start?: Date | string,
  end?: Date | string
): Date {
  const defaults = getDefaultDateRange();
  const startDate = start ? parseDate(start) : defaults.start;
  const endDate = end ? parseDate(end) : defaults.end;

  if (startDate.getTime() >= endDate.getTime()) {
    throw new Error('start date must be before end date');
  }

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  const randomMs = rng.nextIntRange(startMs, endMs);
  return new Date(randomMs);
}

/**
 * Generate a random Unix timestamp (milliseconds since epoch) within a specified range.
 * Defaults to last year to current date.
 *
 * @param rng - Random number generator
 * @param start - Start date (optional, defaults to 1 year ago)
 * @param end - End date (optional, defaults to now)
 * @returns Random timestamp in milliseconds
 */
export function timestamp(
  rng: RNG,
  start?: Date | string,
  end?: Date | string
): number {
  const defaults = getDefaultDateRange();
  const startDate = start ? parseDate(start) : defaults.start;
  const endDate = end ? parseDate(end) : defaults.end;

  if (startDate.getTime() >= endDate.getTime()) {
    throw new Error('start date must be before end date');
  }

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  return rng.nextIntRange(startMs, endMs);
}

/**
 * Generate a random date range with a specified duration.
 *
 * @param rng - Random number generator
 * @param duration - Duration in milliseconds
 * @returns Object with start and end dates
 * @throws Error if duration is not positive
 */
export function dateRange(
  rng: RNG,
  duration: number
): { start: Date; end: Date } {
  if (duration <= 0) {
    throw new Error('duration must be positive');
  }

  const start = date(rng);
  const end = new Date(start.getTime() + duration);

  return { start, end };
}

/**
 * Generate a random time string in HH:MM:SS format.
 *
 * @param rng - Random number generator
 * @returns Time string in HH:MM:SS format (e.g., "09:04:42")
 */
export function time(rng: RNG): string {
  const hours = rng.nextIntRange(0, 23);
  const minutes = rng.nextIntRange(0, 59);
  const seconds = rng.nextIntRange(0, 59);

  const pad = (n: number): string => n.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Generate a random ISO 8601 datetime string.
 * Defaults to last year to current date.
 *
 * @param rng - Random number generator
 * @param start - Start date (optional, defaults to 1 year ago)
 * @param end - End date (optional, defaults to now)
 * @returns ISO 8601 datetime string (e.g., "2024-03-15T09:30:00.000Z")
 */
export function datetime(
  rng: RNG,
  start?: Date | string,
  end?: Date | string
): string {
  const randomDate = date(rng, start, end);
  return randomDate.toISOString();
}
