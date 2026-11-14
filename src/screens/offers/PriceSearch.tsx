import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, Tile, Txt } from '@/components/kit';
import { Spacing, themed } from '@/constants/theme';
import type { FoundOffer } from '@/domain/offers';
import { useStore } from '@/store/store';
import { isSyncConfigured, searchPrices } from '@/sync/sync';

import { OfferCard } from './OfferCard';

type SearchState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; found: readonly FoundOffer[] }
  | { status: 'failed'; message: string };

/** Type an item; the server searches the web and returns prices with their sources. */
export function PriceSearch() {
  const addOffers = useStore((state) => state.addOffers);
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  if (!isSyncConfigured()) {
    return (
      <Tile>
        <Txt kind="title">البحث عن أحسن سعر</Txt>
        <Txt>البحث بيشتغل من خادم البيت. هيتفعّل لما يتضاف عنوان ومفتاح Supabase وقت البناء.</Txt>
      </Tile>
    );
  }

  const isBusy = state.status === 'busy';
  const handleSearch = async (): Promise<void> => {
    const wanted = query.trim();
    if (wanted === '' || isBusy) return;
    setState({ status: 'busy' });
    try {
      setState({ status: 'done', found: await searchPrices(wanted) });
    } catch (caught: unknown) {
      setState({ status: 'failed', message: caught instanceof Error ? caught.message : 'حصل خطأ غير متوقع' });
    }
  };
  const handleSave = (offer: FoundOffer): void => {
    addOffers([offer]);
    setState((current) =>
      current.status === 'done' ? { status: 'done', found: current.found.filter((other) => other !== offer) } : current,
    );
  };

  return (
    <View style={styles.block}>
      <Tile>
        <Txt kind="title">البحث عن أحسن سعر</Txt>
        <Field
          label="الصنف اللي محتاجه"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void handleSearch()}
          returnKeyType="search"
        />
        <Button
          kind="primary"
          label={isBusy ? 'بيدوّر…' : 'دوّر في الويب'}
          disabled={isBusy || query.trim() === ''}
          onPress={() => void handleSearch()}
        />
        {isBusy && <Txt kind="label">البحث ممكن ياخد لحد دقيقة.</Txt>}
        {state.status === 'failed' && (
          <Txt kind="label" tone="over">
            {state.message}
          </Txt>
        )}
        {state.status === 'done' && state.found.length === 0 && (
          <Txt kind="label">ما لقيناش سعر موثوق للصنف ده. جرّب اسم أدق أو أضف العرض بإيدك.</Txt>
        )}
      </Tile>

      {state.status === 'done' &&
        state.found.map((offer) => (
          <OfferCard
            key={`${offer.store}-${offer.name}-${offer.price}`}
            offer={offer}
            onSave={() => handleSave(offer)}
          />
        ))}
    </View>
  );
}

const useStyles = themed(() => ({
  block: { gap: Spacing.three },
}));
