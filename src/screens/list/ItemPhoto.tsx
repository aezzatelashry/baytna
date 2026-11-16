import { Image } from 'expo-image';
import { View } from 'react-native';

import { IconButton, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { Radius, RowDir, Spacing, themed } from '@/constants/theme';
import { normalizeName } from '@/domain/budget';
import { useStore } from '@/store/store';
import { pickMealPhoto, type PhotoSource } from '@/sync/meal-photo';

const REMOVE_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };
const CAMERA_ICON: IconName = { ios: 'camera', android: 'photo_camera', web: 'photo_camera' };
const GALLERY_ICON: IconName = { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' };
const PHOTO_HEIGHT = 180;

/** The photo saved for a product, whatever week or spelling of spaces it was added with. */
export function useItemPhoto(itemName: string): string | undefined {
  return useStore((state) => state.itemPhotos[normalizeName(itemName)]);
}

type ItemPhotoProps = {
  itemName: string;
};

/** "Get exactly this one": a photo of the pack, so whoever shops picks the right brand and size. */
export function ItemPhoto({ itemName }: ItemPhotoProps) {
  const photo = useItemPhoto(itemName);
  const setItemPhoto = useStore((state) => state.setItemPhoto);
  const styles = useStyles();

  const handlePick = async (source: PhotoSource): Promise<void> => {
    const result = await pickMealPhoto(source, `item-${normalizeName(itemName)}`);
    if (result.status === 'picked') setItemPhoto(itemName, result.uri);
    else if (result.status === 'denied') showToast('محتاجين إذن الكاميرا من إعدادات الموبايل.');
    else if (result.status === 'failed') showToast('الصورة ما اتحفظتش. جرّب تاني.');
  };

  return (
    <View style={styles.block}>
      {photo !== undefined && (
        <Image source={{ uri: photo }} accessibilityLabel={`صورة ${itemName}`} contentFit="cover" style={styles.photo} />
      )}
      <View style={styles.row}>
        <Txt kind="label" style={styles.grow}>
          {photo === undefined ? 'صوّر النوع المطلوب بالظبط، عشان اللي يشتري يجيبه هو.' : 'الصورة محفوظة على الموبايل ده بس.'}
        </Txt>
        <IconButton icon={CAMERA_ICON} label={`صوّر ${itemName}`} onPress={() => void handlePick('camera')} />
        <IconButton icon={GALLERY_ICON} label={`اختار صورة ${itemName} من الاستوديو`} onPress={() => void handlePick('library')} />
        {photo !== undefined && (
          <IconButton icon={REMOVE_ICON} label={`شيل صورة ${itemName}`} tone="danger" onPress={() => setItemPhoto(itemName, null)} />
        )}
      </View>
    </View>
  );
}

const useStyles = themed(() => ({
  block: { gap: Spacing.two },
  row: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.one },
  grow: { flex: 1 },
  photo: { width: '100%', height: PHOTO_HEIGHT, borderRadius: Radius.control },
}));
