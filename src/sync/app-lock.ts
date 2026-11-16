import { Platform } from 'react-native';

/** Why the phone cannot lock the app, in words the family can act on. Null means it can. */
export type LockProblem = 'unsupported' | 'no_hardware' | 'not_enrolled';

export const LOCK_PROBLEM_TEXT: Record<LockProblem, string> = {
  unsupported: 'القفل بالبصمة بيشتغل على الموبايل بس.',
  no_hardware: 'الموبايل ده مفيهوش بصمة ولا تعرّف على الوش.',
  not_enrolled: 'سجّل بصمة أو قفل شاشة من إعدادات الموبايل الأول.',
};

/** Loaded on demand so the web preview never touches the native module. */
async function native() {
  return import('expo-local-authentication');
}

export function isLockSupported(): boolean {
  return Platform.OS !== 'web';
}

export async function lockProblem(): Promise<LockProblem | null> {
  if (!isLockSupported()) return 'unsupported';
  const auth = await native();
  if (!(await auth.hasHardwareAsync())) return 'no_hardware';
  if (!(await auth.isEnrolledAsync())) return 'not_enrolled';
  return null;
}

/**
 * Shows the phone's own fingerprint or face prompt. The phone's PIN stays available
 * as a fallback, so a wet finger cannot lock the family out of their list.
 */
export async function unlockWithBiometrics(): Promise<boolean> {
  if (!isLockSupported()) return true;
  const auth = await native();
  const result = await auth.authenticateAsync({ promptMessage: 'افتح بيتنا', cancelLabel: 'إلغاء' });
  return result.success;
}
