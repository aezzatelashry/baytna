import { describe, expect, test } from 'vitest';

import { itemsToLookUp, MAX_LIST_SEARCHES, newOffersOnly } from './list-offers';
import type { Offer } from './types';

function offer(name: string, store = 'بنده', price = 30): Offer {
  return { id: `${store}-${name}`, store, name, price, packQty: 1, kind: 'weekly', validUntil: null, sourceUrl: null, addedAt: '2026-11-16' };
}

describe('choosing what to look up', () => {
  test('skips a product that already has a running offer saved', () => {
    expect(itemsToLookUp(['رز', 'لبن'], [offer('أرز بسمتي 5 كجم')])).toEqual(['لبن']);
  });

  test('looks each product up once, however it is spelled on the list', () => {
    expect(itemsToLookUp(['طماطم', 'بندورة', ' '], [])).toEqual(['طماطم']);
  });

  test('never goes over the cap, because each lookup is paid', () => {
    const many = ['رز', 'لبن', 'بيض', 'دجاج', 'طماطم', 'خيار', 'بصل', 'بطاطس', 'تفاح'];

    expect(itemsToLookUp(many, [])).toHaveLength(MAX_LIST_SEARCHES);
  });
});

describe('saving what was found', () => {
  test('leaves out an offer that is already saved and one found twice', () => {
    const saved = [offer('أرز بسمتي 5 كجم')];
    const found = [
      { ...offer('أرز بسمتي 5 كجم'), sourceUrl: 'https://example.com' },
      { ...offer('حليب 2 لتر', 'العثيم', 9.5), sourceUrl: 'https://example.com' },
      { ...offer('حليب 2 لتر', 'العثيم', 9.5), sourceUrl: 'https://example.com' },
    ];

    expect(newOffersOnly(found, saved).map((each) => each.name)).toEqual(['حليب 2 لتر']);
  });

  test('keeps the same product at a different price or shop', () => {
    const found = [offer('أرز بسمتي 5 كجم', 'بنده', 28), offer('أرز بسمتي 5 كجم', 'لولو', 30)];

    expect(newOffersOnly(found, [offer('أرز بسمتي 5 كجم')])).toHaveLength(2);
  });
});
