import { Image } from 'expo-image';
import { View } from 'react-native';

import { BudgetRing } from '@/components/BudgetRing';
import { CountUp } from '@/components/CountUp';
import { Button, IconButton, Row, Tile, Txt, type IconName } from '@/components/kit';
import { Radius, RowDir, Spacing, themed } from '@/constants/theme';
import { formatSar, spendByCategory, summarizeBudget, type BudgetStatus } from '@/domain/budget';
import { weeklySetAside } from '@/domain/funds';
import { entryFor, LEFTOVERS_ID } from '@/domain/meals';
import { summarizePantry } from '@/domain/pantry';
import { bestOffer, isActive } from '@/domain/offers';
import { CATEGORY_LABELS, SLOT_LABELS, SLOTS } from '@/domain/types';
import { dayName, toDateKey } from '@/domain/week';
import { currentWeekStart, findMeal, useStore } from '@/store/store';

import { FreshTile } from './list/FreshTile';
import { RunningLowTile } from './list/RunningLowTile';
import { WeekReportTile } from './today/WeekReportTile';

const STATUS_LINES: Record<BudgetStatus, string> = {
  ok: 'القائمة الحالية داخل الميزانية.',
  tight: 'القائمة قربت تقفل الميزانية.',
  over: 'القائمة الحالية أكبر من الباقي.',
};

const SETTINGS_ICON: IconName = { ios: 'gearshape', android: 'settings', web: 'settings' };
const LIKE_ICON: IconName = { ios: 'hand.thumbsup', android: 'thumb_up', web: 'thumb_up' };
const DISLIKE_ICON: IconName = { ios: 'hand.thumbsdown', android: 'thumb_down', web: 'thumb_down' };
const TOP_OFFERS = 3;
const BAR_HEIGHT = 8;
const THUMB_SIZE = 44;

type BudgetScreenProps = {
  onOpenSettings: () => void;
  onOpenList: () => void;
  onOpenMeals: () => void;
};

/** "Today": the money left, where it went, what is for dinner, and the best offers for the list. */
export function BudgetScreen({ onOpenSettings, onOpenList, onOpenMeals }: BudgetScreenProps) {
  const budget = useStore((state) => state.budget);
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const items = useStore((state) => state.items);
  const plan = useStore((state) => state.plan);
  const offers = useStore((state) => state.offers);
  const customMeals = useStore((state) => state.customMeals);
  const workBudgetMode = useStore((state) => state.workBudgetMode);
  const workBudget = useStore((state) => state.workBudget);
  const funds = useStore((state) => state.funds);
  const fruitBudget = useStore((state) => state.fruitBudget);
  const ratings = useStore((state) => state.ratings);
  const rateMeal = useStore((state) => state.rateMeal);
  const mealPhotos = useStore((state) => state.mealPhotos);
  const pantry = summarizePantry(useStore((state) => state.staples));
  const styles = useStyles();

  const today = toDateKey(new Date());
  const allWeekItems = items.filter((item) => item.weekStart === currentWeekStart(weekStartsOn) && !item.deleted);
  // With its own budget, the work food is counted apart from the home's money.
  const isWorkApart = workBudgetMode === 'separate';
  const weekItems = isWorkApart ? allWeekItems.filter((item) => item.forWork !== true) : allWeekItems;
  const workSummary = summarizeBudget(allWeekItems.filter((item) => item.forWork === true), workBudget);
  const summary = summarizeBudget(weekItems, budget);
  const shares = spendByCategory(weekItems);
  const toBuy = weekItems.filter((item) => !item.bought);
  const setAside = weeklySetAside(funds);
  const fruitSpent = shares.find((entry) => entry.category === 'fruit')?.amount ?? 0;
  const todayMeals = SLOTS.map((slot) => {
    const entry = entryFor(plan, today, slot);
    return { slot, mealId: entry?.mealId, name: entry ? findMeal(entry.mealId, customMeals)?.name : undefined };
  });
  const hasMeals = todayMeals.some((meal) => meal.name !== undefined);
  const activeOffers = offers.filter((offer) => isActive(offer, today));
  const matches = toBuy
    .flatMap((item) => {
      const offer = bestOffer(item.name, activeOffers);
      return offer ? [{ item: item.name, offer }] : [];
    })
    .slice(0, TOP_OFFERS);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Txt kind="head">النهارده</Txt>
          <Txt kind="label">{dayName(today)}</Txt>
        </View>
        <IconButton icon={SETTINGS_ICON} label="الإعدادات" onPress={onOpenSettings} />
      </View>

      <Tile>
        <BudgetRing remaining={summary.remaining} budget={summary.budget} tone={summary.status} />
        <Txt kind="strong" tone={summary.status} style={styles.center}>
          {STATUS_LINES[summary.status]}
        </Txt>
        <View style={styles.stats}>
          <Stat label="اتصرف" value={summary.spent} />
          <Stat label="في القائمة" value={summary.planned} />
          <Stat label="بعد القائمة" value={summary.projected} />
        </View>
        {summary.unpricedCount > 0 && (
          <Txt kind="label" style={styles.center}>
            {summary.unpricedCount} صنف من غير سعر، فالرقم ده أقل من الحقيقي.
          </Txt>
        )}
      </Tile>

      {pantry.weekly > 0 && (
        <Tile>
          <Txt kind="title">المخزن الطويل</Txt>
          <Txt>
            نصيب الأسبوع من الرز والزيت والتوابل والمنظفات: {formatSar(pantry.weekly)} ريال. الباقي الفعلي بعده{' '}
            {formatSar(summary.remaining - pantry.weekly)} ريال.
          </Txt>
        </Tile>
      )}

      <FreshTile />
      <RunningLowTile />

      {setAside > 0 && (
        <Tile>
          <Txt kind="title">التحويش الأسبوعي</Txt>
          <Txt>
            {formatSar(setAside)} ريال بتتحوّش كل أسبوع لصندوق المخزن وحصّالة العروض. الباقي بعد التحويش{' '}
            {formatSar(summary.remaining - setAside)} ريال.
          </Txt>
        </Tile>
      )}

      {fruitBudget > 0 && (
        <Tile>
          <Txt kind="title">الفاكهة</Txt>
          <Txt tone={fruitSpent > fruitBudget ? 'over' : undefined}>
            {formatSar(fruitSpent)} ريال من {formatSar(fruitBudget)} للأسبوع.
          </Txt>
        </Tile>
      )}

      {isWorkApart && (
        <Tile>
          <Txt kind="title">ميزانية أكل الشغل</Txt>
          <Txt>
            اتصرف {formatSar(workSummary.spent)} وفي القائمة {formatSar(workSummary.planned)}
            {workBudget > 0 ? ` من ${formatSar(workBudget)} ريال.` : ' ريال. حدد المبلغ من صفحة بوكس الشغل.'}
          </Txt>
        </Tile>
      )}

      {shares.length > 0 && (
        <Tile>
          <Txt kind="title">فلوس الأسبوع رايحة فين</Txt>
          {shares.map((entry) => (
            <View key={entry.category} style={styles.share}>
              <View style={styles.shareTop}>
                <Txt kind="strong" style={styles.grow}>
                  {CATEGORY_LABELS[entry.category]}
                </Txt>
                <Txt kind="label">{formatSar(entry.amount)} ريال</Txt>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(entry.share * 100)}%` }]} />
              </View>
            </View>
          ))}
        </Tile>
      )}

      <WeekReportTile />

      <Tile>
        <Txt kind="title">أكل النهارده</Txt>
        {hasMeals ? (
          <>
            {todayMeals.map(({ slot, name, mealId }) => (
              <Row key={slot}>
                {mealId !== undefined && mealPhotos[mealId] !== undefined && (
                  <Image source={{ uri: mealPhotos[mealId] }} accessibilityLabel={`صورة ${name ?? ''}`} contentFit="cover" style={styles.mealThumb} />
                )}
                <Txt kind="label">{SLOT_LABELS[slot]}</Txt>
                <Txt kind="strong" style={styles.grow}>
                  {name ?? 'لسه ما اتحددش'}
                </Txt>
                {name !== undefined && mealId !== undefined && mealId !== LEFTOVERS_ID && (
                  <>
                    <IconButton
                      icon={LIKE_ICON}
                      label={`${name} عجبتنا`}
                      selected={ratings[mealId] === 'liked'}
                      onPress={() => rateMeal(mealId, 'liked')}
                    />
                    <IconButton
                      icon={DISLIKE_ICON}
                      label={`${name} ما عجبتناش`}
                      selected={ratings[mealId] === 'disliked'}
                      onPress={() => rateMeal(mealId, 'disliked')}
                    />
                  </>
                )}
              </Row>
            ))}
            <Txt kind="label">قيّم بعد الأكل: اللي عجبكم ييجي أكتر في الخطة الجاية، واللي ما عجبكمش ييجي في الآخر.</Txt>
          </>
        ) : (
          <>
            <Txt>لسه مفيش خطة للأسبوع ده.</Txt>
            <Button kind="primary" label="اعمل خطة الأسبوع" onPress={onOpenMeals} />
          </>
        )}
      </Tile>

      <Tile>
        <Txt kind="title">ناقص تشتريه</Txt>
        <Txt>{toBuy.length === 0 ? 'القائمة خلصت.' : `${toBuy.length} صنف لسه في القائمة.`}</Txt>
        {matches.map(({ item, offer }) => (
          <Row key={offer.id}>
            <View style={styles.grow}>
              <Txt kind="strong">{item}</Txt>
              <Txt kind="label">أحسن عرض محفوظ: {offer.store}</Txt>
            </View>
            <View style={styles.priceChip}>
              <Txt kind="strong" style={styles.priceText}>
                {formatSar(offer.price)} ريال
              </Txt>
            </View>
          </Row>
        ))}
        <Button label="افتح القائمة" onPress={onOpenList} />
      </Tile>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <CountUp kind="title" value={value} style={styles.center} />
      <Txt kind="label" style={styles.center}>
        {label}
      </Txt>
    </View>
  );
}

const useStyles = themed((c) => ({
  screen: { gap: Spacing.four },
  header: { flexDirection: RowDir, alignItems: 'center' },
  grow: { flex: 1 },
  center: { textAlign: 'center' },
  stats: { flexDirection: RowDir, paddingTop: Spacing.two },
  stat: { flex: 1, alignItems: 'center' },
  share: { gap: Spacing.one, paddingVertical: Spacing.one },
  shareTop: { flexDirection: RowDir, alignItems: 'center' },
  track: { height: BAR_HEIGHT, borderRadius: Radius.pill, backgroundColor: c.track, flexDirection: RowDir },
  fill: { height: BAR_HEIGHT, borderRadius: Radius.pill, backgroundColor: c.brand },
  priceChip: {
    backgroundColor: c.accentSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  priceText: { color: c.accent },
  mealThumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Radius.control },
}));
