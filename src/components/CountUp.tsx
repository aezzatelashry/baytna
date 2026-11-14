import { useEffect, useRef, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Txt, type Tone } from '@/components/kit';
import { formatSar } from '@/domain/budget';

const DURATION_MS = 600;

type CountUpProps = {
  value: number;
  kind?: 'figure' | 'title' | 'strong';
  tone?: Tone;
  style?: StyleProp<TextStyle>;
};

/** A money figure that rolls from its old value to the new one instead of jumping. */
export function CountUp({ value, kind = 'strong', tone, style }: CountUpProps) {
  const isReduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (isReduced || start === value) return setShown(value);

    const startedAt = Date.now();
    let frame = requestAnimationFrame(function step() {
      const progress = Math.min((Date.now() - startedAt) / DURATION_MS, 1);
      // Ease out: fast at first, settling on the final number.
      const eased = 1 - (1 - progress) ** 3;
      // Whole riyals on the way, the exact figure at the end.
      setShown(progress < 1 ? Math.round(start + (value - start) * eased) : value);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, isReduced]);

  return (
    <Txt kind={kind} tone={tone} style={style}>
      {formatSar(shown)}
    </Txt>
  );
}
