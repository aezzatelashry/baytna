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
}

/**
 * Splits what is left to buy by the shop holding each item's best running offer.
 * Items with no offer come last, to be bought wherever the family goes.
 */
export function groupByStore(items: readonly string[], offers: readonly Offer[], today: string): StoreGroup[] {
  const running = offers.filter((offer) => isActive(offer, today));
  const picked = items.map((name) => ({ name, offer: bestOffer(name, running) }));
  const stores = [...new Set(picked.flatMap((entry) => (entry.offer ? [entry.offer.store] : [])))];
  const withOffers = stores.map((store) => ({
    store,
    lines: picked
      .filter((entry) => entry.offer?.store === store)
      .map((entry) => ({ name: entry.name, price: entry.offer?.price ?? null })),
  }));
  const anywhere = picked.filter((entry) => entry.offer === null).map((entry) => ({ name: entry.name, price: null }));
  return anywhere.length > 0 ? [...withOffers, { store: null, lines: anywhere }] : withOffers;
}

/** The list as plain text for a chat app, one block per shop. */
export function listMessage(groups: readonly StoreGroup[]): string {
  const blocks = groups.map((group) => {
    const title = group.store === null ? 'من أي متجر' : `من ${group.store}`;
    const lines = group.lines.map((line) => (line.price === null ? `- ${line.name}` : `- ${line.name} (عرض ${formatSar(line.price)} ريال)`));
    return [title, ...lines].join('\n');
  });
  return ['قائمة مشتريات بيتنا', ...blocks].join('\n\n');
}
