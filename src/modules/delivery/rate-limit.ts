const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 15;
const failures = new Map<string, { count: number; resetAt: number }>();

export function isBlocked(key: string) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function registerFailures(key: string, count: number) {
  if (count <= 0) return;
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= Date.now()) failures.set(key, { count, resetAt: Date.now() + WINDOW_MS });
  else entry.count += count;
}

export function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
