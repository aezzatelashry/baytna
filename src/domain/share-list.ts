import { formatSar } from './budget';
import { bestOffer, isActive } from './offers';
import type { Offer } from './types';

export interface StoreLine {
  readonly name: string;
  /** The offer price at this shop, or null when the item has no running offer. */
  readonly price: number | null;
}

export interface StoreGroup {
  /** The shop with the best running offer, or null for items to buy anywhere. */
  readonly store: string | null;
  readonly lines: readonly StoreLine[];
  /** What this shop's offer prices add up to, in SAR. Zero for the group with no offers. */
  readonly total: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function totalOf(lines: readonly StoreLine[]): number {
  return round2(lines.reduce((sum, line) => sum + (line.price ?? 0), 0));
}

/**
 * Splits what is left to buy by the shop holding each item's best running offer, with
 * what each shop's offers add up to. Items with no offer come last, to be bought
 * wherever the family goes, and add nothing to any total.
 */
export function groupByStore(items: readonly string[], offers: readonly Offer[], today: string): StoreGroup[] {
  const running = offers.filter((offer) => isActive(offer, today));
  const picked = items.map((name) => ({ name, offer: bestOffer(name, running) }));
  const stores = [...new Set(picked.flatMap((entry) => (entry.offer ? [entry.offer.store] : [])))];
  const withOffers = stores.map((store) => {
    const lines = picked
      .filter((entry) => entry.offer?.store === store)
      .map((entry) => ({ name: entry.name, price: entry.offer?.price ?? null }));
    return { store, lines, total: totalOf(lines) };
  });
  const anywhere = picked.filter((entry) => entry.offer === null).map((entry) => ({ name: entry.name, price: null }));
  return anywhere.length > 0 ? [...withOffers, { store: null, lines: anywhere, total: 0 }] : withOffers;
}

/** The grand total: every shop's offer prices together, in SAR. */
export function basketTotal(groups: readonly StoreGroup[]): number {
  return round2(groups.reduce((sum, group) => sum + group.total, 0));
}

/** How many items have an offer, and how many still have none. */
export function basketCoverage(groups: readonly StoreGroup[]): { covered: number; uncovered: number } {
  const lines = groups.flatMap((group) => group.lines);
  const covered = lines.filter((line) => line.price !== null).length;
  return { covered, uncovered: lines.length - covered };
}

/** The list as plain text for a chat app, one block per shop with its total, then the grand total. */
export function listMessage(groups: readonly StoreGroup[]): string {
  const blocks = groups.map((group) => {
    const title = group.store === null ? 'من أي متجر' : `من ${group.store} (المجموع ${formatSar(group.total)} ريال)`;
    const lines = group.lines.map((line) => (line.price === null ? `- ${line.name}` : `- ${line.name} (عرض ${formatSar(line.price)} ريال)`));
    return [title, ...lines].join('\n');
  });
  const grand = basketTotal(groups);
  const closing = grand > 0 ? [`الإجمالي بالعروض: ${formatSar(grand)} ريال`] : [];
  return ['قائمة مشتريات بيتنا', ...blocks, ...closing].join('\n\n');
}
