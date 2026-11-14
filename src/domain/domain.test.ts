import { describe, expect, test } from 'vitest';

import { formatSar, lookupPrice, parsePrice, recordPrice, spendByCategory, summarizeBudget } from './budget';
import { generateWeekPlan, membersExcludedFrom, missingIngredients } from './meals';
import type { ListItem, Meal, Member } from './types';
import { dayName, weekDays, weekStartOf } from './week';

function item(overrides: Partial<ListItem>): ListItem {
  return {
    id: 'i',
    updatedAt: '2026-11-14T00:00:00.000Z',
    deleted: false,
    weekStart: '2026-11-14',
    name: 'أرز',
    qty: 1,
    unit: 'كجم',
    category: 'pantry',
    estPrice: null,
    paidPrice: null,
    bought: false,
    mealId: null,
    addedBy: 'أحمد',
    ...overrides,
  };
}

function meal(overrides: Partial<Meal>): Meal {
  return { id: 'm', name: 'وجبة', slots: ['lunch'], protein: 'none', tags: [], ingredients: [], ...overrides };
}

describe('summarizeBudget', () => {
  test('counts paid price as spent and estimates as planned', () => {
    const summary = summarizeBudget(
      [
        item({ id: 'a', bought: true, estPrice: 20, paidPrice: 25 }),
        item({ id: 'b', estPrice: 40 }),
        item({ id: 'c' }),
      ],
      500,
    );

    expect(summary.spent).toBe(25);
    expect(summary.planned).toBe(40);
    expect(summary.remaining).toBe(475);
    expect(summary.projected).toBe(435);
    expect(summary.unpricedCount).toBe(1);
    expect(summary.status).toBe('ok');
  });

  test('falls back to the estimate when a bought item has no paid price', () => {
    const summary = summarizeBudget([item({ bought: true, estPrice: 30 })], 500);

    expect(summary.spent).toBe(30);
  });

  test('ignores deleted items', () => {
    const summary = summarizeBudget([item({ estPrice: 100, deleted: true })], 500);

    expect(summary.planned).toBe(0);
  });

  test('is tight when less than a tenth of the budget is left after the list', () => {
    const summary = summarizeBudget([item({ estPrice: 460 })], 500);

    expect(summary.status).toBe('tight');
  });

  test('is over when the list costs more than what is left', () => {
    const summary = summarizeBudget(
      [item({ id: 'a', bought: true, paidPrice: 300 }), item({ id: 'b', estPrice: 250 })],
      500,
    );

    expect(summary.projected).toBe(-50);
    expect(summary.status).toBe('over');
  });
});

describe('spendByCategory', () => {
  test('totals paid and planned money per category, biggest first, with shares', () => {
    const shares = spendByCategory([
      item({ id: 'a', category: 'protein', bought: true, estPrice: 30, paidPrice: 60 }),
      item({ id: 'b', category: 'produce', estPrice: 15 }),
      item({ id: 'c', category: 'produce', estPrice: 5 }),
      item({ id: 'd', category: 'dairy' }),
      item({ id: 'e', category: 'pantry', estPrice: 99, deleted: true }),
    ]);

    expect(shares.map((entry) => entry.category)).toEqual(['protein', 'produce']);
    expect(shares[0].amount).toBe(60);
    expect(shares[0].share).toBe(0.75);
    expect(shares[1].amount).toBe(20);
  });

  test('returns nothing when no item has a price', () => {
    expect(spendByCategory([item({})])).toEqual([]);
  });
});

describe('prices', () => {
  test('parses Arabic digits and decimal separators', () => {
    expect(parsePrice('١٢٫٥')).toBe(12.5);
    expect(parsePrice(' 7,25 ')).toBe(7.25);
  });

  test('rejects empty, negative and non-numeric input', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('-3')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
  });

  test('remembers the last paid price regardless of spacing and case', () => {
    const book = recordPrice({}, '  زيت  عباد الشمس ', 32, '2026-11-14');

    expect(lookupPrice(book, 'زيت عباد الشمس')).toBe(32);
    expect(lookupPrice(book, 'سكر')).toBeNull();
  });

  test('formats whole amounts without decimals', () => {
    expect(formatSar(500)).toBe('500');
    expect(formatSar(12.5)).toBe('12.50');
  });
});

describe('meals', () => {
  const father: Member = { id: 'f', name: 'أحمد', excludes: ['legumes'] };
  const child: Member = { id: 'c', name: 'طفل', excludes: [] };

  test('flags only the members whose exclusions clash with the meal', () => {
    const foul = meal({ tags: ['legumes'] });

    expect(membersExcludedFrom(foul, [father, child])).toEqual([father]);
    expect(membersExcludedFrom(meal({}), [father, child])).toEqual([]);
  });

  test('lists only ingredients that are not already on the list', () => {
    const kabsa = meal({
      ingredients: [
        { name: 'أرز', qty: 1, unit: 'كجم', category: 'pantry' },
        { name: 'دجاج', qty: 1, unit: 'حبة', category: 'protein' },
      ],
    });

    const missing = missingIngredients(kabsa, [item({ name: ' أرز ' })]);

    expect(missing.map((ingredient) => ingredient.name)).toEqual(['دجاج']);
  });

  test('plans three meals a day with one meat, one fish and two chicken lunches', () => {
    const meals: Meal[] = [
      meal({ id: 'b1', slots: ['breakfast'] }),
      meal({ id: 'd1', slots: ['dinner'] }),
      meal({ id: 'meat', protein: 'meat' }),
      meal({ id: 'fish', protein: 'fish' }),
      meal({ id: 'chicken', protein: 'chicken' }),
      meal({ id: 'eggs', protein: 'eggs' }),
      meal({ id: 'veg', protein: 'none' }),
    ];
    const days = weekDays('2026-11-14');

    const plan = generateWeekPlan(meals, days);
    const lunches = plan.filter((slot) => slot.slot === 'lunch').map((slot) => slot.mealId);

    expect(plan).toHaveLength(21);
    expect(lunches.filter((id) => id === 'meat')).toHaveLength(1);
    expect(lunches.filter((id) => id === 'fish')).toHaveLength(1);
    expect(lunches.filter((id) => id === 'chicken')).toHaveLength(2);
  });

  test('does not serve the same meal twice in one day when another fits', () => {
    const meals: Meal[] = [
      meal({ id: 'both', slots: ['breakfast', 'dinner'] }),
      meal({ id: 'soup', slots: ['dinner'] }),
    ];

    const plan = generateWeekPlan(meals, ['2026-11-14']);

    expect(plan.map((slot) => slot.mealId)).toEqual(['both', 'soup']);
  });

  test('skips a slot that has no meals at all', () => {
    const plan = generateWeekPlan([meal({ slots: ['lunch'] })], ['2026-11-14']);

    expect(plan.map((slot) => slot.slot)).toEqual(['lunch']);
  });
});

describe('week', () => {
  test('finds the Saturday that starts the week', () => {
    expect(weekStartOf(new Date(2026, 10, 18), 6)).toBe('2026-11-14');
    expect(weekStartOf(new Date(2026, 10, 14), 6)).toBe('2026-11-14');
  });

  test('lists seven consecutive days across a month boundary', () => {
    const days = weekDays('2026-11-28');

    expect(days).toHaveLength(7);
    expect(days[6]).toBe('2026-12-04');
    expect(dayName(days[0])).toBe('السبت');
  });
});
