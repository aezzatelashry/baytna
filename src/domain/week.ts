const DAY_MS = 24 * 60 * 60 * 1000;

export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const;

/** Formats a local date as YYYY-MM-DD without going through UTC. */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** First day of the week containing `date`. `weekStartsOn`: 0 = Sunday … 6 = Saturday. */
export function weekStartOf(date: Date, weekStartsOn: number): string {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (midnight.getDay() - weekStartsOn + 7) % 7;
  return toDateKey(new Date(midnight.getTime() - offset * DAY_MS));
}

export function weekDays(weekStart: string): string[] {
  const start = fromDateKey(weekStart);
  return Array.from({ length: 7 }, (_, index) =>
    toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)),
  );
}

export function dayName(dateKey: string): string {
  return DAY_NAMES[fromDateKey(dateKey).getDay()];
}
