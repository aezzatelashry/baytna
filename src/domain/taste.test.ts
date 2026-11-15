import { describe, expect, test } from 'vitest';

import { generateWeekPlan } from './meals';
import { nextSweet, pickWeekSweet, rankByTaste, rate } from './taste';
import type { Meal } from './types';

function meal(id: string): Meal {
  return { id, name: id, slots: ['lunch'], protein: 'none', tags: [], ingredients: [] };
}

describe('rating a meal', () => {
  test('records what the family thought of a meal', () => {
    expect(rate({}, 'kabsa', 'liked')).toEqual({ kabsa: 'liked' });
  });

  test('changes the verdict when the family thinks again', () => {
    expect(rate({ kabsa: 'liked' }, 'kabsa', 'disliked')).toEqual({ kabsa: 'disliked' });
  });

  test('takes the verdict back when the same one is pressed twice', () => {
    expect(rate({ kabsa: 'liked', koshari: 'disliked' }, 'kabsa', 'liked')).toEqual({ koshari: 'disliked' });
  });
});

describe('ranking by taste', () => {
  const meals = [meal('plain'), meal('bad'), meal('good'), meal('star')];

  test('puts favourites first, then liked meals, and disliked meals last', () => {
    const ranked = rankByTaste(meals, new Set(['star']), { good: 'liked', bad: 'disliked' });

    expect(ranked.map((each) => each.id)).toEqual(['star', 'good', 'plain', 'bad']);
  });

  test('a disliked meal comes up in the plan only after the others', () => {
    const plan = generateWeekPlan(meals, ['2026-11-14', '2026-11-15', '2026-11-16'], 0, {
      ratings: { plain: 'disliked' },
    });

    expect(plan.map((slot) => slot.mealId)).toEqual(['bad', 'good', 'star']);
  });
});

describe('sweet of the week', () => {
  const ids = ['rice', 'cake', 'salad'];

  test('rotates through the sweets as plans are made', () => {
    expect(pickWeekSweet(ids, 0)).toBe('rice');
    expect(pickWeekSweet(ids, 4)).toBe('cake');
    expect(pickWeekSweet([], 2)).toBeNull();
  });

  test('moves to the next sweet and wraps around', () => {
    expect(nextSweet(ids, 'cake')).toBe('salad');
    expect(nextSweet(ids, 'salad')).toBe('rice');
    expect(nextSweet(ids, null)).toBe('rice');
  });
});
