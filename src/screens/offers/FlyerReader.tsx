import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { formatSar } from '@/domain/budget';
import { flyerToOffers, type FlyerReading } from '@/domain/flyer';
import { toDateKey } from '@/domain/week';
import { useStore } from '@/store/store';
import { pickFlyer } from '@/sync/flyer-photo';
import type { PhotoSource } from '@/sync/meal-photo';
import { isSyncConfigured, readFlyer } from '@/sync/sync';

const CAMERA_ICON: IconName = { ios: 'camera', android: 'photo_camera', web: 'photo_camera' };
const GALLERY_ICON: IconName = { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' };
const DROP_ICON: IconName = { ios: 'xmark', android: 'close', web: 'close' };

type ReadState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; reading: FlyerReading }
  | { status: 'failed'; message: string };

/** Photograph a shop's flyer; the server reads the offers and the family reviews them before anything is saved. */
export function FlyerReader() {
  const addOffers = useStore((state) => state.addOffers);
  const styles = useStyles();
  const [state, setState] = useState<ReadState>({ status: 'idle' });
  const [store, setStore] = useState('');

  if (!isSyncConfigured()) return null;

  const isBusy = state.status === 'busy';
  const handlePick = async (source: PhotoSource): Promise<void> => {
    if (isBusy) return;
    const photo = await pickFlyer(source);
    if (photo.status === 'cancelled') return;
    if (photo.status === 'denied') return showToast('محتاجين إذن الكاميرا من إعدادات الموبايل.');
    if (photo.status === 'failed') return setState({ status: 'failed', message: 'الصورة ما اتقرتش من الموبايل. جرّب تاني.' });
    setState({ status: 'busy' });
    try {
      const reading = await readFlyer(photo.base64, photo.mediaType, toDateKey(new Date()));
      setStore(reading.store ?? '');
      setState({ status: 'done', reading });
    } catch (caught: unknown) {
      setState({ status: 'failed', message: caught instanceof Error ? caught.message : 'حصل خطأ غير متوقع' });
    }
  };

  const handleDrop = (index: number): void => {
    setState((current) =>
      current.status === 'done'
        ? { status: 'done', reading: { ...current.reading, offers: current.reading.offers.filter((_, each) => each !== index) } }
        : current,
    );
  };
  const handleSave = (reading: FlyerReading): void => {
    const offers = flyerToOffers(reading, store);
    if (offers.length === 0) return;
    addOffers(offers);
    showToast(`اتحفظ ${offers.length} عرض من ${store.trim()}`);
    setState({ status: 'idle' });
    setStore('');
  };

  const reading = state.status === 'done' ? state.reading : null;

  return (
    <Tile>
      <View style={styles.head}>
        <Txt kind="title" style={styles.grow}>
          صوّر منشور العروض
        </Txt>
        <IconButton icon={CAMERA_ICON} label="صوّر منشور العروض" onPress={() => void handlePick('camera')} />
        <IconButton icon={GALLERY_ICON} label="اختار صورة منشور من الاستوديو" onPress={() => void handlePick('library')} />
      </View>
      {state.status === 'idle' && <Txt>صوّر ورقة عروض المتجر أو اختار سكرين شوت، والعروض تتقري وتراجعها قبل الحفظ.</Txt>}
      {isBusy && <Txt kind="label">بيقرا المنشور… ممكن ياخد لحد دقيقة.</Txt>}
      {state.status === 'failed' && (
        <Txt kind="label" tone="over">
          {state.message}
        </Txt>
      )}
      {reading !== null && reading.offers.length === 0 && (
        <Txt>ما اتقراش أي عرض واضح من الصورة. صوّرها من قريب وفي نور كويس.</Txt>
      )}
      {reading !== null && reading.offers.length > 0 && (
        <>
          <Field label="اسم المتجر" value={store} onChangeText={setStore} />
          {reading.validUntil !== null && <Txt kind="label">العروض لحد {reading.validUntil}</Txt>}
          {reading.offers.map((offer, index) => (
            <View key={`${offer.name}-${offer.price}`} style={styles.row}>
              <View style={styles.grow}>
                <Txt kind="strong">{offer.name}</Txt>
                {offer.packQty > 1 && <Txt kind="label">{offer.packQty} حبة</Txt>}
              </View>
              <Txt kind="strong">{formatSar(offer.price)} ريال</Txt>
              <IconButton icon={DROP_ICON} label={`شيل ${offer.name} من المراجعة`} onPress={() => handleDrop(index)} />
            </View>
          ))}
          <Txt kind="label">راجع الأسعار على الصورة: القراءة ممكن تغلط في رقم.</Txt>
          <Button
            kind="primary"
            label={`احفظ ${reading.offers.length} عرض`}
            disabled={store.trim() === ''}
            onPress={() => handleSave(reading)}
          />
        </>
      )}
    </Tile>
  );
}

const useStyles = themed((c) => ({
  head: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.one },
  grow: { flex: 1 },
  row: {
    flexDirection: RowDir,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
}));
