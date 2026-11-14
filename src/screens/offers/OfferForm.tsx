import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Field, Txt } from '@/components/kit';
import { RowDir, Spacing, themed } from '@/constants/theme';
import { parsePrice } from '@/domain/budget';
import { OFFER_KIND_LABELS, OFFER_KINDS, type OfferKind } from '@/domain/types';
import { useStore } from '@/store/store';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const NARROW_FIELD_WIDTH = 120;

/** Type in an offer seen on a flyer or a shelf. */
export function OfferForm() {
  const addOffers = useStore((state) => state.addOffers);
  const styles = useStyles();
  const [store, setStore] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [packQty, setPackQty] = useState('1');
  const [validUntil, setValidUntil] = useState('');
  const [kind, setKind] = useState<OfferKind>('weekly');
  const [problem, setProblem] = useState('');

  const handleAdd = (): void => {
    const parsedPrice = parsePrice(price);
    const parsedQty = parsePrice(packQty);
    const until = validUntil.trim();
    if (store.trim() === '' || name.trim() === '') return setProblem('اكتب اسم المتجر والصنف.');
    if (parsedPrice === null || parsedPrice <= 0) return setProblem('اكتب السعر بالأرقام.');
    if (parsedQty === null || !Number.isInteger(parsedQty) || parsedQty < 1) return setProblem('عدد الحبات لازم يكون رقم صحيح.');
    if (until !== '' && !DATE_KEY.test(until)) return setProblem('التاريخ بالشكل ده: 2026-11-20، أو سيبه فاضي.');

    addOffers([
      { store, name, price: parsedPrice, packQty: parsedQty, kind, validUntil: until === '' ? null : until, sourceUrl: null },
    ]);
    setName('');
    setPrice('');
    setPackQty('1');
    setProblem('');
  };

  return (
    <>
      <Field label="المتجر" value={store} onChangeText={setStore} />
      <Field label="الصنف والحجم" value={name} onChangeText={setName} />
      <View style={styles.inline}>
        <Field label="السعر بالريال" grow value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <Field label="عدد الحبات" value={packQty} onChangeText={setPackQty} keyboardType="number-pad" style={styles.narrow} />
      </View>
      <Field label="آخر يوم للعرض (اختياري)" value={validUntil} onChangeText={setValidUntil} placeholder="2026-11-20" />
      <View style={styles.chips}>
        {OFFER_KINDS.map((key) => (
          <Chip key={key} label={OFFER_KIND_LABELS[key]} selected={kind === key} onPress={() => setKind(key)} />
        ))}
      </View>
      {problem !== '' && (
        <Txt kind="label" tone="over">
          {problem}
        </Txt>
      )}
      <Button kind="primary" label="احفظ العرض" onPress={handleAdd} />
    </>
  );
}

const useStyles = themed(() => ({
  inline: { flexDirection: RowDir, gap: Spacing.two, alignItems: 'flex-end' },
  narrow: { width: NARROW_FIELD_WIDTH },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
}));
