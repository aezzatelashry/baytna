import { useState } from 'react';
import { Share, View } from 'react-native';

import { Button, Field, IconButton, Sheet, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Spacing, themed } from '@/constants/theme';
import { formatSar, parsePrice } from '@/domain/budget';
import { weekReport, type WeekReport } from '@/domain/thrift';
import { CATEGORY_LABELS } from '@/domain/types';
import { fromDateKey, toDateKey } from '@/domain/week';
import { currentWeekStart, useStore } from '@/store/store';

const SHARE_ICON: IconName = { ios: 'square.and.arrow.up', android: 'share', web: 'share' };
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TOP_CHANGES = 3;

function savedLine(report: WeekReport): string {
  if (report.saved === null) return 'لسه مفيش أسبوع فات نقارن بيه.';
  if (report.saved === 0) return 'زي الأسبوع اللي فات بالظبط.';
  return report.saved > 0
    ? `أقل من الأسبوع اللي فات بـ ${formatSar(report.saved)} ريال.`
    : `أكتر من الأسبوع اللي فات بـ ${formatSar(Math.abs(report.saved))} ريال.`;
}

function shareText(report: WeekReport): string {
  return [
    'تقرير أسبوع بيتنا',
    `اتصرف: ${formatSar(report.spent)} ريال`,
    savedLine(report),
    report.wastedCount > 0 ? `اترمى: ${report.wastedCount} صنف بـ ${formatSar(report.wasted)} ريال` : 'ما اترماش حاجة',
  ].join('\n');
}

/** The week so far against last week, with what was thrown away. */
export function WeekReportTile() {
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const items = useStore((state) => state.items);
  const waste = useStore((state) => state.waste);
  const addWaste = useStore((state) => state.addWaste);
  const styles = useStyles();
  const [isAddingWaste, setIsAddingWaste] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const weekStart = currentWeekStart(weekStartsOn);
  const lastWeekStart = toDateKey(new Date(fromDateKey(weekStart).getTime() - WEEK_MS));
  const report = weekReport(
    items.filter((item) => item.weekStart === weekStart),
    items.filter((item) => item.weekStart === lastWeekStart),
    waste.filter((entry) => entry.date >= weekStart),
  );

  const handleAddWaste = (): void => {
    if (name.trim() === '') return;
    addWaste(name, parsePrice(price) ?? 0);
    showToast(`اتسجّل إن "${name.trim()}" اترمى`);
    setName('');
    setPrice('');
    setIsAddingWaste(false);
  };

  return (
    <Tile>
      <View style={styles.row}>
        <Txt kind="title" style={styles.grow}>
          تقرير الأسبوع
        </Txt>
        <IconButton
          icon={SHARE_ICON}
          label="شارك تقرير الأسبوع"
          onPress={() => void Share.share({ message: shareText(report) }).catch(() => undefined)}
        />
      </View>
      <Txt kind="strong" tone={report.saved !== null && report.saved < 0 ? 'tight' : 'ok'}>
        {savedLine(report)}
      </Txt>
      {(report.saved === null ? [] : report.changes.slice(0, TOP_CHANGES)).map((change) => (
        <Txt key={change.category} kind="label">
          {CATEGORY_LABELS[change.category]}: {formatSar(change.thisWeek)} ريال، وكانت {formatSar(change.lastWeek)}
        </Txt>
      ))}
      <Txt>
        {report.wastedCount === 0
          ? 'ما اتسجّلش إن حاجة اترمت الأسبوع ده.'
          : `اترمى ${report.wastedCount} صنف بـ ${formatSar(report.wasted)} ريال.`}
      </Txt>
      <Button label="سجّل حاجة اترمت" onPress={() => setIsAddingWaste(true)} />

      <Sheet isOpen={isAddingWaste} onClose={() => setIsAddingWaste(false)} title="حاجة اترمت">
        <Txt>تسجيل اللي بيترمى بيوضّح إيه اللي بتشتروه زيادة.</Txt>
        <Field label="إيه اللي اترمى؟" value={name} onChangeText={setName} />
        <Field label="كان بكام ريال؟ (اختياري)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <Button kind="primary" label="سجّل" onPress={handleAddWaste} disabled={name.trim() === ''} />
      </Sheet>
    </Tile>
  );
}

const useStyles = themed(() => ({
  row: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
}));
