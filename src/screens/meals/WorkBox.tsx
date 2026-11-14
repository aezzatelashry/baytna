import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Chip, Field, Sheet, Tile, Txt } from '@/components/kit';
import { showToast } from '@/components/toast';
import { MIN_TOUCH, RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { WORK_MEALS, workMealById } from '@/data/work-meals';
import { formatSar, parsePrice } from '@/domain/budget';
import { entryFor } from '@/domain/meals';
import type { Meal } from '@/domain/types';
import { dayName, fromDateKey, toDateKey, weekDays } from '@/domain/week';
import {
  COMFORT_LABELS,
  COMFORTS,
  homeBoxId,
  homeLunchForBox,
  homeMealIdOf,
  prepList,
  safeWorkMeals,
  suspectIngredients,
  WORK_BUDGET_LABELS,
  WORK_BUDGET_MODES,
  WORK_KIND_LABELS,
  WORK_SLOT_LABELS,
  WORK_SLOTS,
  workDaysOf,
  type WorkSlot,
} from '@/domain/workbox';
import { currentWeekStart, findMeal, useStore } from '@/store/store';

const DAY_MS = 24 * 60 * 60 * 1000;

/** What is in a work slot, whether a packed-meal idea or a portion of the family's own lunch. */
function describePacked(id: string | undefined, customMeals: readonly Meal[]): { name: string; kind: string } | null {
  if (id === undefined) return null;
  const homeId = homeMealIdOf(id);
  if (homeId !== null) {
    const meal = findMeal(homeId, customMeals);
    return meal ? { name: `${meal.name} (من غدا البيت)`, kind: 'نصيب زيادة' } : null;
  }
  const meal = workMealById(id);
  return meal ? { name: meal.name, kind: WORK_KIND_LABELS[meal.kind] } : null;
}

/** The packed day at work: who it is for, the week's boxes, how each one sat, and what it costs. */
export function WorkBox() {
  const members = useStore((state) => state.members);
  const eaterId = useStore((state) => state.workEaterId);
  const hasMicrowave = useStore((state) => state.workHasMicrowave);
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const workWeeks = useStore((state) => state.workWeeks);
  const setWorkEater = useStore((state) => state.setWorkEater);
  const setWorkHasMicrowave = useStore((state) => state.setWorkHasMicrowave);
  const generateWorkWeek = useStore((state) => state.generateWorkWeek);
  const addWorkWeekToList = useStore((state) => state.addWorkWeekToList);
  const setWorkMeal = useStore((state) => state.setWorkMeal);
  const plan = useStore((state) => state.plan);
  const customMeals = useStore((state) => state.customMeals);
  const styles = useStyles();

  const weekStart = currentWeekStart(weekStartsOn);
  const days = workDaysOf(weekDays(weekStart));
  const today = toDateKey(new Date());
  const [picked, setPicked] = useState(days.includes(today) ? today : days[0]);
  const [openSlot, setOpenSlot] = useState<WorkSlot | null>(null);
  const week = workWeeks[weekStart];
  const eater = members.find((member) => member.id === eaterId);
  const safe = safeWorkMeals(WORK_MEALS, eater, hasMicrowave);
  const day = week?.[picked] ?? {};
  // Yesterday's home lunch can ride along today, if it keeps and has nothing avoided at work.
  const dayBefore = toDateKey(new Date(fromDateKey(picked).getTime() - DAY_MS));
  const lunchBefore = entryFor(plan, dayBefore, 'lunch');
  const fromHome = homeLunchForBox(lunchBefore ? findMeal(lunchBefore.mealId, customMeals) : undefined, eater);
  const prep = week ? prepList(week, WORK_MEALS) : [];

  const handleAddToList = (): void => {
    const added = addWorkWeekToList();
    showToast(added === 0 ? 'كل مشتريات البوكس موجودة في القائمة' : `اتضاف ${added} صنف للقائمة`);
  };

  return (
    <View style={styles.block}>
      <Tile>
        <Txt kind="title">البوكس لمين؟</Txt>
        {members.length === 0 ? (
          <Txt>أضف أفراد البيت وممنوعاتهم من الإعدادات الأول، عشان البوكس يتظبط على صاحبه.</Txt>
        ) : (
          <View style={styles.chips}>
            {members.map((member) => (
              <Chip
                key={member.id}
                label={member.name}
                selected={member.id === eaterId}
                onPress={() => setWorkEater(member.id === eaterId ? null : member.id)}
              />
            ))}
          </View>
        )}
        <Chip label="في الشغل ميكروويف" selected={hasMicrowave} onPress={() => setWorkHasMicrowave(!hasMicrowave)} />
        <Txt kind="label">
          {safe.length} أكلة مناسبة من {WORK_MEALS.length}
          {eater ? ` لـ ${eater.name}` : ''}. الباقي فيه حاجة ممنوعة{hasMicrowave ? '' : ' أو محتاج تسخين'}.
        </Txt>
      </Tile>

      {week === undefined ? (
        <Tile>
          <Txt kind="title">لسه مفيش بوكسات للأسبوع</Txt>
          <Txt>لكل يوم شغل: فطار، غدا، وسناك. خفيف ومشبع وبيتاكل بارد.</Txt>
          <Button kind="primary" label="جهّز بوكسات الأسبوع" onPress={generateWorkWeek} />
        </Tile>
      ) : (
        <>
          <View accessibilityRole="tablist" style={styles.chips}>
            {days.map((date) => (
              <Chip key={date} label={dayName(date)} selected={date === picked} onPress={() => setPicked(date)} />
            ))}
          </View>
          <Tile>
            <Txt kind="title">بوكس {dayName(picked)}</Txt>
            {WORK_SLOTS.map((slot) => {
              const packed = describePacked(day[slot], customMeals);
              return (
                <Pressable
                  key={slot}
                  accessibilityRole="button"
                  accessibilityLabel={`${WORK_SLOT_LABELS[slot]}: ${packed?.name ?? 'فاضي'}، افتح`}
                  onPress={() => setOpenSlot(slot)}
                  style={styles.slot}>
                  <Txt kind="label">
                    {WORK_SLOT_LABELS[slot]}
                    {packed ? `، ${packed.kind}` : ''}
                  </Txt>
                  <Txt kind="strong">{packed?.name ?? 'مفيش حاجة مناسبة للخانة دي'}</Txt>
                </Pressable>
              );
            })}
            {fromHome && day.lunch !== homeBoxId(fromHome.id) && (
              <View style={styles.fromHome}>
                <Txt kind="label">
                  غدا البيت يوم {dayName(dayBefore)} كان {fromHome.name}، وبينفع بوكس. اطبخوا منه نصيب زيادة.
                </Txt>
                <Button label="خده غدا الشغل" onPress={() => setWorkMeal(picked, 'lunch', homeBoxId(fromHome.id))} />
              </View>
            )}
          </Tile>
          {prep.length > 0 && (
            <Tile>
              <Txt kind="title">تجهيز الجمعة</Txt>
              <Txt>اللي يتجهّز مرة واحدة ويكفّي بوكسات الأسبوع:</Txt>
              {prep.map((entry) => (
                <View key={entry.task} style={styles.row}>
                  <Txt kind="strong" style={styles.grow}>
                    {entry.task}
                  </Txt>
                  <Txt kind="label">{entry.servings} وجبة</Txt>
                </View>
              ))}
            </Tile>
          )}
          <Button kind="primary" label="أضف مشتريات البوكس للقائمة" onPress={handleAddToList} />
          <Button label="بوكسات تانية للأسبوع" onPress={generateWorkWeek} />
          {openSlot !== null && <WorkSlotSheet date={picked} slot={openSlot} onClose={() => setOpenSlot(null)} />}
        </>
      )}

      <Suspects />
      <WorkBudget />
    </View>
  );
}

type WorkSlotSheetProps = {
  date: string;
  slot: WorkSlot;
  onClose: () => void;
};

/** Swap what is packed in one slot, see what to buy for it, and note how it sat. */
function WorkSlotSheet({ date, slot, onClose }: WorkSlotSheetProps) {
  const members = useStore((state) => state.members);
  const eaterId = useStore((state) => state.workEaterId);
  const hasMicrowave = useStore((state) => state.workHasMicrowave);
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const workWeeks = useStore((state) => state.workWeeks);
  const comfortLog = useStore((state) => state.comfortLog);
  const setWorkMeal = useStore((state) => state.setWorkMeal);
  const logComfort = useStore((state) => state.logComfort);
  const styles = useStyles();

  const mealId = workWeeks[currentWeekStart(weekStartsOn)]?.[date]?.[slot];
  const meal = workMealById(mealId ?? '');
  const eater = members.find((member) => member.id === eaterId);
  const options = safeWorkMeals(WORK_MEALS, eater, hasMicrowave).filter((option) => option.slots.includes(slot));
  const felt = comfortLog.find((entry) => entry.date === date && entry.mealId === mealId)?.comfort;

  return (
    <Sheet isOpen onClose={onClose} title={`${WORK_SLOT_LABELS[slot]} يوم ${dayName(date)}`}>
      {meal && (
        <>
          <Txt kind="strong">{meal.name}</Txt>
          <Txt kind="label">محتاج: {meal.ingredients.map((ingredient) => ingredient.name).join('، ')}</Txt>
          <Txt kind="strong">ارتحت بعده؟</Txt>
          <View style={styles.chips}>
            {COMFORTS.map((comfort) => (
              <Chip
                key={comfort}
                label={COMFORT_LABELS[comfort]}
                selected={felt === comfort}
                onPress={() => logComfort(date, meal.id, comfort)}
              />
            ))}
          </View>
        </>
      )}
      <Txt kind="strong">بدّله بـ</Txt>
      <View style={styles.chips}>
        {options.map((option) => (
          <Chip key={option.id} label={option.name} selected={option.id === mealId} onPress={() => setWorkMeal(date, slot, option.id)} />
        ))}
      </View>
    </Sheet>
  );
}

/** Ingredients the comfort notes point at, offered to the eater to add to their avoid list. */
function Suspects() {
  const members = useStore((state) => state.members);
  const eaterId = useStore((state) => state.workEaterId);
  const comfortLog = useStore((state) => state.comfortLog);
  const toggleAvoid = useStore((state) => state.toggleAvoid);
  const styles = useStyles();

  const eater = members.find((member) => member.id === eaterId);
  const suspects = suspectIngredients(comfortLog, WORK_MEALS).filter((name) => !(eater?.avoids ?? []).includes(name));
  if (!eater || suspects.length === 0) return null;

  return (
    <Tile>
      <Txt kind="title">ملاحظة من يومياتك</Txt>
      <Txt>المكونات دي اتكررت مع "انتفاخ" 3 مرات أو أكتر. ده من تسجيلك إنت، مش تشخيص.</Txt>
      {suspects.map((name) => (
        <View key={name} style={styles.row}>
          <Txt kind="strong" style={styles.grow}>
            {name}
          </Txt>
          <Button label="ضيفه للممنوعات" onPress={() => toggleAvoid(eater.id, name)} />
        </View>
      ))}
    </Tile>
  );
}

/** Where the work food's cost is counted, and what it has cost this week so far. */
function WorkBudget() {
  const mode = useStore((state) => state.workBudgetMode);
  const workBudget = useStore((state) => state.workBudget);
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const items = useStore((state) => state.items);
  const setWorkBudgetMode = useStore((state) => state.setWorkBudgetMode);
  const setWorkBudget = useStore((state) => state.setWorkBudget);
  const styles = useStyles();
  const [amount, setAmount] = useState(workBudget > 0 ? formatSar(workBudget) : '');

  const weekStart = currentWeekStart(weekStartsOn);
  const workItems = items.filter((item) => item.weekStart === weekStart && !item.deleted && item.forWork === true);
  const priced = workItems.reduce((sum, item) => sum + ((item.bought ? item.paidPrice : null) ?? item.estPrice ?? 0), 0);
  const unpriced = workItems.filter((item) => item.estPrice === null && item.paidPrice === null).length;

  const handleAmount = (): void => {
    const value = parsePrice(amount);
    if (value !== null) setWorkBudget(value);
  };

  return (
    <Tile>
      <Txt kind="title">ميزانية أكل الشغل</Txt>
      <View style={styles.chips}>
        {WORK_BUDGET_MODES.map((each) => (
          <Chip key={each} label={WORK_BUDGET_LABELS[each]} selected={mode === each} onPress={() => setWorkBudgetMode(each)} />
        ))}
      </View>
      {mode === 'separate' && (
        <Field label="مبلغ الأسبوع لأكل الشغل بالريال" value={amount} onChangeText={setAmount} onEndEditing={handleAmount} keyboardType="decimal-pad" />
      )}
      <Txt>
        مشتريات البوكس الأسبوع ده: {formatSar(priced)} ريال
        {mode === 'separate' && workBudget > 0 ? ` من ${formatSar(workBudget)}` : ''}.
      </Txt>
      {unpriced > 0 && <Txt kind="label">{unpriced} صنف من غير سعر، فالرقم أقل من الحقيقي.</Txt>}
    </Tile>
  );
}

const useStyles = themed((c) => ({
  block: { gap: Spacing.four },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
  row: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
  fromHome: { gap: Spacing.two, paddingTop: Spacing.two },
  slot: {
    minHeight: MIN_TOUCH,
    paddingVertical: Spacing.two,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
}));
