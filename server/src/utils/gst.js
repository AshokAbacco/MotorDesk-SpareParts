import { round2, toNum } from './money.js';

const normState = (s = '') => s.trim().toLowerCase();

/**
 * Calculates GST for a list of lines.
 * Prices are EXCLUSIVE of GST. Intra-state => CGST + SGST (half each). Inter-state => IGST.
 * @param {Array<{unitPrice:number, quantity:number, gstRate:number}>} lines
 * @param {{ sellerState:string, buyerState?:string, discount?:number }} opts
 */
export function calculateGst(lines, { sellerState, buyerState, discount = 0 } = {}) {
  const interState = Boolean(buyerState) && normState(buyerState) !== normState(sellerState);

  const grossSubtotal = lines.reduce((s, l) => s + toNum(l.unitPrice) * l.quantity, 0);
  const disc = Math.min(Math.max(toNum(discount), 0), grossSubtotal);
  const discountRatio = grossSubtotal > 0 ? disc / grossSubtotal : 0;

  let taxTotal = 0;
  const computed = lines.map((l) => {
    const base = toNum(l.unitPrice) * l.quantity * (1 - discountRatio);
    const tax = round2((base * toNum(l.gstRate)) / 100);
    taxTotal += tax;
    return { ...l, taxAmount: tax, lineTotal: round2(base + tax) };
  });

  taxTotal = round2(taxTotal);
  const subtotal = round2(grossSubtotal - disc);
  const cgst = interState ? 0 : round2(taxTotal / 2);
  const sgst = interState ? 0 : round2(taxTotal - cgst);
  const igst = interState ? taxTotal : 0;

  return {
    lines: computed,
    grossSubtotal: round2(grossSubtotal),
    discount: round2(disc),
    subtotal,
    taxTotal,
    cgst,
    sgst,
    igst,
    interState,
    grandTotal: round2(subtotal + taxTotal),
  };
}
