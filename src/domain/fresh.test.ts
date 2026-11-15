import { describe, expect, test } from 'vitest';

import {
  defaultShelfDays,
  expiringSoon,
  freshDaysLeft,
  freshFromPurchase,
  mealsUsing,
  withoutPurchase,
  withPurchase,
  withShelfDays,
  type FreshItem,
} from './fresh';
import type { Meal } from './types';

const item = (name: string, boughtOn: string, shelfDays: number): FreshItem => ({
  id: name,
  name,
  category: 'produce',
  boughtOn,
  shelfDays,
});

const meal = (id: string, ingredient: string): Meal => ({
  id,
  name: id,
  slots: ['lunch'],
  protein: 'none',
  tags: [],
  ingredients: [{ name: ingredient, qty: 1, unit: '', category: 'produce' }],
});

describe('fresh shelf', () => {
  test('gives no shelf life to things that keep for weeks', () => {
    expect(defaultShelfDays('pantry')).toBeNull();
    expect(defaultShelfDays('household')).toBeNull();
    expect(defaultShelfDays('dairy')).toBeGreaterThan(0);
  });

  test('makes an entry for a fresh purchase and none for a pantry one', () => {
    const fresh = freshFromPurchase('1', ' طماطم ', 'produce', '2026-11-15');

    expect(fresh).toMatchObject({ name: 'طماطم', boughtOn: '2026-11-15' });
    expect(freshFromPurchase('2', 'رز', 'pantry', '2026-11-15')).toBeNull();
  });

  test('counts the days left from the day it was bought', () => {
    const tomatoes = item('طماطم', '2026-11-10', 5);

    expect(freshDaysLeft(tomatoes, '2026-11-12')).toBe(3);
    expect(freshDaysLeft(tomatoes, '2026-11-15')).toBe(0);
    expect(freshDaysLeft(tomatoes, '2026-11-17')).toBe(-2);
  });

  test('lists only what is inside the warning window, soonest first', () => {
    const shelf = [item('خيار', '2026-11-14', 5), item('لبن', '2026-11-10', 7), item('خس', '2026-11-12', 3)];

    const soon = expiringSoon(shelf, '2026-11-15');

    expect(soon.map((each) => each.name)).toEqual(['خس', 'لبن']);
  });

  test('buying the same thing again replaces the older entry', () => {
    const shelf = [item('طماطم', '2026-11-10', 5)];

    const next = withPurchase(shelf, item('طماطم', '2026-11-15', 5));

    expect(next).toHaveLength(1);
    expect(next[0].boughtOn).toBe('2026-11-15');
  });

  test('undoing a tick removes only what was bought today', () => {
    const shelf = [item('طماطم', '2026-11-15', 5), item('خيار', '2026-11-14', 5)];

    expect(withoutPurchase(shelf, 'طماطم', '2026-11-15').map((each) => each.name)).toEqual(['خيار']);
    expect(withoutPurchase(shelf, 'خيار', '2026-11-15')).toHaveLength(2);
  });

  test('never lets the shelf life drop under one day', () => {
    expect(withShelfDays(item('خس', '2026-11-15', 2), -5).shelfDays).toBe(1);
    expect(withShelfDays(item('خس', '2026-11-15', 2), 2).shelfDays).toBe(4);
  });

  test('finds the meals that would use the item up', () => {
    const meals = [meal('سلطة', 'طماطم'), meal('رز', 'أرز'), meal('شكشوكة', 'طماطم حمرا')];

    expect(mealsUsing('طماطم', meals).map((each) => each.id)).toEqual(['سلطة', 'شكشوكة']);
    expect(mealsUsing('  ', meals)).toEqual([]);
  });

  test('matches whole words, so one food is not mistaken for a longer name', () => {
    const meals = [meal('لبنة وزعتر', 'لبنة'), meal('رز بلبن', 'لبن')];

    expect(mealsUsing('لبن', meals).map((each) => each.id)).toEqual(['رز بلبن']);
  });
});
