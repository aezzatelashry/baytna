import { CATEGORIES, DIET_TAG_LABELS, MEAL_STYLES, SLOTS, type Ingredient, type Meal } from './types';

const PROTEINS: readonly string[] = ['meat', 'fish', 'chicken', 'eggs', 'none'];
const TAGS: readonly string[] = Object.keys(DIET_TAG_LABELS);
const MAX_NAME = 80;
const MAX_INGREDIENTS = 40;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toIngredient(value: unknown): Ingredient | null {
  if (!isRecord(value)) return null;
  const { name, qty, unit, category } = value;
  if (typeof name !== 'string' || name.trim() === '' || name.length > MAX_NAME) return null;
  if (!(CATEGORIES as readonly string[]).includes(category as string)) return null;
  return {
    name: name.trim(),
    qty: typeof qty === 'number' && Number.isFinite(qty) && qty >= 0 ? qty : 1,
    unit: typeof unit === 'string' ? unit.slice(0, 20) : '',
    category: category as Ingredient['category'],
  };
}

/**
 * Reads a family dish that came from the other phone. Anything that does not look
 * like a dish is refused, and unknown fields are dropped, so a bad row cannot reach the planner.
 */
export function parseCustomMeal(id: string, value: unknown): Meal | null {
  if (!isRecord(value) || id === '') return null;
  const { name, slots, protein, tags, ingredients, style, minutes, boxable } = value;
  if (typeof name !== 'string' || name.trim() === '' || name.length > MAX_NAME) return null;
  if (!Array.isArray(slots) || !Array.isArray(ingredients) || ingredients.length > MAX_INGREDIENTS) return null;
  const goodSlots = SLOTS.filter((slot) => slots.includes(slot));
  if (goodSlots.length === 0 || !PROTEINS.includes(protein as string)) return null;

  return {
    id,
    name: name.trim(),
    slots: goodSlots,
    protein: protein as Meal['protein'],
    tags: (Array.isArray(tags) ? tags : []).filter((tag): tag is Meal['tags'][number] => TAGS.includes(tag as string)),
    ingredients: ingredients.flatMap((entry) => toIngredient(entry) ?? []),
    ...(MEAL_STYLES.includes(style as Meal['style'] & string) ? { style: style as Meal['style'] } : {}),
    ...(typeof minutes === 'number' && minutes > 0 ? { minutes } : {}),
    ...(typeof boxable === 'boolean' ? { boxable } : {}),
  };
}
