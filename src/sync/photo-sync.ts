import type { SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { photoStampKey, useStore, type PhotoKind } from '@/store/store';

const BUCKET = 'household-photos';
const SIGNED_URL_SECONDS = 120;
const EPOCH = '1970-01-01T00:00:00Z';
const CONTENT_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };

interface PhotoRow {
  household_id: string;
  kind: PhotoKind;
  key: string;
  path: string;
  deleted: boolean;
  updated_at: string;
  server_updated_at?: string;
}

interface LocalPhoto {
  readonly kind: PhotoKind;
  readonly key: string;
  /** Undefined when the family took the photo away. */
  readonly uri: string | undefined;
  readonly stamp: string | undefined;
}

function extensionOf(uri: string): string {
  const match = /\.(jpe?g|png|webp|heic)(?:\?|$)/i.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

/** Product names are Arabic and free text, so the stored file is named by a digest of the key. */
async function fileNameFor(key: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key);
}

/** Every photo this phone knows about, present or taken away. */
function localPhotos(): LocalPhoto[] {
  const { itemPhotos, mealPhotos, photoStamps } = useStore.getState();
  const known = new Map<string, LocalPhoto>();
  const add = (kind: PhotoKind, key: string, uri: string | undefined): void => {
    known.set(photoStampKey(kind, key), { kind, key, uri, stamp: photoStamps[photoStampKey(kind, key)] });
  };
  Object.entries(itemPhotos).forEach(([key, uri]) => add('item', key, uri));
  Object.entries(mealPhotos).forEach(([key, uri]) => add('meal', key, uri));
  for (const stampKey of Object.keys(photoStamps)) {
    if (known.has(stampKey)) continue;
    const cut = stampKey.indexOf(':');
    const kind = stampKey.slice(0, cut);
    if (kind === 'item' || kind === 'meal') add(kind, stampKey.slice(cut + 1), undefined);
  }
  return [...known.values()];
}

async function pushOne(supabase: SupabaseClient, householdId: string, photo: LocalPhoto, fallbackStamp: string): Promise<PhotoRow | null> {
  const name = await fileNameFor(photo.key);
  const base = { household_id: householdId, kind: photo.kind, key: photo.key, updated_at: photo.stamp ?? fallbackStamp };
  if (photo.uri === undefined) return { ...base, path: `${householdId}/${photo.kind}/${name}`, deleted: true };

  const extension = extensionOf(photo.uri);
  const path = `${householdId}/${photo.kind}/${name}.${extension}`;
  try {
    const bytes = await new File(photo.uri).arrayBuffer();
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: CONTENT_TYPES[extension], upsert: true });
    if (error) return null;
  } catch {
    // The picture is gone from this phone (cleared storage): nothing to send, and nothing to announce.
    return null;
  }
  return { ...base, path, deleted: false };
}

async function push(supabase: SupabaseClient, householdId: string, pushedAt: string, stamp: string): Promise<void> {
  const dirty = localPhotos().filter((photo) => photo.stamp === undefined || photo.stamp > pushedAt);
  const rows: PhotoRow[] = [];
  for (const photo of dirty) {
    const row = await pushOne(supabase, householdId, photo, stamp);
    if (row !== null) rows.push(row);
  }
  if (rows.length === 0) return;
  const { error } = await supabase.from('photos').upsert(rows);
  if (error) throw new Error(error.message);
}

async function download(supabase: SupabaseClient, row: PhotoRow): Promise<string> {
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(row.path, SIGNED_URL_SECONDS);
  if (signed.error || !signed.data) throw new Error('signed url failed');
  const name = await fileNameFor(row.key);
  const target = new File(Paths.document, `shared-${row.kind}-${name}-${Date.now()}.${extensionOf(row.path)}`);
  const file = await File.downloadFileAsync(signed.data.signedUrl, target);
  return file.uri;
}

async function pull(supabase: SupabaseClient, householdId: string, since: string): Promise<string> {
  const { data, error } = await supabase.from('photos').select('*').eq('household_id', householdId).gt('server_updated_at', since);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PhotoRow[];
  let pulledAt = since;

  for (const row of rows) {
    const stamp = new Date(row.updated_at).toISOString();
    const mine = useStore.getState().photoStamps[photoStampKey(row.kind, row.key)];
    // What this phone holds is as new or newer: keep it.
    if (mine === undefined || mine < stamp) {
      const uri = row.deleted ? null : await download(supabase, row);
      useStore.getState().applyRemotePhoto(row.kind, row.key, uri, stamp);
    }
    if (row.server_updated_at && row.server_updated_at > pulledAt) pulledAt = row.server_updated_at;
  }
  return pulledAt;
}

/**
 * Sends this phone's new product and dish photos to the household and brings in the
 * other phone's. The newest change to a photo wins. Not offered on the web, which has
 * no folder to keep pictures in.
 */
export async function syncPhotos(supabase: SupabaseClient, householdId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const { photosPushedAt, photosPulledAt } = useStore.getState();
  const stamp = new Date().toISOString();
  await push(supabase, householdId, photosPushedAt, stamp);
  const pulledAt = await pull(supabase, householdId, photosPulledAt || EPOCH);
  useStore.getState().markPhotosSynced(stamp, pulledAt);
}
