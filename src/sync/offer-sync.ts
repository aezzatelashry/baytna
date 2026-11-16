import type { SupabaseClient } from '@supabase/supabase-js';

import { offerChanges, type RemoteOffer } from '@/domain/offer-sync';
import type { Offer, OfferKind } from '@/domain/types';
import { useStore } from '@/store/store';

const EPOCH = '1970-01-01T00:00:00Z';

interface OfferRow {
  id: string;
  household_id: string;
  store: string;
  name: string;
  price: number;
  pack_qty: number;
  kind: string;
  valid_until: string | null;
  source_url: string | null;
  added_at: string;
  deleted: boolean;
  updated_at: string;
  server_updated_at?: string;
}

function toRow(offer: Offer, householdId: string, stamp: string): OfferRow {
  return {
    id: offer.id,
    household_id: householdId,
    store: offer.store,
    name: offer.name,
    price: offer.price,
    pack_qty: offer.packQty,
    kind: offer.kind,
    valid_until: offer.validUntil,
    source_url: offer.sourceUrl,
    added_at: offer.addedAt,
    deleted: false,
    updated_at: stamp,
  };
}

function toRemote(row: OfferRow): RemoteOffer {
  return {
    offer: {
      id: row.id,
      store: row.store,
      name: row.name,
      price: Number(row.price),
      packQty: Number(row.pack_qty),
      kind: row.kind as OfferKind,
      validUntil: row.valid_until,
      sourceUrl: row.source_url,
      addedAt: row.added_at,
    },
    deleted: row.deleted,
    stamp: new Date(row.updated_at).toISOString(),
  };
}

/** Shares the household's saved offers: sends what this phone added or took away, brings in the rest. */
export async function syncOffers(supabase: SupabaseClient, householdId: string): Promise<void> {
  const state = useStore.getState();
  const pushStamp = new Date().toISOString();
  const changes = offerChanges(state.offers, state.offerStamps, state.offersPushedAt);

  if (changes.added.length > 0) {
    const rows = changes.added.map((offer) => toRow(offer, householdId, state.offerStamps[offer.id] ?? pushStamp));
    const { error } = await supabase.from('offers').upsert(rows);
    if (error) throw new Error(error.message);
  }
  if (changes.removedIds.length > 0) {
    // An offer that never reached the household has no row to mark, and that is fine.
    const { error } = await supabase
      .from('offers')
      .update({ deleted: true, updated_at: pushStamp })
      .eq('household_id', householdId)
      .in('id', [...changes.removedIds]);
    if (error) throw new Error(error.message);
  }
  state.markOffersPushed(pushStamp);

  const since = state.offersPulledAt || EPOCH;
  const { data, error } = await supabase.from('offers').select('*').eq('household_id', householdId).gt('server_updated_at', since);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as OfferRow[];
  const pulledAt = rows.reduce((latest, row) => (row.server_updated_at && row.server_updated_at > latest ? row.server_updated_at : latest), since);
  useStore.getState().applyRemoteOffers(rows.map(toRemote), pulledAt);
}
