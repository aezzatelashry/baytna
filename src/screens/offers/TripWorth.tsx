import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, Sheet, Tile, Txt } from '@/components/kit';
import { RowDir, Spacing, themed } from '@/constants/theme';
import { formatSar, parsePrice } from '@/domain/budget';
import { judgeTrip, MIN_NET_SAR, type TripVerdict } from '@/domain/trip';
import { useStore } from '@/store/store';

function shown(value: number | undefined): string {
  return value !== undefined && value > 0 ? formatSar(value) : '';
}

/** "Is the far shop worth the drive?": the saving against fuel, time and traffic. */
export function TripWorth() {
  const car = useStore((state) => state.car);
  const setCar = useStore((state) => state.setCar);
  const styles = useStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState('');
  const [extraKm, setExtraKm] = useState('');
  const [extraMinutes, setExtraMinutes] = useState('');
  const [fuelPrice, setFuelPrice] = useState(shown(car?.fuelPricePerLitre));
  const [consumption, setConsumption] = useState(shown(car?.litresPer100Km));
  const [timeValue, setTimeValue] = useState(shown(car?.timeValuePerHour));
  const [verdict, setVerdict] = useState<TripVerdict | null>(null);
  const [problem, setProblem] = useState('');

  const handleJudge = (): void => {
    const fuelPricePerLitre = parsePrice(fuelPrice);
    const litresPer100Km = parsePrice(consumption);
    const input = { saving: parsePrice(saving), extraKm: parsePrice(extraKm), extraMinutes: parsePrice(extraMinutes) ?? 0 };
    if (input.saving === null || input.extraKm === null) return setProblem('اكتب التوفير والمسافة الزيادة بالأرقام.');
    if (fuelPricePerLitre === null || fuelPricePerLitre === 0 || litresPer100Km === null || litresPer100Km === 0) {
      return setProblem('اكتب سعر لتر البنزين واستهلاك عربيتك مرة واحدة، وهيتحفظوا.');
    }
    const costs = { fuelPricePerLitre, litresPer100Km, timeValuePerHour: parsePrice(timeValue) ?? 0 };
    setCar(costs);
    setProblem('');
    setVerdict(judgeTrip({ saving: input.saving, extraKm: input.extraKm, extraMinutes: input.extraMinutes }, costs));
  };

  return (
    <Tile>
      <Txt kind="title">المشوار البعيد يستاهل؟</Txt>
      <Txt>فرق ريال ولا اتنين ممكن يضيع في البنزين والزحمة. احسبها قبل ما تتحرك.</Txt>
      <Button label="احسب المشوار" onPress={() => setIsOpen(true)} />

      <Sheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="المشوار البعيد يستاهل؟">
        <Field label="هيوفّر كام ريال عن المكان القريب؟" value={saving} onChangeText={setSaving} keyboardType="decimal-pad" />
        <View style={styles.inline}>
          <Field label="كيلو زيادة رايح جاي" grow value={extraKm} onChangeText={setExtraKm} keyboardType="decimal-pad" />
          <Field label="دقايق زيادة" grow value={extraMinutes} onChangeText={setExtraMinutes} keyboardType="number-pad" />
        </View>

        <Txt kind="strong">عربيتك (بتتحفظ)</Txt>
        <View style={styles.inline}>
          <Field label="سعر لتر البنزين" grow value={fuelPrice} onChangeText={setFuelPrice} keyboardType="decimal-pad" />
          <Field label="لتر لكل 100 كم" grow value={consumption} onChangeText={setConsumption} keyboardType="decimal-pad" />
        </View>
        <Field label="قيمة ساعتك بالريال (اختياري)" value={timeValue} onChangeText={setTimeValue} keyboardType="decimal-pad" />

        {problem !== '' && (
          <Txt kind="label" tone="over">
            {problem}
          </Txt>
        )}
        <Button kind="primary" label="احسب" onPress={handleJudge} />

        {verdict !== null && (
          <View style={styles.result}>
            <Txt kind="title" tone={verdict.isWorthIt ? 'ok' : 'over'}>
              {verdict.isWorthIt ? 'يستاهل. روح.' : 'ما يستاهلش. اشتري من القريب.'}
            </Txt>
            <Txt>
              البنزين {formatSar(verdict.fuelCost)} ريال، ووقتك {formatSar(verdict.timeCost)} ريال.{' '}
              {verdict.net >= 0 ? 'مكسب' : 'خسارة'} {formatSar(Math.abs(verdict.net))} ريال.
            </Txt>
            <Txt kind="label">
              المشوار ده يستاهل لو التوفير {formatSar(verdict.breakEvenSaving)} ريال أو أكتر (بنحسب هامش {MIN_NET_SAR} ريال).
            </Txt>
          </View>
        )}
      </Sheet>
    </Tile>
  );
}

const useStyles = themed(() => ({
  inline: { flexDirection: RowDir, gap: Spacing.two, alignItems: 'flex-end' },
  result: { gap: Spacing.one },
}));
