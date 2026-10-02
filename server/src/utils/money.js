// Round to 2 decimals safely (avoids 0.1 + 0.2 issues when summing)
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const toNum = (d) => (d === null || d === undefined ? 0 : Number(d));
