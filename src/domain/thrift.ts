import { normalizeName } from './budget';
import { CATEGORIES, type Category, type ListItem, type Meal } from './types';

/** An ingredient that more than one of the week's meals needs, so one purchase serves them all. */
export interface SharedIngredient {
  readonly name: string;
  readonly meals: readonly string[];
}

/** Ingredients used by two or more of the given meals, the most shared first. */
export function sharedIngredients(meals: readonly Meal[]): SharedIngredient[] {
  const users = new Map<string, { name: string; meals: Set<string> }>();
  for (const meal of meals) {
    for (const ingredient of meal.ingredients) {
      const key = normalizeName(ingredient.name);
      const entry = users.get(key) ?? { name: ingredient.name, meals: new Set<string>() };
      entry.meals.add(meal.name);
      users.set(key, entry);
    }
  }
  return [...users.values()]
    .filter((entry) => entry.meals.size >= 2)
    .map((entry) => ({ name: entry.name, meals: [...entry.meals] }))
    .sort((a, b) => b.meals.length - a.meals.length);
}

/** Something that was thrown away, and what it had cost. */
export interface WasteEntry {
  readonly id: string;
  readonly date: string;
  readonly name: string;
  /** What was paid for it, in SAR. Zero when unknown. */
  readonly price: number;
}

function spentOn(items: readonly ListItem[]): number {
  return items
    .filter((item) => !item.deleted && item.bought)
    .reduce((sum, item) => sum + (item.paidPrice ?? item.estPrice ?? 0), 0);
}

export interface CategoryChange {
  readonly category: Category;
  readonly thisWeek: number;
  readonly lastWeek: number;
}

export interface WeekReport {
  readonly spent: number;
  readonly lastSpent: number;
  /** Positive when this week cost less than last week. Null when there is no last week to compare. */
  readonly saved: number | null;
  readonly wasted: number;
  readonly wastedCount: number;
  /** Categories whose spend moved, biggest move first. */
  readonly changes: readonly CategoryChange[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** This week against last week: what was paid, what was saved, what went in the bin. */
export function weekReport(
  thisWeek: readonly ListItem[],
  lastWeek: readonly ListItem[],
  waste: readonly WasteEntry[],
): WeekReport {
  const spent = round2(spentOn(thisWeek));
  const lastSpent = round2(spentOn(lastWeek));
  const changes = CATEGORIES.map((category) => ({
    category,
    thisWeek: round2(spentOn(thisWeek.filter((item) => item.category === category))),
    lastWeek: round2(spentOn(lastWeek.filter((item) => item.category === category))),
  }))
    .filter((change) => change.thisWeek !== change.lastWeek)
    .sort((a, b) => Math.abs(b.thisWeek - b.lastWeek) - Math.abs(a.thisWeek - a.lastWeek));

  return {
    spent,
    lastSpent,
    saved: lastSpent > 0 ? round2(lastSpent - spent) : null,
    wasted: round2(waste.reduce((sum, entry) => sum + entry.price, 0)),
    wastedCount: waste.length,
    changes,
  };
}

export interface MonthReport {
  /** Weeks in the period in which something was bought. */
  readonly weeks: number;
  readonly spent: number;
  /** The weekly budget times those weeks. */
  readonly budgeted: number;
  /** Positive when the family stayed under the budget, negative when over. */
  readonly underBudget: number;
  /** What was saved by paying less than the price expected when the item went on the list. */
  readonly belowUsual: number;
  readonly belowUsualCount: number;
  readonly wasted: number;
  readonly wastedCount: number;
}

/**
 * The last weeks in one place, from what the family actually recorded: money paid,
 * the budget for the weeks they shopped, what offers and cheaper finds took off the
 * expected prices, and what went in the bin. `since` is the first week's start day.
 */
export function monthReport(
  items: readonly ListItem[],
  waste: readonly WasteEntry[],
  weeklyBudget: number,
  since: string,
): MonthReport {
  const bought = items.filter((item) => !item.deleted && item.bought && item.weekStart >= since);
  const weeks = new Set(bought.map((item) => item.weekStart)).size;
  const spent = round2(spentOn(bought));
  const budgeted = round2(weeklyBudget * weeks);
  const cheaper = bought.filter(
    (item) => item.estPrice !== null && item.paidPrice !== null && item.paidPrice < item.estPrice,
  );
  const binned = waste.filter((entry) => entry.date >= since);

  return {
    weeks,
    spent,
    budgeted,
    underBudget: round2(budgeted - spent),
    belowUsual: round2(cheaper.reduce((sum, item) => sum + ((item.estPrice ?? 0) - (item.paidPrice ?? 0)), 0)),
    belowUsualCount: cheaper.length,
    wasted: round2(binned.reduce((sum, entry) => sum + entry.price, 0)),
    wastedCount: binned.length,
  };
}

/** A meal's known cost split between the people eating. Null when nobody is counted. */
export function costPerPerson(knownCost: number, people: number): number | null {
  return people > 0 ? round2(knownCost / people) : null;
}
