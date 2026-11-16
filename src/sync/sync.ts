import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { parseAssistantReply, type AssistantReply } from '@/domain/assistant';
import { parseFlyer, type FlyerReading } from '@/domain/flyer';
import { parseFoundOffers, type FoundOffer } from '@/domain/offers';
import { parsePlaces, type NearbyPlace } from '@/domain/places';
import type { Category, ListItem, MealSlot, PlanEntry } from '@/domain/types';
import { useStore, type HouseholdLink } from '@/store/store';

import { syncPhotos } from './photo-sync';

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
  invalid_flyer: 'الصورة كبيرة قوي أو مش مقروءة. صوّرها تاني من قريب.',
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

/** Sends a photo of an offers flyer to be read. The photo is not stored anywhere. */
export async function readFlyer(image: string, mediaType: string, today: string): Promise<FlyerReading> {
  return parseFlyer(await invokeAi('flyer', { image, mediaType, today }));
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

const FAMILY_ERRORS: Record<string, string> = {
  'unknown code': 'الكود غير صحيح',
  'google sign-in required': 'ادخل بحساب جوجل الأول.',
  'owner only': 'صاحب البيت بس اللي يقدر يعمل كده.',
  'owner stays': 'صاحب البيت ما ينفعش يخرج من بيته.',
};

function familyError(message: string): Error {
  return new Error(FAMILY_ERRORS[message] ?? 'الطلب ما اتنفّذش. اتأكد من النت وجرّب تاني.');
}

async function currentUserId(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('ادخل بحساب جوجل الأول.');
  return id;
}

/** The name the owner will see next to this phone's request. Not worth failing the join over. */
async function sendMyName(supabase: SupabaseClient, householdId: string, name: string): Promise<void> {
  if (name.trim() === '') return;
  await supabase.rpc('set_my_name', { target_household: householdId, new_name: name });
}

export async function createHousehold(myName: string): Promise<HouseholdLink> {
  const supabase = getClient();
  await ensureSession(supabase);
  const { data, error } = await supabase.rpc('create_household');
  if (error) throw familyError(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  const id = String(row.id);
  await sendMyName(supabase, id, myName);
  return { id, code: String(row.code), status: 'member', isOwner: true };
}

/** Asks to join. The link stays 'pending' until the owner says yes on their phone. */
export async function joinHousehold(code: string, myName: string): Promise<HouseholdLink> {
  const supabase = getClient();
  await ensureSession(supabase);
  const { data, error } = await supabase.rpc('join_household', { join_code: code });
  if (error) throw familyError(error.message);
  const id = String(data);
  await sendMyName(supabase, id, myName);
  const membership = await membershipOf(id);
  return {
    id,
    code: code.trim().toUpperCase(),
    status: membership.status === 'member' ? 'member' : 'pending',
    isOwner: membership.isOwner,
  };
}

export interface Membership {
  /** 'none' when the request was turned down, the member was taken out, or they left. */
  readonly status: 'pending' | 'member' | 'none';
  readonly isOwner: boolean;
}

/** Where this phone's account stands in the household right now. */
export async function membershipOf(householdId: string): Promise<Membership> {
  const supabase = getClient();
  const userId = await currentUserId(supabase);
  const mine = await supabase
    .from('household_members')
    .select('status, removed_at')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();
  if (mine.error) throw new Error('تعذّر الوصول للبيت. اتأكد من النت.');
  if (!mine.data || mine.data.removed_at !== null) return { status: 'none', isOwner: false };
  // Only a member can read the household row, so someone still waiting simply gets nothing here.
  const home = await supabase.from('households').select('owner_id').eq('id', householdId).maybeSingle();
  return {
    status: mine.data.status === 'member' ? 'member' : 'pending',
    isOwner: home.data?.owner_id === userId,
  };
}

export interface HouseholdPerson {
  readonly userId: string;
  readonly name: string;
  readonly status: 'pending' | 'member';
  readonly isMe: boolean;
}

/** The people in the household and those asking to join. The owner sees requests; members see members. */
export async function householdPeople(householdId: string): Promise<HouseholdPerson[]> {
  const supabase = getClient();
  const userId = await currentUserId(supabase);
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id, display_name, status, joined_at')
    .eq('household_id', householdId)
    .is('removed_at', null)
    .order('joined_at');
  if (error) throw new Error('تعذّر تحميل أفراد البيت. اتأكد من النت.');
  return (data ?? []).map((row) => ({
    userId: String(row.user_id),
    name: typeof row.display_name === 'string' ? row.display_name : '',
    status: row.status === 'member' ? 'member' : 'pending',
    isMe: row.user_id === userId,
  }));
}

export async function approveMember(householdId: string, userId: string): Promise<void> {
  const { error } = await getClient().rpc('approve_member', { target_household: householdId, target_user: userId });
  if (error) throw familyError(error.message);
}

/** The owner turns a request down or takes a member out. */
export async function removeMember(householdId: string, userId: string): Promise<void> {
  const { error } = await getClient().rpc('remove_member', { target_household: householdId, target_user: userId });
  if (error) throw familyError(error.message);
}

/** A member leaves, or someone waiting takes the request back. */
export async function leaveHousehold(householdId: string): Promise<void> {
  const { error } = await getClient().rpc('leave_household', { target_household: householdId });
  if (error) throw familyError(error.message);
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

  // Someone still waiting has nothing to sync; each run asks whether the owner has answered.
  if (state.household.status === 'pending') {
    const membership = await membershipOf(householdId);
    if (membership.status === 'none') {
      state.setHousehold(null);
      throw new Error('طلب الانضمام اترفض أو اتلغى.');
    }
    if (membership.status === 'pending') return;
    state.setHouseholdStatus('member', membership.isOwner);
  }

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

  // The list is already in step; a photo that fails to move is reported without undoing that.
  try {
    await syncPhotos(supabase, householdId);
  } catch {
    throw new Error('القائمة اتزامنت، بس الصور ما اتزامنتش. هتتجرّب تاني لوحدها.');
  }
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter }, pull)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
