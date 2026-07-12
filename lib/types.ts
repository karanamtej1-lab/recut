/** Shared domain types for the to-do reminder app. */

export type TaskStatus = 'pending' | 'completed' | 'postponed';

export interface Task {
  id: number;
  title: string;
  /** Due date/time as epoch milliseconds. Required for every task. */
  dueAt: number;
  /**
   * 'pending'   — normal open task
   * 'completed' — done; all reminders cancelled
   * 'postponed' — user explicitly pushed the due date back at least once.
   *               Behaves exactly like 'pending' for list/reminder purposes,
   *               but is kept distinct so the UI can show it was postponed.
   */
  status: TaskStatus;
  createdAt: number;
  postponedCount: number;
}

export type ReminderKind = 'pre' | 'nag' | 'digest';

export interface ReminderEvent {
  id: number;
  taskId: number;
  /** When the reminder fired (epoch ms). */
  firedAt: number;
  kind: ReminderKind;
}

/** A task is "open" if it still needs doing (pending or postponed). */
export function isOpen(status: TaskStatus): boolean {
  return status !== 'completed';
}
