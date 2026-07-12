/**
 * Pure date-math for the reminder engine. NO imports from expo-notifications
 * or the DB — everything here is a deterministic function of its arguments,
 * so it can be unit-tested with plain Jest (see __tests__/reminderMath.test.ts).
 *
 * Reminder model
 * --------------
 * Every open task gets an arithmetic sequence of reminder times:
 *
 *     dueAt - 24h,  dueAt,  dueAt + 24h,  dueAt + 48h,  ...
 *
 * i.e. the FIRST reminder fires 24 hours before the deadline, and then one
 * fires every 24 hours until the task is completed or postponed. This single
 * sequence expresses both spec rules ("24h-before reminder" and "daily nag
 * until resolved") with no special cases: completing/postponing simply stops
 * (or re-bases) the sequence.
 *
 * Because iOS caps pending local notifications (~64 per app) and kills
 * anything beyond that silently, we never schedule the infinite sequence.
 * Instead the engine schedules the next few occurrences per task and
 * re-syncs (cancel-all + reschedule) every time the app runs or a task
 * changes. The functions below compute "the next N occurrences after `now`"
 * and "the occurrences that elapsed between two syncs" (for history).
 */

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** When the very first (24h-before) reminder for a task should fire. */
export function firstReminderTime(dueAtMs: number): number {
  return dueAtMs - DAY_MS;
}

/**
 * The next `count` reminder times for a task, strictly after `nowMs`.
 *
 * Handles every phase of a task's life with one formula:
 *  - created >24h before due  → first result is dueAt-24h
 *  - created <24h before due  → first result is dueAt (the -24h slot already passed)
 *  - already overdue N days   → first result is the next 24h-aligned slot after now
 *    (we do NOT emit the missed past slots — those are history, not schedule)
 */
export function upcomingReminderTimes(dueAtMs: number, nowMs: number, count: number): number[] {
  const start = firstReminderTime(dueAtMs);
  // k = index of the first sequence element strictly after `now`
  const k = nowMs < start ? 0 : Math.floor((nowMs - start) / DAY_MS) + 1;
  return Array.from({ length: count }, (_, i) => start + (k + i) * DAY_MS);
}

/**
 * Reminder times that ELAPSED in the window (sinceMs, untilMs] — i.e. slots
 * that fired (or would have fired) while the app was closed. Used to back-fill
 * reminder_history on sync, since iOS gives no callback when a scheduled
 * local notification fires in the background.
 */
export function elapsedReminderTimes(
  dueAtMs: number,
  sinceMs: number,
  untilMs: number
): number[] {
  const start = firstReminderTime(dueAtMs);
  // until is INCLUSIVE — a slot landing exactly on `until` did fire.
  if (untilMs < start || untilMs <= sinceMs) return [];
  const firstK = sinceMs < start ? 0 : Math.floor((sinceMs - start) / DAY_MS) + 1;
  const lastK = Math.floor((untilMs - start) / DAY_MS); // start + lastK*DAY <= until
  const out: number[] = [];
  for (let k = firstK; k <= lastK; k++) out.push(start + k * DAY_MS);
  return out;
}

/** 'pre' if the reminder fires before the task is due, else 'nag'. */
export function reminderKindAt(timeMs: number, dueAtMs: number): 'pre' | 'nag' {
  return timeMs < dueAtMs ? 'pre' : 'nag';
}

/**
 * The next `count` daily-digest fire times after `nowMs`, at hour:minute
 * LOCAL time. Uses Date day-arithmetic (not naive +24h) so the digest stays
 * at e.g. 8:00 AM across DST transitions.
 */
export function nextDigestTimes(
  nowMs: number,
  hour: number,
  minute: number,
  count: number
): number[] {
  const out: number[] = [];
  const d = new Date(nowMs);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= nowMs) d.setDate(d.getDate() + 1);
  for (let i = 0; i < count; i++) {
    out.push(d.getTime());
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** End of the local calendar day containing `atMs` — digest scope is "due today or overdue". */
export function endOfLocalDay(atMs: number): number {
  const d = new Date(atMs);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function isOverdue(dueAtMs: number, nowMs: number): boolean {
  return dueAtMs < nowMs;
}
