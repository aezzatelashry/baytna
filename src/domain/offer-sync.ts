import { changesSince, mergeRemote, type Stamps } from './stamped-sync';
import type { Offer } from './types';

/** When each offer was last added or taken away on any phone, by offer id. */
export type OfferStamps = Stamps;

/** One offer as the household's shared store holds it. */
export interface RemoteOffer {
  readonly offer: Offer;
  /** True when someone took the offer away. */
  readonly deleted: boolean;
  /** When that happened, as an ISO timestamp. */
  readonly stamp: string;
}

export interface OfferChanges {
  /** Offers this phone added that the household has not seen yet. */
  readonly added: readonly Offer[];
  /** Ids of offers this phone took away since the last push. */
  readonly removedIds: readonly string[];
}

/** What this phone has to send. An offer with no stamp was saved before sharing existed, so it goes up once. */
export function offerChanges(offers: readonly Offer[], stamps: OfferStamps, pushedAt: string): OfferChanges {
  const { changed, removedIds } = changesSince(offers, stamps, pushedAt);
  return { added: changed, removedIds };
}

export interface OfferMerge {
  readonly offers: readonly Offer[];
  readonly stamps: OfferStamps;
}

/**
 * Brings in what the other phone did. For each offer the newest change wins, so an
 * offer taken away here after it was added there stays away.
 */
export function mergeRemoteOffers(offers: readonly Offer[], stamps: OfferStamps, remote: readonly RemoteOffer[]): OfferMerge {
  const merged = mergeRemote(
    offers,
    stamps,
    remote.map((change) => ({ item: change.offer, deleted: change.deleted, stamp: change.stamp })),
  );
  return { offers: merged.items, stamps: merged.stamps };
}
