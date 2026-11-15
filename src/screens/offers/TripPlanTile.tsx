import { View } from 'react-native';

import { Tile, Txt } from '@/components/kit';
import { Spacing, themed } from '@/constants/theme';
import { formatSar } from '@/domain/budget';
import { adviseTrips, type TripAdvice, type TripPlan } from '@/domain/offers';
import { tripCostTo } from '@/domain/shops';
import type { Offer } from '@/domain/types';
import { useStore } from '@/store/store';

type TripPlanTileProps = {
  /** Names of this week's items that are still to buy. */
  items: readonly string[];
  offers: readonly Offer[];
};

function PlanLines({ title, plan }: { title: string; plan: TripPlan }) {
  const styles = useStyles();
  const missing = plan.missing.length > 0 ? `ناقص: ${plan.missing.join('، ')}` : 'كل اللي في القائمة متغطي';
  return (
    <View style={styles.plan}>
      <Txt kind="strong">
        {title}: {plan.stores.join(' + ')}
      </Txt>
      <Txt kind="label">
        {plan.picks.length} صنف بـ {formatSar(plan.total)} ريال. {missing}.
      </Txt>
    </View>
  );
}

function verdictLine(advice: TripAdvice): string {
  if (!advice.secondTripHelps) {
    return advice.basketSaving > 0 && advice.extraDriveCost !== null
      ? 'مشوار واحد أحسن؛ توفير المتجر التاني أقل من تكلفة مشواره.'
      : 'مشوار واحد كفاية؛ المتجر التاني مش هيوفّر.';
  }
  return advice.basketSaving > 0 ? 'مشوارين أحسن الأسبوع ده.' : 'مشوارين: المتجر التاني بيغطي أصناف أكتر.';
}

function driveLine(advice: TripAdvice): string {
  if (advice.extraDriveCost === null) {
    return 'تكلفة المشوار مش محسوبة. سجّل المتاجر دي في "متاجري" وبيانات عربيتك في حاسبة المشوار عشان تدخل في القرار.';
  }
  const drive = `المشوار الزيادة بيكلّف ${formatSar(advice.extraDriveCost)} ريال بنزين ووقت.`;
  if (advice.basketSaving === 0) return drive;
  const net = advice.netSaving >= 0 ? 'صافي التوفير' : 'يعني خسارة';
  return `${drive} المتجرين بيوفّروا ${formatSar(advice.basketSaving)} ريال، ${net} ${formatSar(Math.abs(advice.netSaving))} ريال.`;
}

/** One shop or two? Compares the best single shop with the best pair, the drive included. */
export function TripPlanTile({ items, offers }: TripPlanTileProps) {
  const shops = useStore((state) => state.shops);
  const car = useStore((state) => state.car);
  const advice = adviseTrips(items, offers, (store) => tripCostTo(store, shops, car));

  if (items.length === 0) {
    return (
      <Tile>
        <Txt kind="title">خطة الشراء</Txt>
        <Txt>قائمة الأسبوع فاضية. أضف أصناف في المشتريات والخطة هتتحسب هنا.</Txt>
      </Tile>
    );
  }
  if (advice.one === null) {
    return (
      <Tile>
        <Txt kind="title">خطة الشراء</Txt>
        <Txt>مفيش عروض محفوظة تخص أصناف القائمة. احفظ عروض والخطة هتتحسب.</Txt>
      </Tile>
    );
  }

  const hasPair = advice.two !== null && advice.two.stores.length === 2;

  return (
    <Tile>
      <Txt kind="title">خطة الشراء</Txt>
      <Txt kind="strong" tone={advice.secondTripHelps ? 'ok' : undefined}>
        {verdictLine(advice)}
      </Txt>
      <PlanLines title="مشوار واحد" plan={advice.one} />
      {hasPair && advice.two !== null && <PlanLines title="مشوارين" plan={advice.two} />}
      {hasPair && <Txt kind="label">{driveLine(advice)}</Txt>}
      <Txt kind="label">الحساب على العروض المحفوظة بس.</Txt>
    </Tile>
  );
}

const useStyles = themed(() => ({
  plan: { gap: Spacing.half, paddingVertical: Spacing.one },
}));
