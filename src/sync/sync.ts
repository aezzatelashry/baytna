import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { parseAssistantReply, type AssistantReply } from '@/domain/assistant';
import { parseFoundOffers, type FoundOffer } from '@/domain/offers';
import { parsePlaces, type NearbyPlace } from '@/domain/places';
import type { Category, ListItem, MealSlot, PlanEntry } from '@/domain/types';
import { useStore, type HouseholdLink } from '@/store/store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** Sync is optional: without the two env values the app stays local-only. */
export function isSyncConfigured(): boolean {
  return Boolean(url && anonKey);
}

function getClient(): SupabaseClient {
  if (!url || !anonKey) throw new Error('المزامنة غير مفعّلة على هذا الإصدار');
  client ??= createClient(url, anonKey, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  return client;
}

async function ensureSession(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message);
}

/**
 * Trades a Google ID token for a Supabase session. Returns the name on the Google
 * account, which is shown inside the app only.
 */
export async function signInWithGoogleToken(idToken: string): Promise<string> {
  const { data, error } = await getClient().auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw new Error('الدخول بجوجل ما اشتغلش. جرّب تاني.');
  const name: unknown = data.user?.user_metadata?.full_name;
  return typeof name === 'string' ? name : '';
}

/**
 * The name on the Google account this phone is still signed in with, or null when
 * there is no session or only an anonymous one. The session itself is kept on the
 * phone, so this is what a screen asks after the app is reopened.
 */
export async function signedInAccountName(): Promise<string | null> {
  if (!isSyncConfigured()) return null;
  const { data } = await getClient().auth.getSession();
  const user = data.session?.user;
  if (!user || user.is_anonymous === true) return null;
  const name: unknown = user.user_metadata?.full_name;
  return typeof name === 'string' ? name : '';
}

export async function signOut(): Promise<void> {
  const { error } = await getClient().auth.signOut();
  if (error) throw new Error('تسجيل الخروج ما اشتغلش. جرّب تاني.');
}

const AI_ERRORS: Record<string, string> = {
  daily_limit: 'وصلت لحد الاستخدام اليومي. جرّب بكرة.',
  invalid_query: 'اكتب اسم الصنف من حرفين لـ 80 حرف.',
  invalid_message: 'الرسالة فاضية أو طويلة قوي.',
  invalid_place_query: 'اكتب نوع المكان اللي بتدوّر عليه.',
  busy: 'الخدمة مشغولة دلوقتي. جرّب بعد دقيقة.',
};

/** Calls one of the AI functions. They run on the server; this phone never holds the AI key. */
async function invokeAi(name: string, body: Record<string, unknown>): Promise<unknown> {
  const supabase = getClient();
  await ensureSession(supabase);
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const reply: unknown = await error.context?.json?.().catch(() => null);
    const code = typeof reply === 'object' && reply !== null ? String((reply as { error?: unknown }).error) : '';
    throw new Error(AI_ERRORS[code] ?? 'الخدمة ما ردّتش. اتأكد من النت وجرّب تاني.');
  }
  return data;
}

/** Looks an item up on the web. Can take up to a minute. */
export async function searchPrices(query: string): Promise<FoundOffer[]> {
  return parseFoundOffers(await invokeAi('price-search', { query }));
}

/** Grocery shops around a point, with the drive to each. Runs on the server with the Google key. */
export async function findPlaces(
  origin: { readonly lat: number; readonly lng: number },
  radiusKm: number,
  query: string,
): Promise<NearbyPlace[]> {
  return parsePlaces(await invokeAi('places', { origin, radiusKm, query }));
}

export interface AssistantTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

/** Sends one message to the assistant with the app snapshot and the recent conversation. */
export async function askAssistant(
  message: string,
  history: readonly AssistantTurn[],
  context: string,
  mealIds: ReadonlySet<string>,
): Promise<AssistantReply> {
  return parseAssistantReply(await invokeAi('assistant', { message, history, context }), mealIds);
}

export async function createHousehold(): Promise<HouseholdLink> {
  const supabase = getClient();
  await ensureSession(supabase);
  const { data, error } = await supabase.rpc('create_household');
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return { id: String(row.id), code: String(row.code) };
}

export async function joinHousehold(code: string): Promise<HouseholdLink> {
  const supabase = getClient();
  await ensureSession(supabase);
  const { data, error } = await supabase.rpc('join_household', { join_code: code });
  if (error) throw new Error(error.message === 'unknown code' ? 'الكود غير صحيح' : error.message);
  return { id: String(data), code: code.trim().toUpperCase() };
}

interface ItemRow {
  id: string; household_id: string; week_start: string; name: string; qty: number; unit: string;
  category: string; est_price: number | null; paid_price: number | null; bought: boolean;
  meal_id: string | null; added_by: string; deleted: boolean; updated_at: string; server_updated_at?: string;
}

interface PlanRow {
  id: string; household_id: string; date: string; slot: string; meal_id: string;
  deleted: boolean; updated_at: string; server_updated_at?: string;
}

function itemToRow(item: ListItem, householdId: string): ItemRow {
  return {
    id: item.id, household_id: householdId, week_start: item.weekStart, name: item.name, qty: item.qty,
    unit: item.unit, category: item.category, est_price: item.estPrice, paid_price: item.paidPrice,
    bought: item.bought, meal_id: item.mealId, added_by: item.addedBy, deleted: item.deleted,
    updated_at: item.updatedAt,
  };
}

function rowToItem(row: ItemRow): ListItem {
  return {
    id: row.id, weekStart: row.week_start, name: row.name, qty: Number(row.qty), unit: row.unit,
    category: row.category as Category, estPrice: row.est_price === null ? null : Number(row.est_price),
    paidPrice: row.paid_price === null ? null : Number(row.paid_price), bought: row.bought,
    mealId: row.meal_id, addedBy: row.added_by, deleted: row.deleted,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function planToRow(entry: PlanEntry, householdId: string): PlanRow {
  return {
    id: entry.id, household_id: householdId, date: entry.date, slot: entry.slot,
    meal_id: entry.mealId, deleted: entry.deleted, updated_at: entry.updatedAt,
  };
}

function rowToPlan(row: PlanRow): PlanEntry {
  return {
    id: row.id, date: row.date, slot: row.slot as MealSlot, mealId: row.meal_id,
    deleted: row.deleted, updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function latestServerStamp(rows: readonly { server_updated_at?: string }[], fallback: string): string {
  return rows.reduce((latest, row) => (row.server_updated_at && row.server_updated_at > latest ? row.server_updated_at : latest), fallback);
}

let running: Promise<void> | null = null;

/** Pushes local changes, then pulls what the other phone changed. Safe to call often. */
export function syncNow(): Promise<void> {
  running ??= runSync().finally(() => {
    running = null;
  });
  return running;
}

async function runSync(): Promise<void> {
  const state = useStore.getState();
  if (!isSyncConfigured() || !state.household) return;
  const supabase = getClient();
  await ensureSession(supabase);
  const householdId = state.household.id;

  const pushStamp = new Date().toISOString();
  const dirtyItems = state.items.filter((item) => item.updatedAt > state.lastPushedAt);
  const dirtyPlan = state.plan.filter((entry) => entry.updatedAt > state.lastPushedAt);
  if (dirtyItems.length > 0) {
    const { error } = await supabase.from('list_items').upsert(dirtyItems.map((item) => itemToRow(item, householdId)));
    if (error) throw new Error(error.message);
  }
  if (dirtyPlan.length > 0) {
    const { error } = await supabase.from('plan_entries').upsert(dirtyPlan.map((entry) => planToRow(entry, householdId)));
    if (error) throw new Error(error.message);
  }
  state.markPushed(pushStamp);

  const since = state.lastPulledAt || '1970-01-01T00:00:00Z';
  const [items, plan] = await Promise.all([
    supabase.from('list_items').select('*').eq('household_id', householdId).gt('server_updated_at', since),
    supabase.from('plan_entries').select('*').eq('household_id', householdId).gt('server_updated_at', since),
  ]);
  if (items.error) throw new Error(items.error.message);
  if (plan.error) throw new Error(plan.error.message);

  const itemRows = items.data as ItemRow[];
  const planRows = plan.data as PlanRow[];
  const pulledAt = latestServerStamp([...itemRows, ...planRows], since);
  useStore.getState().mergeRemote(itemRows.map(rowToItem), planRows.map(rowToPlan), pulledAt);
}

/** Live updates from the other phone. Returns an unsubscribe function. */
export function subscribeToHousehold(householdId: string, onError: (message: string) => void): () => void {
  const supabase = getClient();
  const pull = (): void => {
    syncNow().catch((error: unknown) => onError(error instanceof Error ? error.message : 'تعذّرت المزامنة'));
  };
  const filter = `household_id=eq.${householdId}`;
  const channel = supabase
    .channel(`household-${householdId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items', filter }, pull)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_entries', filter }, pull)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
