import { CATALOG } from '../data/catalog';
import { sameProduct } from './catalog';
import type { FoundOffer } from './offers';
import type { Offer } from './types';

/** How many list items one refresh looks up. Each lookup is a paid web search. */
export const MAX_LIST_SEARCHES = 6;

/**
 * The list items worth looking up: each product once, and only those with no
 * running offer saved already. Capped, because every lookup costs money.
 */
export function itemsToLookUp(itemNames: readonly string[], runningOffers: readonly Offer[]): string[] {
  const wanted: string[] = [];
  for (const name of itemNames) {
    const isCovered = runningOffers.some((offer) => sameProduct(name, offer.name, CATALOG));
    const isRepeat = wanted.some((kept) => sameProduct(name, kept, CATALOG));
    if (!isCovered && !isRepeat && name.trim() !== '') wanted.push(name.trim());
  }
  return wanted.slice(0, MAX_LIST_SEARCHES);
}

/** Found offers that are not already saved: same shop, same product name and same price count as one. */
export function newOffersOnly(found: readonly FoundOffer[], saved: readonly Offer[]): FoundOffer[] {
  const key = (offer: Pick<Offer, 'store' | 'name' | 'price'>): string => `${offer.store.trim()}|${offer.name.trim()}|${offer.price}`;
  const seen = new Set(saved.map(key));
  return found.filter((offer) => {
    if (seen.has(key(offer))) return false;
    seen.add(key(offer));
    return true;
  });
}
