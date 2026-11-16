import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';

import { Button, Icon, Txt, type IconName } from '@/components/kit';
import { Spacing, themed, usePalette } from '@/constants/theme';
import { useStore } from '@/store/store';
import { isLockSupported, unlockWithBiometrics } from '@/sync/app-lock';

const LOCK_ICON: IconName = { ios: 'lock.fill', android: 'lock', web: 'lock' };
const LOCK_ICON_SIZE = 56;

type GateProps = {
  children: ReactNode;
};

/** True once the saved settings are read back, so the lock choice is known before anything shows. */
function useIsHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(() => useStore.persist.hasHydrated());
  useEffect(() => useStore.persist.onFinishHydration(() => setIsHydrated(true)), []);
  return isHydrated;
}

/**
 * Keeps the app behind the phone's fingerprint or face when the family turned the lock on.
 * It locks again every time the app goes to the background.
 */
export function LockGate({ children }: GateProps) {
  const isLockOn = useStore((state) => state.appLock) && isLockSupported();
  const isHydrated = useIsHydrated();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const styles = useStyles();
  const palette = usePalette();

  const ask = useCallback(async (): Promise<void> => {
    setIsAsking(true);
    try {
      if (await unlockWithBiometrics()) setIsUnlocked(true);
    } catch {
      // A failed prompt leaves the app locked; the button lets the family try again.
    } finally {
      setIsAsking(false);
    }
  }, []);

  useEffect(() => {
    if (!isLockOn) return undefined;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') setIsUnlocked(false);
    });
    return () => subscription.remove();
  }, [isLockOn]);

  // The first prompt comes up by itself, so opening the app is one touch of the sensor.
  useEffect(() => {
    if (!isHydrated || !isLockOn) return undefined;
    let isCurrent = true;
    unlockWithBiometrics()
      .then((isOpen) => {
        if (isCurrent && isOpen) setIsUnlocked(true);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [isHydrated, isLockOn]);

  if (!isHydrated) return null;
  if (!isLockOn || isUnlocked) return <>{children}</>;

  return (
    <View style={styles.screen}>
      <Icon name={LOCK_ICON} color={palette.brand} size={LOCK_ICON_SIZE} />
      <Txt kind="head">بيتنا مقفول</Txt>
      <Txt>افتحه ببصمتك أو بقفل الموبايل.</Txt>
      <Button kind="primary" label="افتح" disabled={isAsking} onPress={() => void ask()} />
    </View>
  );
}

const useStyles = themed((c) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    backgroundColor: c.paper,
  },
}));
