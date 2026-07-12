import { parseTaskPhrase } from '../lib/parse';

// Fixed reference "now": Sunday Jul 12 2026, 10:00 local.
const NOW = new Date(2026, 6, 12, 10, 0, 0);

describe('parseTaskPhrase', () => {
  it('extracts a weekday date and strips it from the title', () => {
    const { title, dueAt } = parseTaskPhrase('pay rent next Friday', NOW);
    expect(title).toBe('Pay rent');
    expect(dueAt).not.toBeNull();
    const d = new Date(dueAt!);
    expect(d.getDay()).toBe(5); // Friday
    expect(d.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('handles "by <month day>" phrasing', () => {
    const { title, dueAt } = parseTaskPhrase('finish report by Oct 3rd', NOW);
    expect(title).toBe('Finish report');
    const d = new Date(dueAt!);
    expect([d.getMonth(), d.getDate()]).toEqual([9, 3]);
  });

  it('respects an explicit time of day', () => {
    const { dueAt } = parseTaskPhrase('call mom tomorrow at 9am', NOW);
    const d = new Date(dueAt!);
    expect([d.getDate(), d.getHours()]).toEqual([13, 9]);
  });

  it('defaults to 5 PM when no time is spoken', () => {
    const { dueAt } = parseTaskPhrase('submit taxes tomorrow', NOW);
    expect(new Date(dueAt!).getHours()).toBe(17);
  });

  it('returns null dueAt when no date is present', () => {
    const { title, dueAt } = parseTaskPhrase('buy milk', NOW);
    expect(title).toBe('Buy milk');
    expect(dueAt).toBeNull();
  });

  it('never parses into the past (forwardDate)', () => {
    const { dueAt } = parseTaskPhrase('dentist on Friday', NOW);
    expect(dueAt!).toBeGreaterThan(NOW.getTime());
  });

  it('handles empty input', () => {
    expect(parseTaskPhrase('   ', NOW)).toEqual({ title: '', dueAt: null });
  });
});
