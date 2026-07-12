/**
 * SQLite data layer.
 *
 * Why expo-sqlite (not AsyncStorage): tasks need sorted queries by due date,
 * filtered queries (open vs completed, due-today for the digest), and a
 * one-to-many reminder_history relation. That's relational shape — SQLite
 * gives us indexed ORDER BY / WHERE for free, while AsyncStorage would force
 * loading and re-sorting the whole store in JS on every screen.
 *
 * All functions take the SQLiteDatabase handle from useSQLiteContext() /
 * SQLiteProvider so screens and the reminder engine share one connection.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import type { ReminderEvent, ReminderKind, Task, TaskStatus } from './types';

const SCHEMA_VERSION = 1;

/** Runs on SQLiteProvider onInit. Idempotent, versioned via PRAGMA user_version. */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      due_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'postponed')),
      created_at INTEGER NOT NULL,
      postponed_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks (status, due_at);

    CREATE TABLE IF NOT EXISTS reminder_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      fired_at INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('pre', 'nag', 'digest'))
    );
    CREATE INDEX IF NOT EXISTS idx_history_task ON reminder_history (task_id, fired_at);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

interface TaskRow {
  id: number;
  title: string;
  due_at: number;
  status: TaskStatus;
  created_at: number;
  postponed_count: number;
}

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    dueAt: r.due_at,
    status: r.status,
    createdAt: r.created_at,
    postponedCount: r.postponed_count,
  };
}

// ---------------------------------------------------------------------------
// Task CRUD
// ---------------------------------------------------------------------------

export async function listTasks(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    // Open tasks first (sorted by due date), completed last (most recent first).
    `SELECT * FROM tasks
     ORDER BY CASE WHEN status = 'completed' THEN 1 ELSE 0 END, due_at ASC`
  );
  return rows.map(toTask);
}

export async function listOpenTasks(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks WHERE status != 'completed' ORDER BY due_at ASC`
  );
  return rows.map(toTask);
}

/** Open tasks due before end-of-window (used for the daily digest). */
export async function listTasksDueBy(db: SQLiteDatabase, byMs: number): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks WHERE status != 'completed' AND due_at <= ? ORDER BY due_at ASC`,
    byMs
  );
  return rows.map(toTask);
}

export async function getTask(db: SQLiteDatabase, id: number): Promise<Task | null> {
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', id);
  return row ? toTask(row) : null;
}

export async function createTask(
  db: SQLiteDatabase,
  title: string,
  dueAt: number
): Promise<Task> {
  const createdAt = Date.now();
  const res = await db.runAsync(
    'INSERT INTO tasks (title, due_at, status, created_at) VALUES (?, ?, ?, ?)',
    title,
    dueAt,
    'pending',
    createdAt
  );
  return {
    id: res.lastInsertRowId,
    title,
    dueAt,
    status: 'pending',
    createdAt,
    postponedCount: 0,
  };
}

export async function updateTask(
  db: SQLiteDatabase,
  id: number,
  fields: { title?: string; dueAt?: number }
): Promise<void> {
  if (fields.title !== undefined) {
    await db.runAsync('UPDATE tasks SET title = ? WHERE id = ?', fields.title, id);
  }
  if (fields.dueAt !== undefined) {
    await db.runAsync('UPDATE tasks SET due_at = ? WHERE id = ?', fields.dueAt, id);
  }
}

export async function completeTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`UPDATE tasks SET status = 'completed' WHERE id = ?`, id);
}

/** Re-open a completed task (undo). */
export async function reopenTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`UPDATE tasks SET status = 'pending' WHERE id = ?`, id);
}

/**
 * Postpone = pick a NEW due date. Status becomes 'postponed' (still an open
 * task) and the reminder engine reschedules against the new date.
 */
export async function postponeTask(
  db: SQLiteDatabase,
  id: number,
  newDueAt: number
): Promise<void> {
  await db.runAsync(
    `UPDATE tasks
     SET status = 'postponed', due_at = ?, postponed_count = postponed_count + 1
     WHERE id = ?`,
    newDueAt,
    id
  );
}

export async function deleteTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}

// ---------------------------------------------------------------------------
// Reminder history
// ---------------------------------------------------------------------------

export async function recordReminderFired(
  db: SQLiteDatabase,
  taskId: number,
  firedAt: number,
  kind: ReminderKind
): Promise<void> {
  await db.runAsync(
    'INSERT INTO reminder_history (task_id, fired_at, kind) VALUES (?, ?, ?)',
    taskId,
    firedAt,
    kind
  );
}

export async function listReminderHistory(
  db: SQLiteDatabase,
  taskId: number
): Promise<ReminderEvent[]> {
  const rows = await db.getAllAsync<{
    id: number;
    task_id: number;
    fired_at: number;
    kind: ReminderKind;
  }>('SELECT * FROM reminder_history WHERE task_id = ? ORDER BY fired_at DESC', taskId);
  return rows.map((r) => ({ id: r.id, taskId: r.task_id, firedAt: r.fired_at, kind: r.kind }));
}

// ---------------------------------------------------------------------------
// Settings (simple key/value)
// ---------------------------------------------------------------------------

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}
