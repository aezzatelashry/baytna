import type { SupabaseClient } from '@supabase/supabase-js';

import { parseCustomMeal } from '@/domain/custom-meals';
import { changesSince, type RemoteChange } from '@/domain/stamped-sync';
import type { Meal } from '@/domain/types';
import { useStore } from '@/store/store';

const EPOCH = '1970-01-01T00:00:00Z';

interface MealRow {
  household_id: string;
  id: string;
  data: unknown;
  deleted: boolean;
  updated_at: string;
  server_updated_at?: string;
}

/** A row the phone can use: a dish that passes the checks, or a removal (which needs only the id). */
function toChange(row: MealRow): RemoteChange<Meal> | null {
  const stamp = new Date(row.updated_at).toISOString();
  if (row.deleted) return { item: { id: row.id, name: '', slots: [], protein: 'none', tags: [], ingredients: [] }, deleted: true, stamp };
  const meal = parseCustomMeal(row.id, row.data);
  return meal ? { item: meal, deleted: false, stamp } : null;
}

/** Shares the dishes the family added: sends what this phone added, changed or took away, brings in the rest. */
export async function syncMeals(supabase: SupabaseClient, householdId: string): Promise<void> {
  const state = useStore.getState();
  const pushStamp = new Date().toISOString();
  const changes = changesSince(state.customMeals, state.mealStamps, state.mealsPushedAt);

  if (changes.changed.length > 0) {
    const rows = changes.changed.map(({ id, ...data }) => ({
      household_id: householdId,
      id,
      data,
      deleted: false,
      updated_at: state.mealStamps[id] ?? pushStamp,
    }));
    const { error } = await supabase.from('custom_meals').upsert(rows);
    if (error) throw new Error(error.message);
  }
  if (changes.removedIds.length > 0) {
    // A dish that never reached the household has no row to mark, and that is fine.
    const { error } = await supabase
      .from('custom_meals')
      .update({ deleted: true, updated_at: pushStamp })
      .eq('household_id', householdId)
      .in('id', [...changes.removedIds]);
    if (error) throw new Error(error.message);
  }
  state.markMealsPushed(pushStamp);

  const since = state.mealsPulledAt || EPOCH;
  const { data, error } = await supabase.from('custom_meals').select('*').eq('household_id', householdId).gt('server_updated_at', since);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as MealRow[];
  const pulledAt = rows.reduce((latest, row) => (row.server_updated_at && row.server_updated_at > latest ? row.server_updated_at : latest), since);
  useStore.getState().applyRemoteMeals(
    rows.flatMap((row) => toChange(row) ?? []),
    pulledAt,
  );
}
