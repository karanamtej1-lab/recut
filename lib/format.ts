/** Small date-display helpers shared by the screens. */

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDueDate(dueAtMs: number, nowMs: number = Date.now()): string {
  const due = new Date(dueAtMs);
  const time = due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((dueAtMs - startOfToday.getTime()) / DAY_MS);

  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Tomorrow, ${time}`;
  if (dayDiff === -1) return `Yesterday, ${time}`;
  if (dayDiff > 1 && dayDiff < 7) {
    return `${due.toLocaleDateString(undefined, { weekday: 'long' })}, ${time}`;
  }
  return `${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

export function formatOverdueBadge(dueAtMs: number, nowMs: number = Date.now()): string {
  const days = Math.floor((nowMs - dueAtMs) / DAY_MS);
  if (days < 1) return 'Overdue';
  return days === 1 ? '1 day overdue' : `${days} days overdue`;
}
