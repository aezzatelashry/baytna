import { normalizeName } from './budget';
import type { Ingredient } from './types';

/** Anything with a name and a list of what goes in it: a home meal, a packed meal, a dessert. */
export interface Cookable {
  readonly id: string;
  readonly name: string;
  readonly ingredients: readonly Ingredient[];
}

const SEPARATORS = /[\n,،.؛;]+/;

/**
 * The words in what the family typed or said they have. Speech has no commas
 * ("بيض وطماطم وجبنة"), so a word that starts with "و" is also kept without it.
 */
export function wordsOnHand(text: string): Set<string> {
  const words = new Set<string>();
  for (const part of text.split(SEPARATORS)) {
    for (const word of normalizeName(part).split(' ')) {
      if (word === '') continue;
      words.add(word);
      if (word.length > 2 && word.startsWith('و')) words.add(word.slice(1));
    }
  }
  return words;
}

/**
 * An ingredient counts as on hand when its main word was mentioned: saying "جبنة"
 * covers "جبنة بيضاء". Loose on purpose, since this only suggests what to cook.
 */
export function isOnHand(ingredientName: string, onHand: ReadonlySet<string>): boolean {
  const [head] = normalizeName(ingredientName).split(' ');
  return head !== undefined && head !== '' && onHand.has(head);
}

export interface CookIdea<T extends Cookable> {
  readonly dish: T;
  /** Ingredients that were not mentioned. Empty means it can be cooked now. */
  readonly missing: readonly string[];
}

/** How many missing ingredients still count as "nearly there". */
export const MAX_MISSING = 2;

/**
 * Dishes that can be made from what is on hand, ready ones first, then those short of
 * one or two things. A dish with nothing on hand is never suggested.
 */
export function cookIdeas<T extends Cookable>(text: string, dishes: readonly T[]): CookIdea<T>[] {
  const onHand = wordsOnHand(text);
  if (onHand.size === 0) return [];
  return dishes
    .map((dish) => ({
      dish,
      missing: dish.ingredients.filter((ingredient) => !isOnHand(ingredient.name, onHand)).map((ingredient) => ingredient.name),
    }))
    .filter((idea) => idea.dish.ingredients.length > 0 && idea.missing.length <= MAX_MISSING)
    .filter((idea) => idea.missing.length < idea.dish.ingredients.length)
    .sort((a, b) => a.missing.length - b.missing.length || b.dish.ingredients.length - a.dish.ingredients.length);
}
