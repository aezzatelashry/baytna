import { View } from 'react-native';

import { Tile, Txt } from '@/components/kit';
import { Spacing, themed } from '@/constants/theme';
import { formatSar } from '@/domain/budget';
import { adviseTrips, type TripPlan } from '@/domain/offers';
import type { Offer } from '@/domain/types';

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

/** One shop or two? Compares the best single shop with the best pair for this week's list. */
export function TripPlanTile({ items, offers }: TripPlanTileProps) {
  const advice = adviseTrips(items, offers);

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

  const verdict = advice.secondTripHelps
    ? 'مشوارين أحسن الأسبوع ده.'
    : 'مشوار واحد كفاية؛ المتجر التاني مش هيوفّر.';

  return (
    <Tile>
      <Txt kind="title">خطة الشراء</Txt>
      <Txt kind="strong" tone="ok">
        {verdict}
      </Txt>
      <PlanLines title="مشوار واحد" plan={advice.one} />
      {advice.secondTripHelps && advice.two !== null && <PlanLines title="مشوارين" plan={advice.two} />}
      <Txt kind="label">الحساب على العروض المحفوظة بس، ومن غير تكلفة المشوار نفسه.</Txt>
    </Tile>
  );
}

const useStyles = themed(() => ({
  plan: { gap: Spacing.half, paddingVertical: Spacing.one },
}));
