import { describe, expect, test } from 'vitest';

import { groupByStore, listMessage } from './share-list';
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
      { store: 'بنده', lines: [{ name: 'رز', price: 30 }] },
      { store: 'لولو', lines: [{ name: 'زيت', price: 19 }] },
      { store: null, lines: [{ name: 'خبز', price: null }] },
    ]);
  });

  test('leaves an item with only an ended offer to be bought anywhere', () => {
    expect(groupByStore(['سكر'], offers, '2026-11-15')).toEqual([{ store: null, lines: [{ name: 'سكر', price: null }] }]);
  });

  test('gives nothing for an empty list', () => {
    expect(groupByStore([], offers, '2026-11-15')).toEqual([]);
  });
});

describe('listMessage', () => {
  test('writes one block per shop, with offer prices where there are any', () => {
    const message = listMessage(groupByStore(['رز', 'خبز'], offers, '2026-11-15'));

    expect(message).toBe('قائمة مشتريات بيتنا\n\nمن بنده\n- رز (عرض 30 ريال)\n\nمن أي متجر\n- خبز');
  });
});
