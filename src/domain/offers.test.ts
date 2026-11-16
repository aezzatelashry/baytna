import { describe, expect, test } from 'vitest';

import {
  adviseTrips,
  bestOffer,
  daysUntilEnd,
  expiryLabel,
  isActive,
  matchesItem,
  offerForItem,
  offersFromElsewhere,
  planTrips,
  unitPrice,
} from './offers';
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

describe('offers that did not come from a chain own Saudi site', () => {
  const saved = (id: string, sourceUrl: string | null): Offer => ({
    id,
    store: 'كارفور',
    name: 'أرز',
    price: 30,
    packQty: 1,
    kind: 'weekly',
    validUntil: null,
    sourceUrl,
    addedAt: '2026-11-16',
  });

  test('picks out prices from another country or an aggregator, and leaves the rest', () => {
    const offers = [
      saved('saudi', 'https://www.carrefourksa.com/mafsau/ar/p/1'),
      saved('egypt', 'https://www.carrefouregypt.com/mafegy/ar/p/1'),
      saved('aggregator', 'https://d4donline.com/ar/saudi-arabia/riyadh/offers'),
      saved('typed', null),
    ];

    expect(offersFromElsewhere(offers).map((offer) => offer.id)).toEqual(['egypt', 'aggregator']);
  });
});

describe('when an offer ends', () => {
  const today = '2026-11-16';

  test('says how many days are left', () => {
    expect(expiryLabel('2026-11-20', today)).toBe('ينتهي 2026-11-20، باقي 4 يوم');
  });

  test('calls out the last day and the day before', () => {
    expect(expiryLabel('2026-11-16', today)).toBe('آخر يوم النهارده');
    expect(expiryLabel('2026-11-17', today)).toBe('ينتهي بكرة 2026-11-17');
  });

  test('says plainly when the date is unknown or already past', () => {
    expect(expiryLabel(null, today)).toBe('تاريخ الانتهاء مش مكتوب');
    expect(expiryLabel('2026-11-10', today)).toBe('انتهى يوم 2026-11-10');
    expect(daysUntilEnd(null, today)).toBeNull();
    expect(daysUntilEnd('2026-11-10', today)).toBe(-6);
  });
});

describe('offerForItem', () => {
  const rice = offer({ id: 'rice', name: 'أرز بسمتي 5 كجم', price: 30, validUntil: '2026-11-20' });

  test('links a list item to a flyer line through the dictionary', () => {
    expect(offerForItem('رز', [rice], null, '2026-11-15')?.offer.id).toBe('rice');
    expect(offerForItem('رز بلبن', [rice], null, '2026-11-15')).toBeNull();
  });

  test('calls an offer cheaper only when it beats the last price paid', () => {
    expect(offerForItem('رز', [rice], 36, '2026-11-15')).toMatchObject({ verdict: 'cheaper', saving: 6 });
    expect(offerForItem('رز', [rice], 28, '2026-11-15')).toMatchObject({ verdict: 'dearer', saving: -2 });
    expect(offerForItem('رز', [rice], 30, '2026-11-15')).toMatchObject({ verdict: 'same', saving: 0 });
  });

  test('gives no verdict while the family has never bought the item', () => {
    expect(offerForItem('رز', [rice], null, '2026-11-15')).toMatchObject({ verdict: 'unknown', saving: null });
  });

  test('ignores an offer that has ended', () => {
    expect(offerForItem('رز', [rice], 36, '2026-11-21')).toBeNull();
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

  test('says a cheaper pair helps when the driving is unknown', () => {
    const advice = adviseTrips(['أرز', 'زيت'], offers);

    expect(advice.basketSaving).toBe(14);
    expect(advice.extraDriveCost).toBeNull();
    expect(advice.secondTripHelps).toBe(true);
  });

  test('drops the cheaper pair when its extra driving eats the saving', () => {
    // Test figures only: each shop costs this much to drive to.
    const drive: Record<string, number> = { بنده: 0, العثيم: 8, لولو: 11 };

    const advice = adviseTrips(['أرز', 'زيت'], offers, (store) => drive[store] ?? null);

    expect(advice.extraDriveCost).toBe(19);
    expect(advice.netSaving).toBe(-5);
    expect(advice.secondTripHelps).toBe(false);
  });

  test('keeps the pair when it still saves after the driving', () => {
    const advice = adviseTrips(['أرز', 'زيت'], offers, () => 3);

    expect(advice.extraDriveCost).toBe(3);
    expect(advice.netSaving).toBe(11);
    expect(advice.secondTripHelps).toBe(true);
  });

  test('still sends the family to a second shop that covers more, whatever the drive', () => {
    const advice = adviseTrips(list, offers, () => 40);

    expect(advice.secondTripHelps).toBe(true);
    expect(advice.basketSaving).toBe(0);
  });

  test('returns no plan when no shop has anything on the list', () => {
    expect(planTrips(['حليب'], offers, 1)).toBeNull();
    expect(planTrips(list, [], 2)).toBeNull();
  });
});
