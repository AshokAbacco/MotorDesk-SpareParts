// client/src/dashboardPages/billingHistory/dateRanges.js
import { toInputDate } from '../../shared/utils/formatDate.js';

/** Returns { from, to } as YYYY-MM-DD for a preset (week starts Monday) */
export function presetRange(preset) {
  const today = new Date();
  const to = toInputDate(today);
  if (preset === 'today') return { from: to, to };
  if (preset === 'week') {
    const d = new Date(today);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return { from: toInputDate(d), to };
  }
  return { from: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)), to }; // month
}

export const PRESET_LABELS = { today: 'Today', week: 'This Week', month: 'This Month', custom: 'Custom Range' };