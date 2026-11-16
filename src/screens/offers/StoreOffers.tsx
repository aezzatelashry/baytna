import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Button, IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { RIYADH_STORES } from '@/data/riyadh-stores';
import { itemsToLookUp, newOffersOnly } from '@/domain/list-offers';
import type { Offer } from '@/domain/types';
import { useStore } from '@/store/store';
import { isSyncConfigured, searchPrices } from '@/sync/sync';

const OPEN_ICON: IconName = { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' };

type StoreOffersProps = {
  /** Names of the list items still to buy. */
  items: readonly string[];
  /** Saved offers that are still running. */
  offers: readonly Offer[];
};

type Progress = { status: 'idle' } | { status: 'busy'; done: number; total: number } | { status: 'failed'; message: string };

/**
 * Fills the saved offers for what is on the list: one web lookup per product that has
 * no running offer yet. Below it, each big Riyadh chain opens its current flyers.
 */
export function StoreOffers({ items, offers }: StoreOffersProps) {
  const addOffers = useStore((state) => state.addOffers);
  const styles = useStyles();
  const [progress, setProgress] = useState<Progress>({ status: 'idle' });

  const wanted = itemsToLookUp(items, offers);
  const isBusy = progress.status === 'busy';

  const handleRefresh = async (): Promise<void> => {
    if (isBusy || wanted.length === 0) return;
    let saved = 0;
    try {
      for (const [index, item] of wanted.entries()) {
        setProgress({ status: 'busy', done: index, total: wanted.length });
        const fresh = newOffersOnly(await searchPrices(item), useStore.getState().offers);
        if (fresh.length > 0) addOffers(fresh);
        saved += fresh.length;
      }
      setProgress({ status: 'idle' });
      showToast(saved === 0 ? 'ما لقيناش عروض موثوقة لأصناف القائمة' : `اتحفظ ${saved} عرض لأصناف قائمتك`);
    } catch (caught: unknown) {
      // What was found before the failure is already saved.
      setProgress({ status: 'failed', message: caught instanceof Error ? caught.message : 'حصل خطأ غير متوقع' });
    }
  };

  return (
    <Tile>
      <Txt kind="title">عروض المتاجر</Txt>
      {isSyncConfigured() && (
        <>
          <Txt>
            {wanted.length === 0
              ? 'كل أصناف قائمتك عليها عروض محفوظة، أو القائمة فاضية.'
              : `ندوّر في الويب عن عروض ${wanted.length} صنف من قائمتك ونحفظ اللي نلاقيه.`}
          </Txt>
          <Button
            kind="primary"
            label={isBusy ? `بيدوّر… ${progress.done} من ${progress.total}` : 'هات عروض قائمتي'}
            disabled={isBusy || wanted.length === 0}
            onPress={() => void handleRefresh()}
          />
          {isBusy && <Txt kind="label">كل صنف بياخد لحد دقيقة. سيب الشاشة مفتوحة.</Txt>}
          {progress.status === 'failed' && (
            <Txt kind="label" tone="over">
              {progress.message}
            </Txt>
          )}
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
  store: {
    flexDirection: RowDir,
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
  grow: { flex: 1 },
}));
