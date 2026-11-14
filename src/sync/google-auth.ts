import { Platform } from 'react-native';

import { isSyncConfigured, signInWithGoogleToken, signOut } from './sync';

/** The Web OAuth client ID from Google Cloud. Public by design; the secret stays in Supabase. */
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

/** Google sign-in needs the native library, so it is offered on the phone build only. */
export function isGoogleConfigured(): boolean {
  return Platform.OS !== 'web' && Boolean(webClientId) && isSyncConfigured();
}

/**
 * Signs in with the phone's Google account and opens a Supabase session with it.
 * Asks for the basic profile only. Returns the account's name for display.
 */
export async function signInWithGoogle(): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('الدخول بجوجل غير مفعّل على هذا الإصدار');
  // Loaded on demand so the web preview never touches the native module.
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId });
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('الدخول اتلغى.');
  return signInWithGoogleToken(idToken);
}

export async function signOutOfGoogle(): Promise<void> {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  await GoogleSignin.signOut();
  await signOut();
}
