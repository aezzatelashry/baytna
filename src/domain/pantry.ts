import type { Category } from './types';
import { fromDateKey } from './week';

/** Kinds of things that are bought once and last for weeks. */
export type StapleKind = 'grains' | 'oil' | 'spices' | 'sweet' | 'cleaning' | 'other';

export const STAPLE_KIND_LABELS: Record<StapleKind, string> = {
  grains: 'رز ومكرونة ودقيق',
  oil: 'زيت وسمن',
  spices: 'توابل وبهارات',
  sweet: 'سكر وشاي وقهوة',
  cleaning: 'منظفات وورقيات',
  other: 'تاني',
};

export const STAPLE_KINDS = Object.keys(STAPLE_KIND_LABELS) as StapleKind[];

/** Something in the long-life store. Its cost is spread over the weeks it lasts. */
export interface Staple {
  readonly id: string;
  readonly name: string;
  readonly kind: StapleKind;
  /** What the last pack cost, in SAR. */
  readonly price: number;
  /** When the last pack was bought, as a date key. */
  readonly boughtOn: string;
  /**
   * How many days a pack lasts. Measured from the gap between two purchases;
   * null until the family has bought it twice or typed a guess.
   */
  readonly lifeDays: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_IN_WEEK = 7;
/** Warn this many days before a staple is expected to run out, to leave time for an offer. */
export const RUNNING_LOW_DAYS = 7;

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((fromDateKey(toKey).getTime() - fromDateKey(fromKey).getTime()) / DAY_MS);
}

/**
 * The staple after buying a new pack today. The gap since the last pack becomes
 * its measured life, replacing any earlier guess.
 */
export function restock(staple: Staple, price: number, today: string): Staple {
  const gap = daysBetween(staple.boughtOn, today);
  return { ...staple, price, boughtOn: today, lifeDays: gap > 0 ? gap : staple.lifeDays };
}

/** What this staple costs per week of use, or null while its life is unknown. */
export function weeklyShare(staple: Staple): number | null {
  if (staple.lifeDays === null || staple.lifeDays <= 0) return null;
  return Math.round((staple.price / (staple.lifeDays / DAYS_IN_WEEK)) * 100) / 100;
}

/** Days until the pack is expected to run out. Negative means it should be gone already. */
export function daysLeft(staple: Staple, today: string): number | null {
  if (staple.lifeDays === null) return null;
  return staple.lifeDays - daysBetween(staple.boughtOn, today);
}

export function isRunningLow(staple: Staple, today: string): boolean {
  const left = daysLeft(staple, today);
  return left !== null && left <= RUNNING_LOW_DAYS;
}

/** The staples expected to run out within the warning window, the soonest first. */
export function runningLow(staples: readonly Staple[], today: string): Staple[] {
  return staples
    .filter((staple) => isRunningLow(staple, today))
    .sort((a, b) => (daysLeft(a, today) ?? 0) - (daysLeft(b, today) ?? 0));
}

/** Where a staple goes on the weekly shopping list. */
export function stapleCategory(kind: StapleKind): Category {
  return kind === 'cleaning' ? 'household' : 'pantry';
}

export interface PantrySummary {
  /** The weekly cost of every staple whose life is known, in SAR. */
  readonly weekly: number;
  /** Staples that cannot be spread yet because their life is unknown. */
  readonly unknownCount: number;
}

export function summarizePantry(staples: readonly Staple[]): PantrySummary {
  return staples.reduce<PantrySummary>(
    (summary, staple) => {
      const share = weeklyShare(staple);
      return share === null
        ? { ...summary, unknownCount: summary.unknownCount + 1 }
        : { ...summary, weekly: Math.round((summary.weekly + share) * 100) / 100 };
    },
    { weekly: 0, unknownCount: 0 },
  );
}
