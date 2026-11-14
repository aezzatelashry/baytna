import type { Category, ListItem, PriceBook } from './types';

/** Below this share of the budget left after planned items, the week is "tight". */
export const TIGHT_SHARE = 0.1;

export type BudgetStatus = 'ok' | 'tight' | 'over';

export interface BudgetSummary {
  readonly budget: number;
  /** Paid so far. */
  readonly spent: number;
  /** Expected cost of items still on the list that have a price. */
  readonly planned: number;
  /** Budget minus what is already paid. */
  readonly remaining: number;
  /** Budget minus paid and planned. Negative means the list does not fit. */
  readonly projected: number;
  /** Items still to buy that nobody has priced, so `projected` is optimistic. */
  readonly unpricedCount: number;
  readonly status: BudgetStatus;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function summarizeBudget(items: readonly ListItem[], budget: number): BudgetSummary {
  const live = items.filter((item) => !item.deleted);
  const bought = live.filter((item) => item.bought);
  const pending = live.filter((item) => !item.bought);

  const spent = bought.reduce((sum, item) => sum + (item.paidPrice ?? item.estPrice ?? 0), 0);
  const planned = pending.reduce((sum, item) => sum + (item.estPrice ?? 0), 0);
  const unpricedCount = pending.filter((item) => item.estPrice === null).length;
  const remaining = budget - spent;
  const projected = remaining - planned;

  return { budget, spent, planned, remaining, projected, unpricedCount, status: statusOf(projected, budget) };
}

function statusOf(projected: number, budget: number): BudgetStatus {
  if (projected < 0) return 'over';
  if (projected < budget * TIGHT_SHARE) return 'tight';
  return 'ok';
}

export interface CategoryShare {
  readonly category: Category;
  /** Paid plus still-planned money in this category, in SAR. */
  readonly amount: number;
  /** This category's part of all priced money on the list, from 0 to 1. */
  readonly share: number;
}

/** Where this week's money goes, biggest category first. Unpriced items are left out. */
export function spendByCategory(items: readonly ListItem[]): CategoryShare[] {
  const totals = new Map<Category, number>();
  for (const item of items) {
    if (item.deleted) continue;
    const price = item.bought ? (item.paidPrice ?? item.estPrice) : item.estPrice;
    if (price === null) continue;
    totals.set(item.category, (totals.get(item.category) ?? 0) + price);
  }
  const all = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount, share: all > 0 ? amount / all : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** Last price the family paid for an item, if they ever bought it. */
export function lookupPrice(book: PriceBook, name: string): number | null {
  return book[normalizeName(name)]?.price ?? null;
}

export function recordPrice(book: PriceBook, name: string, price: number, date: string): PriceBook {
  return { ...book, [normalizeName(name)]: { price, date } };
}

/** Parses what a person types into a price field. Returns null for empty or invalid input. */
export function parsePrice(input: string): number | null {
  const western = input
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[٫,]/g, '.');
  if (western === '') return null;
  const value = Number(western);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function formatSar(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}
