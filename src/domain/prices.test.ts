import { describe, expect, test } from 'vitest';

import { cheaperAlternative, knownPrice, mealCostWithOffers } from './prices';
import type { Meal, Offer, PriceBook } from './types';

// Test figures only.
const book: PriceBook = {
  'أرز بسمتي': { price: 36, date: '2026-11-01' },
  رز: { price: 34, date: '2026-11-10' },
  زيت: { price: 20, date: '2026-11-05' },
};

describe('a cheaper alternative bought before', () => {
  test('finds the same product under another name for less', () => {
    expect(cheaperAlternative(book, 'أرز بسمتي', 36)).toEqual({ name: 'رز', price: 34, saving: 2 });
  });

  test('says nothing when the other name cost the same or more, or is another product', () => {
    expect(cheaperAlternative(book, 'رز', 34)).toBeNull();
    expect(cheaperAlternative(book, 'زيت زيتون', 50)).toBeNull();
  });

  test('needs an expected price to compare with', () => {
    expect(cheaperAlternative(book, 'أرز بسمتي', null)).toBeNull();
  });
});

const offer = (name: string, price: number, validUntil: string | null = null): Offer => ({
  id: name,
  store: 'بنده',
  name,
  price,
  packQty: 1,
  kind: 'weekly',
  validUntil,
  sourceUrl: null,
  addedAt: '2026-11-15',
});

const meal: Meal = {
  id: 'kabsa',
  name: 'كبسة',
  slots: ['lunch'],
  protein: 'chicken',
  tags: [],
  ingredients: [
    { name: 'أرز', qty: 1, unit: 'كجم', category: 'pantry' },
    { name: 'زيت', qty: 1, unit: 'لتر', category: 'pantry' },
    { name: 'دجاج', qty: 1, unit: 'حبة', category: 'protein' },
  ],
};

describe('knownPrice', () => {
  test('prefers the price recorded under the exact name', () => {
    expect(knownPrice(book, 'رز')).toBe(34);
  });

  test('finds the newest price recorded under another name for the same product', () => {
    expect(knownPrice(book, 'أرز')).toBe(34);
    expect(knownPrice(book, 'الرز المصري')).toBe(34);
  });

  test('does not borrow the price of a different product', () => {
    expect(knownPrice(book, 'زيت زيتون')).toBeNull();
    expect(knownPrice(book, 'سكر')).toBeNull();
  });
});

describe('mealCostWithOffers', () => {
  test('takes a running offer only where it beats the usual price', () => {
    const offers = [offer('أرز بسمتي 5 كجم', 30), offer('زيت طبخ', 25)];

    const cost = mealCostWithOffers(meal, book, offers, '2026-11-15');

    expect(cost).toEqual({ withOffers: 50, saving: 4, offerOnlyCount: 0 });
  });

  test('prices a never-bought ingredient from its offer and says so', () => {
    const cost = mealCostWithOffers(meal, book, [offer('دجاج كامل', 18)], '2026-11-15');

    expect(cost).toEqual({ withOffers: 72, saving: 0, offerOnlyCount: 1 });
  });

  test('ignores an offer that has ended', () => {
    const cost = mealCostWithOffers(meal, book, [offer('أرز', 10, '2026-11-10')], '2026-11-15');

    expect(cost.saving).toBe(0);
  });
});
