import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Field, IconButton, Sheet, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { formatSar, parsePrice } from '@/domain/budget';
import { bestShop, quoteShops, type Shop, type ShopQuote } from '@/domain/shops';
import { useStore } from '@/store/store';

const DELETE_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };

type ShopsProps = {
  /** Names of this week's items that are still to buy. */
  items: readonly string[];
};

function quoteLine(quote: ShopQuote, total: number): string {
  if (quote.pricedCount === 0) return 'لسه ما اشتريتش منه حاجة من القائمة، فمفيش أسعار.';
  const trip = quote.tripCost === null ? '' : `، والمشوار ${formatSar(quote.tripCost)}`;
  return `${quote.pricedCount} من ${total} صنف بـ ${formatSar(quote.knownTotal)} ريال${trip}`;
}

/** The family's own shops, priced from what they paid there, with the drive counted in. */
export function Shops({ items }: ShopsProps) {
  const shops = useStore((state) => state.shops);
  const shopPrices = useStore((state) => state.shopPrices);
  const activeShopId = useStore((state) => state.activeShopId);
  const car = useStore((state) => state.car);
  const setActiveShop = useStore((state) => state.setActiveShop);
  const removeShop = useStore((state) => state.removeShop);
  const restoreShop = useStore((state) => state.restoreShop);
  const styles = useStyles();
  const [isAdding, setIsAdding] = useState(false);

  const quotes = quoteShops(items, shops, shopPrices, car);
  const best = items.length > 0 ? bestShop(quotes) : null;

  const handleRemove = (shop: Shop): void => {
    removeShop(shop.id);
    showToast(`اتشال "${shop.name}" من متاجرك`, () => restoreShop(shop));
  };

  return (
    <Tile>
      <Txt kind="title">متاجري</Txt>
      {shops.length === 0 && (
        <Txt>سجّل الأماكن اللي بتشتري منها. كل سعر تدفعه هيتحفظ على متجره، والتطبيق يقولك تشتري قائمتك منين.</Txt>
      )}
      {best && (
        <Txt kind="strong" tone="ok">
          أحسن مكان لقائمتك: {best.shop.name}
          {best.missing.length > 0 ? ` (ناقص أسعار ${best.missing.length} صنف)` : ''}.
        </Txt>
      )}
      {quotes.map((quote) => (
        <View key={quote.shop.id} style={styles.shop}>
          <View style={styles.row}>
            <View style={styles.grow}>
              <Txt kind="strong">{quote.shop.name}</Txt>
              <Txt kind="label">
                {quote.shop.extraKm === 0 ? 'في السكة أو الأقرب' : `${formatSar(quote.shop.extraKm)} كم زيادة رايح جاي`}
                {quote.shop.note !== '' ? `، ${quote.shop.note}` : ''}
              </Txt>
            </View>
            <IconButton icon={DELETE_ICON} label={`احذف ${quote.shop.name}`} tone="danger" onPress={() => handleRemove(quote.shop)} />
          </View>
          {items.length > 0 && <Txt kind="label">{quoteLine(quote, items.length)}</Txt>}
          <Chip
            label={activeShopId === quote.shop.id ? 'بشتري منه دلوقتي' : 'هشتري منه'}
            selected={activeShopId === quote.shop.id}
            onPress={() => setActiveShop(activeShopId === quote.shop.id ? null : quote.shop.id)}
          />
        </View>
      ))}
      {shops.length > 0 && car === null && (
        <Txt kind="label">اكتب سعر البنزين واستهلاك العربية في حاسبة المشوار، عشان تكلفة المشوار تدخل في المقارنة.</Txt>
      )}
      <Button label="أضف متجر" onPress={() => setIsAdding(true)} />
      <NewShopSheet isOpen={isAdding} onClose={() => setIsAdding(false)} />
    </Tile>
  );
}

function NewShopSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const addShop = useStore((state) => state.addShop);
  const styles = useStyles();
  const [name, setName] = useState('');
  const [extraKm, setExtraKm] = useState('');
  const [extraMinutes, setExtraMinutes] = useState('');
  const [note, setNote] = useState('');

  const handleAdd = (): void => {
    if (name.trim() === '') return;
    addShop({ name, note: note.trim(), extraKm: parsePrice(extraKm) ?? 0, extraMinutes: parsePrice(extraMinutes) ?? 0 });
    setName('');
    setExtraKm('');
    setExtraMinutes('');
    setNote('');
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="متجر جديد">
      <Field label="اسم المتجر أو السوق" value={name} onChangeText={setName} />
      <Txt kind="label">لو في سكتك أو هو الأقرب، سيب المسافة والوقت فاضيين.</Txt>
      <View style={styles.inline}>
        <Field label="كيلو زيادة رايح جاي" grow value={extraKm} onChangeText={setExtraKm} keyboardType="decimal-pad" />
        <Field label="دقايق زيادة" grow value={extraMinutes} onChangeText={setExtraMinutes} keyboardType="number-pad" />
      </View>
      <Field label="ملاحظة (اختياري)" value={note} onChangeText={setNote} />
      <Button kind="primary" label="احفظ المتجر" onPress={handleAdd} disabled={name.trim() === ''} />
    </Sheet>
  );
}

const useStyles = themed((c) => ({
  shop: { gap: Spacing.one, paddingVertical: Spacing.two, borderBottomWidth: Rule.hair, borderBottomColor: c.rule },
  row: { flexDirection: RowDir, alignItems: 'center' },
  inline: { flexDirection: RowDir, gap: Spacing.two, alignItems: 'flex-end' },
  grow: { flex: 1 },
}));
