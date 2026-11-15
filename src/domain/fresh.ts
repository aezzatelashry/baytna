import { CATALOG } from '../data/catalog';
import { normalizeName } from './budget';
import { sameProduct } from './catalog';
import { daysBetween } from './pantry';
import type { Category, Meal } from './types';

/** Something bought fresh that goes off: vegetables, fruit, dairy, meat, bread. */
export interface FreshItem {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  /** The day it was bought, as a date key. */
  readonly boughtOn: string;
  /** How many days the family expects it to stay good. A starting guess they can change. */
  readonly shelfDays: number;
}

/**
 * Starting guesses for how long each kind keeps in a home fridge. They are rough on
 * purpose and are not food-safety advice: the family corrects them per item.
 */
const SHELF_DAYS: Partial<Record<Category, number>> = {
  protein: 2,
  produce: 5,
  fruit: 5,
  dairy: 7,
  bakery: 3,
};

/** Warn when this many days or fewer are left. */
export const FRESH_SOON_DAYS = 2;
export const MIN_SHELF_DAYS = 1;

/** Null for things that keep for weeks (the long-life store handles those). */
export function defaultShelfDays(category: Category): number | null {
  return SHELF_DAYS[category] ?? null;
}

/** The fresh entry for something just bought, or null when its kind does not go off quickly. */
export function freshFromPurchase(id: string, name: string, category: Category, today: string): FreshItem | null {
  const shelfDays = defaultShelfDays(category);
  return shelfDays === null ? null : { id, name: name.trim(), category, boughtOn: today, shelfDays };
}

/** Adds a purchase to the shelf. Buying the same thing again replaces the older entry. */
export function withPurchase(items: readonly FreshItem[], bought: FreshItem): FreshItem[] {
  const wanted = normalizeName(bought.name);
  return [...items.filter((item) => normalizeName(item.name) !== wanted), bought];
}

/** Takes back a purchase recorded today, for when a "bought" tick is undone. */
export function withoutPurchase(items: readonly FreshItem[], name: string, today: string): FreshItem[] {
  const wanted = normalizeName(name);
  return items.filter((item) => item.boughtOn !== today || normalizeName(item.name) !== wanted);
}

/** Days until it is expected to go off. Zero is the last day; negative is past it. */
export function freshDaysLeft(item: FreshItem, today: string): number {
  return item.shelfDays - daysBetween(item.boughtOn, today);
}

/** What should be eaten first: everything inside the warning window, the soonest first. */
export function expiringSoon(items: readonly FreshItem[], today: string): FreshItem[] {
  return items
    .filter((item) => freshDaysLeft(item, today) <= FRESH_SOON_DAYS)
    .sort((a, b) => freshDaysLeft(a, today) - freshDaysLeft(b, today));
}

/** The item with its shelf life moved by some days, never under one day. */
export function withShelfDays(item: FreshItem, change: number): FreshItem {
  return { ...item, shelfDays: Math.max(item.shelfDays + change, MIN_SHELF_DAYS) };
}

/** Meals that would use the item up, in the order given. Matched through the dictionary. */
export function mealsUsing(itemName: string, meals: readonly Meal[]): Meal[] {
  if (itemName.trim() === '') return [];
  return meals.filter((meal) => meal.ingredients.some((ingredient) => sameProduct(itemName, ingredient.name, CATALOG)));
}

/** Puts the meals that use up something about to go off ahead of the rest, keeping each group's order. */
export function rescueFirst(meals: readonly Meal[], expiring: readonly string[]): Meal[] {
  if (expiring.length === 0) return [...meals];
  const rescuers = new Set(expiring.flatMap((name) => mealsUsing(name, meals)).map((meal) => meal.id));
  return [...meals.filter((meal) => rescuers.has(meal.id)), ...meals.filter((meal) => !rescuers.has(meal.id))];
}
