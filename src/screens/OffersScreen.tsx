import { useState } from 'react';
import { View } from 'react-native';

import { Chip, Sheet, Txt } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Spacing, themed } from '@/constants/theme';
import { isActive, unitPrice } from '@/domain/offers';
import { OFFER_KIND_LABELS, OFFER_KINDS, type Offer, type OfferKind } from '@/domain/types';
import { toDateKey } from '@/domain/week';
import { currentWeekStart, useStore } from '@/store/store';

import { OfferCard } from './offers/OfferCard';
import { FlyerReader } from './offers/FlyerReader';
import { FundTile } from './FundTile';
import { NearbyPlaces } from './offers/NearbyPlaces';
import { OfferForm } from './offers/OfferForm';
import { PriceSearch } from './offers/PriceSearch';
import { Shops } from './offers/Shops';
import { TripPlanTile } from './offers/TripPlanTile';
import { TripWorth } from './offers/TripWorth';

type Filter = OfferKind | 'all';

type OffersScreenProps = {
  /** The add sheet is opened by the floating button in the shell. */
  isAdding: boolean;
  onCloseAdd: () => void;
};

export function OffersScreen({ isAdding, onCloseAdd }: OffersScreenProps) {
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const allItems = useStore((state) => state.items);
  const allOffers = useStore((state) => state.offers);
  const removeOffer = useStore((state) => state.removeOffer);
  const addOffers = useStore((state) => state.addOffers);
  const styles = useStyles();
  const [filter, setFilter] = useState<Filter>('all');

  const today = toDateKey(new Date());
  const weekStart = currentWeekStart(weekStartsOn);
  const active = allOffers.filter((offer) => isActive(offer, today));
  const expiredCount = allOffers.length - active.length;
  const shown = active
    .filter((offer) => filter === 'all' || offer.kind === filter)
    .sort((a, b) => unitPrice(a) - unitPrice(b));
  const toBuy = allItems
    .filter((item) => item.weekStart === weekStart && !item.deleted && !item.bought)
    .map((item) => item.name);

  const handleDelete = (offer: Offer): void => {
    removeOffer(offer.id);
    showToast(`اتشال عرض "${offer.name}"`, () => addOffers([offer]));
  };

  return (
    <View style={styles.screen}>
      <Txt kind="head">العروض</Txt>

      <PriceSearch />
      <FlyerReader />
      <TripPlanTile items={toBuy} offers={active} />
      <NearbyPlaces />
      <Shops items={toBuy} />
      <TripWorth />
      <FundTile kind="offers" />

      <View style={styles.block}>
        <Txt kind="title">العروض المحفوظة</Txt>
        <View style={styles.chips}>
          <Chip label="الكل" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {OFFER_KINDS.map((key) => (
            <Chip key={key} label={OFFER_KIND_LABELS[key]} selected={filter === key} onPress={() => setFilter(key)} />
          ))}
        </View>
        {shown.length === 0 && <Txt>مفيش عروض هنا لسه. دوّر على صنف من فوق، أو اضغط علامة الزائد وأضف عرض شفته.</Txt>}
        {shown.map((offer) => (
          <OfferCard key={offer.id} offer={offer} onDelete={() => handleDelete(offer)} />
        ))}
        {expiredCount > 0 && <Txt kind="label">{expiredCount} عرض خلص تاريخه ومش ظاهر.</Txt>}
      </View>

      <Sheet isOpen={isAdding} onClose={onCloseAdd} title="عرض شفته">
        <OfferForm />
      </Sheet>
    </View>
  );
}

const useStyles = themed(() => ({
  screen: { gap: Spacing.four },
  block: { gap: Spacing.three },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
}));
