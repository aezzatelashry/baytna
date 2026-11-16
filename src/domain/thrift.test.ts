import { describe, expect, test } from 'vitest';

import { WORK_MEALS } from '../data/work-meals';
import { DEFAULT_RHYTHM, generateWeekPlan, styleSequence } from './meals';
import { costPerPerson, monthReport, sharedIngredients, weekReport, type WasteEntry } from './thrift';
import type { ListItem, Meal, Member } from './types';
import { homeBoxId, homeLunchForBox, homeMealIdOf, prepList } from './workbox';

function meal(overrides: Partial<Meal>): Meal {
  return { id: 'm', name: 'وجبة', slots: ['lunch'], protein: 'none', tags: [], ingredients: [], ...overrides };
}

function ing(name: string) {
  return { name, qty: 1, unit: '', category: 'produce' as const };
}

function item(overrides: Partial<ListItem>): ListItem {
  return {
    id: 'i',
    updatedAt: '2026-11-14T00:00:00.000Z',
    deleted: false,
    weekStart: '2026-11-14',
    name: 'أرز',
    qty: 1,
    unit: '',
    category: 'pantry',
    estPrice: null,
    paidPrice: null,
    bought: false,
    mealId: null,
    addedBy: '',
    ...overrides,
  };
}

describe('week rhythm', () => {
  test('lays out four light, two home and one treat without bunching a style', () => {
    const sequence = styleSequence(DEFAULT_RHYTHM, 7);

    expect(sequence.filter((style) => style === 'light')).toHaveLength(4);
    expect(sequence.filter((style) => style === 'home')).toHaveLength(2);
    expect(sequence.filter((style) => style === 'treat')).toHaveLength(1);
    sequence.slice(1).forEach((style, index) => {
      if (style !== 'light') expect(style).not.toBe(sequence[index]);
    });
  });

  test('stops when the rhythm has fewer meals than days', () => {
    expect(styleSequence({ light: 1, home: 1, treat: 0 }, 7)).toHaveLength(2);
  });

  test('picks the lunch of the wanted style when the protein allows it', () => {
    const meals = [meal({ id: 'heavy', style: 'treat' }), meal({ id: 'grilled', style: 'light' })];

    const plan = generateWeekPlan(meals, ['2026-11-15'], 0, { styles: ['light'] });

    expect(plan[0].mealId).toBe('grilled');
  });

  test('keeps the protein rule when no meal of that style exists', () => {
    const meals = [meal({ id: 'only', style: 'home' })];

    expect(generateWeekPlan(meals, ['2026-11-15'], 0, { styles: ['light'] })[0].mealId).toBe('only');
  });
});

describe('box from home', () => {
  const ahmed: Member = { id: 'a', name: 'أحمد', excludes: [], avoids: ['بصل'] };

  test('offers yesterday’s lunch when it keeps well and has nothing avoided at work', () => {
    const potato = meal({ id: 'tray', boxable: true, ingredients: [ing('دجاج'), ing('بطاطس')] });

    expect(homeLunchForBox(potato, ahmed)?.id).toBe('tray');
  });

  test('does not offer a lunch with onion for the work box, though it was fine at home', () => {
    const kabsa = meal({ id: 'kabsa', boxable: true, ingredients: [ing('دجاج'), ing('بصل')] });

    expect(homeLunchForBox(kabsa, ahmed)).toBeNull();
    expect(homeLunchForBox(kabsa, undefined)?.id).toBe('kabsa');
  });

  test('does not offer a lunch that does not keep, or a day with no lunch', () => {
    expect(homeLunchForBox(meal({ boxable: false }), ahmed)).toBeNull();
    expect(homeLunchForBox(undefined, ahmed)).toBeNull();
  });

  test('marks a home lunch in a work slot and reads it back', () => {
    expect(homeMealIdOf(homeBoxId('ln-kofta'))).toBe('ln-kofta');
    expect(homeMealIdOf('wk-tuna-lemon')).toBeNull();
  });
});

describe('prepList', () => {
  test('lists what to cook ahead, the biggest job first', () => {
    const week = {
      '2026-11-15': { breakfast: 'wk-chicken-yogurt', lunch: 'wk-bulgur-chicken', snack: 'wk-veg-sticks-egg' },
      '2026-11-16': { breakfast: 'wk-oats-yogurt', lunch: 'wk-chicken-salad-potato' },
    };

    const tasks = prepList(week, WORK_MEALS);

    expect(tasks[0]).toEqual({ task: 'اغسل وقطّع الخيار والجزر', servings: 4 });
    expect(tasks).toContainEqual({ task: 'اشوي أو اسلق صدور الدجاج وفتّتها', servings: 3 });
    expect(tasks.map((entry) => entry.task)).toContain('انقع الشوفان الليلة اللي قبلها');
    expect(tasks.map((entry) => entry.task)).toContain('اسلق البيض');
  });

  test('is empty for an empty week', () => {
    expect(prepList({}, WORK_MEALS)).toEqual([]);
  });
});

describe('sharedIngredients', () => {
  test('finds what two or more meals need, ignoring spacing', () => {
    const shared = sharedIngredients([
      meal({ name: 'كبسة', ingredients: [ing('أرز'), ing('طماطم')] }),
      meal({ name: 'ملوخية', ingredients: [ing(' أرز '), ing('ملوخية')] }),
      meal({ name: 'شكشوكة', ingredients: [ing('طماطم'), ing('بيض')] }),
    ]);

    expect(shared.map((entry) => entry.name)).toEqual(['أرز', 'طماطم']);
    expect(shared[0].meals).toEqual(['كبسة', 'ملوخية']);
  });

  test('does not count an ingredient twice for the same meal', () => {
    expect(sharedIngredients([meal({ name: 'كبسة', ingredients: [ing('أرز'), ing('أرز')] })])).toEqual([]);
  });
});

describe('weekReport', () => {
  const waste: WasteEntry[] = [{ id: 'w', date: '2026-11-13', name: 'خيار', price: 6 }];

  test('compares paid money with last week and totals the waste', () => {
    const report = weekReport(
      [item({ id: 'a', bought: true, paidPrice: 100, category: 'protein' }), item({ id: 'b', estPrice: 50 })],
      [item({ id: 'c', bought: true, paidPrice: 140, category: 'protein' })],
      waste,
    );

    expect(report.spent).toBe(100);
    expect(report.lastSpent).toBe(140);
    expect(report.saved).toBe(40);
    expect(report.wasted).toBe(6);
    expect(report.changes[0]).toEqual({ category: 'protein', thisWeek: 100, lastWeek: 140 });
  });

  test('has nothing to compare when last week is empty', () => {
    expect(weekReport([item({ bought: true, paidPrice: 20 })], [], []).saved).toBeNull();
  });

  test('reports a week that cost more as a negative saving', () => {
    const report = weekReport([item({ bought: true, paidPrice: 90 })], [item({ bought: true, paidPrice: 70 })], []);

    expect(report.saved).toBe(-20);
  });
});

describe('month report', () => {
  const since = '2026-10-24';

  test('adds up what was paid, the budget for the weeks shopped, and what came in under the expected price', () => {
    const items = [
      item({ id: 'a', weekStart: '2026-11-07', bought: true, estPrice: 40, paidPrice: 30 }),
      item({ id: 'b', weekStart: '2026-11-14', bought: true, estPrice: 20, paidPrice: 25 }),
      item({ id: 'c', weekStart: '2026-11-14', bought: true, estPrice: null, paidPrice: 15 }),
    ];

    const report = monthReport(items, [], 500, since);

    expect(report).toMatchObject({ weeks: 2, spent: 70, budgeted: 1000, underBudget: 930, belowUsual: 10, belowUsualCount: 1 });
  });

  test('leaves out what is older than the period, not bought, or deleted', () => {
    const items = [
      item({ id: 'old', weekStart: '2026-10-17', bought: true, paidPrice: 99 }),
      item({ id: 'waiting', weekStart: '2026-11-14', bought: false, estPrice: 50 }),
      item({ id: 'gone', weekStart: '2026-11-14', bought: true, paidPrice: 50, deleted: true }),
    ];

    expect(monthReport(items, [], 500, since)).toMatchObject({ weeks: 0, spent: 0, budgeted: 0, belowUsual: 0 });
  });

  test('counts only the waste inside the period', () => {
    const waste: WasteEntry[] = [
      { id: '1', date: '2026-10-01', name: 'خس', price: 5 },
      { id: '2', date: '2026-11-10', name: 'لبن', price: 8 },
    ];

    expect(monthReport([], waste, 500, since)).toMatchObject({ wasted: 8, wastedCount: 1 });
  });
});

describe('costPerPerson', () => {
  test('splits the known cost between the people eating', () => {
    expect(costPerPerson(62.5, 6)).toBe(10.42);
    expect(costPerPerson(62.5, 0)).toBeNull();
  });
});
