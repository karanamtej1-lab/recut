/**
 * Task detail: edit title/due date, complete, postpone (required new date),
 * delete — every action re-syncs the reminder schedule. Also shows the
 * reminder history ("this task has nagged you N times").
 *
 * Arriving with ?postpone=1 (from a notification's "Postpone…" button)
 * auto-opens the postpone date picker.
 */
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import DueDatePicker from '../../components/DueDatePicker';
import {
  completeTask,
  deleteTask,
  getTask,
  listReminderHistory,
  postponeTask,
  updateTask,
} from '../../lib/db';
import { formatDueDate, formatOverdueBadge } from '../../lib/format';
import { syncAllReminders } from '../../lib/reminders';
import type { ReminderEvent, Task } from '../../lib/types';

export default function TaskDetailScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id: string; postpone?: string }>();
  const id = Number(params.id);

  const [task, setTask] = useState<Task | null>(null);
  const [history, setHistory] = useState<ReminderEvent[]>([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<Date>(new Date());
  const [postponing, setPostponing] = useState(params.postpone === '1');
  const [postponeDate, setPostponeDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d;
  });

  const reload = useCallback(async () => {
    const t = await getTask(db, id);
    if (!t) {
      router.back();
      return;
    }
    setTask(t);
    setTitle(t.title);
    setDue(new Date(t.dueAt));
    setHistory(await listReminderHistory(db, id));
  }, [db, id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!task) return null;

  const now = Date.now();
  const overdue = task.status !== 'completed' && task.dueAt < now;

  const saveEdits = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Title required');
      return;
    }
    await updateTask(db, id, { title: cleanTitle, dueAt: due.getTime() });
    await syncAllReminders(db);
    router.back();
  };

  const onComplete = async () => {
    await completeTask(db, id); // cancels ALL future reminders for this task
    await syncAllReminders(db);
    router.back();
  };

  const onPostpone = async () => {
    if (postponeDate.getTime() <= now) {
      Alert.alert('Pick a future date', 'The new due date must be in the future.');
      return;
    }
    // Postponing REQUIRES a new due date; reminder schedule re-bases on it.
    await postponeTask(db, id, postponeDate.getTime());
    await syncAllReminders(db);
    router.back();
  };

  const onDelete = () => {
    Alert.alert('Delete task?', `"${task.title}" and its reminders will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(db, id);
          await syncAllReminders(db);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {overdue && (
        <Text style={styles.overdueBanner}>⚠️ {formatOverdueBadge(task.dueAt, now)}</Text>
      )}
      {task.status === 'completed' && <Text style={styles.doneBanner}>✅ Completed</Text>}

      <Text style={styles.label}>Task</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Due</Text>
      <Text style={styles.dueSummary}>{formatDueDate(due.getTime(), now)}</Text>
      <DueDatePicker value={due} onChange={setDue} />

      <Pressable style={styles.primaryBtn} onPress={saveEdits}>
        <Text style={styles.primaryTxt}>Save Changes</Text>
      </Pressable>

      {task.status !== 'completed' && (
        <View style={styles.actionRow}>
          <Pressable style={[styles.actionBtn, styles.completeBtn]} onPress={onComplete}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.actionTxt}>Complete</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.postponeBtn]}
            onPress={() => setPostponing((p) => !p)}
          >
            <Ionicons name="time-outline" size={18} color="#fff" />
            <Text style={styles.actionTxt}>Postpone…</Text>
          </Pressable>
        </View>
      )}

      {postponing && task.status !== 'completed' && (
        <View style={styles.postponePanel}>
          <Text style={styles.postponeHint}>
            Pick the new due date. Reminders restart against it: one 24h before,
            then daily until you complete it.
          </Text>
          <DueDatePicker value={postponeDate} onChange={setPostponeDate} />
          <Pressable style={styles.primaryBtn} onPress={onPostpone}>
            <Text style={styles.primaryTxt}>
              Postpone to {formatDueDate(postponeDate.getTime(), now)}
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteTxt}>Delete Task</Text>
      </Pressable>

      <Text style={styles.label}>Reminder history</Text>
      {history.length === 0 ? (
        <Text style={styles.historyEmpty}>No reminders have fired yet.</Text>
      ) : (
        history.map((h) => (
          <View key={h.id} style={styles.historyRow}>
            <Ionicons
              name={h.kind === 'pre' ? 'notifications-outline' : 'alert-circle-outline'}
              size={16}
              color="#8e8e93"
            />
            <Text style={styles.historyTxt}>
              {h.kind === 'pre' ? '24h heads-up' : 'Daily nag'} —{' '}
              {new Date(h.firedAt).toLocaleString()}
            </Text>
          </View>
        ))
      )}
      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa', padding: 20 },
  overdueBanner: {
    backgroundColor: '#ffe5e3',
    color: '#c0261b',
    fontWeight: '700',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  doneBanner: {
    backgroundColor: '#e6f7ea',
    color: '#1e7d38',
    fontWeight: '700',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginTop: 18,
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
  dueSummary: { fontSize: 15, color: '#0a7ea4', fontWeight: '600', marginBottom: 4 },
  primaryBtn: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 14,
  },
  completeBtn: { backgroundColor: '#34c759' },
  postponeBtn: { backgroundColor: '#ff9500' },
  actionTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  postponePanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8dbe0',
  },
  postponeHint: { fontSize: 13, color: '#8e8e93', lineHeight: 18, marginBottom: 8 },
  deleteBtn: { alignItems: 'center', marginTop: 24 },
  deleteTxt: { color: '#ff3b30', fontSize: 15, fontWeight: '600' },
  historyEmpty: { color: '#8e8e93', fontSize: 14 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  historyTxt: { color: '#5a5f66', fontSize: 13 },
});
