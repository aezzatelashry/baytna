import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Button, Chip, IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { RIYADH_STORES } from '@/data/riyadh-stores';
import { itemsToLookUp } from '@/domain/list-offers';
import type { Offer } from '@/domain/types';
import { toDateKey } from '@/domain/week';
import { useStore } from '@/store/store';
import { refreshListOffers } from '@/sync/list-offers';
import { isSyncConfigured } from '@/sync/sync';

const OPEN_ICON: IconName = { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' };
const REFRESH_ICON: IconName = { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' };

/** When the list's offers were last looked up, in the phone's own clock. */
function refreshedLabel(refreshedAt: string): string {
  if (refreshedAt === '') return 'لسه ما اتحدّثتش ولا مرة.';
  const at = new Date(refreshedAt);
  const isToday = toDateKey(at) === toDateKey(new Date());
  const time = at.toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
  return isToday ? `آخر تحديث النهارده ${time}` : `آخر تحديث ${toDateKey(at)} ${time}`;
}

type StoreOffersProps = {
  /** Names of the list items still to buy. */
  items: readonly string[];
  /** Saved offers that are still running. */
  offers: readonly Offer[];
};

type Progress = { status: 'idle' } | { status: 'busy'; done: number; total: number } | { status: 'failed'; message: string };

/**
 * Fills the saved offers for what is on the list: one web lookup per product that has
 * no running offer yet, once a day by itself or on demand. Below it, each big Riyadh
 * chain opens its current flyers.
 */
export function StoreOffers({ items, offers }: StoreOffersProps) {
  const isAuto = useStore((state) => state.autoOffers);
  const setAutoOffers = useStore((state) => state.setAutoOffers);
  const styles = useStyles();
  const [progress, setProgress] = useState<Progress>({ status: 'idle' });

  const refreshedAt = useStore((state) => state.offersRefreshedAt);
  const wantedCount = itemsToLookUp(items, offers).length;
  /** A forced refresh looks every list product up again, covered or not. */
  const allCount = itemsToLookUp(items, []).length;
  const isBusy = progress.status === 'busy';

  const handleRefresh = async (isForced: boolean): Promise<void> => {
    const total = isForced ? allCount : wantedCount;
    if (isBusy || total === 0) return;
    setProgress({ status: 'busy', done: 0, total });
    try {
      const saved = await refreshListOffers((done, of) => setProgress({ status: 'busy', done, total: of }), isForced);
      setProgress({ status: 'idle' });
      showToast(saved === 0 ? 'مفيش عروض جديدة لأصناف القائمة' : `اتحفظ ${saved} عرض لأصناف قائمتك`);
    } catch (caught: unknown) {
      // What was found before the failure is already saved.
      setProgress({ status: 'failed', message: caught instanceof Error ? caught.message : 'حصل خطأ غير متوقع' });
    }
  };

  return (
    <Tile>
      <View style={styles.head}>
        <Txt kind="title" style={styles.grow}>
          عروض المتاجر
        </Txt>
        {isSyncConfigured() && (
          <IconButton icon={REFRESH_ICON} label="حدّث عروض كل أصناف القائمة" onPress={() => void handleRefresh(true)} />
        )}
      </View>
      {isSyncConfigured() && (
        <>
          <Txt kind="label">{refreshedLabel(refreshedAt)}</Txt>
          <Txt>
            {wantedCount === 0
              ? 'كل أصناف قائمتك عليها عروض محفوظة، أو القائمة فاضية.'
              : `ندوّر في الويب عن عروض ${wantedCount} صنف من قائمتك ونحفظ اللي نلاقيه.`}
          </Txt>
          <Button
            kind="primary"
            label={isBusy ? `بيدوّر… ${progress.done} من ${progress.total}` : 'هات عروض قائمتي'}
            disabled={isBusy || wantedCount === 0}
            onPress={() => void handleRefresh(false)}
          />
          {isBusy && <Txt kind="label">كل صنف بياخد لحد دقيقة. سيب الشاشة مفتوحة.</Txt>}
          {progress.status === 'failed' && (
            <Txt kind="label" tone="over">
              {progress.message}
            </Txt>
          )}
          <View style={styles.chips}>
            <Chip label="كل يوم لوحده" selected={isAuto} onPress={() => setAutoOffers(true)} />
            <Chip label="لما أضغط بس" selected={!isAuto} onPress={() => setAutoOffers(false)} />
          </View>
          <Txt kind="label">
            {isAuto
              ? 'بيدوّر مرة في اليوم أول ما التطبيق يتفتح. كل صنف بيتحسب من رصيد البحث.'
              : 'مش هيدوّر غير لما تضغط الزرار.'}
          </Txt>
        </>
      )}
      <Txt kind="strong">منشورات الأسبوع</Txt>
      <Txt kind="label">افتح منشور المتجر، خد سكرين شوت للصفحة، وارجع اختاره من البطاقة اللي تحت.</Txt>
      {RIYADH_STORES.map((store) => (
        <View key={store.id} style={styles.store}>
          <Txt style={styles.grow}>{store.name}</Txt>
          <IconButton
            icon={OPEN_ICON}
            label={`افتح منشورات ${store.name}`}
            onPress={() => void Linking.openURL(store.flyersUrl).catch(() => showToast('الرابط ما اتفتحش'))}
          />
        </View>
      ))}
      <Txt kind="label">المنشورات بتتفتح من موقع D4D Online.</Txt>
    </Tile>
  );
}

const useStyles = themed((c) => ({
  head: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
  store: {
    flexDirection: RowDir,
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
  grow: { flex: 1 },
}));
