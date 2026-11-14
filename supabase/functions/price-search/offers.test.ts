import { describe, expect, test } from 'vitest';

import { parseFoundOffers } from '../../../src/domain/offers';
import { keepSourcedOffers, type ReportedOffer } from './offers';

function reported(overrides: Partial<ReportedOffer>): ReportedOffer {
  return {
    store: 'بنده',
    name: 'أرز بسمتي 5 كجم',
    price: 42.95,
    packQty: 1,
    kind: 'weekly',
    validUntil: '2026-11-17',
    sourceUrl: 'https://www.example-offers.test/riyadh/rice',
    ...overrides,
  };
}

describe('keepSourcedOffers', () => {
  const seen = ['https://example-offers.test/riyadh/deals?page=2'];

  test('keeps an offer whose source site was returned by the search', () => {
    expect(keepSourcedOffers([reported({})], seen)).toHaveLength(1);
  });

  test('drops an offer attributed to a site the search never returned', () => {
    const invented = reported({ sourceUrl: 'https://made-up.test/rice' });

    expect(keepSourcedOffers([invented], seen)).toEqual([]);
  });

  test('drops offers with impossible prices, pack sizes, kinds or dates', () => {
    const bad = [
      reported({ price: 0 }),
      reported({ price: 99999 }),
      reported({ packQty: 0 }),
      reported({ kind: 'yearly' }),
      reported({ validUntil: 'next week' }),
      reported({ sourceUrl: 'javascript:alert(1)' }),
    ];

    expect(keepSourcedOffers(bad, seen)).toEqual([]);
  });
});

describe('parseFoundOffers', () => {
  test('reads well-formed offers from the function response', () => {
    const found = parseFoundOffers({ offers: [reported({})] });

    expect(found).toHaveLength(1);
    expect(found[0].price).toBe(42.95);
  });

  test('drops malformed entries and never throws on a strange payload', () => {
    const payload = { offers: [reported({}), { store: 'x' }, null, reported({ sourceUrl: 'ftp://x' })] };

    expect(parseFoundOffers(payload)).toHaveLength(1);
    expect(parseFoundOffers(null)).toEqual([]);
    expect(parseFoundOffers({ offers: 'none' })).toEqual([]);
  });

  test('falls back to a single unit and no end date when those fields are unusable', () => {
    const found = parseFoundOffers({ offers: [{ ...reported({}), packQty: 2.5, validUntil: 'soon' }] });

    expect(found[0].packQty).toBe(1);
    expect(found[0].validUntil).toBeNull();
  });
});
