/**
 * Natural-language date extraction from a spoken/typed task phrase.
 * Fully offline — chrono-node is a pure JS parser, no network, no API keys.
 *
 * "pay rent next Friday"      → { title: "Pay rent",      dueAt: <next Friday> }
 * "finish report by Oct 3rd"  → { title: "Finish report", dueAt: <Oct 3> }
 * "buy milk"                  → { title: "Buy milk",      dueAt: null }
 */
import * as chrono from 'chrono-node';

export interface ParsedTask {
  title: string;
  /** Epoch ms, or null if no date was found in the text. */
  dueAt: number | null;
}

/** Default due time when the phrase names a day but no clock time: 5 PM. */
const DEFAULT_HOUR = 17;

/** Connector words commonly left dangling once the date text is removed. */
const TRAILING_CONNECTORS = /\s+(by|on|at|before|until|till|due|for|next|this)\s*$/i;

export function parseTaskPhrase(text: string, now: Date = new Date()): ParsedTask {
  const trimmed = text.trim();
  if (!trimmed) return { title: '', dueAt: null };

  // forwardDate: "Friday" means the NEXT Friday, never one in the past.
  const results = chrono.parse(trimmed, now, { forwardDate: true });
  if (results.length === 0) {
    return { title: capitalize(trimmed), dueAt: null };
  }

  const r = results[0];

  // If the speaker didn't say a time of day, chrono defaults to 12:00 —
  // certain: false lets us substitute a saner end-of-workday default.
  const date = r.start.date();
  if (!r.start.isCertain('hour')) {
    date.setHours(DEFAULT_HOUR, 0, 0, 0);
  }

  // Remove the matched date substring from the phrase to form the title,
  // then tidy dangling connectors ("pay rent by" → "pay rent").
  let title = (trimmed.slice(0, r.index) + trimmed.slice(r.index + r.text.length))
    .replace(/\s{2,}/g, ' ')
    .trim();
  title = title.replace(TRAILING_CONNECTORS, '').trim();
  // Degenerate case: the whole phrase was a date ("next friday") — no title left.
  if (!title) return { title: '', dueAt: date.getTime() };

  return { title: capitalize(title), dueAt: date.getTime() };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
