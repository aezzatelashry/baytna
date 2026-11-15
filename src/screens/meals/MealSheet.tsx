import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Button, Chip, Field, IconButton, Sheet, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { Radius, RowDir, Spacing, themed } from '@/constants/theme';
import { formatSar } from '@/domain/budget';
import { entryFor, estimateMealCost, membersExcludedFrom } from '@/domain/meals';
import { costPerPerson } from '@/domain/thrift';
import { MEAL_STYLE_LABELS, QUICK_MINUTES, SLOT_LABELS, type MealSlot } from '@/domain/types';
import { dayName } from '@/domain/week';
import { youtubeThumbnailUrl, youtubeVideoId, youtubeWatchUrl } from '@/domain/youtube';
import { allMeals, findMeal, useStore } from '@/store/store';
import { pickMealPhoto, type PhotoSource } from '@/sync/meal-photo';

const UNLINK_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };
const CAMERA_ICON: IconName = { ios: 'camera', android: 'photo_camera', web: 'photo_camera' };
const GALLERY_ICON: IconName = { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' };
const THUMB_RATIO = 16 / 9;

type MealSheetProps = {
  date: string;
  slot: MealSlot;
  days: readonly string[];
  isOpen: boolean;
  onClose: () => void;
};

/** Everything about one planned meal: change it, move it, lock it, favour it, link its video. */
export function MealSheet({ date, slot, days, isOpen, onClose }: MealSheetProps) {
  const plan = useStore((state) => state.plan);
  const members = useStore((state) => state.members);
  const customMeals = useStore((state) => state.customMeals);
  const favorites = useStore((state) => state.favorites);
  const mealVideos = useStore((state) => state.mealVideos);
  const priceBook = useStore((state) => state.priceBook);
  const setPlanMeal = useStore((state) => state.setPlanMeal);
  const togglePlanLock = useStore((state) => state.togglePlanLock);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const moveMeal = useStore((state) => state.moveMeal);
  const addMealToList = useStore((state) => state.addMealToList);
  const setMealVideo = useStore((state) => state.setMealVideo);
  const mealPhotos = useStore((state) => state.mealPhotos);
  const setMealPhoto = useStore((state) => state.setMealPhoto);
  const styles = useStyles();
  const [link, setLink] = useState('');
  const [linkProblem, setLinkProblem] = useState('');
  const [isQuickOnly, setIsQuickOnly] = useState(false);

  const entry = entryFor(plan, date, slot);
  const meal = entry ? findMeal(entry.mealId, customMeals) : undefined;
  if (!entry || !meal) return null;

  const options = allMeals(customMeals).filter((candidate) => candidate.slots.includes(slot));
  const excluded = membersExcludedFrom(meal, members).map((member) => member.name);
  const cost = estimateMealCost(meal, priceBook);
  const videoId = mealVideos[meal.id];
  const photo = mealPhotos[meal.id];
  const isFavorite = favorites.includes(meal.id);
  const isLocked = entry.locked === true;
  const shownOptions = isQuickOnly
    ? options.filter((option) => option.id === meal.id || (option.minutes ?? Number.POSITIVE_INFINITY) <= QUICK_MINUTES)
    : options;
  const perPerson = costPerPerson(cost.known, members.length);
  const facts = [
    meal.style ? MEAL_STYLE_LABELS[meal.style] : '',
    meal.minutes ? `حوالي ${meal.minutes} دقيقة` : '',
    meal.boxable ? 'تنفع بوكس تاني يوم' : '',
  ]
    .filter(Boolean)
    .join('، ');

  const handleLink = (): void => {
    const id = youtubeVideoId(link);
    if (id === null) return setLinkProblem('الرابط ده مش رابط فيديو يوتيوب.');
    setMealVideo(meal.id, id);
    setLink('');
    setLinkProblem('');
  };
  const handlePhoto = async (source: PhotoSource): Promise<void> => {
    const result = await pickMealPhoto(source, meal.id);
    if (result.status === 'picked') setMealPhoto(meal.id, result.uri);
    else if (result.status === 'denied') showToast('محتاجين إذن الكاميرا من إعدادات الموبايل.');
    else if (result.status === 'failed') showToast('الصورة ما اتحفظتش. جرّب تاني.');
  };
  const handleAddToList = (): void => {
    const added = addMealToList(meal.id);
    showToast(added === 0 ? 'كل مكونات الوجبة موجودة في القائمة' : `اتضاف ${added} صنف للقائمة`);
  };
  const handleMove = (toDate: string): void => {
    moveMeal(date, slot, toDate);
    showToast(`${meal.name} اتنقلت ليوم ${dayName(toDate)}`);
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={meal.name}>
      <Txt kind="label">
        {SLOT_LABELS[slot]} يوم {dayName(date)}
        {facts !== '' ? `، ${facts}` : ''}
      </Txt>

      {photo !== undefined && (
        <Image source={{ uri: photo }} accessibilityLabel={`صورة ${meal.name}`} contentFit="cover" style={styles.thumb} />
      )}
      <View style={styles.row}>
        <Txt kind="label" style={styles.grow}>
          {photo === undefined ? 'صوّروا الأكلة لما تطلع حلوة، وتفضل معاها.' : 'صورتكم، محفوظة على الموبايل ده بس.'}
        </Txt>
        <IconButton icon={CAMERA_ICON} label={`صوّر ${meal.name}`} onPress={() => void handlePhoto('camera')} />
        <IconButton icon={GALLERY_ICON} label={`اختار صورة ${meal.name} من الاستوديو`} onPress={() => void handlePhoto('library')} />
        {photo !== undefined && (
          <IconButton icon={UNLINK_ICON} label="شيل الصورة" tone="danger" onPress={() => setMealPhoto(meal.id, null)} />
        )}
      </View>

      {videoId !== undefined && (
        <View style={styles.video}>
          <Image
            source={{ uri: youtubeThumbnailUrl(videoId) }}
            accessibilityLabel={`صورة فيديو ${meal.name}`}
            contentFit="cover"
            style={styles.thumb}
          />
          <View style={styles.row}>
            <Txt kind="label" style={styles.grow}>
              المصدر: يوتيوب
            </Txt>
            <IconButton icon={UNLINK_ICON} label="شيل الفيديو" tone="danger" onPress={() => setMealVideo(meal.id, null)} />
          </View>
          <Button kind="primary" label="افتح في يوتيوب" onPress={() => void Linking.openURL(youtubeWatchUrl(videoId))} />
        </View>
      )}

      <View style={styles.chips}>
        <Chip label={isFavorite ? 'في المفضلة' : 'ضيفها للمفضلة'} selected={isFavorite} onPress={() => toggleFavorite(meal.id)} />
        <Chip label={isLocked ? 'مقفولة في الخطة' : 'اقفلها في الخطة'} selected={isLocked} onPress={() => togglePlanLock(date, slot)} />
      </View>

      {excluded.length > 0 && (
        <Txt kind="label" tone="tight">
          مش مناسبة لـ {excluded.join(' و')}
        </Txt>
      )}
      <Txt kind="label">
        {cost.known > 0 ? `تكلفة تقريبية من أسعاركم: ${formatSar(cost.known)} ريال` : 'لسه مفيش أسعار مسجلة لمكوناتها'}
        {cost.known > 0 && cost.unknownCount > 0 ? `، و${cost.unknownCount} مكون من غير سعر` : ''}.
        {cost.known > 0 && perPerson !== null ? ` يعني ${formatSar(perPerson)} ريال للفرد.` : ''}
      </Txt>
      <Button label="أضف مكوناتها للقائمة" onPress={handleAddToList} />

      <Txt kind="strong">بدّلها بـ</Txt>
      <Chip label={`أكلات ${QUICK_MINUTES} دقيقة بس`} selected={isQuickOnly} onPress={() => setIsQuickOnly(!isQuickOnly)} />
      <View style={styles.chips}>
        {shownOptions.map((option) => (
          <Chip
            key={option.id}
            label={option.name}
            selected={option.id === meal.id}
            onPress={() => setPlanMeal(date, slot, option.id)}
          />
        ))}
      </View>

      <Txt kind="strong">انقلها ليوم</Txt>
      <View style={styles.chips}>
        {days
          .filter((day) => day !== date)
          .map((day) => (
            <Chip key={day} label={dayName(day)} selected={false} onPress={() => handleMove(day)} />
          ))}
      </View>

      {videoId === undefined && (
        <>
          <Field label="رابط فيديو الطريقة على يوتيوب" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" />
          {linkProblem !== '' && (
            <Txt kind="label" tone="over">
              {linkProblem}
            </Txt>
          )}
          <Button label="اربط الفيديو بالوجبة" onPress={handleLink} disabled={link.trim() === ''} />
        </>
      )}
    </Sheet>
  );
}

const useStyles = themed(() => ({
  video: { gap: Spacing.two },
  thumb: { width: '100%', aspectRatio: THUMB_RATIO, borderRadius: Radius.control },
  row: { flexDirection: RowDir, alignItems: 'center' },
  grow: { flex: 1 },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
}));
