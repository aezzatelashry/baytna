import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip, Txt } from '@/components/kit';
import { RowDir, Spacing } from '@/constants/theme';
import { useStore } from '@/store/store';
import { isLockSupported, LOCK_PROBLEM_TEXT, lockProblem, unlockWithBiometrics } from '@/sync/app-lock';

/** Turns the fingerprint lock on or off. Turning it on asks for the fingerprint once, to prove it works. */
export function LockBlock() {
  const isLockOn = useStore((state) => state.appLock);
  const setAppLock = useStore((state) => state.setAppLock);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!isLockSupported()) return null;

  const handleTurnOn = async (): Promise<void> => {
    if (isBusy || isLockOn) return;
    setIsBusy(true);
    setMessage('');
    try {
      const problem = await lockProblem();
      if (problem !== null) setMessage(LOCK_PROBLEM_TEXT[problem]);
      else if (await unlockWithBiometrics()) setAppLock(true);
      else setMessage('البصمة ما اتأكدتش، فالقفل ما اتفعّلش.');
    } catch {
      setMessage('القفل ما اتفعّلش. جرّب تاني.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleTurnOff = (): void => {
    setMessage('');
    setAppLock(false);
  };

  return (
    <View style={styles.block}>
      <Txt kind="title">قفل التطبيق</Txt>
      <Txt>لما يتفعّل، بيتنا يطلب بصمتك أو قفل الموبايل كل مرة يتفتح.</Txt>
      <View style={styles.chips}>
        <Chip label="مقفول بالبصمة" selected={isLockOn} onPress={() => void handleTurnOn()} />
        <Chip label="مفتوح" selected={!isLockOn} onPress={handleTurnOff} />
      </View>
      {message !== '' && <Txt kind="label">{message}</Txt>}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.three },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
});
