/**
 * Settings: the daily digest fire time (default 8:00 AM). Saving re-syncs the
 * whole notification schedule so the change takes effect immediately.
 */
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { getDigestTime, setDigestTime, syncAllReminders } from '../lib/reminders';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [time, setTime] = useState<Date | null>(null);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    getDigestTime(db).then(({ hour, minute }) => {
      const d = new Date();
      d.setHours(hour, minute, 0, 0);
      setTime(d);
    });
  }, [db]);

  if (!time) return null;

  const onChange = (event: DateTimePickerEvent, d?: Date) => {
    setShowAndroidPicker(false);
    if (event.type !== 'dismissed' && d) setTime(d);
  };

  const save = async () => {
    await setDigestTime(db, time.getHours(), time.getMinutes());
    await syncAllReminders(db);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Daily digest time</Text>
      <Text style={styles.help}>
        Once a day at this time you’ll get a single summary of every task due
        today or overdue.
      </Text>

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={time}
          mode="time"
          display="spinner"
          minuteInterval={5}
          onChange={onChange}
          style={{ alignSelf: 'center' }}
        />
      ) : (
        <>
          <Pressable style={styles.timeButton} onPress={() => setShowAndroidPicker(true)}>
            <Text style={styles.timeText}>
              {time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </Pressable>
          {showAndroidPicker && (
            <DateTimePicker value={time} mode="time" onChange={onChange} />
          )}
        </>
      )}

      <Pressable style={styles.saveButton} onPress={save}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>

      <Text style={styles.note}>
        Heads-up: digest text is computed when the app schedules it. Open the
        app now and then to keep the summaries fresh — the per-task reminders
        fire regardless.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa', padding: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  help: { fontSize: 14, color: '#5a5f66', lineHeight: 20, marginBottom: 12 },
  timeButton: {
    backgroundColor: '#eef1f5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  timeText: { fontSize: 18, color: '#0a7ea4', fontWeight: '700' },
  saveButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { fontSize: 13, color: '#8e8e93', lineHeight: 18, marginTop: 20 },
});
