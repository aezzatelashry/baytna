import { describe, expect, test } from 'vitest';

import { flyerToOffers, parseFlyer } from './flyer';

describe('reading a flyer reply', () => {
  test('keeps the shop, the last day and the well-formed offers', () => {
    const reading = parseFlyer({
      store: ' بنده ',
      validUntil: '2026-11-20',
      offers: [
        { name: 'أرز بسمتي 5 كجم', price: 29.95, packQty: 1 },
        { name: 'دجاج 1000 جم', price: 27.75, packQty: 2 },
      ],
    });

    expect(reading.store).toBe('بنده');
    expect(reading.validUntil).toBe('2026-11-20');
    expect(reading.offers).toEqual([
      { name: 'أرز بسمتي 5 كجم', price: 29.95, packQty: 1 },
      { name: 'دجاج 1000 جم', price: 27.75, packQty: 2 },
    ]);
  });

  test('drops lines with no name or no real price and never invents a pack size', () => {
    const reading = parseFlyer({
      store: null,
      validUntil: 'next week',
      offers: [{ name: '', price: 5 }, { name: 'لبن', price: 0 }, { name: 'لبن', price: 9.5, packQty: 1.5 }, 'junk'],
    });

    expect(reading).toEqual({ store: null, validUntil: null, offers: [{ name: 'لبن', price: 9.5, packQty: 1 }] });
  });

  test('gives an empty reading for a reply that is not a flyer at all', () => {
    expect(parseFlyer(null)).toEqual({ store: null, validUntil: null, offers: [] });
    expect(parseFlyer({ error: 'ai_failed' }).offers).toEqual([]);
  });
});

describe('saving a reviewed flyer', () => {
  const reading = parseFlyer({ store: null, validUntil: '2026-11-20', offers: [{ name: 'لبن', price: 9.5, packQty: 1 }] });

  test('files every offer under the confirmed shop as a weekly offer with no web source', () => {
    expect(flyerToOffers(reading, ' العثيم ')).toEqual([
      { name: 'لبن', price: 9.5, packQty: 1, store: 'العثيم', kind: 'weekly', validUntil: '2026-11-20', sourceUrl: null },
    ]);
  });

  test('saves nothing until the shop is known', () => {
    expect(flyerToOffers(reading, '  ')).toEqual([]);
  });
});
