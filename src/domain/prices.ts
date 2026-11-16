import { CATALOG } from '../data/catalog';
import { lookupPrice, normalizeName } from './budget';
import { sameProduct } from './catalog';
import { bestOffer, isActive, unitPrice } from './offers';
import type { Meal, Offer, PriceBook } from './types';

/**
 * The last price the family paid for a product, whatever name they typed it under:
 * the exact name first, then the newest entry the dictionary says is the same product.
 */
export function knownPrice(book: PriceBook, name: string): number | null {
  const exact = lookupPrice(book, name);
  if (exact !== null) return exact;
  const wanted = normalizeName(name);
  const newest = Object.entries(book)
    .filter(([key]) => key !== wanted && sameProduct(key, name, CATALOG))
    .sort(([, a], [, b]) => b.date.localeCompare(a.date))[0];
  return newest ? newest[1].price : null;
}

export interface Alternative {
  /** The name the family bought it under, as their price book holds it. */
  readonly name: string;
  readonly price: number;
  /** What it saves against the price expected for the item on the list, in SAR. */
  readonly saving: number;
}

/**
 * The same product bought before under another name (another brand or size) for less
 * than this item is expected to cost. Null when nothing cheaper is on record, or when
 * the item has no expected price to compare with.
 */
export function cheaperAlternative(book: PriceBook, name: string, expectedPrice: number | null): Alternative | null {
  if (expectedPrice === null || expectedPrice <= 0) return null;
  const wanted = normalizeName(name);
  const cheapest = Object.entries(book)
    .filter(([key, record]) => key !== wanted && record.price < expectedPrice && sameProduct(key, name, CATALOG))
    .sort(([, a], [, b]) => a.price - b.price)[0];
  if (!cheapest) return null;
  const [alternativeName, record] = cheapest;
  return { name: alternativeName, price: record.price, saving: Math.round((expectedPrice - record.price) * 100) / 100 };
}

export interface OfferCost {
  /** What the meal costs when each ingredient takes its running offer if that is cheaper, in SAR. */
  readonly withOffers: number;
  /** How much the running offers take off the family's usual prices. */
  readonly saving: number;
  /** Ingredients priced only by an offer, because the family never bought them. */
  readonly offerOnlyCount: number;
}

/**
 * The meal's cost with today's offers. Like the plain estimate, each ingredient
 * counts as one purchase, whatever quantity the recipe needs.
 */
export function mealCostWithOffers(meal: Meal, book: PriceBook, offers: readonly Offer[], today: string): OfferCost {
  const running = offers.filter((offer) => isActive(offer, today));
  const total = meal.ingredients.reduce<OfferCost>(
    (cost, ingredient) => {
      const usual = knownPrice(book, ingredient.name);
      const offer = bestOffer(ingredient.name, running);
      const offered = offer === null ? null : unitPrice(offer);
      if (usual === null && offered === null) return cost;
      if (usual === null) return { ...cost, withOffers: cost.withOffers + (offered ?? 0), offerOnlyCount: cost.offerOnlyCount + 1 };
      const paid = offered !== null && offered < usual ? offered : usual;
      return { ...cost, withOffers: cost.withOffers + paid, saving: cost.saving + (usual - paid) };
    },
    { withOffers: 0, saving: 0, offerOnlyCount: 0 },
  );
  return {
    ...total,
    withOffers: Math.round(total.withOffers * 100) / 100,
    saving: Math.round(total.saving * 100) / 100,
  };
}
