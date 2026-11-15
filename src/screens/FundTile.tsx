import { useState } from 'react';

import { Button, Field, Sheet, Tile, Txt } from '@/components/kit';
import { showToast } from '@/components/toast';
import { formatSar, parsePrice } from '@/domain/budget';
import { FUND_LABELS, type FundKind } from '@/domain/funds';
import { useStore } from '@/store/store';

const EXPLAINERS: Record<FundKind, string> = {
  pantry: 'مبلغ صغير كل أسبوع لشراء الرز والزيت والمنظفات، عشان الشروة الكبيرة ما تبقاش مفاجأة. أي صنف تسجّله في المخزن بيتخصم منه.',
  offers: 'مبلغ صغير كل أسبوع تخزّن بيه لما ينزل عرض حقيقي على حاجة بتستخدموها. سجّل اللي تصرفه منها.',
};

type FundTileProps = {
  kind: FundKind;
};

/** A weekly set-aside: its balance, how much goes in, and (for offers) taking money out. */
export function FundTile({ kind }: FundTileProps) {
  const fund = useStore((state) => state.funds[kind]);
  const setFundWeekly = useStore((state) => state.setFundWeekly);
  const spendFund = useStore((state) => state.spendFund);
  const fillFunds = useStore((state) => state.fillFunds);
  const [weekly, setWeekly] = useState(fund.weekly > 0 ? formatSar(fund.weekly) : '');
  const [isSpending, setIsSpending] = useState(false);
  const [spent, setSpent] = useState('');

  const handleWeekly = (): void => {
    setFundWeekly(kind, parsePrice(weekly) ?? 0);
    // The first amount starts the fund for the current week straight away.
    fillFunds();
  };
  const handleSpend = (): void => {
    const amount = parsePrice(spent);
    if (amount === null || amount === 0) return;
    spendFund(kind, amount);
    showToast(`اتخصم ${formatSar(amount)} ريال من ${FUND_LABELS[kind]}`);
    setSpent('');
    setIsSpending(false);
  };

  return (
    <Tile>
      <Txt kind="title">{FUND_LABELS[kind]}</Txt>
      <Txt>{EXPLAINERS[kind]}</Txt>
      <Txt kind="strong" tone={fund.balance < 0 ? 'over' : 'ok'}>
        {fund.balance < 0 ? `متعدّي بـ ${formatSar(Math.abs(fund.balance))} ريال` : `الرصيد ${formatSar(fund.balance)} ريال`}
      </Txt>
      <Field
        label="بتحوّش كام ريال كل أسبوع؟"
        value={weekly}
        onChangeText={setWeekly}
        onEndEditing={handleWeekly}
        keyboardType="decimal-pad"
      />
      {kind === 'offers' && <Button label="صرفت من الحصّالة" onPress={() => setIsSpending(true)} />}

      <Sheet isOpen={isSpending} onClose={() => setIsSpending(false)} title={`صرفت من ${FUND_LABELS[kind]}`}>
        <Field label="المبلغ بالريال" autoFocus value={spent} onChangeText={setSpent} keyboardType="decimal-pad" />
        <Button kind="primary" label="اخصم" onPress={handleSpend} />
      </Sheet>
    </Tile>
  );
}
