/**
 * weekly-offers: once a week the database's own scheduler (pg_cron) calls this function.
 * For every household with things still to buy it looks those products up on the chains'
 * own Saudi websites and saves the offers it finds, so they are on both phones before
 * anyone opens the app. It does the same work as price-search, with the same checks.
 *
 * A run is short: it starts no new lookup after a minute, and the scheduler calls it every
 * five minutes for an hour, each call picking up where the last left off. A household gets
 * a handful of lookups a week (see plan.ts), whatever happens.
 *
 * The call is trusted by a shared secret that lives only in the database's vault: the cron
 * job reads it there and the function asks the database whether the one it was sent matches.
 */
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { json, requiredEnv, serve } from '../_shared/http.ts';
import { runSearch } from '../_shared/offer-search.ts';
import { keepSourcedOffers } from '../price-search/offers.ts';
import { freshOffers, itemsToSearch, newestWeekItems, runWeek, type ItemRow } from './plan.ts';

declare const EdgeRuntime: { waitUntil(work: Promise<unknown>): void };

/** No new lookup starts after this long into a call; one lookup can take about a minute. */
const START_LIMIT_MS = 55_000;
const MAX_ROWS = 2000;

interface RunState {
  readonly lookedUp: string[];
}

async function lookedUpThisWeek(admin: SupabaseClient, householdId: string, week: string): Promise<RunState> {
  const { data } = await admin.from('weekly_offer_runs').select('looked_up').eq('household_id', householdId).eq('run_week', week).maybeSingle();
  return { lookedUp: Array.isArray(data?.looked_up) ? (data.looked_up as string[]) : [] };
}

async function runningOffers(admin: SupabaseClient, householdId: string, today: string) {
  const { data, error } = await admin
    .from('offers')
    .select('store, name, price, valid_until')
    .eq('household_id', householdId)
    .eq('deleted', false);
  if (error) throw new Error(error.message);
  const saved = data ?? [];
  return { saved, running: saved.filter((offer) => offer.valid_until === null || offer.valid_until >= today) };
}

async function lookUpOne(admin: SupabaseClient, anthropic: Anthropic, householdId: string, item: string, today: string): Promise<number> {
  const { reported, seenUrls } = await runSearch(anthropic, item);
  const { saved } = await runningOffers(admin, householdId, today);
  const fresh = freshOffers(keepSourcedOffers(reported, seenUrls), saved);
  if (fresh.length === 0) return 0;

  const stamp = new Date().toISOString();
  const { error } = await admin.from('offers').insert(
    fresh.map((offer) => ({
      id: crypto.randomUUID(),
      household_id: householdId,
      store: offer.store,
      name: offer.name,
      price: offer.price,
      pack_qty: offer.packQty,
      kind: offer.kind,
      valid_until: offer.validUntil,
      source_url: offer.sourceUrl,
      added_at: today,
      deleted: false,
      updated_at: stamp,
    })),
  );
  if (error) throw new Error(error.message);
  return fresh.length;
}

/** Works through the households one lookup at a time until the time for starting new ones is up. */
async function work(admin: SupabaseClient): Promise<void> {
  const startedAt = Date.now();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const week = runWeek(now);
  const anthropic = new Anthropic({ apiKey: requiredEnv('ANTHROPIC_API_KEY') });

  const { data, error } = await admin
    .from('list_items')
    .select('household_id, week_start, name')
    .eq('deleted', false)
    .eq('bought', false)
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  for (const [householdId, names] of newestWeekItems((data ?? []) as ItemRow[])) {
    const { lookedUp } = await lookedUpThisWeek(admin, householdId, week);
    const { running } = await runningOffers(admin, householdId, today);
    const wanted = itemsToSearch(names, running.map((offer) => String(offer.name)), lookedUp);

    for (const item of wanted) {
      if (Date.now() - startedAt > START_LIMIT_MS) return;
      try {
        const saved = await lookUpOne(admin, anthropic, householdId, item, today);
        lookedUp.push(item);
        console.log(`weekly-offers: "${item}" saved ${saved}`);
      } catch (failure) {
        // A failed lookup is not counted, so the next call tries it again.
        console.error('weekly-offers lookup failed', failure instanceof Error ? failure.message : failure);
        continue;
      }
      await admin.from('weekly_offer_runs').upsert({ household_id: householdId, run_week: week, looked_up: lookedUp, updated_at: new Date().toISOString() });
    }
  }
}

async function handle(request: Request): Promise<Response> {
  const admin = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'));
  const secret = request.headers.get('x-cron-secret') ?? '';
  const { data: isTrusted } = await admin.rpc('weekly_offers_authorized', { candidate: secret });
  if (isTrusted !== true) return json({ error: 'unauthorized' }, 401);

  // The scheduler only waits a few seconds for an answer; the work carries on in the background.
  EdgeRuntime.waitUntil(work(admin).catch((failure) => console.error('weekly-offers failed', failure instanceof Error ? failure.message : failure)));
  return json({ started: true }, 202);
}

serve('weekly-offers', handle);
