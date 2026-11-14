import type { Meal, MealStyle } from '@/domain/types';

interface MealMeta {
  readonly style: MealStyle;
  readonly minutes: number;
  readonly boxable: boolean;
}

function meta(style: MealStyle, minutes: number, boxable = false): MealMeta {
  return { style, minutes, boxable };
}

/**
 * How each built-in meal counts in the week's rhythm, about how long it takes, and
 * whether a portion travels well to work the next day. The times are rough starting
 * points for a family kitchen, to be corrected by the family.
 */
const MEAL_META: Readonly<Record<string, MealMeta>> = {
  'bf-eggs-cheese': meta('light', 10),
  'bf-foul': meta('home', 15),
  'bf-taameya': meta('treat', 25),
  'bf-labneh-zaatar': meta('light', 5),
  'bf-shakshuka': meta('home', 20),
  'ln-kabsa-chicken': meta('home', 75, true),
  'ln-chicken-potato': meta('light', 70, true),
  'ln-fish-sayadeya': meta('home', 60),
  'ln-fish-fried': meta('treat', 40),
  'ln-meat-okra': meta('home', 90),
  'ln-kofta': meta('home', 50, true),
  'ln-molokhia': meta('home', 45),
  'ln-koshari': meta('home', 60),
  'ln-bechamel': meta('treat', 80, true),
  'ln-omelette-potato': meta('light', 20),
  'dn-lentil-soup': meta('light', 35),
  'dn-veg-soup': meta('light', 30),
  'dn-yogurt-fruit': meta('light', 5),
  'dn-tuna-sandwich': meta('light', 10),
};

/** A built-in meal with its rhythm, time and travel details filled in. */
export function withMeta(meal: Meal): Meal {
  const known = MEAL_META[meal.id];
  return known ? { ...meal, ...known } : meal;
}
