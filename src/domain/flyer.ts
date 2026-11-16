import type { FoundOffer } from './offers';
import type { Offer } from './types';

/** What the server read off a photographed flyer, before the family reviews it. */
export interface FlyerReading {
  /** The shop printed on the flyer, or null when the photo does not show it. */
  readonly store: string | null;
  readonly validUntil: string | null;
  readonly offers: readonly Pick<Offer, 'name' | 'price' | 'packQty'>[];
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY: FlyerReading = { store: null, validUntil: null, offers: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads the flyer function's response. Anything malformed is dropped, never guessed. */
export function parseFlyer(payload: unknown): FlyerReading {
  if (!isRecord(payload) || !Array.isArray(payload.offers)) return EMPTY;
  const { store, validUntil } = payload;
  const offers = payload.offers.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const { name, price, packQty } = entry;
    if (typeof name !== 'string' || name.trim() === '') return [];
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return [];
    const qty = typeof packQty === 'number' && Number.isInteger(packQty) && packQty >= 1 ? packQty : 1;
    return [{ name: name.trim(), price, packQty: qty }];
  });
  return {
    store: typeof store === 'string' && store.trim() !== '' ? store.trim() : null,
    validUntil: typeof validUntil === 'string' && DATE_KEY.test(validUntil) ? validUntil : null,
    offers,
  };
}

/** Turns a reviewed flyer into offers ready to save, under the shop the family confirmed. */
export function flyerToOffers(reading: FlyerReading, store: string): FoundOffer[] {
  const shop = store.trim();
  if (shop === '') return [];
  return reading.offers.map((offer) => ({
    ...offer,
    store: shop,
    kind: 'weekly' as const,
    validUntil: reading.validUntil,
    sourceUrl: null,
  }));
}
