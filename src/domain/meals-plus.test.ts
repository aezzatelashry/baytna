import { describe, expect, test } from 'vitest';

import { estimateMealCost, generateWeekPlan } from './meals';
import type { Meal } from './types';
import { youtubeThumbnailUrl, youtubeVideoId, youtubeWatchUrl } from './youtube';

function meal(overrides: Partial<Meal>): Meal {
  return { id: 'm', name: 'وجبة', slots: ['lunch'], protein: 'none', tags: [], ingredients: [], ...overrides };
}

describe('generateWeekPlan with locks and favourites', () => {
  const meals: Meal[] = [meal({ id: 'a' }), meal({ id: 'b' }), meal({ id: 'c' })];
  const days = ['2026-11-14', '2026-11-15'];

  test('keeps a locked meal in its place and plans around it', () => {
    const locked = [{ date: '2026-11-15', slot: 'lunch' as const, mealId: 'c' }];

    const plan = generateWeekPlan(meals, days, 0, { locked });

    expect(plan.find((slot) => slot.date === '2026-11-15')?.mealId).toBe('c');
    expect(plan).toHaveLength(2);
  });

  test('keeps the lock when the offset changes for a new plan', () => {
    const locked = [{ date: '2026-11-14', slot: 'lunch' as const, mealId: 'b' }];

    const first = generateWeekPlan(meals, days, 0, { locked });
    const second = generateWeekPlan(meals, days, 1, { locked });

    expect(first[0].mealId).toBe('b');
    expect(second[0].mealId).toBe('b');
  });

  test('serves a favourite before the other meals', () => {
    const plan = generateWeekPlan(meals, ['2026-11-14'], 0, { favorites: new Set(['c']) });

    expect(plan[0].mealId).toBe('c');
  });
});

describe('estimateMealCost', () => {
  const kabsa = meal({
    ingredients: [
      { name: 'أرز', qty: 1, unit: 'كجم', category: 'pantry' },
      { name: 'دجاج', qty: 1, unit: 'حبة', category: 'protein' },
      { name: 'بصل', qty: 500, unit: 'جم', category: 'produce' },
    ],
  });

  test('adds the last paid prices and counts ingredients with no price', () => {
    const book = { أرز: { price: 26, date: '2026-11-10' }, دجاج: { price: 36.5, date: '2026-11-12' } };

    expect(estimateMealCost(kabsa, book)).toEqual({ known: 62.5, unknownCount: 1 });
  });

  test('reports nothing known for an empty price book', () => {
    expect(estimateMealCost(kabsa, {})).toEqual({ known: 0, unknownCount: 3 });
  });
});

describe('youtube links', () => {
  test('reads the id from the common link shapes', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId(' https://youtu.be/dQw4w9WgXcQ?si=abc ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('rejects other sites, look-alike hosts, plain http and malformed ids', () => {
    expect(youtubeVideoId('https://vimeo.com/123')).toBeNull();
    expect(youtubeVideoId('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeVideoId('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(youtubeVideoId('كبسة')).toBeNull();
  });

  test('builds the watch and thumbnail addresses from the id alone', () => {
    expect(youtubeWatchUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(youtubeThumbnailUrl('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});
