import { View } from 'react-native';

import { IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Spacing, themed } from '@/constants/theme';
import { lookupPrice } from '@/domain/budget';
import { expiringSoon, freshDaysLeft, mealsUsing, type FreshItem } from '@/domain/fresh';
import { toDateKey } from '@/domain/week';
import { allMeals, useStore } from '@/store/store';

const DONE_ICON: IconName = { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' };
const WASTE_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };
const LONGER_ICON: IconName = { ios: 'clock.arrow.circlepath', android: 'more_time', web: 'more_time' };
const EXTRA_DAYS = 2;

function leftLine(left: number): string {
  if (left < 0) return 'عدّى وقته، بص عليه قبل ما تستخدمه';
  if (left === 0) return 'النهارده آخر يوم';
  return left === 1 ? 'باقي يوم واحد' : `باقي ${left} يوم`;
}

/** Fresh things about to go off, with a meal that uses each one up. */
export function FreshTile() {
  const fresh = useStore((state) => state.fresh);
  const customMeals = useStore((state) => state.customMeals);
  const priceBook = useStore((state) => state.priceBook);
  const removeFresh = useStore((state) => state.removeFresh);
  const restoreFresh = useStore((state) => state.restoreFresh);
  const adjustFresh = useStore((state) => state.adjustFresh);
  const addWaste = useStore((state) => state.addWaste);
  const styles = useStyles();

  const today = toDateKey(new Date());
  const soon = expiringSoon(fresh, today);
  if (soon.length === 0) return null;

  const meals = allMeals(customMeals);
  const handleUsed = (item: FreshItem): void => {
    removeFresh(item.id);
    showToast(`"${item.name}" خلص`, () => restoreFresh(item));
  };
  const handleWasted = (item: FreshItem): void => {
    removeFresh(item.id);
    addWaste(item.name, lookupPrice(priceBook, item.name) ?? 0);
    showToast(`"${item.name}" اتسجّل في الهدر`);
  };

  return (
    <Tile>
      <Txt kind="title">كُله الأول قبل ما يبوظ</Txt>
      <Txt kind="label">المدة تقدير من يوم الشراء، مش حكم على سلامة الأكل. لو لسه كويس مدّها.</Txt>
      {soon.map((item) => {
        const left = freshDaysLeft(item, today);
        const meal = mealsUsing(item.name, meals)[0];
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.grow}>
              <Txt kind="strong">{item.name}</Txt>
              <Txt kind="label" tone={left <= 0 ? 'over' : 'tight'}>
                {leftLine(left)}
              </Txt>
              {meal !== undefined && <Txt kind="label">يتطبخ في: {meal.name}</Txt>}
            </View>
            <IconButton icon={LONGER_ICON} label={`${item.name} لسه كويس، مدّه ${EXTRA_DAYS} يوم`} onPress={() => adjustFresh(item.id, EXTRA_DAYS)} />
            <IconButton icon={DONE_ICON} label={`${item.name} خلص`} onPress={() => handleUsed(item)} />
            <IconButton icon={WASTE_ICON} label={`${item.name} اترمى`} tone="danger" onPress={() => handleWasted(item)} />
          </View>
        );
      })}
    </Tile>
  );
}

const useStyles = themed(() => ({
  row: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.one },
  grow: { flex: 1 },
}));
