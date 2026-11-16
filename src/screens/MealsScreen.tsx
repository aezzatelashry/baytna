import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Chip, Icon, IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { Font, MIN_TOUCH, Radius, RowDir, Rule, Size, Spacing, themed, usePalette } from '@/constants/theme';
import { DESSERTS, type Dessert } from '@/data/desserts';
import { formatSar } from '@/domain/budget';
import { entryFor, membersExcludedFrom } from '@/domain/meals';
import { mealCostWithOffers } from '@/domain/prices';
import { SLOT_LABELS, SLOTS, type Meal, type MealSlot } from '@/domain/types';
import { dayName, fromDateKey, toDateKey, weekDays } from '@/domain/week';
import { youtubeThumbnailUrl } from '@/domain/youtube';
import { currentWeekStart, findMeal, useStore } from '@/store/store';

import { CookFromHave } from './meals/CookFromHave';
import { MealSheet } from './meals/MealSheet';
import { NewMealSheet } from './meals/NewMealSheet';
import { GuestsPicker, LeftoversPicker, RhythmPicker, SharedIngredients } from './meals/WeekExtras';
import { WorkBox } from './meals/WorkBox';

const CART_ICON: IconName = { ios: 'cart.badge.plus', android: 'add_shopping_cart', web: 'add_shopping_cart' };
const LOCK_ICON: IconName = { ios: 'lock.fill', android: 'lock', web: 'lock' };
const STAR_ICON: IconName = { ios: 'star.fill', android: 'star', web: 'star' };
const DELETE_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };
const EDIT_ICON: IconName = { ios: 'pencil', android: 'edit', web: 'edit' };
const SWAP_ICON: IconName = { ios: 'arrow.triangle.2.circlepath', android: 'autorenew', web: 'autorenew' };
const DAY_HEIGHT = 64;
const THUMB_SIZE = 56;
const BADGE_SIZE = 18;

type MealsScreenProps = {
  /** The "new dish" sheet is opened by the floating button in the shell. */
  isAddingMeal: boolean;
  onCloseAddMeal: () => void;
  /** Tells the shell when the work box is showing, so "add a home dish" is not offered there. */
  onWorkView: (isWork: boolean) => void;
};

export function MealsScreen({ isAddingMeal, onCloseAddMeal, onWorkView }: MealsScreenProps) {
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const plan = useStore((state) => state.plan);
  const generatePlan = useStore((state) => state.generatePlan);
  const customMeals = useStore((state) => state.customMeals);
  const styles = useStyles();

  const days = weekDays(currentWeekStart(weekStartsOn));
  const today = toDateKey(new Date());
  const [picked, setPicked] = useState(days.includes(today) ? today : days[0]);
  const [openSlot, setOpenSlot] = useState<MealSlot | null>(null);
  const [view, setView] = useState<'home' | 'work' | 'have'>('home');
  const selected = days.includes(picked) ? picked : days[0];
  const weekEntries = plan.filter((entry) => !entry.deleted && days.includes(entry.date));
  const hasPlan = weekEntries.length > 0;
  // Each planned meal once, however many times it is served.
  const weekMeals = [...new Set(weekEntries.map((entry) => entry.mealId))].flatMap(
    (id) => findMeal(id, customMeals) ?? [],
  );

  useEffect(() => onWorkView(view !== 'home'), [view, onWorkView]);

  return (
    <View style={styles.screen}>
      <Txt kind="head">وجبات الأسبوع</Txt>
      <View accessibilityRole="tablist" style={styles.days}>
        <Chip label="أكل البيت" selected={view === 'home'} onPress={() => setView('home')} />
        <Chip label="بوكس الشغل" selected={view === 'work'} onPress={() => setView('work')} />
        <Chip label="من الموجود" selected={view === 'have'} onPress={() => setView('have')} />
      </View>

      {view === 'have' ? (
        <CookFromHave />
      ) : view === 'work' ? (
        <WorkBox />
      ) : hasPlan ? (
        <>
          <View accessibilityRole="tablist" style={styles.days}>
            {days.map((date) => (
              <DayPill
                key={date}
                date={date}
                isSelected={date === selected}
                isToday={date === today}
                onPress={() => setPicked(date)}
              />
            ))}
          </View>

          <Animated.View key={selected} entering={FadeIn}>
            <Tile>
              <Txt kind="title">{dayName(selected)}</Txt>
              {SLOTS.map((slot) => (
                <MealSlotRow key={slot} date={selected} slot={slot} onOpen={() => setOpenSlot(slot)} />
              ))}
            </Tile>
          </Animated.View>

          <Button label="خطة تانية للأسبوع كله" onPress={generatePlan} />
          <Txt kind="label">الوجبات المقفولة بتفضل مكانها، والمفضلة بتيجي الأول.</Txt>

          {openSlot !== null && (
            <MealSheet date={selected} slot={openSlot} days={days} isOpen onClose={() => setOpenSlot(null)} />
          )}
        </>
      ) : (
        <Tile>
          <Txt kind="title">لسه مفيش خطة</Txt>
          <Txt>يوم لحم، يوم سمك، يومين دجاج، والباقي أكل بيت اقتصادي. وتقدر تبدّل أي وجبة بعد كده.</Txt>
          <Button kind="primary" label="اعمل خطة الأسبوع" onPress={generatePlan} />
        </Tile>
      )}

      {view === 'home' && hasPlan && <SharedIngredients meals={weekMeals} />}
      {view === 'home' && <RhythmPicker />}
      {view === 'home' && <LeftoversPicker days={days} />}
      {view === 'home' && <GuestsPicker />}
      {view === 'home' && <OurMeals />}
      {view === 'home' && <Sweets />}
      <NewMealSheet isOpen={isAddingMeal} onClose={onCloseAddMeal} />
    </View>
  );
}

/** The dishes the family added, with a way to take one out again. */
function OurMeals() {
  const customMeals = useStore((state) => state.customMeals);
  const removeCustomMeal = useStore((state) => state.removeCustomMeal);
  const restoreCustomMeal = useStore((state) => state.restoreCustomMeal);
  const styles = useStyles();
  const [editing, setEditing] = useState<Meal | null>(null);

  const handleRemove = (meal: Meal): void => {
    removeCustomMeal(meal.id);
    showToast(`اتشالت "${meal.name}" من أكلاتكم`, () => restoreCustomMeal(meal));
  };

  return (
    <Tile>
      <Txt kind="title">أكلاتنا</Txt>
      {customMeals.length === 0 && <Txt>اضغط علامة الزائد وضيف أكلة من أكلات البيت، وهتدخل في الخطة الجاية.</Txt>}
      {customMeals.map((meal) => (
        <View key={meal.id} style={styles.slot}>
          <View style={styles.grow}>
            <Txt kind="strong">{meal.name}</Txt>
            <Txt kind="label">
              {meal.slots.map((slot) => SLOT_LABELS[slot]).join('، ')}، {meal.ingredients.length} مكون
            </Txt>
          </View>
          <IconButton icon={EDIT_ICON} label={`عدّل ${meal.name}`} onPress={() => setEditing(meal)} />
          <IconButton icon={DELETE_ICON} label={`احذف ${meal.name}`} tone="danger" onPress={() => handleRemove(meal)} />
        </View>
      ))}
      {editing !== null && <NewMealSheet key={editing.id} isOpen editing={editing} onClose={() => setEditing(null)} />}
    </Tile>
  );
}

/** Home sweets and fruit dishes: pick one and its ingredients go on the list, inside the same budget. */
function Sweets() {
  const addIngredientsToList = useStore((state) => state.addIngredientsToList);
  const nextWeekSweet = useStore((state) => state.nextWeekSweet);
  const sweetId = useStore((state) => state.weekSweets[currentWeekStart(state.weekStartsOn)]);
  const styles = useStyles();
  // Chosen when the week's plan is made; absent until then.
  const weekSweet = DESSERTS.find((dessert) => dessert.id === sweetId);

  const handleAdd = (dessert: Dessert): void => {
    const added = addIngredientsToList(dessert.ingredients);
    showToast(added === 0 ? `مكونات ${dessert.name} موجودة في القائمة` : `اتضاف ${added} صنف لـ ${dessert.name}`);
  };

  return (
    <Tile>
      <Txt kind="title">حلو وفاكهة</Txt>
      <Txt>حلويات بيت بسيطة وطرق تستخدم بيها الفاكهة قبل ما تبوظ. مكوناتها بتتحسب من ميزانية الأسبوع.</Txt>
      {weekSweet !== undefined && (
        <View style={styles.slot}>
          <View style={styles.grow}>
            <Txt kind="label">حلو الأسبوع ده</Txt>
            <Txt kind="strong">{weekSweet.name}</Txt>
          </View>
          <IconButton icon={SWAP_ICON} label="غيّر حلو الأسبوع" onPress={nextWeekSweet} />
          <IconButton icon={CART_ICON} label={`أضف مكونات ${weekSweet.name} للقائمة`} onPress={() => handleAdd(weekSweet)} />
        </View>
      )}
      {DESSERTS.map((dessert) => (
        <View key={dessert.id} style={styles.slot}>
          <View style={styles.grow}>
            <Txt kind="strong">{dessert.name}</Txt>
            <Txt kind="label">{dessert.note}</Txt>
          </View>
          <IconButton icon={CART_ICON} label={`أضف مكونات ${dessert.name} للقائمة`} onPress={() => handleAdd(dessert)} />
        </View>
      ))}
    </Tile>
  );
}

type DayPillProps = {
  date: string;
  isSelected: boolean;
  isToday: boolean;
  onPress: () => void;
};

/** One day in the week strip: short name over the day of the month. */
function DayPill({ date, isSelected, isToday, onPress }: DayPillProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={`${dayName(date)} ${fromDateKey(date).getDate()}${isToday ? '، النهارده' : ''}`}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[styles.day, isToday && styles.dayToday, isSelected && styles.daySelected]}>
      <Txt kind="label" style={[styles.dayText, isSelected && styles.dayTextSelected]}>
        {dayName(date).replace(/^ال/, '')}
      </Txt>
      <Txt kind="strong" style={[styles.dayText, isSelected && styles.dayTextSelected]}>
        {fromDateKey(date).getDate()}
      </Txt>
    </Pressable>
  );
}

type MealSlotRowProps = {
  date: string;
  slot: MealSlot;
  onOpen: () => void;
};

function MealSlotRow({ date, slot, onOpen }: MealSlotRowProps) {
  const plan = useStore((state) => state.plan);
  const members = useStore((state) => state.members);
  const customMeals = useStore((state) => state.customMeals);
  const favorites = useStore((state) => state.favorites);
  const mealVideos = useStore((state) => state.mealVideos);
  const mealPhotos = useStore((state) => state.mealPhotos);
  const priceBook = useStore((state) => state.priceBook);
  const offers = useStore((state) => state.offers);
  const addMealToList = useStore((state) => state.addMealToList);
  const styles = useStyles();
  const palette = usePalette();

  const entry = entryFor(plan, date, slot);
  const meal = entry ? findMeal(entry.mealId, customMeals) : undefined;
  if (!entry || !meal) return null;

  // The family's own photo of the dish wins over the video still.
  const photo = mealPhotos[meal.id];
  const offerSaving = mealCostWithOffers(meal, priceBook, offers, toDateKey(new Date())).saving;

  const excluded = membersExcludedFrom(meal, members).map((member) => member.name);
  const videoId = mealVideos[meal.id];
  const isLocked = entry.locked === true;
  const isFavorite = favorites.includes(meal.id);
  const state = [isLocked ? 'مقفولة' : '', isFavorite ? 'مفضلة' : ''].filter(Boolean).join('، ');

  const handleAdd = (): void => {
    const added = addMealToList(meal.id);
    showToast(added === 0 ? 'كل مكونات الوجبة موجودة في القائمة' : `اتضاف ${added} صنف للقائمة`);
  };

  return (
    <View style={styles.slot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${SLOT_LABELS[slot]}: ${meal.name}${state === '' ? '' : `، ${state}`}، افتح`}
        onPress={onOpen}
        style={styles.slotBody}>
        {photo !== undefined ? (
          <Image source={{ uri: photo }} contentFit="cover" style={styles.thumb} />
        ) : (
          videoId !== undefined && <Image source={{ uri: youtubeThumbnailUrl(videoId) }} contentFit="cover" style={styles.thumb} />
        )}
        <View style={styles.grow}>
          <Txt kind="label">{SLOT_LABELS[slot]}</Txt>
          <Txt kind="strong">{meal.name}</Txt>
          {offerSaving > 0 && <Txt kind="label">عليها عروض بتوفّر {formatSar(offerSaving)} ريال</Txt>}
          {excluded.length > 0 && (
            <Txt kind="label" tone="tight">
              مش مناسبة لـ {excluded.join(' و')}
            </Txt>
          )}
        </View>
        {isFavorite && <Icon name={STAR_ICON} color={palette.accent} size={BADGE_SIZE} />}
        {isLocked && <Icon name={LOCK_ICON} color={palette.brand} size={BADGE_SIZE} />}
      </Pressable>
      {meal.ingredients.length > 0 && (
        <IconButton icon={CART_ICON} label={`أضف مكونات ${meal.name} للقائمة`} onPress={handleAdd} />
      )}
    </View>
  );
}

const useStyles = themed((c) => ({
  screen: { gap: Spacing.four },
  grow: { flex: 1 },
  days: { flexDirection: RowDir, gap: Spacing.one },
  day: {
    flex: 1,
    height: DAY_HEIGHT,
    borderRadius: Radius.control,
    backgroundColor: c.paper2,
    borderWidth: Rule.bar,
    borderColor: c.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: { borderColor: c.brand },
  daySelected: { backgroundColor: c.brand, borderColor: c.brand },
  dayText: { textAlign: 'center', fontFamily: Font.strong, fontSize: Size.tab, color: c.ink },
  dayTextSelected: { color: c.brandInk },
  slot: {
    flexDirection: RowDir,
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingVertical: Spacing.two,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
  slotBody: { flex: 1, flexDirection: RowDir, alignItems: 'center', gap: Spacing.two, minHeight: MIN_TOUCH },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Radius.control },
}));
