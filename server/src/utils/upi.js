/**
 * Builds a standard UPI payment link (NPCI "upi://pay" format).
 * Every UPI app (GPay, PhonePe, Paytm, BHIM, bank apps) understands it, and the same
 * string encoded as a QR code is what customers scan.
 */
export function buildUpiLink({ vpa, name, amount, note }) {
  const params = new URLSearchParams({ pa: vpa, pn: (name || 'Merchant').slice(0, 50), cu: 'INR' });
  if (amount) params.set('am', Number(amount).toFixed(2));
  if (note) params.set('tn', note.slice(0, 50));
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`;
}

export const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;