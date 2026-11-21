/** Pure helpers for the feed timeline: which day a post belongs to, and what that day is called. */

export interface DayGroup<T> {
  /** Local calendar day, YYYY-MM-DD. */
  key: string;
  label: string;
  items: T[];
  /** Where this day's first item sits in the whole list. */
  start: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The local calendar day of a time, as YYYY-MM-DD. */
export function dayKey(time: string | number | Date): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Today", "Yesterday", "Mon, Nov 17", or "Nov 17, 2025" for another year. */
export function dayLabel(key: string, now: number = Date.now(), locale?: string): string {
  if (key === dayKey(now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday)) return "Yesterday";

  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = y === new Date(now).getFullYear();
  return date.toLocaleDateString(
    locale,
    sameYear ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" },
  );
}

/**
 * Consecutive runs of items on the same day, in the order given (the feed is newest first).
 * A day that appears again later, out of order, starts a new run rather than reordering anything.
 */
export function groupByDay<T extends { created_at: string }>(
  items: T[],
  now: number = Date.now(),
  locale?: string,
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  items.forEach((item, index) => {
    const key = dayKey(item.created_at);
    const last = groups.at(-1);
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(key, now, locale), items: [item], start: index });
  });
  return groups;
}
