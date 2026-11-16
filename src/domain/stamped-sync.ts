/**
 * Sharing a list of things between phones when each thing only gets added, replaced
 * or taken away: every change is stamped with its time, and the newest stamp wins.
 */

/** When each thing was last changed or taken away on any phone, by its id. */
export type Stamps = Readonly<Record<string, string>>;

export interface RemoteChange<T> {
  readonly item: T;
  /** True when someone took the thing away. */
  readonly deleted: boolean;
  /** When that happened, as an ISO timestamp. */
  readonly stamp: string;
}

export interface LocalChanges<T> {
  /** Things this phone added or changed that the household has not seen yet. */
  readonly changed: readonly T[];
  /** Ids of things this phone took away since the last push. */
  readonly removedIds: readonly string[];
}

/** What this phone has to send. A thing with no stamp predates sharing, so it goes up once. */
export function changesSince<T extends { readonly id: string }>(items: readonly T[], stamps: Stamps, pushedAt: string): LocalChanges<T> {
  const isNew = (id: string): boolean => stamps[id] === undefined || stamps[id] > pushedAt;
  const present = new Set(items.map((item) => item.id));
  return {
    changed: items.filter((item) => isNew(item.id)),
    removedIds: Object.keys(stamps).filter((id) => !present.has(id) && stamps[id] > pushedAt),
  };
}

export interface Merged<T> {
  readonly items: readonly T[];
  readonly stamps: Stamps;
}

/** Brings in what the other phone did. For each thing the newest change wins. */
export function mergeRemote<T extends { readonly id: string }>(items: readonly T[], stamps: Stamps, remote: readonly RemoteChange<T>[]): Merged<T> {
  const byId = new Map(items.map((item) => [item.id, item]));
  const nextStamps: Record<string, string> = { ...stamps };

  for (const change of remote) {
    const id = change.item.id;
    const mine = nextStamps[id];
    if (mine !== undefined && mine >= change.stamp) continue;
    if (change.deleted) byId.delete(id);
    else byId.set(id, change.item);
    nextStamps[id] = change.stamp;
  }
  return { items: [...byId.values()], stamps: nextStamps };
}
