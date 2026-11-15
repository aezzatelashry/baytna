import { lookupPrice, normalizeName } from './budget';
import { judgeTrip, type CarCosts } from './trip';
import type { PriceBook } from './types';

/** A place the family buys from, with how far out of the way it is. */
export interface Shop {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  /** Extra driving there and back compared with the usual shop, in km. Zero when it is on the way. */
  readonly extraKm: number;
  /** Extra time there and back, in minutes. */
  readonly extraMinutes: number;
}

/** What the family paid at each shop, keyed by shop id. */
export type ShopPrices = Readonly<Record<string, PriceBook>>;

export interface ShopQuote {
  readonly shop: Shop;
  /** Sum of the last prices paid at this shop for the items it has a price for, in SAR. */
  readonly knownTotal: number;
  readonly pricedCount: number;
  /** List items never bought at this shop, so their price there is unknown. */
  readonly missing: readonly string[];
  /** Fuel and time for the extra distance, or null when the car's costs are not entered. */
  readonly tripCost: number | null;
  /** Known total plus trip cost: what going there really costs. */
  readonly effective: number;
}

function quote(shop: Shop, items: readonly string[], book: PriceBook, car: CarCosts | null): ShopQuote {
  const prices = items.map((item) => ({ item, price: lookupPrice(book, item) }));
  const knownTotal = prices.reduce((sum, entry) => sum + (entry.price ?? 0), 0);
  const verdict = car ? judgeTrip({ saving: 0, extraKm: shop.extraKm, extraMinutes: shop.extraMinutes }, car) : null;
  const tripCost = verdict ? Math.round((verdict.fuelCost + verdict.timeCost) * 100) / 100 : null;
  return {
    shop,
    knownTotal: Math.round(knownTotal * 100) / 100,
    pricedCount: prices.filter((entry) => entry.price !== null).length,
    missing: prices.filter((entry) => entry.price === null).map((entry) => entry.item),
    tripCost,
    effective: Math.round((knownTotal + (tripCost ?? 0)) * 100) / 100,
  };
}

/**
 * Prices the list at every shop from what the family paid there before. The shop that
 * knows the most items comes first; between equals, the cheaper once the drive is counted.
 */
export function quoteShops(
  items: readonly string[],
  shops: readonly Shop[],
  prices: ShopPrices,
  car: CarCosts | null,
): ShopQuote[] {
  return shops
    .map((shop) => quote(shop, items, prices[shop.id] ?? {}, car))
    .sort((a, b) => b.pricedCount - a.pricedCount || a.effective - b.effective);
}

/**
 * What driving to a named shop costs in fuel and time, or null when the shop is not
 * in "my shops" or the car's costs were never entered. Names match loosely, so
 * "العثيم" finds "أسواق العثيم".
 */
export function tripCostTo(storeName: string, shops: readonly Shop[], car: CarCosts | null): number | null {
  const wanted = normalizeName(storeName);
  if (car === null || wanted === '') return null;
  const shop = shops.find((each) => {
    const name = normalizeName(each.name);
    return name !== '' && (name.includes(wanted) || wanted.includes(name));
  });
  if (!shop) return null;
  const verdict = judgeTrip({ saving: 0, extraKm: shop.extraKm, extraMinutes: shop.extraMinutes }, car);
  return Math.round((verdict.fuelCost + verdict.timeCost) * 100) / 100;
}

/** The shop to go to, or null when no shop has a recorded price for anything on the list. */
export function bestShop(quotes: readonly ShopQuote[]): ShopQuote | null {
  const first = quotes[0];
  return first && first.pricedCount > 0 ? first : null;
}
