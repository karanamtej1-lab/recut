/**
 * Root layout: provides the SQLite database to every screen, wires
 * notification permissions/categories/response-handling, and re-syncs the
 * reminder schedule whenever the app comes to the foreground.
 */
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';

import { completeTask, migrateDbIfNeeded } from '../lib/db';
import {
  ACTION_COMPLETE,
  ACTION_POSTPONE,
  ensureNotificationPermissions,
  installNotificationHandler,
  registerNotificationCategories,
  syncAllReminders,
} from '../lib/reminders';

// Must run before any notification is received, so: module scope.
installNotificationHandler();

function NotificationWiring() {
  const db = useSQLiteContext();
  // Serialize syncs so a foreground event can't race a mutation sync.
  const syncing = useRef(Promise.resolve());

  const requestSync = () => {
    syncing.current = syncing.current.then(() => syncAllReminders(db)).catch(console.warn);
    return syncing.current;
  };

  useEffect(() => {
    (async () => {
      await registerNotificationCategories();
      const granted = await ensureNotificationPermissions();
      if (!granted) {
        // Clear rationale, as required on first launch.
        Alert.alert(
          'Notifications are the whole point',
          'This app nags you daily about upcoming deadlines until you complete or postpone a task. ' +
            'Without notification permission, no reminders can fire. You can enable them in ' +
            'Settings → Notifications → Todo Reminder.'
        );
      }
      await requestSync();
    })();

    // Re-sync whenever the app returns to the foreground: extends each
    // task's reminder window and refreshes digest content (see lib/reminders.ts).
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') requestSync();
    });

    // Notification taps and action buttons.
    const responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as { taskId?: number };
      const taskId = data?.taskId;

      if (response.actionIdentifier === ACTION_COMPLETE && taskId != null) {
        // "Mark complete" straight from the notification, app stays closed.
        await completeTask(db, taskId);
        await requestSync();
        return;
      }
      if (response.actionIdentifier === ACTION_POSTPONE && taskId != null) {
        router.push({ pathname: '/task/[id]', params: { id: String(taskId), postpone: '1' } });
        return;
      }
      // Plain tap: deep-link to the task (or the list for digest taps).
      if (taskId != null) {
        router.push({ pathname: '/task/[id]', params: { id: String(taskId) } });
      } else {
        router.push('/');
      }
    });

    return () => {
      appState.remove();
      responseSub.remove();
    };
  }, [db]);

  return null;
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="todos.db" onInit={migrateDbIfNeeded}>
      <NotificationWiring />
      <Stack
        screenOptions={{
          headerTintColor: '#0a7ea4',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Tasks' }} />
        <Stack.Screen name="task/new" options={{ title: 'New Task', presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" options={{ title: 'Task' }} />
        <Stack.Screen name="voice" options={{ title: 'Speak a Task', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </SQLiteProvider>
  );
}
