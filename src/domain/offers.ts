import { normalizeName } from './budget';
import type { Offer } from './types';

/** Price of one unit, so a six-pack can be compared with a single item. */
export function unitPrice(offer: Pick<Offer, 'price' | 'packQty'>): number {
  return offer.packQty > 0 ? offer.price / offer.packQty : offer.price;
}

/** An offer with no end date is treated as still running. */
export function isActive(offer: Offer, today: string): boolean {
  return offer.validUntil === null || offer.validUntil >= today;
}

/** An offer matches a list item when either name contains the other ("أرز" and "أرز بسمتي 5 كجم"). */
export function matchesItem(offer: Offer, itemName: string): boolean {
  const item = normalizeName(itemName);
  const offered = normalizeName(offer.name);
  if (item === '' || offered === '') return false;
  return offered.includes(item) || item.includes(offered);
}

function cheapest(offers: readonly Offer[]): Offer | null {
  return offers.reduce<Offer | null>(
    (best, offer) => (best === null || unitPrice(offer) < unitPrice(best) ? offer : best),
    null,
  );
}

/** The lowest unit price among the offers that match the item. */
export function bestOffer(itemName: string, offers: readonly Offer[]): Offer | null {
  return cheapest(offers.filter((offer) => matchesItem(offer, itemName)));
}

export type FoundOffer = Omit<Offer, 'id' | 'addedAt'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toFoundOffer(value: unknown): FoundOffer | null {
  if (!isRecord(value)) return null;
  const { store, name, price, packQty, kind, validUntil, sourceUrl } = value;
  if (typeof store !== 'string' || store.trim() === '') return null;
  if (typeof name !== 'string' || name.trim() === '') return null;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  if (kind !== 'daily' && kind !== 'weekly' && kind !== 'bulk') return null;
  if (typeof sourceUrl !== 'string' || !/^https?:\/\//.test(sourceUrl)) return null;
  return {
    store,
    name,
    price,
    packQty: typeof packQty === 'number' && Number.isInteger(packQty) && packQty >= 1 ? packQty : 1,
    kind,
    validUntil: typeof validUntil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? validUntil : null,
    sourceUrl,
  };
}

/** Reads the price-search response. Anything malformed is dropped, never guessed. */
export function parseFoundOffers(payload: unknown): FoundOffer[] {
  if (!isRecord(payload) || !Array.isArray(payload.offers)) return [];
  return payload.offers.flatMap((entry) => {
    const offer = toFoundOffer(entry);
    return offer ? [offer] : [];
  });
}

export interface TripPick {
  readonly item: string;
  readonly offer: Offer;
}

export interface TripPlan {
  readonly stores: readonly string[];
  readonly picks: readonly TripPick[];
  /** List items none of these shops has an offer for. */
  readonly missing: readonly string[];
  /** What the picked packs cost together, in SAR. */
  readonly total: number;
}

function storeGroups(stores: readonly string[], size: number): string[][] {
  if (size === 1) return stores.map((store) => [store]);
  return stores.flatMap((first, index) => stores.slice(index + 1).map((second) => [first, second]));
}

function planFor(stores: readonly string[], items: readonly string[], offers: readonly Offer[]): TripPlan {
  const inStores = offers.filter((offer) => stores.includes(offer.store));
  const picks = items.flatMap((item) => {
    const offer = bestOffer(item, inStores);
    return offer ? [{ item, offer }] : [];
  });
  const covered = new Set(picks.map((pick) => pick.item));
  return {
    stores: stores.filter((store) => picks.some((pick) => pick.offer.store === store)),
    picks,
    missing: items.filter((item) => !covered.has(item)),
    total: picks.reduce((sum, pick) => sum + pick.offer.price, 0),
  };
}

/** More items covered wins; on a tie, the cheaper basket wins. */
function better(candidate: TripPlan, current: TripPlan | null): boolean {
  if (current === null) return true;
  if (candidate.picks.length !== current.picks.length) return candidate.picks.length > current.picks.length;
  return candidate.total < current.total;
}

/**
 * The best basket for a given number of shopping trips (1 or 2 shops).
 * Returns null when no shop has an offer for anything on the list.
 */
export function planTrips(
  items: readonly string[],
  offers: readonly Offer[],
  storeCount: 1 | 2,
): TripPlan | null {
  const stores = [...new Set(offers.map((offer) => offer.store))];
  const best = storeGroups(stores, storeCount).reduce<TripPlan | null>((current, group) => {
    const candidate = planFor(group, items, offers);
    return better(candidate, current) ? candidate : current;
  }, null);
  return best !== null && best.picks.length > 0 ? best : null;
}

export interface TripAdvice {
  readonly one: TripPlan | null;
  readonly two: TripPlan | null;
  /** True when a second shop covers more items or costs less than the best single shop. */
  readonly secondTripHelps: boolean;
}

export function adviseTrips(items: readonly string[], offers: readonly Offer[]): TripAdvice {
  const one = planTrips(items, offers, 1);
  const two = planTrips(items, offers, 2);
  const secondTripHelps = two !== null && two.stores.length === 2 && better(two, one);
  return { one, two, secondTripHelps };
}
