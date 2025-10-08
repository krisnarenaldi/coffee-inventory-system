// Centralized utilities for calendar-aware subscription period calculations

export type SubscriptionInterval = 'MONTHLY' | 'YEARLY';

/**
 * Adds calendar-aware months to a date.
 * - Preserves day-of-month when possible
 * - If target month doesn't have the original day (e.g., Jan 31 + 1 month),
 *   it uses the last day of the target month.
 */
export function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let targetYear = year + Math.floor((month + months) / 12);
  let targetMonth = (month + months) % 12;
  if (targetMonth < 0) {
    targetMonth += 12;
    targetYear -= 1;
  }

  const result = new Date(
    targetYear,
    targetMonth,
    day,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );

  // If the month rolled over (invalid day), use the last day of the target month
  if (result.getMonth() !== targetMonth) {
    return new Date(
      targetYear,
      targetMonth + 1,
      0,
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    );
  }

  return result;
}

/**
 * Adds calendar-aware years to a date.
 * - Preserves day-of-month when possible
 * - If target year/month doesn't have the original day (e.g., Feb 29 in non-leap year),
 *   it uses the last day of the target month.
 */
export function addCalendarYears(date: Date, years: number): Date {
  const targetYear = date.getFullYear() + years;
  const targetMonth = date.getMonth();
  const targetDay = date.getDate();

  const result = new Date(
    targetYear,
    targetMonth,
    targetDay,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );

  if (result.getMonth() !== targetMonth) {
    return new Date(
      targetYear,
      targetMonth + 1,
      0,
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    );
  }

  return result;
}

/**
 * Computes next period end from a start date by subscription interval.
 */
export function computeNextPeriodEnd(
  startDate: Date,
  interval: SubscriptionInterval
): Date {
  if (interval === 'MONTHLY') {
    return addCalendarMonths(startDate, 1);
  }
  return addCalendarYears(startDate, 1);
}