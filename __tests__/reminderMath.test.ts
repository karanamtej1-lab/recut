/**
 * Unit tests for the pure reminder date-math. These cover the trickiest part
 * of the app per the spec: the 24h-before calculation and the
 * daily-repeat-until-resolved sequence, across every task lifecycle phase.
 */
import {
  DAY_MS,
  HOUR_MS,
  elapsedReminderTimes,
  endOfLocalDay,
  firstReminderTime,
  isOverdue,
  nextDigestTimes,
  reminderKindAt,
  upcomingReminderTimes,
} from '../lib/reminderMath';

// A fixed, arbitrary "due" moment. Absolute value doesn't matter — the math
// is pure arithmetic on epoch ms (digest tests use local-time Dates instead).
const DUE = new Date(2026, 6, 20, 17, 0, 0).getTime(); // Jul 20 2026 17:00 local

describe('firstReminderTime', () => {
  it('is exactly 24h before the due date', () => {
    expect(firstReminderTime(DUE)).toBe(DUE - DAY_MS);
  });
});

describe('upcomingReminderTimes', () => {
  it('task created well before due → sequence starts at due-24h', () => {
    const now = DUE - 10 * DAY_MS;
    expect(upcomingReminderTimes(DUE, now, 3)).toEqual([
      DUE - DAY_MS,
      DUE,
      DUE + DAY_MS,
    ]);
  });

  it('task created <24h before due → 24h-before slot already passed, starts at due', () => {
    const now = DUE - 2 * HOUR_MS;
    expect(upcomingReminderTimes(DUE, now, 2)).toEqual([DUE, DUE + DAY_MS]);
  });

  it('task already overdue → next slot is 24h-aligned after now, no past slots', () => {
    const now = DUE + 2.5 * DAY_MS; // 2.5 days overdue
    expect(upcomingReminderTimes(DUE, now, 2)).toEqual([
      DUE + 3 * DAY_MS,
      DUE + 4 * DAY_MS,
    ]);
  });

  it('now exactly on a slot → that slot is excluded (strictly after now)', () => {
    expect(upcomingReminderTimes(DUE, DUE, 1)).toEqual([DUE + DAY_MS]);
    expect(upcomingReminderTimes(DUE, DUE - DAY_MS, 1)).toEqual([DUE]);
  });

  it('returns exactly `count` times, 24h apart', () => {
    const times = upcomingReminderTimes(DUE, DUE - 5 * DAY_MS, 5);
    expect(times).toHaveLength(5);
    for (let i = 1; i < times.length; i++) {
      expect(times[i] - times[i - 1]).toBe(DAY_MS);
    }
  });
});

describe('elapsedReminderTimes (history back-fill)', () => {
  it('captures slots that fired while the app was closed', () => {
    const since = DUE - 2 * DAY_MS;
    const until = DUE + HOUR_MS; // app reopened 1h after due
    expect(elapsedReminderTimes(DUE, since, until)).toEqual([DUE - DAY_MS, DUE]);
  });

  it('empty when nothing fired in the window', () => {
    expect(elapsedReminderTimes(DUE, DUE - 3 * DAY_MS, DUE - 2 * DAY_MS)).toEqual([]);
  });

  it('window boundaries: since exclusive, until inclusive', () => {
    const first = DUE - DAY_MS;
    expect(elapsedReminderTimes(DUE, first, first + DAY_MS)).toEqual([DUE]);
    expect(elapsedReminderTimes(DUE, first - 1, first)).toEqual([first]);
  });

  it('handles until before the first slot', () => {
    expect(elapsedReminderTimes(DUE, 0, DUE - 2 * DAY_MS)).toEqual([]);
  });
});

describe('reminderKindAt', () => {
  it('pre before due, nag at/after due', () => {
    expect(reminderKindAt(DUE - DAY_MS, DUE)).toBe('pre');
    expect(reminderKindAt(DUE, DUE)).toBe('nag');
    expect(reminderKindAt(DUE + DAY_MS, DUE)).toBe('nag');
  });
});

describe('nextDigestTimes', () => {
  it('digest time later today → first digest is today', () => {
    const now = new Date(2026, 6, 20, 6, 0).getTime(); // 6:00 AM
    const [first] = nextDigestTimes(now, 8, 0, 1);
    const d = new Date(first);
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([20, 8, 0]);
  });

  it('digest time already passed today → first digest is tomorrow', () => {
    const now = new Date(2026, 6, 20, 9, 30).getTime(); // 9:30 AM > 8:00
    const [first] = nextDigestTimes(now, 8, 0, 1);
    expect(new Date(first).getDate()).toBe(21);
  });

  it('exactly at digest time → rolls to tomorrow (strictly after now)', () => {
    const now = new Date(2026, 6, 20, 8, 0, 0, 0).getTime();
    const [first] = nextDigestTimes(now, 8, 0, 1);
    expect(new Date(first).getDate()).toBe(21);
  });

  it('returns consecutive days at the same wall-clock time', () => {
    const now = new Date(2026, 6, 20, 6, 0).getTime();
    const times = nextDigestTimes(now, 8, 15, 3);
    const days = times.map((t) => new Date(t).getDate());
    expect(days).toEqual([20, 21, 22]);
    for (const t of times) {
      const d = new Date(t);
      expect([d.getHours(), d.getMinutes()]).toEqual([8, 15]);
    }
  });
});

describe('endOfLocalDay / isOverdue', () => {
  it('end of day is 23:59:59.999 local of the same day', () => {
    const at = new Date(2026, 6, 20, 8, 0).getTime();
    const end = new Date(endOfLocalDay(at));
    expect([end.getDate(), end.getHours(), end.getMinutes()]).toEqual([20, 23, 59]);
  });

  it('overdue only when strictly past due', () => {
    expect(isOverdue(DUE, DUE - 1)).toBe(false);
    expect(isOverdue(DUE, DUE + 1)).toBe(true);
  });
});
