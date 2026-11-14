import { CATEGORIES, SLOTS, type Category, type MealSlot } from './types';

/** A change the assistant proposes. Nothing is applied until the family confirms it. */
export type AssistantAction =
  | { readonly type: 'add_item'; readonly name: string; readonly category: Category; readonly estPrice: number | null }
  | { readonly type: 'remove_item'; readonly name: string }
  | { readonly type: 'set_budget'; readonly amount: number }
  | { readonly type: 'remember'; readonly note: string }
  | { readonly type: 'set_meal'; readonly date: string; readonly slot: MealSlot; readonly mealId: string };

export interface VideoLink {
  readonly title: string;
  readonly channel: string;
  readonly url: string;
}

export interface AssistantReply {
  readonly reply: string;
  readonly actions: readonly AssistantAction[];
  readonly videos: readonly VideoLink[];
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'm.youtube.com', 'youtu.be'];
const MAX_BUDGET_SAR = 100000;
const MAX_NOTE = 120;
/** How many preferences the assistant keeps; the oldest drop off first. */
export const MAX_NOTES = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isYoutubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && YOUTUBE_HOSTS.includes(parsed.hostname.replace(/^www\./, ''));
  } catch {
    return false;
  }
}

function toAction(value: unknown, mealIds: ReadonlySet<string>): AssistantAction | null {
  if (!isRecord(value)) return null;
  const name = text(value.name);
  const price = typeof value.price === 'number' && Number.isFinite(value.price) && value.price > 0 ? value.price : null;

  switch (value.type) {
    case 'add_item': {
      const category = CATEGORIES.find((known) => known === value.category);
      return name !== '' && category ? { type: 'add_item', name, category, estPrice: price } : null;
    }
    case 'remove_item':
      return name !== '' ? { type: 'remove_item', name } : null;
    case 'set_budget':
      return price !== null && price <= MAX_BUDGET_SAR ? { type: 'set_budget', amount: price } : null;
    case 'remember':
      return name !== '' ? { type: 'remember', note: name.slice(0, MAX_NOTE) } : null;
    case 'set_meal': {
      const slot = SLOTS.find((known) => known === value.slot);
      const date = text(value.date);
      const mealId = text(value.mealId);
      return slot && DATE_KEY.test(date) && mealIds.has(mealId) ? { type: 'set_meal', date, slot, mealId } : null;
    }
    default:
      return null;
  }
}

function toVideo(value: unknown): VideoLink | null {
  if (!isRecord(value)) return null;
  const title = text(value.title);
  const url = text(value.url);
  return title !== '' && isYoutubeUrl(url) ? { title, channel: text(value.channel), url } : null;
}

function keep<T>(values: unknown, convert: (value: unknown) => T | null): T[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const converted = convert(value);
    return converted === null ? [] : [converted];
  });
}

export interface SnapshotInput {
  readonly today: string;
  readonly days: readonly string[];
  readonly budget: number;
  readonly spent: number;
  readonly remaining: number;
  readonly toBuy: readonly string[];
  readonly plan: readonly { date: string; slot: MealSlot; mealName: string }[];
  readonly meals: readonly { id: string; name: string; slots: readonly MealSlot[] }[];
  /** Foods someone at home avoids. Sent without names: the assistant does not need them. */
  readonly avoided: readonly string[];
  /** Preferences the family asked the assistant to remember. */
  readonly notes: readonly string[];
}

/** The app state the assistant sees, as plain text. Carries no personal names. */
export function buildSnapshot(input: SnapshotInput): string {
  const lines = [
    `today: ${input.today}`,
    `week days: ${input.days.join(', ')}`,
    `weekly budget SAR: ${input.budget}; spent: ${input.spent}; remaining: ${input.remaining}`,
    `still to buy: ${input.toBuy.join('، ') || 'nothing'}`,
    `foods avoided at home: ${input.avoided.join(', ') || 'none'}`,
    `preferences to respect: ${input.notes.join(' | ') || 'none'}`,
    'plan:',
    ...input.plan.map((entry) => `  ${entry.date} ${entry.slot}: ${entry.mealName}`),
    'meals the app knows (id | name | slots):',
    ...input.meals.map((meal) => `  ${meal.id} | ${meal.name} | ${meal.slots.join('/')}`),
  ];
  return lines.join('\n');
}

/**
 * Reads the assistant function's response. Unknown actions, meals that are not in the
 * app and links that are not YouTube are dropped, never guessed.
 */
export function parseAssistantReply(payload: unknown, mealIds: ReadonlySet<string>): AssistantReply {
  if (!isRecord(payload)) return { reply: '', actions: [], videos: [] };
  return {
    reply: text(payload.reply),
    actions: keep(payload.actions, (value) => toAction(value, mealIds)),
    videos: keep(payload.videos, toVideo),
  };
}
