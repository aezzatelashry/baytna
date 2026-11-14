import { lookupPrice, normalizeName } from './budget';
import type { Ingredient, ListItem, Meal, MealSlot, MealStyle, Member, PlanEntry, PriceBook, Protein } from './types';
import { SLOTS } from './types';

/** What is needed to check a dish against a person: its diet tags and what goes in it. */
export type Dish = Pick<Meal, 'tags' | 'ingredients'>;

/**
 * True when the avoided words appear in the ingredient as whole words, in order.
 * Whole words matter in Arabic: avoiding "لبن" (milk) must not catch "لبنة" (labneh).
 */
export function ingredientMatches(ingredientName: string, avoided: string): boolean {
  const words = normalizeName(ingredientName).split(' ');
  const wanted = normalizeName(avoided).split(' ').filter(Boolean);
  if (wanted.length === 0) return false;
  return words.some((_, start) => wanted.every((word, offset) => words[start + offset] === word));
}

/** The ingredients of a dish that this person avoids. */
export function avoidedIngredients(dish: Dish, member: Member): string[] {
  const avoids = member.avoids ?? [];
  return dish.ingredients
    .filter((ingredient) => avoids.some((avoided) => ingredientMatches(ingredient.name, avoided)))
    .map((ingredient) => ingredient.name);
}

/** Where a dish is eaten. Avoided ingredients apply to food taken out unless the person says otherwise. */
export type Setting = 'home' | 'work';

/**
 * A dish clashes with a person through a diet tag (always), or through an ingredient
 * they avoid. The ingredient list applies to work food; it applies to meals at home
 * only for a person who turned that on.
 */
export function clashesWith(dish: Dish, member: Member, setting: Setting): boolean {
  if (member.excludes.some((tag) => dish.tags.includes(tag))) return true;
  const appliesHere = setting === 'work' || member.avoidsAtHome === true;
  return appliesHere && avoidedIngredients(dish, member).length > 0;
}

/** Members whose exclusions clash with a meal at home. Empty means everyone can eat it. */
export function membersExcludedFrom(meal: Dish, members: readonly Member[]): Member[] {
  return members.filter((member) => clashesWith(meal, member, 'home'));
}

/** Ingredients of a meal that are not already waiting on this week's list. */
export function missingIngredients(meal: Meal, items: readonly ListItem[]): Ingredient[] {
  const onList = new Set(
    items.filter((item) => !item.deleted).map((item) => normalizeName(item.name)),
  );
  return meal.ingredients.filter((ingredient) => !onList.has(normalizeName(ingredient.name)));
}

/** Lunch proteins by day index: one meat day, one fish day, one chicken day, the rest cheap. */
export const LUNCH_ROTATION: readonly Protein[] = ['chicken', 'none', 'fish', 'eggs', 'meat', 'none', 'chicken'];

export interface PlannedSlot {
  readonly date: string;
  readonly slot: MealSlot;
  readonly mealId: string;
}

/**
 * Builds a week of meals without any AI: lunches follow the protein rotation,
 * and no meal repeats until every candidate for that slot has been used.
 * `offset` shifts the picks so "new plan" gives a different week.
 */
export interface PlanOptions {
  /** Meals the family locked: they stay where they are when a new plan is made. */
  readonly locked?: readonly PlannedSlot[];
  /** Favourite meals come up first in the rotation. */
  readonly favorites?: ReadonlySet<string>;
  /** The style wanted for each day's lunch, by day index. A wish, not a rule: protein comes first. */
  readonly styles?: readonly MealStyle[];
}

/** How many lunches of each style the family wants in a week. */
export interface Rhythm {
  readonly light: number;
  readonly home: number;
  readonly treat: number;
}

export const DEFAULT_RHYTHM: Rhythm = { light: 4, home: 2, treat: 1 };

/**
 * Lays the rhythm out over the days so the same style is not bunched together:
 * each day takes the style with the most left, avoiding yesterday's when it can.
 */
export function styleSequence(rhythm: Rhythm, dayCount: number): MealStyle[] {
  const left: Record<MealStyle, number> = { ...rhythm };
  const sequence: MealStyle[] = [];
  for (let day = 0; day < dayCount; day += 1) {
    const ranked = (Object.keys(left) as MealStyle[]).filter((style) => left[style] > 0).sort((a, b) => left[b] - left[a]);
    if (ranked.length === 0) break;
    const picked = ranked.find((style) => style !== sequence[sequence.length - 1]) ?? ranked[0];
    left[picked] -= 1;
    sequence.push(picked);
  }
  return sequence;
}

export function generateWeekPlan(
  meals: readonly Meal[],
  days: readonly string[],
  offset = 0,
  options: PlanOptions = {},
): PlannedSlot[] {
  const used = new Map<MealSlot, number>();
  const plan: PlannedSlot[] = [];
  const favorites = options.favorites ?? new Set<string>();
  const ordered = [...meals].sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)));

  days.forEach((date, dayIndex) => {
    const kept = (options.locked ?? []).filter((slot) => slot.date === date);
    const servedToday = new Set(kept.map((slot) => slot.mealId));
    for (const slot of SLOTS) {
      const keptHere = kept.find((entry) => entry.slot === slot);
      if (keptHere) {
        plan.push(keptHere);
        continue;
      }
      const forSlot = ordered.filter((meal) => meal.slots.includes(slot));
      const wanted = slot === 'lunch' ? LUNCH_ROTATION[dayIndex % LUNCH_ROTATION.length] : null;
      const candidates = wanted ? forSlot.filter((meal) => meal.protein === wanted) : forSlot;
      const byProtein = candidates.length > 0 ? candidates : forSlot;
      // Within the right protein, lean toward the day's style when a meal of that style exists.
      const wantedStyle = slot === 'lunch' ? options.styles?.[dayIndex] : undefined;
      const byStyle = wantedStyle ? byProtein.filter((meal) => meal.style === wantedStyle) : [];
      const matching = byStyle.length > 0 ? byStyle : byProtein;
      const notServed = matching.filter((meal) => !servedToday.has(meal.id));
      const pool = notServed.length > 0 ? notServed : matching;
      if (pool.length === 0) continue;

      const turn = used.get(slot) ?? 0;
      used.set(slot, turn + 1);
      const picked = pool[(turn + offset) % pool.length];
      servedToday.add(picked.id);
      plan.push({ date, slot, mealId: picked.id });
    }
  });

  return plan;
}

export interface MealCost {
  /** Sum of the last paid price of each ingredient the family has bought before, in SAR. */
  readonly known: number;
  /** Ingredients with no price on record, so `known` is a floor, not a total. */
  readonly unknownCount: number;
}

/**
 * A rough cost from the family's own price book. Each ingredient counts as one
 * purchase at its last paid price, whatever the quantity the recipe needs.
 */
export function estimateMealCost(meal: Meal, book: PriceBook): MealCost {
  return meal.ingredients.reduce<MealCost>(
    (cost, ingredient) => {
      const price = lookupPrice(book, ingredient.name);
      return price === null
        ? { ...cost, unknownCount: cost.unknownCount + 1 }
        : { ...cost, known: cost.known + price };
    },
    { known: 0, unknownCount: 0 },
  );
}

export function entryFor(
  entries: readonly PlanEntry[],
  date: string,
  slot: MealSlot,
): PlanEntry | undefined {
  return entries.find((entry) => !entry.deleted && entry.date === date && entry.slot === slot);
}
