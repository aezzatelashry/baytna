import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip, Txt } from '@/components/kit';
import { RowDir, Spacing } from '@/constants/theme';
import { useStore } from '@/store/store';
import { allowReminders, areRemindersSupported, rescheduleReminders } from '@/sync/reminders';

/** Turns the phone's reminders on or off. Turning them on asks the phone for permission once. */
export function RemindersBlock() {
  const isOn = useStore((state) => state.reminders);
  const setReminders = useStore((state) => state.setReminders);
  const [message, setMessage] = useState('');

  if (!areRemindersSupported()) return null;

  const handleTurnOn = async (): Promise<void> => {
    setMessage('');
    try {
      if (!(await allowReminders())) return setMessage('اسمح للتطبيق بالتنبيهات من إعدادات الموبايل الأول.');
      setReminders(true);
      await rescheduleReminders();
    } catch {
      setMessage('التنبيهات ما اتفعّلتش. جرّب تاني.');
    }
  };
  const handleTurnOff = (): void => {
    setMessage('');
    setReminders(false);
    void rescheduleReminders().catch(() => undefined);
  };

  return (
    <View style={styles.block}>
      <Txt kind="title">التنبيهات</Txt>
      <Txt>تنبيه الصبح في آخر يوم لعرض على صنف في قائمتك، وتنبيه قبل الغدا في آخر يوم لأكل طازج قبل ما يبوظ.</Txt>
      <View style={styles.chips}>
        <Chip label="شغّالة" selected={isOn} onPress={() => void handleTurnOn()} />
        <Chip label="مقفولة" selected={!isOn} onPress={handleTurnOff} />
      </View>
      {message !== '' && <Txt kind="label">{message}</Txt>}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.three },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
});
