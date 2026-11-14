import { normalizeName } from './budget';
import { clashesWith, ingredientMatches } from './meals';
import type { DietTag, Ingredient, Meal, Member } from './types';
import { fromDateKey } from './week';

/** The three times someone eats during a long day out. */
export type WorkSlot = 'breakfast' | 'lunch' | 'snack';

export const WORK_SLOTS: readonly WorkSlot[] = ['breakfast', 'lunch', 'snack'];

export const WORK_SLOT_LABELS: Record<WorkSlot, string> = {
  breakfast: 'فطار الشغل',
  lunch: 'غدا الشغل',
  snack: 'سناك',
};

export type WorkMealKind = 'sandwich' | 'box' | 'jar' | 'snack';

export const WORK_KIND_LABELS: Record<WorkMealKind, string> = {
  sandwich: 'ساندوتش',
  box: 'بوكس',
  jar: 'برطمان',
  snack: 'سناك',
};

/** Something packed for one person. Quantities are for one serving. */
export interface WorkMeal {
  readonly id: string;
  readonly name: string;
  readonly slots: readonly WorkSlot[];
  readonly kind: WorkMealKind;
  /** Only good warm, so it needs a microwave at work. */
  readonly needsHeat: boolean;
  readonly tags: readonly DietTag[];
  readonly ingredients: readonly Ingredient[];
}

export type WorkDay = Partial<Record<WorkSlot, string>>;

/** Date key to that day's packed meals. */
export type WorkWeek = Readonly<Record<string, WorkDay>>;

/** Sunday to Thursday, the Saudi working week. */
const WORK_WEEKDAYS = [0, 1, 2, 3, 4];

/** The working days among a week's date keys. */
export function workDaysOf(days: readonly string[]): string[] {
  return days.filter((date) => WORK_WEEKDAYS.includes(fromDateKey(date).getDay()));
}

/** Where the packed food's cost is counted. */
export type WorkBudgetMode = 'inside' | 'separate';

export const WORK_BUDGET_LABELS: Record<WorkBudgetMode, string> = {
  inside: 'بند جوه ميزانية الأسبوع',
  separate: 'ميزانية لوحدها',
};

export const WORK_BUDGET_MODES = Object.keys(WORK_BUDGET_LABELS) as WorkBudgetMode[];

/** What the eater can take: nothing they avoid, and nothing that needs heat they do not have. */
export function safeWorkMeals(
  meals: readonly WorkMeal[],
  eater: Member | undefined,
  hasMicrowave: boolean,
): WorkMeal[] {
  return meals.filter(
    (meal) => (hasMicrowave || !meal.needsHeat) && (eater === undefined || !clashesWith(meal, eater, 'work')),
  );
}

/**
 * Packs each work day from the safe meals. Each slot walks its own list, so the same
 * thing never lands on two days in a row while there is another choice.
 */
export function generateWorkWeek(meals: readonly WorkMeal[], days: readonly string[], offset = 0): WorkWeek {
  const week: Record<string, WorkDay> = {};
  const turns = new Map<WorkSlot, number>();
  const lastPicked = new Map<WorkSlot, string>();

  for (const date of days) {
    const packedToday = new Set<string>();
    const day: WorkDay = {};
    for (const slot of WORK_SLOTS) {
      const forSlot = meals.filter((meal) => meal.slots.includes(slot));
      if (forSlot.length === 0) continue;
      // Prefer something not already packed today and not what this slot had yesterday.
      const notToday = forSlot.filter((meal) => !packedToday.has(meal.id));
      const notRepeated = notToday.filter((meal) => meal.id !== lastPicked.get(slot));
      const pool = notRepeated.length > 0 ? notRepeated : notToday.length > 0 ? notToday : forSlot;

      const turn = turns.get(slot) ?? 0;
      turns.set(slot, turn + 1);
      const picked = pool[(turn + offset) % pool.length];
      packedToday.add(picked.id);
      lastPicked.set(slot, picked.id);
      day[slot] = picked.id;
    }
    week[date] = day;
  }
  return week;
}

/** Every ingredient the week's packed meals need, each listed once with its servings added up. */
export function workShoppingList(week: WorkWeek, meals: readonly WorkMeal[]): Ingredient[] {
  const byId = new Map(meals.map((meal) => [meal.id, meal]));
  const totals = new Map<string, Ingredient>();
  for (const day of Object.values(week)) {
    for (const mealId of Object.values(day)) {
      for (const ingredient of byId.get(mealId)?.ingredients ?? []) {
        const key = normalizeName(ingredient.name);
        const existing = totals.get(key);
        totals.set(key, existing ? { ...existing, qty: existing.qty + ingredient.qty } : ingredient);
      }
    }
  }
  return [...totals.values()];
}

/** A work lunch taken from the family's own cooking is stored with this prefix before the meal id. */
const HOME_BOX_PREFIX = 'home:';

export function homeBoxId(mealId: string): string {
  return `${HOME_BOX_PREFIX}${mealId}`;
}

/** The home meal id inside a work slot, or null when the slot holds a packed-meal idea. */
export function homeMealIdOf(workMealId: string): string | null {
  return workMealId.startsWith(HOME_BOX_PREFIX) ? workMealId.slice(HOME_BOX_PREFIX.length) : null;
}

/**
 * Yesterday's home lunch, when it can ride along to work today: it keeps well,
 * and it has nothing the eater avoids in work food. The cheapest box there is.
 */
export function homeLunchForBox(yesterdayLunch: Meal | undefined, eater: Member | undefined): Meal | null {
  if (!yesterdayLunch || yesterdayLunch.boxable !== true) return null;
  if (eater && clashesWith(yesterdayLunch, eater, 'work')) return null;
  return yesterdayLunch;
}

export interface PrepTask {
  readonly task: string;
  /** How many of the week's packed meals this task feeds. */
  readonly servings: number;
}

const PREP_RULES: readonly { readonly ingredients: readonly string[]; readonly task: string }[] = [
  { ingredients: ['صدور دجاج'], task: 'اشوي أو اسلق صدور الدجاج وفتّتها' },
  { ingredients: ['لحم مفروم'], task: 'شكّل الكفتة وسوّيها في الفرن' },
  { ingredients: ['بيض'], task: 'اسلق البيض' },
  { ingredients: ['مكرونة'], task: 'اسلق المكرونة وصفّيها' },
  { ingredients: ['برغل'], task: 'اسلق البرغل' },
  { ingredients: ['بطاطا', 'بطاطس'], task: 'اشوي أو اسلق البطاطا والبطاطس' },
  { ingredients: ['خيار', 'جزر'], task: 'اغسل وقطّع الخيار والجزر' },
  { ingredients: ['شوفان'], task: 'انقع الشوفان الليلة اللي قبلها' },
];

/**
 * What can be cooked ahead for the week's packed meals, biggest job first.
 * Derived from the ingredients, so it only knows the common make-ahead items.
 */
export function prepList(week: WorkWeek, meals: readonly WorkMeal[]): PrepTask[] {
  const byId = new Map(meals.map((meal) => [meal.id, meal]));
  const packed = Object.values(week).flatMap((day) => Object.values(day).flatMap((id) => byId.get(id) ?? []));
  return PREP_RULES.map((rule) => ({
    task: rule.task,
    servings: packed.filter((meal) =>
      meal.ingredients.some((ingredient) => rule.ingredients.some((wanted) => ingredientMatches(ingredient.name, wanted))),
    ).length,
  }))
    .filter((entry) => entry.servings > 0)
    .sort((a, b) => b.servings - a.servings);
}

/** How the eater felt afterwards. A note of their own observation, not a diagnosis. */
export type Comfort = 'fine' | 'heavy' | 'bloated';

export const COMFORT_LABELS: Record<Comfort, string> = {
  fine: 'تمام',
  heavy: 'تقيل',
  bloated: 'انتفاخ',
};

export const COMFORTS = Object.keys(COMFORT_LABELS) as Comfort[];

export interface ComfortEntry {
  readonly date: string;
  readonly mealId: string;
  readonly comfort: Comfort;
}

/** Bloating has to be reported this many times before an ingredient is pointed at. */
export const SUSPECT_AFTER = 3;

/**
 * Ingredients that showed up in bloating reports at least `SUSPECT_AFTER` times and
 * more often than in "fine" reports. Offered to the eater to confirm, never applied alone.
 */
export function suspectIngredients(log: readonly ComfortEntry[], meals: readonly WorkMeal[]): string[] {
  const byId = new Map(meals.map((meal) => [meal.id, meal]));
  const bloated = new Map<string, number>();
  const fine = new Map<string, number>();
  for (const entry of log) {
    const counter = entry.comfort === 'bloated' ? bloated : entry.comfort === 'fine' ? fine : null;
    if (counter === null) continue;
    for (const ingredient of byId.get(entry.mealId)?.ingredients ?? []) {
      counter.set(ingredient.name, (counter.get(ingredient.name) ?? 0) + 1);
    }
  }
  return [...bloated.entries()]
    .filter(([name, count]) => count >= SUSPECT_AFTER && count > (fine.get(name) ?? 0))
    .map(([name]) => name);
}
