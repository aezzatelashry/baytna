import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Chip, Field, IconButton, Sheet, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { MIN_TOUCH, RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { formatSar, parsePrice } from '@/domain/budget';
import {
  daysLeft,
  isRunningLow,
  STAPLE_KIND_LABELS,
  STAPLE_KINDS,
  summarizePantry,
  weeklyShare,
  type Staple,
  type StapleKind,
} from '@/domain/pantry';
import { toDateKey } from '@/domain/week';
import { useStore } from '@/store/store';

const DELETE_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };

function lifeLine(staple: Staple, today: string): string {
  const left = daysLeft(staple, today);
  if (left === null) return 'لسه مش معروف بيقعد قد إيه. هيتحسب من تاني شراء.';
  if (left <= 0) return 'المفروض خلص. اشتريه مع أقرب مشوار.';
  return `باقي حوالي ${left} يوم`;
}

/** Rice, oil, spices, cleaning: bought once, used for weeks, costed per week of use. */
export function Pantry() {
  const staples = useStore((state) => state.staples);
  const styles = useStyles();
  const [isAdding, setIsAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const today = toDateKey(new Date());
  const summary = summarizePantry(staples);
  const groups = STAPLE_KINDS.map((kind) => ({ kind, rows: staples.filter((staple) => staple.kind === kind) })).filter(
    (group) => group.rows.length > 0,
  );
  const open = staples.find((staple) => staple.id === openId);

  return (
    <View style={styles.block}>
      <Tile>
        <Txt kind="title">المخزن الطويل</Txt>
        <Txt>الرز والزيت والتوابل والمنظفات بتتشري مرة وتقعد أسابيع، فتكلفتها بتتوزّع على مدة استخدامها.</Txt>
        {staples.length > 0 && (
          <Txt kind="strong">نصيب الأسبوع من المخزن: {formatSar(summary.weekly)} ريال</Txt>
        )}
        {summary.unknownCount > 0 && (
          <Txt kind="label">{summary.unknownCount} صنف لسه مدته مش معروفة، فمش داخلين في الرقم.</Txt>
        )}
        <Button kind="primary" label="أضف صنف للمخزن" onPress={() => setIsAdding(true)} />
      </Tile>

      {groups.map((group) => (
        <View key={group.kind}>
          <Txt kind="title">{STAPLE_KIND_LABELS[group.kind]}</Txt>
          {group.rows.map((staple) => {
            const share = weeklyShare(staple);
            return (
              <Pressable
                key={staple.id}
                accessibilityRole="button"
                accessibilityLabel={`${staple.name}، ${lifeLine(staple, today)}، افتح`}
                onPress={() => setOpenId(staple.id)}
                style={styles.row}>
                <View style={styles.grow}>
                  <Txt kind="strong">{staple.name}</Txt>
                  <Txt kind="label" tone={isRunningLow(staple, today) ? 'tight' : undefined}>
                    {lifeLine(staple, today)}
                  </Txt>
                </View>
                <View>
                  <Txt kind="strong">{formatSar(staple.price)} ريال</Txt>
                  {share !== null && <Txt kind="label">{formatSar(share)} في الأسبوع</Txt>}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <NewStapleSheet isOpen={isAdding} onClose={() => setIsAdding(false)} />
      {open && <StapleSheet staple={open} onClose={() => setOpenId(null)} />}
    </View>
  );
}

function NewStapleSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const addStaple = useStore((state) => state.addStaple);
  const styles = useStyles();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<StapleKind>('grains');
  const [price, setPrice] = useState('');
  const [life, setLife] = useState('');
  const [problem, setProblem] = useState('');

  const handleAdd = (): void => {
    const paid = parsePrice(price);
    const days = parsePrice(life);
    if (name.trim() === '' || paid === null) return setProblem('اكتب اسم الصنف وسعره.');
    addStaple({ name, kind, price: paid, lifeDays: days !== null && days > 0 ? Math.round(days) : null });
    setName('');
    setPrice('');
    setLife('');
    setProblem('');
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="صنف للمخزن">
      <Field label="الصنف والحجم" value={name} onChangeText={setName} />
      <View style={styles.chips}>
        {STAPLE_KINDS.map((each) => (
          <Chip key={each} label={STAPLE_KIND_LABELS[each]} selected={kind === each} onPress={() => setKind(each)} />
        ))}
      </View>
      <View style={styles.inline}>
        <Field label="السعر بالريال" grow value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <Field label="بيقعد كام يوم؟ (اختياري)" grow value={life} onChangeText={setLife} keyboardType="number-pad" />
      </View>
      {problem !== '' && (
        <Txt kind="label" tone="over">
          {problem}
        </Txt>
      )}
      <Button kind="primary" label="احفظ في المخزن" onPress={handleAdd} />
    </Sheet>
  );
}

function StapleSheet({ staple, onClose }: { staple: Staple; onClose: () => void }) {
  const restockStaple = useStore((state) => state.restockStaple);
  const removeStaple = useStore((state) => state.removeStaple);
  const restoreStaple = useStore((state) => state.restoreStaple);
  const styles = useStyles();
  const [price, setPrice] = useState(formatSar(staple.price));

  const handleRestock = (): void => {
    const paid = parsePrice(price);
    if (paid === null) return;
    restockStaple(staple.id, paid);
    showToast(`اتسجّل شراء "${staple.name}"`);
    onClose();
  };
  const handleRemove = (): void => {
    removeStaple(staple.id);
    showToast(`اتشال "${staple.name}" من المخزن`, () => restoreStaple(staple));
    onClose();
  };

  return (
    <Sheet isOpen onClose={onClose} title={staple.name}>
      <Txt kind="label">
        آخر شراء يوم {staple.boughtOn}
        {staple.lifeDays !== null ? `، وبيقعد حوالي ${staple.lifeDays} يوم` : ''}.
      </Txt>
      <Field label="سعر العبوة الجديدة بالريال" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <Button kind="primary" label="اشتريت عبوة جديدة النهارده" onPress={handleRestock} />
      <View style={styles.inline}>
        <View style={styles.grow} />
        <IconButton icon={DELETE_ICON} label={`احذف ${staple.name}`} tone="danger" onPress={handleRemove} />
      </View>
    </Sheet>
  );
}

const useStyles = themed((c) => ({
  block: { gap: Spacing.four },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
  inline: { flexDirection: RowDir, gap: Spacing.two, alignItems: 'flex-end' },
  grow: { flex: 1 },
  row: {
    flexDirection: RowDir,
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MIN_TOUCH,
    paddingVertical: Spacing.two,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
}));
