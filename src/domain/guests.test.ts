import { describe, expect, test } from 'vitest';

import { guestFactor, guestsThisWeek, scaleForGuests } from './guests';
import type { Ingredient } from './types';

const rice: Ingredient = { name: 'رز', qty: 1, unit: 'كيلو', category: 'pantry' };

describe('guests', () => {
  test('counts guests only in the week they were set for', () => {
    const guests = { weekStart: '2026-11-14', count: 4 };

    expect(guestsThisWeek(guests, '2026-11-14')).toBe(4);
    expect(guestsThisWeek(guests, '2026-11-21')).toBe(0);
    expect(guestsThisWeek(null, '2026-11-14')).toBe(0);
  });

  test('grows the quantities by the extra mouths', () => {
    expect(guestFactor(6, 3)).toBe(1.5);
    expect(guestFactor(6, 0)).toBe(1);
  });

  test('scales nothing while no family members are recorded', () => {
    expect(guestFactor(0, 2)).toBe(1);
  });

  test('rounds a scaled quantity up to the next half', () => {
    expect(scaleForGuests([rice], 1.5)[0].qty).toBe(1.5);
    expect(scaleForGuests([{ ...rice, qty: 2 }], 1.3)[0].qty).toBe(3);
  });

  test('returns the same list when nobody is coming', () => {
    const list = [rice];

    expect(scaleForGuests(list, 1)).toBe(list);
  });
});
