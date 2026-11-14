import { Linking, Share, View } from 'react-native';

import { Button, IconButton, Txt, type IconName } from '@/components/kit';
import { Radius, RowDir, Spacing, themed } from '@/constants/theme';
import { formatSar } from '@/domain/budget';
import { unitPrice, type FoundOffer } from '@/domain/offers';
import { OFFER_KIND_LABELS } from '@/domain/types';

const SHARE_ICON: IconName = { ios: 'square.and.arrow.up', android: 'share', web: 'share' };
const DELETE_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };
const SOURCE_ICON: IconName = { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' };

type OfferCardProps = {
  offer: FoundOffer;
  /** Search results can be saved; saved offers can be deleted. */
  onSave?: () => void;
  onDelete?: () => void;
};

function details(offer: FoundOffer): string {
  const parts = [OFFER_KIND_LABELS[offer.kind]];
  if (offer.packQty > 1) parts.push(`${offer.packQty} حبة، الواحدة ${formatSar(unitPrice(offer))} ريال`);
  if (offer.validUntil) parts.push(`لحد ${offer.validUntil}`);
  return parts.join('، ');
}

function shareText(offer: FoundOffer): string {
  const lines = [`${offer.name} بـ ${formatSar(offer.price)} ريال في ${offer.store}`, details(offer)];
  if (offer.sourceUrl) lines.push(offer.sourceUrl);
  return lines.join('\n');
}

/** One price at one shop: used for saved offers and for search results. */
export function OfferCard({ offer, onSave, onDelete }: OfferCardProps) {
  const styles = useStyles();
  const sourceUrl = offer.sourceUrl;
  // Sharing can be dismissed or unsupported; neither is worth telling the user about.
  const handleShare = (): void => void Share.share({ message: shareText(offer) }).catch(() => undefined);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.grow}>
          <Txt kind="strong">{offer.name}</Txt>
          <Txt kind="label">{offer.store}</Txt>
        </View>
        <View style={styles.price}>
          <Txt kind="title" style={styles.priceText}>
            {formatSar(offer.price)}
          </Txt>
          <Txt kind="label" style={styles.priceText}>
            ريال
          </Txt>
        </View>
      </View>
      <View style={styles.bottom}>
        <Txt kind="label" style={styles.grow}>
          {details(offer)}
        </Txt>
        {sourceUrl !== null && (
          <IconButton icon={SOURCE_ICON} label="افتح المصدر" onPress={() => void Linking.openURL(sourceUrl)} />
        )}
        <IconButton icon={SHARE_ICON} label={`شارك عرض ${offer.name}`} onPress={handleShare} />
        {onDelete && <IconButton icon={DELETE_ICON} label={`احذف عرض ${offer.name}`} tone="danger" onPress={onDelete} />}
      </View>
      {onSave && <Button kind="primary" label="احفظ العرض" onPress={onSave} />}
    </View>
  );
}

const useStyles = themed((c) => ({
  card: {
    backgroundColor: c.paper2,
    borderRadius: Radius.card,
    boxShadow: c.shadow,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  top: { flexDirection: RowDir, alignItems: 'flex-start', gap: Spacing.three },
  bottom: { flexDirection: RowDir, alignItems: 'center' },
  grow: { flex: 1 },
  price: {
    backgroundColor: c.accent,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    alignItems: 'center',
  },
  priceText: { color: c.accentInk, textAlign: 'center' },
}));
