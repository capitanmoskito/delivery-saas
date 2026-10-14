export const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || "America/Mexico_City";

const DAY_MS = 86_400_000;

type ZonedParts = { year: number; month: number; day: number; hour: number; weekday: number };

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  weekday: "short"
});

const weekdayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function getZonedParts(date: Date): ZonedParts {
  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) values[part.type] = part.value;
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour) % 24,
    weekday: weekdayIndex[values.weekday] ?? 0
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKey(date: Date): string {
  const { year, month, day } = getZonedParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function keyToUtcMs(key: string) {
  return Date.parse(`${key}T00:00:00Z`);
}

function utcMsToKey(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  return utcMsToKey(keyToUtcMs(key) + days * DAY_MS);
}

export function diffDays(fromKey: string, toKey: string): number {
  return Math.round((keyToUtcMs(toKey) - keyToUtcMs(fromKey)) / DAY_MS);
}

export function weekdayOfKey(key: string): number {
  return new Date(keyToUtcMs(key)).getUTCDay();
}

function offsetAt(instantMs: number): number {
  const parts = getZonedParts(new Date(instantMs));
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour);
  return asUtc - Math.floor(instantMs / 3_600_000) * 3_600_000;
}

// Instant at which the given business-local day begins.
export function startOfDay(key: string): Date {
  const guess = keyToUtcMs(key);
  const first = guess - offsetAt(guess);
  return new Date(guess - offsetAt(first));
}

export function weekRange(key: string): { from: string; to: string } {
  const offset = (weekdayOfKey(key) + 6) % 7;
  const from = addDays(key, -offset);
  return { from, to: addDays(from, 6) };
}

export function monthRange(key: string): { from: string; to: string } {
  const [year, month] = key.split("-").map(Number);
  const from = `${year}-${pad(month)}-01`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  return { from, to: addDays(next, -1) };
}

export function shiftMonth(key: string, months: number): string {
  const [year, month] = key.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
}
