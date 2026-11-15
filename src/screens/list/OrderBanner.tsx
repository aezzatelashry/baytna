import { View } from 'react-native';

import { Button, Tile, Txt } from '@/components/kit';
import { showToast } from '@/components/toast';
import { Spacing, themed } from '@/constants/theme';
import { formatSar } from '@/domain/budget';
import { availableEvents, ROLES, summarizeTrip, type OrderEvent, type OrderStatus } from '@/domain/orders';
import type { ListItem } from '@/domain/types';
import { currentWeekStart, useStore } from '@/store/store';

const STATUS_TITLES: Record<OrderStatus, string> = {
  draft: 'القائمة لسه بتتجهّز',
  sent: 'القائمة اتبعتت للمشتري',
  shopping: 'المشوار شغال',
  done: 'المشوار خلص',
};

const EVENT_LABELS: Record<OrderEvent, string> = {
  send: 'ابعت القائمة للمشتري',
  recall: 'رجّع القائمة للتعديل',
  start: 'ابدأ المشوار',
  finish: 'خلّصت المشوار',
  reopen: 'افتح القائمة من جديد',
};

const PRIMARY_EVENTS: readonly OrderEvent[] = ['send', 'start', 'finish'];

type OrderBannerProps = {
  /** This week's items, deleted ones already left out. */
  items: readonly ListItem[];
};

/** Where this week's list stands between the one who writes it and the one who buys it. */
export function OrderBanner({ items }: OrderBannerProps) {
  const role = useStore((state) => state.role);
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const orders = useStore((state) => state.orders);
  const isLinked = useStore((state) => state.household !== null);
  const applyOrderEvent = useStore((state) => state.applyOrderEvent);
  const styles = useStyles();

  const status = orders[currentWeekStart(weekStartsOn)] ?? 'draft';
  // On a phone that is not linked to a household, one person plays both roles.
  const roles = isLinked ? [role] : ROLES;
  const events = [...new Set(roles.flatMap((each) => availableEvents(status, each)))];
  const summary = summarizeTrip(items);
  const toBuy = items.filter((item) => !item.bought).length;

  // An empty list has nothing to hand over, and a list being written by the shopper needs no banner.
  if (items.length === 0 || (status === 'draft' && events.length === 0)) return null;

  const handle = (event: OrderEvent): void => {
    if (!applyOrderEvent(event)) showToast('الخطوة دي مش متاحة لدورك دلوقتي');
  };

  return (
    <Tile>
      <Txt kind="title">{STATUS_TITLES[status]}</Txt>
      {status === 'draft' && <Txt>{`${toBuy} صنف جاهزين. لما تخلص ابعتها، وأي إضافة بعدها تتعلّم "مستعجل".`}</Txt>}
      {status === 'sent' && <Txt>{toBuy} صنف مستنيين المشوار.</Txt>}
      {status === 'shopping' && (
        <Txt>
          اتشترى {summary.boughtCount} من {items.length}، والمدفوع {formatSar(summary.paid)} ريال.
        </Txt>
      )}
      {status === 'done' && (
        <View style={styles.summary}>
          <Txt>
            اتشترى {summary.boughtCount} صنف بـ {formatSar(summary.paid)} ريال.
          </Txt>
          {summary.notFound.length > 0 && <Txt tone="tight">مش موجود: {summary.notFound.join('، ')}</Txt>}
          {summary.leftOver.length > 0 && <Txt>ما اتشتراش: {summary.leftOver.join('، ')}</Txt>}
        </View>
      )}
      {events.map((event) => (
        <Button
          key={event}
          kind={PRIMARY_EVENTS.includes(event) ? 'primary' : 'secondary'}
          label={EVENT_LABELS[event]}
          onPress={() => handle(event)}
        />
      ))}
      {events.length === 0 && <Txt kind="label">الخطوة الجاية عند الطرف التاني.</Txt>}
    </Tile>
  );
}

const useStyles = themed(() => ({
  summary: { gap: Spacing.one },
}));
