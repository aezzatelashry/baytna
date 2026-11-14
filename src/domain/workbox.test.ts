import { describe, expect, test } from 'vitest';

import { WORK_MEALS } from '../data/work-meals';
import { avoidedIngredients, clashesWith, ingredientMatches, membersExcludedFrom } from './meals';
import type { Member } from './types';
import {
  generateWorkWeek,
  safeWorkMeals,
  suspectIngredients,
  workShoppingList,
  type ComfortEntry,
  type WorkMeal,
} from './workbox';

const ahmed: Member = {
  id: 'a',
  name: 'أحمد',
  excludes: ['legumes'],
  avoids: ['بصل', 'ثوم', 'فلفل رومي', 'كرنب', 'قرنبيط', 'بروكلي', 'حليب'],
};
const other: Member = { id: 'o', name: 'فرد', excludes: [] };

function dish(names: string[], tags: WorkMeal['tags'] = []): Pick<WorkMeal, 'tags' | 'ingredients'> {
  return { tags, ingredients: names.map((name) => ({ name, qty: 1, unit: '', category: 'produce' as const })) };
}

describe('ingredient avoidance', () => {
  test('matches whole words only, so milk does not catch labneh', () => {
    expect(ingredientMatches('لبن', 'لبن')).toBe(true);
    expect(ingredientMatches('لبنة', 'لبن')).toBe(false);
    expect(ingredientMatches('حليب كامل الدسم', 'حليب')).toBe(true);
  });

  test('matches a two-word ingredient in order and ignores spacing', () => {
    expect(ingredientMatches(' فلفل  رومي أحمر ', 'فلفل رومي')).toBe(true);
    expect(ingredientMatches('فلفل أسود', 'فلفل رومي')).toBe(false);
    expect(ingredientMatches('بصل أخضر', 'بصل')).toBe(true);
  });

  test('never matches an empty avoid word', () => {
    expect(ingredientMatches('بصل', '  ')).toBe(false);
  });

  const kabsa = dish(['دجاج', 'أرز', 'بصل', 'طماطم']);

  test('keeps an avoided ingredient out of work food but allows it at home', () => {
    expect(avoidedIngredients(kabsa, ahmed)).toEqual(['بصل']);
    expect(clashesWith(kabsa, ahmed, 'work')).toBe(true);
    expect(clashesWith(kabsa, ahmed, 'home')).toBe(false);
    expect(membersExcludedFrom(kabsa, [ahmed, other])).toEqual([]);
  });

  test('applies avoided ingredients at home too for a person who asked for that', () => {
    const strict: Member = { ...ahmed, avoidsAtHome: true };

    expect(membersExcludedFrom(kabsa, [strict, other])).toEqual([strict]);
  });

  test('applies a diet tag everywhere, at home and at work', () => {
    const foul = dish(['خبز'], ['legumes']);

    expect(clashesWith(foul, ahmed, 'home')).toBe(true);
    expect(clashesWith(foul, ahmed, 'work')).toBe(true);
    expect(clashesWith(dish(['خبز', 'لبنة']), ahmed, 'work')).toBe(false);
  });
});

describe('safeWorkMeals', () => {
  test('offers Ahmed nothing with legumes, onion, bell pepper or milk, and nothing that needs heat', () => {
    const safe = safeWorkMeals(WORK_MEALS, ahmed, false).map((meal) => meal.id);

    expect(safe).not.toContain('wk-foul');
    expect(safe).not.toContain('wk-tuna-onion-pepper');
    expect(safe).not.toContain('wk-oats-milk');
    expect(safe).not.toContain('wk-rice-chicken-hot');
    expect(safe).toContain('wk-labneh-zaatar');
    expect(safe).toContain('wk-oats-yogurt');
  });

  test('brings the warm boxes back once there is a microwave', () => {
    expect(safeWorkMeals(WORK_MEALS, ahmed, true).map((meal) => meal.id)).toContain('wk-rice-chicken-hot');
  });

  test('offers everything cold when nobody is chosen as the eater', () => {
    expect(safeWorkMeals(WORK_MEALS, undefined, false).map((meal) => meal.id)).toContain('wk-foul');
  });

  test('leaves Ahmed enough choice for every slot', () => {
    const safe = safeWorkMeals(WORK_MEALS, ahmed, false);

    expect(safe.filter((meal) => meal.slots.includes('breakfast')).length).toBeGreaterThanOrEqual(5);
    expect(safe.filter((meal) => meal.slots.includes('lunch')).length).toBeGreaterThanOrEqual(5);
    expect(safe.filter((meal) => meal.slots.includes('snack')).length).toBeGreaterThanOrEqual(3);
  });
});

describe('generateWorkWeek', () => {
  const days = ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'];
  const safe = safeWorkMeals(WORK_MEALS, ahmed, false);

  test('packs three things a day and never the same thing twice in one day', () => {
    const week = generateWorkWeek(safe, days);

    for (const date of days) {
      const packed = Object.values(week[date]);
      expect(packed).toHaveLength(3);
      expect(new Set(packed).size).toBe(3);
    }
  });

  test('does not repeat a slot on two days in a row', () => {
    const week = generateWorkWeek(safe, days);

    days.slice(1).forEach((date, index) => {
      expect(week[date].lunch).not.toBe(week[days[index]].lunch);
      expect(week[date].breakfast).not.toBe(week[days[index]].breakfast);
    });
  });

  test('gives a different week when asked again', () => {
    const first = generateWorkWeek(safe, days, 0);
    const second = generateWorkWeek(safe, days, 1);

    // Single slots can coincide; the week as a whole and its first breakfast must change.
    expect(second).not.toEqual(first);
    expect(second[days[0]].breakfast).not.toBe(first[days[0]].breakfast);
  });

  test('leaves a slot empty when nothing is safe for it', () => {
    const onlySnacks = safe.filter((meal) => meal.kind === 'snack');

    expect(Object.keys(generateWorkWeek(onlySnacks, [days[0]])[days[0]])).toEqual(['snack']);
  });
});

describe('workShoppingList', () => {
  test('lists each ingredient once and adds up the servings', () => {
    const week = { '2026-11-15': { breakfast: 'wk-labneh-zaatar' }, '2026-11-16': { breakfast: 'wk-labneh-zaatar' } };

    const list = workShoppingList(week, WORK_MEALS);

    expect(list.find((ingredient) => ingredient.name === 'لبنة')?.qty).toBe(160);
    expect(list.filter((ingredient) => ingredient.name === 'خبز')).toHaveLength(1);
  });
});

describe('suspectIngredients', () => {
  const entry = (mealId: string, comfort: ComfortEntry['comfort']): ComfortEntry => ({ date: '2026-11-15', mealId, comfort });

  test('points at an ingredient after three bloating reports', () => {
    const log = [entry('wk-halloumi', 'bloated'), entry('wk-halloumi', 'bloated'), entry('wk-halloumi', 'bloated')];

    expect(suspectIngredients(log, WORK_MEALS)).toContain('جبنة حلوم');
  });

  test('does not point at anything after only two reports', () => {
    const log = [entry('wk-halloumi', 'bloated'), entry('wk-halloumi', 'bloated')];

    expect(suspectIngredients(log, WORK_MEALS)).toEqual([]);
  });

  test('clears an ingredient that was fine more often than it bloated', () => {
    const log = [
      entry('wk-halloumi', 'bloated'),
      entry('wk-halloumi', 'bloated'),
      entry('wk-halloumi', 'bloated'),
      entry('wk-tuna-lemon', 'fine'),
      entry('wk-tuna-lemon', 'fine'),
      entry('wk-tuna-lemon', 'fine'),
      entry('wk-tuna-lemon', 'fine'),
    ];

    const suspects = suspectIngredients(log, WORK_MEALS);

    expect(suspects).toContain('جبنة حلوم');
    expect(suspects).not.toContain('خيار');
  });
});
