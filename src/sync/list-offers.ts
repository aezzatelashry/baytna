import { itemsToLookUp, newOffersOnly } from '@/domain/list-offers';
import { isActive } from '@/domain/offers';
import { toDateKey } from '@/domain/week';
import { currentWeekStart, useStore } from '@/store/store';

import { isSyncConfigured, searchPrices, syncNow } from './sync';

/**
 * The list products that would be looked up right now: still to buy. Normally those
 * with a running offer saved are skipped; a forced refresh looks them up again for newer prices.
 */
export function listItemsToLookUp(isForced = false): string[] {
  const state = useStore.getState();
  const today = toDateKey(new Date());
  const weekStart = currentWeekStart(state.weekStartsOn);
  const toBuy = state.items
    .filter((item) => item.weekStart === weekStart && !item.deleted && !item.bought)
    .map((item) => item.name);
  const running = isForced ? [] : state.offers.filter((offer) => isActive(offer, today));
  return itemsToLookUp(toBuy, running);
}

let running: Promise<number> | null = null;

async function run(onProgress: (done: number, total: number) => void, isForced: boolean): Promise<number> {
  const wanted = listItemsToLookUp(isForced);
  let saved = 0;
  for (const [index, item] of wanted.entries()) {
    onProgress(index, wanted.length);
    const fresh = newOffersOnly(await searchPrices(item), useStore.getState().offers);
    // Saved as they come, so a failure on a later product keeps what was already found.
    if (fresh.length > 0) useStore.getState().addOffers(fresh);
    saved += fresh.length;
  }
  if (wanted.length > 0) useStore.getState().setOffersRefreshedAt(new Date().toISOString());
  return saved;
}

/**
 * Looks the list's products up on the web and saves the offers found. Returns how many
 * were saved. Only one lookup runs at a time; a second call joins the first.
 */
export function refreshListOffers(
  onProgress: (done: number, total: number) => void = () => undefined,
  isForced = false,
): Promise<number> {
  running ??= run(onProgress, isForced).finally(() => {
    running = null;
  });
  return running;
}

/**
 * The once-a-day lookup, started when the app opens. It first brings in what the other
 * phone already found, so two phones in one household do not pay for the same search.
 * Returns the number of offers saved, or null when today's lookup was already done or is off.
 */
export async function refreshListOffersDaily(): Promise<number | null> {
  const state = useStore.getState();
  const today = toDateKey(new Date());
  if (!isSyncConfigured() || !state.autoOffers || state.offersRefreshedOn === today) return null;
  // Marked before the work starts: a lookup that fails is not retried all day at the family's cost.
  state.setOffersRefreshedOn(today);
  await syncNow().catch(() => undefined);
  return refreshListOffers();
}
