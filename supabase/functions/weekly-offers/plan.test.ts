import { describe, expect, test } from 'vitest';

import type { ReportedOffer } from '../price-search/offers';
import { freshOffers, isCovered, itemsToSearch, MAX_ITEMS_PER_WEEK, newestWeekItems, runWeek } from './plan';

function found(store: string, name: string, price: number): ReportedOffer {
  return { store, name, price, packQty: 1, kind: 'weekly', validUntil: null, sourceUrl: 'https://panda.sa/p/1', currency: 'SAR' };
}

describe('what a saved offer already covers', () => {
  test('meets a short list name and a long offer name', () => {
    expect(isCovered('رز', ['أرز بسمتي 5 كجم'])).toBe(true);
    expect(isCovered('الأرز', ['ارز مصري'])).toBe(true);
  });

  test('is not fooled by a product that only shares a few letters', () => {
    expect(isCovered('لبن', ['لبنة 500 جم'])).toBe(false);
    expect(isCovered('لبن', ['حليب 2 لتر'])).toBe(false);
  });
});

describe('choosing what to look up', () => {
  test('skips what has an offer, what was looked up this week, and repeats', () => {
    const wanted = itemsToSearch(['رز', 'لبن', 'بيض', 'بيض ', 'طماطم'], ['أرز بسمتي'], ['طماطم']);

    expect(wanted).toEqual(['لبن', 'بيض']);
  });

  test('stops at the weekly cap counting what was already looked up', () => {
    const many = ['أ1', 'ب2', 'ج3', 'د4', 'هـ5', 'و6', 'ز7', 'ح8'];

    expect(itemsToSearch(many, [], [])).toHaveLength(MAX_ITEMS_PER_WEEK);
    expect(itemsToSearch(many, [], ['x1', 'x2', 'x3', 'x4', 'x5'])).toHaveLength(1);
    expect(itemsToSearch(many, [], ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'])).toEqual([]);
  });
});

describe('the newest week of each household', () => {
  test('keeps only the items of the latest week per household', () => {
    const rows = [
      { household_id: 'a', week_start: '2026-11-07', name: 'قديم' },
      { household_id: 'a', week_start: '2026-11-14', name: 'رز' },
      { household_id: 'a', week_start: '2026-11-14', name: 'لبن' },
      { household_id: 'b', week_start: '2026-11-07', name: 'بيض' },
    ];

    const grouped = newestWeekItems(rows);

    expect(grouped.get('a')).toEqual(['رز', 'لبن']);
    expect(grouped.get('b')).toEqual(['بيض']);
  });
});

describe('the weekly run', () => {
  test('names the Monday of the week, so one week is one run', () => {
    expect(runWeek(new Date('2026-11-18T04:05:00Z'))).toBe('2026-11-16');
    expect(runWeek(new Date('2026-11-22T23:59:00Z'))).toBe('2026-11-16');
    expect(runWeek(new Date('2026-11-23T00:00:00Z'))).toBe('2026-11-23');
  });
});

describe('saving what was found', () => {
  test('leaves out an offer already saved and one found twice, but keeps another price or shop', () => {
    const saved = [{ store: 'بنده', name: 'أرز 5 كجم', price: 40 }];
    const result = freshOffers(
      [found('بنده', 'أرز 5 كجم', 40), found('بنده', 'أرز 5 كجم', 38), found('كارفور', 'أرز 5 كجم', 40), found('كارفور', 'أرز 5 كجم', 40)],
      saved,
    );

    expect(result.map((offer) => `${offer.store}:${offer.price}`)).toEqual(['بنده:38', 'كارفور:40']);
  });
});
