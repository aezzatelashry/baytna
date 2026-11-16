import { describe, expect, test } from 'vitest';

import { parseFoundOffers } from '../../../src/domain/offers';
import { keepSourcedOffers, officialStoreOf, type ReportedOffer } from './offers';

function reported(overrides: Partial<ReportedOffer>): ReportedOffer {
  return {
    store: 'بنده',
    name: 'أرز بسمتي 5 كجم',
    price: 42.95,
    packQty: 1,
    kind: 'weekly',
    validUntil: '2026-11-17',
    sourceUrl: 'https://www.panda.sa/ar/offers/rice',
    currency: 'SAR',
    ...overrides,
  };
}

describe('official sources', () => {
  test('knows each chain by its own Saudi site', () => {
    expect(officialStoreOf('https://www.carrefourksa.com/mafsau/ar/c/F1')).toBe('كارفور');
    expect(officialStoreOf('https://www.othaimmarkets.com/ar/offers')).toBe('العثيم');
    expect(officialStoreOf('https://shop.danube.sa/riyadh')).toBe('الدانوب');
    expect(officialStoreOf('https://gcc.luluhypermarket.com/ar-sa/grocery')).toBe('لولو');
  });

  test('refuses aggregators, other countries and look-alike addresses', () => {
    expect(officialStoreOf('https://d4donline.com/ar/saudi-arabia/riyadh/offers')).toBeNull();
    expect(officialStoreOf('https://www.carrefouregypt.com/mafegy/ar')).toBeNull();
    expect(officialStoreOf('https://gcc.luluhypermarket.com/en-ae/grocery')).toBeNull();
    expect(officialStoreOf('https://panda.sa.evil.example/offers')).toBeNull();
    expect(officialStoreOf('javascript:alert(1)')).toBeNull();
  });
});

describe('keepSourcedOffers', () => {
  const seen = ['https://panda.sa/ar/offers?page=2', 'https://www.carrefouregypt.com/mafegy/ar/rice'];

  test('keeps an offer found on a chain own site that the search returned', () => {
    expect(keepSourcedOffers([reported({})], seen)).toHaveLength(1);
  });

  test('names the shop after the site the price was on', () => {
    const mislabelled = reported({ store: 'هايبر ماركت' });

    expect(keepSourcedOffers([mislabelled], seen)[0].store).toBe('بنده');
  });

  test('drops a price from another country shop even when the search returned it', () => {
    const egyptian = reported({ sourceUrl: 'https://www.carrefouregypt.com/mafegy/ar/rice', currency: 'EGP' });
    const egyptianInRiyals = reported({ sourceUrl: 'https://www.carrefouregypt.com/mafegy/ar/rice' });

    expect(keepSourcedOffers([egyptian, egyptianInRiyals], seen)).toEqual([]);
  });

  test('drops a price that is not in riyals', () => {
    expect(keepSourcedOffers([reported({ currency: 'other' })], seen)).toEqual([]);
  });

  test('drops an offer attributed to a site the search never returned', () => {
    const invented = reported({ sourceUrl: 'https://www.danube.sa/rice' });

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
