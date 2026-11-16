import { CATALOG } from '../data/catalog';
import { sameProduct } from './catalog';
import { freshDaysLeft, type FreshItem } from './fresh';
import { daysUntilEnd } from './offers';
import type { Offer } from './types';

/** One notification the phone should show on a given day. */
export interface Reminder {
  /** Stable for the same day and kind, so rescheduling never doubles it. */
  readonly key: string;
  /** The day to show it, as a date key. */
  readonly day: string;
  /** The hour of that day, in the phone's own clock. */
  readonly hour: number;
  readonly title: string;
  readonly body: string;
}

/** Morning, before a shopping trip is decided. */
export const OFFER_REMINDER_HOUR = 10;
/** Before lunch is cooked. */
export const FRESH_REMINDER_HOUR = 11;
/** How far ahead reminders are scheduled. The app reschedules whenever it opens. */
const DAYS_AHEAD = 7;
const NAMES_SHOWN = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(day: string, count: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
}

function listed(names: readonly string[]): string {
  const unique = [...new Set(names)];
  const shown = unique.slice(0, NAMES_SHOWN).join('، ');
  return unique.length > NAMES_SHOWN ? `${shown} و${unique.length - NAMES_SHOWN} تاني` : shown;
}

function byDay(entries: readonly { day: string; name: string }[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const entry of entries) groups.set(entry.day, [...(groups.get(entry.day) ?? []), entry.name]);
  return groups;
}

/**
 * On the last day of an offer for something still on the list, one reminder for that
 * day naming the products. Offers with no end date never remind.
 */
export function offerReminders(itemNames: readonly string[], offers: readonly Offer[], today: string): Reminder[] {
  const ending = offers.flatMap((offer) => {
    const days = daysUntilEnd(offer.validUntil, today);
    if (days === null || days < 0 || days > DAYS_AHEAD || offer.validUntil === null) return [];
    const item = itemNames.find((name) => sameProduct(name, offer.name, CATALOG));
    return item === undefined ? [] : [{ day: offer.validUntil, name: `${item} في ${offer.store}` }];
  });
  return [...byDay(ending)].map(([day, names]) => ({
    key: `offers-${day}`,
    day,
    hour: OFFER_REMINDER_HOUR,
    title: 'آخر يوم لعروض على قائمتك',
    body: listed(names),
  }));
}

/** On the last good day of something fresh, one reminder for that day naming what to eat first. */
export function freshReminders(fresh: readonly FreshItem[], today: string): Reminder[] {
  const lastDays = fresh.flatMap((item) => {
    const left = freshDaysLeft(item, today);
    return left < 0 || left > DAYS_AHEAD ? [] : [{ day: addDays(today, left), name: item.name }];
  });
  return [...byDay(lastDays)].map(([day, names]) => ({
    key: `fresh-${day}`,
    day,
    hour: FRESH_REMINDER_HOUR,
    title: 'كُله النهارده قبل ما يبوظ',
    body: listed(names),
  }));
}

/** The moment a reminder fires, in the phone's own time zone. */
export function reminderTime(reminder: Pick<Reminder, 'day' | 'hour'>): Date {
  const [year, month, date] = reminder.day.split('-').map(Number);
  return new Date(year, month - 1, date, reminder.hour, 0, 0, 0);
}
