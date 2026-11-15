import { describe, expect, test } from 'vitest';

import { EMPTY_FUND, fillFund, spendFromFund, weeklySetAside, type Fund } from './funds';

const fund: Fund = { weekly: 15, balance: 30, lastFilledWeek: '2026-11-07' };

describe('funds', () => {
  test('adds one week when a new week starts', () => {
    const filled = fillFund(fund, '2026-11-14');

    expect(filled.balance).toBe(45);
    expect(filled.lastFilledWeek).toBe('2026-11-14');
  });

  test('adds nothing when the app is opened again in the same week', () => {
    expect(fillFund(fillFund(fund, '2026-11-14'), '2026-11-14').balance).toBe(45);
  });

  test('catches up on weeks the app was not opened', () => {
    expect(fillFund(fund, '2026-11-28').balance).toBe(75);
  });

  test('makes its first top-up the first time it is filled', () => {
    const first = fillFund({ ...EMPTY_FUND, weekly: 20 }, '2026-11-14');

    expect(first.balance).toBe(20);
    expect(first.lastFilledWeek).toBe('2026-11-14');
  });

  test('leaves a switched-off fund untouched, so it starts the week it is switched on', () => {
    const off = fillFund(EMPTY_FUND, '2026-11-14');
    const on = fillFund({ ...off, weekly: 10 }, '2026-11-14');

    expect(off).toBe(EMPTY_FUND);
    expect(on.balance).toBe(10);
  });

  test('ignores a week that is not after the last top-up', () => {
    expect(fillFund(fund, '2026-10-31')).toBe(fund);
  });

  test('takes a purchase out and lets the balance show an overspend', () => {
    expect(spendFromFund(fund, 12.5).balance).toBe(17.5);
    expect(spendFromFund(fund, 50).balance).toBe(-20);
    expect(spendFromFund(fund, 0)).toBe(fund);
  });

  test('adds up what the funds take from each week', () => {
    expect(weeklySetAside({ pantry: fund, offers: { ...EMPTY_FUND, weekly: 10 } })).toBe(25);
  });
});
