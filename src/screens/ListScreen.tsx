import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import Swipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button, Chip, Field, Icon, IconButton, Row, Sheet, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';

import { BarcodeScanner, type ScanResult } from './list/BarcodeScanner';
import { ItemPhoto, substituteKey, useItemPhoto } from './list/ItemPhoto';
import { OrderBanner } from './list/OrderBanner';
import { Pantry } from './list/Pantry';
import { MIN_TOUCH, Radius, RowDir, Rule, Spacing, themed, usePalette } from '@/constants/theme';
import { formatSar, parsePrice } from '@/domain/budget';
import { cheaperAlternative, knownPrice } from '@/domain/prices';
import { groupByStore, listMessage } from '@/domain/share-list';
import { offerForItem, type ItemOffer } from '@/domain/offers';
import { dayName, toDateKey } from '@/domain/week';
import { CATEGORIES, CATEGORY_LABELS, type Category, type ListItem } from '@/domain/types';
import { currentWeekStart, useStore } from '@/store/store';

type ListScreenProps = {
  /** The add sheet is opened by the floating button in the shell. */
  isAdding: boolean;
  onCloseAdd: () => void;
};

export function ListScreen({ isAdding, onCloseAdd }: ListScreenProps) {
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const allItems = useStore((state) => state.items);
  const addItem = useStore((state) => state.addItem);
  const offers = useStore((state) => state.offers);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<Category>('produce');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const rememberBarcode = useStore((state) => state.rememberBarcode);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<'week' | 'pantry'>('week');
  const styles = useStyles();
  const palette = usePalette();

  const weekStart = currentWeekStart(weekStartsOn);
  const items = allItems.filter((item) => item.weekStart === weekStart && !item.deleted);
  const groups = CATEGORIES.map((key) => ({
    key,
    rows: items.filter((item) => item.category === key).sort((a, b) => Number(a.bought) - Number(b.bought)),
  })).filter((group) => group.rows.length > 0);

  const toBuy = items.filter((item) => !item.bought).map((item) => item.name);
  const handleShare = (): void => {
    const message = listMessage(groupByStore(toBuy, offers, toDateKey(new Date())));
    void Share.share({ message }).catch(() => undefined);
  };
  const handleAdd = (): void => {
    if (name.trim() === '') return;
    addItem({ name, qty: 1, unit: '', category, estPrice: parsePrice(price) });
    // The name typed after a scan teaches the phone that barcode for next time.
    if (scannedCode !== null) rememberBarcode(scannedCode, name);
    setScannedCode(null);
    setName('');
    setPrice('');
  };
  const handleScanned = ({ code, name: found }: ScanResult): void => {
    setScannedCode(code);
    if (found !== null) setName(found);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headRow}>
        <Txt kind="head" style={styles.grow}>
          قائمة المشتريات
        </Txt>
        {toBuy.length > 0 && <IconButton icon={SHARE_ICON} label="شارك القائمة مقسّمة حسب المتجر" onPress={handleShare} />}
      </View>
      <View accessibilityRole="tablist" style={styles.chips}>
        <Chip label="قائمة الأسبوع" selected={view === 'week'} onPress={() => setView('week')} />
        <Chip label="المخزن" selected={view === 'pantry'} onPress={() => setView('pantry')} />
      </View>
      {view === 'pantry' && <Pantry />}
      {view === 'week' && <OrderBanner items={items} />}

      <Sheet isOpen={isAdding} onClose={onCloseAdd} title="صنف جديد">
        <View style={styles.inline}>
          <Field label="الصنف" grow autoFocus value={name} onChangeText={setName} onSubmitEditing={handleAdd} returnKeyType="done" />
          <Field label="السعر المتوقع" value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.priceInput} />
        </View>
        <BarcodeScanner onScanned={handleScanned} />
        <View style={styles.chips}>
          {CATEGORIES.map((key) => (
            <Chip key={key} label={CATEGORY_LABELS[key]} selected={category === key} onPress={() => setCategory(key)} />
          ))}
        </View>
        <Button kind="primary" label="أضف للقائمة" onPress={handleAdd} disabled={name.trim() === ''} />
        <Txt kind="label">الورقة بتفضل مفتوحة عشان تضيف أكتر من صنف ورا بعض.</Txt>
      </Sheet>

      {view === 'week' && groups.length === 0 && (
        <Tile>
          <Txt kind="title">القائمة فاضية</Txt>
          <Txt>اضغط علامة الزائد تحت عشان تضيف صنف، أو أضف مكونات وجبة من صفحة الوجبات.</Txt>
        </Tile>
      )}

      {(view === 'week' ? groups : []).map((group) => (
        <View key={group.key}>
          <View style={styles.groupHead}>
            <Icon name={CATEGORY_ICONS[group.key]} color={palette.brand} size={GROUP_ICON_SIZE} />
            <Txt kind="title">{CATEGORY_LABELS[group.key]}</Txt>
          </View>
          {group.rows.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              onToggleOpen={() => setOpenId(openId === item.id ? null : item.id)}
              onDone={() => setOpenId(null)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

type ItemRowProps = {
  item: ListItem;
  isOpen: boolean;
  onToggleOpen: () => void;
  onDone: () => void;
};

function priceLabel(item: ListItem): string {
  const price = item.bought ? (item.paidPrice ?? item.estPrice) : item.estPrice;
  return price === null ? 'من غير سعر' : `${formatSar(price)} ريال`;
}

/** Where to buy it and whether the offer really beats what the family last paid. */
function offerLine({ offer, verdict, saving }: ItemOffer): string {
  const pack = offer.packQty > 1 ? ` لـ ${offer.packQty} حبة` : '';
  const until = offer.validUntil === null ? '' : `، لحد ${dayName(offer.validUntil)}`;
  const base = `عرض ${offer.store}: ${formatSar(offer.price)} ريال${pack}${until}`;
  if (verdict === 'cheaper' && saving !== null) return `${base}. أرخص من آخر سعر دفعتوه بـ ${formatSar(saving)} ريال.`;
  if (verdict === 'dearer' && saving !== null) return `${base}. أغلى من آخر سعر دفعتوه بـ ${formatSar(-saving)} ريال.`;
  if (verdict === 'same') return `${base}. نفس آخر سعر دفعتوه.`;
  return `${base}.`;
}

function ItemRow({ item, isOpen, onToggleOpen, onDone }: ItemRowProps) {
  const setBought = useStore((state) => state.setBought);
  const setEstPrice = useStore((state) => state.setEstPrice);
  const removeItem = useStore((state) => state.removeItem);
  const restoreItem = useStore((state) => state.restoreItem);
  const markNotFound = useStore((state) => state.markNotFound);
  const clearNotFound = useStore((state) => state.clearNotFound);
  const offers = useStore((state) => state.offers);
  const priceBook = useStore((state) => state.priceBook);
  const photo = useItemPhoto(item.name);
  const [substitute, setSubstitute] = useState(item.substitute ?? '');
  const styles = useStyles();
  const palette = usePalette();
  const swipeable = useRef<SwipeableMethods>(null);
  const swipedAt = useRef(0);
  const [paid, setPaid] = useState(item.estPrice === null ? '' : formatSar(item.estPrice));

  const found = item.bought ? null : offerForItem(item.name, offers, knownPrice(priceBook, item.name), toDateKey(new Date()));
  const alternative = item.bought ? null : cheaperAlternative(priceBook, item.name, item.estPrice);
  const quantity = item.unit === '' ? '' : `${item.qty} ${item.unit}`;
  const stateLabel = item.bought ? 'اتشترى' : 'لسه';
  const isMissing = item.notFound === true && !item.bought;
  const flags = [
    item.urgent === true && !item.bought ? 'مستعجل' : '',
    isMissing ? `مش موجود${item.substitute ? `، البديل: ${item.substitute}` : ''}` : '',
  ]
    .filter(Boolean)
    .join('، ');
  const handleNotFound = (): void => {
    markNotFound(item.id, substitute.trim() === '' ? null : substitute.trim());
    onDone();
  };

  const handleBought = (): void => {
    setBought(item.id, true, parsePrice(paid));
    onDone();
  };
  const handleSavePrice = (): void => {
    setEstPrice(item.id, parsePrice(paid));
    onDone();
  };
  const handleUndo = (): void => {
    setBought(item.id, false, null);
    onDone();
  };
  const handleRemove = (): void => {
    removeItem(item.id);
    showToast(`اتشال "${item.name}" من القائمة`, () => restoreItem(item.id));
    onDone();
  };

  const handleToggleBought = (): void => {
    setBought(item.id, !item.bought, item.bought ? null : item.estPrice);
  };

  /** A full swipe acts at once: one side buys, the other deletes (with undo). */
  const handleSwipe = (direction: SwipeDirection): void => {
    swipedAt.current = Date.now();
    swipeable.current?.reset();
    if (direction === BUY_DRAG) handleToggleBought();
    else handleRemove();
  };
  /** A drag can end as a press on the web; that press must not open the editor. */
  const handlePressRow = (): void => {
    if (Date.now() - swipedAt.current > SWIPE_PRESS_GUARD_MS) onToggleOpen();
  };

  return (
    <View>
      <Swipeable
        ref={swipeable}
        friction={1.5}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableOpenStartDrag={() => {
          swipedAt.current = Date.now();
        }}
        onSwipeableOpen={handleSwipe}
        renderLeftActions={() => <SwipePanel side={SwipeDirection.LEFT} />}
        renderRightActions={() => <SwipePanel side={SwipeDirection.RIGHT} />}>
      <Row style={styles.rowSurface}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${item.name}، اشتريته`}
          accessibilityState={{ checked: item.bought }}
          onPress={handleToggleBought}
          style={styles.checkTouch}>
          <View style={[styles.check, item.bought && styles.checkDone]}>
            {item.bought && (
              // The tick pops in when the item is bought. The phone's "reduce motion" setting turns it off.
              <Animated.View entering={ZoomIn.duration(CHECK_POP_MS)}>
                <Icon name={CHECK_ICON} color={palette.brandInk} size={CHECK_ICON_SIZE} />
              </Animated.View>
            )}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.name}، ${stateLabel}، ${priceLabel(item)}، عدّل`}
          accessibilityState={{ expanded: isOpen }}
          onPress={handlePressRow}
          style={styles.rowBody}>
          {photo !== undefined && <Image source={{ uri: photo }} contentFit="cover" style={styles.itemThumb} />}
          <View style={styles.grow}>
            <Txt kind="strong" style={item.bought && styles.boughtName}>
              {item.name}
            </Txt>
            {quantity !== '' && <Txt kind="label">{quantity}</Txt>}
            {flags !== '' && (
              <Txt kind="label" tone="tight">
                {flags}
              </Txt>
            )}
            {found !== null && (
              <Txt kind="label" tone={found.verdict === 'dearer' ? 'over' : found.verdict === 'cheaper' ? 'ok' : undefined}>
                {offerLine(found)}
              </Txt>
            )}
            {alternative !== null && (
              <Txt kind="label" tone="ok">
                {`اشتريتوا "${alternative.name}" قبل كده بـ ${formatSar(alternative.price)} ريال، أرخص بـ ${formatSar(alternative.saving)}.`}
              </Txt>
            )}
          </View>
          <Txt kind={item.bought ? 'body' : 'strong'}>{priceLabel(item)}</Txt>
        </Pressable>
      </Row>
      </Swipeable>

      <Sheet isOpen={isOpen} onClose={onDone} title={item.name}>
        {quantity !== '' && <Txt kind="label">{quantity}</Txt>}
        <ItemPhoto itemName={item.name} />
        {item.bought ? (
          <Txt>اتشترى بـ {priceLabel(item)}.</Txt>
        ) : (
          <Field label="السعر بالريال" autoFocus value={paid} onChangeText={setPaid} keyboardType="decimal-pad" />
        )}
        {item.bought ? (
          <Button kind="primary" label="رجّعه للقائمة" onPress={handleUndo} />
        ) : (
          <Button kind="primary" label="اشتريته" onPress={handleBought} />
        )}
        {!item.bought && !isMissing && (
          <>
            <Field label="لو مش موجود، بديل مقترح (اختياري)" value={substitute} onChangeText={setSubstitute} />
            <ItemPhoto itemName={substituteKey(item.name)} hint="صوّر البديل اللي لقيته، عشان صاحب الطلب يوافق عليه." />
            <Button label="مش لاقيه في المتجر" onPress={handleNotFound} />
          </>
        )}
        {isMissing && <ItemPhoto itemName={substituteKey(item.name)} hint="لسه مفيش صورة للبديل." />}
        {isMissing && (
          <Button
            label="لقيته، شيل علامة مش موجود"
            onPress={() => {
              clearNotFound(item.id);
              onDone();
            }}
          />
        )}
        <View style={styles.actions}>
          {!item.bought && <Button label="احفظ السعر" onPress={handleSavePrice} />}
          <View style={styles.grow} />
          <IconButton icon={DELETE_ICON} label={`احذف ${item.name}`} tone="danger" onPress={handleRemove} />
        </View>
      </Sheet>
    </View>
  );
}

/** What sits behind the row while it is dragged: green to buy, red to delete. */
function SwipePanel({ side }: { side: SwipeDirection }) {
  const styles = useStyles();
  const palette = usePalette();
  const isBuy = side === BUY_PANEL;
  return (
    <View style={[styles.panel, isBuy ? styles.panelBuy : styles.panelDelete, side === SwipeDirection.LEFT ? styles.panelStart : styles.panelEnd]}>
      <Icon name={isBuy ? CHECK_ICON : DELETE_ICON} color={isBuy ? palette.brandInk : palette.accentInk} />
      <Txt kind="strong" style={isBuy ? styles.panelBuyText : styles.panelDeleteText}>
        {isBuy ? 'اتشترى' : 'حذف'}
      </Txt>
    </View>
  );
}

/**
 * Dragging the row toward the right buys it; toward the left deletes it.
 * The library reports the drag direction, and a drag to the right uncovers the left panel.
 */
const BUY_DRAG = SwipeDirection.RIGHT;
const BUY_PANEL = SwipeDirection.LEFT;
const SWIPE_PRESS_GUARD_MS = 800;
const DELETE_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };
const SHARE_ICON: IconName = { ios: 'square.and.arrow.up', android: 'share', web: 'share' };
const GROUP_ICON_SIZE = 20;
const ITEM_THUMB_SIZE = 44;
/** One picture per aisle, so the eye finds the section before it reads the word. */
const CATEGORY_ICONS: Record<Category, IconName> = {
  protein: { ios: 'fish.fill', android: 'set_meal', web: 'set_meal' },
  produce: { ios: 'carrot.fill', android: 'eco', web: 'eco' },
  fruit: { ios: 'leaf.fill', android: 'nutrition', web: 'nutrition' },
  dairy: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  bakery: { ios: 'birthday.cake.fill', android: 'bakery_dining', web: 'bakery_dining' },
  pantry: { ios: 'cabinet.fill', android: 'kitchen', web: 'kitchen' },
  household: { ios: 'house.fill', android: 'cleaning_services', web: 'cleaning_services' },
};
const CHECK_SIZE = 28;
const CHECK_ICON_SIZE = 18;
const CHECK_POP_MS = 180;
const PRICE_FIELD_WIDTH = 120;
const CHECK_ICON: IconName = { ios: 'checkmark', android: 'check', web: 'check' };

const useStyles = themed((c) => ({
  screen: { gap: Spacing.four },
  headRow: { flexDirection: RowDir, alignItems: 'center' },
  groupHead: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
  itemThumb: { width: ITEM_THUMB_SIZE, height: ITEM_THUMB_SIZE, borderRadius: Radius.control },
  inline: { flexDirection: RowDir, gap: Spacing.two, alignItems: 'flex-end' },
  priceInput: { width: PRICE_FIELD_WIDTH },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
  grow: { flex: 1 },
  checkTouch: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: Radius.pill,
    borderWidth: Rule.bar,
    borderColor: c.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: c.brand },
  rowSurface: { backgroundColor: c.paper },
  panel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four },
  panelStart: { justifyContent: 'flex-start' },
  panelEnd: { justifyContent: 'flex-end' },
  panelBuy: { backgroundColor: c.brand },
  panelDelete: { backgroundColor: c.accent },
  panelBuyText: { color: c.brandInk },
  panelDeleteText: { color: c.accentInk },
  rowBody: { flex: 1, flexDirection: RowDir, alignItems: 'center', gap: Spacing.three, minHeight: MIN_TOUCH },
  boughtName: { textDecorationLine: 'line-through', color: c.muted },
  actions: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
}));
