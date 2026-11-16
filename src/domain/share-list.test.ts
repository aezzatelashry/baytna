import { describe, expect, test } from 'vitest';

import { basketCoverage, basketTotal, groupByStore, listMessage } from './share-list';
import type { Offer } from './types';

// Test figures only.
const offer = (store: string, name: string, price: number, validUntil: string | null = null): Offer => ({
  id: `${store}-${name}`,
  store,
  name,
  price,
  packQty: 1,
  kind: 'weekly',
  validUntil,
  sourceUrl: null,
  addedAt: '2026-11-15',
});

const offers = [offer('بنده', 'أرز بسمتي', 30), offer('لولو', 'أرز', 34), offer('لولو', 'زيت طبخ', 19), offer('بنده', 'سكر', 5, '2026-11-10')];

describe('groupByStore', () => {
  test('puts each item under the shop with its best running offer', () => {
    const groups = groupByStore(['رز', 'زيت', 'خبز'], offers, '2026-11-15');

    expect(groups).toEqual([
      { store: 'بنده', lines: [{ name: 'رز', price: 30 }], total: 30 },
      { store: 'لولو', lines: [{ name: 'زيت', price: 19 }], total: 19 },
      { store: null, lines: [{ name: 'خبز', price: null }], total: 0 },
    ]);
  });

  test('adds up each shop and keeps the pennies right', () => {
    const cents = [offer('بنده', 'أرز بسمتي', 29.95), offer('بنده', 'حليب', 9.5), offer('بنده', 'بيض', 16.1)];

    const groups = groupByStore(['رز', 'حليب', 'بيض'], cents, '2026-11-15');

    expect(groups[0].total).toBe(55.55);
  });

  test('leaves an item with only an ended offer to be bought anywhere', () => {
    expect(groupByStore(['سكر'], offers, '2026-11-15')).toEqual([{ store: null, lines: [{ name: 'سكر', price: null }], total: 0 }]);
  });

  test('gives nothing for an empty list', () => {
    expect(groupByStore([], offers, '2026-11-15')).toEqual([]);
  });
});

describe('the grand total', () => {
  test('is every shop together, and counts nothing for items with no offer', () => {
    const groups = groupByStore(['رز', 'زيت', 'خبز'], offers, '2026-11-15');

    expect(basketTotal(groups)).toBe(49);
    expect(basketCoverage(groups)).toEqual({ covered: 2, uncovered: 1 });
  });

  test('is zero when no item has an offer', () => {
    expect(basketTotal(groupByStore(['خبز'], offers, '2026-11-15'))).toBe(0);
    expect(basketTotal([])).toBe(0);
  });
});

describe('listMessage', () => {
  test('writes one block per shop with its total, offer prices where there are any, and the grand total', () => {
    const message = listMessage(groupByStore(['رز', 'خبز'], offers, '2026-11-15'));

    expect(message).toBe('قائمة مشتريات بيتنا\n\nمن بنده (المجموع 30 ريال)\n- رز (عرض 30 ريال)\n\nمن أي متجر\n- خبز\n\nالإجمالي بالعروض: 30 ريال');
  });

  test('leaves the grand total out when nothing has an offer', () => {
    expect(listMessage(groupByStore(['خبز'], offers, '2026-11-15'))).toBe('قائمة مشتريات بيتنا\n\nمن أي متجر\n- خبز');
  });
});
