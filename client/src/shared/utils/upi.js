import { SiGooglepay, SiPaytm, SiPhonepe } from 'react-icons/si';
import { QrCode } from 'lucide-react';

/** Same format the server builds — used for the vendor's own (no-amount) QR preview */
export function buildUpiLink({ vpa, name, amount, note }) {
  const params = new URLSearchParams({ pa: vpa, pn: (name || 'Merchant').slice(0, 50), cu: 'INR' });
  if (amount) params.set('am', Number(amount).toFixed(2));
  if (note) params.set('tn', note.slice(0, 50));
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`;
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * App-specific deep links. They carry the same pa/pn/am/tn params as upi://pay,
 * so the shop's UPI ID and the exact amount are pre-filled in the app.
 */
export const UPI_APPS = [
  { key: 'upi', label: 'Any UPI app', icon: QrCode, color: 'text-slate-700', prefix: () => 'upi://pay?' },
  { key: 'gpay', label: 'Google Pay', icon: SiGooglepay, color: 'text-[#4285F4]', prefix: () => (isIOS() ? 'gpay://upi/pay?' : 'tez://upi/pay?') },
  { key: 'phonepe', label: 'PhonePe', icon: SiPhonepe, color: 'text-[#5f259f]', prefix: () => 'phonepe://pay?' },
  { key: 'paytm', label: 'Paytm', icon: SiPaytm, color: 'text-[#00BAF2]', prefix: () => 'paytmmp://pay?' },
];

export const appLink = (upiLink, appKey) => {
  const app = UPI_APPS.find((a) => a.key === appKey) ?? UPI_APPS[0];
  return upiLink.replace('upi://pay?', app.prefix());
};