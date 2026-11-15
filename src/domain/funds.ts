import { daysBetween } from './pantry';

/**
 * Money set aside a little every week for a purchase that does not come every week:
 * restocking the long-life store, or stocking up when a real offer appears.
 */
export interface Fund {
  /** What goes in each week, in SAR. Zero means the fund is off. */
  readonly weekly: number;
  readonly balance: number;
  /** The week (by its first day) the fund was last topped up. Null before the first top-up. */
  readonly lastFilledWeek: string | null;
}

export type FundKind = 'pantry' | 'offers';

export const FUND_LABELS: Record<FundKind, string> = {
  pantry: 'صندوق المخزن',
  offers: 'حصّالة العروض',
};

export const EMPTY_FUND: Fund = { weekly: 0, balance: 0, lastFilledWeek: null };

const DAYS_IN_WEEK = 7;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Tops the fund up for every week that has started since the last top-up.
 * Opening the app twice in one week adds nothing the second time.
 */
export function fillFund(fund: Fund, weekStart: string): Fund {
  // A fund with no weekly amount is off: it is not marked filled, so it starts the week it is switched on.
  if (fund.weekly <= 0 || fund.lastFilledWeek === weekStart) return fund;
  const weeks = fund.lastFilledWeek === null ? 1 : Math.floor(daysBetween(fund.lastFilledWeek, weekStart) / DAYS_IN_WEEK);
  if (weeks <= 0) return fund;
  return { ...fund, balance: round2(fund.balance + fund.weekly * weeks), lastFilledWeek: weekStart };
}

/** Takes a purchase out of the fund. The balance can go negative: that is the overspend. */
export function spendFromFund(fund: Fund, amount: number): Fund {
  return amount > 0 ? { ...fund, balance: round2(fund.balance - amount) } : fund;
}

/** What all the funds take out of each week's budget together. */
export function weeklySetAside(funds: Readonly<Record<FundKind, Fund>>): number {
  return round2(Object.values(funds).reduce((sum, fund) => sum + fund.weekly, 0));
}
