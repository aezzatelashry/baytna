import { IBMPlexSansArabic_400Regular } from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular';
import { IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold';
import { IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LockGate } from '@/components/LockGate';
import { usePalette } from '@/constants/theme';

void SplashScreen.preventAutoHideAsync();

const styles = StyleSheet.create({ root: { flex: 1 } });

export default function RootLayout() {
  const palette = usePalette();
  const [isLoaded, loadError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  // A font that fails to load must not block the app: the system face takes over.
  const isReady = isLoaded || loadError !== null;

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style={palette.isDark ? 'light' : 'dark'} />
      <LockGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }} />
      </LockGate>
    </GestureHandlerRootView>
  );
}
