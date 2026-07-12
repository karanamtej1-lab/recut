/**
 * New-task form. Doubles as the VOICE CONFIRMATION screen: the voice screen
 * navigates here with ?title=…&dueAt=…&fromVoice=1 so the user always reviews
 * and can edit the parsed title/date before anything is saved — nothing is
 * ever saved on NLP output alone.
 *
 * A due date is REQUIRED for every task (the reminder engine depends on it).
 * If voice parsing found no date, this screen prompts for one.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import DueDatePicker from '../../components/DueDatePicker';
import { createTask } from '../../lib/db';
import { formatDueDate } from '../../lib/format';
import { parseTaskPhrase } from '../../lib/parse';
import { syncAllReminders } from '../../lib/reminders';

/** Default due date for a fresh manual task: tomorrow 5 PM. */
function defaultDue(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  return d;
}

export default function NewTaskScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ title?: string; dueAt?: string; fromVoice?: string }>();

  const fromVoice = params.fromVoice === '1';
  const parsedDueAt = params.dueAt ? Number(params.dueAt) : null;

  const [title, setTitle] = useState(params.title ?? '');
  const [due, setDue] = useState<Date>(parsedDueAt ? new Date(parsedDueAt) : defaultDue());
  const [saving, setSaving] = useState(false);
  // Live natural-language date detection as the user types the title, so
  // typed entry is as smart as voice ("pay rent next Friday" → date + clean title).
  const [suggestion, setSuggestion] = useState<{ title: string; dueAt: number } | null>(null);

  const onChangeTitle = (text: string) => {
    setTitle(text);
    const parsed = parseTaskPhrase(text);
    // Only suggest when a date was found AND stripping it changes the title.
    setSuggestion(
      parsed.dueAt !== null && parsed.title && parsed.title.toLowerCase() !== text.trim().toLowerCase()
        ? { title: parsed.title, dueAt: parsed.dueAt }
        : null
    );
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setTitle(suggestion.title);
    setDue(new Date(suggestion.dueAt));
    setSuggestion(null);
  };

  const save = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Title required', 'Give the task a name.');
      return;
    }
    if (due.getTime() <= Date.now()) {
      Alert.alert('Due date is in the past', 'Pick a future date so reminders can fire.');
      return;
    }
    setSaving(true);
    try {
      await createTask(db, cleanTitle, due.getTime());
      await syncAllReminders(db); // schedules the 24h-before + daily nags
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {fromVoice && (
          <Text style={styles.voiceBanner}>
            {parsedDueAt
              ? '🎙 Heard you! Check the title and date below, then save.'
              : '🎙 Got the task, but no date was detected — pick one below (every task needs a due date).'}
          </Text>
        )}

        <Text style={styles.label}>Task</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={onChangeTitle}
          placeholder="What needs doing?  (e.g. pay rent next Friday)"
          autoFocus={!fromVoice}
          returnKeyType="done"
        />

        {suggestion && (
          <Pressable style={styles.suggestion} onPress={applySuggestion}>
            <Text style={styles.suggestionText}>
              📅 Detected “{formatDueDate(suggestion.dueAt)}” — tap to set the date and rename to “
              {suggestion.title}”.
            </Text>
          </Pressable>
        )}

        <Text style={styles.label}>Due date & time</Text>
        <Text style={styles.dueSummary}>{formatDueDate(due.getTime())}</Text>
        <DueDatePicker value={due} onChange={setDue} />

        <Pressable
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.saveText}>Save Task</Text>
        </Pressable>
        <Text style={styles.hint}>
          You’ll get a reminder 24 hours before it’s due, then daily until you
          complete or postpone it.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa', padding: 20 },
  voiceBanner: {
    backgroundColor: '#e8f4f8',
    color: '#0a5e7a',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 16,
    overflow: 'hidden',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8dbe0',
  },
  suggestion: {
    backgroundColor: '#fff6e6',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#f0d9a8',
  },
  suggestionText: { fontSize: 14, color: '#8a6d1a', lineHeight: 19 },
  dueSummary: { fontSize: 15, color: '#0a7ea4', fontWeight: '600', marginBottom: 4 },
  saveButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 13, color: '#8e8e93', textAlign: 'center', marginTop: 12, lineHeight: 18 },
});
