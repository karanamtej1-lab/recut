/**
 * Due date/time picker. iOS shows a single inline datetime spinner; Android
 * doesn't support mode="datetime", so it chains a date dialog then a time
 * dialog (iOS-first per spec, but Android keeps working for free).
 */
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default function DueDatePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  // Android: which dialog of the date→time chain is open, if any.
  const [androidStage, setAndroidStage] = useState<'closed' | 'date' | 'time'>('closed');

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="datetime"
        display="spinner"
        minuteInterval={5}
        onChange={(_: DateTimePickerEvent, d?: Date) => d && onChange(d)}
        style={styles.iosPicker}
      />
    );
  }

  const onAndroidChange = (event: DateTimePickerEvent, d?: Date) => {
    if (event.type === 'dismissed' || !d) {
      setAndroidStage('closed');
      return;
    }
    if (androidStage === 'date') {
      onChange(d);
      setAndroidStage('time');
    } else {
      onChange(d);
      setAndroidStage('closed');
    }
  };

  return (
    <View>
      <Pressable style={styles.androidButton} onPress={() => setAndroidStage('date')}>
        <Text style={styles.androidButtonText}>
          {value.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </Pressable>
      {androidStage !== 'closed' && (
        <DateTimePicker
          value={value}
          mode={androidStage}
          onChange={onAndroidChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iosPicker: { alignSelf: 'center' },
  androidButton: {
    backgroundColor: '#eef1f5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  androidButtonText: { fontSize: 16, color: '#0a7ea4', fontWeight: '600' },
});
