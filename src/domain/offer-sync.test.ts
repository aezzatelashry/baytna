import { describe, expect, test } from 'vitest';

import { mergeRemoteOffers, offerChanges } from './offer-sync';
import type { Offer } from './types';

function offer(id: string, name = 'أرز'): Offer {
  return { id, store: 'بنده', name, price: 30, packQty: 1, kind: 'weekly', validUntil: null, sourceUrl: null, addedAt: '2026-11-16' };
}

const EARLY = '2026-11-16T08:00:00.000Z';
const PUSHED = '2026-11-16T09:00:00.000Z';
const LATE = '2026-11-16T10:00:00.000Z';

describe('what this phone sends', () => {
  test('sends offers added since the last push and offers saved before sharing existed', () => {
    const offers = [offer('old'), offer('fresh'), offer('unstamped')];

    const changes = offerChanges(offers, { old: EARLY, fresh: LATE }, PUSHED);

    expect(changes.added.map((each) => each.id)).toEqual(['fresh', 'unstamped']);
    expect(changes.removedIds).toEqual([]);
  });

  test('announces an offer taken away since the last push, once', () => {
    const stamps = { gone: LATE, 'gone-before': EARLY, kept: EARLY };

    expect(offerChanges([offer('kept')], stamps, PUSHED).removedIds).toEqual(['gone']);
  });
});

describe('bringing in the other phone', () => {
  test('adds an offer the other phone saved', () => {
    const merged = mergeRemoteOffers([offer('mine')], { mine: EARLY }, [{ offer: offer('theirs', 'لبن'), deleted: false, stamp: LATE }]);

    expect(merged.offers.map((each) => each.id)).toEqual(['mine', 'theirs']);
    expect(merged.stamps.theirs).toBe(LATE);
  });

  test('takes away an offer the other phone removed', () => {
    const merged = mergeRemoteOffers([offer('shared')], { shared: EARLY }, [{ offer: offer('shared'), deleted: true, stamp: LATE }]);

    expect(merged.offers).toEqual([]);
  });

  test('keeps a removal made here after the offer was added there', () => {
    const merged = mergeRemoteOffers([], { shared: LATE }, [{ offer: offer('shared'), deleted: false, stamp: EARLY }]);

    expect(merged.offers).toEqual([]);
    expect(merged.stamps.shared).toBe(LATE);
  });

  test('does not send back what it just received', () => {
    const merged = mergeRemoteOffers([], {}, [{ offer: offer('theirs'), deleted: false, stamp: EARLY }]);

    expect(offerChanges(merged.offers, merged.stamps, PUSHED)).toEqual({ added: [], removedIds: [] });
  });
});
