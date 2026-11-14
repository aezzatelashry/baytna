import { describe, expect, test } from 'vitest';

import { availableEvents, isUrgentWhenAdded, nextStatus, summarizeTrip } from './orders';
import type { ListItem } from './types';

function item(overrides: Partial<ListItem>): ListItem {
  return {
    id: 'i',
    updatedAt: '2026-11-14T00:00:00.000Z',
    deleted: false,
    weekStart: '2026-11-14',
    name: 'أرز',
    qty: 1,
    unit: '',
    category: 'pantry',
    estPrice: null,
    paidPrice: null,
    bought: false,
    mealId: null,
    addedBy: '',
    ...overrides,
  };
}

describe('order status', () => {
  test('walks the whole week: written, sent, being bought, finished, reopened', () => {
    expect(nextStatus('draft', 'send', 'requester')).toBe('sent');
    expect(nextStatus('sent', 'start', 'shopper')).toBe('shopping');
    expect(nextStatus('shopping', 'finish', 'shopper')).toBe('done');
    expect(nextStatus('done', 'reopen', 'requester')).toBe('draft');
    expect(nextStatus('done', 'reopen', 'shopper')).toBe('draft');
  });

  test('lets the requester take the list back before the trip starts, not after', () => {
    expect(nextStatus('sent', 'recall', 'requester')).toBe('draft');
    expect(nextStatus('shopping', 'recall', 'requester')).toBeNull();
  });

  test('refuses an event from the wrong role', () => {
    expect(nextStatus('draft', 'send', 'shopper')).toBeNull();
    expect(nextStatus('sent', 'start', 'requester')).toBeNull();
    expect(nextStatus('shopping', 'finish', 'requester')).toBeNull();
  });

  test('refuses an event out of order', () => {
    expect(nextStatus('draft', 'start', 'shopper')).toBeNull();
    expect(nextStatus('draft', 'finish', 'shopper')).toBeNull();
    expect(nextStatus('sent', 'send', 'requester')).toBeNull();
  });

  test('offers each role only what it can do now', () => {
    expect(availableEvents('draft', 'requester')).toEqual(['send']);
    expect(availableEvents('draft', 'shopper')).toEqual([]);
    expect(availableEvents('sent', 'requester')).toEqual(['recall']);
    expect(availableEvents('sent', 'shopper')).toEqual(['start']);
    expect(availableEvents('done', 'shopper')).toEqual(['reopen']);
  });

  test('treats items added after the handover as urgent', () => {
    expect(isUrgentWhenAdded('draft')).toBe(false);
    expect(isUrgentWhenAdded('sent')).toBe(true);
    expect(isUrgentWhenAdded('shopping')).toBe(true);
    expect(isUrgentWhenAdded('done')).toBe(false);
  });
});

describe('summarizeTrip', () => {
  test('counts what was bought and paid, and separates not-found from forgotten', () => {
    const summary = summarizeTrip([
      item({ id: 'a', name: 'دجاج', bought: true, estPrice: 30, paidPrice: 36.5 }),
      item({ id: 'b', name: 'أرز', bought: true, estPrice: 26 }),
      item({ id: 'c', name: 'لبنة', notFound: true, substitute: 'جبنة كريمي' }),
      item({ id: 'd', name: 'بصل' }),
      item({ id: 'e', name: 'ملح', deleted: true }),
    ]);

    expect(summary).toEqual({ boughtCount: 2, paid: 62.5, notFound: ['لبنة'], leftOver: ['بصل'] });
  });

  test('is all zeros for an empty list', () => {
    expect(summarizeTrip([])).toEqual({ boughtCount: 0, paid: 0, notFound: [], leftOver: [] });
  });
});
