import type { SupabaseClient } from '@supabase/supabase-js';

import type { OrderEvent, OrderStatus } from '@/domain/orders';
import { currentWeekStart, useStore } from '@/store/store';

const STATUSES: readonly string[] = ['draft', 'sent', 'shopping', 'done'];

/** The household learns this phone's role and name, so the server lets the right person move the order. */
async function pushProfile(supabase: SupabaseClient, householdId: string): Promise<void> {
  const state = useStore.getState();
  const profile = `${state.role}|${state.myName.trim()}`;
  if (state.profilePushed === profile) return;
  const { error } = await supabase.rpc('set_my_profile', {
    target_household: householdId,
    new_role: state.role,
    new_name: state.myName,
  });
  if (error) throw new Error(error.message);
  state.setProfilePushed(profile);
}

/** Brings in where each week's order stands. The household's copy is the truth. */
async function pullOrders(supabase: SupabaseClient, householdId: string): Promise<void> {
  const { data, error } = await supabase.from('orders').select('week_start, status').eq('household_id', householdId);
  if (error) throw new Error(error.message);
  const statuses: Record<string, OrderStatus> = {};
  for (const row of data ?? []) {
    if (typeof row.week_start === 'string' && STATUSES.includes(row.status)) statuses[row.week_start] = row.status as OrderStatus;
  }
  if (Object.keys(statuses).length > 0) useStore.getState().setOrderStatuses(statuses);
}

/** Keeps the role, the name and the weekly order in step with the household. */
export async function syncOrders(supabase: SupabaseClient, householdId: string): Promise<void> {
  await pushProfile(supabase, householdId);
  await pullOrders(supabase, householdId);
}

/**
 * Moves this week's order one step. On a phone with no household it is local only.
 * In a household the step shows at once and is then confirmed by the server; if the
 * other phone got there first, the household's status replaces the local guess.
 * Returns false when the step is not open to this role now.
 */
export async function moveOrder(supabase: SupabaseClient | null, event: OrderEvent): Promise<boolean> {
  const state = useStore.getState();
  if (!state.applyOrderEvent(event)) return false;
  const household = state.household;
  if (supabase === null || household === null || household.status === 'pending') return true;

  const weekStart = currentWeekStart(state.weekStartsOn);
  try {
    await pushProfile(supabase, household.id);
    const { error } = await supabase.rpc('order_event', { target_household: household.id, target_week: weekStart, event });
    if (error) throw new Error(error.message);
    return true;
  } catch {
    await pullOrders(supabase, household.id).catch(() => undefined);
    return false;
  }
}
