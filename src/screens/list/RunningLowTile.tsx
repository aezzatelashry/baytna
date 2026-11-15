import { View } from 'react-native';

import { IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Spacing, themed } from '@/constants/theme';
import { daysLeft, runningLow, stapleCategory, type Staple } from '@/domain/pantry';
import { toDateKey } from '@/domain/week';
import { useStore } from '@/store/store';

const CART_ICON: IconName = { ios: 'cart.badge.plus', android: 'add_shopping_cart', web: 'add_shopping_cart' };

function leftLine(staple: Staple, today: string): string {
  const left = daysLeft(staple, today) ?? 0;
  return left <= 0 ? 'المفروض خلص' : `باقي حوالي ${left} يوم`;
}

/** The long-life things about to run out, each with one press to put it on this week's list. */
export function RunningLowTile() {
  const staples = useStore((state) => state.staples);
  const addIngredientsToList = useStore((state) => state.addIngredientsToList);
  const styles = useStyles();

  const today = toDateKey(new Date());
  const low = runningLow(staples, today);
  if (low.length === 0) return null;

  const handleAdd = (staple: Staple): void => {
    const added = addIngredientsToList([{ name: staple.name, qty: 1, unit: '', category: stapleCategory(staple.kind) }]);
    showToast(added === 0 ? `"${staple.name}" موجود في القائمة` : `"${staple.name}" اتضاف لقائمة الأسبوع`);
  };

  return (
    <Tile>
      <Txt kind="title">قرب يخلص من المخزن</Txt>
      <Txt>ضيفه للقائمة بدري، عشان تلحق عليه عرض بدل ما تشتريه مضطر.</Txt>
      {low.map((staple) => (
        <View key={staple.id} style={styles.row}>
          <View style={styles.grow}>
            <Txt kind="strong">{staple.name}</Txt>
            <Txt kind="label" tone="tight">
              {leftLine(staple, today)}
            </Txt>
          </View>
          <IconButton icon={CART_ICON} label={`أضف ${staple.name} للقائمة`} onPress={() => handleAdd(staple)} />
        </View>
      ))}
    </Tile>
  );
}

const useStyles = themed(() => ({
  row: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
}));
