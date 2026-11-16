import { Share, View } from 'react-native';

import { IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { RowDir, Spacing, themed } from '@/constants/theme';
import { formatSar } from '@/domain/budget';
import { monthReport, type MonthReport } from '@/domain/thrift';
import { fromDateKey, toDateKey } from '@/domain/week';
import { currentWeekStart, useStore } from '@/store/store';

const SHARE_ICON: IconName = { ios: 'square.and.arrow.up', android: 'share', web: 'share' };
const DAY_MS = 24 * 60 * 60 * 1000;
/** This week and the three before it. */
const WEEKS_BACK = 3;
const DAYS_IN_WEEK = 7;

function budgetLine(report: MonthReport): string {
  if (report.underBudget === 0) return 'على قد الميزانية بالظبط.';
  return report.underBudget > 0
    ? `تحت الميزانية بـ ${formatSar(report.underBudget)} ريال.`
    : `فوق الميزانية بـ ${formatSar(-report.underBudget)} ريال.`;
}

function lines(report: MonthReport): string[] {
  return [
    `اتصرف ${formatSar(report.spent)} ريال في ${report.weeks} أسبوع، والميزانية ${formatSar(report.budgeted)}.`,
    budgetLine(report),
    report.belowUsualCount > 0
      ? `${report.belowUsualCount} صنف اتشتروا بأقل من السعر المتوقع، ووفّروا ${formatSar(report.belowUsual)} ريال.`
      : 'مفيش صنف اتسجّل بسعر أقل من المتوقع.',
    report.wastedCount > 0 ? `اترمى ${report.wastedCount} صنف بـ ${formatSar(report.wasted)} ريال.` : 'ما اتسجّلش إن حاجة اترمت.',
  ];
}

/** The last four weeks from the family's own records. Shown once there is a purchase to report. */
export function MonthReportTile() {
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const items = useStore((state) => state.items);
  const waste = useStore((state) => state.waste);
  const budget = useStore((state) => state.budget);
  const styles = useStyles();

  const weekStart = currentWeekStart(weekStartsOn);
  const since = toDateKey(new Date(fromDateKey(weekStart).getTime() - WEEKS_BACK * DAYS_IN_WEEK * DAY_MS));
  const report = monthReport(items, waste, budget, since);
  if (report.weeks === 0) return null;

  const text = lines(report);
  const handleShare = (): void => {
    void Share.share({ message: ['تقرير بيتنا لآخر 4 أسابيع', ...text].join('\n') }).catch(() => undefined);
  };

  return (
    <Tile>
      <View style={styles.row}>
        <Txt kind="title" style={styles.grow}>
          آخر 4 أسابيع
        </Txt>
        <IconButton icon={SHARE_ICON} label="شارك تقرير آخر 4 أسابيع" onPress={handleShare} />
      </View>
      <Txt>{text[0]}</Txt>
      <Txt kind="strong" tone={report.underBudget < 0 ? 'tight' : 'ok'}>
        {text[1]}
      </Txt>
      <Txt>{text[2]}</Txt>
      <Txt kind="label">{text[3]}</Txt>
    </Tile>
  );
}

const useStyles = themed(() => ({
  row: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
}));
