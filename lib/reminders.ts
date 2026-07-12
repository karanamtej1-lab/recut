/**
 * Reminder engine — the bridge between the task table and expo-notifications.
 *
 * Strategy: "re-sync the world" instead of incremental bookkeeping.
 * ------------------------------------------------------------------
 * Every scheduled notification in this app is derived state: it can be
 * recomputed from (open tasks × reminderMath × digest settings). So on every
 * mutation (create / edit / complete / postpone / delete) and on every app
 * launch/foreground we:
 *
 *   1. Back-fill reminder_history with slots that elapsed since the last sync
 *      (iOS fires scheduled local notifications while the app is closed but
 *      gives us no callback, so history is reconstructed from the math).
 *   2. cancelAllScheduledNotificationsAsync()  — wipe the slate
 *   3. Re-schedule the next few reminders per open task + the next digests.
 *
 * This is idempotent, immune to stale-notification-id bugs, and keeps us
 * safely under iOS's ~64 pending-local-notification cap. The trade-off is
 * that per-task reminders more than NAGS_PER_TASK days out only exist once
 * the app has been opened recently — acceptable because the sequence is
 * re-extended on every single app run, and a user who hasn't opened the app
 * in 5+ days has still been nagged 5 times about each task.
 *
 * Digest note: iOS local notification content is frozen at scheduling time.
 * A repeating "daily digest" would show stale text forever, so we instead
 * schedule the next DIGEST_DAYS digests as one-shots with content computed
 * from current DB state, refreshed on every sync.
 */
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getSetting,
  listOpenTasks,
  listTasksDueBy,
  recordReminderFired,
  setSetting,
} from './db';
import {
  elapsedReminderTimes,
  endOfLocalDay,
  nextDigestTimes,
  reminderKindAt,
  upcomingReminderTimes,
} from './reminderMath';
import type { Task } from './types';

/** How many upcoming reminders to keep scheduled per task. */
const NAGS_PER_TASK = 5;
/** How many daily digests to keep scheduled ahead. */
const DIGEST_DAYS = 3;
/** Global scheduling budget — stay under the iOS ~64 pending cap. */
const MAX_SCHEDULED = 60;

export const DIGEST_HOUR_KEY = 'digest_hour';
export const DIGEST_MINUTE_KEY = 'digest_minute';
const LAST_SYNC_KEY = 'last_sync_at';

export const TASK_CATEGORY = 'task-reminder';
export const ACTION_COMPLETE = 'complete';
export const ACTION_POSTPONE = 'postpone';

/** Default digest time: 8:00 AM (spec default; changeable in Settings). */
export const DEFAULT_DIGEST = { hour: 8, minute: 0 };

// ---------------------------------------------------------------------------
// One-time setup
// ---------------------------------------------------------------------------

/** Show alerts even while the app is foregrounded. */
export function installNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Register the "Complete / Postpone" buttons shown on task reminders. */
export async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY, [
    {
      identifier: ACTION_COMPLETE,
      buttonTitle: 'Mark complete',
      options: { opensAppToForeground: false }, // handled in background
    },
    {
      identifier: ACTION_POSTPONE,
      buttonTitle: 'Postpone…',
      options: { opensAppToForeground: true }, // needs the date picker
    },
  ]);
}

/** Ask for permission on first launch. Returns true if notifications may fire. */
export async function ensureNotificationPermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return req.granted;
}

// ---------------------------------------------------------------------------
// Digest time setting
// ---------------------------------------------------------------------------

export async function getDigestTime(db: SQLiteDatabase): Promise<{ hour: number; minute: number }> {
  const h = await getSetting(db, DIGEST_HOUR_KEY);
  const m = await getSetting(db, DIGEST_MINUTE_KEY);
  return {
    hour: h !== null ? Number(h) : DEFAULT_DIGEST.hour,
    minute: m !== null ? Number(m) : DEFAULT_DIGEST.minute,
  };
}

export async function setDigestTime(
  db: SQLiteDatabase,
  hour: number,
  minute: number
): Promise<void> {
  await setSetting(db, DIGEST_HOUR_KEY, String(hour));
  await setSetting(db, DIGEST_MINUTE_KEY, String(minute));
}

// ---------------------------------------------------------------------------
// Content builders
// ---------------------------------------------------------------------------

function reminderContent(task: Task, fireAt: number): Notifications.NotificationContentInput {
  const overdue = fireAt >= task.dueAt;
  return {
    title: overdue ? '⚠️ Overdue task' : '⏰ Due tomorrow',
    body: overdue
      ? `"${task.title}" is overdue. Complete it or postpone it to stop these reminders.`
      : `"${task.title}" is due in 24 hours.`,
    sound: 'default',
    categoryIdentifier: TASK_CATEGORY,
    data: { taskId: task.id, kind: overdue ? 'nag' : 'pre' },
  };
}

function digestContent(tasks: Task[]): Notifications.NotificationContentInput {
  const preview = tasks
    .slice(0, 3)
    .map((t) => t.title)
    .join(', ');
  const more = tasks.length > 3 ? ` +${tasks.length - 3} more` : '';
  return {
    title: `📋 Today: ${tasks.length} task${tasks.length === 1 ? '' : 's'} due or overdue`,
    body: `${preview}${more}`,
    sound: 'default',
    data: { kind: 'digest' },
  };
}

// ---------------------------------------------------------------------------
// The sync
// ---------------------------------------------------------------------------

/**
 * Recompute and reschedule EVERY notification from current DB state.
 * Call after any task mutation and on app launch/foreground.
 */
export async function syncAllReminders(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  const openTasks = await listOpenTasks(db);

  // 1. Back-fill history for slots that elapsed while we weren't looking.
  const lastSyncRaw = await getSetting(db, LAST_SYNC_KEY);
  if (lastSyncRaw !== null) {
    const lastSync = Number(lastSyncRaw);
    for (const task of openTasks) {
      for (const t of elapsedReminderTimes(task.dueAt, lastSync, now)) {
        await recordReminderFired(db, task.id, t, reminderKindAt(t, task.dueAt));
      }
    }
  }
  await setSetting(db, LAST_SYNC_KEY, String(now));

  // 2. Wipe the slate. Safe: every scheduled notification is ours & derivable.
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 3a. Per-task reminders — soonest across all tasks win the budget.
  const planned: { fireAt: number; content: Notifications.NotificationContentInput }[] = [];
  for (const task of openTasks) {
    for (const fireAt of upcomingReminderTimes(task.dueAt, now, NAGS_PER_TASK)) {
      planned.push({ fireAt, content: reminderContent(task, fireAt) });
    }
  }
  planned.sort((a, b) => a.fireAt - b.fireAt);

  // 3b. Daily digests (one-shots with fresh content — see module docstring).
  const { hour, minute } = await getDigestTime(db);
  const digestPlanned: typeof planned = [];
  for (const fireAt of nextDigestTimes(now, hour, minute, DIGEST_DAYS)) {
    // Digest covers tasks due before the end of the day it fires on.
    const dueThatDay = await listTasksDueBy(db, endOfLocalDay(fireAt));
    if (dueThatDay.length > 0) {
      digestPlanned.push({ fireAt, content: digestContent(dueThatDay) });
    }
  }

  const budgetForTasks = MAX_SCHEDULED - digestPlanned.length;
  const toSchedule = [...planned.slice(0, budgetForTasks), ...digestPlanned];

  await Promise.all(
    toSchedule.map(({ fireAt, content }) =>
      Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: fireAt },
      })
    )
  );
}
