import type { ReportedOffer } from '../price-search/offers.ts';

/** Each product is looked up on the web once a week at most, and a household gets this many lookups. */
export const MAX_ITEMS_PER_WEEK = 6;

const DIACRITICS = /[ً-ٰـ]/g;

/**
 * The words of a product name with the spellings Arabic writers mix folded together
 * (hamza forms, ta marbuta, the leading article), so "الأرز" and "رز" meet.
 */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(DIACRITICS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length > 3 && word.startsWith('ال') ? word.slice(2) : word))
    .map((word) => (word.length > 2 && word.startsWith('ا') ? word.slice(1) : word));
}

function keyOf(name: string): string {
  return words(name).join(' ');
}

/**
 * True when a saved offer already names this product. A rough test on purpose: when it
 * is unsure it says "not covered", which costs one extra search and never loses an offer.
 */
export function isCovered(item: string, offerNames: readonly string[]): boolean {
  const wanted = words(item);
  if (wanted.length === 0) return true;
  return offerNames.some((name) => {
    const have = new Set(words(name));
    return wanted.every((word) => have.has(word));
  });
}

/**
 * The list products to look up in this run: each product once, none that already have a
 * running offer, none looked up earlier this week, and never more than the weekly cap.
 */
export function itemsToSearch(
  items: readonly string[],
  runningOfferNames: readonly string[],
  lookedUpThisWeek: readonly string[],
  cap: number = MAX_ITEMS_PER_WEEK,
): string[] {
  const seen = new Set(lookedUpThisWeek.map(keyOf));
  const wanted: string[] = [];
  for (const name of items) {
    const key = keyOf(name);
    if (key === '' || seen.has(key) || isCovered(name, runningOfferNames)) continue;
    seen.add(key);
    wanted.push(name.trim());
  }
  return wanted.slice(0, Math.max(cap - lookedUpThisWeek.length, 0));
}

export interface ItemRow {
  readonly household_id: string;
  readonly week_start: string;
  readonly name: string;
}

/** Per household, the names still to buy in its newest week. Older weeks are over. */
export function newestWeekItems(rows: readonly ItemRow[]): Map<string, string[]> {
  const newest = new Map<string, string>();
  for (const row of rows) {
    const known = newest.get(row.household_id);
    if (known === undefined || row.week_start > known) newest.set(row.household_id, row.week_start);
  }
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    if (row.week_start !== newest.get(row.household_id)) continue;
    grouped.set(row.household_id, [...(grouped.get(row.household_id) ?? []), row.name]);
  }
  return grouped;
}

/** The Monday (UTC) of the week a moment falls in, as a date key. Identifies one weekly run. */
export function runWeek(now: Date): string {
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

export interface SavedOffer {
  readonly store: string;
  readonly name: string;
  readonly price: number;
}

/** Found offers that are not already saved: same shop, same product name and same price count as one. */
export function freshOffers(found: readonly ReportedOffer[], saved: readonly SavedOffer[]): ReportedOffer[] {
  const key = (offer: SavedOffer): string => `${offer.store.trim()}|${offer.name.trim()}|${Number(offer.price)}`;
  const seen = new Set(saved.map(key));
  return found.filter((offer) => {
    if (seen.has(key(offer))) return false;
    seen.add(key(offer));
    return true;
  });
}
