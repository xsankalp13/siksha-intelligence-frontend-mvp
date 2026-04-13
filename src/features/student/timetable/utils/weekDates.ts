import { format, startOfWeek, addDays, addWeeks } from 'date-fns';

const DAY_INDEX: Record<string, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

/**
 * Returns the Monday of the week offset from today.
 * weekOffset 0 = current week, -1 = last week, +1 = next week.
 */
export function getWeekStart(weekOffset: number): Date {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return addWeeks(monday, weekOffset);
}

/**
 * Returns a human-readable label for the week, e.g. "7 Apr – 12 Apr".
 */
export function getWeekLabel(weekOffset: number): string {
  const monday = getWeekStart(weekOffset);
  const saturday = addDays(monday, 5);
  return `${format(monday, 'd MMM')} – ${format(saturday, 'd MMM')}`;
}

/**
 * Given a day name (e.g. "MONDAY") and a week offset, returns the actual Date.
 */
export function getDateForDay(dayOfWeek: string, weekOffset: number): Date {
  const monday = getWeekStart(weekOffset);
  const idx = DAY_INDEX[dayOfWeek.toUpperCase()] ?? 0;
  return addDays(monday, idx);
}

/**
 * Returns the display label for a specific day in the given week.
 * e.g. "Monday, Apr 7"
 */
export function getDayLabel(dayOfWeek: string, weekOffset: number): string {
  const date = getDateForDay(dayOfWeek, weekOffset);
  return format(date, 'EEEE, MMM d');
}

/**
 * Formats a date as "Apr 7"
 */
export function formatShortDate(date: Date): string {
  return format(date, 'MMM d');
}

/**
 * Returns the day-of-week index (1=Mon, 7=Sun) for backend timeslot mapping.
 */
export function getDayOfWeekNumber(dayName: string): number {
  const map: Record<string, number> = {
    MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
    THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
  };
  return map[dayName.toUpperCase()] ?? 1;
}

export const DISPLAY_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
export type DisplayDay = typeof DISPLAY_DAYS[number];
