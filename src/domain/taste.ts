import type { Meal } from './types';

/** What the family thought of a meal after eating it. */
export type Verdict = 'liked' | 'disliked';

/** The latest verdict per meal id. A meal with no entry was not rated. */
export type Ratings = Readonly<Record<string, Verdict>>;

/** Records a verdict. Pressing the same verdict again takes it back. */
export function rate(ratings: Ratings, mealId: string, verdict: Verdict): Ratings {
  const { [mealId]: current, ...others } = ratings;
  return current === verdict ? others : { ...others, [mealId]: verdict };
}

const FAVORITE_RANK = 2;
const LIKED_RANK = 1;
const DISLIKED_RANK = -1;

function tasteRank(mealId: string, favorites: ReadonlySet<string>, ratings: Ratings): number {
  if (favorites.has(mealId)) return FAVORITE_RANK;
  if (ratings[mealId] === 'liked') return LIKED_RANK;
  return ratings[mealId] === 'disliked' ? DISLIKED_RANK : 0;
}

/** Favourites first, then liked meals, then unrated ones, and disliked meals last. Ties keep their order. */
export function rankByTaste(meals: readonly Meal[], favorites: ReadonlySet<string>, ratings: Ratings): Meal[] {
  return [...meals].sort((a, b) => tasteRank(b.id, favorites, ratings) - tasteRank(a.id, favorites, ratings));
}

/** The sweet for a week: a different one each time a plan is made. Null when there are none. */
export function pickWeekSweet(sweetIds: readonly string[], offset: number): string | null {
  return sweetIds.length === 0 ? null : sweetIds[offset % sweetIds.length];
}

/** The sweet after the current one, wrapping around. */
export function nextSweet(sweetIds: readonly string[], current: string | null): string | null {
  if (sweetIds.length === 0) return null;
  return sweetIds[(sweetIds.indexOf(current ?? '') + 1) % sweetIds.length];
}
