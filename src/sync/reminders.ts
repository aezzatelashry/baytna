import { Platform } from 'react-native';

import { isActive } from '@/domain/offers';
import { freshReminders, offerReminders, reminderTime, type Reminder } from '@/domain/reminders';
import { toDateKey } from '@/domain/week';
import { currentWeekStart, useStore } from '@/store/store';

const CHANNEL_ID = 'reminders';

export function areRemindersSupported(): boolean {
  return Platform.OS !== 'web';
}

/** Loaded on demand so the web preview never touches the native module. */
async function native() {
  return import('expo-notifications');
}

/** Asks the phone for permission to show reminders. False when the family says no. */
export async function allowReminders(): Promise<boolean> {
  if (!areRemindersSupported()) return false;
  const notifications = await native();
  await notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'تنبيهات بيتنا',
    importance: notifications.AndroidImportance.DEFAULT,
  });
  const current = await notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await notifications.requestPermissionsAsync();
  return asked.granted;
}

/** The reminders that follow from what the phone holds right now. */
function dueReminders(): Reminder[] {
  const state = useStore.getState();
  const today = toDateKey(new Date());
  const weekStart = currentWeekStart(state.weekStartsOn);
  const toBuy = state.items
    .filter((item) => item.weekStart === weekStart && !item.deleted && !item.bought)
    .map((item) => item.name);
  const running = state.offers.filter((offer) => isActive(offer, today));
  return [...offerReminders(toBuy, running, today), ...freshReminders(state.fresh, today)];
}

/**
 * Replaces everything scheduled with what is due now: the last day of an offer on the
 * list, and the last good day of something fresh. Runs on the phone only, so it works
 * with no server and no account. Clears the schedule when reminders are off.
 */
export async function rescheduleReminders(): Promise<void> {
  if (!areRemindersSupported()) return;
  const notifications = await native();
  await notifications.cancelAllScheduledNotificationsAsync();
  if (!useStore.getState().reminders) return;

  const now = Date.now();
  for (const reminder of dueReminders()) {
    const at = reminderTime(reminder);
    if (at.getTime() <= now) continue;
    await notifications.scheduleNotificationAsync({
      identifier: reminder.key,
      content: { title: reminder.title, body: reminder.body },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
    });
  }
}

/** Reminders that arrive while the app is open still show as a banner. */
export async function showRemindersWhileOpen(): Promise<void> {
  if (!areRemindersSupported()) return;
  const notifications = await native();
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
