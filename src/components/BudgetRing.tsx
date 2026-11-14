import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { CountUp } from '@/components/CountUp';
import { Txt, type Tone } from '@/components/kit';
import { themed, usePalette } from '@/constants/theme';
import { formatSar } from '@/domain/budget';

const SIZE = 220;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER_FIGURE = 48;
const SWEEP_MS = 700;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type BudgetRingProps = {
  remaining: number;
  budget: number;
  tone: Tone;
};

/** The week's money as a ring: the filled arc is what is left. */
export function BudgetRing({ remaining, budget, tone }: BudgetRingProps) {
  const styles = useStyles();
  const palette = usePalette();
  const left = budget > 0 ? Math.min(Math.max(remaining / budget, 0), 1) : 0;

  // The arc sweeps to its new length whenever the money left changes.
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(left, { duration: SWEEP_MS, reduceMotion: ReduceMotion.System });
  }, [left, shown]);
  const arc = useAnimatedProps(() => ({
    strokeDasharray: [CIRCUMFERENCE * shown.value, CIRCUMFERENCE],
  }));

  return (
    <View
      accessible
      accessibilityLabel={`الباقي ${formatSar(remaining)} ريال من ${formatSar(budget)}`}
      style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={palette.track} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={palette[tone]}
          strokeWidth={STROKE}
          strokeLinecap="round"
          animatedProps={arc}
          fill="none"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Txt kind="label" style={styles.centerText}>
          الباقي
        </Txt>
        <CountUp kind="figure" value={remaining} tone={tone} style={styles.figure} />
        <Txt kind="label" style={styles.centerText}>
          ريال من {formatSar(budget)}
        </Txt>
      </View>
    </View>
  );
}

const useStyles = themed(() => ({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  centerText: { textAlign: 'center' },
  figure: { fontSize: CENTER_FIGURE, lineHeight: CENTER_FIGURE * 1.2, textAlign: 'center' },
}));
