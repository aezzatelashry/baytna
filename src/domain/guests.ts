import type { Ingredient } from './types';

/** Extra people eating with the family in one week. It does not carry over to the next. */
export interface GuestWeek {
  readonly weekStart: string;
  readonly count: number;
}

export const GUEST_CHOICES: readonly number[] = [0, 2, 4, 6];

const HALF = 0.5;

export function guestsThisWeek(guests: GuestWeek | null, weekStart: string): number {
  return guests !== null && guests.weekStart === weekStart ? guests.count : 0;
}

/**
 * How much bigger the quantities get: everyone at the table over the family alone.
 * With no family members recorded there is nothing to compare against, so nothing is scaled.
 */
export function guestFactor(familySize: number, guests: number): number {
  if (familySize <= 0) return 1;
  return (familySize + Math.max(0, guests)) / familySize;
}

/** Scales what a meal needs, rounding each quantity up to the next half so nobody goes short. */
export function scaleForGuests(ingredients: readonly Ingredient[], factor: number): readonly Ingredient[] {
  if (factor <= 1) return ingredients;
  return ingredients.map((ingredient) => ({
    ...ingredient,
    // The tiny subtraction keeps 1.5 from becoming 2 through floating-point noise.
    qty: Math.ceil((ingredient.qty * factor) / HALF - 1e-9) * HALF,
  }));
}
