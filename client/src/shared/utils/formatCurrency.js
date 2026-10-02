// client/src/shared/utils/formatCurrency.js
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export const formatCurrency = (value) => inr.format(Number(value) || 0);

/**
 * Short rupee amounts for charts: ₹950 · ₹13.2K · ₹1.5L · ₹2.4Cr
 * Written by hand on purpose — the browser's built-in "compact" format differs between browsers
 * (newer Chrome shows thousands as "T", e.g. ₹13.2T), which looks like trillions.
 */
export function formatCompact(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const round1 = (v) => Math.round(v * 10) / 10; // 1 decimal, no trailing ".0"
  // Largest unit first (crore → lakh → thousand), so ₹99,999 shows as ₹1L rather than ₹100K
  for (const [unit, suffix] of [[1e7, 'Cr'], [1e5, 'L'], [1e3, 'K']]) {
    if (abs >= unit * 0.9995) return `${sign}₹${round1(abs / unit)}${suffix}`;
  }
  return `${sign}₹${Math.round(abs)}`;
}

export const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);