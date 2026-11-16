import { describe, expect, test } from 'vitest';

import { parseCustomMeal } from './custom-meals';
import { changesSince, mergeRemote } from './stamped-sync';

const dish = {
  name: ' ملوخية ماما ',
  slots: ['lunch', 'brunch'],
  protein: 'chicken',
  tags: ['spicy', 'made-up'],
  ingredients: [{ name: 'ملوخية', qty: 1, unit: 'كيس', category: 'produce' }, { name: '', category: 'produce' }, 'junk'],
  style: 'home',
  minutes: 45,
  secret: 'ignored',
};

describe('reading a family dish from the other phone', () => {
  test('keeps what a dish is made of and drops what it does not know', () => {
    const meal = parseCustomMeal('custom-1', dish);

    expect(meal).toEqual({
      id: 'custom-1',
      name: 'ملوخية ماما',
      slots: ['lunch'],
      protein: 'chicken',
      tags: ['spicy'],
      ingredients: [{ name: 'ملوخية', qty: 1, unit: 'كيس', category: 'produce' }],
      style: 'home',
      minutes: 45,
    });
  });

  test('refuses a row that is not a dish', () => {
    expect(parseCustomMeal('custom-1', null)).toBeNull();
    expect(parseCustomMeal('custom-1', { ...dish, name: '' })).toBeNull();
    expect(parseCustomMeal('custom-1', { ...dish, slots: ['brunch'] })).toBeNull();
    expect(parseCustomMeal('custom-1', { ...dish, protein: 'tofu' })).toBeNull();
    expect(parseCustomMeal('', dish)).toBeNull();
  });
});

describe('sharing stamped things', () => {
  const EARLY = '2026-11-16T08:00:00.000Z';
  const PUSHED = '2026-11-16T09:00:00.000Z';
  const LATE = '2026-11-16T10:00:00.000Z';

  test('an edit made here after the last push goes up again', () => {
    const changes = changesSince([{ id: 'a' }, { id: 'b' }], { a: LATE, b: EARLY }, PUSHED);

    expect(changes.changed).toEqual([{ id: 'a' }]);
  });

  test('a newer edit from the other phone replaces the local one, an older one does not', () => {
    const local = [{ id: 'a', name: 'mine' }];

    const newer = mergeRemote(local, { a: EARLY }, [{ item: { id: 'a', name: 'theirs' }, deleted: false, stamp: LATE }]);
    const older = mergeRemote(local, { a: LATE }, [{ item: { id: 'a', name: 'theirs' }, deleted: false, stamp: EARLY }]);

    expect(newer.items).toEqual([{ id: 'a', name: 'theirs' }]);
    expect(older.items).toEqual([{ id: 'a', name: 'mine' }]);
  });
});
