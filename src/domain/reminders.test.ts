import { describe, expect, test } from 'vitest';

import type { FreshItem } from './fresh';
import { freshReminders, offerReminders, reminderTime } from './reminders';
import type { Offer } from './types';

const today = '2026-11-16';

function offer(name: string, store: string, validUntil: string | null): Offer {
  return { id: `${store}-${name}`, store, name, price: 30, packQty: 1, kind: 'weekly', validUntil, sourceUrl: null, addedAt: today };
}

function fresh(name: string, boughtOn: string, shelfDays: number): FreshItem {
  return { id: name, name, category: 'produce', boughtOn, shelfDays };
}

describe('offer reminders', () => {
  test('reminds on the last day of an offer for something still on the list', () => {
    const reminders = offerReminders(['رز', 'لبن'], [offer('أرز بسمتي 5 كجم', 'بنده', '2026-11-18')], today);

    expect(reminders).toEqual([
      { key: 'offers-2026-11-18', day: '2026-11-18', hour: 10, title: 'آخر يوم لعروض على قائمتك', body: 'رز في بنده' },
    ]);
  });

  test('puts offers ending the same day in one reminder', () => {
    const offers = [offer('أرز بسمتي', 'بنده', '2026-11-18'), offer('حليب 2 لتر', 'العثيم', '2026-11-18')];

    const reminders = offerReminders(['رز', 'حليب'], offers, today);

    expect(reminders).toHaveLength(1);
    expect(reminders[0].body).toBe('رز في بنده، حليب في العثيم');
  });

  test('stays quiet for offers with no end date, already over, or not on the list', () => {
    const offers = [offer('أرز', 'بنده', null), offer('أرز', 'لولو', '2026-11-10'), offer('تونة', 'كارفور', '2026-11-18')];

    expect(offerReminders(['رز'], offers, today)).toEqual([]);
  });
});

describe('fresh reminders', () => {
  test('reminds on the last good day, grouping what shares it', () => {
    const shelf = [fresh('خس', '2026-11-15', 3), fresh('طماطم', '2026-11-14', 4), fresh('لبن', '2026-11-16', 7)];

    const reminders = freshReminders(shelf, today);

    expect(reminders.map((each) => [each.day, each.body])).toEqual([
      ['2026-11-18', 'خس، طماطم'],
      ['2026-11-23', 'لبن'],
    ]);
  });

  test('says nothing about what is already past its day', () => {
    expect(freshReminders([fresh('خيار', '2026-11-01', 3)], today)).toEqual([]);
  });
});

describe('when a reminder fires', () => {
  test('uses the hour of that day in the phone own clock', () => {
    const at = reminderTime({ day: '2026-11-18', hour: 10 });

    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours()]).toEqual([2026, 10, 18, 10]);
  });
});
