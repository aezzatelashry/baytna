import type { ListItem } from './types';

/** Who does what at home. One person builds the list, the other buys it; either can switch. */
export type Role = 'requester' | 'shopper';

export const ROLE_LABELS: Record<Role, string> = {
  requester: 'بجهّز القائمة',
  shopper: 'بشتري',
};

export const ROLES = Object.keys(ROLE_LABELS) as Role[];

/** A week's list moves one way: being written, handed over, being bought, finished. */
export type OrderStatus = 'draft' | 'sent' | 'shopping' | 'done';

export type OrderEvent = 'send' | 'recall' | 'start' | 'finish' | 'reopen';

const TRANSITIONS: Record<OrderEvent, { from: OrderStatus; to: OrderStatus; by: Role | 'anyone' }> = {
  send: { from: 'draft', to: 'sent', by: 'requester' },
  recall: { from: 'sent', to: 'draft', by: 'requester' },
  start: { from: 'sent', to: 'shopping', by: 'shopper' },
  finish: { from: 'shopping', to: 'done', by: 'shopper' },
  reopen: { from: 'done', to: 'draft', by: 'anyone' },
};

/** The status after an event, or null when this role may not do that now. */
export function nextStatus(status: OrderStatus, event: OrderEvent, role: Role): OrderStatus | null {
  const rule = TRANSITIONS[event];
  if (rule.from !== status) return null;
  if (rule.by !== 'anyone' && rule.by !== role) return null;
  return rule.to;
}

/** The events this role can trigger from this status, in the order to offer them. */
export function availableEvents(status: OrderStatus, role: Role): OrderEvent[] {
  return (Object.keys(TRANSITIONS) as OrderEvent[]).filter((event) => nextStatus(status, event, role) !== null);
}

/** Anything added after the list was handed over is urgent: the shopper is already on the way. */
export function isUrgentWhenAdded(status: OrderStatus): boolean {
  return status === 'sent' || status === 'shopping';
}

export interface TripSummary {
  readonly boughtCount: number;
  /** What was actually paid, in SAR. A bought item with no price counts as zero. */
  readonly paid: number;
  /** Items the shopper could not find. */
  readonly notFound: readonly string[];
  /** Items neither bought nor marked as not found. */
  readonly leftOver: readonly string[];
}

export function summarizeTrip(items: readonly ListItem[]): TripSummary {
  const live = items.filter((item) => !item.deleted);
  const bought = live.filter((item) => item.bought);
  const pending = live.filter((item) => !item.bought);
  return {
    boughtCount: bought.length,
    paid: bought.reduce((sum, item) => sum + (item.paidPrice ?? item.estPrice ?? 0), 0),
    notFound: pending.filter((item) => item.notFound === true).map((item) => item.name),
    leftOver: pending.filter((item) => item.notFound !== true).map((item) => item.name),
  };
}
