/** Returns a Date object N days in the past from now. */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Returns a Date object N hours in the past from now. */
export function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

/** Inclusive random integer between min and max. */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array. */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/** Zero-padded sequential reference number, e.g. seqRef("PO", 3) → "PO-003" */
export function seqRef(prefix: string, n: number, pad = 3): string {
  return `${prefix}-${String(n).padStart(pad, "0")}`;
}

/** Spread N dates evenly over the last `spanDays` days, newest first. */
export function spreadDates(count: number, spanDays: number): Date[] {
  return Array.from({ length: count }, (_, i) =>
    daysAgo(Math.floor((i / count) * spanDays)),
  );
}
