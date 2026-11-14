import { describe, expect, test } from 'vitest';

import { adviseTrips, bestOffer, isActive, matchesItem, planTrips, unitPrice } from './offers';
import type { Offer } from './types';

function offer(overrides: Partial<Offer>): Offer {
  return {
    id: 'o',
    store: 'بنده',
    name: 'أرز',
    price: 10,
    packQty: 1,
    kind: 'weekly',
    validUntil: null,
    sourceUrl: null,
    addedAt: '2026-11-14',
    ...overrides,
  };
}

describe('offers', () => {
  test('compares a bulk pack with a single item by unit price', () => {
    const single = offer({ id: 'single', price: 4, packQty: 1 });
    const sixPack = offer({ id: 'six', price: 18, packQty: 6, kind: 'bulk' });

    expect(unitPrice(sixPack)).toBe(3);
    expect(bestOffer('أرز', [single, sixPack])?.id).toBe('six');
  });

  test('treats an offer as active through its last day and when it has no end date', () => {
    expect(isActive(offer({ validUntil: '2026-11-17' }), '2026-11-17')).toBe(true);
    expect(isActive(offer({ validUntil: '2026-11-17' }), '2026-11-18')).toBe(false);
    expect(isActive(offer({ validUntil: null }), '2026-11-18')).toBe(true);
  });

  test('matches a short list name against a longer offer name and ignores spacing', () => {
    expect(matchesItem(offer({ name: 'أرز بسمتي 5 كجم' }), ' أرز ')).toBe(true);
    expect(matchesItem(offer({ name: 'سكر' }), 'أرز')).toBe(false);
    expect(matchesItem(offer({ name: 'سكر' }), '')).toBe(false);
  });

  test('returns no best offer when nothing matches', () => {
    expect(bestOffer('زيت', [offer({})])).toBeNull();
  });
});

describe('trip planning', () => {
  const offers: Offer[] = [
    offer({ id: 'p-rice', store: 'بنده', name: 'أرز', price: 30 }),
    offer({ id: 'p-oil', store: 'بنده', name: 'زيت', price: 25 }),
    offer({ id: 'o-rice', store: 'العثيم', name: 'أرز', price: 22 }),
    offer({ id: 'o-sugar', store: 'العثيم', name: 'سكر', price: 9 }),
    offer({ id: 'l-oil', store: 'لولو', name: 'زيت', price: 19 }),
  ];
  const list = ['أرز', 'زيت', 'سكر'];

  test('picks the single shop that covers the most items', () => {
    const plan = planTrips(['أرز', 'زيت'], offers, 1);

    expect(plan?.stores).toEqual(['بنده']);
    expect(plan?.total).toBe(55);
    expect(plan?.missing).toEqual([]);
  });

  test('breaks a coverage tie between shops by the cheaper basket', () => {
    const plan = planTrips(list, offers, 1);

    expect(plan?.stores).toEqual(['العثيم']);
    expect(plan?.total).toBe(31);
    expect(plan?.missing).toEqual(['زيت']);
  });

  test('finds the pair of shops that covers everything at the lowest cost', () => {
    const plan = planTrips(list, offers, 2);

    expect(plan?.stores).toEqual(['العثيم', 'لولو']);
    expect(plan?.total).toBe(50);
    expect(plan?.missing).toEqual([]);
  });

  test('says a second trip helps when it covers more of the list', () => {
    const advice = adviseTrips(list, offers);

    expect(advice.secondTripHelps).toBe(true);
  });

  test('says a second trip does not help when one shop is already best', () => {
    const advice = adviseTrips(['سكر'], offers);

    expect(advice.one?.stores).toEqual(['العثيم']);
    expect(advice.secondTripHelps).toBe(false);
  });

  test('returns no plan when no shop has anything on the list', () => {
    expect(planTrips(['حليب'], offers, 1)).toBeNull();
    expect(planTrips(list, [], 2)).toBeNull();
  });
});
