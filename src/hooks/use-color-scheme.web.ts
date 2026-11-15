import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribeToNothing = (): (() => void) => () => undefined;

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * The server snapshot says "not hydrated", so the first client render matches the server's.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
