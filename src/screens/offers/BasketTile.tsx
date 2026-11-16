import { Share, View } from 'react-native';

import { IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { formatSar } from '@/domain/budget';
import { basketCoverage, basketTotal, groupByStore, listMessage } from '@/domain/share-list';
import type { Offer } from '@/domain/types';
import { toDateKey } from '@/domain/week';

const SHARE_ICON: IconName = { ios: 'square.and.arrow.up', android: 'share', web: 'share' };

type BasketTileProps = {
  /** Names of this week's items that are still to buy. */
  items: readonly string[];
  offers: readonly Offer[];
};

/**
 * The offers that apply to the list, gathered by shop: what each shop's offers come to,
 * and the grand total. Items with no offer are listed apart and add nothing to the total.
 */
export function BasketTile({ items, offers }: BasketTileProps) {
  const styles = useStyles();
  const groups = groupByStore(items, offers, toDateKey(new Date()));
  const { covered, uncovered } = basketCoverage(groups);

  if (items.length === 0) return null;
  if (covered === 0) {
    return (
      <Tile>
        <Txt kind="title">سلة العروض</Txt>
        <Txt>مفيش عروض ساريّة على أصناف قائمتك لسه. اضغط زرار جلب العروض اللي فوق أو صوّر منشور متجر.</Txt>
      </Tile>
    );
  }

  const handleShare = (): void => void Share.share({ message: listMessage(groups) }).catch(() => undefined);

  return (
    <Tile>
      <View style={styles.row}>
        <Txt kind="title" style={styles.grow}>
          سلة العروض
        </Txt>
        <IconButton icon={SHARE_ICON} label="شارك السلة حسب المتجر" onPress={handleShare} />
      </View>
      {groups.map((group) => (
        <View key={group.store ?? 'anywhere'} style={styles.group}>
          <View style={styles.row}>
            <Txt kind="strong" style={styles.grow}>
              {group.store === null ? 'من أي متجر (من غير عرض)' : group.store}
            </Txt>
            {group.store !== null && <Txt kind="strong">{formatSar(group.total)} ريال</Txt>}
          </View>
          {group.lines.map((line) => (
            <View key={line.name} style={styles.row}>
              <Txt kind="label" style={styles.grow}>
                {line.name}
              </Txt>
              {line.price !== null && <Txt kind="label">{formatSar(line.price)} ريال</Txt>}
            </View>
          ))}
        </View>
      ))}
      <View style={styles.grand}>
        <Txt kind="title" style={styles.grow}>
          الإجمالي العام
        </Txt>
        <Txt kind="title" tone="ok">
          {formatSar(basketTotal(groups))} ريال
        </Txt>
      </View>
      {uncovered > 0 && <Txt kind="label">{`الإجمالي على ${covered} صنف ليهم عروض. ${uncovered} صنف من غير عرض مش داخلين فيه.`}</Txt>}
    </Tile>
  );
}

const useStyles = themed((c) => ({
  row: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
  group: { gap: Spacing.half, paddingVertical: Spacing.one, borderBottomWidth: Rule.hair, borderBottomColor: c.rule },
  grand: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
}));
