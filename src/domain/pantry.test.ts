import { describe, expect, test } from 'vitest';

import {
  daysLeft,
  isRunningLow,
  restock,
  runningLow,
  stapleCategory,
  summarizePantry,
  weeklyShare,
  type Staple,
} from './pantry';

describe('running low', () => {
  test('lists the staples about to run out, the soonest first', () => {
    const low = runningLow(
      [
        staple({ id: 'far', boughtOn: '2026-11-01', lifeDays: 60 }),
        staple({ id: 'soon', boughtOn: '2026-11-01', lifeDays: 18 }),
        staple({ id: 'gone', boughtOn: '2026-10-01', lifeDays: 30 }),
        staple({ id: 'unknown', lifeDays: null }),
      ],
      '2026-11-15',
    );

    expect(low.map((each) => each.id)).toEqual(['gone', 'soon']);
  });

  test('puts cleaning things under household and the rest under groceries', () => {
    expect(stapleCategory('cleaning')).toBe('household');
    expect(stapleCategory('grains')).toBe('pantry');
  });
});

function staple(overrides: Partial<Staple>): Staple {
  return { id: 's', name: 'رز', kind: 'grains', price: 60, boughtOn: '2026-10-01', lifeDays: null, ...overrides };
}

describe('pantry', () => {
  test('spreads a sack that lasts six weeks over six weeks', () => {
    expect(weeklyShare(staple({ price: 60, lifeDays: 42 }))).toBe(10);
  });

  test('cannot spread a staple whose life is not known yet', () => {
    expect(weeklyShare(staple({ lifeDays: null }))).toBeNull();
    expect(weeklyShare(staple({ lifeDays: 0 }))).toBeNull();
  });

  test('measures the life of a pack from the gap between two purchases', () => {
    const again = restock(staple({ boughtOn: '2026-10-01' }), 64, '2026-11-12');

    expect(again.lifeDays).toBe(42);
    expect(again.price).toBe(64);
    expect(again.boughtOn).toBe('2026-11-12');
  });

  test('keeps the earlier guess when a pack is bought again on the same day', () => {
    const again = restock(staple({ boughtOn: '2026-11-12', lifeDays: 30 }), 60, '2026-11-12');

    expect(again.lifeDays).toBe(30);
  });

  test('counts the days left and warns a week ahead', () => {
    const oil = staple({ boughtOn: '2026-11-01', lifeDays: 20 });

    expect(daysLeft(oil, '2026-11-14')).toBe(7);
    expect(isRunningLow(oil, '2026-11-14')).toBe(true);
    expect(isRunningLow(oil, '2026-11-10')).toBe(false);
    expect(isRunningLow(staple({ lifeDays: null }), '2026-11-14')).toBe(false);
  });

  test('adds up the weekly cost and counts what cannot be spread yet', () => {
    const summary = summarizePantry([
      staple({ id: 'a', price: 60, lifeDays: 42 }),
      staple({ id: 'b', price: 30, lifeDays: 30 }),
      staple({ id: 'c', lifeDays: null }),
    ]);

    expect(summary).toEqual({ weekly: 17, unknownCount: 1 });
  });
});
