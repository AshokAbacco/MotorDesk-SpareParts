// server/src/utils/dateRange.js
/**
 * Date helpers in IST (shops work on Indian time even if the server runs in UTC).
 * All functions return real UTC Date objects suitable for Prisma queries.
 */
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const toIst = (d) => new Date(d.getTime() + IST_OFFSET_MS);
const fromIst = (d) => new Date(d.getTime() - IST_OFFSET_MS);

export function startOfDayIst(d = new Date()) {
  const x = toIst(d);
  x.setUTCHours(0, 0, 0, 0);
  return fromIst(x);
}

/** Week starts on Monday */
export function startOfWeekIst(d = new Date()) {
  const start = startOfDayIst(d);
  const weekday = toIst(start).getUTCDay(); // 0 = Sunday
  const back = (weekday + 6) % 7;
  return new Date(start.getTime() - back * DAY_MS);
}

export function startOfMonthIst(d = new Date()) {
  const x = toIst(d);
  return fromIst(new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), 1)));
}

/** "2026-09-01" → start of that IST day */
export const parseIstDate = (s) => (s ? startOfDayIst(new Date(`${s}T12:00:00+05:30`)) : null);

/**
 * { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } → { gte, lte } covering whole IST days.
 * Defaults: from = start of this month, to = now.
 */
export function istRange({ from, to } = {}) {
  const gte = parseIstDate(from) ?? startOfMonthIst();
  const lte = to ? new Date(parseIstDate(to).getTime() + DAY_MS - 1) : new Date();
  return { gte, lte };
}

/** Formatting for reports/exports */
export const fmtIstDate = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
export const fmtIstTime = (d) => new Date(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });