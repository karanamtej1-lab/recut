/**
 * Task list — sorted by due date, overdue tasks in red, completed at the
 * bottom. Entry points to manual creation (+), voice creation (mic) and
 * settings (gear).
 */
import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { completeTask, listTasks, reopenTask } from '../lib/db';
import { formatDueDate, formatOverdueBadge } from '../lib/format';
import { syncAllReminders } from '../lib/reminders';
import type { Task } from '../lib/types';

export default function TaskListScreen() {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Task[]>([]);

  const reload = useCallback(() => {
    listTasks(db).then(setTasks).catch(console.warn);
  }, [db]);

  // Refresh every time this screen gains focus (after create/edit/etc.).
  useFocusEffect(reload);

  const toggleComplete = async (task: Task) => {
    if (task.status === 'completed') {
      await reopenTask(db, task.id);
    } else {
      await completeTask(db, task.id);
    }
    await syncAllReminders(db); // completing cancels its reminders; reopening restores them
    reload();
  };

  const now = Date.now();

  return (
    <View style={styles.container}>
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={64} color="#c5c9d0" />
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptyBody}>
            Add one with the + button, or hold the mic and just say it —{'\n'}
            “pay rent next Friday” works.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TaskRow task={item} now={now} onToggle={() => toggleComplete(item)} />
          )}
        />
      )}

      {/* Bottom action bar */}
      <View style={styles.fabRow}>
        <Pressable
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color="#0a7ea4" />
        </Pressable>
        <Pressable
          style={[styles.fab, styles.fabPrimary]}
          onPress={() => router.push('/voice')}
          accessibilityLabel="Add task by voice"
        >
          <Ionicons name="mic" size={28} color="#fff" />
        </Pressable>
        <Pressable
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => router.push('/task/new')}
          accessibilityLabel="Add task manually"
        >
          <Ionicons name="add" size={26} color="#0a7ea4" />
        </Pressable>
      </View>
    </View>
  );
}

function TaskRow({
  task,
  now,
  onToggle,
}: {
  task: Task;
  now: number;
  onToggle: () => void;
}) {
  const completed = task.status === 'completed';
  const overdue = !completed && task.dueAt < now;

  return (
    <Link href={{ pathname: '/task/[id]', params: { id: String(task.id) } }} asChild>
      <Pressable style={[styles.row, completed && styles.rowCompleted]}>
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          accessibilityLabel={completed ? 'Mark as not done' : 'Mark as done'}
        >
          <Ionicons
            name={completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={completed ? '#34c759' : overdue ? '#ff3b30' : '#8e8e93'}
          />
        </Pressable>
        <View style={styles.rowText}>
          <Text
            style={[styles.title, completed && styles.titleCompleted]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.due, overdue && styles.dueOverdue]}>
              {formatDueDate(task.dueAt, now)}
            </Text>
            {overdue && (
              <Text style={styles.badge}>{formatOverdueBadge(task.dueAt, now)}</Text>
            )}
            {task.status === 'postponed' && !overdue && (
              <Text style={styles.badgePostponed}>postponed ×{task.postponedCount}</Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#c5c9d0" />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#3a3f47' },
  emptyBody: { fontSize: 15, color: '#8e8e93', textAlign: 'center', lineHeight: 21 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e3e5e9',
  },
  rowCompleted: { opacity: 0.55 },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 17, color: '#1c1e22' },
  titleCompleted: { textDecorationLine: 'line-through', color: '#8e8e93' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  due: { fontSize: 13, color: '#8e8e93' },
  dueOverdue: { color: '#ff3b30', fontWeight: '600' },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#ff3b30',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgePostponed: { fontSize: 11, color: '#b8860b' },
  fabRow: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabPrimary: { width: 64, height: 64, backgroundColor: '#0a7ea4' },
  fabSecondary: { width: 48, height: 48, backgroundColor: '#fff' },
});
