const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns the UTC day window [start, end) that contains the given timestamp.
 * Any timestamp within a day (e.g. 2026-11-20T15:30Z) maps to that whole day.
 */
export function getUtcDayRange(timestampMs: number): { start: Date; end: Date } {
  const date = new Date(timestampMs);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + MS_PER_DAY);
  return { start, end };
}
